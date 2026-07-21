export const TEMPLE_SERVICE_ENDPOINTS = {
  astrologerMe: '/astrologer/me',
  astrologerDashboard: '/astrologer/dashboard',
  astrologerPresence: '/astrologer/presence',
  astrologerLiveConsultationHistory: '/astrologer/live-consultations/history',
  astrologerConsultationQueue: '/astrologer/consultation-queue',
  astrologerConsultationQueueNotify: (id: string) => `/astrologer/consultation-queue/${id}/notify`,
  astrologerConsultationQueueAccept: (id: string) => `/astrologer/consultation-queue/${id}/accept`,
  astrologerConsultationQueueDecline: (id: string) => `/astrologer/consultation-queue/${id}/decline`,
  astrologerLiveConsultationOngoing: '/astrologer/live-consultations/ongoing',
  astrologerLiveConsultationJoin: (id: string) => `/astrologer/live-consultations/${id}/join`,
  astrologerLiveConsultationEnd: (id: string) => `/astrologer/live-consultations/${id}/end`,
  astrologerLiveConsultationNotes: (id: string) => `/astrologer/live-consultations/${id}/notes`
};
