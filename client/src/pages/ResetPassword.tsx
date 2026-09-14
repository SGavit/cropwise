import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const mutation = trpc.auth.resetPassword.useMutation();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    if (!token || password.length < 8 || password !== confirm) { setError("Use the valid link and enter matching passwords of at least 8 characters."); return; }
    try { await mutation.mutateAsync({ token, password }); setMessage("Password updated. You can now sign in."); setTimeout(() => navigate("/sign-in"), 900); }
    catch (err) { setError(err instanceof Error ? err.message : "This reset link is invalid or expired."); }
  };
  return <main className="min-h-screen bg-[#f5f1e8] px-4 py-12 text-[#1d2d29]"><section className="mx-auto max-w-md rounded-[2rem] bg-[#fffdf8] p-8 shadow-[0_24px_70px_rgba(43,55,49,0.14)]"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a66a2c]">CropWise security</p><h1 className="mt-4 font-serif text-4xl">Set a new password</h1><p className="mt-3 text-sm leading-6 text-[#65736c]">This link works once and expires after 30 minutes.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm font-medium">New password<input value={password} onChange={e => setPassword(e.target.value)} type="password" minLength={8} maxLength={128} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-[#d8d3c8] bg-white px-4 py-3 outline-none focus:border-[#31564b]" required /></label><label className="block text-sm font-medium">Confirm password<input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" minLength={8} maxLength={128} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-[#d8d3c8] bg-white px-4 py-3 outline-none focus:border-[#31564b]" required /></label><button disabled={mutation.isPending} className="w-full rounded-xl bg-[#31564b] px-4 py-3.5 font-semibold text-white disabled:opacity-60">{mutation.isPending ? "Updating…" : "Update password"}</button></form>{message && <p className="mt-5 rounded-xl bg-[#edf4e9] p-3 text-sm text-[#31564b]">{message}</p>}{error && <p role="alert" className="mt-5 rounded-xl bg-[#f9e9e3] p-3 text-sm text-[#9b4937]">{error}</p>}<Link href="/sign-in" className="mt-6 inline-block text-sm font-medium text-[#31564b] hover:underline">Back to sign in</Link></section></main>;
}
