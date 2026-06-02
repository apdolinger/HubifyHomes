import { streamPdf, sectionTitle, kv, type PdfDoc } from "./index";
import { getHubifyHomesLogoBuffer } from "../brandAsset";

export interface LiveReportGroup {
  key: string;
  label: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableAmountCents: number;
  entryCount: number;
  totalMileage?: number;
  overtimeFlag?: boolean;
  breakdown: Array<{
    key: string;
    label: string;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    billableAmountCents: number;
    entryCount: number;
  }>;
}

export interface LiveTimeReportData {
  groupBy: "user" | "property";
  dateRange: string;
  billableFilter: string;
  totals: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    billableAmountCents: number;
    activeUsers: number;
    activeProperties: number;
    entryCount: number;
    totalMileage: number;
  };
  groups: LiveReportGroup[];
}

export function generateLiveTimeReportPdf(data: LiveTimeReportData): Promise<Buffer> {
  return streamPdf((doc) => renderLiveTimeReport(doc, data));
}

function renderLiveTimeReport(doc: PdfDoc, d: LiveTimeReportData): void {
  const W = doc.page.width;
  const M = 50;
  const fmtH = (h: number) => `${h.toFixed(2)}h`;
  const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Header bar
  doc.rect(0, 32, W, 70).fillColor("#0e7490").fill();
  doc.fontSize(20).fillColor("#ffffff").text("Time Report", M, 52);
  doc.fontSize(10).fillColor("#cffafe").text(
    `${d.dateRange} · Grouped by ${d.groupBy === "user" ? "Employee" : "Property"}`,
    M, 80
  );

  const hubifyLogo = getHubifyHomesLogoBuffer();
  if (hubifyLogo) {
    const logoBoxW = 110, logoBoxH = 40;
    const logoX = W - M - logoBoxW;
    const logoY = 47;
    doc.rect(logoX, logoY, logoBoxW, logoBoxH).fillColor("#ffffff").fill();
    try {
      doc.image(hubifyLogo, logoX + 6, logoY + 4, {
        fit: [logoBoxW - 12, logoBoxH - 8],
        align: "center",
        valign: "center",
      });
    } catch (err) {
      console.error("Failed to render logo on time report PDF:", err);
    }
  }

  doc.fillColor("black");
  doc.y = 120;

  // Report parameters
  sectionTitle(doc, "Report Parameters");
  const fy = doc.y;
  kv(doc, "Date Range", d.dateRange, M, fy, 240);
  kv(doc, "Group By", d.groupBy === "user" ? "Employee" : "Property", M + 250, fy, 110);
  kv(doc, "Billable Filter", d.billableFilter, M + 370, fy, 130);
  doc.y = fy + 36;

  // Summary metric tiles
  sectionTitle(doc, "Summary");
  const ty = doc.y;
  const cols = 3;
  const bw = (W - M * 2 - 16) / cols;
  const bh = 44;
  const summaryItems = [
    { label: "Total Hours", value: fmtH(d.totals.totalHours) },
    { label: "Billable Hours", value: fmtH(d.totals.billableHours) },
    { label: "Non-Billable Hours", value: fmtH(d.totals.nonBillableHours) },
    { label: "Billable Amount", value: fmtMoney(d.totals.billableAmountCents) },
    { label: "Employees", value: String(d.totals.activeUsers) },
    {
      label: d.totals.totalMileage > 0 ? "Total Mileage" : "Total Entries",
      value: d.totals.totalMileage > 0 ? `${d.totals.totalMileage} mi` : String(d.totals.entryCount),
    },
  ];
  summaryItems.forEach((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = M + col * (bw + 8);
    const y = ty + row * (bh + 8);
    doc.rect(x, y, bw, bh).fillColor("#f8fafc").fill();
    doc.rect(x, y, bw, bh).strokeColor("#e2e8f0").stroke();
    doc.fontSize(7).fillColor("#64748b").text(t.label.toUpperCase(), x + 8, y + 6, {
      width: bw - 16,
      characterSpacing: 0.5,
    });
    doc.fontSize(15).fillColor("#0f172a").text(t.value, x + 8, y + 18, { width: bw - 16 });
  });
  doc.y = ty + Math.ceil(summaryItems.length / cols) * (bh + 8) + 4;

  // Overtime alert if any
  const overtimeUsers = d.groups.filter((g) => g.overtimeFlag);
  if (d.groupBy === "user" && overtimeUsers.length > 0) {
    const alertY = doc.y;
    doc.rect(M, alertY, W - M * 2, 22).fillColor("#fef3c7").fill();
    doc.rect(M, alertY, W - M * 2, 22).strokeColor("#f59e0b").stroke();
    doc.fontSize(9).fillColor("#92400e").text(
      `⚠  Overtime detected for: ${overtimeUsers.map((u) => u.label).join(", ")}`,
      M + 8,
      alertY + 6,
      { width: W - M * 2 - 16 }
    );
    doc.y = alertY + 28;
  }

  // Group table header
  const groupColLabel = d.groupBy === "user" ? "Employee" : "Property";
  const subColLabel = d.groupBy === "user" ? "Property" : "Employee";

  sectionTitle(doc, `Hours by ${groupColLabel}`);
  const hy = doc.y;
  doc.rect(M, hy, W - M * 2, 20).fillColor("#ecfeff").fill();
  doc.fontSize(9).fillColor("#155e75");
  doc.text(groupColLabel, M + 8, hy + 6, { width: 180 });
  doc.text("Total", M + 200, hy + 6, { width: 60, align: "right" });
  doc.text("Billable", M + 270, hy + 6, { width: 60, align: "right" });
  doc.text("Non-Bill.", M + 340, hy + 6, { width: 60, align: "right" });
  doc.text("Billable $", M + 410, hy + 6, { width: 70, align: "right" });
  doc.text("Entries", W - M - 50, hy + 6, { width: 50, align: "right" });
  doc.y = hy + 24;

  for (const r of d.groups) {
    if (doc.y > 680) doc.addPage();
    const y = doc.y;

    if (r.overtimeFlag) {
      doc.rect(M, y - 2, W - M * 2, 18).fillColor("#fffbeb").fill();
    }

    const nameLabel = r.overtimeFlag ? `⚠ ${r.label}` : r.label;
    doc.fontSize(10)
      .fillColor(r.overtimeFlag ? "#b45309" : "#0f172a")
      .text(nameLabel, M + 8, y, { width: 180 });

    doc.fillColor("#0f172a");
    doc.text(fmtH(r.totalHours), M + 200, y, { width: 60, align: "right" });
    doc.text(fmtH(r.billableHours), M + 270, y, { width: 60, align: "right" });
    doc.text(fmtH(r.nonBillableHours), M + 340, y, { width: 60, align: "right" });
    doc.text(fmtMoney(r.billableAmountCents), M + 410, y, { width: 70, align: "right" });
    doc.text(String(r.entryCount), W - M - 50, y, { width: 50, align: "right" });
    doc.y = y + 16;

    for (const b of r.breakdown) {
      if (doc.y > 720) doc.addPage();
      const by = doc.y;
      doc.fontSize(8)
        .fillColor("#64748b")
        .text(`${subColLabel}: ${b.label}`, M + 24, by, { width: 280 });
      doc.fillColor("#475569").text(fmtH(b.totalHours), M + 200, by, { width: 60, align: "right" });
      doc.text(fmtMoney(b.billableAmountCents), M + 410, by, { width: 70, align: "right" });
      doc.y = by + 12;
    }

    doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.3);
  }

  if (d.groups.length === 0) {
    doc.fontSize(10).fillColor("#94a3b8").text("No time entries for the selected range.", M, doc.y + 8);
    doc.y += 24;
  }

  // Footer
  const footerY = Math.min(doc.y + 20, doc.page.height - 40);
  doc.fontSize(8)
    .fillColor("#94a3b8")
    .text(
      `Generated by Hubify · ${new Date().toLocaleString()}`,
      M,
      footerY,
      { width: W - M * 2, align: "center" }
    );
}
