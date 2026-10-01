import { onRequest } from './functions/api/[[path]]';

interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  BACKEND_URL?: string;
  API_URL?: string;
  VITE_API_URL?: string;
  APP_SECRET?: string;
  ARKESEL_API_KEY?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_DATABASE_ID?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Route API requests to the edge handler
    if (url.pathname.startsWith('/api/')) {
      return onRequest({
        request,
        env,
        params: {},
        waitUntil: ctx?.waitUntil ? ctx.waitUntil.bind(ctx) : () => {},
        next: () => (env.ASSETS ? env.ASSETS.fetch(request) : fetch(request)),
        data: {},
      });
    }

    // Serve static assets with automatic SPA fallback
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      // If direct asset fetch returned 404 for a client-side navigation GET request, serve index.html
      if (assetResponse.status === 404 && request.method === 'GET' && !url.pathname.includes('.')) {
        const indexRequest = new Request(new URL('/', request.url), request);
        return env.ASSETS.fetch(indexRequest);
      }
      return assetResponse;
    }

    return new Response('Not Found', { status: 404 });
  },
};
