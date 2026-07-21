import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AgoraRTC from "agora-rtc-sdk-ng";
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm";
import type { RTMEvents } from "agora-rtm";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MessageCircle,
  PhoneOff,
  Send,
  StickyNote,
  User,
  Info,
  X,
  Loader2
} from "lucide-react";
import { authService } from "../services/authService";
import { consultationService } from "../services/consultationService";
import { getErrorMessage } from "../services/apiClient";
import { toast } from "sonner";
import type { ConsultationNoteEntry, ConsultationPhase, ConsultationSession, DevoteeBirthDetails } from "../types";

type RtmClient = InstanceType<typeof AgoraRTM.RTM>;

const STATUS_POLL_MS = 10000;

type PanelTab = "chat" | "notes" | "info";

interface ChatMessage {
  text: string;
  fromSelf: boolean;
  at: number;
}

const PHASE_LABELS: Record<string, string> = {
  free_active: "Free trial in progress",
  free_ending_soon: "Free trial ending soon",
  paid_active: "Paid session in progress",
  expired: "Time expired — waiting for extension",
  ended: "Call ended"
};

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDateOfBirth(dob: string | null): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return dob;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatNoteTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatTimeOfBirth(tob: string | null): string | null {
  if (!tob) return null;
  const [hours, minutes] = tob.split(":");
  const h = Number(hours);
  if (Number.isNaN(h) || minutes === undefined) return tob;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${minutes} ${period}`;
}

function formatChatTime(at: number): string {
  return new Date(at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function Call() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ConsultationSession | null>(null);
  const [phase, setPhase] = useState<ConsultationPhase>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [devotee, setDevotee] = useState<DevoteeBirthDetails | null>(null);
  const [notes, setNotes] = useState<ConsultationNoteEntry[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);

  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<IRemoteVideoTrack | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  // Which side panel is open. On desktop it docks alongside the stage; on mobile it slides over.
  const [activePanel, setActivePanel] = useState<PanelTab | null>(null);

  const rtcClientRef = useRef<IAgoraRTCClient | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const rtmRef = useRef<RtmClient | null>(null);
  const rtmUserIdRef = useRef<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const mode = session?.mode;
  const isVideo = mode === "video";
  const isVoice = mode === "voice";
  const isChat = mode === "chat";
  // const showChat = mode !== "voice"; // Conversation (chat) temporarily disabled
  const devoteeName = devotee?.name || session?.contact_name || "Devotee";

  const localVideoRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Small self-view PIP: "cover" fills the little box cleanly.
      if (node && localVideoTrack) localVideoTrack.play(node, { fit: "cover" });
    },
    [localVideoTrack]
  );

  const remoteVideoRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Main devotee view: "contain" shows the full camera frame instead of
      // zooming/cropping into the face the way the default "cover" does.
      if (node && remoteVideoTrack) remoteVideoTrack.play(node, { fit: "contain" });
    },
    [remoteVideoTrack]
  );

  const cleanup = useCallback(async () => {
    audioTrackRef.current?.close();
    videoTrackRef.current?.close();
    audioTrackRef.current = null;
    videoTrackRef.current = null;
    setLocalVideoTrack(null);
    setRemoteVideoTrack(null);
    setMicMuted(false);
    setCamOff(false);
    try {
      await rtcClientRef.current?.leave();
    } catch {
      /* already left */
    }
    try {
      await rtmRef.current?.logout();
    } catch {
      /* already logged out */
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function connect() {
      const token = authService.getAccessToken();
      if (!token) return;
      try {
        const {
          session: joinedSession,
          phase: joinedPhase,
          remaining_seconds,
          expires_at,
          agora,
          devotee: devoteeDetails,
          notes: pastNotes
        } = await consultationService.join(token, sessionId!);
        if (cancelled) return;
        setSession(joinedSession);
        setPhase(joinedPhase);
        setExpiresAt(expires_at);
        setRemainingSeconds(remaining_seconds);
        setDevotee(devoteeDetails);
        setNotes(pastNotes);
        // Conversation (chat) temporarily disabled — start with no panel open.
        // To re-enable, restore: joinedSession.mode === "chat" ? "chat" : null
        setActivePanel(null);

        if (agora?.rtc) {
          const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
          rtcClientRef.current = client;

          client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === "video") setRemoteVideoTrack(user.videoTrack || null);
            if (mediaType === "audio") user.audioTrack?.play();
          });

          client.on("user-unpublished", (_user, mediaType) => {
            if (mediaType === "video") setRemoteVideoTrack(null);
          });

          await client.join(agora.rtc.appId, agora.rtc.channelName, agora.rtc.token, agora.rtc.uid);

          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          audioTrackRef.current = audioTrack;
          const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [audioTrack];

          if (joinedSession.mode === "video") {
            const videoTrack = await AgoraRTC.createCameraVideoTrack();
            videoTrackRef.current = videoTrack;
            setLocalVideoTrack(videoTrack);
            tracksToPublish.push(videoTrack);
          }

          await client.publish(tracksToPublish);
        }

        if (agora?.chat && joinedSession.mode !== "voice") {
          const rtm = new AgoraRTM.RTM(agora.chat.appId, agora.chat.userId);
          rtmRef.current = rtm;
          rtmUserIdRef.current = agora.chat.userId;
          await rtm.login({ token: agora.chat.token });
          await rtm.subscribe(joinedSession.agora_channel_id);
          rtm.addEventListener("message", (evt: RTMEvents.MessageEvent) => {
            if (evt.publisher === rtmUserIdRef.current) return;
            if (typeof evt.message === "string") {
              setMessages((prev) => [...prev, { text: evt.message as string, fromSelf: false, at: Date.now() }]);
            }
          });
        }

        setConnecting(false);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to join call"));
          setConnecting(false);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [sessionId, cleanup]);

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      const token = authService.getAccessToken();
      if (!token) return;
      try {
        const {
          session: refreshed,
          phase: refreshedPhase,
          remaining_seconds,
          expires_at,
          end_reason
        } = await consultationService.join(token, sessionId);
        setSession(refreshed);
        setPhase(refreshedPhase);
        setExpiresAt(expires_at);
        setRemainingSeconds(remaining_seconds);
        if (refreshed.status === "ended" || refreshed.status === "terminated_low_balance") {
          clearInterval(interval);
          await cleanup();
          navigate("/requests", {
            replace: true,
            state:
              end_reason === "join_timeout"
                ? { info: "The devotee did not join in time — you're free to accept new requests." }
                : undefined
          });
        }
      } catch {
        // ignore transient poll errors
      }
    }, STATUS_POLL_MS);
    return () => clearInterval(interval);
  }, [sessionId, cleanup, navigate]);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const tick = () => setRemainingSeconds(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // Keep the chat pinned to the latest message whenever it's on screen.
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages, activePanel]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !rtmRef.current || !session) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      await rtmRef.current.publish(session.agora_channel_id, text);
      setMessages((prev) => [...prev, { text, fromSelf: true, at: Date.now() }]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send message"));
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !sessionId) return;
    const token = authService.getAccessToken();
    if (!token) return;
    setSavingNote(true);
    try {
      const note = await consultationService.addNote(token, sessionId, noteText.trim());
      setNotes((prev) => [...prev, note]);
      setNoteText("");
      toast.success("Note saved successfully.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save note"));
    } finally {
      setSavingNote(false);
    }
  };

  const handleEndCall = async () => {
    if (!sessionId) return;
    setEnding(true);
    const token = authService.getAccessToken();
    try {
      if (token) await consultationService.endSession(token, sessionId);
    } catch {
      // proceed to leave regardless
    }
    await cleanup();
    navigate("/requests", { replace: true });
  };

  const toggleMic = () => {
    if (audioTrackRef.current) {
      const next = !micMuted;
      audioTrackRef.current.setEnabled(!next);
      setMicMuted(next);
    }
  };

  const toggleCamera = () => {
    if (videoTrackRef.current) {
      const next = !camOff;
      videoTrackRef.current.setEnabled(!next);
      setCamOff(next);
    }
  };

  const togglePanel = (tab: PanelTab) => setActivePanel((prev) => (prev === tab ? null : tab));

  if (connecting) {
    return (
      <div className="min-h-screen bg-[#0b0d1a] flex flex-col items-center justify-center gap-5 text-white">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold">Connecting to your consultation…</p>
          <p className="text-xs text-white/50 mt-1">Setting up your camera and microphone</p>
        </div>
      </div>
    );
  }

  const showTimer = expiresAt && phase !== "ended" && phase !== "expired";
  const timerCritical = remainingSeconds <= 60;

  return (
    <div className="fixed inset-0 flex bg-[#0b0d1a] text-white overflow-hidden">
      {/* ===== Stage ===== */}
      <section className="relative flex-1 min-w-0 flex flex-col">
        {/* Top status bar (floating) */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 pointer-events-none">
          <div className="flex items-center justify-between gap-3">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 px-3.5 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="leading-tight">
                <p className="text-xs sm:text-sm font-bold capitalize">Live {mode} consultation</p>
                <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider hidden sm:block">
                  {PHASE_LABELS[phase ?? ""] ?? "In progress"}
                </p>
              </div>
            </div>

            {showTimer && (
              <div
                className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full backdrop-blur-md border px-3.5 py-2 text-sm font-bold tabular-nums transition-colors ${
                  timerCritical
                    ? "bg-secondary/30 border-secondary/40 text-red-200"
                    : "bg-black/40 border-white/10 text-white"
                }`}
              >
                <Clock className="w-4 h-4" />
                {formatRemaining(remainingSeconds)}
              </div>
            )}
          </div>
        </div>

        {/* Stage content */}
        <div className="flex-1 relative overflow-hidden">
          {isVideo && (
            <>
              {/* Remote (devotee) — main view */}
              {remoteVideoTrack ? (
                <div ref={remoteVideoRef} className="absolute inset-0 w-full h-full bg-black" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#131735] to-[#0b0d1a]">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <User className="w-11 h-11 text-white/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{devoteeName}</p>
                    <p className="text-xs text-white/50 mt-1">Waiting for the devotee's camera…</p>
                  </div>
                </div>
              )}

              {/* Local (self) — picture-in-picture */}
              <div className="absolute bottom-24 right-3 sm:bottom-28 sm:right-5 z-20 w-28 sm:w-44 aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden border-2 border-white/15 bg-gray-900 shadow-2xl">
                <div ref={localVideoRef} className="w-full h-full" />
                {camOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900">
                    <VideoOff className="w-5 h-5 text-white/50" />
                    <span className="text-[9px] text-white/50 font-semibold">Camera off</span>
                  </div>
                )}
                <span className="absolute bottom-1 left-2 text-[9px] font-bold text-white/80 drop-shadow">You</span>
              </div>
            </>
          )}

          {isVoice && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#131735] to-[#0b0d1a] px-6">
              <div className="relative">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <User className="w-14 h-14 sm:w-16 sm:h-16 text-white/70" />
                </div>
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold">{devoteeName}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-3 py-1 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Voice connected
                </p>
              </div>
            </div>
          )}

          {isChat && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#131735] to-[#0b0d1a] px-6 text-center">
              <div className="w-24 h-24 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <MessageCircle className="w-11 h-11 text-white/70" />
              </div>
              <div>
                <p className="text-lg font-bold">Chat consultation with {devoteeName}</p>
                <p className="text-xs text-white/50 mt-1">Open the chat panel to start the conversation.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-sm w-[calc(100%-2rem)] bg-secondary/90 backdrop-blur text-white px-4 py-3 rounded-xl border border-white/20 text-xs font-semibold text-center shadow-xl">
              {error}
            </div>
          )}
        </div>

        {/* Control dock (floating) */}
        <div className="absolute bottom-0 inset-x-0 z-30 flex justify-center p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 px-3 py-2.5 shadow-2xl">
            <ControlButton label={micMuted ? "Unmute" : "Mute"} active={!micMuted} danger={micMuted} onClick={toggleMic}>
              {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </ControlButton>

            {isVideo && (
              <ControlButton label={camOff ? "Start camera" : "Stop camera"} active={!camOff} danger={camOff} onClick={toggleCamera}>
                {camOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
              </ControlButton>
            )}

            {/* Conversation (chat) temporarily disabled in the astrologer call.
                To re-enable, uncomment this button (and the auto-open below). */}
            {/* {showChat && (
              <ControlButton label="Chat" active={activePanel === "chat"} onClick={() => togglePanel("chat")}>
                <MessageCircle className="w-5 h-5" />
              </ControlButton>
            )} */}

            <ControlButton label="Notes" active={activePanel === "notes"} onClick={() => togglePanel("notes")}>
              <StickyNote className="w-5 h-5" />
            </ControlButton>

            <ControlButton label="Details" active={activePanel === "info"} onClick={() => togglePanel("info")}>
              <Info className="w-5 h-5" />
            </ControlButton>

            <button
              onClick={() => setShowEndConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary hover:bg-secondary-variant px-4 sm:px-5 h-12 text-sm font-bold text-white transition-colors shadow-lg"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="hidden sm:inline">End</span>
            </button>
          </div>
        </div>
      </section>

      {/* ===== Desktop docked panel ===== */}
      <AnimatePresence initial={false}>
        {activePanel && (
          <motion.aside
            key="desktop-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 384, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="hidden lg:flex shrink-0 h-full flex-col bg-white text-gray-900 border-l border-gray-200 overflow-hidden"
          >
            <div className="w-96 h-full flex flex-col">
              <PanelBody
                tab={activePanel}
                onClose={() => setActivePanel(null)}
                devotee={devotee}
                session={session}
                devoteeName={devoteeName}
                messages={messages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSend={handleSendMessage}
                chatScrollRef={chatScrollRef}
                notes={notes}
                noteText={noteText}
                setNoteText={setNoteText}
                onSaveNote={handleSaveNote}
                savingNote={savingNote}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ===== Mobile slide-over panel ===== */}
      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.aside
              key="mobile-panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 h-[82vh] rounded-t-3xl bg-white text-gray-900 flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="mx-auto mt-2.5 mb-1 h-1.5 w-10 rounded-full bg-gray-300 shrink-0" />
              <PanelBody
                tab={activePanel}
                onClose={() => setActivePanel(null)}
                devotee={devotee}
                session={session}
                devoteeName={devoteeName}
                messages={messages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSend={handleSendMessage}
                chatScrollRef={chatScrollRef}
                notes={notes}
                noteText={noteText}
                setNoteText={setNoteText}
                onSaveNote={handleSaveNote}
                savingNote={savingNote}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== End-call confirmation ===== */}
      <AnimatePresence>
        {showEndConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !ending && setShowEndConfirm(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl text-gray-900"
            >
              <div className="w-12 h-12 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-4">
                <PhoneOff className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">End this consultation?</h3>
              <p className="text-sm text-gray-500 mt-1.5">
                This will end the call for both you and the devotee. This action can't be undone.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  disabled={ending}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndCall}
                  disabled={ending}
                  className="flex-1 rounded-lg bg-secondary px-4 py-2.5 text-sm font-bold text-white hover:bg-secondary-variant disabled:opacity-50"
                >
                  {ending ? "Ending…" : "End Call"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ControlButtonProps {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ControlButton({ label, active, danger, onClick, children }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-12 h-12 rounded-xl transition-colors ${
        danger
          ? "bg-secondary/90 text-white hover:bg-secondary"
          : active
            ? "bg-white text-gray-900 hover:bg-white/90"
            : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

interface PanelBodyProps {
  tab: PanelTab;
  onClose: () => void;
  devotee: DevoteeBirthDetails | null;
  session: ConsultationSession | null;
  devoteeName: string;
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  notes: ConsultationNoteEntry[];
  noteText: string;
  setNoteText: (v: string) => void;
  onSaveNote: () => void;
  savingNote: boolean;
}

const PANEL_TITLES: Record<PanelTab, string> = {
  chat: "Conversation",
  notes: "Private Notes",
  info: "Devotee Details"
};

function PanelBody(props: PanelBodyProps) {
  const { tab, onClose } = props;
  const Icon = tab === "chat" ? MessageCircle : tab === "notes" ? StickyNote : User;

  return (
    <>
      <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {PANEL_TITLES[tab]}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {tab === "chat" && <ChatPanel {...props} />}
      {tab === "notes" && <NotesPanel {...props} />}
      {tab === "info" && <InfoPanel {...props} />}
    </>
  );
}

function ChatPanel({ messages, chatInput, setChatInput, onSend, chatScrollRef }: PanelBodyProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-12">No messages yet. Send a greeting to begin!</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.fromSelf ? "items-end" : "items-start"}`}>
              <p
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.fromSelf
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm"
                }`}
              >
                {m.text}
              </p>
              <span className="text-[10px] text-gray-400 mt-1 px-1">{formatChatTime(m.at)}</span>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white shrink-0">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:bg-white focus:outline-none transition-colors"
          placeholder="Type a message…"
        />
        <button
          onClick={onSend}
          disabled={!chatInput.trim()}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-variant disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function NotesPanel({ notes, noteText, setNoteText, onSaveNote, savingNote }: PanelBodyProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
      {notes.length > 0 && (
        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note_text}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                {formatNoteTimestamp(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="flex-1 w-full rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:bg-white focus:outline-none resize-none min-h-[160px]"
          placeholder="Write private consultation notes here…"
        />
        <button
          onClick={onSaveNote}
          disabled={savingNote || !noteText.trim()}
          className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-variant disabled:opacity-50 transition-colors shrink-0"
        >
          {savingNote ? "Saving…" : "Save Note"}
        </button>
      </div>
    </div>
  );
}

function InfoPanel({ devotee, session, devoteeName }: PanelBodyProps) {
  const fields: { label: string; value: string }[] = [
    { label: "Name", value: devoteeName },
    { label: "Date of Birth", value: formatDateOfBirth(devotee?.date_of_birth ?? null) || "Not shared" },
    { label: "Time of Birth", value: formatTimeOfBirth(devotee?.time_of_birth ?? null) || "Not shared" },
    { label: "Consultation Mode", value: session?.mode ? session.mode : "—" }
  ];
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {fields.map((f) => (
        <div key={f.label} className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{f.label}</span>
          <span className="text-sm font-bold text-gray-900 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 capitalize">
            {f.value}
          </span>
        </div>
      ))}
    </div>
  );
}
