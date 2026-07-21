import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Home, Clock, User, Inbox, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";
import omgLogo from "../../assets/omg-logo.png";
import sidebarBg from "../../assets/sidebar.png";
import { authService } from "../../services/authService";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Inbox, label: "Requests", path: "/requests" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: User, label: "Profile", path: "/profile" },
];

const PRESENCE_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  offline: "bg-gray-400",
  busy: "bg-amber-500"
};

export function AppLayout() {
  const navigate = useNavigate();
  const [astrologer, setAstrologer] = useState(() => authService.getStoredAstrologer());

  useEffect(() => {
    const handleUpdate = () => setAstrologer(authService.getStoredAstrologer());
    window.addEventListener('astrologer_updated', handleUpdate);
    return () => window.removeEventListener('astrologer_updated', handleUpdate);
  }, []);

  const displayName = astrologer?.display_name || astrologer?.full_name || astrologer?.name || "Astrologer";
  const profileImage = astrologer?.profile_image || astrologer?.profile_photo_url || null;

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 flex-col text-white z-40 shadow-2xl border-r border-white/10 overflow-hidden">
        {/* Background Image & Brand Overlay */}
        <img src={sidebarBg} alt="Sidebar Background" className="absolute inset-0 w-full h-full object-cover z-0 opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/95 to-primary-variant/95 z-0" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full w-full">
          {/* Header */}
          <div className="flex h-24 shrink-0 items-center justify-center px-6 border-b border-white/10">
            <div className="bg-white rounded-lg p-2 w-full flex items-center justify-center shadow-md">
              <img src={omgLogo} alt="OMG Logo" className="h-10 w-auto object-contain" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto space-y-2 p-6 custom-scrollbar">
            <div className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 ml-2">Main Menu</div>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 rounded-lg px-4 py-3 text-base font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-white shadow-md"
                      : "text-white/70 hover:bg-primary-variant hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-white/50")} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer / Profile */}
          <div className="p-5 shrink-0 border-t border-white/10 bg-primary-variant/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10 shrink-0">
                <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-white/80" />
                  )}
                </div>
                <div
                  className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-primary-variant shadow-sm", astrologer?.presence_status ? PRESENCE_DOT[astrologer.presence_status] : "bg-gray-400")}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white tracking-wide truncate">{displayName}</p>
                <div className="flex items-center mt-0.5">
                  <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">{astrologer?.presence_status || "Verified"}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white/70 bg-white/5 hover:bg-white/10 hover:text-white transition-all border border-transparent hover:border-white/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 flex-1 pb-16 lg:pb-0 min-h-screen flex flex-col">
        <div className="w-full max-w-6xl p-4 md:p-5">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 bg-white/80 backdrop-blur-lg border-t border-gray-200 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] justify-around items-center px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-full h-full text-xs font-bold transition-all duration-300",
                isActive
                  ? "text-primary scale-105"
                  : "text-gray-400 hover:text-primary-variant"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn("relative p-1 rounded-full mb-0.5", isActive && "bg-primary/10")}>
                  <item.icon className={cn("h-5 w-5 transition-all duration-300", isActive && "drop-shadow-sm")} />
                </div>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
