import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  ArrowLeft,
  Shield,
  Building2,
  DollarSign,
  Settings,
  FileText,
  Users,
  Mail,
  MapPin,
  CreditCard,
  Bell,
  Download,
  Edit,
  Plus,
  Trash2,
  Save,
  Upload,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Zap,
  Database,
  Activity,
  Key,
  Copy,
  Info,
  Globe,
  XCircle,
  Webhook,
  RefreshCw,
  Send,
  Smartphone,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { enterFieldMode, exitFieldMode } from "@/components/FieldModeLayout";

// Organization form schema
const orgFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  primaryContact: z.string().optional(),
  industry: z.string().optional(),
});

type OrgFormData = z.infer<typeof orgFormSchema>;

type NotifPrefs = {
  inAppEnabled: boolean;
  emailOnTaskAssigned: boolean;
  emailOnTaskOverdue: boolean;
  emailOnInspectionDue: boolean;
  emailOnInvoiceDue: boolean;
  emailOnCalendarEvent: boolean;
  emailOnMention: boolean;
  emailOnBroadcast: boolean;
  // Per-user advance notice windows (null = use org default)
  taskOverdueHoursOffset: number | null;
  inspectionAdvanceDays: number | null;
  invoiceAdvanceDays: number | null;
  calendarAdvanceMinutes: number | null;
};

type OrgNotifDefaults = {
  inspectionDueDays?: number;
  invoiceDueDays?: number;
  calendarEventMinutes?: number;
  taskOverdueHours?: number;
  forceEnableAll?: boolean;
};

// Notifications Tab component — connected to real notification-preferences API
function NotificationsTab({ orgId, fieldModeEnabled, setFieldModeEnabled, isAdmin }: {
  orgId: string;
  fieldModeEnabled: boolean;
  setFieldModeEnabled: (v: boolean) => void;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading: prefsLoading } = useQuery<NotifPrefs>({
    queryKey: ["/api/notification-preferences"],
  });

  const { data: orgDefaults, isLoading: defaultsLoading } = useQuery<OrgNotifDefaults>({
    queryKey: [`/api/orgs/${orgId}/notification-defaults`],
    enabled: !!orgId && isAdmin,
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (updates: Partial<NotifPrefs>) =>
      apiRequest("PUT", "/api/notification-preferences", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({ title: "Preferences saved" });
    },
    onError: () => toast({ title: "Failed to save preferences", variant: "destructive" }),
  });

  const updateDefaultsMutation = useMutation({
    mutationFn: async (updates: Partial<OrgNotifDefaults>) =>
      apiRequest("PATCH", `/api/orgs/${orgId}/notification-defaults`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/notification-defaults`] });
      toast({ title: "Org defaults saved" });
    },
    onError: () => toast({ title: "Failed to save org defaults", variant: "destructive" }),
  });

  const togglePref = (key: keyof NotifPrefs, current: boolean) => {
    updatePrefsMutation.mutate({ ...prefs, [key]: !current });
  };

  const eventTypeRows: Array<{ key: keyof NotifPrefs; label: string; description: string }> = [
    { key: "emailOnTaskAssigned", label: "Task assigned to me", description: "When a task is assigned to you" },
    { key: "emailOnTaskOverdue", label: "Task overdue", description: "When your tasks pass their due date" },
    { key: "emailOnInspectionDue", label: "Inspection due soon", description: "Upcoming scheduled inspections" },
    { key: "emailOnInvoiceDue", label: "Invoice due soon", description: "Client invoices nearing their due date" },
    { key: "emailOnCalendarEvent", label: "Calendar event reminders", description: "Upcoming calendar events you own" },
    { key: "emailOnMention", label: "Mentions in messages", description: "When someone @mentions you in team chat" },
    { key: "emailOnBroadcast", label: "Team broadcasts", description: "Org-wide announcements sent to everyone" },
  ];

  if (prefsLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  const p: NotifPrefs = prefs ?? {
    inAppEnabled: true,
    emailOnTaskAssigned: true,
    emailOnTaskOverdue: true,
    emailOnInspectionDue: true,
    emailOnInvoiceDue: true,
    emailOnCalendarEvent: true,
    emailOnMention: true,
    emailOnBroadcast: true,
    taskOverdueHoursOffset: null,
    inspectionAdvanceDays: null,
    invoiceAdvanceDays: null,
    calendarAdvanceMinutes: null,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="w-5 h-5 mr-2" />My Notification Preferences</CardTitle>
          <CardDescription>Control which events trigger notifications for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* In-app toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
            <div>
              <div className="font-medium text-slate-900">In-app notification bell</div>
              <div className="text-sm text-slate-500">Show the notification badge and panel in the top navigation</div>
            </div>
            <Switch
              checked={p.inAppEnabled !== false}
              onCheckedChange={() => togglePref("inAppEnabled", p.inAppEnabled !== false)}
              disabled={updatePrefsMutation.isPending}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Email Alerts</h3>
            <div className="space-y-2">
              {eventTypeRows.map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-slate-900">{label}</div>
                    <div className="text-sm text-slate-500">{description}</div>
                  </div>
                  <Switch
                    checked={(p[key] as boolean) !== false}
                    onCheckedChange={() => togglePref(key as keyof NotifPrefs, (p[key] as boolean) !== false)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">My Advance Notice Windows</h3>
            <p className="text-xs text-slate-500 mb-3">Customize how far in advance you want to be reminded. Leave blank to use the organization defaults.</p>
            <div className="space-y-2">
              {(
                [
                  { key: "taskOverdueHoursOffset" as keyof NotifPrefs, label: "Overdue task alert (hours after due)", placeholder: "e.g. 0", min: 0, max: 168 },
                  { key: "inspectionAdvanceDays" as keyof NotifPrefs, label: "Inspection reminders (days before)", placeholder: "e.g. 7", min: 1, max: 30 },
                  { key: "invoiceAdvanceDays" as keyof NotifPrefs, label: "Invoice reminders (days before)", placeholder: "e.g. 3", min: 1, max: 14 },
                  { key: "calendarAdvanceMinutes" as keyof NotifPrefs, label: "Calendar event reminders (minutes before)", placeholder: "e.g. 60", min: 5, max: 1440 },
                ]
              ).map(({ key, label, placeholder, min, max }) => (
                <div key={key} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <Label className="text-sm font-medium text-slate-900 flex-1">{label}</Label>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    placeholder={placeholder}
                    defaultValue={(p[key] as number | null) ?? ""}
                    className="w-24 px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      if (raw === "") {
                        updatePrefsMutation.mutate({ [key]: null });
                      } else {
                        const val = parseInt(raw);
                        if (!isNaN(val) && val >= min && val <= max) {
                          updatePrefsMutation.mutate({ [key]: val });
                        }
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Org-level defaults — admin only */}
      {isAdmin && <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Settings className="w-5 h-5 mr-2" />Organization Notification Defaults</CardTitle>
          <CardDescription>
            Set org-wide timing defaults. These pre-populate preferences for new users and control reminder windows for automated jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {defaultsLoading ? (
            <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : (
            <div className="space-y-4">
              {(
                [
                  { key: "taskOverdueHours" as keyof OrgNotifDefaults, label: "Overdue task alert (hours after due)", defaultVal: 0, min: 0, max: 168 },
                  { key: "inspectionDueDays" as keyof OrgNotifDefaults, label: "Inspection due reminder (days before)", defaultVal: 7, min: 1, max: 30 },
                  { key: "invoiceDueDays" as keyof OrgNotifDefaults, label: "Invoice due reminder (days before)", defaultVal: 3, min: 1, max: 14 },
                  { key: "calendarEventMinutes" as keyof OrgNotifDefaults, label: "Calendar event reminder (minutes before)", defaultVal: 60, min: 5, max: 1440 },
                ]
              ).map(({ key, label, defaultVal, min, max }) => (
                <div key={key} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <Label className="text-sm font-medium text-slate-900 flex-1">{label}</Label>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    defaultValue={(orgDefaults?.[key] as number | undefined) ?? defaultVal}
                    className="w-24 px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= min && val <= max) {
                        updateDefaultsMutation.mutate({ [key]: val });
                      }
                    }}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">Force-enable for all users</div>
                  <div className="text-sm text-slate-500">Override individual preferences and enable all notification types for every user</div>
                </div>
                <Switch
                  checked={orgDefaults?.forceEnableAll === true}
                  onCheckedChange={(checked) => updateDefaultsMutation.mutate({ forceEnableAll: checked })}
                  disabled={updateDefaultsMutation.isPending}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* App Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Smartphone className="w-5 h-5 mr-2" />App Preferences</CardTitle>
          <CardDescription>Configure how you prefer to use Hubify on your devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-slate-900">Field Mode</div>
              <div className="text-sm text-slate-600">
                Automatically open the mobile-optimized Field Mode when you log in.
              </div>
            </div>
            <Switch
              checked={fieldModeEnabled}
              onCheckedChange={(checked) => {
                setFieldModeEnabled(checked);
                if (checked) enterFieldMode(); else exitFieldMode();
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  task_overdue: "Task Overdue",
  invoice_due: "Invoice Due",
  inspection_reminder: "Inspection Reminder",
  calendar_reminder: "Calendar Reminder",
  invoice_sent: "Invoice Sent",
  billing_summary: "Billing Summary",
};

function NotificationLogTab() {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  type NotificationLogEntry = {
    id: number;
    orgId: string;
    type: string;
    recipientEmail: string;
    recipientName: string | null;
    subject: string;
    status: "sent" | "failed";
    errorMessage: string | null;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    sentAt: string | null;
    createdAt: string;
  };

  const { data: logs = [], isLoading } = useQuery<NotificationLogEntry[]>({
    queryKey: ["/api/notification-logs", typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("limit", "200");
      const res = await fetch(`/api/notification-logs?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notification logs");
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Notification Log
        </CardTitle>
        <CardDescription>
          Audit trail of all system-generated notification emails sent by automated cron jobs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="type-filter" className="shrink-0">Filter by type:</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="type-filter" className="w-52" data-testid="select-notification-type-filter">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="task_overdue">Task Overdue</SelectItem>
                <SelectItem value="invoice_due">Invoice Due</SelectItem>
                <SelectItem value="inspection_reminder">Inspection Reminder</SelectItem>
                <SelectItem value="calendar_reminder">Calendar Reminder</SelectItem>
                <SelectItem value="invoice_sent">Invoice Sent</SelectItem>
                <SelectItem value="billing_summary">Billing Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No notification emails have been sent yet.</p>
              <p className="text-xs mt-1">Automated reminders will appear here once cron jobs run.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {NOTIFICATION_TYPE_LABELS[log.type] ?? log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{log.recipientName || ""}</div>
                      <div className="text-slate-500 text-xs">{log.recipientEmail}</div>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={log.subject}>
                      {log.subject}
                    </TableCell>
                    <TableCell>
                      {log.status === "sent" ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Sent
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs" title={log.errorMessage ?? undefined}>
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {logs.length > 0 && (
            <p className="text-xs text-slate-400">Showing up to 200 most recent entries.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Account() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("account-info");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [createApiKeyDialogOpen, setCreateApiKeyDialogOpen] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [billingSettingsDialogOpen, setBillingSettingsDialogOpen] = useState(false);
  const [fieldModeEnabled, setFieldModeEnabled] = useState<boolean>(
    localStorage.getItem("fieldModeEnabled") === "true"
  );

  const orgId = (user as any)?.orgId;
  const [, setLocation] = useLocation();

  const { data: orgSubscription } = useQuery<{
    tier?: string;
    status?: string;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    stripeSubscriptionId?: string | null;
  }>({
    queryKey: [`/api/orgs/${orgId}/subscription`],
    enabled: !!orgId && (user as any)?.role === 'admin',
    retry: false,
  });

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "You need admin access to view account settings.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch organization data
  const { data: org, isLoading: isLoadingOrg } = useQuery<any>({
    queryKey: ['/api/orgs', orgId],
    enabled: !!orgId && isAuthenticated,
  });

  // Fetch API keys
  const { data: apiKeys = [], isLoading: isLoadingApiKeys } = useQuery<any[]>({
    queryKey: [`/api/orgs/${orgId}/api-keys`],
    enabled: !!orgId && isAuthenticated,
  });

  // Form for organization info
  const form = useForm<OrgFormData>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: {
      name: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      country: "USA",
      phone: "",
      website: "",
      timezone: "America/New_York",
      currency: "USD",
      primaryContact: "",
      industry: "",
    },
  });

  // Update form when org data loads
  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name || "",
        address1: org.address1 || "",
        address2: org.address2 || "",
        city: org.city || "",
        state: org.state || "",
        zip: org.zip || "",
        country: org.country || "USA",
        phone: org.phone || "",
        website: org.website || "",
        timezone: org.timezone || "America/New_York",
        currency: org.currency || "USD",
        primaryContact: org.primaryContact || "",
        industry: org.industry || "",
      });
    }
  }, [org, form]);

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: OrgFormData) => {
      const response = await fetch(`/api/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update organization');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orgs', orgId] });
      setIsEditingInfo(false);
      toast({
        title: "Success",
        description: "Organization information updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
        variant: "destructive",
      });
    },
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/orgs/${orgId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create API key');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/api-keys`] });
      setGeneratedApiKey(data.plainKey);
      setShowApiKeyDialog(true);
      setCreateApiKeyDialogOpen(false);
      setNewApiKeyName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Revoke API key mutation
  const revokeApiKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const response = await fetch(`/api/orgs/${orgId}/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke API key');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/api-keys`] });
      toast({
        title: "Success",
        description: "API key revoked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke API key",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrgFormData) => {
    updateOrgMutation.mutate(data);
  };

  const handleCopyApiKey = () => {
    if (generatedApiKey) {
      navigator.clipboard.writeText(generatedApiKey);
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    }
  };

  const handleRevokeKey = (keyId: number, keyName: string) => {
    if (confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
      revokeApiKeyMutation.mutate(keyId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.role !== 'admin') {
    return null;
  }

  const tierLabel: Record<string, string> = {
    starter: "Starter",
    pro: "Pro",
    grow: "Grow",
    enterprise: "Enterprise",
  };
  const statusLabel: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past Due",
    canceled: "Canceled",
    incomplete: "Incomplete",
  };
  const subscriptionInfo = {
    plan: orgSubscription?.tier ? `${tierLabel[orgSubscription.tier] ?? orgSubscription.tier} Plan` : "—",
    status: orgSubscription?.status ? statusLabel[orgSubscription.status] ?? orgSubscription.status : "—",
    nextBilling: orgSubscription?.currentPeriodEnd
      ? new Date(orgSubscription.currentPeriodEnd).toLocaleDateString()
      : "—",
    cancelAtPeriodEnd: orgSubscription?.cancelAtPeriodEnd ?? false,
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
            <p className="text-lg text-slate-600">Manage your business account, billing, and configuration</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Shield className="w-3 h-3 mr-1" />
            Admin Access
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-13">
          <TabsTrigger value="account-info" data-testid="tab-account-info">Account Info</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
          <TabsTrigger value="forms" data-testid="tab-forms">Forms</TabsTrigger>
          <TabsTrigger value="custom-fields" data-testid="tab-custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="email-templates" data-testid="tab-email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="task-templates" data-testid="tab-task-templates">Task Templates</TabsTrigger>
          {isFeatureEnabled("advanced_reporting") && (
            <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
          )}
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team-roles" data-testid="tab-team-roles">Team & Roles</TabsTrigger>
          <TabsTrigger value="automation" data-testid="tab-automation">Automation</TabsTrigger>
          <TabsTrigger value="audit-log" data-testid="tab-audit-log">Audit Log</TabsTrigger>
          {(user as any)?.role === 'admin' || (user as any)?.role === 'supervisor' || (user as any)?.role === 'super_admin' ? (
            <TabsTrigger value="notification-log" data-testid="tab-notification-log">Notification Log</TabsTrigger>
          ) : null}
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* Account Information Tab */}
        <TabsContent value="account-info">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Account Information
                  </CardTitle>
                </div>
                {!isEditingInfo ? (
                  <Button
                    onClick={() => setIsEditingInfo(true)}
                    data-testid="button-edit-account"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingInfo(false);
                      form.reset();
                    }}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingOrg ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-company-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 1</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-address1"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 2</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-address2"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-6 gap-2">
                          <div className="col-span-3">
                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      disabled={!isEditingInfo}
                                      className={!isEditingInfo ? "bg-slate-50" : ""}
                                      data-testid="input-city"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-1">
                            <FormField
                              control={form.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      disabled={!isEditingInfo}
                                      className={!isEditingInfo ? "bg-slate-50" : ""}
                                      data-testid="input-state"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-2">
                            <FormField
                              control={form.control}
                              name="zip"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ZIP</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      disabled={!isEditingInfo}
                                      className={!isEditingInfo ? "bg-slate-50" : ""}
                                      data-testid="input-zip"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-country"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Phone</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-website"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="primaryContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Contact</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-primary-contact"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  placeholder="e.g., Property Management"
                                  data-testid="input-industry"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="timezone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Timezone</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-timezone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-currency"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    {isEditingInfo && (
                      <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditingInfo(false);
                            form.reset();
                          }}
                          data-testid="button-cancel-save"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateOrgMutation.isPending}
                          data-testid="button-save-account"
                        >
                          {updateOrgMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription & Billing Tab */}
        <TabsContent value="billing">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Subscription & Billing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border rounded-lg" data-testid="card-current-plan">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-900" data-testid="text-plan-name">
                            {subscriptionInfo.plan}
                          </h3>
                          <p className="text-sm text-slate-600">Current plan</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            orgSubscription?.status === 'active' || orgSubscription?.status === 'trialing'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : orgSubscription?.status === 'past_due'
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                          }
                          data-testid="badge-plan-status"
                        >
                          {subscriptionInfo.status}
                        </Badge>
                      </div>
                      <div className="mt-3 text-sm text-slate-600 space-y-1">
                        <p>Renews: <span className="font-medium">{subscriptionInfo.nextBilling}</span></p>
                        {subscriptionInfo.cancelAtPeriodEnd && (
                          <p className="text-amber-700">Cancels at end of period</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      To change your plan or update payment details, contact your Hubify account manager.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Default Billing Settings</h4>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => setBillingSettingsDialogOpen(true)}
                        data-testid="button-billing-settings"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configure Billing & Invoices
                      </Button>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Client Invoices</h4>
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => setLocation('/admin/invoices')}
                        data-testid="button-view-invoices"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Client Invoices
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Form Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 space-y-4">
                <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                <div>
                  <h3 className="font-medium text-slate-900">Manage forms in the Forms admin</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Build, share, and view submissions for your organization's forms.
                  </p>
                </div>
                <Button onClick={() => setLocation('/admin/forms')} data-testid="button-go-to-forms-admin">
                  <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
                  Open Forms Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="custom-fields">
          <CustomFieldsSettings />
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 space-y-4">
                <Mail className="w-12 h-12 text-slate-400 mx-auto" />
                <div>
                  <h3 className="font-medium text-slate-900">Manage email templates</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Create, edit, and preview templates with merge fields in the Email Templates admin.
                  </p>
                </div>
                <Button onClick={() => setLocation('/admin/email-templates')} data-testid="button-go-to-email-templates">
                  <Mail className="w-4 h-4 mr-2" />
                  Open Email Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task Templates Tab */}
        <TabsContent value="task-templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Task Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="w-12 h-12 text-slate-400 mx-auto" />
                <div>
                  <h3 className="font-medium text-slate-900">Manage task templates</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Reusable task and inspection templates live under Admin &gt; Templates.
                  </p>
                </div>
                <Button onClick={() => setLocation('/admin?tab=templates')} data-testid="button-go-to-task-templates">
                  <Settings className="w-4 h-4 mr-2" />
                  Open Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <NotificationsTab orgId={orgId} fieldModeEnabled={fieldModeEnabled} setFieldModeEnabled={setFieldModeEnabled} isAdmin={(user as { role?: string })?.role === 'admin'} />
        </TabsContent>

        {/* Team Roles Tab */}
        <TabsContent value="team-roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Team Roles & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Hubify uses three built-in roles. Assign roles to team members from the Team page.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-slate-900">Admin</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Full access to settings, billing, team, and all org data.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-slate-900">Manager</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Manage properties, tasks, calendar, and the Hubify Console. No billing access.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-slate-900">Member / Field Staff</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      View and complete assigned tasks, log time, and use Field Mode.
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setLocation('/team')} data-testid="button-go-to-team">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Team Members
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit-log">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    System activity log - read only
                  </div>
                  <Button size="sm" variant="outline" data-testid="button-export-log">
                    <Download className="w-4 h-4 mr-2" />
                    Export Log
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { time: '2025-07-24 17:15:23', user: 'andrew.dolinger@gmail.com', action: 'Task Created', details: 'Created task "Finishing painting living room"' },
                      { time: '2025-07-24 16:42:15', user: 'andrew.dolinger@gmail.com', action: 'Property Added', details: 'Added property "141 E Riverside"' },
                      { time: '2025-07-24 15:30:08', user: 'andrew.dolinger@gmail.com', action: 'User Login', details: 'Successful login from IP 192.168.1.100' },
                      { time: '2025-07-24 14:25:42', user: 'andrew.dolinger@gmail.com', action: 'Task Completed', details: 'Completed task "Flush toilets"' }
                    ].map((log, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">{log.time}</TableCell>
                        <TableCell className="text-sm">{log.user}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{log.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Log Tab */}
        <TabsContent value="notification-log">
          <NotificationLogTab />
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* API Keys Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Key className="w-5 h-5 mr-2" />
                      API Keys
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Manage API keys for programmatic access to your organization's data
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setCreateApiKeyDialogOpen(true)}
                    data-testid="button-create-api-key"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingApiKeys ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Key className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No API keys created yet</p>
                    <p className="text-sm mt-2">Create an API key to enable programmatic access</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Key Prefix</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key: any) => (
                        <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                          <TableCell className="font-medium" data-testid={`text-key-name-${key.id}`}>
                            {key.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm" data-testid={`text-key-prefix-${key.id}`}>
                            {key.keyPrefix}...
                          </TableCell>
                          <TableCell className="text-sm text-slate-600" data-testid={`text-key-created-${key.id}`}>
                            {new Date(key.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600" data-testid={`text-key-last-used-${key.id}`}>
                            {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell data-testid={`status-api-key-${key.id}`}>
                            {key.isActive ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                Revoked
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {key.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeKey(key.id, key.name)}
                                data-testid={`button-revoke-key-${key.id}`}
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Third-party Services Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Third-Party Services
                </CardTitle>
                <CardDescription className="mt-1">
                  Connect external services to enhance your platform capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    These integrations are managed through Replit's secure integration system, which handles authentication and API key management automatically.
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-slate-600">
                  Email delivery is already wired through Hubify's managed SendGrid integration —
                  no per-organization setup is required. Additional third-party connectors (e.g. SMS)
                  will appear here once they are available.
                </p>
              </CardContent>
            </Card>

            {/* Webhooks Section — gated by zapier_integration flag */}
            {isFeatureEnabled("zapier_integration") && (
              <WebhooksSection orgId={orgId} />
            )}
          </div>
        </TabsContent>

        {/* Reports Tab — gated by advanced_reporting flag */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Report Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Report template configuration will be available in Phase 2</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Automation Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Zap className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Automation rules will be available in Phase 2</p>
                <p className="text-sm mt-2">Create IF/THEN rules to automate workflows</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <Dialog open={createApiKeyDialogOpen} onOpenChange={setCreateApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for programmatic access to your organization's data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKeyName">API Key Name *</Label>
              <Input
                id="apiKeyName"
                value={newApiKeyName}
                onChange={(e) => setNewApiKeyName(e.target.value)}
                placeholder="e.g., Production API, Mobile App"
                data-testid="input-api-key-name"
              />
              <p className="text-sm text-slate-500 mt-1">
                Give your API key a descriptive name to identify its purpose
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateApiKeyDialogOpen(false);
                setNewApiKeyName("");
              }}
              data-testid="button-cancel-create-key"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newApiKeyName.trim()) {
                  createApiKeyMutation.mutate(newApiKeyName.trim());
                } else {
                  toast({
                    title: "Validation Error",
                    description: "Please enter a name for the API key",
                    variant: "destructive",
                  });
                }
              }}
              disabled={createApiKeyMutation.isPending || !newApiKeyName.trim()}
              data-testid="button-confirm-create-key"
            >
              {createApiKeyMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                "Create API Key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing Settings Dialog */}
      <Dialog open={billingSettingsDialogOpen} onOpenChange={setBillingSettingsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Default Billing & Invoice Settings</DialogTitle>
            <DialogDescription>
              Configure organization-wide default values for client billing and invoice templates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {orgId && <BillingSettingsForm orgId={orgId} onClose={() => setBillingSettingsDialogOpen(false)} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Show Generated API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>
              Copy your API key now. For security reasons, you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Store this key securely. It provides full access to your organization's data.
              </AlertDescription>
            </Alert>
            <div>
              <Label>Your API Key</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  value={generatedApiKey || ""}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="text-generated-api-key"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyApiKey}
                  data-testid="button-copy-api-key"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowApiKeyDialog(false);
                setGeneratedApiKey(null);
              }}
              data-testid="button-close-api-key-dialog"
            >
              I've Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Custom Fields Settings Component
export function CustomFieldsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeEntity, setActiveEntity] = useState<"task"|"property"|"contact">("task");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    fieldName: "",
    fieldType: "text" as "text"|"textarea"|"number"|"date"|"select"|"multiselect"|"checkbox",
    required: false,
    placeholder: "",
    helpText: "",
    options: [] as string[],
    optionInput: "",
  });
  
  const orgId = (user as any)?.orgId;
  
  // Fetch custom fields for the current entity type
  const { data: customFields = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/custom-fields", activeEntity],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/custom-fields?entityType=${activeEntity}`);
      return response.json();
    },
    enabled: !!orgId,
  });
  
  // Create mutation
  const createFieldMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      const response = await apiRequest("POST", "/api/custom-fields", fieldData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({
        title: "Success",
        description: "Custom field created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create custom field",
        variant: "destructive",
      });
    },
  });
  
  // Update mutation
  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/custom-fields/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({
        title: "Success",
        description: "Custom field updated successfully",
      });
      setEditingField(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update custom field",
        variant: "destructive",
      });
    },
  });
  
  // Delete mutation
  const deleteFieldMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/custom-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({
        title: "Success",
        description: "Custom field deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete custom field",
        variant: "destructive",
      });
    },
  });
  
  const resetForm = () => {
    setFormData({
      fieldName: "",
      fieldType: "text",
      required: false,
      placeholder: "",
      helpText: "",
      options: [],
      optionInput: "",
    });
  };
  
  const handleSubmit = () => {
    if (!formData.fieldName) {
      toast({
        title: "Validation Error",
        description: "Field name is required",
        variant: "destructive",
      });
      return;
    }
    
    const fieldData = {
      entityType: activeEntity,
      fieldName: formData.fieldName,
      fieldType: formData.fieldType,
      required: formData.required,
      placeholder: formData.placeholder || null,
      helpText: formData.helpText || null,
      options: ["select", "multiselect"].includes(formData.fieldType) ? formData.options : null,
    };
    
    if (editingField) {
      updateFieldMutation.mutate({ id: editingField.id, data: fieldData });
    } else {
      createFieldMutation.mutate(fieldData);
    }
  };
  
  const handleEdit = (field: any) => {
    setEditingField(field);
    setFormData({
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      required: field.required,
      placeholder: field.placeholder || "",
      helpText: field.helpText || "",
      options: field.options || [],
      optionInput: "",
    });
    setIsCreateDialogOpen(true);
  };
  
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this custom field? This cannot be undone.")) {
      deleteFieldMutation.mutate(id);
    }
  };
  
  const addOption = () => {
    if (formData.optionInput.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, formData.optionInput.trim()],
        optionInput: "",
      });
    }
  };
  
  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };
  
  const getFieldTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text: "Text",
      textarea: "Text Area",
      number: "Number",
      date: "Date",
      select: "Dropdown",
      multiselect: "Multi-Select",
      checkbox: "Checkbox",
    };
    return types[type] || type;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Custom Fields Configuration
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Create custom fields that can be used across properties, contacts, and tasks
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Entity Type Tabs */}
        <Tabs value={activeEntity} onValueChange={(v) => setActiveEntity(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="task">Tasks</TabsTrigger>
            <TabsTrigger value="property">Properties</TabsTrigger>
            <TabsTrigger value="contact">Contacts</TabsTrigger>
          </TabsList>
          
          {/* Fields Table */}
          <div>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : customFields.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No custom fields defined for {activeEntity}s yet</p>
                <p className="text-sm mt-2">Click "Add Field" to create your first custom field</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customFields.map((field: any) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.fieldName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getFieldTypeLabel(field.fieldType)}</Badge>
                      </TableCell>
                      <TableCell>
                        {field.required ? (
                          <Badge variant="secondary">Required</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {field.options && field.options.length > 0 
                          ? `${field.options.length} options` 
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleEdit(field)}
                            data-testid={`button-edit-field-${field.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDelete(field.id)}
                            data-testid={`button-delete-field-${field.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Tabs>
      </CardContent>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { 
        setIsCreateDialogOpen(open); 
        if (!open) { setEditingField(null); resetForm(); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit Custom Field" : "Create Custom Field"}
            </DialogTitle>
            <DialogDescription>
              Define a custom field for {activeEntity}s
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="fieldName">Field Name *</Label>
              <Input
                id="fieldName"
                value={formData.fieldName}
                onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                placeholder="e.g., Property Manager, Emergency Contact"
                data-testid="input-field-name"
              />
            </div>
            
            <div>
              <Label htmlFor="fieldType">Field Type *</Label>
              <Select 
                value={formData.fieldType} 
                onValueChange={(value) => setFormData({ ...formData, fieldType: value as any })}
              >
                <SelectTrigger data-testid="select-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Dropdown (Single Select)</SelectItem>
                  <SelectItem value="multiselect">Multi-Select</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
                data-testid="switch-required"
              />
              <Label htmlFor="required" className="cursor-pointer">
                Required Field
              </Label>
            </div>
            
            <div>
              <Label htmlFor="placeholder">Placeholder Text</Label>
              <Input
                id="placeholder"
                value={formData.placeholder}
                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                placeholder="e.g., Enter property manager name"
                data-testid="input-placeholder"
              />
            </div>
            
            <div>
              <Label htmlFor="helpText">Help Text</Label>
              <Textarea
                id="helpText"
                value={formData.helpText}
                onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
                placeholder="Additional information to help users fill out this field"
                rows={2}
                data-testid="textarea-help-text"
              />
            </div>
            
            {["select", "multiselect"].includes(formData.fieldType) && (
              <div>
                <Label>Options *</Label>
                <div className="flex space-x-2 mb-2">
                  <Input
                    value={formData.optionInput}
                    onChange={(e) => setFormData({ ...formData, optionInput: e.target.value })}
                    placeholder="Enter an option"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                    data-testid="input-option"
                  />
                  <Button type="button" onClick={addOption} data-testid="button-add-option">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm">{option}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeOption(index)}
                        data-testid={`button-remove-option-${index}`}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setIsCreateDialogOpen(false); setEditingField(null); resetForm(); }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
              data-testid="button-save-field"
            >
              {createFieldMutation.isPending || updateFieldMutation.isPending ? "Saving..." : editingField ? "Update Field" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Billing Settings Form Component
function BillingSettingsForm({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hourlyRate, setHourlyRate] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("modern");

  const { data: org, isLoading } = useQuery<any>({
    queryKey: [`/api/orgs/${orgId}`],
    enabled: !!orgId,
  });

  // Set initial values from org data
  useEffect(() => {
    if (org) {
      if (org.defaultHourlyRateCents) {
        setHourlyRate((org.defaultHourlyRateCents / 100).toFixed(2));
      }
      if (org.invoiceTemplateId) {
        setSelectedTemplate(org.invoiceTemplateId);
      }
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: async (data: { defaultHourlyRateCents?: number | null; invoiceTemplateId?: string }) => {
      return apiRequest("PATCH", `/api/orgs/${orgId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orgs`, orgId] });
      toast({
        title: "Settings updated",
        description: "Billing settings have been updated successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const rate = hourlyRate.trim() ? parseFloat(hourlyRate) : null;
    if (rate !== null && (isNaN(rate) || rate < 0)) {
      toast({
        title: "Invalid hourly rate",
        description: "Please enter a valid hourly rate (or leave empty to clear)",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      defaultHourlyRateCents: rate !== null ? Math.round(rate * 100) : null,
      invoiceTemplateId: selectedTemplate,
    });
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading settings...</div>;
  }

  const templates = [
    { id: 'modern', name: 'Modern', description: 'Clean and contemporary design with bold typography' },
    { id: 'minimal', name: 'Minimal', description: 'Simple and straightforward layout with essential details' },
    { id: 'classic', name: 'Classic', description: 'Traditional invoice format with professional styling' },
    { id: 'compact', name: 'Compact', description: 'Space-efficient design for detailed invoices' },
    { id: 'bold', name: 'Bold', description: 'Eye-catching design with prominent branding' }
  ];

  return (
    <div className="space-y-6">
      {/* Default Hourly Rate */}
      <div>
        <Label htmlFor="hourlyRate">Default Hourly Rate</Label>
        <p className="text-sm text-slate-600 mb-3">
          Set a default hourly rate that will auto-populate when enabling hourly billing for new clients. 
          Individual clients can override this rate.
        </p>
        <div className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="pl-7"
              data-testid="input-billing-hourly-rate"
            />
          </div>
          <span className="flex items-center text-sm text-slate-500">/hour</span>
        </div>
        {org?.defaultHourlyRateCents && (
          <p className="text-sm text-slate-500 mt-2">
            Current default: ${(org.defaultHourlyRateCents / 100).toFixed(2)}/hour
          </p>
        )}
      </div>

      {/* Invoice Template Selector */}
      <div className="pt-4 border-t">
        <Label>Invoice Template</Label>
        <p className="text-sm text-slate-600 mb-4">
          Choose the default template for all client invoices
        </p>
        <div className="grid grid-cols-1 gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${selectedTemplate === template.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
                }
              `}
              data-testid={`template-option-${template.id}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">{template.name}</h4>
                  <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                </div>
                {selectedTemplate === template.id && (
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={updateMutation.isPending}
          data-testid="button-cancel-billing-settings"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          data-testid="button-save-billing-settings"
        >
          {updateMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Webhook Event Types ──────────────────────────────────────────────────────
// NOTE: "test" is intentionally excluded here. It is a valid WebhookEventType
// in the schema (used for ad-hoc test deliveries), but it must never appear as
// a subscribable event option in the endpoint creation/edit form.
const WEBHOOK_EVENT_TYPES = [
  { value: "task.created", label: "Task Created" },
  { value: "task.updated", label: "Task Updated" },
  { value: "task.completed", label: "Task Completed" },
  { value: "contact.created", label: "Contact Created" },
  { value: "invoice.sent", label: "Invoice Sent" },
  { value: "inspection.completed", label: "Inspection Completed" },
];

function formatEventTypeLabel(eventType: string): string {
  if (eventType === "test") return "Test";
  const found = WEBHOOK_EVENT_TYPES.find((t) => t.value === eventType);
  return found ? found.label : eventType;
}

// ─── Webhooks Section ─────────────────────────────────────────────────────────
interface WebhookEndpoint {
  id: string;
  orgId: string;
  url: string;
  secretHint: string;
  eventTypes: string[];
  enabled: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WebhookDelivery {
  id: string;
  endpointId: string;
  orgId: string;
  eventType: string;
  status: "pending" | "success" | "failed";
  attempts: number;
  lastAttemptAt: string | null;
  responseStatus: number | null;
  errorMessage: string | null;
  createdAt: string;
}

interface WebhookEndpointFormData {
  url: string;
  secret?: string;
  description?: string;
  eventTypes: string[];
  enabled?: boolean;
}

interface TestEventResult {
  success: boolean;
  status?: number;
  error?: string;
}

function WebhooksSection({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editEndpoint, setEditEndpoint] = useState<WebhookEndpoint | null>(null);
  const [deliveryEndpointId, setDeliveryEndpointId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: endpoints = [], isLoading } = useQuery<WebhookEndpoint[]>({
    queryKey: ["/api/webhooks/endpoints"],
    enabled: !!orgId,
  });

  const { data: deliveries = [], isLoading: loadingDeliveries } = useQuery<WebhookDelivery[]>({
    queryKey: ["/api/webhooks/endpoints", deliveryEndpointId, "deliveries"],
    enabled: !!deliveryEndpointId,
    queryFn: () => fetch(`/api/webhooks/endpoints/${deliveryEndpointId}/deliveries`).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: WebhookEndpointFormData) => apiRequest("POST", "/api/webhooks/endpoints", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webhooks/endpoints"] });
      setAddOpen(false);
      setEditEndpoint(null);
      toast({ title: "Webhook endpoint created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WebhookEndpointFormData> }) =>
      apiRequest("PATCH", `/api/webhooks/endpoints/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webhooks/endpoints"] });
      setAddOpen(false);
      setEditEndpoint(null);
      toast({ title: "Webhook endpoint updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/webhooks/endpoints/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webhooks/endpoints"] });
      toast({ title: "Webhook endpoint deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: async (id: string): Promise<TestEventResult> => {
      const res = await apiRequest("POST", `/api/webhooks/endpoints/${id}/test`);
      return res.json() as Promise<TestEventResult>;
    },
    onSuccess: (data: TestEventResult, id: string) => {
      if (data.success) {
        toast({ title: "Test event delivered", description: `HTTP ${data.status}` });
      } else {
        toast({ title: "Test event sent", description: data.error || (data.status ? `HTTP ${data.status}` : "Delivery attempted"), variant: "destructive" });
      }
      qc.invalidateQueries({ queryKey: ["/api/webhooks/endpoints", id, "deliveries"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest("PATCH", `/api/webhooks/endpoints/${id}`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/webhooks/endpoints"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (ep: WebhookEndpoint) => {
    setEditEndpoint(ep);
    setAddOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Webhook className="w-5 h-5 mr-2" />
              Outbound Webhooks
            </CardTitle>
            <CardDescription className="mt-1">
              Send real-time HTTP POST notifications to Zapier, Make, N8N, or any custom endpoint when events occur.
            </CardDescription>
          </div>
          <Button onClick={() => { setEditEndpoint(null); setAddOpen(true); }} data-testid="button-add-webhook">
            <Plus className="w-4 h-4 mr-2" />
            Add Endpoint
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Webhook className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-medium">No webhook endpoints configured</p>
            <p className="text-sm mt-1">Add an endpoint to receive real-time event notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep: WebhookEndpoint) => (
              <div key={ep.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <Switch
                    checked={ep.enabled}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: ep.id, enabled: v })}
                    data-testid={`switch-endpoint-${ep.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium truncate">{ep.url}</span>
                      {ep.enabled ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200 shrink-0" variant="outline">Active</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 shrink-0" variant="outline">Disabled</Badge>
                      )}
                    </div>
                    {ep.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{ep.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(ep.eventTypes as string[]).map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => testMutation.mutate(ep.id)}
                      disabled={testMutation.isPending}
                      title="Send test event"
                      data-testid={`button-test-endpoint-${ep.id}`}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeliveryEndpointId(deliveryEndpointId === ep.id ? null : ep.id)}
                      title="View delivery log"
                      data-testid={`button-deliveries-${ep.id}`}
                    >
                      <Activity className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(ep)}
                      data-testid={`button-edit-endpoint-${ep.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {deleteConfirmId === ep.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { deleteMutation.mutate(ep.id); setDeleteConfirmId(null); }}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-confirm-delete-${ep.id}`}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(null)}
                          data-testid={`button-cancel-delete-${ep.id}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(ep.id)}
                        data-testid={`button-delete-endpoint-${ep.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Delivery Log Drawer */}
                {deliveryEndpointId === ep.id && (
                  <div className="border-t bg-slate-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                        <Activity className="w-4 h-4" />
                        Recent Deliveries
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => qc.invalidateQueries({ queryKey: ["/api/webhooks/endpoints", ep.id, "deliveries"] })}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh
                      </Button>
                    </div>
                    {loadingDeliveries ? (
                      <div className="text-center py-4 text-slate-500 text-sm">Loading...</div>
                    ) : deliveries.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-sm">No deliveries yet</div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {deliveries.map((d: WebhookDelivery) => (
                          <div key={d.id} className="bg-white rounded border p-3 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {d.status === "success" ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : d.status === "failed" ? (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                ) : (
                                  <Clock className="w-3 h-3 text-yellow-500" />
                                )}
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${d.eventType === "test" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : ""}`}
                                >
                                  {formatEventTypeLabel(d.eventType)}
                                </Badge>
                              </div>
                              <div className="text-slate-500">
                                {d.responseStatus && <span className="mr-2">HTTP {d.responseStatus}</span>}
                                {d.attempts && <span>{d.attempts} attempt{d.attempts !== 1 ? "s" : ""}</span>}
                              </div>
                            </div>
                            <div className="mt-1 text-slate-500">
                              {new Date(d.createdAt).toLocaleString()}
                              {d.errorMessage && (
                                <span className="ml-2 text-red-600">{d.errorMessage.slice(0, 120)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add / Edit Endpoint Dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) setEditEndpoint(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editEndpoint ? "Edit Webhook Endpoint" : "Add Webhook Endpoint"}</DialogTitle>
            <DialogDescription>
              Configure an HTTPS URL that will receive POST requests signed with HMAC-SHA256.
            </DialogDescription>
          </DialogHeader>
          <WebhookEndpointForm
            initial={editEndpoint}
            onSave={(data) => {
              if (editEndpoint) {
                updateMutation.mutate({ id: editEndpoint.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => { setAddOpen(false); setEditEndpoint(null); }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Webhook Endpoint Form ────────────────────────────────────────────────────
function WebhookEndpointForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: WebhookEndpoint | null;
  onSave: (data: WebhookEndpointFormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const isEditing = !!initial;
  const [url, setUrl] = useState(initial?.url ?? "");
  const [secret, setSecret] = useState("");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(initial?.eventTypes ?? []);
  const [showSecret, setShowSecret] = useState(false);

  const toggleEvent = (value: string) => {
    setSelectedEvents(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const generateSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    setSecret(Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
  };

  const handleSave = () => {
    const payload: WebhookEndpointFormData = { url, eventTypes: selectedEvents, description: description || undefined };
    if (secret) payload.secret = secret;
    onSave(payload);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="wh-url">Endpoint URL *</Label>
        <Input
          id="wh-url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://your-server.com/webhook"
          data-testid="input-webhook-url"
        />
        <p className="text-xs text-slate-500 mt-1">Must be publicly reachable HTTPS URL</p>
      </div>

      <div>
        <Label htmlFor="wh-secret">
          {isEditing ? "New Signing Secret (optional)" : "Signing Secret *"}
        </Label>
        {isEditing && initial?.secretHint && (
          <p className="text-xs text-slate-500 mb-1">
            Current secret: <code className="bg-slate-100 px-1 rounded font-mono">{initial.secretHint}</code>
            {" "}— leave blank to keep it
          </p>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="wh-secret"
              type={showSecret ? "text" : "password"}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder={isEditing ? "Enter new secret to rotate it" : "At least 8 characters"}
              data-testid="input-webhook-secret"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowSecret(v => !v)}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={generateSecret} title="Generate random secret">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Used to sign payloads via <code className="bg-slate-100 px-1 rounded">X-Hubify-Signature</code> (HMAC-SHA256)
        </p>
      </div>

      <div>
        <Label htmlFor="wh-desc">Description (optional)</Label>
        <Input
          id="wh-desc"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g., Zapier integration"
          data-testid="input-webhook-description"
        />
      </div>

      <div>
        <Label className="mb-2 block">Events to Subscribe *</Label>
        <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-slate-50">
          {WEBHOOK_EVENT_TYPES.map(et => (
            <div key={et.value} className="flex items-center gap-2">
              <Checkbox
                id={`evt-${et.value}`}
                checked={selectedEvents.includes(et.value)}
                onCheckedChange={() => toggleEvent(et.value)}
                data-testid={`checkbox-event-${et.value}`}
              />
              <label htmlFor={`evt-${et.value}`} className="text-sm cursor-pointer select-none">
                {et.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={isPending || !url || (!isEditing && !secret) || selectedEvents.length === 0}
          data-testid="button-save-webhook"
        >
          {isPending ? "Saving..." : initial ? "Update Endpoint" : "Add Endpoint"}
        </Button>
      </DialogFooter>
    </div>
  );
}