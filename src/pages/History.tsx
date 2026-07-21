import { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle2,
  ChevronRight,
  CalendarDays,
  User,
  IndianRupee,
  Hash,
  MessageCircle,
  Video,
  PhoneCall,
  X
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "../services/authService";
import { consultationService } from "../services/consultationService";
import { getErrorMessage } from "../services/apiClient";
import type { ConsultationSession, ConsultationMode } from "../types";

const PAGE_SIZE = 20;

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

const END_REASON_LABEL: Record<string, string> = {
  user_ended: "Ended by devotee",
  astrologer_ended: "Ended by you",
  low_balance: "Ended — payment not completed",
  time_expired: "Time expired",
  disconnected_timeout: "Disconnected",
  admin_intervention: "Ended by admin"
};

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  };
}

function getDurationMinutes(session: ConsultationSession): number | null {
  return session.purchased_minutes ?? session.free_trial_duration_minutes ?? null;
}

function getPrice(session: ConsultationSession, astrologer: ReturnType<typeof authService.getStoredAstrologer>): string | null {
  if (session.free_trial_duration_minutes != null && session.purchased_minutes == null) return "Free Trial";
  if (session.purchased_minutes == null || !astrologer) return null;
  const rateKey =
    session.mode === "chat"
      ? astrologer.price_per_minute_chat
      : session.mode === "voice"
        ? astrologer.price_per_minute_voice
        : astrologer.price_per_minute_video;
  const rate = Number(rateKey ?? 0);
  if (!rate) return null;
  return (rate * session.purchased_minutes).toFixed(0);
}

export function History() {
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedSession, setSelectedSession] = useState<ConsultationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const astrologer = authService.getStoredAstrologer();

  const loadPage = async (offset: number) => {
    const token = authService.getAccessToken();
    if (!token) return;
    try {
      const { data, total: totalCount } = await consultationService.getHistory(token, { offset, limit: PAGE_SIZE });
      setSessions((prev) => (offset === 0 ? data : [...prev, ...data]));
      setTotal(totalCount);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load consultation history"));
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, no data-fetching lib in this project
    loadPage(0).finally(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadPage(sessions.length);
    setLoadingMore(false);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Consultation History</h1>
          <p className="text-base text-gray-500 mt-1">Review your past sessions.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading history...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No past consultations yet.</p>
      ) : (
        <div className="w-full overflow-x-hidden md:overflow-visible pb-4 px-1">
          <table className="w-full text-sm text-left block md:table border-separate md:border-spacing-y-3">
            <thead className="hidden md:table-header-group text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-2 pl-6">Mode</th>
                <th className="px-5 py-2">Date & Time</th>
                <th className="px-5 py-2">Devotee</th>
                <th className="px-5 py-2">Duration</th>
                <th className="px-5 py-2">Earnings</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2 pr-6 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {sessions.map((session) => {
                const wasSuccessful = session.status === "ended" && session.end_reason !== "low_balance";
                const { date, time } = formatDateTime(session.createdAt);
                const duration = getDurationMinutes(session);
                const price = getPrice(session, astrologer);
                const ModeIcon = MODE_ICON[session.mode];

                return (
                  <tr
                    key={session.id}
                    className="block md:table-row bg-white hover:bg-gray-50/80 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md mb-4 md:mb-0 rounded-2xl md:rounded-none border border-gray-100 md:border-none"
                    onClick={() => setSelectedSession(session)}
                  >
                    <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-4 md:px-5 md:pl-6 md:rounded-l-2xl md:border-y md:border-l border-b md:border-b-0 border-gray-50 md:border-gray-100/50 font-bold text-gray-900">
                      <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mode</span>
                      <div className="flex items-center gap-2.5 text-right md:text-left min-w-0">
                        <div className={`p-1.5 rounded-md ${wasSuccessful ? "bg-primary/5 text-primary" : "bg-gray-150 text-gray-400"}`}>
                          <ModeIcon className="w-4 h-4" />
                        </div>
                        <span>{MODE_LABEL[session.mode]}</span>
                      </div>
                    </td>
                    <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-3 md:px-5 md:py-4 font-medium text-gray-650 md:border-y md:border-gray-100/50 border-b md:border-b-0 border-gray-50">
                      <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date & Time</span>
                      <div className="text-right md:text-left">
                        {date} • {time}
                      </div>
                    </td>
                    <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-3 md:px-5 md:py-4 font-medium text-gray-650 md:border-y md:border-gray-100/50 border-b md:border-b-0 border-gray-50">
                      <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Devotee</span>
                      <div className="text-right md:text-left truncate max-w-[150px] md:max-w-[200px]">
                        {session.contact_name || "Guest"}
                      </div>
                    </td>
                    <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-3 md:px-5 md:py-4 font-medium text-gray-600 md:border-y md:border-gray-100/50 border-b md:border-b-0 border-gray-50">
                      <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duration</span>
                      <div className="text-right md:text-left">
                        {duration != null ? `${duration} mins` : "—"}
                      </div>
                    </td>
                    <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-3 md:px-5 md:py-4 font-bold text-gray-900 md:border-y md:border-gray-100/50 border-b md:border-b-0 border-gray-50">
                      <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Earnings</span>
                      <div className="flex justify-end md:justify-start">
                        {price === "Free Trial" ? (
                          <span className="text-secondary font-bold text-xs">{price}</span>
                        ) : price != null ? (
                          <span className="flex items-center">
                            <IndianRupee className="w-3 h-3 mr-0.5 text-gray-400" />
                            {price}
                          </span>
                        ) : (
                          "—"
                        )}
                      </div>
                    </td>
                    <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-3 md:px-5 md:py-4 md:border-y md:border-gray-100/50 border-b md:border-b-0 border-gray-50">
                      <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                      <div className="flex justify-end md:justify-start">
                        {wasSuccessful ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-secondary bg-secondary/5 px-2.5 py-0.5 rounded-full border border-secondary/10">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">
                            {END_REASON_LABEL[session.end_reason || ""] || "Ended"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="flex items-center justify-between gap-4 md:table-cell px-4 py-4 md:px-5 md:pr-6 md:text-right md:rounded-r-2xl md:border-y md:border-r md:border-gray-100/50">
                      <span className="md:hidden shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</span>
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:bg-primary/5 transition-all rounded-lg font-bold text-xs gap-0.5 px-3 h-8 border border-transparent hover:border-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                          }}
                        >
                          Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && sessions.length < total && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}

      {/* Side Slider Panel / Drawer */}
      <AnimatePresence>
        {selectedSession && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSession(null)}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {(() => {
                      const ModeIcon = MODE_ICON[selectedSession.mode];
                      return <ModeIcon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{MODE_LABEL[selectedSession.mode]}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Session Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 rounded-full hover:bg-gray-150 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Details Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Session Info</h4>
                  <div className="space-y-3">
                    <DrawerField icon={Hash} label="Reference ID" value={selectedSession.ref_id} />
                    <DrawerField icon={User} label="Devotee Name" value={selectedSession.contact_name || "Guest"} />
                    <DrawerField icon={CalendarDays} label="Date & Time" value={`${formatDateTime(selectedSession.createdAt).date} • ${formatDateTime(selectedSession.createdAt).time}`} />
                    <DrawerField icon={Clock} label="Duration" value={getDurationMinutes(selectedSession) ? `${getDurationMinutes(selectedSession)} mins` : "—"} />
                    <DrawerField icon={IndianRupee} label="Total Earnings" value={getPrice(selectedSession, astrologer) ? (getPrice(selectedSession, astrologer) === "Free Trial" ? "Free Trial" : `₹ ${getPrice(selectedSession, astrologer)}`) : "—"} />
                    <DrawerField icon={CheckCircle2} label="Termination Reason" value={END_REASON_LABEL[selectedSession.end_reason || ""] || selectedSession.status} />
                    {selectedSession.ended_at && (
                      <DrawerField icon={Clock} label="Ended At" value={formatDateTime(selectedSession.ended_at).time} />
                    )}
                  </div>
                </div>
              </div>
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
      <span className="text-sm font-bold text-gray-800 text-right">{value}</span>
    </div>
  );
}
