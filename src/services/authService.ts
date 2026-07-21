import {
  IDENTITY_SERVICE_BASE_URL,
  TEMPLE_SERVICE_BASE_URL,
  IDENTITY_SERVICE_ENDPOINTS,
  TEMPLE_SERVICE_ENDPOINTS
} from './apiEndpoint';
import { parseJsonResponse } from './apiClient';
import type { Astrologer } from '../types';

export type OtpChannel = 'whatsapp' | 'sms';

export const authService = {
  async requestOtp(phone: string, channel: OtpChannel = 'whatsapp'): Promise<{ otpId: string }> {
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
    const res = await fetch(`${IDENTITY_SERVICE_BASE_URL}${IDENTITY_SERVICE_ENDPOINTS.verifyOtp}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, channel, type: 'astro' })
    });
    const data = await parseJsonResponse<{ accessToken: string; refreshToken: string; userId: string }>(res);
    return data.data;
  },

  async getProfile(accessToken: string): Promise<Astrologer> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerMe}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await parseJsonResponse<{ astrologer: Astrologer }>(res);
    return data.data.astrologer;
  },

  async updatePresence(accessToken: string, presenceStatus: 'online' | 'offline'): Promise<Astrologer> {
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
