import {
  IDENTITY_SERVICE_BASE_URL,
  TEMPLE_SERVICE_BASE_URL,
  IDENTITY_SERVICE_ENDPOINTS,
  TEMPLE_SERVICE_ENDPOINTS
} from './apiEndpoint';
import { parseJsonResponse } from './apiClient';
import type { Astrologer } from '../types';

export type OtpChannel = 'whatsapp' | 'sms';

/**
 * TEMPORARY: dummy login mode. When true, OTP request/verify and profile
 * fetch are faked locally so any phone number + any 6-digit OTP logs in.
 * Set to false to use the real backend again.
 */
export const USE_DUMMY_AUTH = true;

const DUMMY_ACCESS_TOKEN = 'dummy-access-token';
const DUMMY_REFRESH_TOKEN = 'dummy-refresh-token';

export const DUMMY_ASTROLOGER: Astrologer = {
  id: 'dummy-astrologer-1',
  name: 'Demo Astrologer',
  full_name: 'Demo Astrologer',
  display_name: 'Demo Astrologer',
  phone: '919876543210',
  email: 'demo@omg-astrologer.test',
  presence_status: 'online',
  profile_image: null,
  profile_photo_url: null,
  gender: 'other',
  experience_years: 8,
  languages: ['English', 'Hindi', 'Tamil'],
  specializations: ['Vedic', 'Tarot', 'Numerology'],
  bio: 'Experienced Vedic astrologer (demo account).',
  about_short: 'Guiding seekers with cosmic insight.',
  about: 'This is a demo astrologer profile used for testing the app without a backend.',
  rating: 4.8,
  total_reviews: 124,
  is_verified: true,
  is_active: true,
  price_per_minute_chat: 15,
  price_per_minute_voice: 20,
  price_per_minute_video: 30
};

export const authService = {
  async requestOtp(phone: string, channel: OtpChannel = 'whatsapp'): Promise<{ otpId: string }> {
    if (USE_DUMMY_AUTH) {
      return { otpId: 'dummy-otp-id' };
    }
    const res = await fetch(`${IDENTITY_SERVICE_BASE_URL}${IDENTITY_SERVICE_ENDPOINTS.requestOtp}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, channel, type: 'astro' })
    });
    const data = await parseJsonResponse<{ otpId: string }>(res);
    return data.data;
  },

  async verifyOtp(
    phone: string,
    otp: string,
    channel: OtpChannel = 'whatsapp'
  ): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    if (USE_DUMMY_AUTH) {
      return {
        accessToken: DUMMY_ACCESS_TOKEN,
        refreshToken: DUMMY_REFRESH_TOKEN,
        userId: DUMMY_ASTROLOGER.id
      };
    }
    const res = await fetch(`${IDENTITY_SERVICE_BASE_URL}${IDENTITY_SERVICE_ENDPOINTS.verifyOtp}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, channel, type: 'astro' })
    });
    const data = await parseJsonResponse<{ accessToken: string; refreshToken: string; userId: string }>(res);
    return data.data;
  },

  async getProfile(accessToken: string): Promise<Astrologer> {
    if (USE_DUMMY_AUTH) {
      return DUMMY_ASTROLOGER;
    }
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerMe}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await parseJsonResponse<{ astrologer: Astrologer }>(res);
    return data.data.astrologer;
  },

  async updatePresence(accessToken: string, presenceStatus: 'online' | 'offline'): Promise<Astrologer> {
    if (USE_DUMMY_AUTH) {
      const updated = { ...DUMMY_ASTROLOGER, presence_status: presenceStatus };
      return updated;
    }
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerPresence}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ presence_status: presenceStatus })
    });
    const data = await parseJsonResponse<{ astrologer: Astrologer }>(res);
    return data.data.astrologer;
  },

  storeSession(accessToken: string, refreshToken: string, astrologer: Astrologer) {
    localStorage.setItem('astrologerAccessToken', accessToken);
    localStorage.setItem('astrologerRefreshToken', refreshToken);
    localStorage.setItem('astrologer', JSON.stringify(astrologer));
  },

  updateStoredAstrologer(astrologer: Astrologer) {
    localStorage.setItem('astrologer', JSON.stringify(astrologer));
    window.dispatchEvent(new Event('astrologer_updated'));
  },

  getStoredAstrologer(): Astrologer | null {
    const raw = localStorage.getItem('astrologer');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Astrologer;
    } catch {
      return null;
    }
  },

  getAccessToken(): string | null {
    return localStorage.getItem('astrologerAccessToken');
  },

  logout() {
    localStorage.removeItem('astrologerAccessToken');
    localStorage.removeItem('astrologerRefreshToken');
    localStorage.removeItem('astrologer');
  }
};
