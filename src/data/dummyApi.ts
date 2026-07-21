import type {
  ConsultationNoteEntry,
  ConsultationQueueEntry,
  ConsultationSession,
  DashboardStats
} from '../types';

/**
 * TEMPORARY dummy data used when USE_DUMMY_AUTH is on, so the app is fully
 * usable without a backend. Remove/ignore once the real API is wired up.
 */

const ASTRO_ID = 'dummy-astrologer-1';

export const DUMMY_DASHBOARD: DashboardStats = {
  totals: {
    all_time_consultations: 1284,
    today_earnings: 4500,
    month_earnings: 86200,
    pending_requests: 3,
    rating: 4.8,
    total_reviews: 124
  },
  mode_breakdown: {
    chat: 540,
    voice: 480,
    video: 264
  },
  session_type_breakdown: {
    free: 320,
    paid: 964
  },
  daily_trend: [
    { date: '2026-07-15', earnings: 5200, sessions: 8 },
    { date: '2026-07-16', earnings: 6100, sessions: 10 },
    { date: '2026-07-17', earnings: 4800, sessions: 7 },
    { date: '2026-07-18', earnings: 7300, sessions: 12 },
    { date: '2026-07-19', earnings: 6900, sessions: 11 },
    { date: '2026-07-20', earnings: 8100, sessions: 14 },
    { date: '2026-07-21', earnings: 4500, sessions: 6 }
  ]
};

export const DUMMY_QUEUE: ConsultationQueueEntry[] = [
  {
    id: 'queue-1',
    astrologer_id: ASTRO_ID,
    user_id: 'user-1',
    requested_at: '2026-07-21T09:30:00.000Z',
    status: 'waiting',
    notified_at: null,
    mode: 'chat',
    reason_text: 'Starting a new tech venture — want to check planetary alignment before Navratri.',
    requested_duration_minutes: 30,
    contact_name: 'Sanjay Gupta',
    contact_email: 'sanjay@example.com',
    phone_number: '919812345678',
    session_id: null,
    session: null,
    free_trial_eligible: true,
    free_trial_preview_duration_minutes: 5,
    createdAt: '2026-07-21T09:30:00.000Z',
    updatedAt: '2026-07-21T09:30:00.000Z'
  },
  {
    id: 'queue-2',
    astrologer_id: ASTRO_ID,
    user_id: 'user-2',
    requested_at: '2026-07-21T10:05:00.000Z',
    status: 'waiting',
    notified_at: null,
    mode: 'voice',
    reason_text: 'Received a marriage proposal, need Kundali matching.',
    requested_duration_minutes: 45,
    contact_name: 'Meera Reddy',
    contact_email: 'meera@example.com',
    phone_number: '919898765432',
    session_id: null,
    session: null,
    free_trial_eligible: false,
    free_trial_preview_duration_minutes: null,
    createdAt: '2026-07-21T10:05:00.000Z',
    updatedAt: '2026-07-21T10:05:00.000Z'
  }
];

export const DUMMY_HISTORY: ConsultationSession[] = [
  {
    id: 'session-1',
    contact_name: 'Priya Singh',
    astrologer_id: ASTRO_ID,
    mode: 'chat',
    agora_channel_id: 'chan-1',
    status: 'ended',
    free_started_at: null,
    free_trial_duration_minutes: null,
    paid_until: null,
    ended_at: '2026-07-14T05:30:00.000Z',
    purchased_minutes: 45,
    end_reason: 'astrologer_ended',
    ref_id: 'REF-0001',
    createdAt: '2026-07-14T04:45:00.000Z',
    updatedAt: '2026-07-14T05:30:00.000Z'
  },
  {
    id: 'session-2',
    contact_name: 'Rahul Verma',
    astrologer_id: ASTRO_ID,
    mode: 'video',
    agora_channel_id: 'chan-2',
    status: 'ended',
    free_started_at: null,
    free_trial_duration_minutes: null,
    paid_until: null,
    ended_at: '2026-07-05T01:30:00.000Z',
    purchased_minutes: 60,
    end_reason: 'time_expired',
    ref_id: 'REF-0002',
    createdAt: '2026-07-05T00:30:00.000Z',
    updatedAt: '2026-07-05T01:30:00.000Z'
  },
  {
    id: 'session-3',
    contact_name: 'Vikram Malhotra',
    astrologer_id: ASTRO_ID,
    mode: 'voice',
    agora_channel_id: 'chan-3',
    status: 'ended',
    free_started_at: null,
    free_trial_duration_minutes: null,
    paid_until: null,
    ended_at: '2026-06-18T10:30:00.000Z',
    purchased_minutes: 30,
    end_reason: 'user_ended',
    ref_id: 'REF-0003',
    createdAt: '2026-06-18T10:00:00.000Z',
    updatedAt: '2026-06-18T10:30:00.000Z'
  }
];

export function makeDummyNote(sessionId: string, noteText: string): ConsultationNoteEntry {
  return {
    id: `note-${sessionId}-dummy`,
    session_id: sessionId,
    astrologer_id: ASTRO_ID,
    phone_number: '919812345678',
    note_text: noteText,
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z'
  };
}
