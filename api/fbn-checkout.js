/**
 * Vercel Serverless Proxy for FirstChekOut (First Bank Nigeria)
 * 
 * Resolves the CORS issue when calling the FBN checkout API from the browser.
 * The browser cannot directly call sandbox.firstchekout.com/checkout.firstchekout.com
 * due to CORS restrictions, so we proxy the request server-side.
 */

export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin (or restrict to your domain)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const isLive = process.env.VITE_FBN_LIVE === 'true';
    const targetUrl = isLive
      ? 'https://checkout.firstchekout.com/api/v1/checkout/initialize'
      : 'https://sandbox.firstchekout.com/api/v1/checkout/initialize';

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return res.status(response.status).json(
      typeof data === 'string' ? { data } : data
    );
  } catch (error) {
    console.error('[FBN Proxy Error]', error);
    return res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}
