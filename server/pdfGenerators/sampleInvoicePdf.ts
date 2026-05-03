import { streamPdf, sectionTitle, kv, type PdfDoc } from "./index";
import { getSampleInvoice, type SampleInvoice } from "../pdfMockData";

export function generateSampleInvoicePdf(data: SampleInvoice = getSampleInvoice()): Promise<Buffer> {
  return streamPdf((doc) => renderInvoice(doc, data));
}

function renderInvoice(doc: PdfDoc, d: SampleInvoice): void {
  const W = doc.page.width;
  const M = 50;

  doc.rect(0, 32, W, 80).fillColor("#1e40af").fill();
  doc.fontSize(22).fillColor("#ffffff").text("INVOICE", M, 52);
  doc.fontSize(10).fillColor("#dbeafe").text(d.org.name, M, 82);
  doc.fontSize(28).fillColor("#ffffff").text(`#${d.invoiceNumber}`, W - 260, 52, { width: 210, align: "right" });
  doc.fontSize(10).fillColor("#dbeafe").text(`Issued ${d.issueDate}`, W - 260, 86, { width: 210, align: "right" });

  doc.fillColor("black");
  doc.y = 130;

  sectionTitle(doc, "Parties");
  const colW = (W - M * 2 - 20) / 2;
  const startY = doc.y;
  kv(doc, "From", d.org.name, M, startY, colW);
  kv(doc, "Address", d.org.address, M, startY + 30, colW);
  kv(doc, "Email / Phone", `${d.org.email}  ·  ${d.org.phone}`, M, startY + 70, colW);
  kv(doc, "Bill To", d.client.name, M + colW + 20, startY, colW);
  kv(doc, "Address", d.client.address, M + colW + 20, startY + 30, colW);
  kv(doc, "Email / Phone", `${d.client.email}  ·  ${d.client.phone}`, M + colW + 20, startY + 70, colW);
  doc.y = startY + 110;

  sectionTitle(doc, "Invoice Details");
  const metaY = doc.y;
  kv(doc, "Invoice #", d.invoiceNumber, M, metaY, 120);
  kv(doc, "Issue Date", d.issueDate, M + 130, metaY, 120);
  kv(doc, "Due Date", d.dueDate, M + 260, metaY, 120);
  kv(doc, "Terms", d.terms, M + 390, metaY, 120);
  doc.y = metaY + 36;

  sectionTitle(doc, "Line Items");
  const headerY = doc.y;
  doc.rect(M, headerY, W - M * 2, 20).fillColor("#f1f5f9").fill();
  doc.fontSize(9).fillColor("#475569");
  doc.text("Description", M + 8, headerY + 6, { width: 240 });
  doc.text("Qty", M + 260, headerY + 6, { width: 40, align: "right" });
  doc.text("Unit", M + 310, headerY + 6, { width: 70, align: "right" });
  doc.text("Total", W - M - 80, headerY + 6, { width: 72, align: "right" });
  doc.y = headerY + 24;

  doc.fillColor("#0f172a").fontSize(10);
  for (const item of d.lineItems) {
    const y = doc.y;
    doc.text(item.description, M + 8, y, { width: 240 });
    doc.text(String(item.quantity), M + 260, y, { width: 40, align: "right" });
    doc.text(`$${item.unitPrice.toFixed(2)}`, M + 310, y, { width: 70, align: "right" });
    doc.text(`$${item.total.toFixed(2)}`, W - M - 80, y, { width: 72, align: "right" });
    doc.y = y + 18;
    doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor("#f1f5f9").stroke();
    doc.moveDown(0.2);
  }

  doc.moveDown(0.6);
  const totalsX = W - M - 220;
  const rowH = 16;
  const lines: Array<[string, string, boolean?]> = [
    ["Subtotal", `$${d.subtotal.toFixed(2)}`],
    [`Tax (${d.taxRate.toFixed(1)}%)`, `$${d.taxAmount.toFixed(2)}`],
    ["Total", `$${d.total.toFixed(2)}`, true],
    ["Amount Paid", `$${d.amountPaid.toFixed(2)}`],
    ["Amount Due", `$${d.amountDue.toFixed(2)}`, true],
  ];
  for (const [label, val, bold] of lines) {
    const y = doc.y;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    doc.fontSize(10).fillColor("#0f172a").text(label, totalsX, y, { width: 130 });
    doc.text(val, totalsX + 130, y, { width: 90, align: "right" });
    doc.y = y + rowH;
  }
  doc.font("Helvetica");

  doc.moveDown(0.8);
  sectionTitle(doc, "Payment");
  doc.fontSize(10).fillColor("#0f172a").text("Pay online: ", { continued: true })
    .fillColor("#1e40af").text(d.payLink);
  doc.moveDown(0.4);
  doc.fillColor("#475569").fontSize(9).text("Or mail check payable to the organization at the address above.");
  doc.moveDown(0.6);

  sectionTitle(doc, "Notes");
  doc.fontSize(9).fillColor("#475569").text(d.notes);
}
