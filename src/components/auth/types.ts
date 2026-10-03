export type AuthMode = 'main' | 'email' | 'access_key';
export type EmailTab = 'login' | 'signup';

export interface AuthState {
  mode: AuthMode;
  emailTab: EmailTab;
  isLoading: boolean;
  error: string | null;
}
