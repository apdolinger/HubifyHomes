import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, FileSpreadsheet, ClipboardCheck, Building2, Clock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface MockupSpec {
  type: "invoice" | "consolidated" | "inspection" | "property" | "time";
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  fields: { group: string; items: string[] }[];
}

const MOCKUPS: MockupSpec[] = [
  {
    type: "invoice",
    title: "Client Invoice",
    description: "Single invoice sent to one client for one billing period.",
    icon: <FileText className="w-5 h-5" />,
    accent: "bg-blue-50 border-blue-200 text-blue-900",
    fields: [
      { group: "Header", items: ["Organization name + logo", "Invoice number", "Issue date", "Due date"] },
      { group: "Parties", items: ["From: org name, address, email, phone", "Bill To: client name, address, email, phone"] },
      { group: "Line items", items: ["Description", "Quantity", "Unit price", "Line total"] },
      { group: "Totals", items: ["Subtotal", "Tax (rate + amount)", "Total", "Amount paid", "Amount due"] },
      { group: "Payment", items: ["Online pay link", "Mail-in instructions", "Notes / payment terms"] },
    ],
  },
  {
    type: "consolidated",
    title: "Consolidated Invoice Batch",
    description: "One bill covering multiple properties for the same client over a billing period.",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    accent: "bg-teal-50 border-teal-200 text-teal-900",
    fields: [
      { group: "Header", items: ["Batch number", "Billing period", "Client name + property count"] },
      { group: "Properties included", items: ["Property number", "Address", "Per-property subtotal"] },
      { group: "Line items by property", items: ["Description", "Qty", "Unit price", "Line total"] },
      { group: "Totals", items: ["Combined subtotal", "Tax", "Total due"] },
      { group: "Payment", items: ["One-click pay link for the entire batch", "Auto-charge note (ACH / card on file)"] },
    ],
  },
  {
    type: "inspection",
    title: "Inspection Report",
    description: "Per-task inspection summary with pass/fail/N/A checklist and photos.",
    icon: <ClipboardCheck className="w-5 h-5" />,
    accent: "bg-indigo-50 border-indigo-200 text-indigo-900",
    fields: [
      { group: "Header", items: ["Property address", "Due date", "Inspector", "Owner notes"] },
      { group: "Performance summary", items: ["Overall score %", "Passed / Failed / N/A / Pending counts"] },
      { group: "Failed items", items: ["Item name", "Inspector note", "Photo evidence"] },
      { group: "Full checklist", items: ["Grouped by category", "Pass / Fail / N/A result per item", "Optional notes"] },
      { group: "Photos", items: ["All photos captured during inspection (thumbnail grid)"] },
    ],
  },
  {
    type: "property",
    title: "Property Report",
    description: "Snapshot of a single property: details, contacts, vendors, recent and upcoming work.",
    icon: <Building2 className="w-5 h-5" />,
    accent: "bg-violet-50 border-violet-200 text-violet-900",
    fields: [
      { group: "Property details", items: ["Property #", "Type", "Tier", "Status", "Bed/bath", "Sq ft", "Year built", "Pool/spa"] },
      { group: "Contacts", items: ["Owner", "Property manager", "Emergency contact"] },
      { group: "Access & security", items: ["Gate / garage / alarm codes", "Lockbox location"] },
      { group: "Preferred vendors", items: ["Vendor name", "Service type", "Contact", "Satisfaction rating"] },
      { group: "Recent tasks", items: ["Date", "Task title", "Status (last 30 days)"] },
      { group: "Upcoming inspections", items: ["Next due date", "Inspection type", "Assigned inspector"] },
    ],
  },
  {
    type: "time",
    title: "Time Report",
    description: "Admin time-tracking report for billing review and payroll.",
    icon: <Clock className="w-5 h-5" />,
    accent: "bg-cyan-50 border-cyan-200 text-cyan-900",
    fields: [
      { group: "Filters applied", items: ["Date range", "Group by employee or property", "Billable filter"] },
      { group: "Totals strip", items: ["Total hours", "Billable hours", "Non-billable hours", "Billable $", "Active employees", "Active properties"] },
      { group: "Grouped table", items: ["Employee or property name", "Total / billable / non-billable hours", "Billable $", "Entry count"] },
      { group: "Breakdown", items: ["Per-employee: hours by property", "Per-property: hours by employee"] },
    ],
  },
];

export default function AdminPdfMockups() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const role = (user as any)?.role;
  const isAllowed = role === "admin" || role === "supervisor" || role === "super_admin";

  useEffect(() => {
    if (!isLoading && user && !isAllowed) {
      setLocation("/");
    }
  }, [isLoading, user, isAllowed, setLocation]);

  if (isLoading || !user) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }
  if (!isAllowed) {
    return <div className="p-8 text-slate-500">Admin access required.</div>;
  }

  const open = (type: MockupSpec["type"]) => {
    window.open(`/api/pdf-mockups/${type}`, "_blank", "noopener");
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="mb-2" data-testid="link-back-admin">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-pdf-mockups">PDF Mockup Gallery</h1>
          <p className="text-slate-600 mt-1">
            Preview every client-facing PDF Hubify generates with sample data, even before you have real records.
            Each mockup PDF is clearly stamped <strong>SAMPLE</strong> so it can never be confused with a live document.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {MOCKUPS.map((m) => (
          <Card key={m.type} data-testid={`card-mockup-${m.type}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-md border ${m.accent}`}>{m.icon}</div>
                  <div>
                    <CardTitle data-testid={`title-mockup-${m.type}`}>{m.title}</CardTitle>
                    <CardDescription>{m.description}</CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => open(m.type)}
                  data-testid={`button-download-${m.type}`}
                >
                  <Download className="w-4 h-4 mr-2" /> Open Sample PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Fields included</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {m.fields.map((g) => (
                  <div
                    key={g.group}
                    className="border border-slate-200 rounded-md p-3 bg-slate-50/60"
                    data-testid={`fieldgroup-${m.type}-${g.group.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="font-semibold text-sm text-slate-900 mb-1">{g.group}</div>
                    <ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
                      {g.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Badge variant="outline" className="text-xs">
                  Watermark "SAMPLE" applied to every page of the PDF
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
