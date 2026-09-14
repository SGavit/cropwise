/* CropWise — Monsoon Field Notes: editorial utility, warm paper surfaces, indigo structure, field-note metadata. */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { downloadScanReport } from "@/lib/scanReport";
import { parseMarketValues, type MarketValues } from "@/lib/marketValues";
import { formatFarmLocation, parseManualFarmLocation, type FarmLocation } from "@/lib/farmLocation";
import { toggleCropSelection } from "@/lib/cropSelection";
import { equalCropAllocation, normalizeCropAllocation, validateCropAllocation } from "@/lib/cropPlan";
import { appLanguages, languageLabels, personalizeDashboardCopy, type AppLanguage } from "@/lib/dashboardLanguage";
import { getProfileCompletion } from "@/lib/profileCompletion";
import type { InterfacePhrase } from "@/lib/interfaceTranslations";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeatherConditionVisual, WeatherFiveDayForecast, WeatherLoadingSkeleton, WeatherLocationSearch } from "@/components/WeatherExperienceStates";
import { CropPlanWorkspace, CropWealthWatchWorkspace, KrishiExpertWorkspace } from "@/components/WorkspaceViews";
import "./quick-scan.css";
import "./weather-enhancements.css";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CloudRain,
  Droplets,
  Download,
  ExternalLink,
  LogOut,
  Leaf,
  Languages,
  Lightbulb,
  Loader2,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Save,
  Settings2,
  ScanSearch,
  Search,
  Share2,
  Sprout,
  TrendingUp,
  TrendingDown,
  Upload,
  UserRound,
  Users,
  Wheat,
  X,
} from "lucide-react";

const heroImage = "/assets/cropwise-hero.svg";
const soilImage = "/assets/cropwise-soil.svg";
const weatherImage = "/assets/cropwise-weather.svg";
const diseaseImage = "/assets/cropwise-disease.svg";
const logoImage = "/assets/cropwise-logo.svg";
const maximumFileSize = 5 * 1024 * 1024;
const maximumQuickScanBytes = 88 * 1024;

type AnonymousQuickScanResult = {
  cropName: string;
  localName: string;
  scientificName: string;
  identificationConfidence: "high" | "moderate" | "low";
  healthStatus: "healthy" | "attention" | "uncertain";
  overview: string;
  visibleObservations: string[];
  likelyIssue: string;
  cropStage: string;
  nextSteps: string[];
  needsExpertReview: boolean;
  recheckPrompt: string;
  scanMode: "anonymous";
  language: AppLanguage;
  privacyNotice: string;
  disclaimer: string;
};

type LocationStatus = "idle" | "prompt" | "requesting" | "active" | "denied" | "unavailable" | "manual";
type FarmProfileDraft = FarmLocation & { cropPreferences: CropName[]; language: AppLanguage };

function readDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("CropWise could not read that image."));
    reader.readAsDataURL(file);
  });
}

async function optimiseForQuickScan(file: File) {
  if (file.size <= maximumQuickScanBytes) {
    return { blob: file, dataUrl: await readDataUrl(file), fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", optimised: false };
  }

  const source = await createImageBitmap(file);
  const largestEdge = 1024;
  const scale = Math.min(1, largestEdge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CropWise could not prepare that image.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();

  let result: Blob | null = null;
  for (const quality of [0.72, 0.6, 0.48, 0.38]) {
    result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (result && result.size <= maximumQuickScanBytes) break;
  }
  if (!result || result.size > maximumQuickScanBytes) {
    throw new Error("Please choose a clearer, smaller crop photo so CropWise can analyse it reliably.");
  }

  return {
    blob: result,
    dataUrl: await readDataUrl(result),
    fileName: file.name.replace(/\.[^.]+$/, "") + "-scan.jpg",
    mimeType: "image/jpeg" as const,
    optimised: true,
  };
}

const crops = [
  { name: "Maize", localKey: "maizeLocal", score: 92, yield: "45 q/ac", profit: "₹28,000", color: "green", tag: "maizeTag", icon: "🌾" },
  { name: "Groundnut", localKey: "groundnutLocal", score: 85, yield: "18 q/ac", profit: "₹32,000", color: "green", tag: "groundnutTag", icon: "🥜" },
  { name: "Soybean", localKey: "soybeanLocal", score: 78, yield: "12 q/ac", profit: "₹24,500", color: "yellow", tag: "soybeanTag", icon: "🌱" },
  { name: "Wheat", localKey: "wheatLocal", score: 88, yield: "20 q/ac", profit: "₹26,500", color: "green", tag: "wheatTag", icon: "🌾" },
  { name: "Cotton", localKey: "cottonLocal", score: 81, yield: "10 q/ac", profit: "₹35,000", color: "yellow", tag: "cottonTag", icon: "☁️" },
  { name: "Chickpea", localKey: "chickpeaLocal", score: 84, yield: "9 q/ac", profit: "₹29,000", color: "green", tag: "chickpeaTag", icon: "🫘" },
  { name: "Rice", localKey: "riceLocal", score: 76, yield: "24 q/ac", profit: "₹31,000", color: "yellow", tag: "riceTag", icon: "🍚" },
] as const;

type CropName = (typeof crops)[number]["name"];
type CropMarketValues = Record<CropName, MarketValues>;

const initialCropMarketValues: CropMarketValues = {
  Maize: { price: 2150, trend: 180 },
  Groundnut: { price: 3200, trend: 120 },
  Soybean: { price: 4100, trend: 90 },
  Wheat: { price: 2350, trend: 110 },
  Cotton: { price: 6800, trend: -75 },
  Chickpea: { price: 5600, trend: 145 },
  Rice: { price: 2250, trend: 60 },
};

const initialFarmLocation: FarmLocation = { village: "Bhatodi", district: "Beed", state: "Maharashtra" };
const suggestedFarmLocations: FarmLocation[] = [
  initialFarmLocation,
  { village: "Ashti town", district: "Beed", state: "Maharashtra" },
  { village: "Ahmednagar", district: "Ahmednagar", state: "Maharashtra" },
];

const navItems = [
  { id: "overview", label: "navOverview", icon: BookOpen },
  { id: "crop-plan", label: "navCropPlan", icon: Sprout },
  { id: "market", label: "navMarket", icon: TrendingUp },
  { id: "expert", label: "navExpert", icon: MessageCircle },
] as const;

const cropTranslationKeys = {
  Maize: "maize",
  Groundnut: "groundnut",
  Soybean: "soybean",
  Wheat: "wheat",
  Cotton: "cotton",
  Chickpea: "chickpea",
  Rice: "rice",
} as const;

const weatherPhraseByCode: Record<number, InterfacePhrase> = {
  0: "weatherClearSky", 1: "weatherMostlyClear", 2: "weatherPartlyCloudy", 3: "weatherOvercast", 45: "weatherFog", 48: "weatherFog",
  51: "weatherDrizzle", 53: "weatherDrizzle", 55: "weatherDrizzle", 56: "weatherFreezingDrizzle", 57: "weatherFreezingDrizzle",
  61: "weatherRain", 63: "weatherRain", 65: "weatherRain", 66: "weatherFreezingRain", 67: "weatherFreezingRain",
  71: "weatherSnow", 73: "weatherSnow", 75: "weatherSnow", 77: "weatherSnow", 80: "weatherShowers", 81: "weatherShowers", 82: "weatherShowers",
  85: "weatherSnowShowers", 86: "weatherSnowShowers", 95: "weatherThunderstorm", 96: "weatherThunderstormHail", 99: "weatherThunderstormHail",
};

function SectionLabel({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="section-label">
      <span>{children}</span>
      {note && <small>{note}</small>}
    </div>
  );
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropName>("Maize");
  const [selectedPlanCrops, setSelectedPlanCrops] = useState<CropName[]>(["Maize", "Groundnut", "Soybean"]);
  const [totalFarmAcres, setTotalFarmAcres] = useState(4.5);
  const [cropAreaPercentages, setCropAreaPercentages] = useState<Record<string, number>>(() => equalCropAllocation(["Maize", "Groundnut", "Soybean"]));
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoType, setPhotoType] = useState<"image/jpeg" | "image/png" | "image/webp" | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [isQuickScanning, setIsQuickScanning] = useState(false);
  const [quickScanResult, setQuickScanResult] = useState<AnonymousQuickScanResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [actionPanel, setActionPanel] = useState<string | null>(null);
  const [farmLocation, setFarmLocation] = useState<FarmLocation>(initialFarmLocation);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [manualLocationOpen, setManualLocationOpen] = useState(false);
  const [manualLocationDraft, setManualLocationDraft] = useState<FarmLocation>(initialFarmLocation);
  const [manualLocationError, setManualLocationError] = useState<string | null>(null);
  const [forecastLocationQuery, setForecastLocationQuery] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [marketEditorOpen, setMarketEditorOpen] = useState(false);
  const [cropMarketValues, setCropMarketValues] = useState<CropMarketValues>(() => initialCropMarketValues);
  const [marketEditCrop, setMarketEditCrop] = useState<CropName>("Maize");
  const [marketPriceDraft, setMarketPriceDraft] = useState("2150");
  const [marketTrendDraft, setMarketTrendDraft] = useState("180");
  const [marketEditError, setMarketEditError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<FarmProfileDraft>({ ...initialFarmLocation, cropPreferences: ["Maize", "Groundnut", "Soybean"], language: "en" });
  const [profileError, setProfileError] = useState<string | null>(null);
  const hydratedProfile = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, user, logout, loading: authLoading } = useAuth();
  const { language, setLanguage, copy, t } = useLanguage();
  const localizedCropName = (crop: CropName) => t(cropTranslationKeys[crop]);
  const localizedCropLocalName = (crop: (typeof crops)[number]) => t(crop.localKey);
  const analysisMutation = trpc.cropAnalysis.analyze.useMutation({
    onError: () => setPhotoError(t("analysisFailed")),
  });
  const shareMutation = trpc.cropShare.create.useMutation({
    onError: () => toast.error(t("shareFailed")),
  });
  const profileQuery = trpc.farmProfile.get.useQuery(undefined, { enabled: isAuthenticated });
  const historyQuery = trpc.cropHistory.list.useQuery(undefined, { enabled: isAuthenticated });
  const hasDistrictLocation = Boolean(farmLocation.district && farmLocation.state);
  const weatherQuery = trpc.farmData.weather.useQuery(farmLocation, { enabled: hasDistrictLocation, retry: false });
  const forecastLocationSearch = trpc.farmData.searchWeatherLocations.useQuery(
    { query: forecastLocationQuery.trim() },
    { enabled: actionPanel === "Location selector" && forecastLocationQuery.trim().length >= 2, retry: false },
  );
  const mandiQuery = trpc.farmData.mandi.useQuery({ ...farmLocation, cropName: selectedCrop }, { enabled: hasDistrictLocation, retry: false });
  const profileSaveMutation = trpc.farmProfile.save.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
      toast.success(t("profileSaved"), { description: t("profileSavedDescription") });
    },
    onError: () => setProfileError(t("profileSaveError")),
  });
  const isScanning = analysisMutation.isPending || isQuickScanning;
  const activeMarketValues = cropMarketValues[selectedCrop];
  const activeMarketTrendPercent = Math.abs((activeMarketValues.trend / activeMarketValues.price) * 100).toFixed(1);
  const activeMarketTrendIsPositive = activeMarketValues.trend >= 0;
  const marketEditCropDetails = crops.find((crop) => crop.name === marketEditCrop) ?? crops[0];
  const liveMandi = mandiQuery.data;
  const liveMarketValue = liveMandi?.status === "available" ? liveMandi.modalPrice : activeMarketValues.price;
  const marketIsLive = liveMandi?.status === "available";
  const liveWeather = weatherQuery.data?.status === "available" ? weatherQuery.data : null;
  const weatherIsUnavailable = weatherQuery.data?.status === "unavailable";
  const weatherIsFetching = weatherQuery.isFetching;
  const liveWeatherCondition = liveWeather ? t(weatherPhraseByCode[liveWeather.conditionCode] ?? "weatherUpdating") : "";
  const locale = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
  const currentHeroDate = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const workspaceCropOptions = crops.map((crop) => ({ id: crop.name, name: localizedCropName(crop.name), localName: localizedCropLocalName(crop), icon: crop.icon, score: crop.score, yield: crop.yield, profit: crop.profit }));
  const workspaceWeather = liveWeather ? { temperature: liveWeather.temperature, rainChance: liveWeather.forecast[0]?.rainChance ?? 0, condition: liveWeatherCondition } : null;
  const workspaceTitle = t(navItems.find((item) => item.id === activeNav)?.label ?? "navOverview");

  useEffect(() => {
    if (!isScanning) {
      setAnalysisProgress(0);
      return;
    }
    const stages = [
      [16, t("preparingImage")],
      [38, t("findingCropFeatures")],
      [66, t("readingVisibleSigns")],
      [88, t("writingFieldNote")],
    ] as const;
    let stage = 0;
    setAnalysisProgress(stages[stage][0]);
    setAnalysisStep(stages[stage][1]);
    const interval = window.setInterval(() => {
      stage = Math.min(stage + 1, stages.length - 1);
      setAnalysisProgress(stages[stage][0]);
      setAnalysisStep(stages[stage][1]);
    }, 1100);
    return () => window.clearInterval(interval);
  }, [isScanning]);

  useEffect(() => {
    if (isAuthenticated && locationStatus === "idle") {
      setLocationStatus("prompt");
      setActionPanel("Location selector");
    }
  }, [isAuthenticated, locationStatus]);

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile || hydratedProfile.current) return;
    const preferences = (() => {
      try { return JSON.parse(profile.cropPreferences) as CropName[]; }
      catch { return ["Maize", "Groundnut", "Soybean"] as CropName[]; }
    })();
    const nextLanguage = profile.language as AppLanguage;
    const location = { village: profile.village, district: profile.district, state: profile.state };
    const allocation = normalizeCropAllocation(preferences.length ? preferences : ["Maize"], profile.cropAreaAllocations, 4.5);
    setFarmLocation(location);
    setTotalFarmAcres(allocation.totalAcres);
    setCropAreaPercentages(allocation.percentages);
    setManualLocationDraft(location);
    setSelectedPlanCrops(preferences.length ? preferences : ["Maize"]);
    setSelectedCrop(preferences[0] ?? "Maize");
    setProfileDraft({ ...location, cropPreferences: preferences.length ? preferences : ["Maize"], language: nextLanguage });
    setLanguage(nextLanguage);
    setLocationStatus("manual");
    hydratedProfile.current = true;
  }, [profileQuery.data]);

  const actionDetails: Record<string, { title: string; description: string; action?: string }> = {
    "Help centre": { title: t("helpTitle"), description: t("helpDescription"), action: t("openCropHealth") },
    "Location selector": { title: t("locationTitle"), description: t("locationDescription") },
    Search: { title: t("searchTitle"), description: t("searchDescription") },
    Notifications: { title: t("notificationsTitle"), description: t("notificationsDescription") },
    "Daily brief": { title: t("dailyBriefTitle"), description: t("dailyBriefDescription") },
    "Crop calendar": { title: t("cropCalendarTitle"), description: t("cropCalendarDescription") },
    "Recommendation filters": { title: t("recommendationTitle"), description: t("recommendationDescription") },
    "Crop recommendation flow": { title: t("recommendationTitle"), description: t("recommendationDescription") },
    "Soil report": { title: t("soilReportTitle"), description: t("soilReportDescription") },
    "Krishi expert chat": { title: t("expertTitle"), description: t("expertDescription") },
  };

  const handleDashboardAction = (label: string) => setActionPanel(label);

  const accountName = user?.name || "Ravi Sharma";
  const personalizedHeroDescription = personalizeDashboardCopy(copy.heroDescription, accountName);
  const personalizedGoodMorning = personalizeDashboardCopy(copy.goodMorning, accountName);
  const profileCompletion = getProfileCompletion({ name: user?.name, email: user?.email, avatarUrl: user?.avatarUrl, farmProfile: profileQuery.data });
  const accountInitials = accountName.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "RS";

  const switchAccount = async () => {
    try {
      if (isAuthenticated) await logout();
      startLogin();
    } catch {
      toast.error(t("unexpectedError"));
    }
  };

  const completeSignOut = async () => {
    try {
      await logout();
      setConfirmSignOut(false);
      setAccountMenuOpen(false);
      toast.success(t("signedOut"));
    } catch {
      toast.error(t("unexpectedError"));
    }
  };

  const requestCurrentLocation = () => {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      toast.error(t("locationUnavailableDevice"), { description: t("chooseVillageManually") });
      return;
    }

    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      () => {
        setFarmLocation({ village: t("currentGpsLocation"), district: "", state: "" });
        setLocationStatus("active");
        setManualLocationOpen(false);
        setActionPanel(null);
        toast.success(t("currentLocationActiveToast"), { description: t("currentLocationToastDescription") });
      },
      (error) => {
        setLocationStatus(error.code === 1 ? "denied" : "unavailable");
        toast.error(copy.locationUnavailable, { description: t("locationPermissionMessage") });
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  };

  const selectSuggestedFarmLocation = (location: FarmLocation) => {
    setFarmLocation(location);
    setManualLocationDraft(location);
    setProfileDraft((profile) => ({ ...profile, ...location }));
    setManualLocationError(null);
    setForecastLocationQuery("");
    setManualLocationOpen(false);
    setLocationStatus("manual");
    setActionPanel(null);
    if (isAuthenticated) {
      profileSaveMutation.mutate({ ...location, cropPreferences: profileDraft.cropPreferences, cropAreaAllocations: JSON.stringify({ totalAcres: totalFarmAcres, allocations: cropAreaPercentages }), language: profileDraft.language });
    }
    toast.success(`${t("locationSet")} ${formatFarmLocation(location)}`);
  };

  const selectForecastLocation = (location: FarmLocation) => {
    selectSuggestedFarmLocation(location);
    toast.success(`${t("weatherLocationSet")} ${formatFarmLocation(location)}`);
  };

  const openManualLocationForm = () => {
    setManualLocationDraft(farmLocation.district || farmLocation.state ? farmLocation : initialFarmLocation);
    setManualLocationError(null);
    setManualLocationOpen(true);
  };

  const saveManualFarmLocation = async () => {
    try {
      const location = parseManualFarmLocation(manualLocationDraft);
      const nextProfile = { ...location, cropPreferences: profileDraft.cropPreferences, language: profileDraft.language };
      if (isAuthenticated) await profileSaveMutation.mutateAsync({ ...nextProfile, cropAreaAllocations: JSON.stringify({ totalAcres: totalFarmAcres, allocations: cropAreaPercentages }) });
      setFarmLocation(location);
      setManualLocationDraft(location);
      setProfileDraft((profile) => ({ ...profile, ...location }));
      setManualLocationError(null);
      setManualLocationOpen(false);
      setLocationStatus("manual");
      setActionPanel(null);
      toast.success(`${t("locationSet")} ${formatFarmLocation(location)}`, { description: t("farmContextUpdated") });
    } catch (error) {
      setManualLocationError(isAuthenticated ? t("profileSaveError") : copy.manualLocationDescription);
    }
  };

  const saveFarmProfile = () => {
    if (!isAuthenticated) { startLogin(); return; }
    try {
      const location = parseManualFarmLocation(profileDraft);
      if (profileDraft.cropPreferences.length === 0) throw new Error(t("chooseCropPreference"));
      setProfileError(null);
      setFarmLocation(location);
      setManualLocationDraft(location);
      setLanguage(profileDraft.language);
      setLocationStatus("manual");
      profileSaveMutation.mutate({ ...location, cropPreferences: profileDraft.cropPreferences, cropAreaAllocations: JSON.stringify({ totalAcres: totalFarmAcres, allocations: cropAreaPercentages }), language: profileDraft.language });
    } catch (error) {
      setProfileError(t("profileSaveError"));
    }
  };

  const toggleProfileCrop = (crop: CropName) => {
    setProfileDraft((profile) => ({
      ...profile,
      cropPreferences: profile.cropPreferences.includes(crop)
        ? profile.cropPreferences.filter((item) => item !== crop)
        : [...profile.cropPreferences, crop],
    }));
  };

  const togglePlanCrop = (crop: CropName) => {
    const result = toggleCropSelection(selectedPlanCrops, crop);
    if (result.reason === "keep-one") {
      toast.error(t("workspaceKeepOneCrop"));
      return;
    }
    if (result.reason === "limit") {
      toast.error(t("workspaceCropSelectionLimit"));
      return;
    }
    setSelectedPlanCrops(result.next as CropName[]);
    setCropAreaPercentages((current) => {
      const nextAllocations = Object.fromEntries(result.next.map((cropId) => [cropId, current[cropId] ?? 0]));
      const total = result.next.reduce((sum, cropId) => sum + (nextAllocations[cropId] ?? 0), 0);
      return result.next.every((cropId) => (nextAllocations[cropId] ?? 0) > 0) && Math.abs(total - 100) <= 0.05 ? nextAllocations : equalCropAllocation(result.next);
    });
    if (!result.next.includes(selectedCrop)) setSelectedCrop(result.next[0] as CropName);
    else if (!selectedPlanCrops.includes(crop)) setSelectedCrop(crop);
  };

  const updateAreaTotal = (value: number) => setTotalFarmAcres(Number.isFinite(value) ? value : 0);

  const updateCropArea = (cropId: string, percent: number) => {
    setCropAreaPercentages((current) => ({ ...current, [cropId]: Math.max(0, Math.round(percent * 100) / 100) }));
  };

  const applySeasonSuggestion = (cropIds: string[]) => {
    const next = cropIds.filter((cropId): cropId is CropName => crops.some((crop) => crop.name === cropId));
    if (!next.length) return;
    setSelectedPlanCrops(next);
    setSelectedCrop(next[0]);
    setCropAreaPercentages(equalCropAllocation(next));
  };

  const savePlanCropSelection = () => {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    const validation = validateCropAllocation(selectedPlanCrops, cropAreaPercentages, totalFarmAcres);
    if (!validation.valid) {
      toast.error(t(validation.reason === "farm-area" ? "allocationFarmAreaError" : validation.reason === "crop-area" ? "allocationCropError" : "allocationTotalError"));
      return;
    }
    setProfileDraft((profile) => ({ ...profile, cropPreferences: selectedPlanCrops }));
    profileSaveMutation.mutate({ ...farmLocation, cropPreferences: selectedPlanCrops, cropAreaAllocations: JSON.stringify({ totalAcres: totalFarmAcres, allocations: cropAreaPercentages }), language });
    toast.success(t("allocationSaved"));
  };

  const refreshLiveData = () => {
    if (!hasDistrictLocation) {
      toast.error(t("addDistrictFirst"), { description: t("liveDistrictNeedsLocation") });
      return;
    }
    Promise.allSettled([weatherQuery.refetch(), mandiQuery.refetch()]).then(([weatherResult]) => {
      if (weatherResult.status === "fulfilled" && weatherResult.value.data?.status === "available") toast.success(t("liveDataRefreshed"));
      else toast.error(t("weatherUnavailable"), { description: t("weatherUnavailable") });
    });
  };

  const saveMarketValues = () => {
    try {
      const { price, trend } = parseMarketValues(marketPriceDraft, marketTrendDraft);
      setCropMarketValues((values) => ({ ...values, [marketEditCrop]: { price, trend } }));
      setMarketEditError(null);
      setMarketEditorOpen(false);
      toast.success(`${localizedCropName(marketEditCrop)} ${t("marketValuesUpdated")}`, { description: t("marketValuesDescription") });
    } catch (error) {
      setMarketEditError(t("enterMarketValues"));
      return;
    }
  };

  const openMarketEditor = () => {
    const values = cropMarketValues[selectedCrop];
    setMarketEditCrop(selectedCrop);
    setMarketPriceDraft(String(values.price));
    setMarketTrendDraft(String(values.trend));
    setMarketEditError(null);
    setMarketEditorOpen(true);
  };

  const selectMarketEditCrop = (crop: CropName) => {
    const values = cropMarketValues[crop];
    setMarketEditCrop(crop);
    setMarketPriceDraft(String(values.price));
    setMarketTrendDraft(String(values.trend));
    setMarketEditError(null);
  };

  const navigateWorkspace = (label: string) => {
    setActiveNav(label);
    setSidebarOpen(false);
    window.requestAnimationFrame(() => document.getElementById("workspace-content")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const selectPhoto = async (file?: File) => {
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp"] as const;
    if (!validTypes.includes(file.type as (typeof validTypes)[number])) {
      setPhotoError(t("imageTypeError"));
      return;
    }
    if (file.size > maximumFileSize) {
      setPhotoError(t("imageSizeError"));
      return;
    }

    setIsPreparingPhoto(true);
    try {
      const prepared = await optimiseForQuickScan(file);
      setPhotoBlob(prepared.blob);
      setPhotoDataUrl(prepared.dataUrl);
      setPhotoName(prepared.fileName);
      setPhotoType(prepared.mimeType);
      setPhotoError(null);
      setShareUrl(null);
      analysisMutation.reset();
      setQuickScanResult(null);
      if (prepared.optimised) {
        toast.success(t("photoPrepared"), { description: t("photoPreparedDescription") });
      }
    } catch (error) {
      setPhotoError(t("unexpectedError"));
    } finally {
      setIsPreparingPhoto(false);
    }
  };

  const analysePhoto = async () => {
    if (!photoDataUrl || !photoBlob || !photoType) {
      setPhotoError(t("addPhotoFirst"));
      return;
    }
    setPhotoError(null);
    const request = { dataUrl: photoDataUrl, fileName: photoName || "crop-photo", mimeType: photoType, language };
    if (isAuthenticated) {
      analysisMutation.mutate(request);
    } else {
      setQuickScanResult(null);
      setIsQuickScanning(true);
      try {
        const response = await fetch("/api/quick-scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-CropWise-Image-Type": photoType,
            "X-CropWise-Language": language,
          },
          body: photoBlob,
        });
        const payload = await response.json().catch(() => null) as AnonymousQuickScanResult | { error?: string } | null;
        if (!response.ok || !payload || !("cropName" in payload)) {
          throw new Error(t("scanFailed"));
        }
        setQuickScanResult(payload);
        toast.success(t("quickScanReady"), { description: t("quickScanReadyDescription") });
      } catch (error) {
        setPhotoError(t("scanFailed"));
      } finally {
        setIsQuickScanning(false);
      }
    }
  };

  const clearPhoto = () => {
    setPhotoDataUrl(null);
    setPhotoBlob(null);
    setPhotoName("");
    setPhotoType(null);
    setPhotoError(null);
    analysisMutation.reset();
    setQuickScanResult(null);
    setShareUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analysis = analysisMutation.data ?? quickScanResult;
  const analysisTone = analysis?.healthStatus === "healthy" ? "good" : analysis?.healthStatus === "attention" ? "attention" : "uncertain";

  const ensureShareUrl = async () => {
    if (!analysis) return null;
    if (shareUrl) return shareUrl;
    const shared = await shareMutation.mutateAsync(analysis);
    const url = `${window.location.origin}/scan/${shared.slug}`;
    setShareUrl(url);
    toast.success(t("shareLinkCreated"), { description: t("shareLinkCreatedDescription") });
    return url;
  };

  const shareResult = async () => {
    const url = await ensureShareUrl();
    if (!url || !analysis) return;
    const message = `${analysis.cropName} ${t("sharedScanPrefix")}: ${analysis.overview}`;
    try {
      if (navigator.share) await navigator.share({ title: `${analysis.cropName} · ${t("sharedScanTitle")}`, text: message, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("shareLinkCopied"), { description: t("shareLinkCopiedDescription") });
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") toast.error(t("shareCancelled"));
    }
  };

  const copyShareLink = async () => {
    const url = await ensureShareUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success(t("shareLinkCopied"), { description: t("shareLinkNoPhoto") });
  };

  const shareToWhatsApp = async () => {
    const url = await ensureShareUrl();
    if (!url || !analysis) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${analysis.cropName} ${t("sharedScanPrefix")}: ${url}`)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <img src={logoImage} alt="" className="brand-mark" />
          <div><strong>CropWise</strong><span>{t("fieldCompanion")}</span></div>
          <button className="icon-button sidebar-close" aria-label={copy.closePanel} onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <div className="profile-card-wrap"><button type="button" className="profile-card" onClick={() => setAccountMenuOpen((open) => !open)}><div className="avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : accountInitials}</div><div><strong>{accountName}</strong><span>{`${formatFarmLocation(farmLocation)} · ${t("farmSize")}`}</span></div><MoreHorizontal size={18} className="muted-icon" /></button><button type="button" className="profile-location-button" onClick={() => handleDashboardAction("Location selector")}><MapPin size={14} /> {copy.changeLocation}</button></div>
        {isAuthenticated && <div className="sidebar-profile-completion"><div className="sidebar-completion-heading"><span>{t("profileCompletionTitle")}</span><strong>{profileCompletion.percent}%</strong></div><div className="sidebar-completion-track" role="progressbar" aria-valuenow={profileCompletion.percent} aria-valuemin={0} aria-valuemax={100} aria-label={t("profileCompletionTitle")}><span style={{ width: `${profileCompletion.percent}%` }} /></div><p>{profileCompletion.percent === 100 ? t("profileCompletionAllSet") : t("profileCompletionDescription")}</p>{profileCompletion.percent < 100 && <button type="button" onClick={() => { setAccountMenuOpen(false); window.location.href = "/account"; }}>{t("openProfileSettings")}</button>}</div>}
        <nav className="side-nav" aria-label={copy.workspace}>
          <span className="nav-kicker">{copy.workspace}</span>
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => navigateWorkspace(id)}><Icon size={18} strokeWidth={1.8} /><span>{t(label)}</span>{id === "expert" && <i>2</i>}</button>)}
        </nav>
        <div className="sidebar-note"><span className="note-pin"><Lightbulb size={15} /></span><p><b>{t("fieldNote")}</b> {t("fieldNoteDescription")}</p></div>
        <button className="help-link" onClick={() => handleDashboardAction("Help centre")}><span>?</span> {t("helpCentre")} <ArrowUpRight size={14} /></button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label={copy.openMenu} onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
          <div className="topbar-orientation"><div className="topbar-brand"><img src={logoImage} alt="" /><strong>CropWise</strong></div><div className="crumb"><span>{copy.myFarm}</span><ChevronRight size={14} /><b>{workspaceTitle}</b></div></div>
          <div className="top-actions"><button className="location-pill" aria-label={`${copy.changeLocation}: ${farmLocation.village}`} onClick={() => handleDashboardAction("Location selector")}><MapPin size={15} /> <span className="location-pill-label">{farmLocation.village}</span> {locationStatus === "active" && <span className="location-live-dot" aria-label={copy.currentLocationActive} />} <ChevronRight size={14} /></button><label className="language-switcher"><Languages size={15} /><span className="visually-hidden">{copy.language}</span><select value={language} onChange={(event) => setLanguage(event.target.value as AppLanguage)} aria-label={copy.chooseLanguage}>{appLanguages.map((item) => <option key={item} value={item}>{languageLabels[item]}</option>)}</select></label><button className="icon-button" aria-label={t("search")} onClick={() => handleDashboardAction("Search")}><Search size={18} /></button><button className="icon-button notification" aria-label={t("notifications")} onClick={() => handleDashboardAction("Notifications")}><Bell size={18} /><i /></button><div className="account-control"><button type="button" className="top-avatar" aria-label={copy.openMenu} aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen((open) => !open)}>{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : accountInitials}</button>{accountMenuOpen && <div className="account-menu" role="menu"><div className="account-menu-head"><span className="account-avatar"><UserRound size={16} /></span><div><strong>{accountName}</strong><small>{isAuthenticated ? user?.email || copy.signIn : t("quickPhotoNotice")}</small></div></div><button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setActionPanel("Farm profile"); }}><UserRound size={15} /> {copy.farmProfile}</button>{isAuthenticated && <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); window.location.href = "/account"; }}><Settings2 size={15} /> Manage account</button>}<button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setActionPanel("Scan history"); }}><BookOpen size={15} /> {copy.scanHistory}</button><button type="button" role="menuitem" onClick={switchAccount} disabled={authLoading}><RefreshCw size={15} /> {isAuthenticated ? copy.switchAccount : copy.signInOrSwitch}</button>{isAuthenticated && <button type="button" role="menuitem" className="menu-danger" onClick={() => { setAccountMenuOpen(false); setConfirmSignOut(true); }} disabled={authLoading}><LogOut size={15} /> {copy.signOut}</button>}</div>}</div></div>
        </header>

        <div className="content-wrap">
          <div id="workspace-content" tabIndex={-1}>
          {activeNav === "overview" && <>
          <section className="hero-card">
            <img src={heroImage} alt={copy.heroTitle} /><div className="hero-overlay" />
            <div className="hero-copy"><div className="eyebrow light"><span className="eyebrow-dot" /> {currentHeroDate}</div><h1>{copy.heroTitle}<br /><em>{copy.heroAccent}</em></h1><p>{personalizedHeroDescription}</p><button className="primary-button" onClick={() => navigateWorkspace("crop-plan")}>{copy.seeSoilFit} <ArrowUpRight size={17} /></button></div>
            <div className="hero-stamp"><span>{copy.currentSeason}</span><strong>{t("kharif")}</strong><small>{t("monsoonWatch")}</small></div>
          </section>

          <div id="top" className="section-heading-row intro-row"><div><SectionLabel note={copy.dailyBrief}>{personalizedGoodMorning}</SectionLabel><h2>{copy.greeting}</h2></div><button className="text-button" onClick={refreshLiveData}><RefreshCw size={15} /> {copy.refresh}</button></div>
          <section className="signal-grid">
            <article className="signal-card weather-card"><div className="card-top"><SectionLabel note={liveWeather ? `${liveWeather.locationLabel} · ${copy.live}` : copy.district}>{copy.weather}</SectionLabel>{liveWeather ? <WeatherConditionVisual conditionCode={liveWeather.conditionCode} label={liveWeatherCondition} compact /> : <CloudRain size={19} className="sun-icon" />}</div>{weatherIsFetching ? <WeatherLoadingSkeleton label={t("weatherLoadingCard")} /> : liveWeather ? <><div className="weather-main"><strong>{liveWeather.temperature}°</strong><div><b>{liveWeatherCondition}</b><span>{copy.feelsLike} {liveWeather.apparentTemperature}°</span></div></div><div className="weather-meta"><span><CloudRain size={15} /> {liveWeather.forecast[0]?.rainChance ?? 0}% {copy.rain}</span><span><Droplets size={15} /> {liveWeather.humidity}% {copy.humidity}</span></div></> : weatherIsUnavailable ? <div className="live-card-empty"><p>{t("weatherUnavailable")}</p></div> : <div className="live-card-empty"><p>{copy.weatherEmpty}</p></div>}<button className="card-link" onClick={refreshLiveData} disabled={weatherIsFetching}>{weatherIsFetching ? <><Loader2 className="spin" size={15} /> {t("weatherLoadingCard")}</> : <>{copy.refreshWeather} <ChevronRight size={15} /></>}</button></article>
            <article id="market-pulse" className="signal-card market-card"><div className="card-top"><SectionLabel note={marketIsLive ? `${farmLocation.district} mandi · ${copy.live}` : copy.marketFallback}>{copy.market}</SectionLabel><TrendingUp size={18} className="green-icon" /></div><div className="market-main"><div><strong>₹{liveMarketValue.toLocaleString("en-IN")}</strong><span>{localizedCropName(selectedCrop)} / {copy.perQuintal}</span></div><div className={`trend-badge ${activeMarketTrendIsPositive ? "" : "falling"}`}>{activeMarketTrendIsPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {activeMarketTrendIsPositive ? "+" : "−"}{activeMarketTrendPercent}%</div></div><div className="sparkline"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="market-foot"><span>{marketIsLive ? `${copy.observed} ${liveMandi.observedOn}` : copy.trend30Days}</span><b className={activeMarketTrendIsPositive ? "" : "negative"}>{marketIsLive ? liveMandi.source : `${activeMarketTrendIsPositive ? "↑" : "↓"} ₹${Math.abs(activeMarketValues.trend).toLocaleString("en-IN")}`}</b></div><div className="market-actions"><button className="card-link" onClick={refreshLiveData}>{copy.refresh} <ChevronRight size={15} /></button><button className="market-edit-button" type="button" onClick={openMarketEditor}>{copy.changeValues}</button></div></article>
            <article className="signal-card reminder-card"><div className="card-top"><SectionLabel note={t("nextAction")}>{copy.cropCycle}</SectionLabel><CalendarDays size={18} className="terracotta-icon" /></div><div className="reminder-title"><strong>{t("prepareField")}</strong><span>{t("dueTomorrow")}</span></div><div className="progress-track"><span style={{ width: "24%" }} /></div><div className="cycle-steps"><span className="done"><Check size={12} /> {t("soilTest")}</span><span className="current"><span /> {t("fieldPrep")}</span><span>{t("seedSelection")}</span></div><button className="card-link" onClick={() => navigateWorkspace("crop-plan")}>{t("openCalendar")} <ChevronRight size={15} /></button></article>
          </section>
          {liveWeather && !weatherIsFetching && <WeatherFiveDayForecast forecast={liveWeather.forecast} locale={language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN"} title={t("weatherFiveDay")} description={t("weatherFiveDayDescription")} todayLabel={t("weatherToday")} rainChanceLabel={t("weatherRainChance")} highLowLabel={t("weatherHighLow")} conditionLabel={(code) => t(weatherPhraseByCode[code] ?? "weatherUpdating")} />}

          <section id="recommendations" className="recommendation-layout">
            <div className="recommendation-main"><div className="section-heading-row"><div><SectionLabel note={t("basedOnSoil")}>{copy.cropShortlist}</SectionLabel><h2>{t("fieldFit")}</h2></div><button className="filter-button" onClick={() => handleDashboardAction("Recommendation filters")}>{t("kharif")} <ChevronRight size={14} /></button></div><div className="crop-list">{crops.map((crop, index) => <button key={crop.name} className={`crop-card ${selectedCrop === crop.name ? "selected" : ""}`} onClick={() => setSelectedCrop(crop.name)}><div className="crop-rank">0{index + 1}</div><div className="crop-emoji">{crop.icon}</div><div className="crop-identity"><strong>{localizedCropName(crop.name)}</strong><span>{localizedCropLocalName(crop)} · {t(crop.tag)}</span></div><div className="crop-score"><span>{t("suitability")}</span><strong className={crop.color}>{crop.score}%</strong></div><div className="crop-numbers"><span><small>{t("yield")}</small><b>{crop.yield}</b></span><span><small>{t("estimatedProfit")}</small><b>{crop.profit}<em>{t("perAcre")}</em></b></span></div><ChevronRight size={18} className="crop-chevron" /></button>)}</div><button className="outline-button" onClick={() => handleDashboardAction("Crop recommendation flow")}><Sprout size={17} /> {t("buildRecommendation")} <ArrowUpRight size={16} /></button></div>
            <aside className="field-note-card"><div className="field-note-image"><img src={soilImage} alt={t("soilProfile")} /><span className="image-tag">{t("soilProfile")}</span></div><div className="field-note-copy"><div className="note-header"><SectionLabel note={t("lastChecked")}>{t("whyShortlist")}</SectionLabel><span className="pin-symbol">✦</span></div><p>{t("soilDescription")}</p><div className="soil-readings"><span><small>pH</small><b>6.3</b><i>{t("ideal")}</i></span><span><small>{t("organicCarbon")}</small><b>0.74%</b><i>{t("good")}</i></span></div><button className="card-link" onClick={() => handleDashboardAction("Soil report")}>{t("viewReport")} <ChevronRight size={15} /></button></div></aside>
          </section>

          <section id="crop-scan" className="crop-scan-grid" aria-labelledby="crop-scan-title">
            <article className="crop-scan-card scan-upload-card">
              <div className="scan-title-row"><div><SectionLabel note={t("imageScreening")}>{t("cropHealthCheck")}</SectionLabel><h2 id="crop-scan-title">{t("scanTitle")}</h2></div><span className="scan-mark"><ScanSearch size={20} /></span></div>
              <p className="scan-intro">{t("scanIntro")}</p>
              <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectPhoto(event.target.files?.[0])} />
              {!photoDataUrl ? (
                <button className="photo-dropzone" type="button" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectPhoto(event.dataTransfer.files?.[0]); }}>
                  <span className="upload-roundel"><Upload size={20} /></span><strong>{t("dropPhoto")}</strong><span>{t("choosePhonePhoto")}</span><small>{t("acceptedImageTypes")}</small>
                </button>
              ) : (
                <div className="photo-ready"><img src={photoDataUrl} alt={t("selectedCrop")} /><div><span className="photo-file-label"><Camera size={14} /> {t("readyToReview")}</span><strong>{photoName}</strong><p>{t("closePhotoHint")}</p><div className="photo-ready-actions"><button className="text-button" onClick={() => fileInputRef.current?.click()}><RefreshCw size={14} /> {t("change")}</button><button className="text-button danger-button" onClick={clearPhoto}>{t("remove")}</button></div></div></div>
              )}
              {isPreparingPhoto && <p className="photo-preparing"><Loader2 className="spin" size={15} /> {t("preparingReliable")}</p>}
              {photoError && <p className="photo-error"><AlertTriangle size={15} /> {photoError}</p>}
              <button className="primary-button scan-button" disabled={!photoDataUrl || isScanning || isPreparingPhoto} onClick={analysePhoto}>{isPreparingPhoto ? <><Loader2 className="spin" size={16} /> {t("preparingPhoto")}</> : isScanning ? <><Loader2 className="spin" size={16} /> {analysisStep}</> : <><ScanSearch size={16} /> {isAuthenticated ? t("privateCropScan") : t("quickScan")}</>}</button>
              {isScanning && <div className="scan-progress" aria-label={`${t("cropInformation")} ${analysisProgress}%`}><div className="scan-progress-label"><span>{analysisStep}</span><b>{analysisProgress}%</b></div><div className="scan-progress-track"><span style={{ width: `${analysisProgress}%` }} /></div><p>{t("photoOnly")}</p></div>}
              <p className="quick-scan-note">{isAuthenticated ? t("privatePhotoNotice") : t("quickPhotoNotice")}</p>
              <p className="scan-disclaimer">{t("scanDisclaimer")}</p>
            </article>

            <article className="crop-scan-card scan-result-card" aria-live="polite">
              {!analysis && !isScanning && <div className="scan-empty"><span className="scan-empty-icon"><Wheat size={26} /></span><SectionLabel note={t("resultAppears")}>{t("cropInformation")}</SectionLabel><h3>{t("startPhoto")}</h3><p>{t("resultExplain")}</p><div className="scan-empty-rules"><span>1. {t("onePlant")}</span><span>2. {t("naturalLight")}</span><span>3. {t("inFocus")}</span></div></div>}
              {isScanning && <div className="scan-loading"><span className="scan-empty-icon"><Loader2 className="spin" size={26} /></span><h3>{analysisStep}</h3><p>{t("scanLoadingDescription")}</p></div>}
              {analysis && <div className="scan-analysis"><div className="result-head"><div><SectionLabel note={analysis.scanMode === "anonymous" ? t("noStorageScan") : t("privateSavedScan")}>{t("likelyMatch")}</SectionLabel><h3>{analysis.cropName}</h3><p>{analysis.localName} · <em>{analysis.scientificName}</em></p></div><span className={`health-badge ${analysisTone}`}>{analysis.healthStatus === "healthy" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{analysis.healthStatus === "healthy" ? t("looksHealthy") : analysis.healthStatus === "attention" ? t("needsAttention") : t("checkAgain")}</span></div><p className="result-overview">{analysis.overview}</p>{analysis.language !== language && <p className="result-disclaimer">{t("scanNarrativeLanguageNotice")}</p>}<div className="result-meta"><span><small>{t("confidence")}</small><b>{analysis.identificationConfidence}</b></span><span><small>{t("cropStage")}</small><b>{analysis.cropStage}</b></span></div><div className="result-section"><h4>{t("visiblePhoto")}</h4><ul>{analysis.visibleObservations.map((observation) => <li key={observation}><Check size={14} /> {observation}</li>)}</ul></div><div className="result-callout"><strong>{t("likelyCondition")}</strong><p>{analysis.likelyIssue}</p></div><div className="result-section"><h4>{t("nextSteps")}</h4><ol>{analysis.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol></div>{analysis.needsExpertReview && <p className="expert-review"><AlertTriangle size={15} /> {t("expertReview")}</p>}<div className="result-actions"><button type="button" className="result-action primary" onClick={shareResult} disabled={shareMutation.isPending}><Share2 size={15} /> {shareMutation.isPending ? t("creatingLink") : t("shareResult")}</button><button type="button" className="result-action" onClick={() => { downloadScanReport(analysis); toast.success(t("pdfDownloaded")); }}><Download size={15} /> {t("downloadPdf")}</button><button type="button" className="result-action icon-only" aria-label={t("copyScanLink")} onClick={copyShareLink}><Copy size={15} /></button></div>{shareUrl && <div className="share-link-box"><div><small>{t("shareLinkNoPhoto")}</small><strong>{shareUrl.replace(window.location.origin, "cropwise.app")}</strong></div><div><button type="button" onClick={copyShareLink}><Copy size={14} /> {t("copy")}</button><button type="button" onClick={shareToWhatsApp}>{t("whatsapp")} <ExternalLink size={13} /></button></div></div>}<p className="scan-privacy-result"><CheckCircle2 size={15} /> {analysis.privacyNotice}</p><p className="result-disclaimer">{analysis.disclaimer}</p></div>}
            </article>
          </section>

          <section className="lower-grid"><article className="insight-card disease-insight"><img src={diseaseImage} alt={t("cropHealthWatch")} /><div className="insight-copy"><SectionLabel note={t("keepEye")}>{t("cropHealthWatch")}</SectionLabel><h3>{t("noticeChange")}</h3><p>{t("leafAdvice")}</p><button className="text-button" onClick={() => document.getElementById("crop-scan")?.scrollIntoView({ behavior: "smooth" })}>{t("checkLeaf")} <ArrowUpRight size={15} /></button></div></article><article id="expert-panel" className="insight-card expert-insight"><div className="expert-icon"><MessageCircle size={21} /></div><SectionLabel note={t("askLanguage")}>{t("krishiExpert")}</SectionLabel><h3>{t("questionCrop")}</h3><p>{t("expertPrompt")}</p><button className="primary-button small" onClick={() => handleDashboardAction("Krishi expert chat")}>{t("askExpert")} <ArrowUpRight size={16} /></button><div className="language-note"><Users size={14} /> {t("expertLanguages")}</div></article></section>
          </>}
          {activeNav === "crop-plan" && <CropPlanWorkspace cropOptions={workspaceCropOptions} selectedCropId={selectedCrop} onSelectCrop={(crop) => setSelectedCrop(crop as CropName)} selectedCropIds={selectedPlanCrops} onToggleCrop={(crop) => togglePlanCrop(crop as CropName)} onApplySeasonSuggestion={applySeasonSuggestion} totalFarmAcres={totalFarmAcres} cropAreaPercentages={cropAreaPercentages} onAreaTotalChange={updateAreaTotal} onAreaChange={updateCropArea} onSaveCropPlan={savePlanCropSelection} isSavingCropPlan={profileSaveMutation.isPending} locationLabel={formatFarmLocation(farmLocation)} weather={workspaceWeather} />}
          {activeNav === "market" && <CropWealthWatchWorkspace cropOptions={workspaceCropOptions} selectedCropId={selectedCrop} onSelectCrop={(crop) => setSelectedCrop(crop as CropName)} locationLabel={formatFarmLocation(farmLocation)} weather={workspaceWeather} price={liveMarketValue} trendPercent={activeMarketTrendPercent} trendIsPositive={activeMarketTrendIsPositive} marketIsLive={marketIsLive} marketSource={liveMandi?.source} onRefresh={refreshLiveData} onEditMarket={openMarketEditor} />}
          {activeNav === "expert" && <KrishiExpertWorkspace cropOptions={workspaceCropOptions} selectedCropId={selectedCrop} locationLabel={formatFarmLocation(farmLocation)} />}
          </div>
          <footer className="footer"><span>{t("footerSupport")}</span><span>{t("builtField")} <Leaf size={13} /></span></footer>
        </div>
      </main>
      <nav className="mobile-nav">{navItems.slice(0, 4).map(({ id, label, icon: Icon }) => <button key={id} className={activeNav === id ? "active" : ""} onClick={() => navigateWorkspace(id)}><Icon size={18} /><span>{t(label)}</span></button>)}</nav>
      {actionPanel && <div className="action-modal-backdrop" role="presentation" onMouseDown={() => setActionPanel(null)}>
        <section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="action-panel-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="icon-button modal-close" aria-label={copy.closePanel} onClick={() => setActionPanel(null)}><X size={17} /></button>
          <SectionLabel note={copy.workspace}>{copy.fieldTool}</SectionLabel>
          <h2 id="action-panel-title">{actionDetails[actionPanel]?.title ?? actionPanel}</h2>
          {actionDetails[actionPanel]?.description && <p>{actionDetails[actionPanel]?.description}</p>}
          {actionPanel === "Location selector" && <div className="location-picker"><div className="location-consent-note"><MapPin size={17} /><p><b>{copy.currentLocationPrompt}</b> {copy.currentLocationPrivacy}</p></div><button type="button" className="primary-button modal-action" onClick={requestCurrentLocation} disabled={locationStatus === "requesting"}>{locationStatus === "requesting" ? <><Loader2 className="spin" size={16} /> {copy.findingLocation}</> : <><MapPin size={16} /> {copy.useCurrentLocation}</>}</button>{(locationStatus === "denied" || locationStatus === "unavailable") && <p className="location-fallback-note">{copy.locationUnavailable}</p>}<WeatherLocationSearch query={forecastLocationQuery} onQueryChange={setForecastLocationQuery} isFetching={forecastLocationSearch.isFetching} providerStatus={forecastLocationSearch.data?.status} results={forecastLocationSearch.data?.results} onSelect={selectForecastLocation} t={t} /><div className="location-options">{suggestedFarmLocations.map((location) => <button key={formatFarmLocation(location)} type="button" className={formatFarmLocation(farmLocation) === formatFarmLocation(location) ? "selected" : ""} onClick={() => selectSuggestedFarmLocation(location)}><MapPin size={15} /> {location.village}<small>{location.district}, {location.state}</small></button>)}</div><button type="button" className="manual-location-trigger" onClick={openManualLocationForm}><MapPin size={15} /> {copy.addManualLocation}</button>{manualLocationOpen && <form className="manual-location-form" onSubmit={(event) => { event.preventDefault(); saveManualFarmLocation(); }}><p className="manual-location-form-note">{copy.manualLocationDescription}</p><label>{copy.village}<input value={manualLocationDraft.village} onChange={(event) => setManualLocationDraft((location) => ({ ...location, village: event.target.value }))} autoComplete="address-level3" placeholder={t("villageExample")} /></label><label>{copy.district}<input value={manualLocationDraft.district} onChange={(event) => setManualLocationDraft((location) => ({ ...location, district: event.target.value }))} autoComplete="address-level2" placeholder={t("districtExample")} /></label><label>{copy.state}<input value={manualLocationDraft.state} onChange={(event) => setManualLocationDraft((location) => ({ ...location, state: event.target.value }))} autoComplete="address-level1" placeholder={t("stateExample")} /></label>{manualLocationError && <p className="form-error"><AlertTriangle size={15} /> {manualLocationError}</p>}<div className="modal-button-row"><button type="button" className="outline-button" onClick={() => { setManualLocationOpen(false); setManualLocationError(null); }}>{copy.cancel}</button><button type="submit" className="primary-button" disabled={profileSaveMutation.isPending}>{profileSaveMutation.isPending ? copy.saving : copy.saveFarmLocation}</button></div></form>}</div>}
          {actionPanel === "Farm profile" && <form className="farm-profile-form" onSubmit={(event) => { event.preventDefault(); saveFarmProfile(); }}><p className="manual-location-form-note">{copy.profilePrivateNote}</p><label>{copy.village}<input value={profileDraft.village} onChange={(event) => setProfileDraft((profile) => ({ ...profile, village: event.target.value }))} autoComplete="address-level3" /></label><label>{copy.district}<input value={profileDraft.district} onChange={(event) => setProfileDraft((profile) => ({ ...profile, district: event.target.value }))} autoComplete="address-level2" /></label><label>{copy.state}<input value={profileDraft.state} onChange={(event) => setProfileDraft((profile) => ({ ...profile, state: event.target.value }))} autoComplete="address-level1" /></label><fieldset><legend>{copy.cropPreferences}</legend><div className="profile-crop-options">{crops.map((crop) => <button key={crop.name} type="button" className={profileDraft.cropPreferences.includes(crop.name) ? "selected" : ""} onClick={() => toggleProfileCrop(crop.name)}>{crop.icon} {localizedCropName(crop.name)}</button>)}</div></fieldset><label>{copy.language}<select value={profileDraft.language} onChange={(event) => setProfileDraft((profile) => ({ ...profile, language: event.target.value as AppLanguage }))}>{appLanguages.map((item) => <option key={item} value={item}>{languageLabels[item]}</option>)}</select></label>{profileError && <p className="form-error"><AlertTriangle size={15} /> {profileError}</p>}<div className="modal-button-row"><button type="button" className="outline-button" onClick={() => setActionPanel(null)}>{copy.cancel}</button><button type="submit" className="primary-button" disabled={profileSaveMutation.isPending}>{profileSaveMutation.isPending ? copy.saving : <><Save size={16} /> {copy.save}</>}</button></div></form>}
          {actionPanel === "Scan history" && <div className="scan-history-panel">{!isAuthenticated ? <div className="profile-empty"><p>{copy.privateHistorySignIn}</p><button type="button" className="primary-button" onClick={startLogin}>{copy.signIn}</button></div> : historyQuery.isLoading ? <div className="live-card-loading"><Loader2 className="spin" size={20} /> {copy.loadingScans}</div> : historyQuery.data?.length ? <ol>{historyQuery.data.map((scan) => <li key={scan.id}><span className={`history-status ${scan.healthStatus}`}>{scan.healthStatus === "healthy" ? <Check size={14} /> : <AlertTriangle size={14} />}</span><div><strong>{scan.cropName}</strong><small>{scan.localName} · {new Date(scan.createdAt).toLocaleDateString()}</small><p>{scan.overview}</p></div></li>)}</ol> : <div className="profile-empty"><BookOpen size={22} /><p>{copy.historyEmpty}</p></div>}</div>}
          {actionDetails[actionPanel]?.action && <button className="primary-button modal-action" onClick={() => { setActionPanel(null); document.getElementById("crop-scan")?.scrollIntoView({ behavior: "smooth" }); }}><ScanSearch size={16} /> {actionDetails[actionPanel].action}</button>}
        </section>
      </div>}
      {marketEditorOpen && <div className="action-modal-backdrop" role="presentation" onMouseDown={() => setMarketEditorOpen(false)}><section className="action-modal value-editor" role="dialog" aria-modal="true" aria-labelledby="market-editor-title" onMouseDown={(event) => event.stopPropagation()}><button className="icon-button modal-close" aria-label={t("closeMarketEditor")} onClick={() => setMarketEditorOpen(false)}><X size={17} /></button><SectionLabel note={t("manualMarketUpdate")}>{t("cropMarketValues")}</SectionLabel><h2 id="market-editor-title">{t("cropMarketValues")}</h2><p>{t("marketEditorHelp")}</p><div className="market-editor-crop-selector"><span>{t("cropType")}</span><div className="market-editor-crop-tabs" role="tablist" aria-label={t("cropMarketValues")}>{crops.map((crop) => <button key={crop.name} type="button" role="tab" aria-selected={marketEditCrop === crop.name} className={`market-editor-crop-tab ${marketEditCrop === crop.name ? "active" : ""}`} onClick={() => selectMarketEditCrop(crop.name)}><b>{localizedCropName(crop.name)}</b><small>{localizedCropLocalName(crop)}</small></button>)}</div></div><div className="market-editor-crop-context"><span>{marketEditCropDetails.icon}</span><p><b>{localizedCropName(marketEditCropDetails.name)}</b><small>{localizedCropLocalName(marketEditCropDetails)} · {farmLocation.district} mandi</small></p></div><label>{t("pricePerQuintal")}<input inputMode="numeric" value={marketPriceDraft} onChange={(event) => setMarketPriceDraft(event.target.value)} placeholder={String(cropMarketValues[marketEditCrop].price)} /></label><label>{t("change30Days")}<input inputMode="numeric" value={marketTrendDraft} onChange={(event) => setMarketTrendDraft(event.target.value)} placeholder={String(cropMarketValues[marketEditCrop].trend)} /></label>{marketEditError && <p className="form-error"><AlertTriangle size={15} /> {marketEditError}</p>}<div className="modal-button-row"><button type="button" className="outline-button" onClick={() => setMarketEditorOpen(false)}>{copy.cancel}</button><button type="button" className="primary-button" onClick={saveMarketValues}>{copy.save}</button></div></section></div>}
      {confirmSignOut && <div className="action-modal-backdrop" role="presentation" onMouseDown={() => setConfirmSignOut(false)}><section className="action-modal confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="signout-title" onMouseDown={(event) => event.stopPropagation()}><span className="confirmation-icon"><LogOut size={20} /></span><SectionLabel note={t("accountAccess")}>{t("readyLeave")}</SectionLabel><h2 id="signout-title">{t("signOutTitle")}</h2><p>{t("signOutDescription")}</p><div className="modal-button-row"><button type="button" className="outline-button" onClick={() => setConfirmSignOut(false)}>{t("staySignedIn")}</button><button type="button" className="primary-button danger-primary" onClick={completeSignOut} disabled={authLoading}>{authLoading ? t("signingOut") : copy.signOut}</button></div></section></div>}
    </div>
  );
}
