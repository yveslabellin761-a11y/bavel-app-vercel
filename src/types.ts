/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  credits: number;
  currency: string;
  type: 'credit_purchase' | 'subscription' | 'boost' | 'reward';
  provider: 'mobile_money' | 'card' | 'apple_pay' | 'reward';
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
}

export interface BoostState {
  isActive: boolean;
  startedAt: number | null;
  expiresAt: number | null;
  multiplier: number;
}

export interface UserQuest {
  id: string;
  title: string;
  description: string;
  rewardCredits: number;
  isCompleted: boolean;
  actionKey: 'selfie_verify' | 'bio' | 'photos_3' | 'location' | 'first_swipe';
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  seeking?: 'male' | 'female' | 'both';
  city: string;
  country?: string;
  neighborhood?: string;
  occupation: string;
  bio: string;
  avatarUrl: string;
  photos?: string[];
  zodiac?: string;
  matchPercentage: number;
  interests: string[];
  personalityTraits: string[];
  lifestyleTags?: string[];
  trustScore?: number;
  online: boolean;
  premium: boolean;
  verified?: boolean;
  conversations?: string[];
  height?: string;
  school?: string;
  jobTitle?: string;
  company?: string;
  drinking?: string;
  smoking?: string;
  kids?: string;
  educationLevel?: string;
  personality?: string;
  pets?: string;
  starSign?: string;
  religion?: string;
  credits?: number;
  coupDeCoeurCredits?: number;
  is_verified?: boolean;
  credits_balance?: number;
  user_status?: 'free' | 'premium' | 'vip';
  popularity_score?: number;
  videoUrl?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  isSystem?: boolean;
  isAudio?: boolean;
  audioDuration?: string;
  reactions?: string[];
  isSensitive?: boolean;
}

export interface ChatSession {
  profileId: string;
  messages: Message[];
  lastUpdated: string;
  unreadCount: number;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  age: number;
  gender: 'male' | 'female';
  seeking?: 'male' | 'female' | 'both';

  city: string;
  country?: string;
  bio?: string;
  avatarUrl?: string;
  avatarUrl2?: string;
  photos?: string[];
  verified?: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'verified';
  premium?: boolean;
  emailVerified?: boolean;
  trustScore?: number;
  lifestyleTags?: string[];
  height?: string;
  school?: string;
  jobTitle?: string;
  company?: string;
  drinking?: string;
  smoking?: string;
  kids?: string;
  educationLevel?: string;
  personality?: string;
  pets?: string;
  interests?: string[];
  starSign?: string;
  religion?: string;
  credits?: number;
  coupDeCoeurCredits?: number;
  is_verified?: boolean;
  credits_balance?: number;
  user_status?: 'free' | 'premium' | 'vip';
  popularity_score?: number;
  boost_expires_at?: number | null;
}

export type ActiveTab = 'discover' | 'swipes' | 'messages' | 'favorites' | 'profile' | 'activities';

export type AuthMode = 'main' | 'email' | 'access_key';
export type EmailTab = 'login' | 'signup';
export type ResetStep = 'request' | 'email_sent' | 'enter_new_password' | 'done';

export interface LoginScreenProps {
  onLoginSuccess: (userData?: {
    name?: string;
    email?: string;
    phone?: string;
    isGoogle?: boolean;
    isNewUser?: boolean;
    savedProfile?: any;
    savedPhotos?: string[];
  }) => void;
  onRegisterStart?: (userData: { email?: string; phone?: string; name?: string }) => void;
  onError?: (error: Error) => void;
  redirectUrl?: string;
}
