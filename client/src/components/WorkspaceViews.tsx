import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { allocationRows, currentCropPlanSeason, seasonalCropSuggestions, validateCropAllocation } from "@/lib/cropPlan";
import { downloadCropPlanReport, printCropPlanReport } from "@/lib/cropPlanReport";
import { BellRing, BookOpen, CalendarCheck2, Check, CloudRain, Download, Droplets, Leaf, MapPin, Printer, RefreshCw, Settings2, Sprout, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./workspace-views.css";

export type CropWorkspaceOption = { id: string; name: string; localName: string; icon: string; score: number; yield: string; profit: string };
type WeatherSnapshot = { temperature: number; rainChance: number; condition: string };
type WorkspaceSharedProps = { cropOptions: CropWorkspaceOption[]; selectedCropId: string; onSelectCrop: (id: string) => void; locationLabel: string; weather?: WeatherSnapshot | null };
type CropPlanProps = WorkspaceSharedProps & { selectedCropIds: string[]; onToggleCrop: (id: string) => void; onApplySeasonSuggestion: (cropIds: string[]) => void; totalFarmAcres: number; cropAreaPercentages: Record<string, number>; onAreaTotalChange: (value: number) => void; onAreaChange: (cropId: string, percent: number) => void; onSaveCropPlan: () => void; isSavingCropPlan: boolean };
type SupportedCrop = "Maize" | "Groundnut" | "Soybean" | "Wheat" | "Cotton" | "Chickpea" | "Rice";

const cropLibraryReference = {
  Maize: { percent: 98, mm: 500, days: 100, sowing: "cropLibraryMaizeSowing", soil: "cropLibraryMaizeSoil" },
  Groundnut: { percent: 100, mm: 510, days: 105, sowing: "cropLibraryGroundnutSowing", soil: "cropLibraryGroundnutSoil" },
  Soybean: { percent: 63, mm: 320, days: 85, sowing: "cropLibrarySoybeanSowing", soil: "cropLibrarySoybeanSoil" },
  Wheat: { percent: 72, mm: 450, days: 120, sowing: "cropLibraryWheatSowing", soil: "cropLibraryWheatSoil" },
  Cotton: { percent: 90, mm: 700, days: 180, sowing: "cropLibraryCottonSowing", soil: "cropLibraryCottonSoil" },
  Chickpea: { percent: 48, mm: 300, days: 105, sowing: "cropLibraryChickpeaSowing", soil: "cropLibraryChickpeaSoil" },
  Rice: { percent: 100, mm: 1200, days: 130, sowing: "cropLibraryRiceSowing", soil: "cropLibraryRiceSoil" },
} as const;

const cropProfileReference = {
  Maize: {
    purpose: "cropProfileMaizePurpose", climate: "cropProfileMaizeClimate", establishment: "cropProfileMaizeEstablishment", seed: "cropProfileMaizeSeed", nutrition: "cropProfileMaizeNutrition", water: "cropProfileMaizeWater", harvest: "cropProfileMaizeHarvest", vigilance: "cropProfileMaizeVigilance",
  },
  Groundnut: {
    purpose: "cropProfileGroundnutPurpose", climate: "cropProfileGroundnutClimate", establishment: "cropProfileGroundnutEstablishment", seed: "cropProfileGroundnutSeed", nutrition: "cropProfileGroundnutNutrition", water: "cropProfileGroundnutWater", harvest: "cropProfileGroundnutHarvest", vigilance: "cropProfileGroundnutVigilance",
  },
  Soybean: {
    purpose: "cropProfileSoybeanPurpose", climate: "cropProfileSoybeanClimate", establishment: "cropProfileSoybeanEstablishment", seed: "cropProfileSoybeanSeed", nutrition: "cropProfileSoybeanNutrition", water: "cropProfileSoybeanWater", harvest: "cropProfileSoybeanHarvest", vigilance: "cropProfileSoybeanVigilance",
  },
  Wheat: {
    purpose: "cropProfileWheatPurpose", climate: "cropProfileWheatClimate", establishment: "cropProfileWheatEstablishment", seed: "cropProfileWheatSeed", nutrition: "cropProfileWheatNutrition", water: "cropProfileWheatWater", harvest: "cropProfileWheatHarvest", vigilance: "cropProfileWheatVigilance",
  },
  Cotton: {
    purpose: "cropProfileCottonPurpose", climate: "cropProfileCottonClimate", establishment: "cropProfileCottonEstablishment", seed: "cropProfileCottonSeed", nutrition: "cropProfileCottonNutrition", water: "cropProfileCottonWater", harvest: "cropProfileCottonHarvest", vigilance: "cropProfileCottonVigilance",
  },
  Chickpea: {
    purpose: "cropProfileChickpeaPurpose", climate: "cropProfileChickpeaClimate", establishment: "cropProfileChickpeaEstablishment", seed: "cropProfileChickpeaSeed", nutrition: "cropProfileChickpeaNutrition", water: "cropProfileChickpeaWater", harvest: "cropProfileChickpeaHarvest", vigilance: "cropProfileChickpeaVigilance",
  },
  Rice: {
    purpose: "cropProfileRicePurpose", climate: "cropProfileRiceClimate", establishment: "cropProfileRiceEstablishment", seed: "cropProfileRiceSeed", nutrition: "cropProfileRiceNutrition", water: "cropProfileRiceWater", harvest: "cropProfileRiceHarvest", vigilance: "cropProfileRiceVigilance",
  },
} as const;

const apiCrop = (id: string): SupportedCrop => ["Maize", "Groundnut", "Soybean", "Wheat", "Cotton", "Chickpea", "Rice"].includes(id) ? id as SupportedCrop : "Maize";
const dateValue = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

type CropPickerProps = { options: CropWorkspaceOption[]; selected: string; onSelect: (id: string) => void; label: string; multi?: boolean; selectedIds?: string[]; onToggle?: (id: string) => void };

function CropPicker({ options, selected, onSelect, label, multi = false, selectedIds = [], onToggle }: CropPickerProps) {
  return <div className={`workspace-crop-picker ${multi ? "multi" : ""}`} role="group" aria-label={label}>{options.map((crop) => {
    const active = multi ? selectedIds.includes(crop.id) : crop.id === selected;
    return <button key={crop.id} type="button" className={active ? "active" : ""} aria-pressed={active} onClick={() => multi ? onToggle?.(crop.id) : onSelect(crop.id)}><span>{crop.icon}</span><b>{crop.name}</b><small>{multi && active ? <><Check size={13} /> {crop.score}%</> : `${crop.score}%`}</small></button>;
  })}</div>;
}

const suggestionPhraseById = {
  "kharif-balanced": { title: "suggestionKharifBalancedTitle", reason: "suggestionKharifBalancedReason" },
  "kharif-fibre": { title: "suggestionKharifFibreTitle", reason: "suggestionKharifFibreReason" },
  "kharif-water": { title: "suggestionKharifWaterTitle", reason: "suggestionKharifWaterReason" },
  "rabi-balanced": { title: "suggestionRabiBalancedTitle", reason: "suggestionRabiBalancedReason" },
  "rabi-diversified": { title: "suggestionRabiDiversifiedTitle", reason: "suggestionRabiDiversifiedReason" },
  "rabi-low-water": { title: "suggestionRabiLowWaterTitle", reason: "suggestionRabiLowWaterReason" },
} as const;

export function CropPlanWorkspace({ cropOptions, selectedCropId, onSelectCrop, locationLabel, weather, selectedCropIds, onToggleCrop, onApplySeasonSuggestion, totalFarmAcres, cropAreaPercentages, onAreaTotalChange, onAreaChange, onSaveCropPlan, isSavingCropPlan }: CropPlanProps) {
  const { language, copy, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const selected = cropOptions.find((crop) => crop.id === selectedCropId) ?? cropOptions[0];
  const selectedCrops = cropOptions.filter((crop) => selectedCropIds.includes(crop.id));
  const [allocationUnit, setAllocationUnit] = useState<"percent" | "acres">("percent");
  const season = currentCropPlanSeason();
  const seasonSuggestions = seasonalCropSuggestions(season);
  const allocationValidation = validateCropAllocation(selectedCropIds, cropAreaPercentages, totalFarmAcres);
  const allocationData = allocationRows(selectedCropIds, cropAreaPercentages, totalFarmAcres);
  const reportRows = allocationData.map((row) => {
    const crop = cropOptions.find((option) => option.id === row.cropId);
    const profile = cropProfileReference[apiCrop(row.cropId)];
    return { ...row, name: crop?.name ?? row.cropId, guidance: t(profile.purpose) };
  });
  const buildPlanReport = () => ({
    locationLabel,
    seasonLabel: `${t("currentSeason")}: ${t(season === "Kharif" ? "seasonKharif" : "seasonRabi")}`,
    totalAcres: totalFarmAcres,
    rows: reportRows,
    generatedLabel: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date()),
    title: t("planDocumentTitle"),
    allocationLabel: t("allocationTitle"),
    areaLabel: t("allocationAcres"),
    guidanceLabel: t("cropProfileTitle"),
    disclaimer: t("cropProfileCaution"),
  });
  const handleDownloadPlan = () => {
    if (!allocationValidation.valid) return window.alert(t("planExportBlocked"));
    downloadCropPlanReport(buildPlanReport());
  };
  const handlePrintPlan = () => {
    if (!allocationValidation.valid) return window.alert(t("planExportBlocked"));
    if (!printCropPlanReport(buildPlanReport())) window.alert(t("planPrintBlocked"));
  };
  const reference = cropLibraryReference[apiCrop(selected.id)];
  const [libraryCropId, setLibraryCropId] = useState<SupportedCrop>(() => apiCrop(selected.id));
  const reminders = trpc.cropCalendar.list.useQuery(undefined, { enabled: isAuthenticated });
  const create = trpc.cropCalendar.create.useMutation({ onSuccess: () => { reminders.refetch(); setTitle(""); setDetails(""); setError(""); }, onError: () => setError(t("cropCalendarSaveError")) });
  const setStatus = trpc.cropCalendar.setStatus.useMutation({ onSuccess: () => reminders.refetch() });
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState(() => dateValue(new Date(Date.now() + 7 * 86400000)));
  const [error, setError] = useState("");
  const upcoming = (reminders.data ?? []).filter((item) => item.status === "upcoming").slice(0, 5);
  const locale = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
  const submitReminder = (event: FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) return startLogin();
    const dueAt = new Date(`${dueDate}T09:00:00`);
    if (title.trim().length < 3 || Number.isNaN(dueAt.getTime())) return setError(t("cropCalendarSaveError"));
    create.mutate({ cropName: apiCrop(selected.id), title: title.trim(), details: details.trim() || undefined, dueAt });
  };

  return <section className="workspace-page" aria-labelledby="crop-plan-title">
    <header className="workspace-hero crop-plan-hero"><div><span className="workspace-kicker"><Sprout size={16} /> {t("workspaceCropPlanKicker")}</span><h1 id="crop-plan-title">{t("workspaceCropPlanTitle")}</h1><p>{t("workspaceCropPlanDescription")}</p></div><div className="workspace-location"><MapPin size={16} />{locationLabel}</div></header>
    <section className="workspace-section multi-crop-selection" aria-labelledby="multi-crop-title"><div className="workspace-section-heading"><div><span className="workspace-kicker"><Sprout size={16} /> {t("workspaceSelectedCrops")}</span><h2 id="multi-crop-title">{selectedCropIds.length}/3 {t("workspaceSelectedCropCount")}</h2><p>{t("workspaceChooseMultipleCrops")}</p></div><button type="button" className="workspace-secondary-action" onClick={onSaveCropPlan} disabled={isSavingCropPlan}>{isSavingCropPlan ? t("cropCalendarSaving") : t("workspaceSaveCropSelection")}</button></div><CropPicker options={cropOptions} selected={selectedCropId} onSelect={onSelectCrop} label={t("workspaceChooseMultipleCrops")} multi selectedIds={selectedCropIds} onToggle={onToggleCrop} /><div className="crop-plan-selection-summary"><strong>{t("workspaceSelectedCrops")}</strong><div className="crop-plan-selection-chips">{selectedCrops.map((crop) => <button type="button" className={`crop-plan-chip ${crop.id === selectedCropId ? "active" : ""}`} key={crop.id} onClick={() => onSelectCrop(crop.id)}><span>{crop.icon}</span>{crop.name}</button>)}</div></div><div className="crop-compare-grid">{selectedCrops.map((crop) => <article className="crop-compare-card" key={crop.id}><div><span>{crop.icon}</span><strong>{crop.name}</strong></div><span>{t("suitability")} <b>{crop.score}%</b></span><span>{t("yield")} <b>{crop.yield}</b></span><span>{t("estimatedProfit")} <b>{crop.profit}</b></span></article>)}</div></section>
    <section className="workspace-section allocation-section" aria-labelledby="allocation-title">
      <div className="workspace-section-heading"><div><span className="workspace-kicker"><WalletCards size={16} /> {t("allocationTitle")}</span><h2 id="allocation-title">{t("allocationTitle")}</h2><p>{t("allocationDescription")}</p></div><div className="allocation-toolbar"><label>{t("allocationFarmArea")}<input type="number" min="0" step="0.1" value={totalFarmAcres} onChange={(event) => onAreaTotalChange(Number(event.target.value))} /></label><div className="allocation-unit-control" role="group" aria-label={t("allocationUnit")}><span>{t("allocationUnit")}</span><button type="button" className={allocationUnit === "percent" ? "active" : ""} onClick={() => setAllocationUnit("percent")}>{t("allocationPercent")}</button><button type="button" className={allocationUnit === "acres" ? "active" : ""} onClick={() => setAllocationUnit("acres")}>{t("allocationAcres")}</button></div></div></div>
      <div className="allocation-list">{allocationData.map((row) => { const crop = cropOptions.find((option) => option.id === row.cropId); const displayValue = allocationUnit === "percent" ? row.percent : row.acres; return <div className="allocation-row" key={row.cropId}><div className="allocation-crop"><span>{crop?.icon}</span><strong>{crop?.name ?? row.cropId}</strong><small>{row.percent.toFixed(1)}% · {row.acres.toFixed(2)} {t("allocationAcres")}</small></div><label htmlFor={`allocation-${row.cropId}`}>{allocationUnit === "percent" ? t("allocationPercent") : t("allocationAcres")}<input id={`allocation-${row.cropId}`} type="number" min="0" step="0.1" value={displayValue || ""} onChange={(event) => { const value = Number(event.target.value); const percent = allocationUnit === "percent" ? value : totalFarmAcres > 0 ? (value / totalFarmAcres) * 100 : 0; onAreaChange(row.cropId, Number.isFinite(percent) ? percent : 0); }} /></label></div>; })}</div>
      <div className={`allocation-total ${allocationValidation.valid ? "valid" : "invalid"}`} role="status"><div><strong>{t("allocationTotal")} {allocationValidation.totalPercent.toFixed(1)}%</strong><span>{Math.max(0, 100 - allocationValidation.totalPercent).toFixed(1)}% {t("allocationRemaining")}</span></div><p>{allocationValidation.valid ? t("allocationValid") : t(allocationValidation.reason === "farm-area" ? "allocationFarmAreaError" : allocationValidation.reason === "crop-area" ? "allocationCropError" : "allocationTotalError")}</p></div><button type="button" className="workspace-primary-action" onClick={onSaveCropPlan} disabled={isSavingCropPlan || !allocationValidation.valid}>{isSavingCropPlan ? t("cropCalendarSaving") : t("allocationSavePlan")}</button>
    </section>
    <section className="workspace-section season-suggestions-section" aria-labelledby="season-suggestions-title"><div className="workspace-section-heading"><div><span className="workspace-kicker"><Sprout size={16} /> {t("seasonSuggestionsTitle")}</span><h2 id="season-suggestions-title">{t("seasonSuggestionsTitle")}</h2><p>{t("seasonSuggestionsDescription")}</p></div><span className="season-badge">{t("currentSeason")}: {t(season === "Kharif" ? "seasonKharif" : "seasonRabi")}</span></div><div className="season-suggestion-grid">{seasonSuggestions.map((suggestion) => { const phrases = suggestionPhraseById[suggestion.id as keyof typeof suggestionPhraseById]; return <article className="season-suggestion-card" key={suggestion.id}><span className="season-suggestion-crops">{suggestion.crops.map((cropId) => cropOptions.find((crop) => crop.id === cropId)?.icon).join(" ")}</span><h3>{t(phrases.title)}</h3><p>{t(phrases.reason)}</p><button type="button" className="workspace-secondary-action" onClick={() => onApplySeasonSuggestion(suggestion.crops)}>{t("applyCombination")}</button></article>; })}</div></section>
    <section className="workspace-section plan-export-section" aria-labelledby="plan-export-title"><div className="workspace-section-heading"><div><span className="workspace-kicker"><Download size={16} /> {t("planExportTitle")}</span><h2 id="plan-export-title">{t("planExportTitle")}</h2><p>{t("planExportDescription")}</p></div><div className="plan-export-actions"><button type="button" className="workspace-secondary-action" onClick={handleDownloadPlan} disabled={!allocationValidation.valid}><Download size={16} /> {t("downloadPlan")}</button><button type="button" className="workspace-secondary-action" onClick={handlePrintPlan} disabled={!allocationValidation.valid}><Printer size={16} /> {t("printPlan")}</button></div></div>{!allocationValidation.valid && <p className="workspace-form-error">{t("planExportBlocked")}</p>}</section>
    <div className="workspace-grid crop-plan-grid"><article className="workspace-card plan-focus-card"><div className="workspace-card-head"><span>{selected.icon}</span><div><small>{t("workspaceSelectedCrop")}</small><h2>{selected.name}</h2><p>{selected.localName}</p></div></div><div className="plan-metrics"><span><small>{t("suitability")}</small><b>{selected.score}%</b></span><span><small>{t("yield")}</small><b>{selected.yield}</b></span><span><small>{t("estimatedProfit")}</small><b>{selected.profit}</b></span></div><p className="workspace-callout"><Leaf size={16} />{t("workspaceCropPlanAction")}</p></article><article className="workspace-card weather-readiness-card"><div className="workspace-card-head"><CloudRain size={22} /><div><small>{t("workspaceWeatherReadiness")}</small><h2>{weather?.condition ?? t("weatherUpdating")}</h2><p>{weather ? `${weather.temperature}° · ${weather.rainChance}% ${copy.rain}` : t("weatherUnavailable")}</p></div></div><p>{t("workspaceWeatherPlanHint")}</p></article></div>
    <section id="crop-calendar" className="workspace-section calendar-section" aria-labelledby="crop-calendar-title"><div className="workspace-section-heading"><div><span className="workspace-kicker"><CalendarCheck2 size={16} /> {t("cropCalendarKicker")}</span><h2 id="crop-calendar-title">{t("cropCalendarWorkspaceTitle")}</h2><p>{t("cropCalendarWorkspaceDescription")}</p></div><span className="calendar-notice"><BellRing size={15} /> {upcoming.length}</span></div><div className="workspace-grid calendar-grid"><article className="workspace-card calendar-list-card"><h2>{t("cropCalendarUpcoming")}</h2>{!isAuthenticated ? <div className="workspace-empty"><p>{t("cropCalendarSignIn")}</p><button type="button" onClick={startLogin}>{copy.signIn}</button></div> : reminders.isLoading ? <p>{t("cropCalendarSaving")}</p> : upcoming.length ? <ol className="reminder-list">{upcoming.map((reminder) => <li key={reminder.id}><span className="reminder-date"><b>{new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(reminder.dueAt))}</b><small>{reminder.cropName}</small></span><div><strong>{reminder.title}</strong>{reminder.details ? <p>{reminder.details}</p> : null}</div><button type="button" onClick={() => setStatus.mutate({ id: reminder.id, status: "completed" })} disabled={setStatus.isPending}><Check size={15} /><span className="visually-hidden">{t("cropCalendarComplete")}</span></button></li>)}</ol> : <p className="workspace-empty-copy">{t("cropCalendarNoTasks")}</p>}<p className="workspace-disclaimer">{t("cropCalendarOpenNotice")}</p></article><form className="workspace-card calendar-form" onSubmit={submitReminder}><div className="workspace-card-head"><CalendarCheck2 size={22} /><div><small>{selected.name}</small><h2>{t("cropCalendarAddTask")}</h2></div></div><label>{t("cropCalendarTaskTitle")}<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder={t("cropCalendarDefaultTask")} /></label><label>{t("cropCalendarDueDate")}<input type="date" value={dueDate} min={dateValue(new Date())} onChange={(event) => setDueDate(event.target.value)} /></label><label>{t("cropCalendarTaskDetails")}<textarea value={details} rows={2} maxLength={600} onChange={(event) => setDetails(event.target.value)} /></label>{error ? <p className="workspace-form-error">{error}</p> : null}<button className="workspace-primary-action" disabled={create.isPending}>{create.isPending ? t("cropCalendarSaving") : t("cropCalendarCreate")}</button></form></div></section>
    <section className="workspace-section crop-library-section" aria-labelledby="crop-library-title"><div className="workspace-section-heading"><div><span className="workspace-kicker"><BookOpen size={16} /> {t("cropLibraryKicker")}</span><h2 id="crop-library-title">{t("cropLibraryTitle")}</h2><p>{t("cropLibraryDescription")}</p></div></div><article className="workspace-card crop-library-feature"><div className="workspace-card-head"><span>{selected.icon}</span><div><small>{selected.name}</small><h2>{selected.localName}</h2></div></div><div className="crop-library-metrics"><span><small>{t("cropLibrarySowingWindow")}</small><b>{t(reference.sowing)}</b></span><span><small>{t("cropLibraryWaterPlanning")}</small><b>{reference.percent}%</b><i>~{reference.mm} mm / {reference.days} days</i></span><span><small>{t("cropLibrarySoilTypes")}</small><b>{t(reference.soil)}</b></span></div></article><div className="crop-library-grid">{cropOptions.map((crop) => { const item = cropLibraryReference[apiCrop(crop.id)]; const profileCrop = apiCrop(crop.id); return <article className={`workspace-card crop-library-card ${profileCrop === libraryCropId ? "selected" : ""}`} key={crop.id}><div><span>{crop.icon}</span><h3>{crop.name}</h3><small>{t("cropLibrarySowingWindow")}</small><p>{t(item.sowing)}</p></div><div className="library-water"><Droplets size={16} /><b>{item.percent}%</b><span>{t("cropLibrarySeasonalReference")}</span></div><button type="button" onClick={() => { onSelectCrop(crop.id); setLibraryCropId(profileCrop); }}>{profileCrop === libraryCropId ? t("workspaceSelectedCrop") : t("cropProfileOpen")}</button></article>; })}</div><CropLibraryProfile crop={cropOptions.find((crop) => apiCrop(crop.id) === libraryCropId) ?? selected} reference={cropLibraryReference[libraryCropId]} profile={cropProfileReference[libraryCropId]} t={t} /><p className="workspace-disclaimer crop-library-disclaimer">{t("cropLibraryCheckLocal")} <a href="https://agritech.tnau.ac.in/agriculture/agri_irrigationmgt_waterrequirements.html" target="_blank" rel="noreferrer">{t("cropLibrarySource")}</a>.</p></section>
  </section>;
}

function CropLibraryProfile({ crop, reference, profile, t }: { crop: CropWorkspaceOption; reference: (typeof cropLibraryReference)[SupportedCrop]; profile: (typeof cropProfileReference)[SupportedCrop]; t: ReturnType<typeof useLanguage>["t"] }) {
  const guides = [
    ["cropProfileEstablishment", profile.establishment], ["cropProfileSeed", profile.seed], ["cropProfileNutrition", profile.nutrition], ["cropProfileWater", profile.water], ["cropProfileHarvest", profile.harvest], ["cropProfileVigilance", profile.vigilance],
  ] as const;
  return <article className="workspace-card crop-profile-card" aria-labelledby="crop-profile-title" aria-live="polite"><div className="crop-profile-heading"><div className="workspace-card-head"><span>{crop.icon}</span><div><span className="workspace-kicker"><BookOpen size={15} /> {t("cropProfileTitle")}</span><h2 id="crop-profile-title">{crop.name}</h2><p>{t("cropProfileDescription")}</p></div></div><div className="crop-profile-summary"><span><small>{t("cropLibrarySowingWindow")}</small><b>{t(reference.sowing)}</b></span><span><small>{t("cropLibraryWaterPlanning")}</small><b>{reference.percent}%</b></span><span><small>{t("cropLibrarySoilTypes")}</small><b>{t(reference.soil)}</b></span></div></div><div className="crop-profile-intro"><div><h3>{t("cropProfilePurpose")}</h3><p>{t(profile.purpose)}</p></div><div><h3>{t("cropProfileClimate")}</h3><p>{t(profile.climate)}</p></div></div><div className="crop-profile-guides">{guides.map(([title, content]) => <section key={title}><h3>{t(title)}</h3><p>{t(content)}</p></section>)}</div><p className="workspace-disclaimer crop-profile-caution">{t("cropProfileCaution")}</p></article>;
}

type WealthWatchProps = WorkspaceSharedProps & { price: number; trendPercent: string; trendIsPositive: boolean; marketIsLive: boolean; marketSource?: string; onRefresh: () => void; onEditMarket: () => void };

export function CropWealthWatchWorkspace({ cropOptions, selectedCropId, onSelectCrop, locationLabel, weather, price, trendPercent, trendIsPositive, marketIsLive, marketSource, onRefresh, onEditMarket }: WealthWatchProps) {
  const { copy, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const selected = cropOptions.find((crop) => crop.id === selectedCropId) ?? cropOptions[0];
  const thresholds = trpc.cropAlertThresholds.list.useQuery(undefined, { enabled: isAuthenticated });
  const saved = thresholds.data?.find((threshold) => threshold.cropName === selected.id);
  const fallback = useMemo(() => ({ priceFloor: Math.max(1, Math.round(price * .9)), rainChance: 70, soilMoistureMinimum: 40 }), [price]);
  const current = saved ?? fallback;
  const [open, setOpen] = useState(false);
  const [floor, setFloor] = useState(String(current.priceFloor));
  const [rain, setRain] = useState(String(current.rainChance));
  const [soil, setSoil] = useState(String(current.soilMoistureMinimum));
  const [error, setError] = useState("");
  useEffect(() => { setFloor(String(current.priceFloor)); setRain(String(current.rainChance)); setSoil(String(current.soilMoistureMinimum)); setError(""); }, [selected.id, current.priceFloor, current.rainChance, current.soilMoistureMinimum]);
  const save = trpc.cropAlertThresholds.save.useMutation({ onSuccess: () => { thresholds.refetch(); setOpen(false); }, onError: () => setError(t("wealthThresholdInvalid")) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!isAuthenticated) return startLogin(); const priceFloor = Number(floor), rainChance = Number(rain), soilMoistureMinimum = Number(soil); if (!Number.isInteger(priceFloor) || priceFloor < 1 || !Number.isInteger(rainChance) || rainChance < 0 || rainChance > 100 || !Number.isInteger(soilMoistureMinimum) || soilMoistureMinimum < 0 || soilMoistureMinimum > 100) return setError(t("wealthThresholdInvalid")); save.mutate({ cropName: apiCrop(selected.id), priceFloor, rainChance, soilMoistureMinimum }); };
  const Trend = trendIsPositive ? TrendingUp : TrendingDown;
  return <section className="workspace-page" aria-labelledby="wealth-watch-title"><header className="workspace-hero wealth-watch-hero"><div><span className="workspace-kicker"><WalletCards size={16} /> {t("workspaceWealthWatchKicker")}</span><h1 id="wealth-watch-title">{t("workspaceWealthWatchTitle")}</h1><p>{t("workspaceWealthWatchDescription")}</p></div><div className="workspace-location"><MapPin size={16} />{locationLabel}</div></header><CropPicker options={cropOptions} selected={selectedCropId} onSelect={onSelectCrop} label={t("workspaceChooseCrop")} /><div className="workspace-grid wealth-watch-grid"><article className="workspace-card wealth-value-card"><div className="workspace-card-head"><TrendingUp size={22} /><div><small>{marketIsLive ? `${locationLabel} · ${copy.live}` : copy.marketFallback}</small><h2>{selected.name} {t("workspaceMarketPosition")}</h2></div></div><strong className="wealth-price">₹{price.toLocaleString("en-IN")}</strong><span className={`wealth-trend ${trendIsPositive ? "positive" : "negative"}`}><Trend size={16} />{trendIsPositive ? "+" : "−"}{trendPercent}% · {copy.perQuintal}</span><p>{marketIsLive && marketSource ? marketSource : t("workspaceMarketFallbackDetail")}</p><div className="workspace-actions"><button type="button" onClick={onRefresh}><RefreshCw size={15} />{copy.refresh}</button><button type="button" onClick={onEditMarket}>{copy.changeValues}</button></div></article><article className="workspace-card wealth-weather-card"><div className="workspace-card-head"><CloudRain size={22} /><div><small>{t("workspaceRainWatch")}</small><h2>{weather?.condition ?? t("weatherUpdating")}</h2></div></div><div className="rain-stat"><b>{weather ? `${weather.rainChance}%` : "—"}</b><span>{t("workspaceRainChance")}</span></div><p>{weather ? t("workspaceRainWatchHint") : t("weatherUnavailable")}</p></article><article className="workspace-card wealth-action-card"><div className="workspace-card-head"><Leaf size={22} /><div><small>{t("workspaceFieldValue")}</small><h2>{selected.score}% {t("suitability")}</h2></div></div><p>{t("workspaceFieldValueHint")}</p><div className="field-value-meter"><span style={{ width: `${selected.score}%` }} /></div><small>{selected.profit} {t("perAcre")}</small></article></div><section className="workspace-section threshold-section" aria-labelledby="threshold-settings-title"><div className="workspace-section-heading"><div><span className="workspace-kicker"><Settings2 size={16} /> {t("wealthThresholdKicker")}</span><h2 id="threshold-settings-title">{t("wealthThresholdTitle")}</h2><p>{t("wealthThresholdDescription")}</p></div><button type="button" className="workspace-secondary-action" onClick={() => setOpen((value) => !value)}><Settings2 size={15} />{t("wealthThresholdConfigure")}</button></div><div className="workspace-grid threshold-grid"><article className="workspace-card threshold-preview"><h2>{t("wealthThresholdPreview")}</h2><div className="threshold-values"><span><small>{t("wealthThresholdPriceHint")}</small><b>₹{current.priceFloor.toLocaleString("en-IN")}</b></span><span><small>{t("wealthThresholdRainHint")}</small><b>{current.rainChance}%</b></span><span><small>{t("wealthThresholdSoilHint")}</small><b>{current.soilMoistureMinimum}%</b></span></div><p>{isAuthenticated ? t("wealthThresholdDescription") : t("wealthThresholdSignIn")}</p></article>{open ? <form className="workspace-card threshold-form" onSubmit={submit}><div className="workspace-card-head"><Settings2 size={22} /><div><small>{selected.name}</small><h2>{t("wealthThresholdConfigure")}</h2></div></div><label>{t("wealthThresholdPriceFloor")}<input type="number" min="1" value={floor} onChange={(event) => setFloor(event.target.value)} /></label><label>{t("wealthThresholdRain")}<input type="number" min="0" max="100" value={rain} onChange={(event) => setRain(event.target.value)} /></label><label>{t("wealthThresholdSoil")}<input type="number" min="0" max="100" value={soil} onChange={(event) => setSoil(event.target.value)} /></label>{error ? <p className="workspace-form-error">{error}</p> : null}<button className="workspace-primary-action" disabled={save.isPending}>{save.isPending ? t("wealthThresholdSaving") : t("wealthThresholdSave")}</button></form> : null}</div></section></section>;
}

export function KrishiExpertWorkspace({ selectedCropId, cropOptions, locationLabel }: Pick<WorkspaceSharedProps, "selectedCropId" | "cropOptions" | "locationLabel">) {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const cropName = cropOptions.find((crop) => crop.id === selectedCropId)?.name;
  const ask = trpc.krishiExpert.ask.useMutation({ onSuccess: (response) => setMessages((items) => [...items, { role: "assistant", content: response.answer }]), onError: () => setMessages((items) => [...items, { role: "assistant", content: t("expertReplyError") }]) });
  const send = (question: string) => { setMessages((items) => [...items, { role: "user", content: question }]); ask.mutate({ question, language, cropName, locationLabel }); };
  return <section className="workspace-page expert-workspace" aria-labelledby="krishi-expert-title"><header className="workspace-hero expert-hero"><div><span className="workspace-kicker"><Sprout size={16} /> {t("workspaceExpertKicker")}</span><h1 id="krishi-expert-title">{t("workspaceExpertTitle")}</h1><p>{t("workspaceExpertDescription")}</p></div><div className="workspace-location"><MapPin size={16} />{locationLabel}</div></header><div className="expert-chat-layout"><aside className="workspace-card expert-context"><span className="expert-context-mark"><Leaf size={22} /></span><h2>{t("workspaceExpertContext")}</h2><p>{cropName ? `${t("workspaceSelectedCrop")}: ${cropName}` : t("workspaceNoCropSelected")}</p><p>{t("expertSafetyNote")}</p></aside><AIChatBox className="krishi-chat-box" height="min(580px, 66vh)" messages={messages} onSendMessage={send} isLoading={ask.isPending} placeholder={t("expertChatPlaceholder")} emptyStateMessage={t("expertChatEmpty")} suggestedPrompts={[t("expertPromptOne"), t("expertPromptTwo"), t("expertPromptThree")]} /></div></section>;
}
