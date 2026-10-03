import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export const NATIVE_OAUTH_REDIRECT_URL = 'com.bavel.app://auth/callback';
const CALLBACK_EVENT = 'bavel:native-oauth-callback';

export function isNativeOAuthCallbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'com.bavel.app:' &&
      url.hostname === 'auth' &&
      url.pathname === '/callback' &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function callbackErrorMessage(errorCode: string | null): string {
  if (errorCode === 'access_denied') return 'Connexion annulée. Vous pouvez réessayer.';
  return 'La connexion n’a pas abouti. Vérifiez la configuration du fournisseur puis réessayez.';
}

function notifyCallback(error: string | null): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CALLBACK_EVENT, { detail: { error } }));
  }
}

export async function handleNativeOAuthCallback(callbackUrl: string, client: SupabaseClient): Promise<boolean> {
  if (!isNativeOAuthCallbackUrl(callbackUrl)) return false;

  const url = new URL(callbackUrl);
  const providerError = url.searchParams.get('error') || url.searchParams.get('error_code');
  if (providerError) {
    notifyCallback(callbackErrorMessage(providerError));
    await closeOAuthBrowser();
    return true;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    notifyCallback(callbackErrorMessage(null));
    await closeOAuthBrowser();
    return true;
  }

  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Native OAuth code exchange failed:', error);
    notifyCallback(callbackErrorMessage(null));
  } else {
    notifyCallback(null);
  }
  await closeOAuthBrowser();
  return true;
}

async function closeOAuthBrowser(): Promise<void> {
  try {
    await Browser.close();
  } catch (error) {
    console.warn('Unable to close the native OAuth browser:', error);
  }
}

export async function registerNativeOAuthCallbackListener(client: SupabaseClient): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};

  let active = true;
  const handleUrl = (url: string) => {
    if (!active) return;
    void handleNativeOAuthCallback(url, client).catch((error: unknown) => {
      console.error('Native OAuth callback handling failed:', error);
      notifyCallback(callbackErrorMessage(null));
    });
  };

  const listener: PluginListenerHandle = await App.addListener('appUrlOpen', ({ url }) => handleUrl(url));
  const launch = await App.getLaunchUrl();
  if (launch?.url) handleUrl(launch.url);

  return () => {
    active = false;
    void listener?.remove();
  };
}
