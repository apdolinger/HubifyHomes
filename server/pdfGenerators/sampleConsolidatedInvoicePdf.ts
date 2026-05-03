import { streamPdf, sectionTitle, kv, type PdfDoc } from "./index";
import { getSampleConsolidatedInvoice, type SampleConsolidatedInvoice } from "../pdfMockData";

export function generateSampleConsolidatedInvoicePdf(
  data: SampleConsolidatedInvoice = getSampleConsolidatedInvoice()
): Promise<Buffer> {
  return streamPdf((doc) => renderConsolidated(doc, data));
}

function renderConsolidated(doc: PdfDoc, d: SampleConsolidatedInvoice): void {
  const W = doc.page.width;
  const M = 50;

  doc.rect(0, 32, W, 80).fillColor("#0f766e").fill();
  doc.fontSize(22).fillColor("#ffffff").text("CONSOLIDATED INVOICE", M, 52);
  doc.fontSize(10).fillColor("#ccfbf1").text(d.client.name, M, 82);
  doc.fontSize(20).fillColor("#ffffff").text(`#${d.batchNumber}`, W - 260, 56, { width: 210, align: "right" });
  doc.fontSize(10).fillColor("#ccfbf1").text(`Billing Period: ${d.billingPeriod}`, W - 260, 86, { width: 210, align: "right" });

  doc.fillColor("black");
  doc.y = 130;

  sectionTitle(doc, "Bill To");
  const startY = doc.y;
  kv(doc, "Client", d.client.name, M, startY, 240);
  kv(doc, "Primary Contact", d.client.primaryContact, M, startY + 30, 240);
  kv(doc, "Mailing Address", d.client.mailingAddress, M + 280, startY, 220);
  doc.y = startY + 70;

  sectionTitle(doc, "Properties Included");
  const headY = doc.y;
  doc.rect(M, headY, W - M * 2, 20).fillColor("#f1f5f9").fill();
  doc.fontSize(9).fillColor("#475569");
  doc.text("Property #", M + 8, headY + 6, { width: 80 });
  doc.text("Address", M + 90, headY + 6, { width: 320 });
  doc.text("Subtotal", W - M - 90, headY + 6, { width: 82, align: "right" });
  doc.y = headY + 24;
  doc.fillColor("#0f172a").fontSize(10);
  for (const p of d.properties) {
    const y = doc.y;
    doc.text(p.propertyNumber, M + 8, y, { width: 80 });
    doc.text(p.address, M + 90, y, { width: 320 });
    doc.text(`$${p.subtotal.toFixed(2)}`, W - M - 90, y, { width: 82, align: "right" });
    doc.y = y + 18;
    doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#f1f5f9").stroke();
    doc.moveDown(0.2);
  }

  sectionTitle(doc, "Line Items by Property");
  for (const g of d.groups) {
    if (doc.y > 680) doc.addPage();
    doc.fontSize(10).fillColor("#0f766e").text(g.property, M, doc.y);
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor("#0f172a");
    for (const item of g.items) {
      const y = doc.y;
      doc.text(item.description, M + 12, y, { width: 260 });
      doc.text(String(item.quantity), M + 280, y, { width: 30, align: "right" });
      doc.text(`$${item.unitPrice.toFixed(2)}`, M + 320, y, { width: 70, align: "right" });
      doc.text(`$${item.total.toFixed(2)}`, W - M - 80, y, { width: 72, align: "right" });
      doc.y = y + 14;
    }
    doc.moveDown(0.4);
  }

  doc.moveDown(0.4);
  const totalsX = W - M - 220;
  const lines: Array<[string, string, boolean?]> = [
    [`Subtotal (${d.properties.length} properties)`, `$${d.subtotal.toFixed(2)}`],
    [`Tax (${d.taxRate.toFixed(1)}%)`, `$${d.taxAmount.toFixed(2)}`],
    ["Total Due", `$${d.total.toFixed(2)}`, true],
  ];
  for (const [label, val, bold] of lines) {
    const y = doc.y;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    doc.fontSize(10).fillColor("#0f172a").text(label, totalsX, y, { width: 140 });
    doc.text(val, totalsX + 140, y, { width: 80, align: "right" });
    doc.y = y + 16;
  }
  doc.font("Helvetica");

  doc.moveDown(0.8);
  sectionTitle(doc, "Payment");
  doc.fontSize(10).fillColor("#0f172a").text("Pay all invoices in one click: ", { continued: true })
    .fillColor("#0f766e").text(d.payLink);
  doc.moveDown(0.4);
  doc.fillColor("#475569").fontSize(9).text(
    "ACH or card on file will be auto-charged on the due date if enabled in client billing preferences."
  );
}
