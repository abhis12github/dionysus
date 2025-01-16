// import { db } from "@/server/db";
// import { headers } from "next/headers";
// import { NextRequest, NextResponse } from "next/server";
// import axios from 'axios';

// const PAYPAL_API_URL = process.env.PAYPAL_ENV === 'production'
//   ? 'https://api-m.paypal.com'
//   : 'https://api-m.sandbox.paypal.com';

// // Function to verify PayPal webhook signature
// async function verifyWebhookSignature(
//   body: string,
//   headers: {
//     transmissionId: string;
//     transmissionTime: string;
//     certUrl: string;
//     authAlgo: string;
//     transmissionSig: string;
//   },
//   webhookId: string
// ) {
//   try {
//     const accessToken = await getPayPalAccessToken();

//     const verificationPayload = {
//       auth_algo: headers.authAlgo,
//       cert_url: headers.certUrl,
//       transmission_id: headers.transmissionId,
//       transmission_sig: headers.transmissionSig,
//       transmission_time: headers.transmissionTime,
//       webhook_id: webhookId,
//       webhook_event: JSON.parse(body)
//     };

//     const response = await axios.post(
//       `${PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`,
//       verificationPayload,
//       {
//         headers: {
//           'Authorization': `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     return response.data.verification_status === 'SUCCESS';
//   } catch (error) {
//     console.error('Webhook signature verification failed:', error);
//     return false;
//   }
// }

// // Function to get PayPal access token
// async function getPayPalAccessToken() {
//   const clientId = process.env.PAYPAL_CLIENT_ID;
//   const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

//   if (!clientId || !clientSecret) {
//     throw new Error('PayPal credentials not configured');
//   }

//   const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

//   const response = await axios.post(
//     `${PAYPAL_API_URL}/v1/oauth2/token`,
//     'grant_type=client_credentials',
//     {
//       headers: {
//         'Authorization': `Basic ${auth}`,
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//     }
//   );

//   return response.data.access_token;
// }

// async function capturePayment(orderId: string) {
//   const accessToken = await getPayPalAccessToken();

//   const response = await axios.post(
//     `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
//     {},
//     {
//       headers: {
//         'Authorization': `Bearer ${accessToken}`,
//         'Content-Type': 'application/json',
//       },
//     }
//   );

//   return response.data;
// }

// export async function POST(request: NextRequest) {
//   try {
//     const headersList = headers();
//     const body = await request.text();

//     // Get webhook ID from environment variables
//     const webhookId = process.env.PAYPAL_WEBHOOK_ID;
//     if (!webhookId) {
//       throw new Error('PayPal webhook ID not configured');
//     }

//     // Collect webhook headers
//     const webhookHeaders = {
//       transmissionId: (await headersList).get('paypal-transmission-id') || '',
//       transmissionTime: (await headersList).get('paypal-transmission-time') || '',
//       certUrl: (await headersList).get('paypal-cert-url') || '',
//       authAlgo: (await headersList).get('paypal-auth-algo') || '',
//       transmissionSig: (await headersList).get('paypal-transmission-sig') || '',
//     };

//     // Verify webhook signature
//     const isVerified = await verifyWebhookSignature(body, webhookHeaders, webhookId);
//     if (!isVerified) {
//       return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
//     }

//     const event = JSON.parse(body);

//     // Handle CHECKOUT.ORDER.APPROVED event
//     if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
//       const orderId = event.resource.id;

//       try {
//         // Capture the payment
//         const captureResult = await capturePayment(orderId);

//         // Extract the amount and convert to credits
//         const amount = parseFloat(captureResult.purchase_units[0].payments.captures[0].amount.value);
//         const credits = Math.floor(amount * 50); // Convert amount to credits based on your rate

//         // Extract custom_id (userId) from the order
//         const userId = captureResult.purchase_units[0].custom_id;

//         if (!userId) {
//           throw new Error('User ID not found in payment data');
//         }

//         // Store transaction and update user credits
//         await db.$transaction([
//           db.paypalTransaction.create({
//             data: {
//               userId,
//               credits,
//             },
//           }),
//           db.user.update({
//             where: { id: userId },
//             data: {
//               credits: {
//                 increment: credits,
//               },
//             },
//           }),
//         ]);

//         return NextResponse.json({ success: true });
//       } catch (error) {
//         console.error('Error processing payment:', error);
//         return NextResponse.json(
//           { error: 'Error processing payment' },
//           { status: 500 }
//         );
//       }
//     }

//     // Acknowledge other event types
//     return NextResponse.json({ received: true });
//   } catch (error) {
//     console.error('Webhook error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import axios from 'axios';

const PAYPAL_API_URL = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
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
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw new Error('Failed to get PayPal access token');
  }
}

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

async function capturePayment(orderId: string) {
  try {
    const accessToken = await getPayPalAccessToken();

    console.log('Attempting to capture payment for order:', orderId);

    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
      }
    );

    console.log('Payment capture response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Payment capture error:', {
      status: error.response?.status,
      data: error.response?.data,
      orderId
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const body = await request.text();

    console.log('Received PayPal webhook:', {
      eventType: JSON.parse(body).event_type,
      headers: Object.fromEntries((await headersList).entries())
    });

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      throw new Error('PayPal webhook ID not configured');
    }

    const webhookHeaders = {
      transmissionId: (await headersList).get('paypal-transmission-id') || '',
      transmissionTime: (await headersList).get('paypal-transmission-time') || '',
      certUrl: (await headersList).get('paypal-cert-url') || '',
      authAlgo: (await headersList).get('paypal-auth-algo') || '',
      transmissionSig: (await headersList).get('paypal-transmission-sig') || '',
    };

    const isVerified = await verifyWebhookSignature(body, webhookHeaders, webhookId);
    if (!isVerified) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = event.resource.id;

      try {
        const captureResult = await capturePayment(orderId);

        if (captureResult.status !== 'COMPLETED') {
          throw new Error(`Invalid capture status: ${captureResult.status}`);
        }

        const amount = parseFloat(captureResult.purchase_units[0].payments.captures[0].amount.value);
        const credits = Math.floor(amount * 50); // Convert amount to credits (50 credits per dollar)

        // Get userId from custom_id field
        const userId = captureResult.purchase_units[0].custom_id;

        if (!userId) {
          throw new Error('User ID not found in payment data');
        }

        // Update user credits and create transaction record

        await db.paypalTransaction.create({
          data: {
            userId,
            credits,
          },
        });
        await db.user.update({
          where: { id: userId },
          data: {
            credits: {
              increment: credits,
            },
          },
        });

        return NextResponse.json({ success: true });
      } catch (error: any) {
        console.error('Error processing payment:', {
          error: error.message,
          response: error.response?.data
        });

        return NextResponse.json(
          { error: 'Error processing payment' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
