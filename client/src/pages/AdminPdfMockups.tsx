import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Download, FileText, FileSpreadsheet, ClipboardCheck, Building2, Clock,
  ArrowLeft, ChevronDown, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AuthUser { role?: string }

type MockupType = "invoice" | "consolidated" | "inspection" | "property" | "time";

interface MockupSpec {
  type: MockupType;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  preview: React.ReactNode;
}

function SampleStamp() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
      <span
        className="text-7xl md:text-8xl font-extrabold text-slate-300/40 select-none"
        style={{ transform: "rotate(-25deg)" }}
      >
        SAMPLE
      </span>
    </div>
  );
}

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative border border-slate-200 rounded-md bg-white shadow-sm overflow-hidden">
      <div className="bg-amber-100 text-amber-900 text-xs font-medium text-center py-1 border-b border-amber-200">
        SAMPLE — NOT A REAL CLIENT DOCUMENT
      </div>
      <div className="relative p-6 text-sm">
        <SampleStamp />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

const InvoicePreview = (
  <PreviewShell>
    <div className="-m-6 mb-4 bg-blue-700 text-white p-5 flex justify-between items-center">
      <div>
        <div className="text-2xl font-bold tracking-wide">INVOICE</div>
        <div className="text-blue-100 text-xs mt-1">Acme Property Management</div>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold">#INV-2026-0042</div>
        <div className="text-blue-100 text-xs mt-1">Issued May 02, 2026</div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
      <div>
        <div className="uppercase text-slate-500 text-[10px] mb-1">From</div>
        <div className="font-semibold">Acme Property Management</div>
        <div className="text-slate-600">123 Main St, Suite 200<br />Naples, FL 34102</div>
        <div className="text-slate-600 mt-1">billing@acmepm.com</div>
        <div className="text-slate-600">(239) 555-0142</div>
      </div>
      <div>
        <div className="uppercase text-slate-500 text-[10px] mb-1">Bill To</div>
        <div className="font-semibold">Jane Owner</div>
        <div className="text-slate-600">789 Beachfront Dr<br />Marco Island, FL 34145</div>
        <div className="text-slate-600 mt-1">jane.owner@example.com</div>
        <div className="text-slate-600">(239) 555-9988</div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3 text-xs mb-3 bg-slate-50 p-2 rounded">
      <div><div className="text-[10px] uppercase text-slate-500">Invoice Date</div><div className="font-medium">May 02, 2026</div></div>
      <div><div className="text-[10px] uppercase text-slate-500">Due Date</div><div className="font-medium">May 16, 2026</div></div>
      <div><div className="text-[10px] uppercase text-slate-500">Terms</div><div className="font-medium">Net 14</div></div>
    </div>
    <table className="w-full text-xs border-t border-slate-200">
      <thead className="bg-slate-50 text-slate-600">
        <tr>
          <th className="text-left p-2">Description</th>
          <th className="text-right p-2 w-12">Qty</th>
          <th className="text-right p-2 w-16">Unit</th>
          <th className="text-right p-2 w-20">Total</th>
        </tr>
      </thead>
      <tbody>
        {[
          ["Home Watch — April 2026 (4 weekly visits)", 4, "$75.00", "$300.00"],
          ["Pool Service — April 2026", 4, "$45.00", "$180.00"],
          ["Storm Prep — Pre-season inspection", 1, "$250.00", "$250.00"],
          ["Light bulb replacement", 1, "$32.50", "$32.50"],
          ["Sales tax (6.0%)", 1, "$45.75", "$45.75"],
        ].map(([d, q, u, t], i) => (
          <tr key={i} className="border-b border-slate-100">
            <td className="p-2">{d}</td>
            <td className="p-2 text-right">{q}</td>
            <td className="p-2 text-right">{u}</td>
            <td className="p-2 text-right">{t}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="flex justify-end mt-3 text-xs">
      <table className="w-64">
        <tbody>
          <tr><td className="p-1">Subtotal</td><td className="p-1 text-right">$762.50</td></tr>
          <tr><td className="p-1">Tax (6.0%)</td><td className="p-1 text-right">$45.75</td></tr>
          <tr className="font-bold border-t"><td className="p-1">Total</td><td className="p-1 text-right">$808.25</td></tr>
          <tr><td className="p-1">Amount Paid</td><td className="p-1 text-right">$0.00</td></tr>
          <tr className="font-bold"><td className="p-1">Amount Due</td><td className="p-1 text-right text-red-600">$808.25</td></tr>
        </tbody>
      </table>
    </div>
    <div className="mt-3 text-xs text-slate-700 border-t pt-2">
      <div className="uppercase text-[10px] text-slate-500 mb-1">Description &amp; Notes</div>
      <div>April 2026 home watch services for 789 Beachfront Dr.</div>
      <div className="mt-1 text-slate-600">Thank you for your business. Please contact us with any questions about this invoice within 7 days of receipt.</div>
    </div>
    <div className="mt-3 text-xs text-center text-slate-400 border-t pt-2">
      Thank you for your business! | Acme Property Management
    </div>
  </PreviewShell>
);

const ConsolidatedPreview = (
  <PreviewShell>
    <div className="-m-6 mb-4 bg-blue-700 text-white p-5 flex justify-between items-center">
      <div>
        <div className="text-2xl font-bold tracking-wide">INVOICE</div>
        <div className="text-blue-100 text-xs mt-1">Acme Property Management</div>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold">#BATCH-2026-04</div>
        <div className="text-blue-100 text-xs mt-1">Issued May 02, 2026</div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
      <div>
        <div className="uppercase text-slate-500 text-[10px] mb-1">From</div>
        <div className="font-semibold">Acme Property Management</div>
        <div className="text-slate-600">123 Main St, Suite 200<br />Naples, FL 34102</div>
        <div className="text-slate-600 mt-1">billing@acmepm.com</div>
        <div className="text-slate-600">(239) 555-0142</div>
      </div>
      <div>
        <div className="uppercase text-slate-500 text-[10px] mb-1">Bill To</div>
        <div className="font-semibold">Sunset Properties LLC</div>
        <div className="text-slate-600">500 Harbor Ave<br />Naples, FL 34102</div>
        <div className="text-slate-600 mt-1">robert@sunset.example</div>
        <div className="text-slate-600">(239) 555-7000</div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3 text-xs mb-3 bg-slate-50 p-2 rounded">
      <div><div className="text-[10px] uppercase text-slate-500">Invoice Date</div><div className="font-medium">May 02, 2026</div></div>
      <div><div className="text-[10px] uppercase text-slate-500">Due Date</div><div className="font-medium">May 16, 2026</div></div>
      <div><div className="text-[10px] uppercase text-slate-500">Type</div><div className="font-bold text-blue-700">Consolidated (9 submissions)</div></div>
    </div>
    <table className="w-full text-xs border-t border-slate-200">
      <thead className="bg-slate-50 text-slate-600">
        <tr>
          <th className="text-left p-2">Description</th>
          <th className="text-right p-2 w-12">Qty</th>
          <th className="text-right p-2 w-16">Unit</th>
          <th className="text-right p-2 w-20">Total</th>
        </tr>
      </thead>
      <tbody>
        {[
          ["P-204 · 789 Beachfront Dr — Weekly home watch (4x)", 4, "$75.00", "$300.00"],
          ["P-204 · 789 Beachfront Dr — Pool service (4x)", 4, "$33.00", "$132.00"],
          ["P-118 · 12 Palm Ct — Weekly home watch (4x)", 4, "$85.00", "$340.00"],
          ["P-118 · 12 Palm Ct — HVAC filter replacement", 1, "$58.50", "$58.50"],
          ["P-118 · 12 Palm Ct — Lawn touch-up (vendor reimb.)", 1, "$200.00", "$200.00"],
          ["P-077 · 3401 Gulf Shore Blvd N — Weekly home watch (4x)", 4, "$110.00", "$440.00"],
          ["P-077 · 3401 Gulf Shore Blvd N — Storm prep inspection", 1, "$350.00", "$350.00"],
          ["P-077 · 3401 Gulf Shore Blvd N — Bulb + smoke alarm", 1, "$95.75", "$95.75"],
          ["P-077 · 3401 Gulf Shore Blvd N — Vendor coord. (pool repair)", 3, "$120.00", "$360.00"],
          ["Sales tax (6.0%)", 1, "$136.58", "$136.58"],
        ].map(([d, q, u, t], i) => (
          <tr key={i} className="border-b border-slate-100">
            <td className="p-2">{d}</td>
            <td className="p-2 text-right">{q}</td>
            <td className="p-2 text-right">{u}</td>
            <td className="p-2 text-right">{t}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="flex justify-end mt-3 text-xs">
      <table className="w-64">
        <tbody>
          <tr><td className="p-1">Subtotal</td><td className="p-1 text-right">$2,276.25</td></tr>
          <tr><td className="p-1">Tax (6.0%)</td><td className="p-1 text-right">$136.58</td></tr>
          <tr className="font-bold border-t"><td className="p-1">Total</td><td className="p-1 text-right">$2,412.83</td></tr>
          <tr className="font-bold"><td className="p-1">Amount Due</td><td className="p-1 text-right text-red-600">$2,412.83</td></tr>
        </tbody>
      </table>
    </div>
    <div className="mt-3 text-xs text-slate-700 border-t pt-2">
      <div className="uppercase text-[10px] text-slate-500 mb-1">Description &amp; Notes</div>
      <div>Consolidated billing for April 2026 across 3 properties.</div>
      <div className="mt-1 text-slate-600">Consolidated billing for Apr 01–30, 2026 across 3 properties (P-204, P-118, P-077).</div>
    </div>
  </PreviewShell>
);

const InspectionPreview = (
  <PreviewShell>
    <div className="text-blue-700 text-xl font-bold">Inspection Report</div>
    <div className="text-xs text-slate-500 mb-3">Generated May 02, 2026 · 9:14 AM</div>
    <div className="font-semibold">Monthly Home Watch — 789 Beachfront Dr</div>
    <div className="text-xs text-slate-600">Property: 789 Beachfront Dr, Marco Island, FL 34145   |   Due: May 02, 2026   |   Inspector: Sarah Chen</div>
    <div className="text-xs text-slate-500 mt-1 mb-3 italic">Owner request: please verify the upstairs A/C and check for any storm damage from last week.</div>
    <div className="text-sm font-semibold mb-1">Performance Summary</div>
    <div className="grid grid-cols-5 gap-2 mb-4">
      {[
        { label: "Overall Score", value: "93%", color: "text-green-600" },
        { label: "Passed", value: "13", color: "text-green-600" },
        { label: "Failed", value: "1", color: "text-red-600" },
        { label: "N/A", value: "1", color: "text-slate-500" },
        { label: "Pending", value: "0", color: "text-amber-500" },
      ].map((b) => (
        <div key={b.label} className="border border-slate-200 rounded p-2 text-center bg-slate-50">
          <div className={`text-2xl font-bold ${b.color}`}>{b.value}</div>
          <div className="text-[10px] text-slate-500 uppercase">{b.label}</div>
        </div>
      ))}
    </div>
    <div className="text-sm font-semibold text-red-600 mb-1">Failed Items (1)</div>
    <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-xs">
      <span className="text-red-600 font-bold mr-1">✗</span>
      <span className="font-medium">Master bath plumbing</span>
      <div className="text-slate-600 mt-1">Slow leak under sink. Towels placed under trap, water shutoff confirmed accessible. Recommend plumber within 7 days.</div>
    </div>
    <div className="text-sm font-semibold mb-1">Full Checklist (15 items)</div>
    <div className="text-xs space-y-2">
      {[
        { cat: "EXTERIOR", items: [
          ["Roof — visible damage", "PASS", "text-green-600"],
          ["Gutters & downspouts clear", "PASS", "text-green-600"],
          ["Pool equipment running", "PASS", "text-green-600"],
          ["Landscaping condition", "PASS", "text-green-600"],
          ["Storm shutters secured", "PASS", "text-green-600"],
        ]},
        { cat: "INTERIOR", items: [
          ["Front door / locks (Required)", "PASS", "text-green-600"],
          ["Windows secured", "PASS", "text-green-600"],
          ["A/C running, set to 78°F (Required)", "PASS", "text-green-600"],
          ["Refrigerator temperature", "PASS", "text-green-600"],
          ["Master bath plumbing (Required)", "FAIL", "text-red-600"],
          ["Toilets flush correctly", "PASS", "text-green-600"],
        ]},
        { cat: "SAFETY", items: [
          ["Smoke detectors (Required)", "PASS", "text-green-600"],
          ["CO detectors (Required)", "PASS", "text-green-600"],
          ["Fire extinguisher", "N/A", "text-slate-500"],
          ["Water shutoff accessible", "PASS", "text-green-600"],
        ]},
      ].map((g) => (
        <div key={g.cat}>
          <div className="text-[10px] uppercase text-slate-500 border-b pb-0.5 mb-1">{g.cat}</div>
          {g.items.map(([t, r, c], i) => (
            <div key={i} className="flex justify-between py-0.5 border-b border-slate-50">
              <span>{t}</span><span className={`font-semibold ${c}`}>{r}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  </PreviewShell>
);

const PropertyPreview = (
  <PreviewShell>
    <div className="-m-6 mb-4 bg-violet-600 text-white p-4">
      <div className="text-lg font-bold">Property Report</div>
      <div className="text-xs text-violet-100">789 Beachfront Dr · Marco Island, FL 34145</div>
    </div>
    <div className="text-[10px] uppercase text-slate-500 mb-1">Property Details</div>
    <div className="grid grid-cols-4 gap-3 text-xs mb-3">
      {[
        ["Property #", "P-204"], ["Type", "Single Family"], ["Tier", "Premium"], ["Status", "Active"],
        ["Bed/Bath", "4 / 3.5"], ["Sq Ft", "3,420"], ["Year Built", "2014"], ["Pool/Spa", "Yes/Yes"],
      ].map(([l, v]) => (
        <div key={l}><div className="text-[10px] uppercase text-slate-500">{l}</div><div className="font-medium">{v}</div></div>
      ))}
    </div>
    <div className="text-[10px] uppercase text-slate-500 mb-1">Contacts</div>
    <div className="text-xs text-slate-700 mb-3 space-y-0.5">
      <div><span className="font-semibold">Owner:</span> Jane Owner · jane.owner@example.com · (239) 555-9988</div>
      <div><span className="font-semibold">Property Manager:</span> Mike Rivera · mike@acmepm.com · (239) 555-3311</div>
      <div><span className="font-semibold">Emergency Contact:</span> Tom Owner (spouse) · (239) 555-7766</div>
    </div>
    <div className="text-[10px] uppercase text-slate-500 mb-1">Access &amp; Security</div>
    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
      <div><span className="text-slate-500">Front Gate:</span> 1980 #</div>
      <div><span className="text-slate-500">Garage:</span> 8842</div>
      <div><span className="text-slate-500">Alarm:</span> Stored — view in app</div>
      <div><span className="text-slate-500">Lockbox:</span> Hidden under planter, code 4419</div>
    </div>
    <div className="text-[10px] uppercase text-slate-500 mb-1">Preferred Vendors</div>
    <table className="w-full text-xs mb-3">
      <thead className="bg-violet-50 text-violet-700"><tr>
        <th className="text-left p-1">Vendor</th><th className="text-left p-1">Service</th>
        <th className="text-left p-1">Contact</th><th className="text-right p-1">Rating</th>
      </tr></thead>
      <tbody>
        {[
          ["Coastal Pool Co.", "Pool service", "(239) 555-1010", "★★★★★"],
          ["GreenScape Lawn", "Landscaping", "(239) 555-2020", "★★★★☆"],
          ["RapidCool HVAC", "HVAC", "(239) 555-3030", "★★★★★"],
          ["Marco Plumbing", "Plumbing (emergency)", "(239) 555-4040", "★★★★☆"],
        ].map(([n, s, c, r], i) => (
          <tr key={i} className="border-b border-slate-100">
            <td className="p-1">{n}</td><td className="p-1">{s}</td><td className="p-1">{c}</td>
            <td className="p-1 text-right text-amber-600">{r}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="text-[10px] uppercase text-slate-500 mb-1">Recent Tasks (last 30 days)</div>
    <div className="text-xs space-y-0.5 mb-3">
      {[
        ["Apr 28", "Weekly home watch", "Completed"],
        ["Apr 22", "Pool service", "Completed"],
        ["Apr 21", "Weekly home watch", "Completed"],
        ["Apr 14", "HVAC filter replacement", "Completed"],
        ["Apr 14", "Weekly home watch", "Completed"],
        ["Apr 07", "Weekly home watch", "Completed"],
      ].map(([d, t, s], i) => (
        <div key={i} className="flex justify-between border-b border-slate-50 py-0.5">
          <span><span className="text-slate-500 mr-2">{d}</span>{t}</span>
          <span className="text-green-600">{s}</span>
        </div>
      ))}
    </div>
    <div className="text-[10px] uppercase text-slate-500 mb-1">Upcoming Inspections</div>
    <div className="text-xs space-y-0.5">
      <div className="flex justify-between"><span><span className="text-violet-600">May 02, 2026</span> · Monthly home watch</span><span className="text-slate-500">Sarah Chen</span></div>
      <div className="flex justify-between"><span><span className="text-violet-600">Jun 01, 2026</span> · Quarterly storm-prep inspection</span><span className="text-slate-500">Mike Rivera</span></div>
      <div className="flex justify-between"><span><span className="text-violet-600">Jul 01, 2026</span> · Monthly home watch</span><span className="text-slate-500">Sarah Chen</span></div>
    </div>
  </PreviewShell>
);

const TimePreview = (
  <PreviewShell>
    <div className="-m-6 mb-4 bg-cyan-700 text-white p-4">
      <div className="text-lg font-bold">Time Report</div>
      <div className="text-xs text-cyan-100">Apr 03 – May 02, 2026 · Grouped by Employee</div>
    </div>
    <div className="text-[10px] uppercase text-slate-500 mb-1">Filters Applied</div>
    <div className="grid grid-cols-3 gap-2 text-xs mb-3 bg-slate-50 p-2 rounded">
      <div><span className="text-slate-500">Date Range:</span> Apr 03 – May 02, 2026</div>
      <div><span className="text-slate-500">Group By:</span> Employee</div>
      <div><span className="text-slate-500">Billable:</span> All entries</div>
    </div>
    <div className="text-[10px] uppercase text-slate-500 mb-1">Totals</div>
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        ["Total Hours", "146.25 h"], ["Billable Hours", "112.50 h"], ["Non-Billable", "33.75 h"],
        ["Billable $", "$8,437.50"], ["Active Employees", "5"], ["Active Properties", "12"],
      ].map(([l, v]) => (
        <div key={l} className="border border-slate-200 rounded p-2 bg-slate-50">
          <div className="text-[10px] uppercase text-slate-500">{l}</div>
          <div className="font-bold text-base">{v}</div>
        </div>
      ))}
    </div>
    <div className="text-[10px] uppercase text-slate-500 mb-1">Hours by Employee</div>
    <table className="w-full text-xs">
      <thead className="bg-cyan-50 text-cyan-800"><tr>
        <th className="text-left p-1">Employee</th>
        <th className="text-right p-1">Total</th>
        <th className="text-right p-1">Billable</th>
        <th className="text-right p-1">Non-Bill.</th>
        <th className="text-right p-1">Billable $</th>
        <th className="text-right p-1">Entries</th>
      </tr></thead>
      <tbody>
        {[
          ["Sarah Chen", "48.50", "42.00", "6.50", "$3,150.00", "22"],
          ["Mike Rivera", "41.25", "30.00", "11.25", "$2,250.00", "18"],
          ["Diego Alvarez", "32.00", "28.50", "3.50", "$1,995.00", "14"],
          ["Priya Singh", "16.50", "12.00", "4.50", "$840.00", "9"],
          ["Unassigned", "8.00", "0.00", "8.00", "$0.00", "4"],
        ].map(([n, t, b, nb, amt, e], i) => (
          <tr key={i} className="border-b border-slate-100">
            <td className="p-1 font-medium">{n}</td>
            <td className="p-1 text-right">{t}</td>
            <td className="p-1 text-right">{b}</td>
            <td className="p-1 text-right">{nb}</td>
            <td className="p-1 text-right">{amt}</td>
            <td className="p-1 text-right">{e}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="mt-2 text-[10px] text-slate-500 italic">
      Each employee row expands in the PDF to show a per-property breakdown of hours and billable amount.
    </div>
  </PreviewShell>
);

const MOCKUPS: MockupSpec[] = [
  { type: "invoice", title: "Client Invoice", description: "Single invoice sent to one client for one billing period. Generated by the production generateInvoicePDF — same code path Hubify uses to email clients.",
    icon: <FileText className="w-5 h-5" />, accent: "bg-blue-50 border-blue-200 text-blue-900", preview: InvoicePreview },
  { type: "consolidated", title: "Consolidated Invoice Batch", description: "One bill covering multiple properties for the same client. Same generateInvoicePDF generator with metadata.consolidatedInvoice = true.",
    icon: <FileSpreadsheet className="w-5 h-5" />, accent: "bg-teal-50 border-teal-200 text-teal-900", preview: ConsolidatedPreview },
  { type: "inspection", title: "Inspection Report", description: "Per-task inspection summary with pass/fail/N/A checklist and notes. Generated by the production buildInspectionReportPdf.",
    icon: <ClipboardCheck className="w-5 h-5" />, accent: "bg-indigo-50 border-indigo-200 text-indigo-900", preview: InspectionPreview },
  { type: "property", title: "Property Report", description: "Snapshot of a single property: details, contacts, access codes, vendors, recent and upcoming work.",
    icon: <Building2 className="w-5 h-5" />, accent: "bg-violet-50 border-violet-200 text-violet-900", preview: PropertyPreview },
  { type: "time", title: "Time Report", description: "Admin time-tracking report for billing review and payroll, grouped by employee or property with per-row breakdown.",
    icon: <Clock className="w-5 h-5" />, accent: "bg-cyan-50 border-cyan-200 text-cyan-900", preview: TimePreview },
];

export default function AdminPdfMockups() {
  const { user, isLoading } = useAuth() as { user: AuthUser | undefined; isLoading: boolean };
  const [, setLocation] = useLocation();
  const [openMap, setOpenMap] = useState<Record<MockupType, boolean>>({
    invoice: true,
    consolidated: false,
    inspection: false,
    property: false,
    time: false,
  });

  const role = user?.role;
  const isAllowed = role === "admin" || role === "supervisor" || role === "super_admin";

  useEffect(() => {
    if (!isLoading && user && !isAllowed) {
      setLocation("/");
    }
  }, [isLoading, user, isAllowed, setLocation]);

  if (isLoading) {
    return <div className="p-8 text-slate-500" data-testid="loading-pdf-mockups">Loading…</div>;
  }
  if (!user || !isAllowed) {
    return <div className="p-8 text-slate-500">Admin access required.</div>;
  }

  const open = (type: MockupType) => {
    window.open(`/api/pdf-mockups/${type}`, "_blank", "noopener");
  };

  const toggle = (type: MockupType) => {
    setOpenMap((m) => ({ ...m, [type]: !m[type] }));
  };

  const expandAll = () => setOpenMap({ invoice: true, consolidated: true, inspection: true, property: true, time: true });
  const collapseAll = () => setOpenMap({ invoice: false, consolidated: false, inspection: false, property: false, time: false });

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div>
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="mb-2" data-testid="link-back-admin">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Admin
          </Button>
        </Link>
        <h1 className="text-3xl font-bold" data-testid="heading-pdf-mockups">PDF Mockup Gallery</h1>
        <p className="text-slate-600 mt-1">
          Preview every client-facing PDF Hubify generates with sample data, even before you have real records.
          Each mockup is clearly stamped <strong>SAMPLE</strong> so it can never be confused with a live document.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={expandAll} data-testid="button-expand-all">Expand all</Button>
          <Button size="sm" variant="outline" onClick={collapseAll} data-testid="button-collapse-all">Collapse all</Button>
        </div>
      </div>

      <div className="grid gap-6">
        {MOCKUPS.map((m) => (
          <Card key={m.type} data-testid={`card-mockup-${m.type}`}>
            <Collapsible open={openMap[m.type]} onOpenChange={() => toggle(m.type)}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-start gap-3 flex-1 text-left hover:opacity-80"
                      data-testid={`toggle-mockup-${m.type}`}
                    >
                      <div className="pt-1">
                        {openMap[m.type]
                          ? <ChevronDown className="w-4 h-4 text-slate-500" />
                          : <ChevronRight className="w-4 h-4 text-slate-500" />}
                      </div>
                      <div className={`p-2 rounded-md border ${m.accent}`}>{m.icon}</div>
                      <div className="flex-1">
                        <CardTitle data-testid={`title-mockup-${m.type}`}>{m.title}</CardTitle>
                        <CardDescription>{m.description}</CardDescription>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <Button onClick={() => open(m.type)} data-testid={`button-download-${m.type}`}>
                    <Download className="w-4 h-4 mr-2" /> Download Sample PDF
                  </Button>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wide text-slate-500">HTML Preview (mirrors the PDF field-for-field)</div>
                    <Badge variant="outline" className="text-xs">
                      Watermarked SAMPLE on every page of the PDF
                    </Badge>
                  </div>
                  <div data-testid={`preview-mockup-${m.type}`}>{m.preview}</div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}
