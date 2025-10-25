import PDFDocument from "pdfkit";
import type { Response } from "express";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date | null;
  
  // Organization details
  organizationName: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  organizationLogo?: string;
  
  // Client details
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  
  // Invoice items
  lineItems: InvoiceLineItem[];
  
  // Totals
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  amountPaid?: number;
  amountDue?: number;
  
  // Additional info
  notes?: string;
  paymentTerms?: string;
  currency: string;
  
  // Branding
  primaryColor?: string;
  secondaryColor?: string;
}

export function generateInvoicePDF(invoiceData: InvoiceData, res: Response) {
  const doc = new PDFDocument({ 
    margin: 50,
    size: 'LETTER'
  });
  
  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceData.invoiceNumber}.pdf"`);
  
  // Pipe the PDF to the response
  doc.pipe(res);
  
  const primaryColor = invoiceData.primaryColor || '#667eea';
  const secondaryColor = invoiceData.secondaryColor || '#764ba2';
  
  // Header section with gradient background
  const headerHeight = 120;
  doc.rect(0, 0, doc.page.width, headerHeight)
     .linearGradient(0, 0, doc.page.width, 0, {
       '0': primaryColor,
       '1': secondaryColor
     })
     .fill();
  
  // Organization logo (if available)
  if (invoiceData.organizationLogo) {
    try {
      doc.image(invoiceData.organizationLogo, 50, 30, { 
        width: 150,
        height: 60,
        fit: [150, 60]
      });
    } catch (error) {
      console.error("Error loading logo:", error);
    }
  }
  
  // Invoice title
  doc.fontSize(28)
     .fillColor('#ffffff')
     .text('INVOICE', doc.page.width - 200, 45, { 
       align: 'right',
       width: 150
     });
  
  // Invoice number
  doc.fontSize(12)
     .text(`#${invoiceData.invoiceNumber}`, doc.page.width - 200, 75, {
       align: 'right',
       width: 150
     });
  
  // Reset position after header
  doc.y = headerHeight + 40;
  
  // Organization and Client details side by side
  const leftColumn = 50;
  const rightColumn = doc.page.width / 2 + 25;
  const detailsY = doc.y;
  
  // From section (Organization)
  doc.fontSize(10)
     .fillColor('#666666')
     .text('FROM:', leftColumn, detailsY);
  
  doc.fontSize(12)
     .fillColor('#000000')
     .text(invoiceData.organizationName, leftColumn, detailsY + 15, { width: 220 });
  
  let orgY = detailsY + 30;
  if (invoiceData.organizationAddress) {
    doc.fontSize(10)
       .fillColor('#666666')
       .text(invoiceData.organizationAddress, leftColumn, orgY, { width: 220 });
    orgY += 25;
  }
  if (invoiceData.organizationEmail) {
    doc.text(invoiceData.organizationEmail, leftColumn, orgY, { width: 220 });
    orgY += 15;
  }
  if (invoiceData.organizationPhone) {
    doc.text(invoiceData.organizationPhone, leftColumn, orgY, { width: 220 });
  }
  
  // Bill To section (Client)
  doc.fontSize(10)
     .fillColor('#666666')
     .text('BILL TO:', rightColumn, detailsY);
  
  doc.fontSize(12)
     .fillColor('#000000')
     .text(invoiceData.clientName, rightColumn, detailsY + 15, { width: 220 });
  
  let clientY = detailsY + 30;
  if (invoiceData.clientAddress) {
    doc.fontSize(10)
       .fillColor('#666666')
       .text(invoiceData.clientAddress, rightColumn, clientY, { width: 220 });
    clientY += 25;
  }
  if (invoiceData.clientEmail) {
    doc.text(invoiceData.clientEmail, rightColumn, clientY, { width: 220 });
    clientY += 15;
  }
  if (invoiceData.clientPhone) {
    doc.text(invoiceData.clientPhone, rightColumn, clientY, { width: 220 });
  }
  
  // Move to invoice details section
  doc.y = Math.max(orgY, clientY) + 40;
  
  // Invoice dates
  const datesY = doc.y;
  doc.fontSize(10)
     .fillColor('#666666')
     .text('Invoice Date:', leftColumn, datesY)
     .fillColor('#000000')
     .text(invoiceData.invoiceDate.toLocaleDateString(), leftColumn + 100, datesY);
  
  if (invoiceData.dueDate) {
    doc.fillColor('#666666')
       .text('Due Date:', leftColumn, datesY + 20)
       .fillColor('#000000')
       .text(invoiceData.dueDate.toLocaleDateString(), leftColumn + 100, datesY + 20);
  }
  
  // Line separator
  doc.y = datesY + 60;
  doc.strokeColor('#cccccc')
     .lineWidth(1)
     .moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke();
  
  doc.y += 20;
  
  // Line items table
  const tableTop = doc.y;
  const descriptionX = 50;
  const quantityX = doc.page.width - 300;
  const priceX = doc.page.width - 200;
  const totalX = doc.page.width - 100;
  
  // Table header
  doc.fontSize(10)
     .fillColor('#ffffff')
     .rect(50, tableTop, doc.page.width - 100, 25)
     .fill(primaryColor);
  
  doc.fillColor('#ffffff')
     .text('DESCRIPTION', descriptionX + 10, tableTop + 8, { width: 200 })
     .text('QTY', quantityX, tableTop + 8, { width: 50, align: 'right' })
     .text('PRICE', priceX, tableTop + 8, { width: 80, align: 'right' })
     .text('TOTAL', totalX, tableTop + 8, { width: 80, align: 'right' });
  
  // Table rows
  let itemY = tableTop + 35;
  doc.fillColor('#000000');
  
  for (const item of invoiceData.lineItems) {
    // Check if we need a new page
    if (itemY > 700) {
      doc.addPage();
      itemY = 50;
    }
    
    doc.fontSize(10)
       .text(item.description, descriptionX, itemY, { width: quantityX - descriptionX - 20 })
       .text(item.quantity.toString(), quantityX, itemY, { width: 50, align: 'right' })
       .text(`${formatCurrency(item.unitPrice, invoiceData.currency)}`, priceX, itemY, { width: 80, align: 'right' })
       .text(`${formatCurrency(item.total, invoiceData.currency)}`, totalX, itemY, { width: 80, align: 'right' });
    
    itemY += 30;
  }
  
  // Totals section
  const totalsX = doc.page.width - 250;
  let totalsY = itemY + 20;
  
  // Line separator before totals
  doc.strokeColor('#cccccc')
     .lineWidth(1)
     .moveTo(totalsX, totalsY)
     .lineTo(doc.page.width - 50, totalsY)
     .stroke();
  
  totalsY += 15;
  
  // Subtotal
  doc.fontSize(10)
     .fillColor('#666666')
     .text('Subtotal:', totalsX, totalsY)
     .fillColor('#000000')
     .text(formatCurrency(invoiceData.subtotal, invoiceData.currency), totalsX + 100, totalsY, { 
       align: 'right',
       width: 100
     });
  
  totalsY += 20;
  
  // Tax (if applicable)
  if (invoiceData.taxRate && invoiceData.taxAmount) {
    doc.fillColor('#666666')
       .text(`Tax (${invoiceData.taxRate}%):`, totalsX, totalsY)
       .fillColor('#000000')
       .text(formatCurrency(invoiceData.taxAmount, invoiceData.currency), totalsX + 100, totalsY, { 
         align: 'right',
         width: 100
       });
    
    totalsY += 20;
  }
  
  // Total
  doc.fontSize(14)
     .fillColor('#000000')
     .font('Helvetica-Bold')
     .text('Total:', totalsX, totalsY)
     .text(formatCurrency(invoiceData.total, invoiceData.currency), totalsX + 100, totalsY, { 
       align: 'right',
       width: 100
     });
  
  totalsY += 25;
  
  // Amount paid (if any)
  if (invoiceData.amountPaid && invoiceData.amountPaid > 0) {
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666666')
       .text('Amount Paid:', totalsX, totalsY)
       .fillColor('#22c55e')
       .text(formatCurrency(invoiceData.amountPaid, invoiceData.currency), totalsX + 100, totalsY, { 
         align: 'right',
         width: 100
       });
    
    totalsY += 20;
  }
  
  // Amount due
  if (invoiceData.amountDue !== undefined) {
    const amountDue = invoiceData.amountDue;
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#666666')
       .text('Amount Due:', totalsX, totalsY)
       .fillColor(amountDue > 0 ? '#dc2626' : '#22c55e')
       .text(formatCurrency(amountDue, invoiceData.currency), totalsX + 100, totalsY, { 
         align: 'right',
         width: 100
       });
  }
  
  // Notes section (if provided)
  if (invoiceData.notes) {
    doc.y = totalsY + 40;
    
    // Check if we need a new page
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#666666')
       .text('Notes:', 50, doc.y);
    
    doc.font('Helvetica')
       .fillColor('#000000')
       .text(invoiceData.notes, 50, doc.y + 15, { 
         width: doc.page.width - 100,
         align: 'left'
       });
  }
  
  // Payment terms section (if provided)
  if (invoiceData.paymentTerms) {
    doc.y += (invoiceData.notes ? 40 : 0);
    
    // Check if we need a new page
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#666666')
       .text('Payment Terms:', 50, doc.y);
    
    doc.font('Helvetica')
       .fillColor('#000000')
       .text(invoiceData.paymentTerms, 50, doc.y + 15, { 
         width: doc.page.width - 100,
         align: 'left'
       });
  }
  
  // Footer
  const footerY = doc.page.height - 50;
  doc.fontSize(8)
     .fillColor('#999999')
     .text(
       `Thank you for your business! | ${invoiceData.organizationName}`,
       50,
       footerY,
       { 
         align: 'center',
         width: doc.page.width - 100
       }
     );
  
  // Finalize the PDF
  doc.end();
}

function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(amount / 100);
}
