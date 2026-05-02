import { streamPdf, sectionTitle, kv } from "./index";

export function generateSampleConsolidatedInvoicePdf(): Promise<Buffer> {
  return streamPdf((doc) => {
    const W = doc.page.width;
    const M = 50;

    doc.rect(0, 32, W, 80).fillColor("#0f766e").fill();
    doc.fontSize(22).fillColor("#ffffff").text("CONSOLIDATED INVOICE", M, 52);
    doc.fontSize(10).fillColor("#ccfbf1").text("Acme Property Management", M, 82);
    doc.fontSize(20).fillColor("#ffffff").text("#BATCH-2026-04", W - 260, 56, { width: 210, align: "right" });
    doc.fontSize(10).fillColor("#ccfbf1").text("Billing Period: Apr 01–30, 2026", W - 260, 86, { width: 210, align: "right" });

    doc.fillColor("black");
    doc.y = 130;

    sectionTitle(doc, "Bill To");
    const startY = doc.y;
    kv(doc, "Client", "Sunset Properties LLC (3 properties)", M, startY, 240);
    kv(doc, "Primary Contact", "Robert Sunset · robert@sunset.example", M, startY + 30, 240);
    kv(doc, "Mailing Address", "500 Harbor Ave\nNaples, FL 34102", M + 280, startY, 220);
    doc.y = startY + 70;

    sectionTitle(doc, "Properties Included");
    const props = [
      ["P-204", "789 Beachfront Dr, Marco Island", "$432.00"],
      ["P-118", "12 Palm Ct, Naples", "$598.50"],
      ["P-077", "3401 Gulf Shore Blvd N, Naples", "$1,245.75"],
    ];
    const headY = doc.y;
    doc.rect(M, headY, W - M * 2, 20).fillColor("#f1f5f9").fill();
    doc.fontSize(9).fillColor("#475569");
    doc.text("Property #", M + 8, headY + 6, { width: 80 });
    doc.text("Address", M + 90, headY + 6, { width: 320 });
    doc.text("Subtotal", W - M - 90, headY + 6, { width: 82, align: "right" });
    doc.y = headY + 24;
    doc.fillColor("#0f172a").fontSize(10);
    for (const [pid, addr, sub] of props) {
      const y = doc.y;
      doc.text(pid, M + 8, y, { width: 80 });
      doc.text(addr, M + 90, y, { width: 320 });
      doc.text(sub, W - M - 90, y, { width: 82, align: "right" });
      doc.y = y + 18;
      doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#f1f5f9").stroke();
      doc.moveDown(0.2);
    }

    sectionTitle(doc, "Line Items by Property");
    const groups = [
      {
        property: "P-204 · 789 Beachfront Dr",
        items: [
          ["Weekly home watch (4x)", 4, 75, 300],
          ["Pool service (4x)", 4, 33, 132],
        ],
      },
      {
        property: "P-118 · 12 Palm Ct",
        items: [
          ["Weekly home watch (4x)", 4, 85, 340],
          ["HVAC filter replacement", 1, 58.5, 58.5],
          ["Lawn touch-up (vendor reimb.)", 1, 200, 200],
        ],
      },
      {
        property: "P-077 · 3401 Gulf Shore Blvd N",
        items: [
          ["Weekly home watch (4x)", 4, 110, 440],
          ["Storm prep inspection", 1, 350, 350],
          ["Bulb + smoke alarm replacement", 1, 95.75, 95.75],
          ["Vendor coordination — pool repair", 3, 120, 360],
        ],
      },
    ];
    for (const g of groups) {
      if (doc.y > 680) doc.addPage();
      doc.fontSize(10).fillColor("#0f766e").text(g.property, M, doc.y);
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor("#0f172a");
      for (const [desc, qty, unit, total] of g.items) {
        const y = doc.y;
        doc.text(String(desc), M + 12, y, { width: 260 });
        doc.text(String(qty), M + 280, y, { width: 30, align: "right" });
        doc.text(`$${(unit as number).toFixed(2)}`, M + 320, y, { width: 70, align: "right" });
        doc.text(`$${(total as number).toFixed(2)}`, W - M - 80, y, { width: 72, align: "right" });
        doc.y = y + 14;
      }
      doc.moveDown(0.4);
    }

    // Totals
    doc.moveDown(0.4);
    const totalsX = W - M - 220;
    const lines: Array<[string, string, boolean?]> = [
      ["Subtotal (3 properties)", "$2,276.25"],
      ["Tax (6.0%)", "$136.58"],
      ["Total Due", "$2,412.83", true],
    ];
    for (const [label, val, bold] of lines) {
      const y = doc.y;
      if (bold) doc.font("Helvetica-Bold"); else doc.font("Helvetica");
      doc.fontSize(10).fillColor("#0f172a").text(label, totalsX, y, { width: 140 });
      doc.text(val, totalsX + 140, y, { width: 80, align: "right" });
      doc.y = y + 16;
    }
    doc.font("Helvetica");

    doc.moveDown(0.8);
    sectionTitle(doc, "Payment");
    doc.fontSize(10).fillColor("#0f172a").text("Pay all 3 invoices in one click: ", { continued: true })
      .fillColor("#0f766e").text("https://acmepm.hubify.app/pay/BATCH-2026-04");
    doc.moveDown(0.4);
    doc.fillColor("#475569").fontSize(9).text("ACH or card on file will be auto-charged on the due date if enabled in client billing preferences.");
  });
}
