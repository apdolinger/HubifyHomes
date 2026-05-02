import { streamPdf, sectionTitle, hr, kv } from "./index";

export function generateSampleInvoicePdf(): Promise<Buffer> {
  return streamPdf((doc) => {
    const W = doc.page.width;
    const M = 50;

    // Header band
    doc.rect(0, 32, W, 80).fillColor("#1e40af").fill();
    doc.fontSize(22).fillColor("#ffffff").text("INVOICE", M, 52);
    doc.fontSize(10).fillColor("#dbeafe").text("Acme Property Management", M, 82);
    doc.fontSize(28).fillColor("#ffffff").text("#INV-2026-0042", W - 260, 52, { width: 210, align: "right" });
    doc.fontSize(10).fillColor("#dbeafe").text("Issued May 02, 2026", W - 260, 86, { width: 210, align: "right" });

    doc.fillColor("black");
    doc.y = 130;

    // From / Bill To
    sectionTitle(doc, "Parties");
    const colW = (W - M * 2 - 20) / 2;
    const startY = doc.y;
    kv(doc, "From", "Acme Property Management", M, startY, colW);
    kv(doc, "Address", "123 Main St, Suite 200\nNaples, FL 34102", M, startY + 30, colW);
    kv(doc, "Email / Phone", "billing@acmepm.com  ·  (239) 555-0142", M, startY + 70, colW);

    kv(doc, "Bill To", "Jane Owner", M + colW + 20, startY, colW);
    kv(doc, "Address", "789 Beachfront Dr\nMarco Island, FL 34145", M + colW + 20, startY + 30, colW);
    kv(doc, "Email / Phone", "jane.owner@example.com  ·  (239) 555-9988", M + colW + 20, startY + 70, colW);
    doc.y = startY + 110;

    // Invoice meta
    sectionTitle(doc, "Invoice Details");
    const metaY = doc.y;
    kv(doc, "Invoice #", "INV-2026-0042", M, metaY, 120);
    kv(doc, "Issue Date", "May 02, 2026", M + 130, metaY, 120);
    kv(doc, "Due Date", "May 16, 2026", M + 260, metaY, 120);
    kv(doc, "Terms", "Net 14", M + 390, metaY, 120);
    doc.y = metaY + 36;

    // Line items
    sectionTitle(doc, "Line Items");
    const headerY = doc.y;
    doc.rect(M, headerY, W - M * 2, 20).fillColor("#f1f5f9").fill();
    doc.fontSize(9).fillColor("#475569");
    doc.text("Description", M + 8, headerY + 6, { width: 240 });
    doc.text("Qty", M + 260, headerY + 6, { width: 40, align: "right" });
    doc.text("Unit", M + 310, headerY + 6, { width: 70, align: "right" });
    doc.text("Total", W - M - 80, headerY + 6, { width: 72, align: "right" });
    doc.y = headerY + 24;

    const items = [
      ["Home Watch — April 2026 (4 weekly visits)", 4, 75, 300],
      ["Pool Service — April 2026", 4, 45, 180],
      ["Storm Prep — Pre-season inspection", 1, 250, 250],
      ["Light bulb replacement (parts + labor)", 1, 32.5, 32.5],
    ] as const;
    doc.fillColor("#0f172a").fontSize(10);
    for (const [desc, qty, unit, total] of items) {
      const y = doc.y;
      doc.text(desc, M + 8, y, { width: 240 });
      doc.text(String(qty), M + 260, y, { width: 40, align: "right" });
      doc.text(`$${unit.toFixed(2)}`, M + 310, y, { width: 70, align: "right" });
      doc.text(`$${total.toFixed(2)}`, W - M - 80, y, { width: 72, align: "right" });
      doc.y = y + 18;
      doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#f1f5f9").stroke();
      doc.moveDown(0.2);
    }

    // Totals
    doc.moveDown(0.6);
    const totalsX = W - M - 220;
    const rowH = 16;
    const lines: Array<[string, string, boolean?]> = [
      ["Subtotal", "$762.50"],
      ["Tax (6.0%)", "$45.75"],
      ["Total", "$808.25", true],
      ["Amount Paid", "$0.00"],
      ["Amount Due", "$808.25", true],
    ];
    for (const [label, val, bold] of lines) {
      const y = doc.y;
      if (bold) doc.font("Helvetica-Bold"); else doc.font("Helvetica");
      doc.fontSize(10).fillColor("#0f172a").text(label, totalsX, y, { width: 130 });
      doc.text(val, totalsX + 130, y, { width: 90, align: "right" });
      doc.y = y + rowH;
    }
    doc.font("Helvetica");

    // Pay link / notes
    doc.moveDown(0.8);
    sectionTitle(doc, "Payment");
    doc.fontSize(10).fillColor("#0f172a").text("Pay online: ", { continued: true })
      .fillColor("#1e40af").text("https://acmepm.hubify.app/pay/INV-2026-0042");
    doc.moveDown(0.4);
    doc.fillColor("#475569").fontSize(9).text("Or mail check payable to Acme Property Management at the address above.");
    doc.moveDown(0.6);

    sectionTitle(doc, "Notes");
    doc.fontSize(9).fillColor("#475569").text(
      "Thank you for your business. Please contact us with any questions about this invoice within 7 days of receipt."
    );
  });
}
