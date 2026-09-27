/**
 * Cloudflare Pages Function: /api/* Catch-All Reverse Proxy
 * Resolves API requests on Cloudflare deployments, eliminates HTTP 405 Method Not Allowed errors,
 * provides complete CORS support, and proxies requests to the Church-OS backend engine.
 */

interface Env {
  API_URL?: string;
  BACKEND_URL?: string;
  VITE_API_URL?: string;
  VITE_APP_URL?: string;
}

type PagesFunction<TEnv = unknown> = (context: {
  request: Request;
  functionPath?: string;
  waitUntil?: (promise: Promise<unknown>) => void;
  next?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: TEnv;
  params: Record<string, string | string[]>;
  data?: Record<string, unknown>;
}) => Response | Promise<Response>;

const DEFAULT_BACKEND_URL = 'https://ais-pre-v5vseiddljyuoccmnf2uvj-444415977811.europe-west3.run.app';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Set permissive CORS headers for all responses
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  // Immediate preflight response for OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Determine target backend URL
  const backendBase = (
    env.BACKEND_URL ||
    env.API_URL ||
    env.VITE_API_URL ||
    env.VITE_APP_URL ||
    DEFAULT_BACKEND_URL
  ).replace(/\/+$/, '');

  const url = new URL(request.url);
  const targetUrl = `${backendBase}${url.pathname}${url.search}`;

  // Forward the request to backend
  try {
    const requestHeaders = new Headers(request.headers);
    // Ensure host header points to target
    requestHeaders.delete('host');

    const fetchOptions: RequestInit = {
      method: request.method,
      headers: requestHeaders,
      redirect: 'follow',
    };

    // Include body for mutation requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded') || contentType.includes('text/')) {
        const bodyText = await request.text();
        if (bodyText) {
          fetchOptions.body = bodyText;
        }
      } else {
        // Form-data or binary
        const buffer = await request.arrayBuffer();
        if (buffer && buffer.byteLength > 0) {
          fetchOptions.body = buffer;
        }
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Clone response headers and inject CORS
    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('[Cloudflare Proxy Error]', err);
    return new Response(
      JSON.stringify({
        error: `Cloudflare API Gateway was unable to connect to backend at ${backendBase}. Please verify that the Church-OS backend server is running and accessible.`,
        details: err?.message || 'Connection failed',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};
