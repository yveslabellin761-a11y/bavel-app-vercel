import { getSupabase } from './supabase';
import { resolveApiRequest } from './apiUrl';

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data: { session } } = await getSupabase().auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(resolveApiRequest(input), { ...init, headers, credentials: 'include' });
}
