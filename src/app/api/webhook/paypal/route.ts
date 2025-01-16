// import { capturePayPalPayment } from "@/lib/paypal";
// import { db } from "@/server/db";
// import { headers } from "next/headers";
// import { NextRequest, NextResponse } from "next/server";  // Assuming the capture function is in the paypal.ts file
// import { WebhookEvent,verifyWebhookSignature } from '@paypal/paypal-server-sdk';

// export async function POST(request: NextRequest) {
//     const body = await request.text();
//     const signature = (await headers()).get('Paypal-Transmission-Sig') as string; // PayPal webhook signature header
//     const transmissionId = (await headers()).get('Paypal-Transmission-Id') as string;
//     const transmissionTime = (await headers()).get('Paypal-Transmission-Time') as string;

//     const webhookId = process.env.PAYPAL_WEBHOOK_ID!;
//     const webhookSecret = process.env.PAYPAL_WEBHOOK_SECRET!;

//     // Verify the webhook signature
//     try {
//         const response = verifyWebhookSignature({
//             transmissionId,
//             transmissionTime,
//             certUrl: '',
//             webhookId,
//             webhookEvent: JSON.parse(body),
//             transmissionSig: signature,
//             webhookSecret,
//         });

//         if (!response.verification_status) {
//             return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
//         }
//     } catch (error) {
//         return NextResponse.json({ error: 'Error validating signature' }, { status: 400 });
//     } // PayPal webhook signature header
//     let event: any;

//     try {
//         // Validate the PayPal webhook signature (use your PayPal webhook secret here)
//         event = JSON.parse(body);  // Assuming PayPal sends webhook events in JSON format
//     } catch (error) {
//         return NextResponse.json({ error: 'Invalid Signature or body format' }, { status: 400 });
//     }

//     // Log the event type for debugging purposes
//     console.log(event.event_type);

//     if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
//         const orderId = event.resource.id;  // Extract the order ID from the event data

//         // Capture the PayPal payment using the order ID
//         try {
//             const captureResult = await capturePayPalPayment(orderId);

//             const creditsAmount = captureResult?.result?.purchaseUnits?.[0]?.amount?.value;

//             if (!creditsAmount) {
//                 throw new Error('Credits not found in the payment capture result');
//             }

//             const credits = Number(creditsAmount);

//             // You can also perform other actions here like storing the transaction details
//             // const credits = Number(captureResult.result.purchaseUnits[0].amount.value); // Assuming the amount is in the capture result

//             // Fetch userId from PayPal data (you might store this in the metadata during the order creation)
//             const userId = event.resource.metadata.userId;

//             if (!userId || !credits) {
//                 return NextResponse.json({ error: 'Missing userId or credits' }, { status: 400 });
//             }

//             // Store the PayPal transaction
//             await db.paypalTransaction.create({
//                 data: { userId, credits },
//             });

//             // Update the user's credits in the database
//             await db.user.update({
//                 where: { id: userId },
//                 data: {
//                     credits: {
//                         increment: credits,
//                     },
//                 },
//             });

//             return NextResponse.json({ message: 'Credits added successfully' }, { status: 200 });
//         } catch (error) {
//             console.error('Error capturing PayPal payment:', error);
//             return NextResponse.json({ error: 'Error capturing PayPal payment' }, { status: 500 });
//         }
//     }

//     // Handle other event types here if necessary
//     return NextResponse.json({ message: 'Event received' });
// }

import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import axios from 'axios';

const PAYPAL_API_URL = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Function to verify PayPal webhook signature
async function verifyWebhookSignature(
  body: string,
  headers: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
  },
  webhookId: string
) {
  try {
    const accessToken = await getPayPalAccessToken();

    const verificationPayload = {
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body)
    };

    const response = await axios.post(
      `${PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`,
      verificationPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

// Function to get PayPal access token
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    `${PAYPAL_API_URL}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data.access_token;
}

async function capturePayment(orderId: string) {
  const accessToken = await getPayPalAccessToken();

  const response = await axios.post(
    `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const body = await request.text();
    
    // Get webhook ID from environment variables
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      throw new Error('PayPal webhook ID not configured');
    }

    // Collect webhook headers
    const webhookHeaders = {
      transmissionId: (await headersList).get('paypal-transmission-id') || '',
      transmissionTime: (await headersList).get('paypal-transmission-time') || '',
      certUrl: (await headersList).get('paypal-cert-url') || '',
      authAlgo: (await headersList).get('paypal-auth-algo') || '',
      transmissionSig: (await headersList).get('paypal-transmission-sig') || '',
    };

    // Verify webhook signature
    const isVerified = await verifyWebhookSignature(body, webhookHeaders, webhookId);
    if (!isVerified) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle CHECKOUT.ORDER.APPROVED event
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = event.resource.id;
      
      try {
        // Capture the payment
        const captureResult = await capturePayment(orderId);
        
        // Extract the amount and convert to credits
        const amount = parseFloat(captureResult.purchase_units[0].payments.captures[0].amount.value);
        const credits = Math.floor(amount * 50); // Convert amount to credits based on your rate

        // Extract custom_id (userId) from the order
        const userId = captureResult.purchase_units[0].custom_id;

        if (!userId) {
          throw new Error('User ID not found in payment data');
        }

        // Store transaction and update user credits
        await db.$transaction([
          db.paypalTransaction.create({
            data: {
              userId,
              credits,
            },
          }),
          db.user.update({
            where: { id: userId },
            data: {
              credits: {
                increment: credits,
              },
            },
          }),
        ]);

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Error processing payment:', error);
        return NextResponse.json(
          { error: 'Error processing payment' },
          { status: 500 }
        );
      }
    }

    // Acknowledge other event types
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
