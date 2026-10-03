import type { SupabaseClient } from '@supabase/supabase-js';

export const PROFILE_PHOTOS_BUCKET = 'profile-photos';
export const PROFILE_PHOTO_URL_TTL_SECONDS = 900;

export function getProfilePhotoStoragePath(reference: string): string | null {
  const match = reference.match(
    /\/storage\/v1\/object\/(?:public|sign)\/profile-photos\/([^?#]+)/i
  );
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }

  if (!reference || /^(?:https?:|data:|blob:)/i.test(reference)) return null;
  return reference;
}

export async function signProfilePhotoReferences(
  client: Pick<SupabaseClient, 'storage'>,
  references: string[]
): Promise<string[]> {
  const paths = Array.from(new Set(references
    .map(getProfilePhotoStoragePath)
    .filter((path): path is string => Boolean(path))));
  const signedByPath = new Map<string, string>();

  for (let index = 0; index < paths.length; index += 100) {
    const batch = paths.slice(index, index + 100);
    const { data, error } = await client.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .createSignedUrls(batch, PROFILE_PHOTO_URL_TTL_SECONDS);
    if (error) throw error;
    for (const item of data || []) {
      if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
    }
  }

  return references.map((reference) => {
    const path = getProfilePhotoStoragePath(reference);
    return path ? signedByPath.get(path) || '' : '';
  });
}

export function toStoredProfilePhotoReference(reference: string): string {
  return getProfilePhotoStoragePath(reference) || reference;
}
