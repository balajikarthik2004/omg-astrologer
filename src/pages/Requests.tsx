import { useCallback, useEffect, useState } from "react";
import {
  IndianRupee,
  Sparkles,
  Check,
  MessageCircle,
  Video,
  PhoneCall,
  Clock,
  CalendarDays,
  User,
  Hash,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { consultationService } from "../services/consultationService";
import { getErrorMessage } from "../services/apiClient";
import type { Astrologer, ConsultationEndReason, ConsultationMode, ConsultationQueueEntry } from "../types";

const POLL_INTERVAL_MS = 5000;

type Tab = "notified" | "expired" | "completed" | "declined";

const TABS: { id: Tab; label: string }[] = [
  { id: "notified", label: "Notified" },
  { id: "expired", label: "Expired" },
  { id: "completed", label: "Completed" },
  { id: "declined", label: "Declined" }
];

const EXPIRY_END_REASONS: ConsultationEndReason[] = ["join_timeout", "payment_timeout"];

function isExpiredEntry(request: ConsultationQueueEntry): boolean {
  return (
    request.status === "accepted" &&
    request.session?.status === "ended" &&
    !!request.session.end_reason &&
    EXPIRY_END_REASONS.includes(request.session.end_reason)
  );
}

function matchesTab(request: ConsultationQueueEntry, tab: Tab): boolean {
  if (tab === "notified") return request.status === "waiting" || request.status === "notified";
  // "Expired" = accepted but the devotee never joined / never paid before the deadline.
  // "Completed" = the linked session ended for any other reason (an actual call happened).
  if (tab === "expired") return isExpiredEntry(request);
  if (tab === "completed") return request.status === "accepted" && request.session?.status === "ended" && !isExpiredEntry(request);
  return request.status === "declined";
}

function isAcceptedRequest(request: ConsultationQueueEntry): boolean {
  return request.status === "accepted" && request.session?.status !== "ended";
}

const MODE_ICON: Record<ConsultationMode, typeof MessageCircle> = {
  chat: MessageCircle,
  voice: PhoneCall,
  video: Video
};

const MODE_LABEL: Record<ConsultationMode, string> = {
  chat: "Chat Consultation",
  voice: "Voice Consultation",
  video: "Video Consultation"
};

function formatRequestedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getEstimatedPrice(mode: ConsultationMode | null, minutes: number | null, astrologer: Astrologer | null): string | null {
  if (!mode || minutes == null || !astrologer) return null;
  const rateKey =
    mode === "chat" ? astrologer.price_per_minute_chat : mode === "voice" ? astrologer.price_per_minute_voice : astrologer.price_per_minute_video;
  const rate = Number(rateKey ?? 0);
  if (!rate) return null;
  return (rate * minutes).toFixed(0);
}

/**
 * Whether this request is (or turned out to be) a free-trial consultation — before accept
 * this is only a preview (the astrologer hasn't decided yet, and free-trial eligibility is
 * only truly resolved server-side at accept time), after accept it's the confirmed truth
 * from the linked session.
 */
function isFreeRequest(request: ConsultationQueueEntry): boolean {
  return request.free_trial_eligible === true || request.session?.free_trial_duration_minutes != null;
}

/**
 * The devotee's own requested_duration_minutes only applies to the paid path (the app
 * omits it entirely for free requests, since the free duration comes from the
 * astrologer's own free-trial config, not the devotee's choice) — so for a free request,
 * show the free-trial duration instead: the confirmed one from the session once accepted,
 * or the same preview used for the "Free" badge before that.
 */
function getDisplayDuration(request: ConsultationQueueEntry): number | null {
  if (request.session?.free_trial_duration_minutes != null) return request.session.free_trial_duration_minutes;
  if (request.free_trial_eligible === true) return request.free_trial_preview_duration_minutes;
  return request.requested_duration_minutes;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const BADGE_BASE = "inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border";

/**
 * Accepted requests don't have one fixed state — until the devotee joins, the session sits
 * on a countdown to `join_deadline_at` (see the backend's join-timeout feature), after which
 * it's either connected, expired with nobody showing up, or ended some other way.
 */
function renderAcceptedStatus(request: ConsultationQueueEntry, nowMs: number) {
  const session = request.session;
  if (!session) {
    return <span className={`${BADGE_BASE} text-emerald-700 bg-emerald-50 border-emerald-200`}>Accepted</span>;
  }

  if (session.user_joined_at) {
    return session.status === "ended" ? (
      <span className={`${BADGE_BASE} text-gray-600 bg-gray-100 border-gray-200`}>Session Ended</span>
    ) : (
      <span className={`${BADGE_BASE} text-emerald-700 bg-emerald-50 border-emerald-200`}>Connected</span>
    );
  }

  if (session.status === "ended") {
    if (session.end_reason === "join_timeout") {
      return <span className={`${BADGE_BASE} text-red-700 bg-red-50 border-red-200`}>Expired — no show</span>;
    }
    if (session.end_reason === "payment_timeout") {
      return <span className={`${BADGE_BASE} text-red-700 bg-red-50 border-red-200`}>Expired — unpaid</span>;
    }
    return <span className={`${BADGE_BASE} text-gray-600 bg-gray-100 border-gray-200`}>Ended</span>;
  }

  // Still awaiting payment — count down to when the payment link itself expires.
  if (session.status === "awaiting_payment") {
    if (!session.payment_link_expires_at) {
      return <span className={`${BADGE_BASE} text-amber-700 bg-amber-50 border-amber-200`}>Awaiting Payment</span>;
    }
    const remainingSeconds = Math.max(0, Math.round((new Date(session.payment_link_expires_at).getTime() - nowMs) / 1000));
    const tone = remainingSeconds <= 30 ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200";
    return (
      <span className={`${BADGE_BASE} ${tone}`}>
        {remainingSeconds > 0 ? `Payment due in ${formatCountdown(remainingSeconds)}` : "Expiring..."}
      </span>
    );
  }

  // Granted but not yet connected — a free trial waiting for the devotee to join
  // (free_pending), or a connectable session (free_period/paid_active) that hasn't been
  // joined yet. Either way, count down to the join deadline.
  if (!session.join_deadline_at) {
    return <span className={`${BADGE_BASE} text-emerald-700 bg-emerald-50 border-emerald-200`}>Accepted</span>;
  }

  const remainingSeconds = Math.max(0, Math.round((new Date(session.join_deadline_at).getTime() - nowMs) / 1000));
  const tone = remainingSeconds <= 30 ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200";
  return (
    <span className={`${BADGE_BASE} ${tone}`}>
      {remainingSeconds > 0 ? `Joins in ${formatCountdown(remainingSeconds)}` : "Expiring..."}
    </span>
  );
}

export function Requests() {
  const navigate = useNavigate();
  const location = useLocation();
  const [requests, setRequests] = useState<ConsultationQueueEntry[]>([]);
  const [astrologer, setAstrologer] = useState<Astrologer | null>(authService.getStoredAstrologer());
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("notified");
  const [selectedRequest, setSelectedRequest] = useState<ConsultationQueueEntry | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshQueue = useCallback(async () => {
    const token = authService.getAccessToken();
    if (!token) return;
    try {
      const entries = await consultationService.getQueue(token);
      setRequests(entries);
    } catch {
      // ignore transient errors, next poll retries
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = authService.getAccessToken();
    if (!token) return;
    try {
      const fresh = await authService.getProfile(token);
      authService.updateStoredAstrologer(fresh);
      setAstrologer(fresh);
    } catch {
      // ignore transient errors, next poll retries
    }
  }, []);

  const checkOngoingSession = useCallback(async () => {
    const token = authService.getAccessToken();
    if (!token) return;
    try {
      const { session } = await consultationService.getOngoing(token);
      if (session) navigate(`/call/${session.id}`, { replace: true });
    } catch {
      // ignore transient errors, next poll retries
    }
  }, [navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, no data-fetching lib in this project
    Promise.all([refreshQueue(), refreshProfile(), checkOngoingSession()]).finally(() => setLoading(false));
    const interval = setInterval(() => {
      refreshQueue();
      refreshProfile();
      checkOngoingSession();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshQueue, refreshProfile, checkOngoingSession]);

  useEffect(() => {
    const stateInfo = (location.state as { info?: string } | null)?.info;
    if (!stateInfo) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time pickup of a message passed via navigate() state
    setInfo(stateInfo);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only ever run once per navigation that carries state
  }, []);

  const handleNotify = async (id: string) => {
    const token = authService.getAccessToken();
    if (!token) return;
    setError(null);
    setRespondingId(id);
    try {
      await consultationService.notifyQueueEntry(token, id);
      toast.success("Devotee notified successfully.");
      await refreshQueue();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to notify user"));
    } finally {
      setRespondingId(null);
    }
  };

  const handleAccept = async (id: string) => {
    const token = authService.getAccessToken();
    if (!token) return;
    setError(null);
    setInfo(null);
    setRespondingId(id);
    try {
      const result = await consultationService.acceptRequest(token, id);
      const msg = result.free_trial_granted
        ? "Free consultation approved — waiting for the devotee to join."
        : "Request accepted — waiting for the devotee to complete payment.";
      
      toast.success(msg);
      await Promise.all([refreshQueue(), refreshProfile()]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to accept request"));
    } finally {
      setRespondingId(null);
    }
  };

  const handleDecline = async (id: string) => {
    const token = authService.getAccessToken();
    if (!token) return;
    setError(null);
    setRespondingId(id);
    try {
      await consultationService.declineRequest(token, id);
      toast.info("Request declined.");
      await refreshQueue();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to decline request"));
    } finally {
      setRespondingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "waiting" || r.status === "notified").length;
  const activeAcceptedRequest = requests.find(isAcceptedRequest);
  const visibleRequests = requests.filter((r) => matchesTab(r, activeTab));

  return (
    <div className=" animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Consultation Requests</h1>
          <p className="text-base text-gray-500 mt-1">Review and manage incoming consultation requests in real time.</p>
        </div>
        <div className="bg-primary/5 text-primary font-bold px-4 py-2 rounded-lg border border-primary/20">
          {pendingCount} Pending
        </div>
      </div>

      {/* Active Accepted Request Section */}
      {activeAcceptedRequest && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/20 border border-emerald-200/50 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                  Active Consultation
                </span>
                {renderAcceptedStatus(activeAcceptedRequest, now)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {activeAcceptedRequest.contact_name || "Guest"}
                  <span className="text-xs font-semibold text-gray-500">
                    ({activeAcceptedRequest.mode ? MODE_LABEL[activeAcceptedRequest.mode] : "Consultation"})
                  </span>
                </h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <span>Requested: {formatRequestedAt(activeAcceptedRequest.requested_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Duration: {getDisplayDuration(activeAcceptedRequest) != null ? `${getDisplayDuration(activeAcceptedRequest)} mins` : "—"}</span>
                  </div>
                  {isFreeRequest(activeAcceptedRequest) ? (
                    <span className="inline-flex items-center text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg uppercase tracking-wider border border-primary/20">
                      Free
                    </span>
                  ) : getEstimatedPrice(activeAcceptedRequest.mode, activeAcceptedRequest.requested_duration_minutes, astrologer) != null && (
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Est. Earnings: ₹{getEstimatedPrice(activeAcceptedRequest.mode, activeAcceptedRequest.requested_duration_minutes, astrologer)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                className="text-emerald-700 border-emerald-200/80 hover:bg-emerald-50/50 font-bold h-10 rounded-xl text-xs px-5 shadow-sm"
                onClick={() => setSelectedRequest(activeAcceptedRequest)}
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-100/80 p-1.5 rounded-xl flex flex-wrap gap-1.5 w-full md:w-fit border border-gray-200/50">
        {TABS.map((tab) => {
          const count = requests.filter((r) => matchesTab(r, tab.id)).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-auto py-2.5 px-4 rounded-lg text-[10px] md:text-[11px] font-bold transition-all uppercase tracking-wider focus:outline-none whitespace-nowrap ${activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
            >
              {tab.label} <span className="ml-0.5 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {loading ? (
          <p className="text-sm text-gray-500">Loading requests...</p>
        ) : visibleRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {activeTab === "notified" ? "All caught up!" : `No ${activeTab} requests`}
            </h3>
            <p className="text-gray-500 mt-2 max-w-sm">
              {activeTab === "notified"
                ? "You have no pending consultation requests to review at this time."
                : `You don't have any ${activeTab} requests yet.`}
            </p>
          </motion.div>
        ) : (
          <div className="w-full overflow-x-hidden md:overflow-visible pb-4 px-1">
            <table className="w-full text-sm text-left block md:table border-separate md:border-spacing-y-3">
              <thead className="hidden md:table-header-group text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-2 pl-6">Devotee & Mode</th>
                  <th className="px-5 py-2">Requested At</th>
                  <th className="px-5 py-2">Duration</th>
                  <th className="px-5 py-2">Est. Earnings</th>
                  <th className="px-5 py-2">Status</th>
                  <th className="px-5 py-2 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {visibleRequests.map((request) => {
                  const isResponding = respondingId === request.id;
                  const ModeIcon = request.mode ? MODE_ICON[request.mode] : Sparkles;
                  const price = getEstimatedPrice(request.mode, request.requested_duration_minutes, astrologer);
                  const displayDuration = getDisplayDuration(request);

                  return (
                    <tr
                      key={request.id}
                      className="block md:table-row bg-white hover:bg-gray-50/80 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md mb-4 md:mb-0 rounded-2xl md:rounded-none border border-gray-100 md:border-none"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-4 md:px-5 md:pl-6 md:rounded-l-2xl md:border-y md:border-l border-b md:border-b-0 border-gray-50 md:border-gray-100/50">
                        <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Devotee</span>
                        <div className="flex items-center gap-3 md:gap-4 text-right md:text-left min-w-0">
                          <div className="hidden md:flex w-11 h-11 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 items-center justify-center shrink-0 shadow-sm border border-primary/10 group-hover:scale-110 transition-transform duration-300">
                            <ModeIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex items-center md:items-start flex-row-reverse md:flex-col gap-2 md:gap-0 min-w-0">
                            <div className="font-bold text-[14px] md:text-[15px] text-gray-900 group-hover:text-primary transition-colors truncate max-w-[150px] md:max-w-[200px]">
                              {request.contact_name || "Guest"}
                            </div>
                            <div className="text-xs font-semibold text-gray-500 mt-0 md:mt-0.5 flex items-center gap-1 shrink-0">
                              <ModeIcon className="w-3.5 h-3.5 md:hidden text-primary" />
                              {request.mode ? MODE_LABEL[request.mode] : "Consultation"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-3 md:px-5 md:py-4 font-semibold text-gray-600 md:border-y md:border-gray-100/50 border-b md:border-b-0 border-gray-50">
                        <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Requested At</span>
                        <div className="flex items-center gap-2 text-[13px] md:text-sm">
                          <CalendarDays className="w-4 h-4 text-gray-400 hidden md:block" />
                          {formatRequestedAt(request.requested_at)}
                        </div>
                      </td>
                      <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-3 md:px-5 md:py-4 font-bold text-gray-900 md:border-y md:border-gray-100/50 border-b md:border-b-0 border-gray-50">
                        <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duration</span>
                        <div className="flex items-center gap-2 text-[13px] md:text-sm">
                          <Clock className="w-4 h-4 text-gray-400 hidden md:block" />
                          {displayDuration != null ? `${displayDuration} mins` : "—"}
                        </div>
                      </td>
                      <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-3 md:px-5 md:py-4 font-bold text-emerald-700 md:border-y md:border-gray-100/50 border-b md:border-b-0 border-gray-50">
                        <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Est. Earnings</span>
                        <div>
                          {isFreeRequest(request) ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-primary/20">
                              Free
                            </span>
                          ) : price != null ? (
                            <span className="flex items-center text-[14px] md:text-[15px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-100 w-fit">
                              <IndianRupee className="w-4 h-4 mr-0.5" />
                              {price}
                            </span>
                          ) : (
                            "—"
                          )}
                        </div>
                      </td>
                      <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-3 md:px-5 md:py-4 md:border-y md:border-gray-100/50 border-b md:border-b-0 border-gray-50">
                        <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                        <div>
                          {request.status === "declined" ? (
                            <span className="inline-flex items-center text-[11px] font-bold text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                              Declined
                            </span>
                          ) : request.status === "accepted" ? (
                            renderAcceptedStatus(request, now)
                          ) : request.status === "notified" ? (
                            <span className="inline-flex items-center text-[11px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                              Notified
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                              Waiting
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="flex flex-col md:flex-row items-end md:items-center justify-between gap-3 md:gap-0 md:table-cell px-4 py-4 md:px-5 md:pr-6 md:text-right md:rounded-r-2xl md:border-y md:border-r md:border-gray-100/50">
                        <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-full text-left">Actions</span>
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          {request.status === "declined" || request.status === "accepted" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:bg-primary/5 transition-all rounded-xl font-bold text-xs px-4 h-9 border border-transparent hover:border-primary/10 w-full md:w-auto justify-center md:justify-end"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(request);
                              }}
                            >
                              Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          ) : (
                            <>
                              {request.status === "waiting" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-gray-700 border-gray-200 hover:bg-gray-50 font-bold h-9 rounded-xl text-xs px-4 shadow-sm flex-1 md:flex-none justify-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotify(request.id);
                                  }}
                                  disabled={isResponding}
                                >
                                  Notify
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50 font-bold h-9 rounded-xl text-xs px-4 shadow-sm flex-1 md:flex-none justify-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDecline(request.id);
                                }}
                                disabled={isResponding}
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 rounded-xl text-xs px-5 shadow-sm hover:shadow transition-all flex-1 md:flex-none justify-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(request.id);
                                }}
                                disabled={isResponding || astrologer?.presence_status === "busy"}
                              >
                                Accept
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AnimatePresence>
      {/* Side Slider Panel / Drawer */}
      <AnimatePresence>
        {selectedRequest && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 h-full w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col border-l border-gray-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {(() => {
                      const ModeIcon = selectedRequest.mode ? MODE_ICON[selectedRequest.mode] : Sparkles;
                      return <ModeIcon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedRequest.mode ? MODE_LABEL[selectedRequest.mode] : "Consultation Request"}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Request Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 rounded-full hover:bg-gray-150 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Devotee Info</h4>
                  <div className="space-y-3">
                    <DrawerField icon={User} label="Devotee Name" value={selectedRequest.contact_name || "Guest"} />
                    <DrawerField icon={selectedRequest.mode === "chat" ? MessageCircle : selectedRequest.mode === "video" ? Video : PhoneCall} label="Consultation Mode" value={selectedRequest.mode ? MODE_LABEL[selectedRequest.mode] : "—"} />
                    <DrawerField
                      icon={Clock}
                      label={isFreeRequest(selectedRequest) ? "Free Trial Duration" : "Requested Duration"}
                      value={getDisplayDuration(selectedRequest) ? `${getDisplayDuration(selectedRequest)} mins` : "—"}
                    />
                    <DrawerField
                      icon={IndianRupee}
                      label="Est. Earnings"
                      value={
                        isFreeRequest(selectedRequest)
                          ? "Free"
                          : getEstimatedPrice(selectedRequest.mode, selectedRequest.requested_duration_minutes, astrologer)
                            ? `₹ ${getEstimatedPrice(selectedRequest.mode, selectedRequest.requested_duration_minutes, astrologer)}`
                            : "—"
                      }
                    />
                    <DrawerField icon={CalendarDays} label="Requested At" value={formatRequestedAt(selectedRequest.requested_at)} />
                    <DrawerField icon={Hash} label="Status" value={selectedRequest.status} />
                  </div>
                </div>

                {selectedRequest.reason_text && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reason for Consultation</h4>
                    <p className="text-sm text-gray-705 bg-gray-50 p-4 rounded-xl border border-gray-100 font-semibold italic">
                      "{selectedRequest.reason_text}"
                    </p>
                  </div>
                )}
              </div>

              {/* Actions Footer inside the Drawer */}
              {selectedRequest.status !== "declined" && selectedRequest.status !== "accepted" && (
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-3 shrink-0">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-sm rounded-lg"
                    onClick={() => {
                      handleAccept(selectedRequest.id);
                      setSelectedRequest(null);
                    }}
                    disabled={respondingId === selectedRequest.id || astrologer?.presence_status === "busy"}
                  >
                    Accept Request
                  </Button>
                  {selectedRequest.status === "waiting" && (
                    <Button
                      variant="outline"
                      className="w-full text-primary border-primary/20 hover:bg-primary/5 font-bold h-12 rounded-lg"
                      onClick={() => {
                        handleNotify(selectedRequest.id);
                        setSelectedRequest(null);
                      }}
                      disabled={respondingId === selectedRequest.id}
                    >
                      Notify Devotee
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-bold h-12 rounded-lg"
                    onClick={() => {
                      handleDecline(selectedRequest.id);
                      setSelectedRequest(null);
                    }}
                    disabled={respondingId === selectedRequest.id}
                  >
                    Decline Request
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DrawerField({
  icon: Icon,
  label,
  value
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-500">
        <Icon className="w-4 h-4 text-gray-400" />
        <span>{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-800 text-right capitalize">{value}</span>
    </div>
  );
}
