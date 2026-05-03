import { streamPdf, sectionTitle, kv, type PdfDoc } from "./index";
import { getSampleTimeReport, type SampleTimeReport } from "../pdfMockData";

export function generateSampleTimeReportPdf(
  data: SampleTimeReport = getSampleTimeReport()
): Promise<Buffer> {
  return streamPdf((doc) => renderTimeReport(doc, data));
}

function renderTimeReport(doc: PdfDoc, d: SampleTimeReport): void {
  const W = doc.page.width;
  const M = 50;

  doc.rect(0, 32, W, 70).fillColor("#0e7490").fill();
  doc.fontSize(20).fillColor("#ffffff").text("Time Report", M, 52);
  doc.fontSize(10).fillColor("#cffafe").text(`${d.dateRange} · Grouped by ${d.groupBy}`, M, 80);

  doc.fillColor("black");
  doc.y = 120;

  sectionTitle(doc, "Filters Applied");
  const fy = doc.y;
  kv(doc, "Date Range", d.dateRange, M, fy, 240);
  kv(doc, "Group By", d.groupBy, M + 250, fy, 110);
  kv(doc, "Billable", d.billableFilter, M + 370, fy, 130);
  doc.y = fy + 36;

  sectionTitle(doc, "Totals");
  const ty = doc.y;
  const cols = 3, bw = (W - M * 2 - 16) / cols, bh = 44;
  d.totals.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = M + col * (bw + 8), y = ty + row * (bh + 8);
    doc.rect(x, y, bw, bh).fillColor("#f8fafc").fill();
    doc.rect(x, y, bw, bh).strokeColor("#e2e8f0").stroke();
    doc.fontSize(7).fillColor("#64748b").text(t.label.toUpperCase(), x + 8, y + 6, { width: bw - 16, characterSpacing: 0.5 });
    doc.fontSize(15).fillColor("#0f172a").text(t.value, x + 8, y + 18, { width: bw - 16 });
  });
  doc.y = ty + Math.ceil(d.totals.length / cols) * (bh + 8) + 4;

  sectionTitle(doc, `Hours by ${d.groupBy}`);
  const hy = doc.y;
  doc.rect(M, hy, W - M * 2, 20).fillColor("#ecfeff").fill();
  doc.fontSize(9).fillColor("#155e75");
  doc.text(d.groupBy, M + 8, hy + 6, { width: 180 });
  doc.text("Total", M + 200, hy + 6, { width: 60, align: "right" });
  doc.text("Billable", M + 270, hy + 6, { width: 60, align: "right" });
  doc.text("Non-Bill.", M + 340, hy + 6, { width: 60, align: "right" });
  doc.text("Billable $", M + 410, hy + 6, { width: 70, align: "right" });
  doc.text("Entries", W - M - 50, hy + 6, { width: 50, align: "right" });
  doc.y = hy + 24;

  for (const r of d.rows) {
    if (doc.y > 680) doc.addPage();
    const y = doc.y;
    doc.fontSize(10).fillColor("#0f172a").text(r.name, M + 8, y, { width: 180 });
    doc.text(r.total, M + 200, y, { width: 60, align: "right" });
    doc.text(r.billable, M + 270, y, { width: 60, align: "right" });
    doc.text(r.nonBillable, M + 340, y, { width: 60, align: "right" });
    doc.text(r.billableAmount, M + 410, y, { width: 70, align: "right" });
    doc.text(String(r.entries), W - M - 50, y, { width: 50, align: "right" });
    doc.y = y + 16;
    for (const b of r.breakdown) {
      if (doc.y > 720) doc.addPage();
      const by = doc.y;
      doc.fontSize(8).fillColor("#64748b").text(`Property: ${b.label}`, M + 24, by, { width: 280 });
      doc.fillColor("#475569").text(`${b.total} h`, M + 200, by, { width: 60, align: "right" });
      doc.text(b.amount, M + 410, by, { width: 70, align: "right" });
      doc.y = by + 12;
    }
    doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.3);
  }
}
