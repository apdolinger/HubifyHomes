import { streamPdf, sectionTitle, hr } from "./index";

export function generateSampleInspectionPdf(): Promise<Buffer> {
  return streamPdf((doc) => {
    const W = doc.page.width;
    const M = 50;

    doc.fontSize(20).fillColor("#1e40af").text("Inspection Report", M, 40);
    doc.fontSize(9).fillColor("#64748b").text("Generated May 02, 2026 · 9:14 AM", M, 66);

    doc.moveDown(0.6);
    doc.fontSize(14).fillColor("#0f172a").text("Monthly Home Watch — 789 Beachfront Dr");
    doc.fontSize(9).fillColor("#475569").text(
      "Property: 789 Beachfront Dr, Marco Island   |   Due: May 02, 2026   |   Inspector: Sarah Chen"
    );
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor("#64748b").text("Owner request: please verify the upstairs A/C and check for any storm damage from last week.");
    doc.moveDown(0.4);
    hr(doc);

    sectionTitle(doc, "Performance Summary");
    const sumY = doc.y;
    const boxes = [
      { label: "Overall Score", value: "92%", color: "#16a34a" },
      { label: "Passed", value: "23", color: "#16a34a" },
      { label: "Failed", value: "1", color: "#dc2626" },
      { label: "N/A", value: "1", color: "#64748b" },
      { label: "Pending", value: "0", color: "#f59e0b" },
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

    sectionTitle(doc, "Failed Items (1)");
    const failY = doc.y;
    doc.rect(M, failY, W - M * 2, 50).fillColor("#fef2f2").fill();
    doc.rect(M, failY, W - M * 2, 50).strokeColor("#fca5a5").stroke();
    doc.fontSize(9).fillColor("#dc2626").text("✗", M + 8, failY + 8, { lineBreak: false });
    doc.fontSize(9).fillColor("#0f172a").text("Master bathroom — slow leak under sink", M + 22, failY + 8, { width: 460 });
    doc.fontSize(8).fillColor("#475569").text(
      "Photo attached. Recommend plumber within 7 days. Towels placed under trap, water shutoff confirmed accessible.",
      M + 22, failY + 24, { width: 460 }
    );
    doc.y = failY + 60;

    sectionTitle(doc, "Full Checklist (25 items)");
    const groups: Array<{ category: string; items: Array<[string, "pass" | "fail" | "na"]> }> = [
      {
        category: "Exterior",
        items: [
          ["Roof — visible damage", "pass"],
          ["Gutters & downspouts clear", "pass"],
          ["Pool equipment running", "pass"],
          ["Landscaping condition", "pass"],
          ["Storm shutters secured", "pass"],
        ],
      },
      {
        category: "Interior",
        items: [
          ["Front door / locks", "pass"],
          ["Windows secured", "pass"],
          ["A/C running, set to 78°F", "pass"],
          ["Refrigerator temperature", "pass"],
          ["Master bath plumbing", "fail"],
          ["Toilets flush correctly", "pass"],
        ],
      },
      {
        category: "Safety",
        items: [
          ["Smoke detectors", "pass"],
          ["CO detectors", "pass"],
          ["Fire extinguisher", "na"],
          ["Water shutoff accessible", "pass"],
        ],
      },
    ];
    for (const g of groups) {
      if (doc.y > 700) doc.addPage();
      doc.fontSize(8).fillColor("#64748b").text(g.category.toUpperCase(), M, doc.y, { characterSpacing: 0.6 });
      doc.moveDown(0.2);
      doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#e2e8f0").stroke();
      doc.moveDown(0.3);
      for (const [text, result] of g.items) {
        if (doc.y > 720) doc.addPage();
        const y = doc.y;
        doc.fontSize(9).fillColor("#0f172a").text(text, M, y, { width: 400 });
        const color = result === "pass" ? "#16a34a" : result === "fail" ? "#dc2626" : "#64748b";
        doc.fontSize(8).fillColor(color).text(result.toUpperCase(), W - M - 70, y, { width: 70, align: "right" });
        doc.y = y + 14;
        doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#f1f5f9").stroke();
        doc.moveDown(0.15);
      }
      doc.moveDown(0.3);
    }

    if (doc.y > 700) doc.addPage();
    sectionTitle(doc, "Photos Captured (4)");
    const photoY = doc.y;
    for (let i = 0; i < 4; i++) {
      const px = M + i * 120;
      doc.rect(px, photoY, 110, 80).fillColor("#e2e8f0").fill();
      doc.fontSize(8).fillColor("#475569").text(`photo_${i + 1}.jpg`, px, photoY + 36, { width: 110, align: "center" });
    }
    doc.y = photoY + 90;
    doc.fontSize(8).fillColor("#64748b").text("Captured by inspector via Field Mode. Full-resolution images available in the web report.");
  });
}
