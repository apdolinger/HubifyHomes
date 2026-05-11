import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  ArrowLeft,
  Shield,
  Building2,
  DollarSign,
  ToggleLeft,
  Activity,
  MessageSquare,
  Settings,
  FileText,
  Users,
  Database,
  Server,
  Cpu,
  HardDrive,
  Network,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Globe,
  Zap,
  Palette,
  Code,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  Archive,
  AlertCircle,
  Info,
  UserPlus,
  UserMinus,
  CreditCard,
  Bell,
  Bookmark,
  LogIn,
  Ban,
  Play,
  Pause,
  Send,
  FileCode,
  Headphones,
  ExternalLink,
  Paperclip,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  XCircle,
  Funnel,
  ClipboardList,
  Link2,
  PenLine,
  History,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// ============================================================================
// Onboarding Pipeline Tab
// ============================================================================

type OnboardingStage = "inquiry" | "agreement" | "payment_setup" | "initial_payment" | "welcome" | "dropped";

interface StageHistoryEntry { stage: OnboardingStage; enteredAt: string; }

interface Prospect {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  stage: OnboardingStage;
  stageHistory: StageHistoryEntry[];
  droppedReason: string | null;
  welcomeEmailSentAt: string | null;
  orgId: string | null;
  notes: string | null;
  agreementContent: string | null;
  agreementSignedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface StageEmailTemplate {
  stage: string;
  subject: string;
  body: string;
  sendAfterDays: number;
  isActive: boolean;
}

interface ProspectEmail {
  id: string;
  prospectId: string;
  stage: string;
  subject: string;
  body: string;
  sentBy: "auto" | "manual";
  createdAt: string | null;
}

const PIPELINE_STAGES: { key: OnboardingStage; label: string; color: string }[] = [
  { key: "inquiry",         label: "Inquiry",         color: "border-blue-400 bg-blue-50" },
  { key: "agreement",       label: "Agreement",        color: "border-yellow-400 bg-yellow-50" },
  { key: "payment_setup",   label: "Payment Setup",    color: "border-orange-400 bg-orange-50" },
  { key: "initial_payment", label: "Initial Payment",  color: "border-purple-400 bg-purple-50" },
  { key: "welcome",         label: "Welcome",          color: "border-green-400 bg-green-50" },
];

const STAGE_ORDER: OnboardingStage[] = ["inquiry", "agreement", "payment_setup", "initial_payment", "welcome"];

function nextStage(current: OnboardingStage): OnboardingStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / 86400000);
}

function stageDays(prospect: Prospect): number {
  const history = prospect.stageHistory ?? [];
  const lastEntry = [...history].reverse().find(e => e.stage === prospect.stage);
  return daysSince(lastEntry?.enteredAt ?? prospect.updatedAt ?? prospect.createdAt);
}

const prospectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  agreementContent: z.string().optional(),
});
type ProspectFormValues = z.infer<typeof prospectFormSchema>;

function ProspectCard({
  prospect,
  stuckDays,
  onAdvance,
  onDrop,
  onEdit,
  onSendWelcome,
  sendingEmail,
  onConvertToOrg,
  convertingToOrg,
}: {
  prospect: Prospect;
  stuckDays: number;
  onAdvance: () => void;
  onDrop: () => void;
  onEdit: () => void;
  onSendWelcome: () => void;
  sendingEmail: boolean;
  onConvertToOrg: () => void;
  convertingToOrg: boolean;
}) {
  const [, setLocation] = useLocation();
  const days = stageDays(prospect);
  const stuck = days >= stuckDays;
  const next = nextStage(prospect.stage);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("prospectId", prospect.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="bg-white border rounded-lg p-3 shadow-sm space-y-2 cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{prospect.name}</p>
          {prospect.company && (
            <p className="text-xs text-gray-500 truncate">{prospect.company}</p>
          )}
          <p className="text-xs text-gray-400 truncate">{prospect.email}</p>
        </div>
        <Badge
          className={stuck
            ? "bg-orange-100 text-orange-800 shrink-0 text-xs"
            : "bg-gray-100 text-gray-600 shrink-0 text-xs"}
          title={stuck ? `${days} days — stuck for more than ${stuckDays} days` : `${days} days in this stage`}
        >
          {days}d{stuck ? " ⚠" : ""}
        </Badge>
      </div>

      {prospect.stage === "welcome" && (
        <div className="text-xs space-y-1">
          {prospect.welcomeEmailSentAt ? (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Sent {new Date(prospect.welcomeEmailSentAt).toLocaleDateString()}
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2 w-full"
              onClick={onSendWelcome}
              disabled={sendingEmail}
            >
              {sendingEmail
                ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Sending…</>
                : <><Send className="w-3 h-3 mr-1" /> Send Welcome Email</>
              }
            </Button>
          )}
          {prospect.orgId ? (
            <button
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium w-full"
              onClick={() => setLocation(`/super-admin?tab=organizations`)}
              title={`Org ID: ${prospect.orgId}`}
            >
              <CheckCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">Org created</span>
              <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
            </button>
          ) : (
            <Button
              size="sm"
              variant="default"
              className="h-6 text-xs px-2 w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={onConvertToOrg}
              disabled={convertingToOrg}
            >
              {convertingToOrg
                ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Creating…</>
                : <><Building2 className="w-3 h-3 mr-1" /> Create Org</>
              }
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 pt-1">
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs flex-1" onClick={onEdit}>
          <Edit className="w-3 h-3 mr-1" /> Edit
        </Button>
        {next && (
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs flex-1" onClick={onAdvance}>
            <ArrowRight className="w-3 h-3 mr-1" /> {next.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).split(" ")[0]}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-500 hover:text-red-700" onClick={onDrop} title="Mark as dropped">
          <XCircle className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function DropDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as Dropped</DialogTitle>
          <DialogDescription>Optionally record why this prospect dropped out.</DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Reason (optional)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(reason); setReason(""); }}>Confirm Drop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OnboardingPipelineTab() {
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [droppingProspect, setDroppingProspect] = useState<Prospect | null>(null);
  const [showDropped, setShowDropped] = useState(false);
  const [stuckDays, setStuckDays] = useState(7);
  const [dragOverStage, setDragOverStage] = useState<OnboardingStage | null>(null);

  const saveStuckDaysMutation = useMutation({
    mutationFn: (days: number) =>
      apiRequest('PATCH', '/api/super-admin/platform-settings', { stuckProspectThresholdDays: days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/platform-settings'] });
      toast({ title: 'Threshold saved' });
    },
    onError: (e: any) => toast({ title: 'Failed to save threshold', description: e.message, variant: 'destructive' }),
  });

  const { data: allProspects = [], isLoading } = useQuery<Prospect[]>({
    queryKey: ["/api/super-admin/onboarding-prospects"],
  });

  const { data: platformSettings } = useQuery<Record<string, any>>({
    queryKey: ["/api/super-admin/platform-settings"],
  });

  useEffect(() => {
    const threshold = platformSettings?.stuckProspectThresholdDays;
    if (typeof threshold === "number" && threshold > 0) {
      setStuckDays(threshold);
    }
  }, [platformSettings]);

  const active = allProspects.filter(p => p.stage !== "dropped");
  const dropped = allProspects.filter(p => p.stage === "dropped");

  const stageCounts = PIPELINE_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = active.filter(p => p.stage === s.key).length;
    return acc;
  }, {});

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues: { name: "", email: "", company: "", phone: "", notes: "", agreementContent: "" },
  });

  const openCreate = () => {
    setEditingProspect(null);
    form.reset({ name: "", email: "", company: "", phone: "", notes: "", agreementContent: "" });
    setSheetOpen(true);
  };

  const openEdit = (p: Prospect) => {
    setEditingProspect(p);
    form.reset({
      name: p.name,
      email: p.email,
      company: p.company ?? "",
      phone: p.phone ?? "",
      notes: p.notes ?? "",
      agreementContent: p.agreementContent ?? "",
    });
    setSheetOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: ProspectFormValues) => {
      if (editingProspect) {
        return apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${editingProspect.id}`, values);
      }
      return apiRequest("POST", "/api/super-admin/onboarding-prospects", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      setSheetOpen(false);
      toast({ title: editingProspect ? "Prospect updated" : "Prospect added to Inquiry" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save prospect", variant: "destructive" }),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: OnboardingStage }) =>
      apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${id}`, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Prospect advanced" });
    },
    onError: () => toast({ title: "Error", description: "Failed to advance prospect", variant: "destructive" }),
  });

  const dropMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${id}`, {
        stage: "dropped",
        droppedReason: reason || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      setDroppingProspect(null);
      toast({ title: "Prospect marked as dropped" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update prospect", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/super-admin/onboarding-prospects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Prospect deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete prospect", variant: "destructive" }),
  });

  const welcomeEmailMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/super-admin/onboarding-prospects/${id}/send-welcome-email`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Welcome email sent!" });
    },
    onError: (e: Error) => toast({
      title: "Email failed",
      description: e?.message || "Could not send welcome email",
      variant: "destructive",
    }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${id}`, { stage: "inquiry", droppedReason: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Prospect restored to Inquiry" });
    },
  });

  // ── Email history & send-now ─────────────────────────────────────────────
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [sendEmailStage, setSendEmailStage] = useState<OnboardingStage>("inquiry");
  const [sendEmailSubject, setSendEmailSubject] = useState("");
  const [sendEmailBody, setSendEmailBody] = useState("");

  const prospectEmailsKey = editingProspect?.id
    ? `/api/super-admin/onboarding-prospects/${editingProspect.id}/emails`
    : null;
  const { data: prospectEmails = [] } = useQuery<ProspectEmail[]>({
    queryKey: [prospectEmailsKey],
    enabled: !!prospectEmailsKey,
  });

  const { data: stageEmailTemplates = [] } = useQuery<StageEmailTemplate[]>({
    queryKey: ["/api/super-admin/stage-email-templates"],
    enabled: sheetOpen,
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ id, stage, subject, body }: { id: string; stage: string; subject: string; body: string }) =>
      apiRequest("POST", `/api/super-admin/onboarding-prospects/${id}/send-stage-email`, { stage, subject, body }),
    onSuccess: () => {
      if (editingProspect?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/super-admin/onboarding-prospects/${editingProspect.id}/emails`] });
      }
      setSendEmailOpen(false);
      toast({ title: "Email sent!" });
    },
    onError: () => toast({ title: "Error", description: "Failed to send email", variant: "destructive" }),
  });

  const prefillFromTemplate = (stage: OnboardingStage) => {
    const tpl = stageEmailTemplates.find(t => t.stage === stage);
    if (tpl) { setSendEmailSubject(tpl.subject); setSendEmailBody(tpl.body); }
    else { setSendEmailSubject(""); setSendEmailBody(""); }
  };

  // ── Agreement sign-off ────────────────────────────────────────────────────
  const signAgreementMutation = useMutation({
    mutationFn: ({ id, agreementContent }: { id: string; agreementContent?: string }) =>
      apiRequest("POST", `/api/super-admin/onboarding-prospects/${id}/sign-agreement`, { agreementContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      setSheetOpen(false);
      toast({ title: "Agreement signed!", description: "Prospect advanced to Payment Setup." });
    },
    onError: (e: Error) => toast({
      title: "Error",
      description: e?.message || "Failed to sign agreement",
      variant: "destructive",
    }),
  });

  const convertToOrgMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/super-admin/onboarding-prospects/${id}/convert-to-org`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      toast({ title: "Organization created!", description: "The prospect has been linked to the new org." });
    },
    onError: (e: Error) => toast({
      title: "Conversion failed",
      description: e?.message || "Could not create organization",
      variant: "destructive",
    }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Onboarding Pipeline
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track new customers from first contact to welcome. Drag cards between columns to move stages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <label htmlFor="stuck-threshold" className="whitespace-nowrap">Stuck after</label>
            <input
              id="stuck-threshold"
              type="number"
              min={1}
              max={90}
              value={stuckDays}
              onChange={e => setStuckDays(Math.min(90, Math.max(1, Number(e.target.value))))}
              onBlur={e => {
                if (e.relatedTarget && (e.relatedTarget as HTMLElement).dataset.saveBtn === 'stuck') return;
                saveStuckDaysMutation.mutate(Math.min(90, Math.max(1, Number(e.target.value))));
              }}
              className="w-14 border rounded px-2 py-1 text-sm text-center"
            />
            <span className="whitespace-nowrap">days</span>
            <Button
              size="sm"
              variant="outline"
              data-save-btn="stuck"
              disabled={saveStuckDaysMutation.isPending}
              onClick={() => saveStuckDaysMutation.mutate(Math.min(90, Math.max(1, stuckDays)))}
            >
              {saveStuckDaysMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const url = window.location.origin + "/inquire";
              navigator.clipboard.writeText(url).then(
                () => toast({ title: "Link copied!", description: "Share /inquire with potential clients." }),
                () => {
                  toast({ title: "Copy failed", description: `Please copy manually: ${url}`, variant: "destructive" });
                }
              );
            }}
          >
            <Link2 className="w-4 h-4 mr-2" /> Copy Inquiry Link
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Prospect
          </Button>
        </div>
      </div>

      {/* Funnel summary */}
      <div className="flex flex-wrap gap-2">
        {PIPELINE_STAGES.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className={`rounded-full px-3 py-1 text-sm font-medium border ${s.color}`}>
              {s.label}: <span className="font-bold">{stageCounts[s.key] ?? 0}</span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </div>
        ))}
        <div className="rounded-full px-3 py-1 text-sm font-medium border border-red-300 bg-red-50">
          Dropped: <span className="font-bold">{dropped.length}</span>
        </div>
      </div>

      {/* Pipeline board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {PIPELINE_STAGES.map(stage => {
            const prospects = active.filter(p => p.stage === stage.key);
            const isOver = dragOverStage === stage.key;
            return (
              <div
                key={stage.key}
                className={`w-52 rounded-xl border-2 flex flex-col transition-colors ${stage.color} ${isOver ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage.key); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const prospectId = e.dataTransfer.getData("prospectId");
                  if (!prospectId) return;
                  const prospect = active.find(p => p.id === prospectId);
                  if (!prospect || prospect.stage === stage.key) return;
                  advanceMutation.mutate({ id: prospectId, stage: stage.key });
                }}
              >
                <div className="px-3 py-2 font-semibold text-sm border-b border-gray-200 flex items-center justify-between">
                  <span>{stage.label}</span>
                  <Badge variant="secondary" className="text-xs">{prospects.length}</Badge>
                </div>
                <div className={`flex flex-col gap-2 p-2 flex-1 min-h-[80px] rounded-b-xl ${isOver ? "bg-indigo-50/60" : ""}`}>
                  {prospects.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center pt-4">{isOver ? "Drop here" : "Empty"}</p>
                  ) : (
                    prospects.map(p => (
                      <ProspectCard
                        key={p.id}
                        prospect={p}
                        stuckDays={stuckDays}
                        onAdvance={() => {
                          const ns = nextStage(p.stage);
                          if (ns) advanceMutation.mutate({ id: p.id, stage: ns });
                        }}
                        onDrop={() => setDroppingProspect(p)}
                        onEdit={() => openEdit(p)}
                        onSendWelcome={() => welcomeEmailMutation.mutate(p.id)}
                        sendingEmail={welcomeEmailMutation.isPending && welcomeEmailMutation.variables === p.id}
                        onConvertToOrg={() => convertToOrgMutation.mutate(p.id)}
                        convertingToOrg={convertToOrgMutation.isPending && convertToOrgMutation.variables === p.id}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dropped section */}
      <div>
        <button
          className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800"
          onClick={() => setShowDropped(v => !v)}
        >
          {showDropped ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Dropped Prospects ({dropped.length})
        </button>

        {showDropped && dropped.length > 0 && (
          <div className="mt-3 border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Dropped From</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dropped.map(p => {
                  const history = p.stageHistory ?? [];
                  const lastBeforeDrop = [...history].reverse().find(e => e.stage !== "dropped");
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.company ?? "—"}</TableCell>
                      <TableCell className="text-sm text-gray-500">{p.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {lastBeforeDrop?.stage?.replace(/_/g, " ") ?? "inquiry"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                        {p.droppedReason ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => restoreMutation.mutate(p.id)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-500"
                            onClick={() => {
                              if (confirm(`Delete ${p.name} permanently?`)) deleteMutation.mutate(p.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {showDropped && dropped.length === 0 && (
          <p className="text-sm text-gray-400 mt-2">No dropped prospects.</p>
        )}
      </div>

      {/* Create / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingProspect ? "Edit Prospect" : "Add New Prospect"}</SheetTitle>
            <SheetDescription>
              {editingProspect ? "Update contact details and notes." : "This will place them in the Inquiry stage."}
            </SheetDescription>
          </SheetHeader>
          <Separator className="my-4" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl><Input placeholder="Acme Property Group" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+1 555 000 0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Any context about this prospect..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Agreement editor — only shown at Agreement stage and beyond */}
              {editingProspect && ["agreement", "payment_setup", "initial_payment", "welcome"].includes(editingProspect.stage) && (
                <FormField
                  control={form.control}
                  name="agreementContent"
                  render={({ field }) => {
                    const signed = !!editingProspect.agreementSignedAt;
                    return (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="flex items-center gap-1">
                            <PenLine className="w-3.5 h-3.5" /> Agreement
                          </FormLabel>
                          {signed ? (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Signed {new Date(editingProspect.agreementSignedAt!).toLocaleDateString()}
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              disabled={!field.value || signAgreementMutation.isPending}
                              onClick={() => {
                                if (!editingProspect) return;
                                if (confirm("Mark this agreement as signed? Any unsaved text will be saved automatically. The agreement will then be locked and the prospect advanced to Payment Setup.")) {
                                  signAgreementMutation.mutate({ id: editingProspect.id, agreementContent: field.value ?? undefined });
                                }
                              }}
                            >
                              {signAgreementMutation.isPending ? "Signing…" : "Mark as Signed"}
                            </Button>
                          )}
                        </div>
                        <FormControl>
                          <Textarea
                            rows={5}
                            placeholder="Paste or type the agreement text here…"
                            disabled={signed}
                            className={signed ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
                  {saveMutation.isPending ? "Saving…" : editingProspect ? "Save Changes" : "Add Prospect"}
                </Button>
              </div>
            </form>
          </Form>

          {editingProspect && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm font-medium mb-2 text-gray-700">Stage History</p>
                <ol className="space-y-1">
                  {(editingProspect.stageHistory ?? []).map((entry, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                      <span className="capitalize font-medium">{entry.stage.replace(/_/g, " ")}</span>
                      <span className="text-gray-400">{new Date(entry.enteredAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <Separator className="my-4" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <History className="w-3.5 h-3.5" /> Sent Emails
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSendEmailStage(editingProspect.stage === "dropped" ? "inquiry" : editingProspect.stage as OnboardingStage);
                      prefillFromTemplate(editingProspect.stage === "dropped" ? "inquiry" : editingProspect.stage as OnboardingStage);
                      setSendEmailOpen(true);
                    }}
                  >
                    <Send className="w-3 h-3 mr-1" /> Send now
                  </Button>
                </div>

                {sendEmailOpen && (
                  <div className="border rounded-lg p-3 mb-3 space-y-2 bg-gray-50">
                    <div>
                      <Label className="text-xs font-medium">Stage</Label>
                      <Select
                        value={sendEmailStage}
                        onValueChange={v => {
                          setSendEmailStage(v as OnboardingStage);
                          prefillFromTemplate(v as OnboardingStage);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STAGES.map(s => (
                            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Subject</Label>
                      <Input
                        className="h-8 text-xs mt-1"
                        value={sendEmailSubject}
                        onChange={e => setSendEmailSubject(e.target.value)}
                        placeholder="Email subject…"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Body</Label>
                      <Textarea
                        rows={4}
                        className="text-xs mt-1"
                        value={sendEmailBody}
                        onChange={e => setSendEmailBody(e.target.value)}
                        placeholder="Email body…"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => setSendEmailOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        disabled={!sendEmailSubject || !sendEmailBody || sendEmailMutation.isPending}
                        onClick={() => {
                          if (!editingProspect) return;
                          sendEmailMutation.mutate({
                            id: editingProspect.id,
                            stage: sendEmailStage,
                            subject: sendEmailSubject,
                            body: sendEmailBody,
                          });
                        }}
                      >
                        {sendEmailMutation.isPending ? "Sending…" : "Send"}
                      </Button>
                    </div>
                  </div>
                )}

                {prospectEmails.length === 0 ? (
                  <p className="text-xs text-gray-400">No emails sent yet.</p>
                ) : (
                  <ol className="space-y-2">
                    {prospectEmails.map(email => (
                      <li key={email.id} className="border rounded p-2 text-xs space-y-0.5">
                        <div className="flex items-center gap-2 justify-between">
                          <span className="font-medium truncate">{email.subject}</span>
                          <Badge variant="secondary" className="capitalize shrink-0 text-[10px]">
                            {email.sentBy}
                          </Badge>
                        </div>
                        <div className="text-gray-400">
                          Stage: <span className="capitalize">{email.stage.replace(/_/g, " ")}</span>
                          {email.createdAt && <> · {new Date(email.createdAt).toLocaleString()}</>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Stage email templates configuration */}
      <StageEmailTemplatesPanel />

      {/* Drop dialog */}
      <DropDialog
        open={!!droppingProspect}
        onClose={() => setDroppingProspect(null)}
        onConfirm={reason => {
          if (droppingProspect) dropMutation.mutate({ id: droppingProspect.id, reason });
        }}
      />
    </div>
  );
}

const PREVIEW_DUMMY = {
  name: "Jane Smith",
  company: "Acme Property Group",
  email: "jane@example.com",
  phone: "+1 555 000 0000",
  stage: "inquiry",
};

function applyDummyMergeTags(text: string): string {
  return text
    .replace(/\{\{name\}\}/gi, PREVIEW_DUMMY.name)
    .replace(/\{\{company\}\}/gi, PREVIEW_DUMMY.company)
    .replace(/\{\{email\}\}/gi, PREVIEW_DUMMY.email)
    .replace(/\{\{phone\}\}/gi, PREVIEW_DUMMY.phone)
    .replace(/\{\{stage\}\}/gi, PREVIEW_DUMMY.stage);
}

function StageEmailTemplatesPanel() {
  const { toast } = useToast();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [previewingStage, setPreviewingStage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string; sendAfterDays: number; isActive: boolean }>>({});

  const { data: templates = [], isLoading } = useQuery<StageEmailTemplate[]>({
    queryKey: ["/api/super-admin/stage-email-templates"],
  });

  const upsertMutation = useMutation({
    mutationFn: ({ stage, data }: { stage: string; data: Omit<StageEmailTemplate, "stage"> }) =>
      apiRequest("PUT", `/api/super-admin/stage-email-templates/${stage}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stage-email-templates"] });
      toast({ title: "Template saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (stage: string) => apiRequest("DELETE", `/api/super-admin/stage-email-templates/${stage}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stage-email-templates"] });
      toast({ title: "Template removed" });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove template", variant: "destructive" }),
  });

  const getTemplate = (stage: string): StageEmailTemplate | undefined =>
    templates.find(t => t.stage === stage);

  const getDraft = (stage: string) => {
    if (drafts[stage]) return drafts[stage];
    const existing = getTemplate(stage);
    return {
      subject: existing?.subject ?? "",
      body: existing?.body ?? "",
      sendAfterDays: existing?.sendAfterDays ?? 0,
      isActive: existing?.isActive ?? true,
    };
  };

  const setDraft = (stage: string, patch: Partial<{ subject: string; body: string; sendAfterDays: number; isActive: boolean }>) => {
    setDrafts(d => ({ ...d, [stage]: { ...getDraft(stage), ...patch } }));
  };

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-indigo-600" />
        <h3 className="font-semibold text-sm text-gray-800">Stage Email Templates</h3>
        <span className="text-xs text-gray-400 ml-1">— Auto-send emails after N days in each stage</span>
      </div>
      {isLoading ? (
        <div className="text-xs text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-2">
          {PIPELINE_STAGES.map(s => {
            const draft = getDraft(s.key);
            const isExpanded = expandedStage === s.key;
            const existing = getTemplate(s.key);

            return (
              <div key={s.key} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedStage(isExpanded ? null : s.key)}
                >
                  <span className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                    <span className="font-medium capitalize">{s.label}</span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {existing
                      ? existing.sendAfterDays > 0
                        ? `auto-send after ${existing.sendAfterDays}d`
                        : "no auto-send"
                      : "no template"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t p-3 space-y-3 bg-gray-50/50">
                    {/* Edit / Preview toggle */}
                    <div className="flex gap-1 text-xs">
                      <button
                        type="button"
                        className={`px-2 py-1 rounded font-medium transition-colors ${previewingStage !== s.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        onClick={() => setPreviewingStage(null)}
                      >Edit</button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded font-medium transition-colors ${previewingStage === s.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        onClick={() => setPreviewingStage(s.key)}
                      >Preview</button>
                    </div>

                    {previewingStage === s.key ? (
                      /* ── Preview pane ── */
                      <div className="border rounded bg-white p-3 text-xs space-y-2">
                        <p className="text-gray-500 text-[10px] italic">Dummy data: {PREVIEW_DUMMY.name} / {PREVIEW_DUMMY.company}</p>
                        <div>
                          <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Subject</p>
                          <p className="font-medium">{applyDummyMergeTags(draft.subject) || <span className="text-gray-300">—</span>}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Body</p>
                          <div
                            className="prose prose-xs max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed"
                            style={{ fontSize: "0.75rem" }}
                          >
                            {applyDummyMergeTags(draft.body) || <span className="text-gray-300">—</span>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Edit pane ── */
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium">Subject</Label>
                            <Input
                              className="h-8 text-xs mt-1"
                              value={draft.subject}
                              onChange={e => setDraft(s.key, { subject: e.target.value })}
                              placeholder="Email subject… ({{name}}, {{company}})"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Auto-send after (days, 0 = off)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={365}
                              className="h-8 text-xs mt-1"
                              value={draft.sendAfterDays}
                              onChange={e => setDraft(s.key, { sendAfterDays: Math.max(0, Number(e.target.value)) })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Body</Label>
                          <p className="text-[10px] text-gray-400 mb-1">Available: {'{{name}} {{company}} {{email}} {{phone}} {{stage}}'}</p>
                          <Textarea
                            rows={4}
                            className="text-xs"
                            value={draft.body}
                            onChange={e => setDraft(s.key, { body: e.target.value })}
                            placeholder="Email body…"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={draft.isActive}
                            onCheckedChange={v => setDraft(s.key, { isActive: v })}
                            id={`active-${s.key}`}
                          />
                          <Label htmlFor={`active-${s.key}`} className="text-xs cursor-pointer">Active</Label>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      {existing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-500 hover:text-red-700"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Remove template for ${s.label}?`)) {
                              deleteMutation.mutate(s.key);
                              setExpandedStage(null);
                              setPreviewingStage(null);
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-7 text-xs ml-auto"
                        disabled={!draft.subject || !draft.body || upsertMutation.isPending}
                        onClick={() => upsertMutation.mutate({ stage: s.key, data: draft })}
                      >
                        {upsertMutation.isPending ? "Saving…" : "Save template"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Template Management Component
function TemplateManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    subject: '',
    htmlContent: '',
    variables: [] as string[],
    isActive: true,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/super-admin/templates'],
  });

  const templatesList = (templates as any[]) || [];
  const filteredTemplates = templatesList.filter((template: any) =>
    template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setFormData({
      type: '',
      name: '',
      subject: '',
      htmlContent: '',
      variables: [],
      isActive: true,
    });
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleEdit = (template: any) => {
    setFormData({
      type: template.type || '',
      name: template.name || '',
      subject: template.subject || '',
      htmlContent: template.htmlContent || '',
      variables: template.variables || [],
      isActive: template.isActive ?? true,
    });
    setEditingTemplate(template);
    setIsCreating(true);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await apiRequest('PATCH', `/api/super-admin/templates/${editingTemplate.id}`, formData);
        toast({ title: "Template updated successfully" });
      } else {
        await apiRequest('POST', '/api/super-admin/templates', formData);
        toast({ title: "Template created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/templates'] });
      setIsCreating(false);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save template",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await apiRequest('DELETE', `/api/super-admin/templates/${id}`);
      toast({ title: "Template deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/templates'] });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete template",
        variant: "destructive" 
      });
    }
  };

  const handleAddVariable = () => {
    const varName = prompt('Enter variable name (e.g., organizationName, eventTitle):');
    if (varName && !formData.variables.includes(varName)) {
      setFormData({ ...formData, variables: [...formData.variables, varName] });
    }
  };

  const handleRemoveVariable = (variable: string) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter(v => v !== variable)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <FileCode className="w-5 h-5 mr-2" />
            Email Template Management
          </CardTitle>
          <Button onClick={handleCreate} data-testid="button-create-template">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-templates"
            />
          </div>

          {/* Templates Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No templates found. Create your first template to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template: any) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.variables?.slice(0, 3).map((v: string) => (
                            <Badge key={v} variant="secondary" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                          {template.variables?.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.variables.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={template.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewTemplate(template)}
                            data-testid={`button-preview-${template.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            data-testid={`button-edit-${template.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update the template details below.'
                : 'Create a new email template for platform communications.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="template-type" data-testid="select-template-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_invitation">Email Invitation</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template-name">Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Event Invitation Template"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-template-name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="template-subject">Subject Line</Label>
              <Input
                id="template-subject"
                placeholder="e.g., You're invited to {{eventTitle}}"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                data-testid="input-template-subject"
              />
            </div>

            <div>
              <Label htmlFor="template-content">HTML Content</Label>
              <Textarea
                id="template-content"
                placeholder="Enter HTML content with variables like {{organizationName}}, {{eventTitle}}, etc."
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                className="min-h-[300px] font-mono text-sm"
                data-testid="input-template-content"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Template Variables</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariable}
                  data-testid="button-add-variable"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Variable
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[60px]">
                {formData.variables.length === 0 ? (
                  <p className="text-sm text-gray-500">No variables defined</p>
                ) : (
                  formData.variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-sm">
                      {`{{${variable}}}`}
                      <button
                        onClick={() => handleRemoveVariable(variable)}
                        className="ml-2 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="template-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-template-active"
              />
              <Label htmlFor="template-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)} data-testid="button-cancel-template">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-template">
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Template Preview - Type: {previewTemplate?.type}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Subject</Label>
              <p className="text-sm mt-1">{previewTemplate?.subject}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Variables</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {previewTemplate?.variables?.map((v: string) => (
                  <Badge key={v} variant="secondary">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">HTML Preview</Label>
              <div
                className="border rounded-lg p-4 mt-2 bg-white"
                dangerouslySetInnerHTML={{ __html: previewTemplate?.htmlContent || '' }}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">HTML Source</Label>
              <pre className="bg-gray-50 p-4 rounded-lg mt-2 overflow-x-auto text-xs">
                <code>{previewTemplate?.htmlContent}</code>
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setPreviewTemplate(null)} data-testid="button-close-preview">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================================
// Revenue Tab — real data from /api/super-admin/revenue-metrics
// ============================================================================
function RevenueTabContent() {
  const { data, isLoading, isError, error, refetch } = useQuery<{
    mrrCents: number;
    arrCents: number;
    arpuCents: number;
    activeOrgs: number;
    trialingOrgs: number;
    pastDueOrgs: number;
    canceledLast30Days: number;
    churnRate: number;
    planDistribution: Array<{ tier: string; count: number; mrrCents: number }>;
  }>({
    queryKey: ['/api/super-admin/revenue-metrics'],
  });

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

  const tierLabel = (t: string) => ({ starter: 'Starter', pro: 'Pro', grow: 'Grow', enterprise: 'Enterprise' } as Record<string, string>)[t] || t;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500" data-testid="revenue-loading">Loading revenue metrics…</CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center" data-testid="revenue-error">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
          <div className="text-red-700 font-medium mb-1">Failed to load revenue metrics</div>
          <div className="text-sm text-slate-500 mb-4">{(error as any)?.message || 'Unknown error'}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><TrendingUp className="w-5 h-5 mr-2" />Revenue Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between"><span className="text-sm text-slate-600">MRR</span><span className="font-semibold" data-testid="text-mrr">{fmt(data.mrrCents)}</span></div>
          <div className="flex justify-between"><span className="text-sm text-slate-600">ARR</span><span className="font-semibold" data-testid="text-arr">{fmt(data.arrCents)}</span></div>
          <div className="flex justify-between"><span className="text-sm text-slate-600">ARPU</span><span className="font-semibold" data-testid="text-arpu">{fmt(data.arpuCents)}</span></div>
          <div className="flex justify-between"><span className="text-sm text-slate-600">Churn (30d)</span><span className={`font-semibold ${data.churnRate > 5 ? 'text-red-600' : 'text-green-600'}`} data-testid="text-churn">{data.churnRate.toFixed(2)}%</span></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.planDistribution.map((p) => (
            <div key={p.tier} className="flex justify-between" data-testid={`plan-${p.tier}`}>
              <span className="text-sm text-slate-600">{tierLabel(p.tier)}</span>
              <span className="font-semibold">{p.count} orgs · {fmt(p.mrrCents)}/mo</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between"><span className="text-sm text-slate-600">Active</span><span className="font-semibold text-green-600" data-testid="text-active-orgs">{data.activeOrgs}</span></div>
          <div className="flex justify-between"><span className="text-sm text-slate-600">Trialing</span><span className="font-semibold text-blue-600" data-testid="text-trialing-orgs">{data.trialingOrgs}</span></div>
          <div className="flex justify-between"><span className="text-sm text-slate-600">Past Due</span><span className={`font-semibold ${data.pastDueOrgs > 0 ? 'text-yellow-600' : 'text-slate-600'}`} data-testid="text-pastdue-orgs">{data.pastDueOrgs}</span></div>
          <div className="flex justify-between"><span className="text-sm text-slate-600">Canceled (30d)</span><span className="font-semibold text-slate-600" data-testid="text-canceled-orgs">{data.canceledLast30Days}</span></div>
          <div className="text-xs text-slate-500 pt-2 border-t">MRR/ARR/ARPU include both Active and Past Due (still being billed).</div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Monitoring Tab — real system health data
// ============================================================================
function MonitoringTabContent() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<{
    uptimeSeconds: number;
    nodeVersion: string;
    memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
    counts: { orgs: number; users: number; activeSessions: number };
    recentErrors: Array<{ type: string; severity: string; title: string; message: string; orgName?: string; createdAt: string }>;
  }>({
    queryKey: ['/api/super-admin/system-health'],
    refetchInterval: 30000,
  });

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (isLoading) {
    return <Card><CardContent className="py-12 text-center text-slate-500" data-testid="monitoring-loading">Loading system health…</CardContent></Card>;
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center" data-testid="monitoring-error">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
          <div className="text-red-700 font-medium mb-1">Failed to load system health</div>
          <div className="text-sm text-slate-500 mb-4">{(error as any)?.message || 'Unknown error'}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const heapPct = data.memory.heapTotalMb > 0 ? Math.round((data.memory.heapUsedMb / data.memory.heapTotalMb) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center"><Server className="w-5 h-5 mr-2" />System Performance</CardTitle>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-health">
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-slate-600 mb-1">Uptime</div>
              <div className="text-2xl font-semibold" data-testid="text-uptime">{formatUptime(data.uptimeSeconds)}</div>
              <div className="text-xs text-slate-500 mt-1">Node {data.nodeVersion}</div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                <span>Heap Memory</span>
                <span className="font-semibold">{data.memory.heapUsedMb} / {data.memory.heapTotalMb} MB</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div className={`h-2 rounded-full ${heapPct > 80 ? 'bg-red-600' : heapPct > 60 ? 'bg-yellow-600' : 'bg-green-600'}`} style={{ width: `${heapPct}%` }} data-testid="bar-heap" />
              </div>
              <div className="text-xs text-slate-500 mt-1">RSS: {data.memory.rssMb} MB</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Active Sessions (15m)</div>
              <div className="text-2xl font-semibold" data-testid="text-active-sessions">{data.counts.activeSessions}</div>
              <div className="text-xs text-slate-500 mt-1">{data.counts.users} total users</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Organizations</div>
              <div className="text-2xl font-semibold" data-testid="text-org-count">{data.counts.orgs}</div>
              <div className="text-xs text-slate-500 mt-1">Across the platform</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><AlertTriangle className="w-5 h-5 mr-2" />Recent Errors (last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentErrors.length === 0 ? (
            <div className="py-8 text-center text-slate-500" data-testid="text-no-errors">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
              No errors in the last 24 hours.
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentErrors.map((err, idx) => {
                const isCritical = err.severity === 'critical';
                return (
                  <div key={idx} className={`flex items-start justify-between p-3 rounded-lg border ${isCritical ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`} data-testid={`error-${idx}`}>
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {isCritical ? <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium ${isCritical ? 'text-red-900' : 'text-yellow-900'}`}>{err.title}</div>
                        <div className={`text-sm break-words ${isCritical ? 'text-red-700' : 'text-yellow-700'}`}>{err.message}</div>
                        {err.orgName && <div className={`text-xs mt-1 ${isCritical ? 'text-red-600' : 'text-yellow-600'}`}>Org: {err.orgName}</div>}
                      </div>
                    </div>
                    <div className={`text-xs ml-2 flex-shrink-0 ${isCritical ? 'text-red-600' : 'text-yellow-600'}`}>{new Date(err.createdAt).toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Communication Tab — Platform Alerts CRUD
// ============================================================================
function CommunicationTabContent() {
  const { toast } = useToast();
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const ROLE_OPTIONS = ['super_admin', 'admin', 'manager', 'staff', 'client'] as const;
  const [form, setForm] = useState({
    title: '',
    message: '',
    severity: 'info',
    location: 'all',
    requireAck: true,
    showOncePerSession: false,
    actionLabel: '',
    actionUrl: '',
    startsAt: '',
    expiresAt: '',
    isActive: true,
    targetOrgIdsText: '',
    targetRoles: [] as string[],
  });

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      targetRoles: f.targetRoles.includes(role)
        ? f.targetRoles.filter((r) => r !== role)
        : [...f.targetRoles, role],
    }));
  };

  const parseOrgIds = (text: string): string[] | null => {
    const ids = text
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return ids.length > 0 ? ids : null;
  };

  const { data: alerts = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/super-admin/platform-alerts'],
  });

  const resetForm = () => {
    setEditingAlert(null);
    setForm({
      title: '', message: '', severity: 'info', location: 'all',
      requireAck: true, showOncePerSession: false,
      actionLabel: '', actionUrl: '', startsAt: '', expiresAt: '', isActive: true,
      targetOrgIdsText: '', targetRoles: [],
    });
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    message: form.message.trim(),
    severity: form.severity,
    location: form.location,
    requireAck: form.requireAck,
    showOncePerSession: form.showOncePerSession,
    actionLabel: form.actionLabel.trim() || null,
    actionUrl: form.actionUrl.trim() || null,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    isActive: form.isActive,
    targetOrgIds: parseOrgIds(form.targetOrgIdsText),
    targetRoles: form.targetRoles.length > 0 ? form.targetRoles : null,
  });

  const createMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/super-admin/platform-alerts', buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/platform-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platform-alerts/active'] });
      toast({ title: 'Alert created' });
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Failed to create alert', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => apiRequest('PATCH', `/api/super-admin/platform-alerts/${editingAlert.id}`, buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/platform-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platform-alerts/active'] });
      toast({ title: 'Alert updated' });
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Failed to update alert', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/super-admin/platform-alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/platform-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platform-alerts/active'] });
      toast({ title: 'Alert deleted' });
    },
    onError: (e: any) => toast({ title: 'Failed to delete alert', description: e.message, variant: 'destructive' }),
  });

  const handleEdit = (a: any) => {
    setEditingAlert(a);
    setForm({
      title: a.title || '',
      message: a.message || '',
      severity: a.severity || 'info',
      location: a.location || 'all',
      requireAck: a.requireAck ?? true,
      showOncePerSession: a.showOncePerSession ?? false,
      actionLabel: a.actionLabel || '',
      actionUrl: a.actionUrl || '',
      startsAt: a.startsAt ? new Date(a.startsAt).toISOString().slice(0, 16) : '',
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : '',
      isActive: a.isActive ?? true,
      targetOrgIdsText: Array.isArray(a.targetOrgIds) ? a.targetOrgIds.join(', ') : '',
      targetRoles: Array.isArray(a.targetRoles) ? a.targetRoles : [],
    });
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: 'Title and message are required', variant: 'destructive' });
      return;
    }
    if (editingAlert) updateMutation.mutate();
    else createMutation.mutate();
  };

  const severityBadge = (sev: string) => {
    const color = sev === 'critical' ? 'bg-red-100 text-red-800' : sev === 'warning' ? 'bg-yellow-100 text-yellow-800' : sev === 'success' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
    return <Badge variant="outline" className={color}>{sev}</Badge>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {editingAlert ? `Edit Alert #${editingAlert.id}` : 'Create Platform Alert'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="alert-title">Title</Label>
            <Input id="alert-title" placeholder="e.g., Scheduled Maintenance" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-alert-title" />
          </div>
          <div>
            <Label htmlFor="alert-message">Message</Label>
            <Textarea id="alert-message" placeholder="Alert message body..." rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="input-alert-message" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Starts At</Label>
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} data-testid="input-alert-starts" />
            </div>
            <div>
              <Label>Expires At</Label>
              <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} data-testid="input-alert-expires" />
            </div>
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
              <SelectTrigger data-testid="select-alert-severity"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info (Blue)</SelectItem>
                <SelectItem value="warning">Warning (Yellow)</SelectItem>
                <SelectItem value="critical">Critical (Red)</SelectItem>
                <SelectItem value="success">Success (Green)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Page Location</Label>
            <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
              <SelectTrigger data-testid="select-alert-location"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                <SelectItem value="dashboard">Dashboard Only</SelectItem>
                <SelectItem value="properties">Properties Page</SelectItem>
                <SelectItem value="tasks">Tasks Page</SelectItem>
                <SelectItem value="calendar">Calendar Page</SelectItem>
                <SelectItem value="billing">Billing Page</SelectItem>
                <SelectItem value="settings">Settings Page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="require-ack" checked={form.requireAck} onCheckedChange={(v) => setForm({ ...form, requireAck: v })} data-testid="switch-require-ack" />
            <Label htmlFor="require-ack">Require acknowledgment</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="show-once" checked={form.showOncePerSession} onCheckedChange={(v) => setForm({ ...form, showOncePerSession: v })} data-testid="switch-show-once" />
            <Label htmlFor="show-once">Show only once per session</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="alert-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} data-testid="switch-alert-active" />
            <Label htmlFor="alert-active">Active</Label>
          </div>
          <div>
            <Label>Target Organizations (optional)</Label>
            <Textarea
              placeholder="Comma- or space-separated organization IDs. Leave blank to target all organizations."
              rows={2}
              value={form.targetOrgIdsText}
              onChange={(e) => setForm({ ...form, targetOrgIdsText: e.target.value })}
              data-testid="input-alert-target-orgs"
            />
            <div className="text-xs text-slate-500 mt-1">Empty = all organizations</div>
          </div>
          <div>
            <Label>Target Roles (optional)</Label>
            <div className="flex flex-wrap gap-2 mt-1" data-testid="alert-target-roles">
              {ROLE_OPTIONS.map((role) => {
                const checked = form.targetRoles.includes(role);
                return (
                  <button
                    type="button"
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                      checked
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                    data-testid={`role-toggle-${role}`}
                  >
                    {role.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-500 mt-1">No selection = all roles</div>
          </div>
          <div>
            <Label>Action Button (optional)</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input placeholder="Button text" value={form.actionLabel} onChange={(e) => setForm({ ...form, actionLabel: e.target.value })} data-testid="input-action-label" />
              <Input placeholder="https://..." value={form.actionUrl} onChange={(e) => setForm({ ...form, actionUrl: e.target.value })} data-testid="input-action-url" />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1" data-testid="button-save-alert">
              {editingAlert ? 'Update Alert' : 'Create Alert'}
            </Button>
            {editingAlert && (
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-edit">Cancel</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="w-5 h-5 mr-2" />Platform Alerts ({alerts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center text-slate-500 py-6" data-testid="alerts-loading">Loading…</div>
          ) : alerts.length === 0 ? (
            <div className="text-center text-slate-500 py-6" data-testid="alerts-empty">No platform alerts yet.</div>
          ) : (
            alerts.map((a: any) => {
              const sev = a.severity || 'info';
              const bgClass = sev === 'critical' ? 'border-red-200 bg-red-50' : sev === 'warning' ? 'border-yellow-200 bg-yellow-50' : sev === 'success' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50';
              return (
                <div key={a.id} className={`p-4 border rounded-lg ${bgClass}`} data-testid={`alert-row-${a.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold">{a.title}</span>
                        {severityBadge(sev)}
                        {!a.isActive && <Badge variant="outline">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{a.message}</p>
                      <div className="text-xs text-slate-500">
                        {a.location && a.location !== 'all' ? `Location: ${a.location} · ` : ''}
                        {a.requireAck ? 'Requires ack' : 'Dismissable'}
                        {a.expiresAt ? ` · Expires ${new Date(a.expiresAt).toLocaleString()}` : ''}
                        {Array.isArray(a.targetOrgIds) && a.targetOrgIds.length > 0
                          ? ` · ${a.targetOrgIds.length} org${a.targetOrgIds.length === 1 ? '' : 's'}`
                          : ' · all orgs'}
                        {Array.isArray(a.targetRoles) && a.targetRoles.length > 0
                          ? ` · roles: ${a.targetRoles.join(', ')}`
                          : ''}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(a)} data-testid={`button-edit-alert-${a.id}`}><Edit className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this alert?')) deleteMutation.mutate(a.id); }} data-testid={`button-delete-alert-${a.id}`}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Prospect Alert Settings Card — sub-component used inside SettingsTabContent

interface DigestResult {
  sent: boolean;
  stuckCount: number;
  message: string;
}

interface SaveSectionMutation {
  mutate: (keys: string[]) => void;
  isPending: boolean;
}

interface PlatformSettingsDraft {
  stuckProspectThresholdDays?: number;
  [key: string]: unknown;
}

function ProspectAlertSettingsCard({
  draft,
  set,
  saveSection,
}: {
  draft: PlatformSettingsDraft;
  set: (k: string, v: unknown) => void;
  saveSection: SaveSectionMutation;
}) {
  const { toast } = useToast();

  const sendDigest = useMutation<DigestResult, Error>({
    mutationFn: () => apiRequest('POST', '/api/super-admin/onboarding-prospects/send-stuck-digest').then(r => r.json() as Promise<DigestResult>),
    onSuccess: (result) => {
      if (result.sent) {
        toast({ title: 'Digest sent', description: `${result.stuckCount} stuck prospect(s) listed in the email.` });
      } else {
        toast({ title: 'No stuck prospects', description: 'All active prospects are within the threshold — no email sent.' });
      }
    },
    onError: (e) => toast({ title: 'Failed to send digest', description: e.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Bell className="w-5 h-5 mr-2" />Prospect Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          A daily email digest is sent at 8&nbsp;AM listing any prospects that have been stuck in the same pipeline stage for too long. You can also trigger it immediately below.
        </p>
        <div className="max-w-xs">
          <Label htmlFor="stuck-threshold">Stuck after (days)</Label>
          <Input
            id="stuck-threshold"
            type="number"
            min={1}
            value={draft.stuckProspectThresholdDays ?? 7}
            onChange={(e) => set('stuckProspectThresholdDays', parseInt(e.target.value) || 7)}
            data-testid="input-stuck-threshold"
          />
          <p className="text-xs text-slate-500 mt-1">Prospects in the same stage for at least this many days are flagged as stuck.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => saveSection.mutate(['stuckProspectThresholdDays'])}
            disabled={saveSection.isPending}
            data-testid="button-save-stuck-threshold"
          >
            <Bell className="w-4 h-4 mr-2" />
            Save Threshold
          </Button>
          <Button
            variant="outline"
            onClick={() => sendDigest.mutate(undefined)}
            disabled={sendDigest.isPending}
            data-testid="button-send-stuck-digest"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendDigest.isPending ? 'Sending…' : 'Send Digest Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Settings Tab — backed by /api/super-admin/platform-settings
// ============================================================================
function SettingsTabContent() {
  const { toast } = useToast();
  const { data: settings, isLoading, isError, error, refetch } = useQuery<Record<string, any>>({
    queryKey: ['/api/super-admin/platform-settings'],
  });

  const [draft, setDraft] = useState<Record<string, any>>({});
  const hydratedRef = useRef(false);

  useEffect(() => {
    // Only hydrate once on first successful load to avoid clobbering in-progress edits on refetch
    if (settings && !hydratedRef.current) {
      setDraft(settings);
      hydratedRef.current = true;
    }
  }, [settings]);

  const saveSection = useMutation({
    mutationFn: async (keys: string[]) => {
      const updates: Record<string, any> = {};
      for (const k of keys) updates[k] = draft[k];
      return apiRequest('PATCH', '/api/super-admin/platform-settings', updates);
    },
    onSuccess: (savedSettings: any, savedKeys: string[]) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/platform-settings'] });
      // If the support phone was just saved, refresh the public support-info
      // query so HubifyConsole picks up the new value without a full reload.
      if (Array.isArray(savedKeys) && savedKeys.includes('support_phone')) {
        queryClient.invalidateQueries({ queryKey: ['/api/support-info'] });
        // Broadcast to other open tabs (e.g. a Hubify Console open in
        // another tab/window) so the Call Support button updates within
        // seconds without a manual page reload.
        if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('hubify-support-info');
            channel.postMessage({ type: 'support-info-changed' });
            channel.close();
          } catch {
            // BroadcastChannel may be unavailable in some browsers; the
            // per-query refetchInterval/refetchOnWindowFocus will still
            // pick up the change shortly.
          }
        }
      }
      // Reconcile draft with the server response so saved values are authoritative
      if (savedSettings && typeof savedSettings === 'object') {
        setDraft((d) => ({ ...d, ...savedSettings }));
      }
      toast({ title: 'Settings saved' });
    },
    onError: (e: any) => toast({ title: 'Failed to save', description: e.message, variant: 'destructive' }),
  });

  // Validate phone format: digits, spaces, parentheses, dashes, dots, plus sign;
  // must contain 7-20 digits.
  const isValidPhone = (raw: string): boolean => {
    if (!raw || !raw.trim()) return true; // empty is allowed (clears the value)
    const cleaned = raw.replace(/[^\d]/g, '');
    return cleaned.length >= 7 && cleaned.length <= 20 && /^[\d\s()+\-.]+$/.test(raw.trim());
  };
  const supportPhoneDraft = (draft.support_phone ?? '') as string;
  const supportPhoneValid = isValidPhone(supportPhoneDraft);

  const set = (k: string, v: any) => setDraft((d) => ({ ...d, [k]: v }));

  if (isLoading) {
    return <Card><CardContent className="py-12 text-center text-slate-500" data-testid="settings-loading">Loading settings…</CardContent></Card>;
  }

  if (isError || !settings) {
    return (
      <Card>
        <CardContent className="py-12 text-center" data-testid="settings-error">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
          <div className="text-red-700 font-medium mb-1">Failed to load platform settings</div>
          <div className="text-sm text-slate-500 mb-4">{(error as any)?.message || 'Unknown error'}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Phone className="w-5 h-5 mr-2" />Support Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="support-phone">Support Phone Number</Label>
            <Input
              id="support-phone"
              type="tel"
              placeholder="e.g. (555) 123-4567"
              value={supportPhoneDraft}
              onChange={(e) => set('support_phone', e.target.value)}
              data-testid="input-support-phone"
              aria-invalid={!supportPhoneValid}
            />
            {!supportPhoneValid && (
              <p className="text-xs text-red-600 mt-1" data-testid="text-support-phone-error">
                Enter a valid phone number (digits, spaces, dashes, parentheses, +). 7–20 digits.
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Shown on the Hubify Console "Call Support" button. Leave blank to hide the button.
            </p>
          </div>
          <Button
            onClick={() => saveSection.mutate(['support_phone'])}
            disabled={saveSection.isPending || !supportPhoneValid}
            data-testid="button-save-support-phone"
          >
            <Phone className="w-4 h-4 mr-2" />
            Save Support Phone
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Settings className="w-5 h-5 mr-2" />Platform Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="api-rate-limit">API Rate Limit (requests/hour)</Label>
              <Input id="api-rate-limit" type="number" value={draft.apiRateLimitPerHour ?? ''} onChange={(e) => set('apiRateLimitPerHour', parseInt(e.target.value) || 0)} data-testid="input-api-rate-limit" />
            </div>
            <div>
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input id="session-timeout" type="number" value={draft.sessionTimeoutMinutes ?? ''} onChange={(e) => set('sessionTimeoutMinutes', parseInt(e.target.value) || 0)} data-testid="input-session-timeout" />
            </div>
            <div>
              <Label htmlFor="max-file-size">Max File Upload Size (MB)</Label>
              <Input id="max-file-size" type="number" value={draft.maxFileUploadSizeMb ?? ''} onChange={(e) => set('maxFileUploadSizeMb', parseInt(e.target.value) || 0)} data-testid="input-max-file-size" />
            </div>
            <div>
              <Label htmlFor="webhook-retries">Webhook Retry Attempts</Label>
              <Input id="webhook-retries" type="number" value={draft.webhookRetryAttempts ?? ''} onChange={(e) => set('webhookRetryAttempts', parseInt(e.target.value) || 0)} data-testid="input-webhook-retries" />
            </div>
          </div>
          <div>
            <Label htmlFor="global-timezone">Global Time Zone</Label>
            <Select value={draft.globalTimezone || 'utc'} onValueChange={(v) => set('globalTimezone', v)}>
              <SelectTrigger id="global-timezone" data-testid="select-global-timezone"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="utc">UTC</SelectItem>
                <SelectItem value="est">Eastern (EST/EDT)</SelectItem>
                <SelectItem value="cst">Central (CST/CDT)</SelectItem>
                <SelectItem value="mst">Mountain (MST/MDT)</SelectItem>
                <SelectItem value="pst">Pacific (PST/PDT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => saveSection.mutate(['apiRateLimitPerHour', 'sessionTimeoutMinutes', 'maxFileUploadSizeMb', 'webhookRetryAttempts', 'globalTimezone'])} disabled={saveSection.isPending} data-testid="button-save-platform-config">
            <Settings className="w-4 h-4 mr-2" />
            Save Platform Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Building2 className="w-5 h-5 mr-2" />Default Organization Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="default-plan">Default Plan for New Orgs</Label>
              <Select value={draft.defaultPlanForNewOrgs || 'starter'} onValueChange={(v) => set('defaultPlanForNewOrgs', v)}>
                <SelectTrigger id="default-plan" data-testid="select-default-plan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="grow">Grow</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="trial-length">Free Trial Length (days)</Label>
              <Input id="trial-length" type="number" value={draft.freeTrialLengthDays ?? ''} onChange={(e) => set('freeTrialLengthDays', parseInt(e.target.value) || 0)} data-testid="input-trial-length" />
            </div>
          </div>
          <Button onClick={() => saveSection.mutate(['defaultPlanForNewOrgs', 'freeTrialLengthDays'])} disabled={saveSection.isPending} data-testid="button-save-org-defaults">
            <Building2 className="w-4 h-4 mr-2" />
            Save Organization Defaults
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><CreditCard className="w-5 h-5 mr-2" />Billing & Subscription Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Starter ($/mo)</Label>
              <Input type="number" value={draft.starterPlanPrice ?? ''} onChange={(e) => set('starterPlanPrice', parseFloat(e.target.value) || 0)} data-testid="input-price-starter" />
            </div>
            <div>
              <Label>Pro ($/mo)</Label>
              <Input type="number" value={draft.proPlanPrice ?? ''} onChange={(e) => set('proPlanPrice', parseFloat(e.target.value) || 0)} data-testid="input-price-pro" />
            </div>
            <div>
              <Label>Grow ($/mo)</Label>
              <Input type="number" value={draft.growPlanPrice ?? ''} onChange={(e) => set('growPlanPrice', parseFloat(e.target.value) || 0)} data-testid="input-price-grow" />
            </div>
            <div>
              <Label>Enterprise ($/mo)</Label>
              <Input type="number" value={draft.enterprisePlanPrice ?? ''} onChange={(e) => set('enterprisePlanPrice', parseFloat(e.target.value) || 0)} data-testid="input-price-enterprise" />
            </div>
          </div>
          <div>
            <Label htmlFor="grace-period">Payment Grace Period (days)</Label>
            <Input id="grace-period" type="number" value={draft.paymentGracePeriodDays ?? ''} onChange={(e) => set('paymentGracePeriodDays', parseInt(e.target.value) || 0)} data-testid="input-grace-period" />
          </div>
          <Button onClick={() => saveSection.mutate(['starterPlanPrice', 'proPlanPrice', 'growPlanPrice', 'enterprisePlanPrice', 'paymentGracePeriodDays'])} disabled={saveSection.isPending} data-testid="button-save-billing-settings">
            <CreditCard className="w-4 h-4 mr-2" />
            Save Billing Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Server className="w-5 h-5 mr-2" />System Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-900">Maintenance Mode</div>
                  <div className="text-sm text-yellow-700">When enabled, this flag is exposed via the platform settings API (consumers should display the maintenance message and block writes).</div>
                </div>
              </div>
              <Switch id="maintenance-mode" checked={!!draft.maintenanceMode} onCheckedChange={(v) => set('maintenanceMode', v)} data-testid="switch-maintenance-mode" />
            </div>
          </div>
          <div>
            <Label htmlFor="downtime-message">Maintenance Mode Message</Label>
            <Textarea id="downtime-message" value={draft.maintenanceMessage ?? ''} onChange={(e) => set('maintenanceMessage', e.target.value)} data-testid="textarea-downtime-message" />
          </div>
          <Button onClick={() => saveSection.mutate(['maintenanceMode', 'maintenanceMessage'])} disabled={saveSection.isPending} data-testid="button-save-maintenance-settings">
            <Server className="w-4 h-4 mr-2" />
            Save Maintenance Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Lock className="w-5 h-5 mr-2" />Password Policy & Session Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Password Complexity Requirements</Label>
            <div className="space-y-2 mt-2 pl-4">
              <div className="flex items-center space-x-2">
                <Switch id="pwd-uppercase" checked={!!draft.passwordRequireUppercase} onCheckedChange={(v) => set('passwordRequireUppercase', v)} data-testid="switch-pwd-uppercase" />
                <Label htmlFor="pwd-uppercase">Require uppercase letters</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="pwd-numbers" checked={!!draft.passwordRequireNumbers} onCheckedChange={(v) => set('passwordRequireNumbers', v)} data-testid="switch-pwd-numbers" />
                <Label htmlFor="pwd-numbers">Require numbers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="pwd-special" checked={!!draft.passwordRequireSpecial} onCheckedChange={(v) => set('passwordRequireSpecial', v)} data-testid="switch-pwd-special" />
                <Label htmlFor="pwd-special">Require special characters</Label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pwd-min-length">Minimum Password Length</Label>
              <Input id="pwd-min-length" type="number" value={draft.passwordMinLength ?? ''} onChange={(e) => set('passwordMinLength', parseInt(e.target.value) || 0)} data-testid="input-pwd-min-length" />
            </div>
            <div>
              <Label htmlFor="session-length">Max Session Length (hours)</Label>
              <Input id="session-length" type="number" value={draft.maxSessionLengthHours ?? ''} onChange={(e) => set('maxSessionLengthHours', parseInt(e.target.value) || 0)} data-testid="input-session-length" />
            </div>
          </div>
          <div>
            <Label htmlFor="ip-whitelist">IP Whitelist (comma-separated)</Label>
            <Textarea id="ip-whitelist" placeholder="192.168.1.1, 10.0.0.0/24" value={draft.ipWhitelist ?? ''} onChange={(e) => set('ipWhitelist', e.target.value)} data-testid="textarea-ip-whitelist" />
          </div>
          <Button onClick={() => saveSection.mutate(['passwordMinLength', 'passwordRequireUppercase', 'passwordRequireNumbers', 'passwordRequireSpecial', 'maxSessionLengthHours', 'ipWhitelist'])} disabled={saveSection.isPending} data-testid="button-save-security-settings">
            <Lock className="w-4 h-4 mr-2" />
            Save Security Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="w-5 h-5 mr-2" />Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="brand-color">Default Brand Color</Label>
            <div className="flex items-center space-x-2">
              <Input id="brand-color" type="color" value={draft.brandPrimaryColor || '#4F46E5'} onChange={(e) => set('brandPrimaryColor', e.target.value)} className="w-20 h-10" data-testid="input-default-color" />
              <Input type="text" value={draft.brandPrimaryColor || ''} onChange={(e) => set('brandPrimaryColor', e.target.value)} className="flex-1" data-testid="input-default-color-hex" />
            </div>
          </div>
          <Button onClick={() => saveSection.mutate(['brandPrimaryColor'])} disabled={saveSection.isPending} data-testid="button-save-customization-settings">
            <Palette className="w-4 h-4 mr-2" />
            Save Branding
          </Button>
        </CardContent>
      </Card>

      <ProspectAlertSettingsCard draft={draft} set={set} saveSection={saveSection} />
    </div>
  );
}

// Email Templates Component
function EmailTemplates() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: '' as 'ticket_receipt' | 'ticket_notification' | 'status_update' | '',
    subject: '',
    fromEmail: '',
    fromName: '',
    bodyHtml: '',
    bodyText: '',
    isActive: true,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/super-admin/email-templates'],
  });

  const templatesList = (templates as any[]) || [];
  const filteredTemplates = templatesList.filter((template: any) =>
    template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.fromEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Variable hints based on template type
  const getVariableHints = (type: string) => {
    switch (type) {
      case 'ticket_receipt':
        return ['userName', 'subject', 'message', 'ticketId', 'createdAt'];
      case 'ticket_notification':
        return ['userName', 'organizationName', 'subject', 'message', 'ticketId', 'email', 'createdAt'];
      case 'status_update':
        return ['userName', 'subject', 'status', 'ticketId'];
      default:
        return [];
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      type: '',
      subject: '',
      fromEmail: '',
      fromName: '',
      bodyHtml: '',
      bodyText: '',
      isActive: true,
    });
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name || '',
      type: template.type || '',
      subject: template.subject || '',
      fromEmail: template.fromEmail || '',
      fromName: template.fromName || '',
      bodyHtml: template.bodyHtml || '',
      bodyText: template.bodyText || '',
      isActive: template.isActive ?? true,
    });
    setEditingTemplate(template);
    setIsCreating(true);
  };

  const handleSave = async () => {
    try {
      // Basic validation
      if (!formData.name || !formData.type || !formData.subject || !formData.fromEmail || !formData.fromName) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      if (!formData.bodyHtml || !formData.bodyText) {
        toast({
          title: "Validation Error",
          description: "Both HTML and Text body are required",
          variant: "destructive"
        });
        return;
      }

      if (editingTemplate) {
        await apiRequest('PATCH', `/api/super-admin/email-templates/${editingTemplate.id}`, formData);
        toast({ title: "Template updated successfully" });
      } else {
        await apiRequest('POST', '/api/super-admin/email-templates', formData);
        toast({ title: "Template created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/email-templates'] });
      setIsCreating(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const confirmDelete = (template: any) => {
    setTemplateToDelete(template);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await apiRequest('DELETE', `/api/super-admin/email-templates/${templateToDelete.id}`);
      toast({ title: "Template deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/email-templates'] });
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (template: any) => {
    try {
      await apiRequest('PATCH', `/api/super-admin/email-templates/${template.id}`, {
        ...template,
        isActive: !template.isActive
      });
      toast({ title: `Template ${!template.isActive ? 'activated' : 'deactivated'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/email-templates'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update template status",
        variant: "destructive"
      });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ticket_receipt':
        return 'Ticket Receipt';
      case 'ticket_notification':
        return 'Ticket Notification';
      case 'status_update':
        return 'Status Update';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Templates for Support Tickets
            </CardTitle>
            <Button onClick={handleCreate} data-testid="button-create-email-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search templates by name, type, subject, or from email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-email-templates"
              />
            </div>

            {/* Templates Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>From Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        {searchTerm
                          ? 'No templates match your search.'
                          : 'No email templates found. Create your first template to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template: any) => (
                      <TableRow key={template.id} data-testid={`row-email-template-${template.id}`}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(template.type)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                        <TableCell className="text-sm text-gray-600">{template.fromEmail}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={template.isActive}
                              onCheckedChange={() => handleToggleStatus(template)}
                              data-testid={`switch-status-${template.id}`}
                            />
                            <span className="text-sm text-gray-600">
                              {template.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(template)}
                              data-testid={`button-edit-${template.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDelete(template)}
                              data-testid={`button-delete-${template.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredTemplates.length > 0 && (
              <div className="text-sm text-gray-500">
                Showing {filteredTemplates.length} of {templatesList.length} email templates
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Email Template' : 'Create New Email Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update the email template details below.'
                : 'Create a new email template for support ticket communications.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Support Ticket Receipt"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-template-name"
                />
              </div>

              <div>
                <Label htmlFor="template-type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="template-type" data-testid="select-template-type">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ticket_receipt">Ticket Receipt</SelectItem>
                    <SelectItem value="ticket_notification">Ticket Notification</SelectItem>
                    <SelectItem value="status_update">Status Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="template-subject">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="template-subject"
                placeholder="e.g., Your support ticket has been received - {{ticketId}}"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                data-testid="input-template-subject"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-from-email">
                  From Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="template-from-email"
                  type="email"
                  placeholder="e.g., support@hubify.com"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  data-testid="input-template-from-email"
                />
              </div>

              <div>
                <Label htmlFor="template-from-name">
                  From Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="template-from-name"
                  placeholder="e.g., Hubify Support Team"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  data-testid="input-template-from-name"
                />
              </div>
            </div>

            {formData.type && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-sm font-medium text-blue-900">Available Variables</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getVariableHints(formData.type).map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs font-mono">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Use these variables in your subject and body to personalize emails. They will be replaced with actual values when emails are sent.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="template-body-html">
                Body HTML <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="template-body-html"
                placeholder="Enter HTML content with variables like {{userName}}, {{ticketId}}, etc."
                value={formData.bodyHtml}
                onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
                className="min-h-[200px] font-mono text-sm"
                data-testid="input-template-body-html"
              />
              <p className="text-xs text-gray-500 mt-1">
                HTML version of the email for rich formatting
              </p>
            </div>

            <div>
              <Label htmlFor="template-body-text">
                Body Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="template-body-text"
                placeholder="Enter plain text content with variables like {{userName}}, {{ticketId}}, etc."
                value={formData.bodyText}
                onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                className="min-h-[200px] font-mono text-sm"
                data-testid="input-template-body-text"
              />
              <p className="text-xs text-gray-500 mt-1">
                Plain text version for email clients that don't support HTML
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="template-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-template-active"
              />
              <Label htmlFor="template-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)} data-testid="button-cancel-email-template">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-email-template">
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Email Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template "{templateToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setTemplateToDelete(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              data-testid="button-confirm-delete"
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Support Tickets Component
function SupportTickets() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { data: supportRequests, isLoading, error } = useQuery({
    queryKey: ['/api/super-admin/support-requests'],
  });

  const requestsList = (supportRequests as any[]) || [];
  
  // Extract unique organizations
  const uniqueOrganizations = Array.from(
    new Set(
      requestsList
        .map((req: any) => req.organizationName)
        .filter((name: any) => name && name !== 'N/A')
    )
  ).sort();
  
  const filteredRequests = requestsList.filter((request: any) => {
    const matchesSearch = 
      request.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    const matchesUrgency = selectedUrgency === 'all' || request.urgency === selectedUrgency;
    
    const matchesOrg = selectedOrg === 'all' || request.organizationName === selectedOrg;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const requestDate = request.createdAt ? new Date(request.createdAt) : null;
      if (requestDate) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (requestDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (requestDate > end) matchesDate = false;
        }
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesUrgency && matchesOrg && matchesDate;
  });
  
  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleStatusUpdate = async (requestId: number, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await apiRequest('PATCH', `/api/super-admin/support-requests/${requestId}`, { status: newStatus });
      toast({ title: "Status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/support-requests'] });
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update status",
        variant: "destructive" 
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      case 'resolved':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return status;
    }
  };

  const getUrgencyBadgeClass = (urgency: string) => {
    switch (urgency) {
      case 'low':
        return 'bg-slate-100 text-slate-700';
      case 'medium':
        return 'bg-blue-100 text-blue-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'critical':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    if (!urgency) return 'Low';
    return urgency.charAt(0).toUpperCase() + urgency.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        Error loading support requests: {error.message}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Headphones className="w-5 h-5 mr-2" />
              Support Tickets
            </CardTitle>
            <Badge variant="outline" className="px-3 py-1">
              {filteredRequests.length} tickets
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by subject, email, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-support"
                />
              </div>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger className="w-[200px]" data-testid="select-organization-filter">
                  <SelectValue placeholder="Filter by organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {uniqueOrganizations.map((org: string) => (
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
                <SelectTrigger className="w-[180px]" data-testid="select-urgency-filter">
                  <SelectValue placeholder="Filter by urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="urgency-all">All Urgencies</SelectItem>
                  <SelectItem value="low" data-testid="urgency-low">Low</SelectItem>
                  <SelectItem value="medium" data-testid="urgency-medium">Medium</SelectItem>
                  <SelectItem value="high" data-testid="urgency-high">High</SelectItem>
                  <SelectItem value="critical" data-testid="urgency-critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
                placeholder="Start date"
                data-testid="input-start-date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
                placeholder="End date"
                data-testid="input-end-date"
              />
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearDates}
                  data-testid="button-clear-dates"
                >
                  Clear Dates
                </Button>
              )}
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        {searchTerm || statusFilter !== 'all' || selectedUrgency !== 'all' || selectedOrg !== 'all' || startDate || endDate
                          ? 'No support requests match your filters.'
                          : 'No support requests found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request: any) => (
                      <TableRow 
                        key={request.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedRequest(request)}
                        data-testid={`row-support-${request.id}`}
                      >
                        <TableCell className="font-mono text-sm">#{request.id}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.subject}
                        </TableCell>
                        <TableCell>
                          <Badge className={getUrgencyBadgeClass(request.urgency || 'low')} data-testid={`badge-urgency-${request.id}`}>
                            {getUrgencyLabel(request.urgency || 'low')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {request.organizationName || 'N/A'}
                        </TableCell>
                        <TableCell>{request.userName || 'Anonymous'}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(request.status)}>
                            {getStatusLabel(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {request.createdAt 
                            ? new Date(request.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredRequests.length > 0 && (
              <div className="text-sm text-gray-500">
                Showing {filteredRequests.length} of {requestsList.length} support requests
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              Support Request #{selectedRequest?.id}
            </DialogTitle>
            <DialogDescription>
              Submitted on {selectedRequest?.createdAt 
                ? new Date(selectedRequest.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'N/A'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Organization</Label>
                <p className="text-sm mt-1 font-medium">
                  {selectedRequest?.organizationName || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Status</Label>
                <div className="mt-1">
                  <Select 
                    value={selectedRequest?.status || 'new'}
                    onValueChange={(value) => handleStatusUpdate(selectedRequest?.id, value)}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-full" data-testid="select-update-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Urgency</Label>
                <div className="mt-1">
                  <Badge className={getUrgencyBadgeClass(selectedRequest?.urgency || 'low')}>
                    {getUrgencyLabel(selectedRequest?.urgency || 'low')}
                  </Badge>
                </div>
              </div>
              <div></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">User Name</Label>
                <p className="text-sm mt-1">{selectedRequest?.userName || 'Anonymous'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <p className="text-sm mt-1">
                  <a 
                    href={`mailto:${selectedRequest?.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {selectedRequest?.email}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Subject</Label>
              <p className="text-sm mt-1 font-medium">{selectedRequest?.subject}</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Message</Label>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap">
                  {selectedRequest?.message || 'No message provided.'}
                </p>
              </div>
            </div>

            {selectedRequest?.hyperlinks && selectedRequest.hyperlinks.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Links</Label>
                <div className="mt-2 space-y-2">
                  {selectedRequest.hyperlinks.map((link: string, index: number) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      data-testid={`link-hyperlink-${index}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {selectedRequest?.attachments && selectedRequest.attachments.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Attachments</Label>
                <div className="mt-2 space-y-2">
                  {selectedRequest.attachments.map((attachment: any, index: number) => (
                    <a
                      key={index}
                      href={attachment.url || attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50"
                      data-testid={`link-attachment-${index}`}
                    >
                      <Paperclip className="w-4 h-4" />
                      <span className="text-sm">
                        {attachment.name || attachment.url || attachment}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedRequest(null)}
              data-testid="button-close-details"
            >
              Close
            </Button>
            <Button 
              onClick={() => window.open(`mailto:${selectedRequest?.email}`, '_blank')}
              data-testid="button-reply-email"
            >
              <Mail className="w-4 h-4 mr-2" />
              Reply via Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Communities Report Component
function CommunitiesReport() {
  const { data: communitiesData, isLoading, error } = useQuery({
    queryKey: ['/api/super-admin/communities-report'],
    enabled: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading communities report: {error.message}
      </div>
    );
  }

  const communitiesList = (communitiesData as any[]) || [];
  const filteredCommunities = communitiesList.filter((community: any) =>
    community.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.organizationNames?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.fullAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadCSV = () => {
    if (!communitiesList || communitiesList.length === 0) return;

    const headers = [
      'Community Name',
      'Address',
      'City',
      'State',
      'ZIP',
      'Manager',
      'Manager Email',
      'Property Count',
      'Organizations',
      'Status',
      'Created Date'
    ];

    const csvData = [
      headers,
      ...communitiesList.map((community: any) => [
        community.name || '',
        community.address1 || '',
        community.city || '',
        community.state || '',
        community.zip || '',
        community.managerName || 'N/A',
        community.managerEmail || 'N/A',
        community.propertyCount || 0,
        community.organizationNames || 'No Properties',
        community.isActive ? 'Active' : 'Inactive',
        community.createdAt ? new Date(community.createdAt).toLocaleDateString() : 'N/A'
      ])
    ];

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `communities-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Badge variant="outline" className="px-3 py-1">
            {filteredCommunities.length} communities
          </Badge>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Community Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Properties</TableHead>
              <TableHead>Organizations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCommunities.map((community: any) => (
              <TableRow key={community.id}>
                <TableCell className="font-medium">
                  {community.name || 'Unnamed Community'}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {community.fullAddress || 'No Address'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{community.managerName}</div>
                    {community.managerEmail && (
                      <div className="text-gray-500">{community.managerEmail}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {community.propertyCount || 0} properties
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={community.organizationNames}>
                    {community.organizationNames}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={community.isActive ? "default" : "secondary"}
                  >
                    {community.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {community.createdAt ? new Date(community.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredCommunities.length === 0 && communitiesList && communitiesList.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          No communities match your search criteria.
        </div>
      )}

      {(!communitiesList || communitiesList.length === 0) && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          No communities found in the database.
        </div>
      )}
    </div>
  );
}

// Vendors Report Component
function VendorsReport() {
  const { data: vendorsData, isLoading, error } = useQuery({
    queryKey: ['/api/super-admin/vendors-report'],
    enabled: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading vendors report: {error.message}
      </div>
    );
  }

  const vendorsList = (vendorsData as any[]) || [];
  const filteredVendors = vendorsList.filter((vendor: any) =>
    vendor.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.vendorType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadCSV = () => {
    if (!vendorsList || vendorsList.length === 0) return;

    const headers = [
      'Vendor Name',
      'Company',
      'Email',
      'Phone',
      'Vendor Type',
      'Category',
      'Organization',
      'Task Count',
      'Average Rating',
      'Total Ratings',
      'Created Date'
    ];

    const csvData = [
      headers,
      ...vendorsList.map((vendor: any) => [
        vendor.fullName || '',
        vendor.companyName || '',
        vendor.email || '',
        vendor.phone || '',
        vendor.vendorType || '',
        vendor.vendorCategory || '',
        vendor.organizationName || 'Unknown',
        vendor.taskCount || 0,
        vendor.averageRating || 'N/A',
        vendor.ratingCount || 0,
        vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'
      ])
    ];

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendors-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const renderStars = (rating: number | null, count: number) => {
    if (rating === null || count === 0) {
      return <span className="text-gray-400 text-sm">No ratings</span>;
    }
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star}
            className={`w-4 h-4 ${star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
            data-testid="input-search-vendors"
          />
          <Badge variant="outline" className="px-3 py-1">
            {filteredVendors.length} vendors
          </Badge>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm" data-testid="button-export-vendors-csv">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Satisfaction Rating</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.map((vendor: any) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">
                  <div>
                    <div>{vendor.displayName}</div>
                    {vendor.companyName && vendor.displayName === vendor.fullName && (
                      <div className="text-sm text-gray-500">{vendor.companyName}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {vendor.email && <div className="text-gray-700">{vendor.email}</div>}
                    {vendor.phone && <div className="text-gray-500">{vendor.phone}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  {vendor.vendorType && (
                    <Badge variant="outline">{vendor.vendorType}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={vendor.organizationName}>
                    {vendor.organizationName}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {vendor.taskCount || 0} tasks
                  </Badge>
                </TableCell>
                <TableCell>
                  {renderStars(vendor.averageRating, vendor.ratingCount)}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredVendors.length === 0 && vendorsList && vendorsList.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          No vendors match your search criteria.
        </div>
      )}

      {(!vendorsList || vendorsList.length === 0) && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          No vendors found in the database.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Feature Flags Tab — DB-backed CRUD + per-org override picker
// ============================================================================
function FeatureFlagsTabContent() {
  const { toast } = useToast();
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<any>(null);
  const [form, setForm] = useState({
    key: "",
    displayName: "",
    description: "",
    category: "",
    defaultEnabled: false,
    beta: false,
  });

  const flagsQ = useQuery<any[]>({ queryKey: ["/api/super-admin/feature-flags"] });
  const orgsQ = useQuery<any[]>({ queryKey: ["/api/super-admin/orgs"] });
  const overridesQ = useQuery<{ orgId: string; overrides: Record<string, boolean>; effective: Record<string, boolean> }>({
    queryKey: ["/api/super-admin/orgs", selectedOrgId, "feature-flags"],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/orgs/${selectedOrgId}/feature-flags`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!selectedOrgId,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/super-admin/feature-flags", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/feature-flags"] });
      setIsCreateOpen(false);
      setForm({ key: "", displayName: "", description: "", category: "", defaultEnabled: false, beta: false });
      toast({ title: "Flag created" });
    },
    onError: (e: any) => toast({ title: "Failed to create flag", description: e?.message ?? String(e), variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ key, data }: { key: string; data: any }) => apiRequest("PATCH", `/api/super-admin/feature-flags/${key}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/feature-flags"] });
      if (selectedOrgId) {
        queryClient.invalidateQueries({ queryKey: ["/api/super-admin/orgs", selectedOrgId, "feature-flags"] });
      }
      setEditingFlag(null);
      toast({ title: "Flag updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update flag", description: e?.message ?? String(e), variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (key: string) => apiRequest("DELETE", `/api/super-admin/feature-flags/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/feature-flags"] });
      if (selectedOrgId) {
        queryClient.invalidateQueries({ queryKey: ["/api/super-admin/orgs", selectedOrgId, "feature-flags"] });
      }
      toast({ title: "Flag deleted" });
    },
    onError: (e: any) => toast({ title: "Failed to delete flag", description: e?.message ?? String(e), variant: "destructive" }),
  });

  const overrideMut = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean | null }) =>
      apiRequest("PATCH", `/api/super-admin/orgs/${selectedOrgId}/feature-flags`, { key, enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/orgs", selectedOrgId, "feature-flags"] });
    },
    onError: (e: any) => toast({ title: "Failed to update override", description: e?.message ?? String(e), variant: "destructive" }),
  });

  const handleEditClick = (flag: any) => {
    setEditingFlag(flag);
    setForm({
      key: flag.key,
      displayName: flag.displayName ?? "",
      description: flag.description ?? "",
      category: flag.category ?? "",
      defaultEnabled: !!flag.defaultEnabled,
      beta: !!flag.beta,
    });
  };

  const submitCreate = () => {
    if (!form.key || !form.displayName) {
      toast({ title: "Key and display name required", variant: "destructive" });
      return;
    }
    createMut.mutate({
      key: form.key,
      displayName: form.displayName,
      description: form.description || null,
      category: form.category || null,
      defaultEnabled: form.defaultEnabled,
      beta: form.beta,
    });
  };

  const submitEdit = () => {
    if (!editingFlag) return;
    updateMut.mutate({
      key: editingFlag.key,
      data: {
        displayName: form.displayName,
        description: form.description || null,
        category: form.category || null,
        defaultEnabled: form.defaultEnabled,
        beta: form.beta,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <ToggleLeft className="w-5 h-5 mr-2" />
            Available Feature Flags
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-feature-flag" onClick={() => setForm({ key: "", displayName: "", description: "", category: "", defaultEnabled: false, beta: false })}>
                <Plus className="w-4 h-4 mr-1" /> Add flag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New feature flag</DialogTitle>
                <DialogDescription>
                  The key is a stable snake_case identifier used in code (e.g. <code>mobile_field_mode</code>) and cannot be changed later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Key</Label>
                  <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="snake_case_key" data-testid="input-flag-key" />
                </div>
                <div>
                  <Label>Display name</Label>
                  <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} data-testid="input-flag-name" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-flag-description" />
                </div>
                <div>
                  <Label>Category (optional)</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. mobile, billing" data-testid="input-flag-category" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="flag-default">Default enabled</Label>
                  <Switch id="flag-default" checked={form.defaultEnabled} onCheckedChange={(v) => setForm({ ...form, defaultEnabled: v })} data-testid="switch-flag-default" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="flag-beta">Beta</Label>
                  <Switch id="flag-beta" checked={form.beta} onCheckedChange={(v) => setForm({ ...form, beta: v })} data-testid="switch-flag-beta" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={submitCreate} disabled={createMut.isPending} data-testid="button-create-flag">
                  {createMut.isPending ? "Creating..." : "Create flag"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {flagsQ.isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading flags...</div>
          ) : flagsQ.isError ? (
            <div className="text-center py-8 text-red-600">
              Failed to load feature flags.{" "}
              <button onClick={() => flagsQ.refetch()} className="underline">Retry</button>
            </div>
          ) : (flagsQ.data ?? []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">No flags yet. Click "Add flag" to create one.</div>
          ) : (
            <div className="space-y-3">
              {(flagsQ.data ?? []).map((flag: any) => (
                <div key={flag.key} className="flex items-start justify-between p-4 border rounded-lg" data-testid={`row-flag-${flag.key}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-slate-900">{flag.displayName}</h4>
                      <code className="text-xs text-slate-500">{flag.key}</code>
                      {flag.beta && <Badge variant="secondary" className="text-xs">Beta</Badge>}
                      {flag.category && <Badge variant="outline" className="text-xs">{flag.category}</Badge>}
                    </div>
                    {flag.description && <p className="text-sm text-slate-600 mt-1">{flag.description}</p>}
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      Default
                      <Switch
                        checked={!!flag.defaultEnabled}
                        onCheckedChange={(v) => updateMut.mutate({ key: flag.key, data: { defaultEnabled: v } })}
                        disabled={updateMut.isPending}
                        data-testid={`switch-default-${flag.key}`}
                      />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleEditClick(flag)} data-testid={`button-edit-${flag.key}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Delete flag "${flag.key}"? Any per-org overrides will be cleared.`)) {
                          deleteMut.mutate(flag.key);
                        }
                      }}
                      data-testid={`button-delete-${flag.key}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Per-Organization Overrides
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Organization</Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger data-testid="select-org-for-flags">
                <SelectValue placeholder="Choose an organization to manage overrides" />
              </SelectTrigger>
              <SelectContent>
                {(orgsQ.data ?? []).map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedOrgId && (
            overridesQ.isLoading ? (
              <div className="text-center py-6 text-gray-500">Loading overrides...</div>
            ) : overridesQ.isError ? (
              <div className="text-center py-6 text-red-600">
                Failed to load overrides.{" "}
                <button onClick={() => overridesQ.refetch()} className="underline">Retry</button>
              </div>
            ) : (
              <div className="space-y-2">
                {(flagsQ.data ?? []).map((flag: any) => {
                  const isOverridden = Object.prototype.hasOwnProperty.call(overridesQ.data?.overrides ?? {}, flag.key);
                  const effective = overridesQ.data?.effective?.[flag.key] === true;
                  return (
                    <div key={flag.key} className="flex items-center justify-between p-3 border rounded" data-testid={`override-${flag.key}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{flag.displayName}</span>
                          <code className="text-xs text-slate-500">{flag.key}</code>
                          {isOverridden ? (
                            <Badge variant="secondary" className="text-xs">Overridden</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={effective}
                          onCheckedChange={(v) => overrideMut.mutate({ key: flag.key, enabled: v })}
                          disabled={overrideMut.isPending}
                          data-testid={`switch-override-${flag.key}`}
                        />
                        {isOverridden && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => overrideMut.mutate({ key: flag.key, enabled: null })}
                            disabled={overrideMut.isPending}
                            data-testid={`button-clear-override-${flag.key}`}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingFlag} onOpenChange={(o) => !o && setEditingFlag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit feature flag</DialogTitle>
            <DialogDescription>
              Key <code>{editingFlag?.key}</code> cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Display name</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Default enabled</Label>
              <Switch checked={form.defaultEnabled} onCheckedChange={(v) => setForm({ ...form, defaultEnabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Beta</Label>
              <Switch checked={form.beta} onCheckedChange={(v) => setForm({ ...form, beta: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFlag(null)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={updateMut.isPending} data-testid="button-save-flag">
              {updateMut.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===========================================================================
// Super Admin: Real-data tabs (Organizations, All Users, Platform Overview, Compliance)
// ===========================================================================

type OrgOverviewRow = {
  id: string;
  name: string;
  isActive: boolean;
  primaryAdminEmail: string | null;
  tier: string;
  subscriptionStatus: string;
  propertyCount: number;
  userCount: number;
  mrrCents: number;
  createdAt: string | null;
};

type UserOverviewRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string | null;
  orgId: string | null;
  orgName: string | null;
};

function formatRelative(date: string | null | undefined): string {
  if (!date) return "Never";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 0) return d.toLocaleDateString();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}

function formatDateOnly(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function PlatformOverviewCards() {
  const { data: revenue } = useQuery<any>({ queryKey: ["/api/super-admin/revenue-metrics"] });
  const { data: health } = useQuery<any>({ queryKey: ["/api/super-admin/system-health"] });

  const totalOrgs = health?.counts?.orgs ?? 0;
  const billingOrgs = (revenue?.activeOrgs ?? 0) + (revenue?.pastDueOrgs ?? 0);
  const totalUsers = health?.counts?.users ?? 0;
  const activeSessions = health?.counts?.activeSessions ?? 0;
  const mrr = revenue?.mrrCents != null
    ? `$${(revenue.mrrCents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : "$0";
  const uptimeSeconds: number = health?.uptimeSeconds ?? 0;
  const uptimeStr = uptimeSeconds >= 86400
    ? `${Math.floor(uptimeSeconds / 86400)}d`
    : uptimeSeconds >= 3600
      ? `${Math.floor(uptimeSeconds / 3600)}h`
      : `${Math.floor(uptimeSeconds / 60)}m`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
          <Building2 className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-total-orgs">{totalOrgs}</div>
          <p className="text-xs text-muted-foreground">{billingOrgs} billing</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-total-users">{totalUsers}</div>
          <p className="text-xs text-muted-foreground">{activeSessions} active session{activeSessions === 1 ? "" : "s"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-mrr">{mrr}</div>
          <p className="text-xs text-muted-foreground">Aggregated from active subscriptions</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Server Uptime</CardTitle>
          <Activity className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600" data-testid="text-uptime">{uptimeStr}</div>
          <p className="text-xs text-muted-foreground">Since last restart</p>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationsTab() {
  const { toast } = useToast();
  const { data: orgs = [], isLoading } = useQuery<OrgOverviewRow[]>({
    queryKey: ["/api/super-admin/orgs-overview"],
  });

  const setStatusMut = useMutation({
    mutationFn: async ({ orgId, isActive }: { orgId: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/super-admin/orgs/${orgId}/status`, { isActive }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/orgs-overview"] });
      toast({ title: vars.isActive ? "Organization activated" : "Organization suspended" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message || "Could not update status", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Organizations Management
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            asChild
            data-testid="button-export-orgs"
          >
            <a href="/api/super-admin/orgs-overview.csv">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading organizations…</div>
        ) : orgs.length === 0 ? (
          <div className="text-sm text-slate-500">No organizations yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Primary Admin</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Properties</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.id} data-testid={`row-org-${o.id}`}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-sm">{o.primaryAdminEmail || <span className="text-slate-400">—</span>}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{o.tier}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={o.subscriptionStatus === "active" ? "default" :
                        o.subscriptionStatus === "trialing" ? "secondary" : "destructive"}
                      className="capitalize"
                    >
                      {o.subscriptionStatus.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={o.isActive ? "default" : "destructive"}
                      data-testid={`badge-org-status-${o.id}`}
                    >
                      {o.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{o.propertyCount}</TableCell>
                  <TableCell className="text-right">{o.userCount}</TableCell>
                  <TableCell className="text-right">${(o.mrrCents / 100).toFixed(0)}</TableCell>
                  <TableCell>
                    {o.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Suspend organization"
                        disabled={setStatusMut.isPending}
                        onClick={() => {
                          if (confirm(`Suspend ${o.name}? Users will lose access until reactivated.`)) {
                            setStatusMut.mutate({ orgId: o.id, isActive: false });
                          }
                        }}
                        data-testid={`button-suspend-${o.id}`}
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Reactivate organization"
                        disabled={setStatusMut.isPending}
                        onClick={() => setStatusMut.mutate({ orgId: o.id, isActive: true })}
                        data-testid={`button-activate-${o.id}`}
                      >
                        <Play className="w-4 h-4" />
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
  );
}

function AllUsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: users = [], isLoading } = useQuery<UserOverviewRow[]>({
    queryKey: ["/api/super-admin/users-overview"],
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "suspended" && u.isActive) return false;
      if (s) {
        const hay = `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email ?? ""} ${u.orgName ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            All Users Across Platform
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search name, email, org…"
              className="w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-user-search"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36" data-testid="select-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-user-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" asChild data-testid="button-export-users">
              <a href="/api/super-admin/users-overview.csv">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading users…</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                  return (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{u.email || <span className="text-slate-400">—</span>}</TableCell>
                      <TableCell>{u.orgName || <span className="text-slate-400">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{u.role.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "default" : "destructive"}>
                          {u.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{formatRelative(u.lastActiveAt)}</TableCell>
                      <TableCell className="text-sm text-slate-600">{formatDateOnly(u.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4 text-sm text-slate-500">
              Showing {filtered.length} of {users.length} users
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ComplianceTab() {
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<any[]>({
    queryKey: ["/api/super-admin/audit-logs"],
  });
  const { data: adminUsers = [], isLoading: adminLoading } = useQuery<any[]>({
    queryKey: ["/api/super-admin/access-review"],
  });
  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions, isFetching: sessionsFetching } = useQuery<any[]>({
    queryKey: ["/api/super-admin/sessions"],
  });

  const failedAuth24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return auditLogs.filter((l) =>
      l?.actionType === "auth" &&
      l?.success === false &&
      l?.createdAt &&
      new Date(l.createdAt).getTime() >= cutoff
    ).length;
  }, [auditLogs]);

  return (
    <div className="space-y-6">
      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Security Audit Logs
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">Latest 100 security events across the platform.</p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Action</th>
                  <th className="text-left p-3 font-medium">Resource</th>
                  <th className="text-left p-3 font-medium">Severity</th>
                  <th className="text-left p-3 font-medium">IP</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr><td className="p-3 text-slate-500" colSpan={7}>Loading…</td></tr>
                ) : auditLogs.length === 0 ? (
                  <tr><td className="p-3 text-slate-500" colSpan={7}>No audit events recorded yet.</td></tr>
                ) : auditLogs.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-slate-50" data-testid={`row-audit-${l.id}`}>
                    <td className="p-3 whitespace-nowrap">{formatRelative(l.createdAt)}</td>
                    <td className="p-3">{l.userId || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3">{l.action}</td>
                    <td className="p-3">{l.resource}{l.resourceId ? ` (${l.resourceId})` : ""}</td>
                    <td className="p-3">
                      <Badge variant={l.severity === "critical" ? "destructive" : l.severity === "warning" ? "secondary" : "outline"} className="capitalize">
                        {l.severity}
                      </Badge>
                    </td>
                    <td className="p-3">{l.ipAddress || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3">
                      {l.success ? <span className="text-green-600">Success</span> : <span className="text-red-600">Failed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Admin Access Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Admin Access Review
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            All users with admin, supervisor, or super_admin privileges.
          </p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-left p-3 font-medium">Admin Account</th>
                  <th className="text-left p-3 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {adminLoading ? (
                  <tr><td className="p-3 text-slate-500" colSpan={5}>Loading…</td></tr>
                ) : adminUsers.length === 0 ? (
                  <tr><td className="p-3 text-slate-500" colSpan={5}>No privileged users yet.</td></tr>
                ) : adminUsers.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-slate-50" data-testid={`row-admin-${u.id}`}>
                    <td className="p-3">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</td>
                    <td className="p-3">{u.email || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3"><Badge variant="outline" className="capitalize">{(u.role || "").replace("_", " ")}</Badge></td>
                    <td className="p-3">{u.isAdminAccount ? <Badge variant="secondary">Separate</Badge> : <span className="text-slate-400">Combined</span>}</td>
                    <td className="p-3 whitespace-nowrap">{formatRelative(u.lastActiveAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Active Sessions
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSessions()}
              disabled={sessionsFetching}
              data-testid="button-refresh-sessions"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${sessionsFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">IP</th>
                  <th className="text-left p-3 font-medium">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {sessionsLoading ? (
                  <tr><td className="p-3 text-slate-500" colSpan={4}>Loading…</td></tr>
                ) : sessions.length === 0 ? (
                  <tr><td className="p-3 text-slate-500" colSpan={4}>No active sessions.</td></tr>
                ) : sessions.map((s) => (
                  <tr key={s.sessionId} className="border-b hover:bg-slate-50" data-testid={`row-session-${s.sessionId}`}>
                    <td className="p-3">{s.userName || "—"}</td>
                    <td className="p-3">{s.userEmail || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3">{s.ipAddress || <span className="text-slate-400">—</span>}</td>
                    <td className="p-3 whitespace-nowrap">{formatRelative(s.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Failed Auth (24h)</p>
                <p className="text-3xl font-bold" data-testid="text-failed-auth">{failedAuth24h}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Privileged Users</p>
                <p className="text-3xl font-bold" data-testid="text-active-admins">{adminUsers.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Sessions</p>
                <p className="text-3xl font-bold" data-testid="text-active-sessions">{sessions.length}</p>
              </div>
              <Activity className="w-12 h-12 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SuperAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("organizations");
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState<boolean | null>(null);
  const [superAdminUsername, setSuperAdminUsername] = useState<string>("");

  // Check super admin session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/super-admin/session');
        const data = await response.json();
        
        if (data.authenticated) {
          setIsSuperAdminAuthenticated(true);
          setSuperAdminUsername(data.username);
        } else {
          setIsSuperAdminAuthenticated(false);
          toast({
            title: "Access Denied",
            description: "Super Admin authentication required.",
            variant: "destructive",
          });
          setTimeout(() => {
            setLocation("/super-admin/login");
          }, 1000);
        }
      } catch (error) {
        console.error("Error checking super admin session:", error);
        setIsSuperAdminAuthenticated(false);
        setTimeout(() => {
          setLocation("/super-admin/login");
        }, 1000);
      }
    };

    checkSession();
  }, [toast, setLocation]);

  const handleLogout = async () => {
    try {
      await fetch('/api/super-admin/logout', { method: 'POST' });
      toast({
        title: "Logged Out",
        description: "You have been logged out of Super Admin.",
      });
      setLocation("/super-admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isSuperAdminAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSuperAdminAuthenticated) {
    return null;
  }

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
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Control Panel</h1>
            <p className="text-lg text-slate-600">Platform-wide monitoring and management for Hubify team</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <Shield className="w-3 h-3 mr-1" />
            Internal Access Only
          </Badge>
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <span>Logged in as: <strong>{superAdminUsername}</strong></span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
            className="text-red-600 border-red-300 hover:bg-red-50"
            data-testid="button-logout"
          >
            <Lock className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Platform Overview Cards */}
      <PlatformOverviewCards />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto h-auto flex-wrap gap-1 justify-start bg-muted p-1">
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="email-templates" data-testid="tab-email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Onboarding Pipeline Tab */}
        <TabsContent value="onboarding">
          <OnboardingPipelineTab />
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations">
          <OrganizationsTab />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Communities Report
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Comprehensive view of all communities across all organizations
                </p>
              </CardHeader>
              <CardContent>
                <CommunitiesReport />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Vendors Report
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Comprehensive view of all vendors across all organizations with satisfaction ratings
                </p>
              </CardHeader>
              <CardContent>
                <VendorsReport />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support">
          <SupportTickets />
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates">
          <EmailTemplates />
        </TabsContent>

        {/* All Users Tab */}
        <TabsContent value="users">
          <AllUsersTab />
        </TabsContent>

        {/* Communication Tab - System Alerts */}
        <TabsContent value="communication">
          <CommunicationTabContent />
        </TabsContent>


        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <RevenueTabContent />
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features">
          <FeatureFlagsTabContent />
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <MonitoringTabContent />
        </TabsContent>


        {/* Platform Tab */}
        <TabsContent value="platform">
          <TemplateManagement />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceTab />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <SettingsTabContent />
        </TabsContent>
      </Tabs>
    </main>
  );
}