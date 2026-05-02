import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ChevronRight, ChevronDown, Users, Building2, Clock, DollarSign } from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  subDays,
} from "date-fns";

interface ReportBucket {
  key: string;
  label: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableAmountCents: number;
  entryCount: number;
}

interface ReportGroup extends ReportBucket {
  breakdown: ReportBucket[];
}

interface ReportResponse {
  groupBy: "user" | "property";
  totals: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    billableAmountCents: number;
    activeUsers: number;
    activeProperties: number;
    entryCount: number;
  };
  groups: ReportGroup[];
}

interface UserOpt { id: string; firstName: string; lastName: string; }
interface PropertyOpt { id: number; name: string; }
interface TaskOpt { id: number; title: string; }

type Preset = "this-week" | "last-week" | "this-month" | "last-month" | "last-30" | "custom";

interface Props {
  users: UserOpt[];
  properties: PropertyOpt[];
  tasks: TaskOpt[];
  onDrillIn: (filters: { userId?: string; propertyId?: string; startDate: string; endDate: string }) => void;
}

function presetRange(preset: Preset): { startDate: string; endDate: string } | null {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (preset) {
    case "this-week":
      return { startDate: fmt(startOfWeek(today, { weekStartsOn: 1 })), endDate: fmt(endOfWeek(today, { weekStartsOn: 1 })) };
    case "last-week": {
      const lw = subWeeks(today, 1);
      return { startDate: fmt(startOfWeek(lw, { weekStartsOn: 1 })), endDate: fmt(endOfWeek(lw, { weekStartsOn: 1 })) };
    }
    case "this-month":
      return { startDate: fmt(startOfMonth(today)), endDate: fmt(endOfMonth(today)) };
    case "last-month": {
      const lm = subMonths(today, 1);
      return { startDate: fmt(startOfMonth(lm)), endDate: fmt(endOfMonth(lm)) };
    }
    case "last-30":
      return { startDate: fmt(subDays(today, 30)), endDate: fmt(today) };
    default:
      return null;
  }
}

export default function TimeReport({ users, properties, tasks, onDrillIn }: Props) {
  const initial = presetRange("this-month")!;
  const [preset, setPreset] = useState<Preset>("this-month");
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [groupBy, setGroupBy] = useState<"user" | "property">("user");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [billableFilter, setBillableFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handlePreset = (value: Preset) => {
    setPreset(value);
    const r = presetRange(value);
    if (r) {
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    }
  };

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("groupBy", groupBy);
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    if (userFilter !== "all") p.set("userId", userFilter);
    if (propertyFilter !== "all") p.set("propertyId", propertyFilter);
    if (taskFilter !== "all") p.set("taskId", taskFilter);
    if (billableFilter !== "all") p.set("billable", billableFilter);
    return p.toString();
  }, [groupBy, startDate, endDate, userFilter, propertyFilter, taskFilter, billableFilter]);

  const { data: report, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/time-entries/report", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries/report?${queryString}`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const fmtHours = (h: number) => `${h.toFixed(2)}h`;
  const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleDrill = (g: ReportGroup) => {
    if (g.key === "unassigned") return;
    if (groupBy === "user") {
      onDrillIn({ userId: g.key, startDate, endDate });
    } else {
      onDrillIn({ propertyId: g.key, startDate, endDate });
    }
  };

  const exportCSV = () => {
    if (!report) return;
    const groupLabel = groupBy === "user" ? "Employee" : "Property";
    const subLabel = groupBy === "user" ? "Property" : "Employee";
    const headers = [
      "Type", groupLabel, subLabel,
      "Total Hours", "Billable Hours", "Non-Billable Hours",
      "Billable $", "Entries",
    ];
    const rows: string[][] = [];
    for (const g of report.groups) {
      rows.push([
        "Group", g.label, "",
        g.totalHours.toFixed(2), g.billableHours.toFixed(2), g.nonBillableHours.toFixed(2),
        (g.billableAmountCents / 100).toFixed(2), String(g.entryCount),
      ]);
      // Match the on-screen view: only export breakdown rows for expanded groups.
      if (expanded.has(g.key)) {
        for (const sub of g.breakdown) {
          rows.push([
            "Detail", g.label, sub.label,
            sub.totalHours.toFixed(2), sub.billableHours.toFixed(2), sub.nonBillableHours.toFixed(2),
            (sub.billableAmountCents / 100).toFixed(2), String(sub.entryCount),
          ]);
        }
      }
    }
    rows.push([
      "Total", "ALL", "",
      report.totals.totalHours.toFixed(2),
      report.totals.billableHours.toFixed(2),
      report.totals.nonBillableHours.toFixed(2),
      (report.totals.billableAmountCents / 100).toFixed(2),
      String(report.totals.entryCount),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-report-${groupBy}-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = report?.totals;
  const groupColLabel = groupBy === "user" ? "Employee" : "Property";
  const subColLabel = groupBy === "user" ? "Property" : "Employee";

  return (
    <div className="space-y-6">
      {/* Range + groupBy */}
      <Card>
        <CardHeader>
          <CardTitle>Time Report</CardTitle>
          <CardDescription>Aggregate logged time by employee or property over any date range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={preset} onValueChange={(v) => handlePreset(v as Preset)}>
                <SelectTrigger data-testid="select-report-preset"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-30">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreset("custom"); }}
                data-testid="input-report-start"
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreset("custom"); }}
                data-testid="input-report-end"
              />
            </div>
            <div className="space-y-2">
              <Label>Group By</Label>
              <Tabs
                value={groupBy}
                onValueChange={(v) => {
                  if (v === "user" || v === "property") {
                    setGroupBy(v);
                    setExpanded(new Set());
                  }
                }}
              >
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="user" data-testid="tab-group-user">By Employee</TabsTrigger>
                  <TabsTrigger value="property" data-testid="tab-group-property">By Property</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger data-testid="select-report-user"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger data-testid="select-report-property"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task</Label>
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger data-testid="select-report-task"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tasks</SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Billable</Label>
              <Select value={billableFilter} onValueChange={setBillableFilter}>
                <SelectTrigger data-testid="select-report-billable"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Billable & Non-Billable</SelectItem>
                  <SelectItem value="billable">Billable Only</SelectItem>
                  <SelectItem value="nonbillable">Non-Billable Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={exportCSV} variant="outline" disabled={!report || report.groups.length === 0} data-testid="button-export-report">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total Hours" value={fmtHours(totals?.totalHours ?? 0)} icon={<Clock className="w-4 h-4" />} testId="summary-total-hours" />
        <SummaryCard label="Billable Hours" value={fmtHours(totals?.billableHours ?? 0)} icon={<Clock className="w-4 h-4" />} testId="summary-billable-hours" />
        <SummaryCard label="Non-Billable" value={fmtHours(totals?.nonBillableHours ?? 0)} icon={<Clock className="w-4 h-4" />} testId="summary-nonbillable-hours" />
        <SummaryCard label="Billable $" value={fmtMoney(totals?.billableAmountCents ?? 0)} icon={<DollarSign className="w-4 h-4" />} testId="summary-billable-amount" />
        <SummaryCard label="Employees" value={String(totals?.activeUsers ?? 0)} icon={<Users className="w-4 h-4" />} testId="summary-active-users" />
        <SummaryCard label="Properties" value={String(totals?.activeProperties ?? 0)} icon={<Building2 className="w-4 h-4" />} testId="summary-active-properties" />
      </div>

      {/* Grouped table */}
      <Card>
        <CardHeader>
          <CardTitle>{groupBy === "user" ? "Hours by Employee" : "Hours by Property"}</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading…"
              : `${report?.groups.length ?? 0} ${groupBy === "user" ? "employees" : "properties"} · ${report?.totals.entryCount ?? 0} entries`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{groupColLabel}</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Non-Billable</TableHead>
                <TableHead className="text-right">Billable $</TableHead>
                <TableHead className="text-right">Entries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!report || report.groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-8" data-testid="report-empty">
                    {isLoading ? "Loading…" : "No time entries in this range."}
                  </TableCell>
                </TableRow>
              ) : (
                report.groups.map((g) => (
                  <Fragment key={g.key}>
                    <TableRow data-testid={`report-row-${g.key}`}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleExpand(g.key)}
                          disabled={g.breakdown.length === 0}
                          data-testid={`button-expand-${g.key}`}
                        >
                          {expanded.has(g.key) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <button
                          className="font-medium text-left hover:underline disabled:text-slate-700 disabled:no-underline"
                          onClick={() => handleDrill(g)}
                          disabled={g.key === "unassigned"}
                          data-testid={`link-drill-${g.key}`}
                        >
                          {g.label}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">{fmtHours(g.totalHours)}</TableCell>
                      <TableCell className="text-right">{fmtHours(g.billableHours)}</TableCell>
                      <TableCell className="text-right">{fmtHours(g.nonBillableHours)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(g.billableAmountCents)}</TableCell>
                      <TableCell className="text-right">{g.entryCount}</TableCell>
                    </TableRow>
                    {expanded.has(g.key) && g.breakdown.map((sub) => (
                      <TableRow key={`${g.key}-${sub.key}`} className="bg-slate-50/60">
                        <TableCell />
                        <TableCell className="pl-8 text-sm text-slate-600">
                          <span className="text-xs text-slate-400 mr-2">{subColLabel}:</span>{sub.label}
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmtHours(sub.totalHours)}</TableCell>
                        <TableCell className="text-right text-sm">{fmtHours(sub.billableHours)}</TableCell>
                        <TableCell className="text-right text-sm">{fmtHours(sub.nonBillableHours)}</TableCell>
                        <TableCell className="text-right text-sm">{fmtMoney(sub.billableAmountCents)}</TableCell>
                        <TableCell className="text-right text-sm">{sub.entryCount}</TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon, testId }: { label: string; value: string; icon: React.ReactNode; testId: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between text-slate-500 text-xs">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-xl font-bold mt-1" data-testid={testId}>{value}</div>
      </CardContent>
    </Card>
  );
}
