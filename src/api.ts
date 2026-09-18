const TOKEN_KEY = 'church_os_auth_token';
const USER_KEY = 'church_os_auth_user';
const CHURCH_KEY = 'church_os_auth_church';

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

  public static async request<T = any>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(endpoint, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      // If it is a transient network glitch or server reboot, retry once or twice
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 400));
        return this.request<T>(endpoint, options, retries - 1);
      }
      throw new Error(
        networkErr?.message === 'Failed to fetch'
          ? 'Unable to connect to Church-OS server. Please check your network connection and retry.'
          : (networkErr?.message || 'Network request failed.')
      );
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
      const err: any = new Error(errorMsg);
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
