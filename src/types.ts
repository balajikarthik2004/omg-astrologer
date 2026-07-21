export interface Astrologer {
  id: string;
  name: string;
  full_name?: string | null;
  display_name?: string | null;
  phone: string;
  email?: string | null;
  presence_status: 'offline' | 'online' | 'busy';
  profile_image?: string | null;
  profile_photo_url?: string | null;
  gender?: string | null;
  experience_years?: number | null;
  languages?: string[] | null;
  specializations?: string[] | null;
  bio?: string | null;
  about_short?: string | null;
  about?: string | null;
  rating?: number | null;
  total_reviews?: number | null;
  is_verified?: boolean | null;
  display_order?: number | null;
  is_featured?: boolean | null;
  aadhaar_document_url?: string | null;
  certification_document_url?: string | null;
  verification_status?: string | null;
  is_active?: boolean | null;
  promo_video_url?: string | null;
  media?: unknown[] | null;
  price_per_minute_chat?: string | number | null;
  price_per_minute_voice?: string | number | null;
  price_per_minute_video?: string | number | null;
}

export interface DashboardStats {
  totals: {
    all_time_consultations: number;
    today_earnings: number;
    month_earnings: number;
    pending_requests: number;
    rating: number | null;
    total_reviews: number | null;
  };
  mode_breakdown: {
    chat: number;
    voice: number;
    video: number;
  };
  session_type_breakdown: {
    free: number;
    paid: number;
  };
  daily_trend: {
    date: string;
    earnings: number;
    sessions: number;
  }[];
}

export type ConsultationMode = 'chat' | 'voice' | 'video';

export type ConsultationSessionStatus =
  | 'requested'
  | 'awaiting_payment'
  | 'free_pending'
  | 'free_period'
  | 'paid_active'
  | 'ended'
  | 'terminated_low_balance';

export type ConsultationEndReason =
  | 'user_ended'
  | 'astrologer_ended'
  | 'low_balance'
  | 'time_expired'
  | 'disconnected_timeout'
  | 'join_timeout'
  | 'payment_timeout'
  | 'admin_intervention';

export interface ConsultationSession {
  id: string;
  contact_name: string | null;
  astrologer_id: string;
  mode: ConsultationMode;
  agora_channel_id: string;
  status: ConsultationSessionStatus;
  free_started_at: string | null;
  free_trial_duration_minutes: number | null;
  paid_until: string | null;
  ended_at: string | null;
  purchased_minutes: number | null;
  end_reason: ConsultationEndReason | null;
  ref_id: string;
  createdAt: string;
  updatedAt: string;
}

export type ConsultationQueueStatus = 'waiting' | 'notified' | 'accepted' | 'declined' | 'connected' | 'abandoned';

/** Just enough of an accepted request's linked session to show a live join-deadline countdown in the requests table. */
export interface QueueSessionSummary {
  id: string;
  status: ConsultationSessionStatus;
  join_deadline_at: string | null;
  user_joined_at: string | null;
  payment_link_expires_at: string | null;
  free_trial_duration_minutes: number | null;
  end_reason: ConsultationEndReason | null;
  ended_at: string | null;
}

export interface ConsultationQueueEntry {
  id: string;
  astrologer_id: string;
  user_id: string | null;
  requested_at: string;
  status: ConsultationQueueStatus;
  notified_at: string | null;
  mode: ConsultationMode | null;
  reason_text: string | null;
  requested_duration_minutes: number | null;
  contact_name: string | null;
  contact_email: string | null;
  phone_number: string;
  session_id: string | null;
  session: QueueSessionSummary | null;
  /** Preview only, for requests not yet acted on — whether this devotee's monthly free trial is currently available. Null once the astrologer has accepted/declined (the session/session-less truth takes over). */
  free_trial_eligible: boolean | null;
  /** Preview only (see free_trial_eligible) — how many minutes the free session would grant, if eligible. */
  free_trial_preview_duration_minutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export type ConsultationPhase = 'free_active' | 'free_ending_soon' | 'paid_active' | 'expired' | 'ended' | null;

export interface AgoraRtcToken {
  appId: string;
  channelName: string;
  uid: number;
  token: string;
  expiresInSeconds: number;
}

export interface AgoraRtmToken {
  appId: string;
  userId: string;
  token: string;
  expiresInSeconds: number;
}

export interface AgoraTokens {
  rtc: AgoraRtcToken | null;
  chat: AgoraRtmToken;
}

export interface DevoteeBirthDetails {
  id: string;
  name?: string;
  date_of_birth: string | null;
  time_of_birth: string | null;
}

export interface ConsultationNoteEntry {
  id: string;
  session_id: string;
  astrologer_id: string;
  phone_number: string;
  note_text: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptConsultationRequestResult {
  request: ConsultationQueueEntry;
  session: ConsultationSession;
  free_trial_granted: boolean;
  payment_required: boolean;
  order_id?: string;
  amount?: number;
  currency?: string;
  key?: string;
  agora: AgoraTokens | null;
}
