import PDFDocument from "pdfkit";
import type { Response } from "express";
import { getInvoiceTemplate } from './invoiceTemplates.js';

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
  
  // Attachments
  attachments?: Array<{url: string, filename: string, category?: 'before' | 'after' | null}>;
}

export async function generateInvoicePDFToResponse(invoiceData: InvoiceData, res: Response) {
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
  const gradient = doc.linearGradient(0, 0, doc.page.width, 0);
  gradient.stop(0, primaryColor);
  gradient.stop(1, secondaryColor);
  doc.rect(0, 0, doc.page.width, headerHeight).fill(gradient);
  
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
  
  // Photos & Attachments section (if provided)
  if (invoiceData.attachments && invoiceData.attachments.length > 0) {
    doc.y = totalsY + 40;
    
    // Categorize photos
    const beforePhotos = invoiceData.attachments.filter(a => a.category === 'before');
    const afterPhotos = invoiceData.attachments.filter(a => a.category === 'after');
    const uncategorizedPhotos = invoiceData.attachments.filter(a => !a.category || a.category === null);
    
    const hasCategories = beforePhotos.length > 0 || afterPhotos.length > 0;
    
    // Check if we need a new page
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#666666')
       .text('Photos & Attachments', 50, doc.y, { underline: true });
    
    doc.y += 25;
    
    const imageWidth = 250;
    const imageSpacing = 15;
    const leftImageX = 50;
    const rightImageX = leftImageX + imageWidth + imageSpacing;
    
    // Render before/after photos side by side
    if (hasCategories) {
      let currentY = doc.y;
      const maxPhotos = Math.max(beforePhotos.length, afterPhotos.length);
      
      for (let i = 0; i < maxPhotos; i++) {
        const beforePhoto = beforePhotos[i];
        const afterPhoto = afterPhotos[i];
        
        // Check if we need a new page
        if (currentY > 550) {
          doc.addPage();
          currentY = 50;
        }
        
        // Render Before photo (left column)
        if (beforePhoto) {
          try {
            const response = await fetch(beforePhoto.url);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              // Add "BEFORE" label with amber color
              doc.fontSize(10)
                 .font('Helvetica-Bold')
                 .fillColor('#f59e0b')
                 .text('BEFORE', leftImageX, currentY, { width: imageWidth, align: 'center' });
              
              // Draw image
              doc.image(buffer, leftImageX, currentY + 15, { 
                fit: [imageWidth, 200],
                align: 'center'
              });
              
              // Add filename caption
              doc.fontSize(8)
                 .font('Helvetica')
                 .fillColor('#666666')
                 .text(beforePhoto.filename, leftImageX, currentY + 220, {
                   width: imageWidth,
                   align: 'center'
                 });
            }
          } catch (error) {
            console.error(`Failed to load before image ${beforePhoto.filename}:`, error);
          }
        }
        
        // Render After photo (right column)
        if (afterPhoto) {
          try {
            const response = await fetch(afterPhoto.url);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              // Add "AFTER" label with green color
              doc.fontSize(10)
                 .font('Helvetica-Bold')
                 .fillColor('#22c55e')
                 .text('AFTER', rightImageX, currentY, { width: imageWidth, align: 'center' });
              
              // Draw image
              doc.image(buffer, rightImageX, currentY + 15, { 
                fit: [imageWidth, 200],
                align: 'center'
              });
              
              // Add filename caption
              doc.fontSize(8)
                 .font('Helvetica')
                 .fillColor('#666666')
                 .text(afterPhoto.filename, rightImageX, currentY + 220, {
                   width: imageWidth,
                   align: 'center'
                 });
            }
          } catch (error) {
            console.error(`Failed to load after image ${afterPhoto.filename}:`, error);
          }
        }
        
        currentY += 240; // Label + image + caption + spacing
      }
      
      doc.y = currentY + 20;
    }
    
    // Render uncategorized photos in standard grid
    if (uncategorizedPhotos.length > 0) {
      if (hasCategories) {
        doc.y += 20;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#666666')
           .text('Additional Photos', 50, doc.y);
        doc.y += 20;
      }
      
      let currentImageY = doc.y;
      let currentColumn = 0;
      
      for (let i = 0; i < uncategorizedPhotos.length; i++) {
        const attachment = uncategorizedPhotos[i];
        
        try {
          const response = await fetch(attachment.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          if (currentImageY > 550) {
            doc.addPage();
            currentImageY = 50;
            currentColumn = 0;
          }
          
          const imageX = currentColumn === 0 ? leftImageX : rightImageX;
          
          doc.image(buffer, imageX, currentImageY, { 
            fit: [imageWidth, 250],
            align: 'center'
          });
          
          const imageHeight = 250;
          
          doc.fontSize(8)
             .font('Helvetica')
             .fillColor('#666666')
             .text(attachment.filename, imageX, currentImageY + imageHeight + 5, {
               width: imageWidth,
               align: 'center'
             });
          
          if (currentColumn === 0) {
            currentColumn = 1;
          } else {
            currentColumn = 0;
            currentImageY += imageHeight + 40;
          }
          
        } catch (error) {
          console.error(`Failed to load image ${attachment.filename}:`, error);
          continue;
        }
      }
      
      if (currentColumn === 1) {
        doc.y = currentImageY + 250 + 40;
      } else {
        doc.y = currentImageY;
      }
    }
  }
  
  // Notes section (if provided)
  if (invoiceData.notes) {
    // Only add spacing if attachments weren't shown
    if (!invoiceData.attachments || invoiceData.attachments.length === 0) {
      doc.y = totalsY + 40;
    } else {
      doc.y += 20; // Small spacing after attachments
    }
    
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
    if (invoiceData.notes) {
      doc.y += 40;
    } else if (!invoiceData.attachments || invoiceData.attachments.length === 0) {
      doc.y = totalsY + 40;
    } else {
      doc.y += 20; // Small spacing after attachments
    }
    
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

// New function that generates PDF and returns a Buffer (for email attachments and storage)
export async function generateInvoicePDF(invoice: any, client: any, org: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'LETTER'
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      const primaryColor = org.primaryColor || '#667eea';
      const secondaryColor = org.secondaryColor || '#764ba2';
      
      // Header section with gradient background
      const headerHeight = 120;
      const gradient = doc.linearGradient(0, 0, doc.page.width, 0);
      gradient.stop(0, primaryColor);
      gradient.stop(1, secondaryColor);
      doc.rect(0, 0, doc.page.width, headerHeight).fill(gradient);
      
      // Organization logo (if available)
      if (org.logoUrl) {
        try {
          const logoResponse = await fetch(org.logoUrl);
          if (logoResponse.ok) {
            const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
            doc.image(logoBuffer, 50, 30, { 
              width: 150,
              height: 60,
              fit: [150, 60]
            });
          }
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
         .text(`#${invoice.invoiceNumber}`, doc.page.width - 200, 75, {
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
         .text(org.name, leftColumn, detailsY + 15, { width: 220 });
      
      let orgY = detailsY + 30;
      if (org.address) {
        doc.fontSize(10)
           .fillColor('#666666')
           .text(org.address, leftColumn, orgY, { width: 220 });
        orgY += 25;
      }
      if (org.email) {
        doc.text(org.email, leftColumn, orgY, { width: 220 });
        orgY += 15;
      }
      if (org.phone) {
        doc.text(org.phone, leftColumn, orgY, { width: 220 });
      }
      
      // Bill To section (Client)
      doc.fontSize(10)
         .fillColor('#666666')
         .text('BILL TO:', rightColumn, detailsY);
      
      const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
      doc.fontSize(12)
         .fillColor('#000000')
         .text(clientName, rightColumn, detailsY + 15, { width: 220 });
      
      let clientY = detailsY + 30;
      if (client.address) {
        doc.fontSize(10)
           .fillColor('#666666')
           .text(client.address, rightColumn, clientY, { width: 220 });
        clientY += 25;
      }
      if (client.email) {
        doc.text(client.email, rightColumn, clientY, { width: 220 });
        clientY += 15;
      }
      if (client.phone) {
        doc.text(client.phone, rightColumn, clientY, { width: 220 });
      }
      
      // Move to invoice details section
      doc.y = Math.max(orgY, clientY) + 40;
      
      // Invoice dates
      const datesY = doc.y;
      doc.fontSize(10)
         .fillColor('#666666')
         .text('Invoice Date:', leftColumn, datesY)
         .fillColor('#000000')
         .text(new Date(invoice.issuedAt).toLocaleDateString(), leftColumn + 100, datesY);
      
      if (invoice.dueDate) {
        doc.fillColor('#666666')
           .text('Due Date:', leftColumn, datesY + 20)
           .fillColor('#000000')
           .text(new Date(invoice.dueDate).toLocaleDateString(), leftColumn + 100, datesY + 20);
      }
      
      // Check if this is a consolidated invoice
      const isConsolidated = invoice.metadata?.consolidatedInvoice === true;
      
      if (isConsolidated) {
        doc.fillColor('#666666')
           .text('Type:', leftColumn, datesY + 40)
           .fillColor('#0066cc')
           .font('Helvetica-Bold')
           .text(`Consolidated (${invoice.metadata.submissionCount} submissions)`, leftColumn + 100, datesY + 40);
        doc.font('Helvetica'); // Reset font
      }
      
      // Line separator
      doc.y = datesY + (isConsolidated ? 80 : 60);
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
      
      const lineItems = invoice.lineItems || [];
      for (const item of lineItems) {
        // Check if we need a new page
        if (itemY > 700) {
          doc.addPage();
          itemY = 50;
        }
        
        doc.fontSize(10)
           .text(item.description, descriptionX, itemY, { width: quantityX - descriptionX - 20 })
           .text(item.quantity.toString(), quantityX, itemY, { width: 50, align: 'right' })
           .text(formatCurrency(item.unitAmountCents, invoice.currency || 'usd'), priceX, itemY, { width: 80, align: 'right' })
           .text(formatCurrency(item.totalCents, invoice.currency || 'usd'), totalX, itemY, { width: 80, align: 'right' });
        
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
      
      // Total
      doc.fontSize(14)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Total:', totalsX, totalsY)
         .text(formatCurrency(invoice.amountCents, invoice.currency || 'usd'), totalsX + 100, totalsY, { 
           align: 'right',
           width: 100
         });
      
      totalsY += 25;
      
      // Amount paid (if any)
      if (invoice.paidAt && invoice.amountCents) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text('Amount Paid:', totalsX, totalsY)
           .fillColor('#22c55e')
           .text(formatCurrency(invoice.amountCents, invoice.currency || 'usd'), totalsX + 100, totalsY, { 
             align: 'right',
             width: 100
           });
        
        totalsY += 20;
      }
      
      // Amount due
      const amountDue = invoice.paidAt ? 0 : invoice.amountCents;
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#666666')
         .text('Amount Due:', totalsX, totalsY)
         .fillColor(amountDue > 0 ? '#dc2626' : '#22c55e')
         .text(formatCurrency(amountDue, invoice.currency || 'usd'), totalsX + 100, totalsY, { 
           align: 'right',
           width: 100
         });
      
      // Photos & Attachments section (if provided)
      if (invoice.attachments && invoice.attachments.length > 0) {
        doc.y = totalsY + 40;
        
        // Categorize photos
        const beforePhotos = invoice.attachments.filter((a: any) => a.category === 'before');
        const afterPhotos = invoice.attachments.filter((a: any) => a.category === 'after');
        const uncategorizedPhotos = invoice.attachments.filter((a: any) => !a.category || a.category === null);
        
        const hasCategories = beforePhotos.length > 0 || afterPhotos.length > 0;
        
        // Check if we need a new page
        if (doc.y > 650) {
          doc.addPage();
          doc.y = 50;
        }
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#666666')
           .text('Photos & Attachments', 50, doc.y, { underline: true });
        
        doc.y += 25;
        
        const imageWidth = 250;
        const imageSpacing = 15;
        const leftImageX = 50;
        const rightImageX = leftImageX + imageWidth + imageSpacing;
        
        // Render before/after photos side by side
        if (hasCategories) {
          let currentY = doc.y;
          const maxPhotos = Math.max(beforePhotos.length, afterPhotos.length);
          
          for (let i = 0; i < maxPhotos; i++) {
            const beforePhoto = beforePhotos[i];
            const afterPhoto = afterPhotos[i];
            
            // Check if we need a new page
            if (currentY > 550) {
              doc.addPage();
              currentY = 50;
            }
            
            // Render Before photo (left column)
            if (beforePhoto) {
              try {
                const response = await fetch(beforePhoto.url);
                if (response.ok) {
                  const arrayBuffer = await response.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  
                  // Add "BEFORE" label with amber color
                  doc.fontSize(10)
                     .font('Helvetica-Bold')
                     .fillColor('#f59e0b')
                     .text('BEFORE', leftImageX, currentY, { width: imageWidth, align: 'center' });
                  
                  // Draw image
                  doc.image(buffer, leftImageX, currentY + 15, { 
                    fit: [imageWidth, 200],
                    align: 'center'
                  });
                  
                  // Add filename caption
                  doc.fontSize(8)
                     .font('Helvetica')
                     .fillColor('#666666')
                     .text(beforePhoto.filename, leftImageX, currentY + 220, {
                       width: imageWidth,
                       align: 'center'
                     });
                }
              } catch (error) {
                console.error(`Failed to load before image ${beforePhoto.filename}:`, error);
              }
            }
            
            // Render After photo (right column)
            if (afterPhoto) {
              try {
                const response = await fetch(afterPhoto.url);
                if (response.ok) {
                  const arrayBuffer = await response.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  
                  // Add "AFTER" label with green color
                  doc.fontSize(10)
                     .font('Helvetica-Bold')
                     .fillColor('#22c55e')
                     .text('AFTER', rightImageX, currentY, { width: imageWidth, align: 'center' });
                  
                  // Draw image
                  doc.image(buffer, rightImageX, currentY + 15, { 
                    fit: [imageWidth, 200],
                    align: 'center'
                  });
                  
                  // Add filename caption
                  doc.fontSize(8)
                     .font('Helvetica')
                     .fillColor('#666666')
                     .text(afterPhoto.filename, rightImageX, currentY + 220, {
                       width: imageWidth,
                       align: 'center'
                     });
                }
              } catch (error) {
                console.error(`Failed to load after image ${afterPhoto.filename}:`, error);
              }
            }
            
            currentY += 240; // Label + image + caption + spacing
          }
          
          doc.y = currentY + 20;
        }
        
        // Render uncategorized photos in standard grid
        if (uncategorizedPhotos.length > 0) {
          if (hasCategories) {
            doc.y += 20;
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor('#666666')
               .text('Additional Photos', 50, doc.y);
            doc.y += 20;
          }
          
          let currentImageY = doc.y;
          let currentColumn = 0;
          
          for (let i = 0; i < uncategorizedPhotos.length; i++) {
            const attachment = uncategorizedPhotos[i];
            
            try {
              const response = await fetch(attachment.url);
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
              }
              
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              if (currentImageY > 550) {
                doc.addPage();
                currentImageY = 50;
                currentColumn = 0;
              }
              
              const imageX = currentColumn === 0 ? leftImageX : rightImageX;
              
              doc.image(buffer, imageX, currentImageY, { 
                fit: [imageWidth, 250],
                align: 'center'
              });
              
              const imageHeight = 250;
              
              doc.fontSize(8)
                 .font('Helvetica')
                 .fillColor('#666666')
                 .text(attachment.filename, imageX, currentImageY + imageHeight + 5, {
                   width: imageWidth,
                   align: 'center'
                 });
              
              if (currentColumn === 0) {
                currentColumn = 1;
              } else {
                currentColumn = 0;
                currentImageY += imageHeight + 35;
              }
              
            } catch (error) {
              console.error(`Error adding attachment ${attachment.filename}:`, error);
            }
          }
          
          if (currentColumn === 1) {
            doc.y = currentImageY + 250 + 35;
          } else {
            doc.y = currentImageY;
          }
        }
      }
      
      // Notes section (if provided)
      if (invoice.metadata?.notes || invoice.description) {
        // Only add spacing if attachments weren't shown
        if (!invoice.attachments || invoice.attachments.length === 0) {
          doc.y = totalsY + 40;
        } else {
          doc.y += 20; // Small spacing after attachments
        }
        
        // Check if we need a new page
        if (doc.y > 650) {
          doc.addPage();
          doc.y = 50;
        }
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#666666')
           .text('Description & Notes:', 50, doc.y);
        
        doc.font('Helvetica')
           .fillColor('#000000')
           .text(invoice.description || '', 50, doc.y + 15, { 
             width: doc.page.width - 100,
             align: 'left'
           });
        
        if (invoice.metadata?.notes) {
          doc.y += 30;
          doc.text(invoice.metadata.notes, 50, doc.y, {
            width: doc.page.width - 100,
            align: 'left'
          });
        }
      }
      
      // Footer
      const footerY = doc.page.height - 50;
      doc.fontSize(8)
         .fillColor('#999999')
         .text(
           `Thank you for your business! | ${org.name}`,
           50,
           footerY,
           { 
             align: 'center',
             width: doc.page.width - 100
           }
         );
      
      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Template-aware PDF generation function
export async function generateInvoicePDFWithTemplate(
  invoice: any, 
  client: any, 
  org: any,
  templateId: string = 'modern'
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const template = getInvoiceTemplate(templateId);
      const primaryColor = org.branding?.primaryColor || '#667eea';
      const secondaryColor = org.branding?.secondaryColor || '#764ba2';
      
      const doc = new PDFDocument({ 
        margin: template.spacing.marginY,
        size: 'LETTER'
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      // HEADER SECTION
      if (template.header.useGradient) {
        const gradient = doc.linearGradient(0, 0, doc.page.width, 0);
        gradient.stop(0, primaryColor);
        gradient.stop(1, secondaryColor);
        doc.rect(0, 0, doc.page.width, template.header.height).fill(gradient);
      } else if (templateId === 'classic') {
        doc.rect(0, 0, doc.page.width, template.header.height).fill('#f8f9fa');
      }
      
      // Logo
      if (org.branding?.logo) {
        try {
          const logoResponse = await fetch(org.branding.logo);
          if (logoResponse.ok) {
            const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
            let logoX = template.spacing.marginX;
            
            if (template.header.logoPosition === 'center') {
              logoX = (doc.page.width - template.header.logoMaxWidth) / 2;
            } else if (template.header.logoPosition === 'right') {
              logoX = doc.page.width - template.header.logoMaxWidth - template.spacing.marginX;
            }
            
            doc.image(logoBuffer, logoX, 30, { 
              width: template.header.logoMaxWidth,
              height: template.header.logoMaxHeight,
              fit: [template.header.logoMaxWidth, template.header.logoMaxHeight]
            });
          }
        } catch (error) {
          console.error("Error loading logo:", error);
        }
      }
      
      // Invoice title
      const titleColor = template.header.titleColor === 'white' ? '#ffffff' : 
                        template.header.titleColor === 'dark' ? '#000000' : primaryColor;
      
      let titleX = doc.page.width - 200;
      let titleAlign: 'left' | 'right' | 'center' = 'right';
      
      if (template.header.titlePosition === 'left') {
        titleX = template.spacing.marginX;
        titleAlign = 'left';
      } else if (template.header.titlePosition === 'center') {
        titleX = template.spacing.marginX;
        titleAlign = 'center';
      }
      
      doc.fontSize(template.header.titleFontSize)
         .fillColor(titleColor)
         .text('INVOICE', titleX, 45, { 
           align: titleAlign,
           width: template.header.titlePosition === 'center' ? doc.page.width - 2 * template.spacing.marginX : 150
         });
      
      doc.fontSize(template.header.numberFontSize)
         .text(`#${invoice.invoiceNumber}`, titleX, 75, {
           align: titleAlign,
           width: template.header.titlePosition === 'center' ? doc.page.width - 2 * template.spacing.marginX : 150
         });
      
      // DETAILS SECTION
      doc.y = template.header.height + template.spacing.sectionGap;
      
      if (template.details.layout === 'side-by-side') {
        const leftColumn = template.spacing.marginX;
        const rightColumn = doc.page.width / 2 + 25;
        const detailsY = doc.y;
        
        // FROM section
        doc.fontSize(template.details.labelFontSize)
           .fillColor(template.details.labelColor)
           .text('FROM:', leftColumn, detailsY);
        
        doc.fontSize(template.details.valueFontSize)
           .fillColor(template.details.valueColor)
           .text(org.name, leftColumn, detailsY + 15, { width: 220 });
        
        let orgY = detailsY + 30;
        if (org.address) {
          doc.fontSize(template.details.labelFontSize)
             .fillColor(template.details.labelColor)
             .text(org.address, leftColumn, orgY, { width: 220 });
          orgY += template.details.spacing;
        }
        if (org.email) {
          doc.text(org.email, leftColumn, orgY, { width: 220 });
          orgY += 15;
        }
        if (org.phone) {
          doc.text(org.phone, leftColumn, orgY, { width: 220 });
        }
        
        // BILL TO section
        doc.fontSize(template.details.labelFontSize)
           .fillColor(template.details.labelColor)
           .text('BILL TO:', rightColumn, detailsY);
        
        const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
        doc.fontSize(template.details.valueFontSize)
           .fillColor(template.details.valueColor)
           .text(clientName, rightColumn, detailsY + 15, { width: 220 });
        
        let clientY = detailsY + 30;
        if (client.address) {
          doc.fontSize(template.details.labelFontSize)
             .fillColor(template.details.labelColor)
             .text(client.address, rightColumn, clientY, { width: 220 });
          clientY += template.details.spacing;
        }
        if (client.email) {
          doc.text(client.email, rightColumn, clientY, { width: 220 });
          clientY += 15;
        }
        if (client.phone) {
          doc.text(client.phone, rightColumn, clientY, { width: 220 });
        }
        
        doc.y = Math.max(orgY, clientY) + template.spacing.sectionGap;
      } else {
        // Stacked layout
        const centerX = template.spacing.marginX;
        doc.fontSize(template.details.labelFontSize)
           .fillColor(template.details.labelColor)
           .text('FROM:', centerX, doc.y);
        
        doc.fontSize(template.details.valueFontSize)
           .fillColor(template.details.valueColor)
           .text(org.name, centerX, doc.y + 15, { width: doc.page.width - 2 * template.spacing.marginX });
        
        doc.y += template.details.spacing + 30;
        
        doc.fontSize(template.details.labelFontSize)
           .fillColor(template.details.labelColor)
           .text('BILL TO:', centerX, doc.y);
        
        const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
        doc.fontSize(template.details.valueFontSize)
           .fillColor(template.details.valueColor)
           .text(clientName, centerX, doc.y + 15, { width: doc.page.width - 2 * template.spacing.marginX });
        
        doc.y += template.spacing.sectionGap + 20;
      }
      
      // Invoice dates
      const datesY = doc.y;
      doc.fontSize(template.details.labelFontSize)
         .fillColor(template.details.labelColor)
         .text('Invoice Date:', template.spacing.marginX, datesY)
         .fillColor(template.details.valueColor)
         .text(new Date(invoice.issuedAt).toLocaleDateString(), template.spacing.marginX + 100, datesY);
      
      if (invoice.dueDate) {
        doc.fillColor(template.details.labelColor)
           .text('Due Date:', template.spacing.marginX, datesY + 20)
           .fillColor(template.details.valueColor)
           .text(new Date(invoice.dueDate).toLocaleDateString(), template.spacing.marginX + 100, datesY + 20);
      }
      
      doc.y = datesY + 60;
      
      // TABLE SECTION
      const tableTop = doc.y;
      const descriptionX = template.spacing.marginX;
      const quantityX = doc.page.width - 300;
      const priceX = doc.page.width - 200;
      const totalX = doc.page.width - 100;
      
      // Table header
      const headerBg = template.table.headerBgColor === 'primary' ? primaryColor :
                      template.table.headerBgColor === 'dark' ? '#333333' : '#f0f0f0';
      const headerText = template.table.headerTextColor === 'white' ? '#ffffff' : '#333333';
      
      doc.fontSize(template.table.fontSize)
         .fillColor(headerText)
         .rect(template.spacing.marginX, tableTop, doc.page.width - 2 * template.spacing.marginX, 25)
         .fill(headerBg);
      
      doc.fillColor(headerText)
         .text('DESCRIPTION', descriptionX + template.table.cellPadding, tableTop + 8, { width: 200 })
         .text('QTY', quantityX, tableTop + 8, { width: 50, align: 'right' })
         .text('PRICE', priceX, tableTop + 8, { width: 80, align: 'right' })
         .text('TOTAL', totalX, tableTop + 8, { width: 80, align: 'right' });
      
      // Table rows
      let itemY = tableTop + 35;
      doc.fillColor('#000000');
      
      const lineItems = invoice.lineItems || [];
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        
        if (itemY > 700) {
          doc.addPage();
          itemY = 50;
        }
        
        if (template.table.alternatingRows && i % 2 === 1) {
          doc.rect(template.spacing.marginX, itemY - 5, doc.page.width - 2 * template.spacing.marginX, 30)
             .fill(template.table.alternateRowColor);
        }
        
        doc.fontSize(template.table.fontSize)
           .fillColor('#000000')
           .text(item.description, descriptionX, itemY, { width: quantityX - descriptionX - 20 })
           .text(item.quantity.toString(), quantityX, itemY, { width: 50, align: 'right' })
           .text(formatCurrency(item.unitPrice, invoice.currency || 'usd'), priceX, itemY, { width: 80, align: 'right' })
           .text(formatCurrency(item.total, invoice.currency || 'usd'), totalX, itemY, { width: 80, align: 'right' });
        
        if (template.table.rowBorders) {
          doc.strokeColor('#e0e0e0')
             .lineWidth(0.5)
             .moveTo(template.spacing.marginX, itemY + 25)
             .lineTo(doc.page.width - template.spacing.marginX, itemY + 25)
             .stroke();
        }
        
        itemY += 30;
      }
      
      // TOTALS SECTION
      const totalsX = template.totals.position === 'full-width' ? template.spacing.marginX : doc.page.width - 250;
      let totalsY = itemY + template.spacing.sectionGap;
      
      if (template.totals.boxed && template.totals.boxColor) {
        const boxWidth = template.totals.position === 'full-width' ? doc.page.width - 2 * template.spacing.marginX : 200;
        doc.rect(totalsX, totalsY - 10, boxWidth, 100)
           .fill(template.totals.boxColor);
      }
      
      doc.fontSize(template.totals.subtotalFontSize)
         .fillColor(template.totals.labelColor)
         .text('Subtotal:', totalsX, totalsY)
         .fillColor(template.totals.valueColor)
         .text(formatCurrency(invoice.amountCents, invoice.currency || 'usd'), totalsX + 100, totalsY, { 
           align: 'right',
           width: 100
         });
      
      totalsY += 25;
      
      doc.fontSize(template.totals.totalFontSize)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Total:', totalsX, totalsY)
         .text(formatCurrency(invoice.amountCents, invoice.currency || 'usd'), totalsX + 100, totalsY, { 
           align: 'right',
           width: 100
         });
      
      // Footer
      const footerY = doc.page.height - 50;
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#999999')
         .text(
           `Thank you for your business! | ${org.name}`,
           template.spacing.marginX,
           footerY,
           { 
             align: 'center',
             width: doc.page.width - 2 * template.spacing.marginX
           }
         );
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
