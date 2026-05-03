import { streamPdf, sectionTitle, hr, type PdfDoc } from "./index";
import { getSampleInspection, type SampleInspection } from "../pdfMockData";

export function generateSampleInspectionPdf(
  data: SampleInspection = getSampleInspection()
): Promise<Buffer> {
  return streamPdf((doc) => renderInspection(doc, data));
}

function renderInspection(doc: PdfDoc, d: SampleInspection): void {
  const W = doc.page.width;
  const M = 50;

  doc.fontSize(20).fillColor("#1e40af").text("Inspection Report", M, 40);
  doc.fontSize(9).fillColor("#64748b").text("Generated May 02, 2026 · 9:14 AM", M, 66);

  doc.moveDown(0.6);
  doc.fontSize(14).fillColor("#0f172a").text(d.taskTitle);
  doc.fontSize(9).fillColor("#475569").text(
    `Property: ${d.propertyAddress}   |   Due: ${d.dueDate}   |   Inspector: ${d.inspector}`
  );
  doc.moveDown(0.4);
  doc.fontSize(9).fillColor("#64748b").text(d.ownerNotes);
  doc.moveDown(0.4);
  hr(doc);

  sectionTitle(doc, "Performance Summary");
  const sumY = doc.y;
  const boxes = [
    { label: "Overall Score", value: `${d.summary.overallScore}%`, color: "#16a34a" },
    { label: "Passed", value: String(d.summary.passed), color: "#16a34a" },
    { label: "Failed", value: String(d.summary.failed), color: "#dc2626" },
    { label: "N/A", value: String(d.summary.na), color: "#64748b" },
    { label: "Pending", value: String(d.summary.pending), color: "#f59e0b" },
  ];
  const bw = 90, gap = 10;
  boxes.forEach((b, i) => {
    const bx = M + i * (bw + gap);
    doc.rect(bx, sumY, bw, 52).fillColor("#f8fafc").fill();
    doc.rect(bx, sumY, bw, 52).strokeColor("#e2e8f0").stroke();
    doc.fontSize(20).fillColor(b.color).text(b.value, bx, sumY + 8, { width: bw, align: "center" });
    doc.fontSize(8).fillColor("#64748b").text(b.label, bx, sumY + 34, { width: bw, align: "center" });
  });
  doc.y = sumY + 64;

  if (d.failedItems.length > 0) {
    sectionTitle(doc, `Failed Items (${d.failedItems.length})`);
    for (const f of d.failedItems) {
      const startY = doc.y;
      const noteH = doc.heightOfString(f.note, { width: 460 });
      const boxH = 26 + noteH;
      doc.rect(M, startY, W - M * 2, boxH).fillColor("#fef2f2").fill();
      doc.rect(M, startY, W - M * 2, boxH).strokeColor("#fca5a5").stroke();
      doc.fontSize(9).fillColor("#dc2626").text("✗", M + 8, startY + 8, { lineBreak: false });
      doc.fontSize(9).fillColor("#0f172a").text(f.text, M + 22, startY + 8, { width: 460 });
      doc.fontSize(8).fillColor("#475569").text(f.note, M + 22, startY + 24, { width: 460 });
      doc.y = startY + boxH + 6;
    }
  }

  const totalItems = d.groups.reduce((n, g) => n + g.items.length, 0);
  sectionTitle(doc, `Full Checklist (${totalItems} items)`);
  for (const g of d.groups) {
    if (doc.y > 700) doc.addPage();
    doc.fontSize(8).fillColor("#64748b").text(g.category.toUpperCase(), M, doc.y, { characterSpacing: 0.6 });
    doc.moveDown(0.2);
    doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.3);
    for (const item of g.items) {
      if (doc.y > 720) doc.addPage();
      const y = doc.y;
      doc.fontSize(9).fillColor("#0f172a").text(item.text, M, y, { width: 400 });
      const color = item.result === "pass" ? "#16a34a" : item.result === "fail" ? "#dc2626" : "#64748b";
      doc.fontSize(8).fillColor(color).text(item.result.toUpperCase(), W - M - 70, y, { width: 70, align: "right" });
      doc.y = y + 14;
      doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#f1f5f9").stroke();
      doc.moveDown(0.15);
    }
    doc.moveDown(0.3);
  }

  if (doc.y > 700) doc.addPage();
  sectionTitle(doc, `Photos Captured (${d.photos.length})`);
  const photoY = doc.y;
  d.photos.forEach((name, i) => {
    const px = M + i * 120;
    doc.rect(px, photoY, 110, 80).fillColor("#e2e8f0").fill();
    doc.fontSize(8).fillColor("#475569").text(name, px, photoY + 36, { width: 110, align: "center" });
  });
  doc.y = photoY + 90;
  doc.fontSize(8).fillColor("#64748b").text(
    "Captured by inspector via Field Mode. Full-resolution images available in the web report."
  );
}
