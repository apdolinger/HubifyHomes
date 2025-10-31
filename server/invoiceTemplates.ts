export type InvoiceTemplate = {
  id: 'modern' | 'minimal' | 'classic' | 'compact' | 'bold';
  name: string;
  description: string;
  
  // Header configuration
  header: {
    height: number;
    useGradient: boolean;
    logoPosition: 'left' | 'center' | 'right';
    logoMaxWidth: number;
    logoMaxHeight: number;
    titlePosition: 'left' | 'center' | 'right';
    titleFontSize: number;
    numberFontSize: number;
    titleColor: string; // 'white' | 'primary' | 'dark'
  };
  
  // Organization/Client details layout
  details: {
    layout: 'side-by-side' | 'stacked';
    labelColor: string;
    valueColor: string;
    labelFontSize: number;
    valueFontSize: number;
    spacing: number;
  };
  
  // Line items table styling
  table: {
    headerBgColor: 'primary' | 'dark' | 'light';
    headerTextColor: 'white' | 'dark';
    rowBorders: boolean;
    alternatingRows: boolean;
    alternateRowColor: string;
    cellPadding: number;
    fontSize: number;
  };
  
  // Totals section styling
  totals: {
    position: 'right' | 'full-width';
    boxed: boolean;
    boxColor?: string;
    labelColor: string;
    valueColor: string;
    totalFontSize: number;
    subtotalFontSize: number;
  };
  
  // General spacing and typography
  spacing: {
    sectionGap: number;
    marginX: number;
    marginY: number;
  };
};

export const invoiceTemplates: Record<string, InvoiceTemplate> = {
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean design with gradient header and side-by-side layout. Professional and contemporary.',
    
    header: {
      height: 120,
      useGradient: true,
      logoPosition: 'left',
      logoMaxWidth: 150,
      logoMaxHeight: 60,
      titlePosition: 'right',
      titleFontSize: 28,
      numberFontSize: 12,
      titleColor: 'white',
    },
    
    details: {
      layout: 'side-by-side',
      labelColor: '#666666',
      valueColor: '#000000',
      labelFontSize: 10,
      valueFontSize: 12,
      spacing: 25,
    },
    
    table: {
      headerBgColor: 'primary',
      headerTextColor: 'white',
      rowBorders: false,
      alternatingRows: false,
      alternateRowColor: '#f9fafb',
      cellPadding: 10,
      fontSize: 10,
    },
    
    totals: {
      position: 'right',
      boxed: false,
      labelColor: '#666666',
      valueColor: '#000000',
      totalFontSize: 14,
      subtotalFontSize: 10,
    },
    
    spacing: {
      sectionGap: 40,
      marginX: 50,
      marginY: 50,
    },
  },
  
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean design with minimal colors and maximum white space. Simple and elegant.',
    
    header: {
      height: 80,
      useGradient: false,
      logoPosition: 'left',
      logoMaxWidth: 120,
      logoMaxHeight: 50,
      titlePosition: 'right',
      titleFontSize: 24,
      numberFontSize: 11,
      titleColor: 'dark',
    },
    
    details: {
      layout: 'side-by-side',
      labelColor: '#999999',
      valueColor: '#333333',
      labelFontSize: 9,
      valueFontSize: 11,
      spacing: 20,
    },
    
    table: {
      headerBgColor: 'light',
      headerTextColor: 'dark',
      rowBorders: true,
      alternatingRows: false,
      alternateRowColor: '#ffffff',
      cellPadding: 12,
      fontSize: 10,
    },
    
    totals: {
      position: 'right',
      boxed: false,
      labelColor: '#999999',
      valueColor: '#333333',
      totalFontSize: 13,
      subtotalFontSize: 10,
    },
    
    spacing: {
      sectionGap: 50,
      marginX: 60,
      marginY: 60,
    },
  },
  
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional invoice layout with borders and structured sections. Timeless and formal.',
    
    header: {
      height: 100,
      useGradient: false,
      logoPosition: 'center',
      logoMaxWidth: 140,
      logoMaxHeight: 55,
      titlePosition: 'center',
      titleFontSize: 26,
      numberFontSize: 12,
      titleColor: 'dark',
    },
    
    details: {
      layout: 'stacked',
      labelColor: '#555555',
      valueColor: '#000000',
      labelFontSize: 10,
      valueFontSize: 11,
      spacing: 30,
    },
    
    table: {
      headerBgColor: 'dark',
      headerTextColor: 'white',
      rowBorders: true,
      alternatingRows: true,
      alternateRowColor: '#f5f5f5',
      cellPadding: 10,
      fontSize: 10,
    },
    
    totals: {
      position: 'right',
      boxed: true,
      boxColor: '#f0f0f0',
      labelColor: '#555555',
      valueColor: '#000000',
      totalFontSize: 14,
      subtotalFontSize: 10,
    },
    
    spacing: {
      sectionGap: 35,
      marginX: 50,
      marginY: 50,
    },
  },
  
  compact: {
    id: 'compact',
    name: 'Compact',
    description: 'Space-efficient layout perfect for detailed invoices. Maximum information density.',
    
    header: {
      height: 70,
      useGradient: false,
      logoPosition: 'left',
      logoMaxWidth: 100,
      logoMaxHeight: 40,
      titlePosition: 'right',
      titleFontSize: 20,
      numberFontSize: 10,
      titleColor: 'primary',
    },
    
    details: {
      layout: 'side-by-side',
      labelColor: '#777777',
      valueColor: '#222222',
      labelFontSize: 8,
      valueFontSize: 9,
      spacing: 15,
    },
    
    table: {
      headerBgColor: 'primary',
      headerTextColor: 'white',
      rowBorders: false,
      alternatingRows: true,
      alternateRowColor: '#fafafa',
      cellPadding: 6,
      fontSize: 9,
    },
    
    totals: {
      position: 'right',
      boxed: false,
      labelColor: '#777777',
      valueColor: '#222222',
      totalFontSize: 12,
      subtotalFontSize: 9,
    },
    
    spacing: {
      sectionGap: 25,
      marginX: 40,
      marginY: 40,
    },
  },
  
  bold: {
    id: 'bold',
    name: 'Bold',
    description: 'Eye-catching design with strong colors and large typography. Makes a statement.',
    
    header: {
      height: 140,
      useGradient: true,
      logoPosition: 'left',
      logoMaxWidth: 180,
      logoMaxHeight: 70,
      titlePosition: 'right',
      titleFontSize: 32,
      numberFontSize: 14,
      titleColor: 'white',
    },
    
    details: {
      layout: 'side-by-side',
      labelColor: '#444444',
      valueColor: '#000000',
      labelFontSize: 11,
      valueFontSize: 13,
      spacing: 30,
    },
    
    table: {
      headerBgColor: 'primary',
      headerTextColor: 'white',
      rowBorders: false,
      alternatingRows: true,
      alternateRowColor: '#f0f4ff',
      cellPadding: 12,
      fontSize: 11,
    },
    
    totals: {
      position: 'full-width',
      boxed: true,
      boxColor: '#f8fafc',
      labelColor: '#444444',
      valueColor: '#000000',
      totalFontSize: 16,
      subtotalFontSize: 11,
    },
    
    spacing: {
      sectionGap: 45,
      marginX: 50,
      marginY: 50,
    },
  },
};

export function getInvoiceTemplate(templateId: string): InvoiceTemplate {
  return invoiceTemplates[templateId] || invoiceTemplates.modern;
}
