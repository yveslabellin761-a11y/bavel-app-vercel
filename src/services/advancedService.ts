import { authFetch } from '../lib/authFetch';

export async function fetchRecommendations() {
  const response = await authFetch('/api/recommendations');
  if (!response.ok) throw new Error('Recommandations indisponibles');
  return (await response.json()).recommendations;
}

export async function fetchMyStatistics() {
  const response = await authFetch('/api/statistics/me');
  if (!response.ok) throw new Error('Statistiques indisponibles');
  return response.json();
}

export async function completeQuest(questId: string) {
  const response = await authFetch('/api/gamification/quest-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questId })
  });
  if (!response.ok) throw new Error('Impossible de valider la quête');
  return response.json();
}

export async function fetchQuests() {
  const response = await authFetch('/api/gamification/quests');
  if (!response.ok) throw new Error('Quêtes indisponibles');
  return (await response.json()).quests || [];
}

export async function recordProfileVisit(visitedUserId: string, durationSeconds = 0) {
  const response = await authFetch('/api/profile-visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitedUserId, durationSeconds })
  });
  if (!response.ok && response.status !== 204) throw new Error('Visite indisponible');
}

export async function fetchReceivedProfileVisits() {
  const response = await authFetch('/api/profile-visits/received');
  if (!response.ok) throw new Error('Visites indisponibles');
  return (await response.json()).visits || [];
}

export async function fetchFavorites() {
  const response = await authFetch('/api/favorites');
  if (!response.ok) throw new Error('Favoris indisponibles');
  return (await response.json()).favorites || [];
}

export async function addFavorite(profileId: string) {
  const response = await authFetch(`/api/favorites/${encodeURIComponent(profileId)}`, { method: 'POST' });
  if (!response.ok) throw new Error('Impossible d’ajouter ce profil aux favoris');
  return response.json();
}

export async function removeFavorite(profileId: string) {
  const response = await authFetch(`/api/favorites/${encodeURIComponent(profileId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Impossible de retirer ce profil des favoris');
}

export async function fetchPrivacySettings() {
  const response = await authFetch('/api/privacy/settings');
  if (!response.ok) throw new Error('Confidentialité indisponible');
  return (await response.json()).settings;
}

export async function fetchPrivacySettingsWithEntitlements() {
  const response = await authFetch('/api/privacy/settings');
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Confidentialité indisponible');
  }
  return {
    settings: payload?.settings,
    incognitoAvailable: Boolean(payload?.incognitoAvailable)
  };
}

export async function updatePrivacySettings(updates: {
  incognito_mode?: boolean;
  profile_paused?: boolean;
  show_online_status?: boolean;
  show_distance?: boolean;
  allow_calls?: boolean;
}) {
  const response = await authFetch('/api/privacy/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Impossible de sauvegarder la confidentialité');
  }
  return payload.settings;
}

export async function sendCallSignal(input: {
  callId: string;
  receiverId: string;
  signalType: 'offer' | 'answer' | 'ice' | 'hangup';
  payload: unknown;
}) {
  const response = await authFetch('/api/calls/signals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Signalisation d’appel indisponible');
  return response.json();
}

export async function fetchCallSignals(callId: string) {
  const response = await authFetch(`/api/calls/signals/${encodeURIComponent(callId)}`);
  if (!response.ok) throw new Error('Signaux d’appel indisponibles');
  return (await response.json()).signals || [];
}

export async function fetchIncomingCallSignals() {
  const response = await authFetch('/api/calls/incoming');
  if (!response.ok) throw new Error('Appels entrants indisponibles');
  return (await response.json()).signals || [];
}
