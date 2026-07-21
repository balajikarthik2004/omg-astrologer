import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Star, Users, IndianRupee, Inbox, Loader2, MessageCircle, PhoneCall, Video, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { consultationService } from "../services/consultationService";
import { authService } from "../services/authService";
import type { DashboardStats } from "../types";

const POLL_INTERVAL_MS = 15000;

// Categorical slots 1/2/3 from the palette (blue/green/magenta) — the three-slot subset
// pre-validated for all-pairs CVD separation, so any two of the three read as distinct.
const MODE_COLORS: Record<"chat" | "voice" | "video", string> = {
  chat: "#2a78d6",
  voice: "#008300",
  video: "#e87ba4"
};

const MODE_ICON = {
  chat: MessageCircle,
  voice: PhoneCall,
  video: Video
};

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function EarningsTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; earnings: number; sessions: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { date, earnings, sessions } = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-bold text-gray-900">{formatChartDate(date)}</p>
      <p className="text-primary font-semibold mt-0.5">₹{earnings.toLocaleString()}</p>
      <p className="text-gray-500">{sessions} session{sessions === 1 ? "" : "s"}</p>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const astrologer = authService.getStoredAstrologer();
  const token = authService.getAccessToken();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const fetchData = async () => {
      try {
        const data = await consultationService.getDashboard(token);
        if (isMounted) {
          setStats(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { totals, mode_breakdown: modeBreakdown, session_type_breakdown: sessionTypeBreakdown, daily_trend: dailyTrend } = stats;
  const modeTotal = modeBreakdown.chat + modeBreakdown.voice + modeBreakdown.video;
  const modePieData = (["chat", "voice", "video"] as const)
    .map((mode) => ({ mode, count: modeBreakdown[mode] }))
    .filter((entry) => entry.count > 0);
  const sessionTypeTotal = sessionTypeBreakdown.free + sessionTypeBreakdown.paid;
  const freePercent = sessionTypeTotal > 0 ? Math.round((sessionTypeBreakdown.free / sessionTypeTotal) * 100) : 0;

  const metrics = [
    {
      title: "Total Consultations",
      value: totals.all_time_consultations.toLocaleString(),
      change: "All time",
      icon: Users,
      color: "bg-blue-100 text-blue-700"
    },
    {
      title: "Earnings",
      value: `₹${totals.today_earnings.toLocaleString()}`,
      change: `₹${totals.month_earnings.toLocaleString()} this month`,
      icon: IndianRupee,
      color: "bg-emerald-100 text-emerald-700"
    },
    {
      title: "Profile Rating",
      value: totals.rating != null ? `${totals.rating.toFixed(1)}/5` : "—",
      change: totals.total_reviews != null ? `${totals.total_reviews} reviews` : "No reviews yet",
      icon: Star,
      color: "bg-yellow-100 text-yellow-700"
    },
    {
      title: "Pending Requests",
      value: totals.pending_requests.toString(),
      change: totals.pending_requests > 0 ? "Action required" : "All caught up",
      icon: Inbox,
      color: totals.pending_requests > 0 ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700",
      onClick: () => navigate("/requests")
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-base text-gray-500 mt-1">Welcome back, {astrologer?.display_name || astrologer?.full_name || astrologer?.name}! Here is your real-time overview.</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, i) => (
          <motion.div key={metric.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card
              onClick={metric.onClick}
              className={`hover:shadow-md transition-all duration-200 border-gray-100 hover:border-primary/20 group bg-white ${metric.onClick ? "cursor-pointer" : ""}`}
            >
              <CardContent className="p-4 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${metric.color} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                    <metric.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 leading-snug">{metric.title}</p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{metric.change}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-gray-100 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-gray-900">Earnings Trend</CardTitle>
          <CardDescription>Last 14 days</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {dailyTrend.every((d) => d.earnings === 0) ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">No earnings in the last 14 days yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#293088" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#293088" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e1e0d9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 11, fill: "#898781" }}
                    axisLine={{ stroke: "#c3c2b7" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#898781" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(v: number) => `₹${v}`}
                  />
                  <Tooltip content={<EarningsTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#293088"
                    strokeWidth={2}
                    fill="url(#earningsFill)"
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-gray-100 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-gray-900">Consultation Mix</CardTitle>
            <CardDescription>All time, by mode</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {modeTotal === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">No completed consultations yet.</div>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modePieData}
                        dataKey="count"
                        nameKey="mode"
                        innerRadius="60%"
                        outerRadius="90%"
                        stroke="#fcfcfb"
                        strokeWidth={2}
                        paddingAngle={2}
                      >
                        {modePieData.map((entry) => (
                          <Cell key={entry.mode} fill={MODE_COLORS[entry.mode]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, item) => [`${value} sessions`, item.payload.mode]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Direct labels with counts (not color alone) — relief for the magenta slot's sub-3:1 contrast on white. */}
                <div className="space-y-2 mt-1">
                  {(["chat", "voice", "video"] as const).map((mode) => {
                    const Icon = MODE_ICON[mode];
                    const count = modeBreakdown[mode];
                    return (
                      <div key={mode} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MODE_COLORS[mode] }} />
                          <Icon className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600 font-medium capitalize">{mode}</span>
                        </div>
                        <span className="font-bold text-gray-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" /> Free vs Paid
            </CardTitle>
            <CardDescription>All time, by session type</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {sessionTypeTotal === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400">No completed consultations yet.</div>
            ) : (
              <div className="pt-2">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{sessionTypeBreakdown.paid}</p>
                    <p className="text-xs font-medium text-gray-500">Paid</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{sessionTypeBreakdown.free}</p>
                    <p className="text-xs font-medium text-gray-500">Free trial</p>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden flex">
                  <div className="h-full bg-primary" style={{ width: `${100 - freePercent}%` }} />
                  <div className="h-full bg-secondary" style={{ width: `${freePercent}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] font-semibold text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Paid ({100 - freePercent}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary" /> Free ({freePercent}%)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
