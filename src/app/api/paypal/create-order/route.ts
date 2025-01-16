import { NextResponse } from 'next/server';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';

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
  } catch (error: any) {
    console.error('PayPal auth error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with PayPal');
  }
}

export async function POST(request: Request) {
  try {
    const { credits, userId} = await request.json();
    
    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: (credits / 50).toFixed(2)
            },
            description: `${credits} credits`,
            custom_id: userId, 
          }
        ],
        application_context: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/create`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
          user_action: "PAY_NOW"
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('PayPal order error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}