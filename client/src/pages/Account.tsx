import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { getProfileCompletion } from "@/lib/profileCompletion";
import { avatarUploadLimits, prepareAvatarDataUrl } from "@/lib/avatarUpload";

const completionLabels = {
  name: "profileCompletionName",
  email: "profileCompletionEmail",
  avatar: "profileCompletionAvatar",
  farm: "profileCompletionFarm",
  crops: "profileCompletionCrops",
} as const;

export default function Account() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading, logout } = useAuth();
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const profile = trpc.auth.profile.useQuery(undefined, { enabled: isAuthenticated });
  const farmProfile = trpc.farmProfile.get.useQuery(undefined, { enabled: isAuthenticated });
  const settings = trpc.account.settings.useQuery(undefined, { enabled: isAuthenticated });
  const saveSettings = trpc.account.saveSettings.useMutation({ onSuccess: () => settings.refetch() });
  const updateDisplayName = trpc.auth.updateDisplayName.useMutation({
    onSuccess: async (updatedUser) => {
      setNameDraft(updatedUser?.name ?? nameDraft.trim());
      setEditingName(false);
      setNameError(null);
      setNameSaved(true);
      await Promise.all([profile.refetch(), utils.auth.me.invalidate()]);
      window.setTimeout(() => setNameSaved(false), 1800);
    },
    onError: (error) => setNameError(error.message),
  });
  const uploadAvatar = trpc.auth.uploadAvatar.useMutation({
    onSuccess: async (updatedUser) => {
      setAvatarPreview(updatedUser?.avatarUrl ?? null);
      setAvatarError(null);
      setAvatarSaved(true);
      setAvatarRemoved(false);
      await Promise.all([profile.refetch(), utils.auth.me.invalidate()]);
      window.setTimeout(() => setAvatarSaved(false), 1800);
    },
    onError: () => setAvatarError(t("avatarUploadError")),
  });
  const removeAvatar = trpc.auth.removeAvatar.useMutation({
    onSuccess: async () => {
      setAvatarPreview(null);
      setAvatarError(null);
      setAvatarSaved(false);
      setAvatarRemoved(true);
      await Promise.all([profile.refetch(), utils.auth.me.invalidate()]);
      window.setTimeout(() => setAvatarRemoved(false), 1800);
    },
    onError: () => setAvatarError(t("avatarRemoveError")),
  });
  const deleteAccount = trpc.account.delete.useMutation({ onSuccess: () => navigate("/sign-in") });
  const [scanRetentionDays, setScanRetentionDays] = useState(365);
  const [reminderRetentionDays, setReminderRetentionDays] = useState(365);
  const [saved, setSaved] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/sign-in"); }, [isAuthenticated, loading, navigate]);
  useEffect(() => { if (settings.data) { setScanRetentionDays(settings.data.scanRetentionDays); setReminderRetentionDays(settings.data.reminderRetentionDays); } }, [settings.data]);
  useEffect(() => { if (profile.data?.name && !editingName) setNameDraft(profile.data.name); }, [editingName, profile.data?.name]);
  useEffect(() => { if (profile.data?.avatarUrl) setAvatarPreview(profile.data.avatarUrl); }, [profile.data?.avatarUrl]);

  const completion = getProfileCompletion({ name: profile.data?.name, email: profile.data?.email, avatarUrl: profile.data?.avatarUrl, farmProfile: farmProfile.data });
  const initials = (profile.data?.name ?? "CropWise").split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const save = async () => { await saveSettings.mutateAsync({ scanRetentionDays: scanRetentionDays as 0 | 30 | 90 | 365, reminderRetentionDays: reminderRetentionDays as 0 | 30 | 90 | 365 }); setSaved(true); window.setTimeout(() => setSaved(false), 1600); };
  const saveName = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const trimmed = nameDraft.trim(); if (trimmed.length < 2) { setNameError("Display name must be at least 2 characters."); return; } setNameError(null); updateDisplayName.mutate({ name: trimmed }); };
  const cancelNameEdit = () => { setNameDraft(profile.data?.name ?? ""); setNameError(null); setEditingName(false); };
  const removeAvatarFile = () => {
    if (window.confirm(t("removeAvatarConfirm"))) removeAvatar.mutate();
  };
  const handleAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > avatarUploadLimits.maxFileBytes) { setAvatarError(t("avatarUploadInvalid")); return; }
    setAvatarError(null);
    try {
      const dataUrl = await prepareAvatarDataUrl(file);
      setAvatarPreview(dataUrl);
      uploadAvatar.mutate({ dataUrl });
    } catch {
      setAvatarError(t("avatarUploadError"));
    }
  };
  const remove = async () => { if (window.confirm("Delete your CropWise account and private app data? This cannot be undone.")) await deleteAccount.mutateAsync(); };

  return <main className="account-page min-h-screen overflow-x-hidden bg-[#f5f1e8] px-4 py-8 text-[#1d2d29]"><div className="mx-auto w-full max-w-5xl min-w-0"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a66a2c]">CropWise account</p><h1 className="mt-2 max-w-full break-words font-serif text-3xl sm:text-4xl">Profile & settings</h1></div><Link href="/dashboard" className="w-full shrink-0 rounded-xl border border-[#d8d3c8] bg-[#fffdf8] px-4 py-2 text-center text-sm font-semibold text-[#31564b] sm:w-auto">Back to dashboard</Link></div>
    <div className="account-grid mt-8 grid min-w-0 gap-6 lg:grid-cols-[1.1fr_0.9fr]"><section className="account-card min-w-0 rounded-3xl bg-[#fffdf8] p-6 shadow-sm"><h2 className="font-serif text-2xl">Current session</h2><p className="mt-2 text-sm text-[#65736c]">This is the CropWise application session currently recognized by the server.</p>{profile.data ? <>
      <div className="mt-6 rounded-2xl bg-[#f5f1e8] p-4"><div className="flex flex-wrap items-start gap-4"><div className="relative shrink-0"><div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#d98547] text-xl font-bold text-white">{avatarPreview ? <img src={avatarPreview} alt={t("profileCompletionAvatar")} className="h-full w-full object-cover" /> : initials}</div><button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadAvatar.isPending} aria-label={t("uploadAvatar")} className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#f5f1e8] bg-[#31564b] text-white shadow-sm disabled:opacity-60"><Camera size={16} /></button><input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarFile} className="sr-only" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7e8c84]">{t("uploadAvatar")}</p><p className="mt-2 text-sm text-[#65736c]">{t("avatarUploadHint")}</p>{avatarPreview && <button type="button" onClick={removeAvatarFile} disabled={uploadAvatar.isPending || removeAvatar.isPending} className="mt-3 rounded-lg border border-[#d8b2a5] bg-white px-3 py-2 text-sm font-semibold text-[#893f31] disabled:opacity-60">{t("removeAvatar")}</button>}{(uploadAvatar.isPending || removeAvatar.isPending) && <p className="mt-2 text-sm font-medium text-[#31564b]" role="status">{removeAvatar.isPending ? t("removingAvatar") : t("uploadingAvatar")}</p>}{avatarSaved && <p className="mt-2 text-sm font-semibold text-[#31564b]" role="status" aria-live="polite">{t("avatarUploadSuccess")}</p>}{avatarRemoved && <p className="mt-2 text-sm font-semibold text-[#31564b]" role="status" aria-live="polite">{t("avatarRemoved")}</p>}{avatarError && <p className="mt-2 text-sm font-medium text-[#893f31]" role="alert">{avatarError}</p>}</div></div></div>
      <div className="mt-4 rounded-2xl bg-[#f5f1e8] p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7e8c84]">Display name</p>{editingName ? <form className="mt-2" onSubmit={saveName}><label className="sr-only" htmlFor="display-name">Display name</label><input id="display-name" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={80} autoFocus className="w-full rounded-xl border border-[#c6bda9] bg-white px-3 py-2 font-medium outline-none focus:border-[#31564b] focus:ring-2 focus:ring-[#31564b]/20" /><p className="mt-2 text-xs text-[#65736c]">This changes the name shown in CropWise. Your connected Google account and email remain unchanged.</p>{nameError && <p className="mt-2 text-sm font-medium text-[#893f31]" role="alert">{nameError}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="submit" disabled={updateDisplayName.isPending} className="rounded-lg bg-[#31564b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{updateDisplayName.isPending ? "Saving…" : "Save name"}</button><button type="button" onClick={cancelNameEdit} disabled={updateDisplayName.isPending} className="rounded-lg border border-[#d8d3c8] bg-white px-3 py-2 text-sm font-semibold text-[#31564b]">Cancel</button></div></form> : <><p className="mt-2 break-words text-lg font-semibold">{profile.data.name ?? "Not provided"}</p><button type="button" onClick={() => { setNameDraft(profile.data?.name ?? ""); setNameError(null); setEditingName(true); }} className="mt-3 rounded-lg border border-[#c6bda9] bg-white px-3 py-2 text-sm font-semibold text-[#31564b]">Change display name</button></>}</div>{nameSaved && <p className="text-sm font-semibold text-[#31564b]" role="status" aria-live="polite">Name saved</p>}</div></div>
      <details className="mt-4 rounded-2xl border border-[#ded8c9] bg-[#fffaf0] p-4"><summary className="cursor-pointer font-semibold text-[#31564b]">{t("displayNameLanguageGuideTitle")}</summary><p className="mt-3 text-sm leading-6 text-[#65736c]">{t("displayNameLanguageGuideDescription")}</p><p className="mt-2 text-sm leading-6 text-[#65736c]">{t("displayNameLanguageGuideExample")}</p></details>
      <dl className="account-meta-grid mt-4 grid gap-4 sm:grid-cols-2">{[["Email", profile.data.email ?? "Not provided"],["Connected account", profile.data.loginMethod ?? "Email account"],["Role", profile.data.role],["User ID", String(profile.data.id)],["Last signed in", new Date(profile.data.lastSignedIn).toLocaleString()]].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#f5f1e8] p-4"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7e8c84]">{label}</dt><dd className="mt-2 break-words font-medium">{value}</dd></div>)}</dl></> : <p className="mt-6 text-sm text-[#65736c]">Loading session details…</p>}</section>
      <section className="account-card min-w-0 max-w-full rounded-3xl bg-[#fffdf8] p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="break-words font-serif text-2xl">{t("profileCompletionTitle")}</h2><p className="mt-2 text-sm leading-6 text-[#65736c]">{t("profileCompletionDescription")}</p></div><strong className="shrink-0 text-xl text-[#31564b]">{completion.percent}%</strong></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e7e1d4]" role="progressbar" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100} aria-label={t("profileCompletionTitle")}><span className="block h-full rounded-full bg-[#d98547] transition-[width] duration-300" style={{ width: `${completion.percent}%` }} /></div><p className="mt-2 text-sm font-semibold text-[#31564b]">{completion.percent}% {t("profileComplete")}</p><ul className="mt-5 space-y-3">{completion.items.map((item) => <li key={item.id} className="flex items-center gap-3 text-sm"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.complete ? "bg-[#31564b] text-white" : "border border-[#c6bda9] text-transparent"}`}>✓</span><span className={item.complete ? "text-[#65736c]" : "font-semibold text-[#1d2d29]"}>{t(completionLabels[item.id])}</span></li>)}</ul>{completion.percent === 100 && <p className="mt-4 text-sm text-[#65736c]">{t("profileCompletionAllSet")}</p>}</section>
      <section className="account-card min-w-0 rounded-3xl bg-[#fffdf8] p-6 shadow-sm"><h2 className="font-serif text-2xl">Data retention</h2><p className="mt-2 text-sm leading-6 text-[#65736c]">Choose how long private scans and reminders remain in CropWise. Zero means keep until you delete them.</p><div className="mt-6 space-y-4"><label className="block text-sm font-medium">Private scan history<select value={scanRetentionDays} onChange={e => setScanRetentionDays(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[#d8d3c8] bg-white px-3 py-3"><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>1 year</option><option value={0}>Keep until deleted</option></select></label><label className="block text-sm font-medium">Crop reminders<select value={reminderRetentionDays} onChange={e => setReminderRetentionDays(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[#d8d3c8] bg-white px-3 py-3"><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>1 year</option><option value={0}>Keep until deleted</option></select></label><button onClick={save} disabled={saveSettings.isPending} className="w-full rounded-xl bg-[#31564b] px-4 py-3 font-semibold text-white disabled:opacity-60">{saved ? "Saved" : saveSettings.isPending ? "Saving…" : "Save preferences"}</button></div></section>
      <section className="account-card min-w-0 rounded-3xl border border-[#e8c7b7] bg-[#fff8f4] p-6 lg:col-span-2"><h2 className="font-serif text-2xl text-[#893f31]">Danger zone</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#714d46]">Deleting your account removes the CropWise user, private profile, scan-history records, reminders, alert thresholds, credentials, reset tokens, and session access. This action cannot be undone.</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={async () => { await logout(); navigate("/sign-in"); }} className="rounded-xl border border-[#d8b2a5] bg-white px-4 py-3 font-semibold text-[#893f31]">Sign out</button><button onClick={remove} disabled={deleteAccount.isPending} className="rounded-xl bg-[#893f31] px-4 py-3 font-semibold text-white disabled:opacity-60">{deleteAccount.isPending ? "Deleting…" : "Delete account"}</button></div></section></div></div></main>;
}
