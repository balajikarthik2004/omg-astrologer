import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "../services/authService";
import { toast } from "sonner";

type Step = "phone" | "otp";

export function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mobileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const desktopInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === "otp") {
      mobileInputRefs.current[0]?.focus();
      desktopInputRefs.current[0]?.focus();
    }
  }, [step]);

  const handleOtpChange = (
    index: number,
    value: string,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, "").slice(0, 1);
    setOtp(newOtp);

    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      toast.error("Enter your registered phone number");
      return;
    }
    setLoading(true);
    try {
      await authService.requestOtp(`91${phone.trim()}`);
      toast.success("OTP sent to your phone");
      setStep("otp");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      toast.error("Enter complete 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const { accessToken, refreshToken } = await authService.verifyOtp(`91${phone.trim()}`, otpValue);
      const astrologer = await authService.getProfile(accessToken);
      authService.storeSession(accessToken, refreshToken, astrologer);
      toast.success("Login successful!");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.requestOtp(`91${phone.trim()}`);
      setOtp(["", "", "", "", "", ""]);
      toast.success("OTP resent to your phone");
      mobileInputRefs.current[0]?.focus();
      desktopInputRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white flex-col lg:flex-row overflow-hidden font-sans">
      <style>{`
        @keyframes gradient-move {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-cosmic-text {
          background: linear-gradient(90deg, #fbbf24, #ffffff, #fbbf24);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: gradient-move 3s linear infinite;
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div className="hidden lg:flex w-1/2 relative bg-slate-900 items-end justify-start p-20 rounded-r-[60px] overflow-hidden shadow-2xl">
        <img
          src="/loginbg.png"
          alt="Astrology Background"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="relative z-10 text-white space-y-4 max-w-lg">
          <div className="w-16 h-1 bg-primary rounded-full mb-6"></div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Unlock the <br /> 
            <span className="animate-cosmic-text">Cosmic Insights</span>
          </h1>
          <p className="text-lg text-slate-200 font-light leading-relaxed">
            Empowering astrologers to connect with seekers globally. 
            Manage your sessions, horoscopes, and consultations with precision.
          </p>
        </div>
      </div>

      <div className="lg:hidden relative flex-1 min-h-screen">
        <div className="absolute inset-0">
          <img
            src="/loginbg.png"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/95" />
        </div>

        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 300,
            mass: 0.8
          }}
          className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-[32px] shadow-2xl px-5 pt-6 pb-8 max-h-[75vh] overflow-y-auto"
        >
          <div className="flex justify-center mb-6">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          <Card className="border-0 shadow-none">
            <CardHeader className="space-y-1 p-0 pb-6">
              <CardTitle className="text-2xl font-bold text-slate-900">Welcome Back</CardTitle>
              <CardDescription className="text-slate-500">
                {step === "phone" ? "Enter your phone number to continue" : "Enter the OTP sent to your phone"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <AnimatePresence mode="wait">
                {step === "phone" ? (
                  <motion.form
                    key="phone"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleRequestOtp}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter your phone number"
                          maxLength={10}
                          required
                          className="h-12 pl-10 border-slate-200 focus-visible:ring-primary text-base rounded-xl"
                        />
                      </div>
                    </div>
                    {error && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-500"
                      >
                        {error}
                      </motion.p>
                    )}
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full h-12 text-base font-medium rounded-xl"
                      variant="default"
                    >
                      {loading ? "Sending..." : "Continue"}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="otp"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleVerifyOtp}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Enter OTP</label>
                      <div className="flex gap-2 justify-center">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => { mobileInputRefs.current[index] = el; }}
                            type="text"
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value, mobileInputRefs)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e, mobileInputRefs)}
                            maxLength={1}
                            className="w-12 h-14 text-center text-xl font-semibold border-2 border-slate-200 rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            autoFocus={index === 0}
                          />
                        ))}
                      </div>
                    </div>
                    {error && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-500 text-center"
                      >
                        {error}
                      </motion.p>
                    )}
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full h-12 text-base font-medium rounded-xl"
                      variant="default"
                    >
                      {loading ? "Verifying..." : "Sign In"}
                    </Button>
                    <div className="flex justify-center pt-1">
                      <button 
                        type="button" 
                        onClick={handleResendOtp} 
                        className="text-sm text-primary font-semibold hover:opacity-80 transition-opacity"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="hidden lg:flex w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <Card className="border-0 shadow-none">
            <CardHeader className="space-y-1.5 p-0 pb-8">
              <div className="flex items-center gap-3">
                <img src="/omg-logo.png" alt="OMG Logo" className="w-10 h-10 object-contain" />
                <CardTitle className="text-3xl font-bold text-slate-900">Login</CardTitle>
              </div>
              <CardDescription>Enter your details to access your portal</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <AnimatePresence mode="wait">
                {step === "phone" ? (
                  <motion.form
                    key="phone"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleRequestOtp}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Phone number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          placeholder="9876543210"
                          maxLength={10}
                          required
                          className="h-12 pl-10 border-slate-200 focus-visible:ring-primary text-base"
                        />
                      </div>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-medium">
                      {loading ? "Sending..." : "Send OTP"}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="otp"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleVerifyOtp}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Enter OTP</label>
                      <div className="flex gap-2 justify-center">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => { desktopInputRefs.current[index] = el; }}
                            type="text"
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value, desktopInputRefs)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e, desktopInputRefs)}
                            maxLength={1}
                            className="w-12 h-14 text-center text-xl font-semibold border-2 border-slate-200 rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            autoFocus={index === 0}
                          />
                        ))}
                      </div>
                    </div>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-medium">
                      {loading ? "Verifying..." : "Verify & Sign In"}
                    </Button>
                    <div className="flex justify-center">
                      <button type="button" onClick={handleResendOtp} className="text-primary font-semibold text-sm">
                        Resend OTP
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}