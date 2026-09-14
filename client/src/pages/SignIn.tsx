import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
  en: { title: "Welcome back to CropWise", subtitle: "Sign in to keep your farm plan, scan history, and field settings together.", email: "Email address", password: "Password", signIn: "Sign in with email", register: "Create email account", forgot: "Forgot password?", reset: "Send reset link", sent: "If that email has an account, a reset link will be sent shortly.", switchRegister: "Need an account? Create one", switchLogin: "Already have an account? Sign in", dashboard: "Back to dashboard", required: "Enter a valid email and a password of at least 8 characters." },
  hi: { title: "CropWise में आपका स्वागत है", subtitle: "अपने खेत की योजना, स्कैन इतिहास और सेटिंग्स एक साथ रखने के लिए साइन इन करें।", email: "ईमेल पता", password: "पासवर्ड", signIn: "ईमेल से साइन इन", register: "ईमेल खाता बनाएँ", forgot: "पासवर्ड भूल गए?", reset: "रीसेट लिंक भेजें", sent: "यदि इस ईमेल का खाता है, तो रीसेट लिंक भेजा जाएगा।", switchRegister: "खाता चाहिए? बनाएँ", switchLogin: "पहले से खाता है? साइन इन करें", dashboard: "डैशबोर्ड पर लौटें", required: "सही ईमेल और कम से कम 8 अक्षरों का पासवर्ड दर्ज करें।" },
  mr: { title: "CropWise मध्ये स्वागत आहे", subtitle: "तुमची पीक योजना, स्कॅन इतिहास आणि शेत सेटिंग्ज एकत्र ठेवण्यासाठी साइन इन करा.", email: "ईमेल पत्ता", password: "पासवर्ड", signIn: "ईमेलने साइन इन", register: "ईमेल खाते तयार करा", forgot: "पासवर्ड विसरलात?", reset: "रीसेट लिंक पाठवा", sent: "या ईमेलचे खाते असल्यास रीसेट लिंक पाठवली जाईल.", switchRegister: "खाते हवे? तयार करा", switchLogin: "आधीच खाते आहे? साइन इन करा", dashboard: "डॅशबोर्डवर परत जा", required: "योग्य ईमेल आणि किमान 8 अक्षरांचा पासवर्ड भरा." },
} as const;

export default function SignIn() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const { isAuthenticated, loading } = useAuth();
  const text = copy[language];
  const [registerMode, setRegisterMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const authMutation = registerMode ? trpc.auth.register.useMutation() : trpc.auth.login.useMutation();
  const resetMutation = trpc.auth.requestPasswordReset.useMutation();

  useEffect(() => { if (!loading && isAuthenticated) navigate("/dashboard"); }, [isAuthenticated, loading, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    if (!email.includes("@") || password.length < 8) { setError(text.required); return; }
    try { await authMutation.mutateAsync({ email, password }); navigate("/dashboard"); }
    catch (err) { setError(err instanceof Error ? err.message : text.required); }
  };

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    try { await resetMutation.mutateAsync({ email, origin: window.location.origin }); setMessage(text.sent); }
    catch { setError(text.sent); }
  };


  return <main className="min-h-screen bg-[#f5f1e8] px-4 py-10 text-[#1d2d29]">
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-[#fffdf8] shadow-[0_24px_70px_rgba(43,55,49,0.14)] md:grid-cols-[1.05fr_0.95fr]">
      <section className="bg-[#203b35] px-7 py-10 text-[#f7f1e3] md:px-12 md:py-14"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e7ad4d]">CropWise · Monsoon Field Notes</p><h1 className="mt-12 max-w-md font-serif text-5xl leading-[0.98]">{text.title}</h1><p className="mt-6 max-w-md text-base leading-7 text-[#d7e0d5]">{text.subtitle}</p><div className="mt-14 rounded-2xl border border-white/15 bg-white/10 p-5 text-sm leading-6 text-[#e8eee6]">Your CropWise account is stored securely in your own database. You can later add an external identity provider without changing the application data model.</div></section>
      <section className="px-6 py-8 md:px-10 md:py-12"><div className="flex justify-between text-sm"><Link href="/dashboard" className="font-medium text-[#31564b] hover:underline">← {text.dashboard}</Link><button type="button" className="text-[#31564b] hover:underline" onClick={() => { setResetMode(false); setRegisterMode(!registerMode); setMessage(""); setError(""); }}>{resetMode ? text.switchLogin : registerMode ? text.switchLogin : text.switchRegister}</button></div>
        <form onSubmit={resetMode ? requestReset : submit} className="space-y-4"><label className="block text-sm font-medium">{text.email}<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-[#d8d3c8] bg-[#fffdf8] px-4 py-3 outline-none focus:border-[#31564b] focus:ring-2 focus:ring-[#31564b]/15" required /></label>{!resetMode && <label className="block text-sm font-medium">{text.password}<input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={registerMode ? "new-password" : "current-password"} className="mt-2 w-full rounded-xl border border-[#d8d3c8] bg-[#fffdf8] px-4 py-3 outline-none focus:border-[#31564b] focus:ring-2 focus:ring-[#31564b]/15" minLength={8} maxLength={128} required /></label>}{resetMode ? <button disabled={resetMutation.isPending} className="w-full rounded-xl bg-[#31564b] px-4 py-3.5 font-semibold text-white disabled:opacity-60">{resetMutation.isPending ? "…" : text.reset}</button> : <button disabled={authMutation.isPending} className="w-full rounded-xl bg-[#31564b] px-4 py-3.5 font-semibold text-white disabled:opacity-60">{authMutation.isPending ? "…" : registerMode ? text.register : text.signIn}</button>}</form>
        {!resetMode && <button type="button" className="mt-4 text-sm text-[#31564b] hover:underline" onClick={() => { setResetMode(true); setError(""); }}>{text.forgot}</button>}
        {message && <p className="mt-5 rounded-xl bg-[#edf4e9] p-3 text-sm text-[#31564b]">{message}</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-[#f9e9e3] p-3 text-sm text-[#9b4937]">{error}</p>}
      </section>
    </div>
  </main>;
}
