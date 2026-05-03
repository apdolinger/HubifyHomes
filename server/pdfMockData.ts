// Sample data factories for the PDF Mockup Gallery (Task #36).
// All values are hard-coded placeholder data — never written to the DB.

export interface SampleLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SampleInvoice {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  terms: string;
  org: { name: string; address: string; email: string; phone: string };
  client: { name: string; address: string; email: string; phone: string };
  lineItems: SampleLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  payLink: string;
  notes: string;
}

export interface SampleConsolidatedInvoice {
  batchNumber: string;
  billingPeriod: string;
  client: { name: string; primaryContact: string; mailingAddress: string };
  properties: { propertyNumber: string; address: string; subtotal: number }[];
  groups: { property: string; items: SampleLineItem[] }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  payLink: string;
}

export interface SampleInspection {
  taskTitle: string;
  propertyAddress: string;
  dueDate: string;
  inspector: string;
  ownerNotes: string;
  summary: { overallScore: number; passed: number; failed: number; na: number; pending: number };
  failedItems: { text: string; note: string }[];
  groups: { category: string; items: { text: string; result: "pass" | "fail" | "na" }[] }[];
  photos: string[];
}

export interface SamplePropertyReport {
  property: {
    number: string; address: string; type: string; tier: string; status: string;
    bedBath: string; sqft: string; yearBuilt: string; poolSpa: string;
  };
  contacts: { owner: string; manager: string; emergency: string };
  access: { gateCode: string; garageCode: string; alarm: string; lockbox: string };
  vendors: { name: string; service: string; contact: string; rating: string }[];
  recentTasks: { date: string; title: string; status: string }[];
  upcomingInspections: { date: string; title: string; assignee: string }[];
}

export interface SampleTimeReport {
  dateRange: string;
  groupBy: "Employee" | "Property";
  billableFilter: string;
  totals: { label: string; value: string }[];
  rows: {
    name: string; total: string; billable: string; nonBillable: string;
    billableAmount: string; entries: number;
    breakdown: { label: string; total: string; amount: string }[];
  }[];
}

export function getSampleInvoice(): SampleInvoice {
  const lineItems: SampleLineItem[] = [
    { description: "Home Watch — April 2026 (4 weekly visits)", quantity: 4, unitPrice: 75, total: 300 },
    { description: "Pool Service — April 2026", quantity: 4, unitPrice: 45, total: 180 },
    { description: "Storm Prep — Pre-season inspection", quantity: 1, unitPrice: 250, total: 250 },
    { description: "Light bulb replacement (parts + labor)", quantity: 1, unitPrice: 32.5, total: 32.5 },
  ];
  const subtotal = 762.5;
  const taxRate = 6.0;
  const taxAmount = 45.75;
  const total = 808.25;
  return {
    invoiceNumber: "INV-2026-0042",
    issueDate: "May 02, 2026",
    dueDate: "May 16, 2026",
    terms: "Net 14",
    org: {
      name: "Acme Property Management",
      address: "123 Main St, Suite 200\nNaples, FL 34102",
      email: "billing@acmepm.com",
      phone: "(239) 555-0142",
    },
    client: {
      name: "Jane Owner",
      address: "789 Beachfront Dr\nMarco Island, FL 34145",
      email: "jane.owner@example.com",
      phone: "(239) 555-9988",
    },
    lineItems,
    subtotal, taxRate, taxAmount, total,
    amountPaid: 0,
    amountDue: total,
    payLink: "https://acmepm.hubify.app/pay/INV-2026-0042",
    notes: "Thank you for your business. Please contact us with any questions about this invoice within 7 days of receipt.",
  };
}

export function getSampleConsolidatedInvoice(): SampleConsolidatedInvoice {
  return {
    batchNumber: "BATCH-2026-04",
    billingPeriod: "Apr 01–30, 2026",
    client: {
      name: "Sunset Properties LLC (3 properties)",
      primaryContact: "Robert Sunset · robert@sunset.example",
      mailingAddress: "500 Harbor Ave\nNaples, FL 34102",
    },
    properties: [
      { propertyNumber: "P-204", address: "789 Beachfront Dr, Marco Island", subtotal: 432.00 },
      { propertyNumber: "P-118", address: "12 Palm Ct, Naples", subtotal: 598.50 },
      { propertyNumber: "P-077", address: "3401 Gulf Shore Blvd N, Naples", subtotal: 1245.75 },
    ],
    groups: [
      { property: "P-204 · 789 Beachfront Dr", items: [
        { description: "Weekly home watch (4x)", quantity: 4, unitPrice: 75, total: 300 },
        { description: "Pool service (4x)", quantity: 4, unitPrice: 33, total: 132 },
      ]},
      { property: "P-118 · 12 Palm Ct", items: [
        { description: "Weekly home watch (4x)", quantity: 4, unitPrice: 85, total: 340 },
        { description: "HVAC filter replacement", quantity: 1, unitPrice: 58.5, total: 58.5 },
        { description: "Lawn touch-up (vendor reimb.)", quantity: 1, unitPrice: 200, total: 200 },
      ]},
      { property: "P-077 · 3401 Gulf Shore Blvd N", items: [
        { description: "Weekly home watch (4x)", quantity: 4, unitPrice: 110, total: 440 },
        { description: "Storm prep inspection", quantity: 1, unitPrice: 350, total: 350 },
        { description: "Bulb + smoke alarm replacement", quantity: 1, unitPrice: 95.75, total: 95.75 },
        { description: "Vendor coordination — pool repair", quantity: 3, unitPrice: 120, total: 360 },
      ]},
    ],
    subtotal: 2276.25,
    taxRate: 6.0,
    taxAmount: 136.58,
    total: 2412.83,
    payLink: "https://acmepm.hubify.app/pay/BATCH-2026-04",
  };
}

export function getSampleInspection(): SampleInspection {
  return {
    taskTitle: "Monthly Home Watch — 789 Beachfront Dr",
    propertyAddress: "789 Beachfront Dr, Marco Island",
    dueDate: "May 02, 2026",
    inspector: "Sarah Chen",
    ownerNotes: "Owner request: please verify the upstairs A/C and check for any storm damage from last week.",
    summary: { overallScore: 92, passed: 23, failed: 1, na: 1, pending: 0 },
    failedItems: [
      { text: "Master bathroom — slow leak under sink",
        note: "Photo attached. Recommend plumber within 7 days. Towels placed under trap, water shutoff confirmed accessible." },
    ],
    groups: [
      { category: "Exterior", items: [
        { text: "Roof — visible damage", result: "pass" },
        { text: "Gutters & downspouts clear", result: "pass" },
        { text: "Pool equipment running", result: "pass" },
        { text: "Landscaping condition", result: "pass" },
        { text: "Storm shutters secured", result: "pass" },
      ]},
      { category: "Interior", items: [
        { text: "Front door / locks", result: "pass" },
        { text: "Windows secured", result: "pass" },
        { text: "A/C running, set to 78°F", result: "pass" },
        { text: "Refrigerator temperature", result: "pass" },
        { text: "Master bath plumbing", result: "fail" },
        { text: "Toilets flush correctly", result: "pass" },
      ]},
      { category: "Safety", items: [
        { text: "Smoke detectors", result: "pass" },
        { text: "CO detectors", result: "pass" },
        { text: "Fire extinguisher", result: "na" },
        { text: "Water shutoff accessible", result: "pass" },
      ]},
    ],
    photos: ["photo_1.jpg", "photo_2.jpg", "photo_3.jpg", "photo_4.jpg"],
  };
}

export function getSamplePropertyReport(): SamplePropertyReport {
  return {
    property: {
      number: "P-204",
      address: "789 Beachfront Dr · Marco Island, FL 34145",
      type: "Single Family Home", tier: "Premium", status: "Active",
      bedBath: "4 BR / 3.5 BA", sqft: "3,420", yearBuilt: "2014", poolSpa: "Yes / Yes",
    },
    contacts: {
      owner: "Jane Owner · jane.owner@example.com · (239) 555-9988",
      manager: "Mike Rivera · mike@acmepm.com · (239) 555-3311",
      emergency: "Tom Owner (spouse) · (239) 555-7766",
    },
    access: {
      gateCode: "1980 #", garageCode: "8842",
      alarm: "Stored — view in app", lockbox: "Hidden under planter, code 4419",
    },
    vendors: [
      { name: "Coastal Pool Co.", service: "Pool service", contact: "(239) 555-1010", rating: "★★★★★" },
      { name: "GreenScape Lawn", service: "Landscaping", contact: "(239) 555-2020", rating: "★★★★☆" },
      { name: "RapidCool HVAC", service: "HVAC", contact: "(239) 555-3030", rating: "★★★★★" },
      { name: "Marco Plumbing", service: "Plumbing (emergency)", contact: "(239) 555-4040", rating: "★★★★☆" },
    ],
    recentTasks: [
      { date: "Apr 28", title: "Weekly home watch", status: "Completed" },
      { date: "Apr 22", title: "Pool service", status: "Completed" },
      { date: "Apr 21", title: "Weekly home watch", status: "Completed" },
      { date: "Apr 14", title: "HVAC filter replacement", status: "Completed" },
      { date: "Apr 14", title: "Weekly home watch", status: "Completed" },
      { date: "Apr 07", title: "Weekly home watch", status: "Completed" },
    ],
    upcomingInspections: [
      { date: "May 02, 2026", title: "Monthly home watch", assignee: "Sarah Chen" },
      { date: "Jun 01, 2026", title: "Quarterly storm-prep inspection", assignee: "Mike Rivera" },
      { date: "Jul 01, 2026", title: "Monthly home watch", assignee: "Sarah Chen" },
    ],
  };
}

// Sample objects shaped to match the REAL Hubify generators (generateInvoicePDF /
// buildInspectionReportPdf), so the mockup gallery exercises the production
// rendering paths instead of parallel sample renderers.

export function getSampleInvoiceArgs(consolidated: boolean = false): {
  invoice: any; client: any; org: any;
} {
  const org = {
    name: "Acme Property Management",
    address: "123 Main St, Suite 200\nNaples, FL 34102",
    email: "billing@acmepm.com",
    phone: "(239) 555-0142",
    primaryColor: "#1e40af",
    secondaryColor: "#3b82f6",
    logoUrl: null,
  };
  if (!consolidated) {
    return {
      invoice: {
        invoiceNumber: "INV-2026-0042",
        issuedAt: new Date("2026-05-02T12:00:00Z").toISOString(),
        dueDate: new Date("2026-05-16T12:00:00Z").toISOString(),
        currency: "usd",
        amountCents: 80825,
        paidAt: null,
        description: "April 2026 home watch services for 789 Beachfront Dr.",
        lineItems: [
          { description: "Home Watch — April 2026 (4 weekly visits)", quantity: 4, unitAmountCents: 7500, totalCents: 30000 },
          { description: "Pool Service — April 2026", quantity: 4, unitAmountCents: 4500, totalCents: 18000 },
          { description: "Storm Prep — Pre-season inspection", quantity: 1, unitAmountCents: 25000, totalCents: 25000 },
          { description: "Light bulb replacement (parts + labor)", quantity: 1, unitAmountCents: 3250, totalCents: 3250 },
          { description: "Sales tax (6.0%)", quantity: 1, unitAmountCents: 4575, totalCents: 4575 },
        ],
        metadata: {
          terms: "Net 14",
          notes: "Thank you for your business. Please contact us with any questions about this invoice within 7 days of receipt.",
        },
      },
      client: {
        firstName: "Jane",
        lastName: "Owner",
        address: "789 Beachfront Dr\nMarco Island, FL 34145",
        email: "jane.owner@example.com",
        phone: "(239) 555-9988",
      },
      org,
    };
  }
  // Consolidated invoice — uses metadata.consolidatedInvoice flag in generateInvoicePDF.
  return {
    invoice: {
      invoiceNumber: "BATCH-2026-04",
      issuedAt: new Date("2026-05-02T12:00:00Z").toISOString(),
      dueDate: new Date("2026-05-16T12:00:00Z").toISOString(),
      currency: "usd",
      amountCents: 241283,
      paidAt: null,
      description: "Consolidated billing for April 2026 across 3 properties.",
      lineItems: [
        { description: "P-204 · 789 Beachfront Dr — Weekly home watch (4x)", quantity: 4, unitAmountCents: 7500, totalCents: 30000 },
        { description: "P-204 · 789 Beachfront Dr — Pool service (4x)", quantity: 4, unitAmountCents: 3300, totalCents: 13200 },
        { description: "P-118 · 12 Palm Ct — Weekly home watch (4x)", quantity: 4, unitAmountCents: 8500, totalCents: 34000 },
        { description: "P-118 · 12 Palm Ct — HVAC filter replacement", quantity: 1, unitAmountCents: 5850, totalCents: 5850 },
        { description: "P-118 · 12 Palm Ct — Lawn touch-up (vendor reimb.)", quantity: 1, unitAmountCents: 20000, totalCents: 20000 },
        { description: "P-077 · 3401 Gulf Shore Blvd N — Weekly home watch (4x)", quantity: 4, unitAmountCents: 11000, totalCents: 44000 },
        { description: "P-077 · 3401 Gulf Shore Blvd N — Storm prep inspection", quantity: 1, unitAmountCents: 35000, totalCents: 35000 },
        { description: "P-077 · 3401 Gulf Shore Blvd N — Bulb + smoke alarm", quantity: 1, unitAmountCents: 9575, totalCents: 9575 },
        { description: "P-077 · 3401 Gulf Shore Blvd N — Vendor coord. (pool repair)", quantity: 3, unitAmountCents: 12000, totalCents: 36000 },
        { description: "Sales tax (6.0%)", quantity: 1, unitAmountCents: 13658, totalCents: 13658 },
      ],
      metadata: {
        consolidatedInvoice: true,
        submissionCount: 9,
        terms: "Net 14",
        notes: "Consolidated billing for Apr 01–30, 2026 across 3 properties (P-204, P-118, P-077).",
      },
    },
    client: {
      firstName: "Sunset",
      lastName: "Properties LLC",
      address: "500 Harbor Ave\nNaples, FL 34102",
      email: "robert@sunset.example",
      phone: "(239) 555-7000",
    },
    org,
  };
}

export function getSampleInspectionArgs(): { task: any; checklistItems: any[] } {
  const task = {
    title: "Monthly Home Watch — 789 Beachfront Dr",
    description: "Owner request: please verify the upstairs A/C and check for any storm damage from last week.",
    dueDate: new Date("2026-05-02T12:00:00Z").toISOString(),
    property: { address1: "789 Beachfront Dr, Marco Island, FL 34145" },
    assignedUser: { firstName: "Sarah", lastName: "Chen" },
  };
  const mk = (text: string, result: "pass" | "fail" | "na" | null, category: string, opts?: { note?: string; required?: boolean }) => ({
    text, result, category, resultNote: opts?.note, required: opts?.required,
  });
  const checklistItems = [
    mk("Roof — visible damage", "pass", "Exterior"),
    mk("Gutters & downspouts clear", "pass", "Exterior"),
    mk("Pool equipment running", "pass", "Exterior"),
    mk("Landscaping condition", "pass", "Exterior"),
    mk("Storm shutters secured", "pass", "Exterior"),
    mk("Front door / locks", "pass", "Interior", { required: true }),
    mk("Windows secured", "pass", "Interior"),
    mk("A/C running, set to 78°F", "pass", "Interior", { required: true }),
    mk("Refrigerator temperature", "pass", "Interior"),
    mk("Master bath plumbing", "fail", "Interior", {
      note: "Slow leak under sink. Towels placed under trap, water shutoff confirmed accessible. Recommend plumber within 7 days.",
      required: true,
    }),
    mk("Toilets flush correctly", "pass", "Interior"),
    mk("Smoke detectors", "pass", "Safety", { required: true }),
    mk("CO detectors", "pass", "Safety", { required: true }),
    mk("Fire extinguisher", "na", "Safety"),
    mk("Water shutoff accessible", "pass", "Safety"),
  ];
  return { task, checklistItems };
}

export function getSampleTimeReport(): SampleTimeReport {
  return {
    dateRange: "Apr 03 – May 02, 2026 (30 days)",
    groupBy: "Employee",
    billableFilter: "All entries",
    totals: [
      { label: "Total Hours", value: "146.25 h" },
      { label: "Billable Hours", value: "112.50 h" },
      { label: "Non-Billable", value: "33.75 h" },
      { label: "Billable Amount", value: "$8,437.50" },
      { label: "Active Employees", value: "5" },
      { label: "Active Properties", value: "12" },
    ],
    rows: [
      { name: "Sarah Chen", total: "48.50", billable: "42.00", nonBillable: "6.50", billableAmount: "$3,150.00", entries: 22, breakdown: [
        { label: "789 Beachfront Dr", total: "18.50", amount: "$1,387.50" },
        { label: "12 Palm Ct", total: "14.00", amount: "$1,050.00" },
        { label: "3401 Gulf Shore Blvd N", total: "9.50", amount: "$712.50" },
        { label: "Travel / unassigned", total: "6.50", amount: "$0.00" },
      ]},
      { name: "Mike Rivera", total: "41.25", billable: "30.00", nonBillable: "11.25", billableAmount: "$2,250.00", entries: 18, breakdown: [
        { label: "12 Palm Ct", total: "16.00", amount: "$1,200.00" },
        { label: "3401 Gulf Shore Blvd N", total: "14.00", amount: "$1,050.00" },
        { label: "Office / admin", total: "11.25", amount: "$0.00" },
      ]},
      { name: "Diego Alvarez", total: "32.00", billable: "28.50", nonBillable: "3.50", billableAmount: "$1,995.00", entries: 14, breakdown: [
        { label: "789 Beachfront Dr", total: "12.50", amount: "$875.00" },
        { label: "Other properties (4)", total: "16.00", amount: "$1,120.00" },
        { label: "Vehicle maintenance", total: "3.50", amount: "$0.00" },
      ]},
      { name: "Priya Singh", total: "16.50", billable: "12.00", nonBillable: "4.50", billableAmount: "$840.00", entries: 9, breakdown: [
        { label: "12 Palm Ct", total: "8.00", amount: "$560.00" },
        { label: "3401 Gulf Shore Blvd N", total: "4.00", amount: "$280.00" },
        { label: "Training", total: "4.50", amount: "$0.00" },
      ]},
      { name: "Unassigned", total: "8.00", billable: "0.00", nonBillable: "8.00", billableAmount: "$0.00", entries: 4, breakdown: [
        { label: "Office / admin", total: "8.00", amount: "$0.00" },
      ]},
    ],
  };
}
