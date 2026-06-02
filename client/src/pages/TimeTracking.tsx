import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, Edit, Trash2, Filter, Download, Shield,
  AlertTriangle, Lock, CheckCircle, XCircle, Send,
  FileText, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TimeReport from "@/components/TimeReport";

const WORK_TYPES = [
  "Inspection",
  "Home Watch Visit",
  "Maintenance",
  "Vendor Coordination",
  "Travel",
  "Administrative",
  "Cleaning",
  "Welcome Home Service",
  "Departure Service",
  "Other",
];

interface TimeEntry {
  id: number;
  userId: string;
  orgId: string;
  clockIn: string;
  clockOut: string | null;
  propertyId: number | null;
  taskId: number | null;
  notes: string | null;
  billableRateCents: number | null;
  isBillable: boolean;
  workType: string | null;
  mileage: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface MissingClockoutResponse {
  count: number;
  thresholdHours: number;
  entries: TimeEntry[];
}

interface Property { id: number; name: string; }
interface Task { id: number; title: string; }
interface User { id: string; firstName: string; lastName: string; email: string; role?: string; }
interface Contact { id: string; firstName: string; lastName: string; type: string; }

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    draft: { cls: "bg-slate-100 text-slate-600 border border-slate-200", label: "Draft" },
    pending_approval: { cls: "bg-amber-100 text-amber-700 border border-amber-200", label: "Pending" },
    approved: { cls: "bg-green-100 text-green-700 border border-green-200", label: "Approved" },
    rejected: { cls: "bg-red-100 text-red-700 border border-red-200", label: "Rejected" },
  };
  const c = cfg[status] ?? cfg.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}

export default function TimeTracking() {
  const { toast } = useToast();
  const { user: _user } = useAuth();
  const user = _user as any;
  const canManage = user?.role === "admin" || user?.role === "supervisor";

  const [userFilter, setUserFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("entries");

  // Edit dialog
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editBillableRate, setEditBillableRate] = useState("");
  const [editWorkType, setEditWorkType] = useState("");
  const [editMileage, setEditMileage] = useState("");
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editPropertyId, setEditPropertyId] = useState("");
  const [editTaskId, setEditTaskId] = useState("");
  const [editUserId, setEditUserId] = useState("");

  // Reject dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Invoice generation (Phase 2)
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(new Set());
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceClientId, setInvoiceClientId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const { isFeatureEnabled } = useFeatureFlags();
  const advancedReportingEnabled = isFeatureEnabled("advanced_reporting");
  const canViewReport = canManage && advancedReportingEnabled;

  const buildQueryString = () => {
    const p = new URLSearchParams();
    if (userFilter && userFilter !== "all") p.append("userId", userFilter);
    if (propertyFilter && propertyFilter !== "all") p.append("propertyId", propertyFilter);
    if (taskFilter && taskFilter !== "all") p.append("taskId", taskFilter);
    if (startDate) p.append("startDate", startDate);
    if (endDate) p.append("endDate", endDate);
    return p.toString() ? `?${p.toString()}` : "";
  };

  const { data: allEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", userFilter, propertyFilter, taskFilter, startDate, endDate],
    queryFn: async () => {
      const resp = await fetch(`/api/time-entries${buildQueryString()}`);
      if (!resp.ok) throw new Error("Failed to fetch time entries");
      return resp.json();
    },
  });

  const entries = useMemo(() => {
    if (statusFilter === "all") return allEntries;
    return allEntries.filter((e) => e.status === statusFilter);
  }, [allEntries, statusFilter]);

  const { data: properties = [] } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const { data: missingClockouts } = useQuery<MissingClockoutResponse>({
    queryKey: ["/api/time-entries/missing-clockout"],
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: showInvoiceDialog,
  });
  const clientContacts = contacts.filter((c) => c.type === "client");

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; updates: Partial<TimeEntry> }) =>
      apiRequest("PATCH", `/api/time-entries/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({ title: "Updated", description: "Time entry has been updated." });
      setShowEditDialog(false);
      setEditingEntry(null);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/time-entries/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({ title: "Deleted", description: "Time entry has been deleted." });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" }),
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/time-entries/${id}/submit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({ title: "Submitted", description: "Entry submitted for manager approval." });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to submit", variant: "destructive" }),
  });

  const bulkActionMutation = useMutation({
    mutationFn: (data: { action: "approve" | "reject"; ids: number[]; rejectionNote?: string }) =>
      apiRequest("POST", "/api/time-entries/bulk-action", data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: vars.action === "approve" ? "Approved" : "Rejected",
        description: `${vars.ids.length} entr${vars.ids.length === 1 ? "y" : "ies"} ${vars.action === "approve" ? "approved" : "rejected"}.`,
      });
      setShowRejectDialog(false);
      setRejectingId(null);
      setRejectNote("");
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Action failed", variant: "destructive" }),
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: (data: { timeEntryIds: number[]; clientId: string; notes?: string }) =>
      apiRequest("POST", "/api/time-entries/generate-invoice", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Draft Invoice Created",
        description: `Invoice created with ${selectedEntryIds.size} time entries.`,
      });
      setShowInvoiceDialog(false);
      setSelectedEntryIds(new Set());
      setInvoiceClientId("");
      setInvoiceNotes("");
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to generate invoice", variant: "destructive" }),
  });

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditNotes(entry.notes || "");
    setEditBillableRate(entry.billableRateCents ? (entry.billableRateCents / 100).toString() : "");
    setEditWorkType(entry.workType || "");
    setEditMileage(entry.mileage?.toString() || "");
    if (canManage) {
      setEditClockIn(format(new Date(entry.clockIn), "yyyy-MM-dd'T'HH:mm"));
      setEditClockOut(entry.clockOut ? format(new Date(entry.clockOut), "yyyy-MM-dd'T'HH:mm") : "");
      setEditPropertyId(entry.propertyId?.toString() || "");
      setEditTaskId(entry.taskId?.toString() || "");
      setEditUserId(entry.userId || "");
    }
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    const updates: Partial<TimeEntry> = {
      notes: editNotes || null,
      billableRateCents: editBillableRate ? Math.round(parseFloat(editBillableRate) * 100) : null,
      workType: editWorkType || null,
      mileage: editMileage ? parseInt(editMileage) : null,
    };
    if (canManage) {
      if (editClockIn) updates.clockIn = new Date(editClockIn).toISOString();
      if (editClockOut) updates.clockOut = new Date(editClockOut).toISOString();
      updates.propertyId = editPropertyId ? parseInt(editPropertyId) : null;
      updates.taskId = editTaskId ? parseInt(editTaskId) : null;
      updates.userId = editUserId || editingEntry.userId;
    }
    updateMutation.mutate({ id: editingEntry.id, updates });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Delete this time entry?")) deleteMutation.mutate(id);
  };

  const handleApprove = (id: number) => bulkActionMutation.mutate({ action: "approve", ids: [id] });

  const handleRejectConfirm = () => {
    if (!rejectingId) return;
    bulkActionMutation.mutate({ action: "reject", ids: [rejectingId], rejectionNote: rejectNote });
  };

  const openRejectDialog = (id: number) => {
    setRejectingId(id);
    setRejectNote("");
    setShowRejectDialog(true);
  };

  const toggleEntrySelection = (id: number) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diff = end.getTime() - start.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const getPropertyName = (id: number | null) => properties.find((p) => p.id === id)?.name || "-";
  const getTaskName = (id: number | null) => tasks.find((t) => t.id === id)?.title || "-";
  const getUserName = (id: string) => {
    const u = users.find((u) => u.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };

  const totalHours = useMemo(() =>
    entries.reduce((acc, e) => {
      const h = (((e.clockOut ? new Date(e.clockOut) : new Date()).getTime() - new Date(e.clockIn).getTime())) / 3600000;
      return acc + Math.max(0, h);
    }, 0), [entries]);

  const totalBillable = useMemo(() =>
    entries.reduce((acc, e) => {
      if (!e.billableRateCents || !e.clockOut) return acc;
      const h = (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3600000;
      return acc + (e.billableRateCents / 100) * h;
    }, 0), [entries]);

  const pendingCount = useMemo(() => allEntries.filter((e) => e.status === "pending_approval").length, [allEntries]);
  const approvedCount = useMemo(() => allEntries.filter((e) => e.status === "approved").length, [allEntries]);

  const exportToCSV = () => {
    const headers = ["User", "Property", "Task", "Work Type", "Clock In", "Clock Out", "Duration", "Miles", "Billable Rate", "Status", "Notes"];
    const rows = entries.map((e) => [
      getUserName(e.userId),
      getPropertyName(e.propertyId),
      getTaskName(e.taskId),
      e.workType || "-",
      format(new Date(e.clockIn), "yyyy-MM-dd HH:mm:ss"),
      e.clockOut ? format(new Date(e.clockOut), "yyyy-MM-dd HH:mm:ss") : "Active",
      calculateDuration(e.clockIn, e.clockOut),
      e.mileage?.toString() || "-",
      e.billableRateCents ? `$${(e.billableRateCents / 100).toFixed(2)}` : "-",
      e.status,
      e.notes || "-",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `time-entries-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const selectedApprovedEntries = useMemo(
    () => entries.filter((e) => selectedEntryIds.has(e.id) && e.status === "approved" && e.isBillable && e.clockOut),
    [entries, selectedEntryIds]
  );

  const invoiceTotal = useMemo(() =>
    selectedApprovedEntries.reduce((acc, e) => {
      if (!e.billableRateCents || !e.clockOut) return acc;
      const h = (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3600000;
      return acc + (e.billableRateCents / 100) * h;
    }, 0), [selectedApprovedEntries]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Time Tracking</h1>
          <p className="text-slate-600 mt-1">View and manage time entries</p>
        </div>
        <div className="flex gap-2">
          {canManage && selectedEntryIds.size > 0 && (
            <Button onClick={() => setShowInvoiceDialog(true)} data-testid="button-generate-invoice">
              <FileText className="w-4 h-4 mr-2" />
              Generate Invoice ({selectedEntryIds.size})
            </Button>
          )}
          {activeTab === "entries" && (
            <Button onClick={exportToCSV} variant="outline" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {missingClockouts && missingClockouts.count > 0 && (
        <Alert className="border-amber-300 bg-amber-50" data-testid="alert-missing-clockout">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Missing Clock-Out Detected</AlertTitle>
          <AlertDescription className="text-amber-700">
            {missingClockouts.count} time entr{missingClockouts.count === 1 ? "y has" : "ies have"} been open for more than {missingClockouts.thresholdHours} hours.
            These entries may need to be corrected. Go to the Entries tab and look for "Active" entries with long durations.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="entries" data-testid="tab-entries">
            Entries
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          {canViewReport && (
            <TabsTrigger value="report" data-testid="tab-report">Report</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="entries" className="space-y-6 mt-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-500">Total Entries</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold" data-testid="text-total-entries">{entries.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-500">Total Hours</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold" data-testid="text-total-hours">{totalHours.toFixed(2)}h</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-500">Total Billable</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold" data-testid="text-total-billable">${totalBillable.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className={pendingCount > 0 ? "border-amber-300" : ""}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-500">Pending Approval</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={`text-2xl font-bold ${pendingCount > 0 ? "text-amber-600" : ""}`}>{pendingCount}</div>
              </CardContent>
            </Card>
            <Card className={approvedCount > 0 ? "border-green-200" : ""}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-500">Approved</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={`text-2xl font-bold ${approvedCount > 0 ? "text-green-600" : ""}`}>{approvedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {canManage && (
                  <div className="space-y-1">
                    <Label className="text-xs">User</Label>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger data-testid="select-user-filter"><SelectValue placeholder="All users" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Property</Label>
                  <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                    <SelectTrigger data-testid="select-property-filter"><SelectValue placeholder="All properties" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All properties</SelectItem>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Task</Label>
                  <Select value={taskFilter} onValueChange={setTaskFilter}>
                    <SelectTrigger data-testid="select-task-filter"><SelectValue placeholder="All tasks" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tasks</SelectItem>
                      {tasks.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-start-date" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="input-end-date" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle>Time Entries</CardTitle>
              <CardDescription>{isLoading ? "Loading..." : `Showing ${entries.length} entries`}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {canManage && <TableHead className="w-8" />}
                    <TableHead>Employee</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Work Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Miles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 9 : 8} className="text-center text-slate-500 py-8">
                        {isLoading ? "Loading..." : "No time entries found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => {
                      const isApproved = entry.status === "approved";
                      const isPending = entry.status === "pending_approval";
                      const isDraft = entry.status === "draft";
                      const isRejected = entry.status === "rejected";
                      const isOwn = entry.userId === user?.id;
                      const isActive = !entry.clockOut;
                      const isSelectable = isApproved && entry.isBillable && !isActive;

                      return (
                        <TableRow
                          key={entry.id}
                          data-testid={`row-entry-${entry.id}`}
                          className={isApproved ? "bg-green-50/30" : isPending ? "bg-amber-50/30" : isRejected ? "bg-red-50/20" : ""}
                        >
                          {canManage && (
                            <TableCell>
                              {isSelectable ? (
                                <Checkbox
                                  checked={selectedEntryIds.has(entry.id)}
                                  onCheckedChange={() => toggleEntrySelection(entry.id)}
                                  data-testid={`checkbox-entry-${entry.id}`}
                                />
                              ) : null}
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{getUserName(entry.userId)}</TableCell>
                          <TableCell>{getPropertyName(entry.propertyId)}</TableCell>
                          <TableCell>
                            <span className="text-sm">{entry.workType || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{calculateDuration(entry.clockIn, entry.clockOut)}</span>
                              {isActive && (
                                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                                  Active
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{entry.mileage != null ? `${entry.mileage} mi` : "-"}</TableCell>
                          <TableCell><StatusBadge status={entry.status} /></TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-slate-600">{entry.notes || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isApproved ? (
                                <span title="Locked — entry is approved" className="text-green-600">
                                  <Lock className="w-4 h-4" />
                                </span>
                              ) : (
                                <>
                                  {/* Edit — allowed for admin or own non-approved entries */}
                                  {(canManage || (isOwn && !isApproved)) && (
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} data-testid={`button-edit-${entry.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {/* Delete — allowed for admin or own draft/rejected entries */}
                                  {(canManage || (isOwn && (isDraft || isRejected))) && (
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)} data-testid={`button-delete-${entry.id}`}>
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  )}
                                  {/* Submit for approval — staff on own completed draft or rejected entries */}
                                  {isOwn && !isActive && (isDraft || isRejected) && !canManage && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Submit for approval"
                                      onClick={() => submitMutation.mutate(entry.id)}
                                      disabled={submitMutation.isPending}
                                      data-testid={`button-submit-${entry.id}`}
                                    >
                                      <Send className="w-4 h-4 text-blue-500" />
                                    </Button>
                                  )}
                                  {/* Admin quick submit */}
                                  {canManage && !isActive && (isDraft || isRejected) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Approve directly"
                                      onClick={() => handleApprove(entry.id)}
                                      disabled={bulkActionMutation.isPending}
                                      data-testid={`button-approve-direct-${entry.id}`}
                                    >
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    </Button>
                                  )}
                                  {/* Approve / Reject pending entries */}
                                  {canManage && isPending && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Approve"
                                        onClick={() => handleApprove(entry.id)}
                                        disabled={bulkActionMutation.isPending}
                                        data-testid={`button-approve-${entry.id}`}
                                      >
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Reject"
                                        onClick={() => openRejectDialog(entry.id)}
                                        data-testid={`button-reject-${entry.id}`}
                                      >
                                        <XCircle className="w-4 h-4 text-red-500" />
                                      </Button>
                                    </>
                                  )}
                                  {/* Staff-only: Re-submit rejected */}
                                  {isOwn && isRejected && !canManage && !isActive && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Re-submit for approval"
                                      onClick={() => submitMutation.mutate(entry.id)}
                                      disabled={submitMutation.isPending}
                                      data-testid={`button-resubmit-${entry.id}`}
                                    >
                                      <RefreshCw className="w-4 h-4 text-blue-500" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewReport && (
          <TabsContent value="report" className="mt-0">
            <TimeReport
              users={users}
              properties={properties}
              tasks={tasks}
              onDrillIn={(filters) => {
                setUserFilter(filters.userId ?? "all");
                setPropertyFilter(filters.propertyId ?? "all");
                setTaskFilter(filters.taskId ?? "all");
                if (filters.startDate) setStartDate(filters.startDate);
                if (filters.endDate) setEndDate(filters.endDate);
                setActiveTab("entries");
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Time Entry
              {canManage && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
                  <Shield className="w-3 h-3 mr-1" />
                  Full Edit Access
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {canManage ? "Full editing access to all time entry fields." : "Update notes, work type, mileage, or billable rate."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {canManage && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Clock In</Label>
                    <Input type="datetime-local" value={editClockIn} onChange={(e) => setEditClockIn(e.target.value)} data-testid="input-edit-clock-in" />
                  </div>
                  <div className="space-y-2">
                    <Label>Clock Out</Label>
                    <Input type="datetime-local" value={editClockOut} onChange={(e) => setEditClockOut(e.target.value)} data-testid="input-edit-clock-out" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={editUserId} onValueChange={setEditUserId}>
                    <SelectTrigger data-testid="select-edit-user"><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property</Label>
                    <Select value={editPropertyId} onValueChange={setEditPropertyId}>
                      <SelectTrigger data-testid="select-edit-property"><SelectValue placeholder="No property" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No property</SelectItem>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Task</Label>
                    <Select value={editTaskId} onValueChange={setEditTaskId}>
                      <SelectTrigger data-testid="select-edit-task"><SelectValue placeholder="No task" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No task</SelectItem>
                        {tasks.map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work Type</Label>
                <Select value={editWorkType} onValueChange={setEditWorkType}>
                  <SelectTrigger data-testid="select-edit-work-type"><SelectValue placeholder="Select work type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No work type</SelectItem>
                    {WORK_TYPES.map((wt) => (
                      <SelectItem key={wt} value={wt}>{wt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mileage (miles)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editMileage}
                  onChange={(e) => setEditMileage(e.target.value)}
                  placeholder="e.g. 12"
                  data-testid="input-edit-mileage"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Billable Rate ($/hour)</Label>
              <Input
                type="number"
                step="0.01"
                value={editBillableRate}
                onChange={(e) => setEditBillableRate(e.target.value)}
                placeholder="0.00"
                data-testid="input-edit-rate"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Add any notes..." rows={3} data-testid="input-edit-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} data-testid="button-cancel-edit">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid="button-save-edit">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle>Reject Time Entry</DialogTitle>
            <DialogDescription>Provide a reason for rejection so the employee can correct their entry.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Rejection Reason (Optional)</Label>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Clock-out time looks incorrect, please review and resubmit"
              rows={3}
              data-testid="input-reject-note"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={bulkActionMutation.isPending} data-testid="button-confirm-reject">
              {bulkActionMutation.isPending ? "Rejecting..." : "Reject Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog (Phase 2) */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-generate-invoice">
          <DialogHeader>
            <DialogTitle>Generate Draft Invoice</DialogTitle>
            <DialogDescription>
              Create a draft invoice from {selectedEntryIds.size} approved time entr{selectedEntryIds.size === 1 ? "y" : "ies"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Selected entries summary */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Work Type</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedApprovedEntries.map((e) => {
                    const h = (new Date(e.clockOut!).getTime() - new Date(e.clockIn).getTime()) / 3600000;
                    const amt = e.billableRateCents ? (e.billableRateCents / 100) * h : 0;
                    return (
                      <TableRow key={e.id}>
                        <TableCell>{getUserName(e.userId)}</TableCell>
                        <TableCell>{e.workType || "-"}</TableCell>
                        <TableCell className="text-right">{h.toFixed(2)}h</TableCell>
                        <TableCell className="text-right">${amt.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-slate-50 font-semibold">
                    <TableCell colSpan={3} className="text-right">Total</TableCell>
                    <TableCell className="text-right">${invoiceTotal.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="space-y-2">
              <Label>Client <span className="text-red-500">*</span></Label>
              <Select value={invoiceClientId} onValueChange={setInvoiceClientId}>
                <SelectTrigger data-testid="select-invoice-client"><SelectValue placeholder="Select a client to invoice" /></SelectTrigger>
                <SelectContent>
                  {clientContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice Notes (Optional)</Label>
              <Textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Add any notes to appear on the invoice..."
                rows={2}
                data-testid="input-invoice-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>Cancel</Button>
            <Button
              onClick={() =>
                generateInvoiceMutation.mutate({
                  timeEntryIds: Array.from(selectedEntryIds),
                  clientId: invoiceClientId,
                  notes: invoiceNotes || undefined,
                })
              }
              disabled={!invoiceClientId || generateInvoiceMutation.isPending}
              data-testid="button-confirm-generate-invoice"
            >
              {generateInvoiceMutation.isPending ? "Creating..." : "Create Draft Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
