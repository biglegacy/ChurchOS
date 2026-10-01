import { toFriendlyErrorMessage } from './utils/friendlyError';

const TOKEN_KEY = 'church_os_auth_token';
const USER_KEY = 'church_os_auth_user';
const CHURCH_KEY = 'church_os_auth_church';

// Resolve base API URL (e.g. when frontend is deployed to Cloudflare Pages and backend is on Cloud Run)
const API_BASE_URL = (
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : ''
).replace(/\/$/, '');

function buildUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}

export class ApiClient {
  public static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public static setAuth(token: string, user: any, church?: any) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (church) {
      localStorage.setItem(CHURCH_KEY, JSON.stringify(church));
    } else {
      localStorage.removeItem(CHURCH_KEY);
    }
  }

  public static clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(CHURCH_KEY);
  }

  public static logout() {
    this.clearAuth();
  }

  public static getUser(): any | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public static getChurch(): any | null {
    const raw = localStorage.getItem(CHURCH_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public static async request<T = any>(endpoint: string, options: RequestInit = {}, retries = 3): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = buildUrl(endpoint);
    let res: Response;
    try {
      res = await fetch(fullUrl, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      // If it is a transient network glitch or server reboot, retry with exponential backoff
      if (retries > 0) {
        const delay = Math.min(600 * Math.pow(1.5, 3 - retries), 2500);
        await new Promise(r => setTimeout(r, delay));
        return this.request<T>(endpoint, options, retries - 1);
      }
      console.warn('[API Network Error]', endpoint, networkErr?.message || networkErr);
      throw new Error(toFriendlyErrorMessage(networkErr, endpoint));
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`[API Error ${res.status}]`, endpoint, data);
      const friendly = toFriendlyErrorMessage({ status: res.status, message: data.error || data.message }, endpoint);
      const err: any = new Error(friendly);
      err.status = res.status;
      err.code = data.code;
      err.details = data.details;
      throw err;
    }

    return data as T;
  }

  public static get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public static post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static put<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
