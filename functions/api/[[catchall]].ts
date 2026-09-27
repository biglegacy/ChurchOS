// Cloudflare Pages Function: Universal API Router & Proxy
// Prevents HTTP 405 Method Not Allowed on Cloudflare production deployments
// Handles all HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)

interface Env {
  BACKEND_URL?: string;
  VITE_API_URL?: string;
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}): Promise<Response> => {
  const { request, env } = context;

  // 1. Handle CORS Preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Baggage, Sentry-Trace',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 2. Resolve backend URL from environment or production deployment
  const rawBackend = env.BACKEND_URL || env.VITE_API_URL || 'https://ais-dev-v5vseiddljyuoccmnf2uvj-444415977811.europe-west3.run.app';
  const backendBase = rawBackend.replace(/\/$/, '');

  const requestUrl = new URL(request.url);
  const targetUrl = `${backendBase}${requestUrl.pathname}${requestUrl.search}`;

  // 3. Clone and forward headers
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set('X-Forwarded-Host', requestUrl.host);
  forwardHeaders.set('X-Forwarded-Proto', requestUrl.protocol.replace(':', ''));

  try {
    const isBodyMethod = !['GET', 'HEAD'].includes(request.method);
    const body = isBodyMethod ? await request.arrayBuffer() : undefined;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('[Cloudflare Proxy Error]', err);
    return new Response(
      JSON.stringify({
        error: `Cloudflare API Proxy Error: ${err.message || 'Unable to contact backend service'}`,
        code: 'CLOUDFLARE_PROXY_ERROR',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
