import { streamPdf, sectionTitle, kv } from "./index";

export function generateSampleTimeReportPdf(): Promise<Buffer> {
  return streamPdf((doc) => {
    const W = doc.page.width;
    const M = 50;

    doc.rect(0, 32, W, 70).fillColor("#0e7490").fill();
    doc.fontSize(20).fillColor("#ffffff").text("Time Report", M, 52);
    doc.fontSize(10).fillColor("#cffafe").text("Apr 03, 2026 – May 02, 2026 · Grouped by Employee", M, 80);

    doc.fillColor("black");
    doc.y = 120;

    sectionTitle(doc, "Filters Applied");
    const fy = doc.y;
    kv(doc, "Date Range", "Apr 03 – May 02, 2026 (30 days)", M, fy, 220);
    kv(doc, "Group By", "Employee", M + 230, fy, 110);
    kv(doc, "Billable", "All entries", M + 350, fy, 130);
    doc.y = fy + 36;

    sectionTitle(doc, "Totals");
    const ty = doc.y;
    const totals: Array<[string, string]> = [
      ["Total Hours", "146.25 h"],
      ["Billable Hours", "112.50 h"],
      ["Non-Billable", "33.75 h"],
      ["Billable Amount", "$8,437.50"],
      ["Active Employees", "5"],
      ["Active Properties", "12"],
    ];
    const cols = 3, bw = (W - M * 2 - 16) / cols, bh = 44;
    totals.forEach(([label, value], i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = M + col * (bw + 8), y = ty + row * (bh + 8);
      doc.rect(x, y, bw, bh).fillColor("#f8fafc").fill();
      doc.rect(x, y, bw, bh).strokeColor("#e2e8f0").stroke();
      doc.fontSize(7).fillColor("#64748b").text(label.toUpperCase(), x + 8, y + 6, { width: bw - 16, characterSpacing: 0.5 });
      doc.fontSize(15).fillColor("#0f172a").text(value, x + 8, y + 18, { width: bw - 16 });
    });
    doc.y = ty + Math.ceil(totals.length / cols) * (bh + 8) + 4;

    sectionTitle(doc, "Hours by Employee");
    const hy = doc.y;
    doc.rect(M, hy, W - M * 2, 20).fillColor("#ecfeff").fill();
    doc.fontSize(9).fillColor("#155e75");
    doc.text("Employee", M + 8, hy + 6, { width: 180 });
    doc.text("Total", M + 200, hy + 6, { width: 60, align: "right" });
    doc.text("Billable", M + 270, hy + 6, { width: 60, align: "right" });
    doc.text("Non-Bill.", M + 340, hy + 6, { width: 60, align: "right" });
    doc.text("Billable $", M + 410, hy + 6, { width: 70, align: "right" });
    doc.text("Entries", W - M - 50, hy + 6, { width: 50, align: "right" });
    doc.y = hy + 24;

    type Row = { name: string; total: string; billable: string; non: string; amt: string; entries: number; breakdown: Array<{ label: string; total: string; amt: string }> };
    const rows: Row[] = [
      {
        name: "Sarah Chen", total: "48.50", billable: "42.00", non: "6.50", amt: "$3,150.00", entries: 22,
        breakdown: [
          { label: "789 Beachfront Dr", total: "18.50", amt: "$1,387.50" },
          { label: "12 Palm Ct", total: "14.00", amt: "$1,050.00" },
          { label: "3401 Gulf Shore Blvd N", total: "9.50", amt: "$712.50" },
          { label: "Travel / unassigned", total: "6.50", amt: "$0.00" },
        ],
      },
      {
        name: "Mike Rivera", total: "41.25", billable: "30.00", non: "11.25", amt: "$2,250.00", entries: 18,
        breakdown: [
          { label: "12 Palm Ct", total: "16.00", amt: "$1,200.00" },
          { label: "3401 Gulf Shore Blvd N", total: "14.00", amt: "$1,050.00" },
          { label: "Office / admin", total: "11.25", amt: "$0.00" },
        ],
      },
      {
        name: "Diego Alvarez", total: "32.00", billable: "28.50", non: "3.50", amt: "$1,995.00", entries: 14,
        breakdown: [
          { label: "789 Beachfront Dr", total: "12.50", amt: "$875.00" },
          { label: "Other properties (4)", total: "16.00", amt: "$1,120.00" },
          { label: "Vehicle maintenance", total: "3.50", amt: "$0.00" },
        ],
      },
      {
        name: "Priya Singh", total: "16.50", billable: "12.00", non: "4.50", amt: "$840.00", entries: 9,
        breakdown: [
          { label: "12 Palm Ct", total: "8.00", amt: "$560.00" },
          { label: "3401 Gulf Shore Blvd N", total: "4.00", amt: "$280.00" },
          { label: "Training", total: "4.50", amt: "$0.00" },
        ],
      },
      {
        name: "Unassigned", total: "8.00", billable: "0.00", non: "8.00", amt: "$0.00", entries: 4,
        breakdown: [{ label: "Office / admin", total: "8.00", amt: "$0.00" }],
      },
    ];

    for (const r of rows) {
      if (doc.y > 680) doc.addPage();
      const y = doc.y;
      doc.fontSize(10).fillColor("#0f172a").text(r.name, M + 8, y, { width: 180 });
      doc.text(r.total, M + 200, y, { width: 60, align: "right" });
      doc.text(r.billable, M + 270, y, { width: 60, align: "right" });
      doc.text(r.non, M + 340, y, { width: 60, align: "right" });
      doc.text(r.amt, M + 410, y, { width: 70, align: "right" });
      doc.text(String(r.entries), W - M - 50, y, { width: 50, align: "right" });
      doc.y = y + 16;
      for (const b of r.breakdown) {
        if (doc.y > 720) doc.addPage();
        const by = doc.y;
        doc.fontSize(8).fillColor("#64748b").text(`Property: ${b.label}`, M + 24, by, { width: 280 });
        doc.fillColor("#475569").text(b.total + " h", M + 200, by, { width: 60, align: "right" });
        doc.text(b.amt, M + 410, by, { width: 70, align: "right" });
        doc.y = by + 12;
      }
      doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#e2e8f0").stroke();
      doc.moveDown(0.3);
    }
  });
}
