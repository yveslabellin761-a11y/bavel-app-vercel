import { Capacitor } from '@capacitor/core';

const PRODUCTION_API_ORIGIN = 'https://bavel-app-vercel.onrender.com';

export function getConfiguredApiUrl(isProduction: boolean, configuredUrl?: string): string {
  return configuredUrl?.trim() || (isProduction ? PRODUCTION_API_ORIGIN : '');
}

const configuredApiUrl = getConfiguredApiUrl(import.meta.env?.PROD === true, import.meta.env?.VITE_API_BASE_URL);

function isNativeRuntime(): boolean {
  return (
    Capacitor.isNativePlatform() ||
    (typeof window !== 'undefined' &&
      (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:'))
  );
}

function getConfiguredApiOrigin(isNative: boolean): string | null {
  if (!configuredApiUrl) return null;
  const url = new URL(configuredApiUrl);
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('VITE_API_BASE_URL must be an origin without a path, query, or credentials.');
  }
  if ((import.meta.env?.PROD || isNative) && url.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use HTTPS for native apps and production.');
  }
  return url.origin;
}

export function getBackendBaseUrl(): string {
  const isNative = isNativeRuntime();
  const configuredOrigin = getConfiguredApiOrigin(isNative);
  if (isNative) {
    if (!configuredOrigin) {
      throw new Error('Native builds require VITE_API_BASE_URL to point to the HTTPS Bavel API.');
    }
    return configuredOrigin;
  }
  if (import.meta.env?.PROD && configuredOrigin) return configuredOrigin;
  if (typeof window === 'undefined') {
    throw new Error('The Bavel API base URL is unavailable outside a browser.');
  }
  return window.location.origin;
}

export function getApiUrl(path: string): string {
  if (!path.startsWith('/')) throw new Error('API paths must be absolute paths.');
  return new URL(path, getBackendBaseUrl()).toString();
}

export function resolveApiRequest(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === 'string' && input.startsWith('/api/')) return getApiUrl(input);
  if (input instanceof URL && input.pathname.startsWith('/api/')) return getApiUrl(`${input.pathname}${input.search}`);
  if (typeof Request !== 'undefined' && input instanceof Request) {
    const url = new URL(input.url);
    if (url.pathname.startsWith('/api/')) return new Request(getApiUrl(`${url.pathname}${url.search}`), input);
  }
  return input;
}
