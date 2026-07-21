import { TEMPLE_SERVICE_BASE_URL, TEMPLE_SERVICE_ENDPOINTS } from './apiEndpoint';
import { parseJsonResponse } from './apiClient';
import type {
  AcceptConsultationRequestResult,
  AgoraTokens,
  ConsultationEndReason,
  ConsultationNoteEntry,
  ConsultationPhase,
  ConsultationQueueEntry,
  ConsultationSession,
  DashboardStats,
  DevoteeBirthDetails
} from '../types';

function authHeaders(accessToken: string, withJson = false): HeadersInit {
  return withJson
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }
    : { Authorization: `Bearer ${accessToken}` };
}

export const consultationService = {
  async getDashboard(accessToken: string): Promise<DashboardStats> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerDashboard}`, {
      headers: authHeaders(accessToken)
    });
    const body = await parseJsonResponse<DashboardStats>(res);
    return body.data;
  },

  async getHistory(
    accessToken: string,
    params: { offset?: number; limit?: number } = {}
  ): Promise<{ data: ConsultationSession[]; total: number }> {
    const query = new URLSearchParams();
    if (params.offset != null) query.set('offset', String(params.offset));
    if (params.limit != null) query.set('limit', String(params.limit));
    const qs = query.toString();

    const res = await fetch(
      `${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerLiveConsultationHistory}${qs ? `?${qs}` : ''}`,
      { headers: authHeaders(accessToken) }
    );
    const body = await parseJsonResponse<{ data: ConsultationSession[]; total: number }>(res);
    return body.data;
  },

  async getQueue(accessToken: string): Promise<ConsultationQueueEntry[]> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerConsultationQueue}`, {
      headers: authHeaders(accessToken)
    });
    const body = await parseJsonResponse<{ data: ConsultationQueueEntry[] }>(res);
    return body.data.data;
  },

  async notifyQueueEntry(accessToken: string, id: string): Promise<ConsultationQueueEntry> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerConsultationQueueNotify(id)}`, {
      method: 'PATCH',
      headers: authHeaders(accessToken)
    });
    const body = await parseJsonResponse<{ queueEntry: ConsultationQueueEntry }>(res);
    return body.data.queueEntry;
  },

  async acceptRequest(accessToken: string, id: string): Promise<AcceptConsultationRequestResult> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerConsultationQueueAccept(id)}`, {
      method: 'POST',
      headers: authHeaders(accessToken)
    });
    const body = await parseJsonResponse<AcceptConsultationRequestResult>(res);
    return body.data;
  },

  async declineRequest(accessToken: string, id: string): Promise<ConsultationQueueEntry> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerConsultationQueueDecline(id)}`, {
      method: 'POST',
      headers: authHeaders(accessToken)
    });
    const body = await parseJsonResponse<{ request: ConsultationQueueEntry }>(res);
    return body.data.request;
  },

  async getOngoing(accessToken: string): Promise<{ session: ConsultationSession | null; phase: ConsultationPhase }> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerLiveConsultationOngoing}`, {
      headers: authHeaders(accessToken)
    });
    const body = await parseJsonResponse<{ session: ConsultationSession | null; phase: ConsultationPhase }>(res);
    return body.data;
  },

  async join(
    accessToken: string,
    sessionId: string
  ): Promise<{
    session: ConsultationSession;
    phase: ConsultationPhase;
    remaining_seconds: number;
    expires_at: string | null;
    agora: AgoraTokens | null;
    devotee: DevoteeBirthDetails | null;
    notes: ConsultationNoteEntry[];
    end_reason: ConsultationEndReason | null;
    message?: string;
  }> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerLiveConsultationJoin(sessionId)}`, {
      headers: authHeaders(accessToken)
    });
    const body = await parseJsonResponse<{
      session: ConsultationSession;
      phase: ConsultationPhase;
      remaining_seconds: number;
      expires_at: string | null;
      agora: AgoraTokens | null;
      devotee: DevoteeBirthDetails | null;
      notes: ConsultationNoteEntry[];
      end_reason: ConsultationEndReason | null;
      message?: string;
    }>(res);
    return body.data;
  },

  async endSession(accessToken: string, sessionId: string): Promise<ConsultationSession> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerLiveConsultationEnd(sessionId)}`, {
      method: 'POST',
      headers: authHeaders(accessToken)
    });
    const body = await parseJsonResponse<{ session: ConsultationSession }>(res);
    return body.data.session;
  },

  async addNote(accessToken: string, sessionId: string, noteText: string): Promise<ConsultationNoteEntry> {
    const res = await fetch(`${TEMPLE_SERVICE_BASE_URL}${TEMPLE_SERVICE_ENDPOINTS.astrologerLiveConsultationNotes(sessionId)}`, {
      method: 'POST',
      headers: authHeaders(accessToken, true),
      body: JSON.stringify({ note_text: noteText })
    });
    const body = await parseJsonResponse<{ note: ConsultationNoteEntry }>(res);
    return body.data.note;
  }
};
