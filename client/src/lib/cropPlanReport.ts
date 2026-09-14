import { jsPDF } from "jspdf";
import type { CropAreaAllocation, CropPlanSeason } from "./cropPlan";

export type CropPlanReportRow = CropAreaAllocation & { name: string; guidance: string };

export type CropPlanReport = {
  locationLabel: string;
  seasonLabel: string;
  totalAcres: number;
  rows: CropPlanReportRow[];
  generatedLabel: string;
  title: string;
  allocationLabel: string;
  areaLabel: string;
  guidanceLabel: string;
  disclaimer: string;
};

function addParagraph(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 5) {
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function safeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan";
}

export function downloadCropPlanReport(report: CropPlanReport) {
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
  doc.text(`${report.title} · ${report.generatedLabel}`, 18, y);
  y += 14;

  doc.setTextColor(31, 58, 94);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text(report.title, 18, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 88, 90);
  doc.text(report.locationLabel, 18, y);
  y += 5;
  doc.text(`${report.seasonLabel} · ${report.totalAcres.toFixed(2)} acres`, 18, y);
  y += 12;

  doc.setFillColor(238, 243, 234);
  doc.roundedRect(18, y, width, 13, 3, 3, "F");
  doc.setTextColor(46, 82, 69);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(report.allocationLabel, 24, y + 8);
  y += 22;

  report.rows.forEach((row, index) => {
    if (y > 258) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(218, 225, 215);
    doc.line(18, y - 4, 192, y - 4);
    doc.setTextColor(31, 58, 94);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${index + 1}. ${row.name}`, 18, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 88, 90);
    doc.setFontSize(10);
    doc.text(`${row.percent.toFixed(1)}% · ${row.acres.toFixed(2)} acres`, 125, y + 2);
    y += 9;
    doc.setFontSize(9);
    doc.setTextColor(85, 96, 91);
    y = addParagraph(doc, row.guidance, 22, y, width - 8, 4.5) + 7;
  });

  if (y > 258) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(213, 139, 83);
  doc.setFillColor(253, 247, 235);
  doc.roundedRect(18, y, width, 25, 3, 3, "FD");
  doc.setTextColor(100, 78, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(report.guidanceLabel, 23, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  addParagraph(doc, report.disclaimer, 23, y + 14, width - 10, 4.3);
  doc.save(`cropwise-${safeFilePart(report.locationLabel)}-${safeFilePart(report.seasonLabel)}-plan.pdf`);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function printCropPlanReport(report: CropPlanReport) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return false;
  const rows = report.rows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${row.percent.toFixed(1)}%</td><td>${row.acres.toFixed(2)}</td><td>${escapeHtml(row.guidance)}</td></tr>`).join("");
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(report.title)}</title><style>body{font-family:Arial,sans-serif;color:#1f3a5e;max-width:900px;margin:40px auto;padding:0 24px}h1{font-family:Georgia,serif;font-size:32px;margin-bottom:8px}p{color:#4b585a}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{text-align:left;border-bottom:1px solid #d9e1d7;padding:12px 8px;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.08em}td{color:#4b585a}footer{margin-top:28px;background:#fdf7eb;padding:16px;border:1px solid #d58b53}@media print{body{margin:0;max-width:none}}</style></head><body><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.locationLabel)} · ${escapeHtml(report.seasonLabel)} · ${report.totalAcres.toFixed(2)} acres</p><table><thead><tr><th>${escapeHtml(report.allocationLabel)}</th><th>%</th><th>${escapeHtml(report.areaLabel)}</th><th>${escapeHtml(report.guidanceLabel)}</th></tr></thead><tbody>${rows}</tbody></table><footer>${escapeHtml(report.disclaimer)}</footer><script>window.onload=function(){window.print();}</script></body></html>`);
  printWindow.document.close();
  return true;
}
