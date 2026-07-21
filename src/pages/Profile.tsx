import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import {
  User,
  Mail,
  Phone,
  Award,
  Languages,
  BadgeCheck,
  Sparkles,
  Activity,
  Video,
  FileText,
  Star,
  LogOut
} from "lucide-react";
import { authService } from "../services/authService";
import { getErrorMessage } from "../services/apiClient";
import type { Astrologer } from "../types";

type Tab = "identity" | "contact" | "documents" | "bio";

const TABS: { id: Tab; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "contact", label: "Contact" },
  { id: "documents", label: "Documents" },
  { id: "bio", label: "Bio" }
];

const PRESENCE_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  offline: "bg-gray-400",
  busy: "bg-amber-500"
};

export function Profile() {
  const navigate = useNavigate();
  const [astrologer, setAstrologer] = useState<Astrologer | null>(authService.getStoredAstrologer());
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("identity");

  useEffect(() => {
    const token = authService.getAccessToken();
    if (!token) return;
    authService
      .getProfile(token)
      .then((fresh) => {
        authService.updateStoredAstrologer(fresh);
        setAstrologer(fresh);
      })
      .catch((err) => {
        setError(getErrorMessage(err, "Failed to refresh profile details"));
      });
  }, []);

  const handleTogglePresence = async () => {
    if (!astrologer || astrologer.presence_status === "busy") return;
    const token = authService.getAccessToken();
    if (!token) return;
    setError(null);
    setPresenceLoading(true);
    try {
      const nextStatus = astrologer.presence_status === "offline" ? "online" : "offline";
      const updated = await authService.updatePresence(token, nextStatus);
      authService.updateStoredAstrologer(updated);
      setAstrologer(updated);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update presence"));
    } finally {
      setPresenceLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  if (!astrologer) {
    return (
      <div className="max-w-5xl">
        <p className="text-gray-500">No astrologer session found. Please log in again.</p>
      </div>
    );
  }

  const displayName = astrologer.display_name || astrologer.full_name || astrologer.name;
  const profileImage = astrologer.profile_image || astrologer.profile_photo_url || null;

  return (
    <div className=" animate-in fade-in duration-500 max-w-5xl pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Astrologer Profile</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Manage your professional information, credentials, and live availability.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">{error}</div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_2.2fr]">
        {/* Left Card: Summary & Quick Actions */}
        <Card className="border-gray-100 shadow-sm h-fit overflow-hidden bg-white rounded-xl">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="w-28 h-28 bg-gradient-to-br from-amber-400 via-primary to-orange-500 rounded-full p-1 mb-4 relative shadow-sm">
              <div className="w-full h-full bg-white rounded-full p-1 overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt={displayName} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-gray-50 rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div
                className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white shadow-sm ${PRESENCE_DOT[astrologer.presence_status]}`}
                title={`Status: ${astrologer.presence_status}`}
              />
            </div>

            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{displayName}</h3>

            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
              {astrologer.is_verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
              {astrologer.is_featured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-100">
                  <Sparkles className="w-3 h-3 fill-amber-500 text-amber-500" /> Featured
                </span>
              )}
            </div>

            {astrologer.rating != null && (
              <div className="bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100 flex items-center justify-center gap-1.5 mt-4 w-full max-w-[220px]">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold text-gray-800">{astrologer.rating.toFixed(1)}</span>
                {astrologer.total_reviews != null && (
                  <span className="text-xs text-gray-400 font-medium">({astrologer.total_reviews} reviews)</span>
                )}
              </div>
            )}

            {astrologer.specializations?.length ? (
              <>
                <hr className="w-full border-gray-100 my-5" />
                <div className="w-full text-left space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block text-center">
                    Specializations
                  </label>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {astrologer.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-lg bg-primary/10 text-primary text-[11px] font-bold px-2 py-1 border border-primary/10"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            <hr className="w-full border-gray-100 my-5" />

            <div className="w-full space-y-2">
              <Button
                variant="outline"
                onClick={handleTogglePresence}
                disabled={presenceLoading || astrologer.presence_status === "busy"}
                className="w-full border-primary/20 text-primary hover:bg-primary/5 font-medium h-10 text-sm rounded-lg disabled:opacity-50"
              >
                {astrologer.presence_status === "busy"
                  ? "On a Live Call"
                  : presenceLoading
                    ? "Updating..."
                    : astrologer.presence_status === "offline"
                      ? "Go Online"
                      : "Go Offline"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-medium h-10 text-sm rounded-lg gap-2"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Card: Tabbed Details */}
        <Card className="border-gray-100 shadow-sm bg-white rounded-xl flex flex-col overflow-hidden">
          <CardHeader className="border-b border-gray-100 pb-4 pt-6 px-6 bg-gray-50/50 space-y-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Professional Information</CardTitle>
              <CardDescription className="text-xs font-medium text-gray-400 mt-1">
                Account configuration and credentials. Contact support if changes are needed.
              </CardDescription>
            </div>

            <div className="bg-gray-100/80 p-1.5 rounded-xl flex flex-wrap gap-1.5 w-full border border-gray-200/50">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-auto py-2.5 px-4 rounded-lg text-[10px] md:text-[11px] font-bold transition-all uppercase tracking-wider focus:outline-none whitespace-nowrap ${
                    activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === "identity" && (
                <motion.div
                  key="identity"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <SectionLabel>Identity & Status</SectionLabel>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <InfoField icon={User} label="Full Name" value={astrologer.full_name || astrologer.name} />
                    <InfoField icon={User} label="Gender" value={astrologer.gender || "—"} />
                    <InfoField icon={Activity} label="Account Status" value={astrologer.is_active ? "Active" : "Inactive"} />
                    <InfoField icon={Activity} label="Presence" value={astrologer.presence_status} />
                  </div>
                </motion.div>
              )}

              {activeTab === "contact" && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <SectionLabel>Contact Details</SectionLabel>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <InfoField icon={Mail} label="Email Address" value={astrologer.email || "—"} />
                    <InfoField icon={Phone} label="Phone Number" value={astrologer.phone} />
                    <InfoField
                      icon={BadgeCheck}
                      label="Experience"
                      value={astrologer.experience_years != null ? `${astrologer.experience_years} years` : "—"}
                    />
                    <InfoField
                      icon={Languages}
                      label="Languages"
                      value={astrologer.languages?.length ? astrologer.languages.join(", ") : "—"}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === "documents" && (
                <motion.div
                  key="documents"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <SectionLabel>Verification Documents & Media</SectionLabel>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <DocumentField icon={Video} label="Promo Video" url={astrologer.promo_video_url} linkLabel="Watch Video Walkthrough" />
                    <DocumentField icon={FileText} label="Aadhaar Document" url={astrologer.aadhaar_document_url} linkLabel="View Document" />
                    <DocumentField icon={Award} label="Certification" url={astrologer.certification_document_url} linkLabel="View Certificate" />
                  </div>
                </motion.div>
              )}

              {activeTab === "bio" && (
                <motion.div
                  key="bio"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <SectionLabel>Bio & Introductions</SectionLabel>

                  {astrologer.about_short && (
                    <BioBlock label="Short Intro">
                      <p className="text-sm font-medium text-gray-700 leading-relaxed">{astrologer.about_short}</p>
                    </BioBlock>
                  )}

                  {astrologer.bio && (
                    <BioBlock label="Biography">
                      <div
                        className="text-sm text-gray-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: astrologer.bio }}
                      />
                    </BioBlock>
                  )}

                  {astrologer.about && (
                    <BioBlock label="About Consultation">
                      <div
                        className="text-sm text-gray-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: astrologer.about }}
                      />
                    </BioBlock>
                  )}

                  {!astrologer.about_short && !astrologer.bio && !astrologer.about && (
                    <p className="text-sm text-gray-400 italic">No bio information on file yet.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-l-2 border-primary pl-2">{children}</h4>;
}

function BioBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{label}</label>
      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">{children}</div>
    </div>
  );
}

function InfoField({
  icon: Icon,
  label,
  value
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
      <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-sm text-gray-500">
        <Icon className="w-4 h-4" />
      </div>
      <div className="space-y-0.5 min-w-0">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">{label}</span>
        <span className="text-sm font-bold text-gray-900 block truncate capitalize" title={value}>
          {value}
        </span>
      </div>
    </div>
  );
}

function DocumentField({
  icon: Icon,
  label,
  url,
  linkLabel
}: {
  icon: typeof User;
  label: string;
  url?: string | null;
  linkLabel: string;
}) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
      >
        <div className="p-2.5 rounded-lg bg-white border border-primary/10 shadow-sm text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">{label}</span>
          <span className="text-xs font-semibold text-gray-600 block group-hover:text-primary transition-colors">
            {linkLabel} →
          </span>
        </div>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 opacity-70">
      <div className="p-2.5 rounded-lg bg-white border border-gray-100 text-gray-400">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{label}</span>
        <span className="text-xs font-medium text-gray-400 block">Not uploaded</span>
      </div>
    </div>
  );
}
