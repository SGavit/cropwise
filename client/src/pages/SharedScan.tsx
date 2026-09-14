import { ArrowLeft, Download, Leaf, Loader2, Share2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { downloadScanReport } from "@/lib/scanReport";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SharedScan() {
  const { language, t } = useLanguage();
  const [, params] = useRoute("/scan/:slug");
  const slug = params?.slug ?? "";
  const scan = trpc.cropShare.get.useQuery({ slug }, { enabled: Boolean(slug), retry: false });

  if (scan.isLoading) return <main className="shared-scan-page"><div className="shared-scan-shell loading-state"><Loader2 className="spin" size={26} /><p>{t("openingFieldNote")}</p></div></main>;
  if (!scan.data) return <main className="shared-scan-page"><div className="shared-scan-shell shared-error"><Leaf size={30} /><h1>{t("unavailableScanTitle")}</h1><p>{t("unavailableScanDescription")}</p><Link href="/" className="shared-back"><ArrowLeft size={16} /> {t("openCropWise")}</Link></div></main>;

  const { analysis, createdAt, expiresAt } = scan.data;
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `${analysis.cropName} · ${t("sharedScanTitle")}`, text: analysis.overview, url });
    } else {
      await navigator.clipboard.writeText(url);
      window.alert(t("scanCopied"));
    }
  };

  return <main className="shared-scan-page"><article className="shared-scan-shell"><header className="shared-header"><Link href="/" className="shared-back"><ArrowLeft size={16} /> CropWise</Link><span>{t("sharedFieldNote")}</span></header><div className="shared-title"><div><p>{t("likelyMatch")}</p><h1>{analysis.cropName}</h1><span>{analysis.localName} · <em>{analysis.scientificName}</em></span></div><div className="shared-actions"><button type="button" onClick={share}><Share2 size={16} /> {t("share")}</button><button type="button" onClick={() => downloadScanReport(analysis)}><Download size={16} /> {t("pdf")}</button></div></div><p className="shared-overview">{analysis.overview}</p>{analysis.language !== language && <p className="result-disclaimer">{t("scanNarrativeLanguageNotice")}</p>}<div className="shared-meta"><span><small>{t("confidence")}</small><b>{analysis.identificationConfidence}</b></span><span><small>{t("cropStage")}</small><b>{analysis.cropStage}</b></span><span><small>{t("status")}</small><b>{analysis.healthStatus === "healthy" ? t("looksHealthy") : analysis.healthStatus === "attention" ? t("needsAttention") : t("checkAgain")}</b></span></div><div className="shared-grid"><section><h2>{t("visiblePhoto")}</h2><ul>{analysis.visibleObservations.map((observation) => <li key={observation}>{observation}</li>)}</ul></section><section><h2>{t("likelyCondition")}</h2><p>{analysis.likelyIssue}</p><h2>{t("nextSteps")}</h2><ol>{analysis.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol></section></div><footer><p>{analysis.needsExpertReview ? t("expertReview") : analysis.disclaimer}</p><small>{t("shared")} {new Date(createdAt).toLocaleDateString()} · {t("linkUntil")} {new Date(expiresAt).toLocaleDateString()}</small></footer></article></main>;
}
