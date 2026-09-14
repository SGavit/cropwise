import { jsPDF } from "jspdf";

export type ScanReport = {
  cropName: string;
  localName: string;
  scientificName: string;
  identificationConfidence: string;
  cropStage: string;
  healthStatus: "healthy" | "attention" | "uncertain";
  overview: string;
  visibleObservations: string[];
  likelyIssue: string;
  nextSteps: string[];
  needsExpertReview: boolean;
  privacyNotice: string;
  disclaimer: string;
};

function addParagraph(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 5.5) {
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function downloadScanReport(analysis: ScanReport) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const width = 174;
  let y = 20;

  doc.setFillColor(31, 58, 94);
  doc.rect(0, 0, 210, 13, "F");
  doc.setTextColor(31, 58, 94);
  doc.setFont("times", "bold");
  doc.setFontSize(23);
  doc.text("CropWise", 18, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(99, 112, 109);
  doc.text(`Field scan report · generated ${new Date().toLocaleDateString()}`, 18, y);
  y += 14;

  doc.setTextColor(31, 58, 94);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text(analysis.cropName, 18, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 88, 90);
  doc.text(`${analysis.localName} · ${analysis.scientificName}`, 18, y);
  y += 10;

  doc.setFillColor(238, 243, 234);
  doc.roundedRect(18, y, width, 20, 3, 3, "F");
  doc.setTextColor(46, 82, 69);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CONFIDENCE", 23, y + 7);
  doc.text("CROP STAGE", 85, y + 7);
  doc.text("PHOTO STATUS", 143, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(analysis.identificationConfidence, 23, y + 14);
  doc.text(analysis.cropStage, 85, y + 14);
  doc.text(analysis.healthStatus === "healthy" ? "Looks healthy" : analysis.healthStatus === "attention" ? "Needs attention" : "Check again", 143, y + 14);
  y += 31;

  doc.setTextColor(31, 58, 94);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Assessment", 18, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(65, 77, 80);
  y = addParagraph(doc, analysis.overview, 18, y, width) + 8;

  doc.setTextColor(31, 58, 94);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Visible observations", 18, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(65, 77, 80);
  analysis.visibleObservations.forEach((item) => {
    y = addParagraph(doc, `• ${item}`, 20, y, width - 2) + 2;
  });
  y += 4;

  doc.setTextColor(31, 58, 94);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Likely condition", 18, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(65, 77, 80);
  y = addParagraph(doc, analysis.likelyIssue, 18, y, width) + 8;

  doc.setTextColor(31, 58, 94);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("What to do next", 18, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(65, 77, 80);
  analysis.nextSteps.forEach((step, index) => {
    y = addParagraph(doc, `${index + 1}. ${step}`, 20, y, width - 2) + 2;
  });
  y += 6;

  doc.setDrawColor(213, 139, 83);
  doc.setFillColor(253, 247, 235);
  doc.roundedRect(18, y, width, 28, 3, 3, "FD");
  doc.setTextColor(100, 78, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FIELD NOTE", 23, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const guidance = analysis.needsExpertReview
    ? "This photo needs a local agronomist’s review before any treatment decision."
    : "Use this screening as a field note and confirm material decisions with a local agronomist.";
  addParagraph(doc, guidance, 23, y + 13, width - 10, 4.6);
  y += 36;

  doc.setTextColor(110, 115, 108);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  addParagraph(doc, analysis.disclaimer, 18, y, width, 4.2);
  doc.save(`cropwise-${analysis.cropName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-scan.pdf`);
}
