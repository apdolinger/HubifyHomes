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
  
  // Attachments
  attachments?: Array<{url: string, filename: string}>;
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
    let currentImageY = doc.y;
    let currentColumn = 0; // 0 for left, 1 for right
    
    for (let i = 0; i < invoiceData.attachments.length; i++) {
      const attachment = invoiceData.attachments[i];
      
      try {
        // Fetch image from URL
        const response = await fetch(attachment.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Check if we need a new page (leave room for image + caption)
        if (currentImageY > 550) {
          doc.addPage();
          currentImageY = 50;
          currentColumn = 0;
        }
        
        // Calculate X position based on column
        const imageX = currentColumn === 0 ? leftImageX : rightImageX;
        
        // Draw image - PDFKit will auto-fit to the specified dimensions
        doc.image(buffer, imageX, currentImageY, { 
          fit: [imageWidth, 250],
          align: 'center'
        });
        
        // Use max height for consistent spacing
        const imageHeight = 250;
        
        // Add filename caption below image
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#666666')
           .text(attachment.filename, imageX, currentImageY + imageHeight + 5, {
             width: imageWidth,
             align: 'center'
           });
        
        // Move to next column or next row
        if (currentColumn === 0) {
          // Move to right column
          currentColumn = 1;
        } else {
          // Move to next row (left column)
          currentColumn = 0;
          currentImageY += imageHeight + 40; // Image height + caption + spacing
        }
        
      } catch (error) {
        console.error(`Failed to load image ${attachment.filename}:`, error);
        // Skip this image and continue with the next one
        continue;
      }
    }
    
    // Update doc.y for subsequent sections
    // If we ended on the right column, we need to move down
    if (currentColumn === 1) {
      doc.y = currentImageY + 250 + 40; // Assume max height for the last row
    } else {
      doc.y = currentImageY;
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
        let currentImageY = doc.y;
        let currentColumn = 0; // 0 for left, 1 for right
        
        for (let i = 0; i < invoice.attachments.length; i++) {
          const attachment = invoice.attachments[i];
          
          try {
            // Fetch image from URL
            const response = await fetch(attachment.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Check if we need a new page (leave room for image + caption)
            if (currentImageY > 550) {
              doc.addPage();
              currentImageY = 50;
              currentColumn = 0;
            }
            
            // Calculate X position based on column
            const imageX = currentColumn === 0 ? leftImageX : rightImageX;
            
            // Draw image - PDFKit will auto-fit to the specified dimensions
            doc.image(buffer, imageX, currentImageY, { 
              fit: [imageWidth, 250],
              align: 'center'
            });
            
            // Use max height for consistent spacing
            const imageHeight = 250;
            
            // Add filename caption below image
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#666666')
               .text(attachment.filename, imageX, currentImageY + imageHeight + 5, {
                 width: imageWidth,
                 align: 'center'
               });
            
            // Move to next column or next row
            if (currentColumn === 0) {
              // Move to right column
              currentColumn = 1;
            } else {
              // Move to next row
              currentColumn = 0;
              currentImageY += imageHeight + 35; // Image height + caption + spacing
            }
          } catch (error) {
            console.error(`Error adding attachment ${attachment.filename}:`, error);
          }
        }
        
        // Update doc.y to be after the last row of images
        if (currentColumn === 1) {
          doc.y = currentImageY + 250 + 35; // Last image height + caption
        } else {
          doc.y = currentImageY;
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
