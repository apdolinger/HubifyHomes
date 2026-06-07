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
import { Checkbox } from "@/components/ui/checkbox";
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
  CheckCircle2,
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
  ChevronUp,
  ChevronRight,
  XCircle,
  Funnel,
  ClipboardList,
  Link2,
  PenLine,
  History,
  Pencil,
  RotateCcw,
  MonitorPlay,
  KeyRound,
  Copy,
  Check,
  Terminal,
  Home,
  Layers,
  FileCheck,
  LogOut,
  Link,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// ============================================================================
// Onboarding Pipeline Tab
// ============================================================================

type OnboardingStage = "contact" | "inquiry" | "agreement" | "payment_pending" | "payment_setup" | "platform_initializing" | "provisioning_failed" | "initial_payment" | "welcome" | "dropped" | "demo_requested" | "demo_sent" | "demo_completed" | "follow_up_needed" | "converted" | "not_a_fit" | "beta_approved" | "agreement_pending";

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
  // Submission-specific fields
  firstName: string | null;
  lastName: string | null;
  website: string | null;
  businessType: string | null;
  serviceArea: string | null;
  estimatedHomes: number | null;
  currentMgmtMethod: string | null;
  teamSize: number | null;
  suggestedTier: string | null;
  trialIntent: string | null;
  preferredContactMethod: string | null;
  betaDiscountTier: string | null;
  isBetaMember: boolean | null;
  betaApprovedAt: string | null;
  betaRemovedAt: string | null;
  // Beta application question answers
  whyInterested: string | null;
  biggestChallenge: string | null;
  launchTimeframe: string | null;
  // Beta approval pricing details
  portfolioTier: string | null;
  originalMonthlyPrice: number | null;
  discountPercentage: number | null;
  discountedMonthlyPrice: number | null;
  setupFee: number | null;
  betaCohortNumber: number | null;
  agreementStatus: string | null;
  // Agreement engagement metadata & signer details
  agreementViewedAt: string | null;
  agreementScrolledAt: string | null;
  agreementVersion: string | null;
  agreementAcceptedIp: string | null;
  agreementAcceptedUserAgent: string | null;
  agreementSignerName: string | null;
  agreementOrganizationName: string | null;
  // Agreement confirmation email tracking
  agreementEmailSentAt: string | null;
  agreementEmailStatus: string | null;
  // Onboarding token & approval email tracking
  onboardingToken: string | null;
  onboardingTokenCreatedAt: string | null;
  onboardingTokenExpiresAt: string | null;
  approvalEmailSent: boolean | null;
  approvalEmailSentAt: string | null;
  approvalEmailLastResentAt: string | null;
  approvalEmailSendError: string | null;
  submissionStatus: string | null;
  confirmationEmailSentAt: string | null;
  confirmationEmailStatus: string | null;
  // Demo fields
  source: string | null;
  demoAccessSent: boolean | null;
  demoEmailSentAt: string | null;
  demoEmailError: string | null;
  convertedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  // Payment setup fields (Task #231)
  paymentStatus: string | null;
  paymentCompletedAt: string | null;
  betaStripeCustomerId: string | null;
  betaStripeSubscriptionId: string | null;
  betaStripeCheckoutSessionId: string | null;
  // Provisioning state
  provisioningFailed: boolean | null;
  provisioningError: string | null;
  provisionedAt: string | null;
  workspaceSlug: string | null;
  // Onboarding tracker fields
  owner: string | null;
  nextAction: string | null;
  lastContactedAt: string | null;
  onboardingChecklist: Record<string, boolean> | null;
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
  { key: "contact",           label: "Contact",            color: "border-slate-400 bg-slate-50" },
  { key: "inquiry",           label: "Submission",         color: "border-teal-400 bg-teal-50" },
  { key: "beta_approved",     label: "Beta Approved",      color: "border-teal-500 bg-teal-100" },
  { key: "agreement_pending", label: "Agreement Pending",  color: "border-yellow-500 bg-yellow-50" },
  { key: "agreement",         label: "Agreement",          color: "border-yellow-400 bg-yellow-50" },
  { key: "payment_pending",      label: "Payment Pending",      color: "border-orange-300 bg-orange-50" },
  { key: "payment_setup",        label: "Payment Setup",        color: "border-orange-400 bg-orange-50" },
  { key: "platform_initializing", label: "Platform Initializing", color: "border-violet-400 bg-violet-50" },
  { key: "provisioning_failed",   label: "Provisioning Failed",   color: "border-red-400 bg-red-50" },
  { key: "initial_payment",   label: "Initial Payment",    color: "border-purple-400 bg-purple-50" },
  { key: "welcome",           label: "Welcome",            color: "border-green-400 bg-green-50" },
  { key: "demo_requested",    label: "Demo Requested",     color: "border-sky-400 bg-sky-50" },
  { key: "demo_sent",         label: "Demo Sent",          color: "border-blue-400 bg-blue-50" },
  { key: "demo_completed",    label: "Demo Completed",     color: "border-violet-400 bg-violet-50" },
  { key: "follow_up_needed",  label: "Follow-Up",          color: "border-amber-400 bg-amber-50" },
  { key: "converted",         label: "Converted",          color: "border-emerald-400 bg-emerald-50" },
  { key: "not_a_fit",         label: "Not a Fit",          color: "border-red-300 bg-red-50" },
];

const STAGE_ORDER: OnboardingStage[] = ["contact", "inquiry", "beta_approved", "agreement_pending", "agreement", "payment_pending", "payment_setup", "platform_initializing", "initial_payment", "welcome"];
const DEMO_STAGE_ORDER: OnboardingStage[] = ["demo_requested", "demo_sent", "demo_completed", "follow_up_needed", "converted"];

function nextStage(current: OnboardingStage): OnboardingStage | null {
  const demoIdx = DEMO_STAGE_ORDER.indexOf(current);
  if (demoIdx !== -1) {
    return demoIdx < DEMO_STAGE_ORDER.length - 1 ? DEMO_STAGE_ORDER[demoIdx + 1] : null;
  }
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

// ── Onboarding Tracker ────────────────────────────────────────────────────────

const TRACKER_CHECKLIST: {
  section: string;
  headerCls: string;
  items: { key: string; label: string; auto: ((p: Prospect) => boolean) | null }[];
}[] = [
  {
    section: "Agreement",
    headerCls: "text-yellow-700 bg-yellow-50 border-yellow-200",
    items: [
      { key: "agreement_sent",   label: "Agreement sent",   auto: (p) => !!p.approvalEmailSent },
      { key: "agreement_viewed", label: "Agreement viewed", auto: null },
      { key: "agreement_signed", label: "Agreement signed", auto: (p) => !!p.agreementSignedAt },
    ],
  },
  {
    section: "Billing",
    headerCls: "text-green-700 bg-green-50 border-green-200",
    items: [
      { key: "stripe_customer_created",  label: "Stripe customer created",  auto: (p) => !!p.betaStripeCustomerId },
      { key: "payment_method_added",     label: "Payment method added",     auto: null },
      { key: "subscription_active",      label: "Subscription active",      auto: (p) => !!p.betaStripeSubscriptionId },
      { key: "initial_payment_complete", label: "Initial payment complete", auto: (p) => p.paymentStatus === "paid" },
    ],
  },
  {
    section: "System Setup",
    headerCls: "text-blue-700 bg-blue-50 border-blue-200",
    items: [
      { key: "org_created",          label: "Organization created",  auto: (p) => !!p.orgId },
      { key: "database_provisioned", label: "Database provisioned",  auto: null },
      { key: "branding_uploaded",    label: "Branding uploaded",     auto: null },
      { key: "admin_user_created",   label: "Admin user created",    auto: null },
    ],
  },
  {
    section: "Training",
    headerCls: "text-purple-700 bg-purple-50 border-purple-200",
    items: [
      { key: "training_scheduled", label: "Training scheduled", auto: null },
      { key: "training_completed", label: "Training completed", auto: null },
      { key: "golive_confirmed",   label: "Go-live confirmed",  auto: null },
    ],
  },
];

function isChecklistItemComplete(
  item: { key: string; auto: ((p: Prospect) => boolean) | null },
  prospect: Prospect,
): boolean {
  if (item.auto) return item.auto(prospect);
  return !!(prospect.onboardingChecklist?.[item.key]);
}

function computeSetupProgress(prospect: Prospect): number {
  let checked = 0;
  const total = TRACKER_CHECKLIST.reduce((s, sec) => s + sec.items.length, 0);
  for (const section of TRACKER_CHECKLIST) {
    for (const item of section.items) {
      if (isChecklistItemComplete(item, prospect)) checked++;
    }
  }
  return total === 0 ? 0 : Math.round((checked / total) * 100);
}

const STAGE_BADGE_COLORS: Partial<Record<OnboardingStage, string>> = {
  contact:              "bg-slate-100 text-slate-700",
  inquiry:              "bg-teal-100 text-teal-700",
  beta_approved:        "bg-teal-100 text-teal-800",
  agreement_pending:    "bg-yellow-100 text-yellow-800",
  agreement:            "bg-yellow-100 text-yellow-700",
  payment_pending:      "bg-orange-100 text-orange-700",
  payment_setup:        "bg-orange-100 text-orange-800",
  platform_initializing:"bg-violet-100 text-violet-700",
  initial_payment:      "bg-purple-100 text-purple-700",
  welcome:              "bg-green-100 text-green-700",
  demo_requested:       "bg-sky-100 text-sky-700",
  demo_sent:            "bg-blue-100 text-blue-700",
  demo_completed:       "bg-violet-100 text-violet-800",
  follow_up_needed:     "bg-amber-100 text-amber-800",
  converted:            "bg-emerald-100 text-emerald-700",
  not_a_fit:            "bg-red-100 text-red-700",
};

function ProgressBar({ value, className }: { value: number; className?: string }) {
  const barCls = value === 100 ? "bg-green-500" : value >= 50 ? "bg-blue-500" : "bg-gray-400";
  return (
    <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${className ?? ""}`} style={{ height: "6px" }}>
      <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function OnboardingTrackerSection({
  prospects,
  onEdit,
  onDrop,
  onGoToOrganizations,
}: {
  prospects: Prospect[];
  onEdit: (p: Prospect) => void;
  onDrop: (p: Prospect) => void;
  onGoToOrganizations?: () => void;
}) {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [selected, setSelected]           = useState<Prospect | null>(null);
  const [draftOwner, setDraftOwner]       = useState("");
  const [draftNextAction, setDraftNextAction] = useState("");
  const [draftChecklist, setDraftChecklist]   = useState<Record<string, boolean>>({});
  const [sortCol, setSortCol]             = useState("days");
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (selected) {
      const updated = prospects.find(p => p.id === selected.id);
      if (updated) setSelected(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospects]);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  function openDrawer(p: Prospect) {
    setSelected(p);
    setDraftOwner(p.owner ?? "");
    setDraftNextAction(p.nextAction ?? "");
    setDraftChecklist(p.onboardingChecklist ?? {});
    setDrawerOpen(true);
  }

  function saveDrawer() {
    if (!selected) return;
    updateMutation.mutate({
      id: selected.id,
      payload: {
        owner: draftOwner.trim() || null,
        nextAction: draftNextAction.trim() || null,
        onboardingChecklist: draftChecklist,
      },
    });
  }

  function markContacted() {
    if (!selected) return;
    const now = new Date().toISOString();
    updateMutation.mutate({ id: selected.id, payload: { lastContactedAt: now } });
    setSelected(prev => prev ? { ...prev, lastContactedAt: now } : null);
  }

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ChevronDown className="w-3 h-3 opacity-30 inline" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-600 inline" />
      : <ChevronDown className="w-3 h-3 text-blue-600 inline" />;
  }

  function SortTh({ col, label, cls }: { col: string; label: string; cls?: string }) {
    return (
      <TableHead
        className={`cursor-pointer select-none whitespace-nowrap ${cls ?? ""}`}
        onClick={() => toggleSort(col)}
      >
        <span className="inline-flex items-center gap-1">{label}<SortIcon col={col} /></span>
      </TableHead>
    );
  }

  const sorted = useMemo(() => {
    return [...prospects].sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      if (sortCol === "client")       { av = (a.company || a.name).toLowerCase(); bv = (b.company || b.name).toLowerCase(); }
      else if (sortCol === "stage")   { av = a.stage;                              bv = b.stage; }
      else if (sortCol === "agreement") { av = a.agreementStatus ?? "";            bv = b.agreementStatus ?? ""; }
      else if (sortCol === "payment") { av = a.paymentStatus ?? "";                bv = b.paymentStatus ?? ""; }
      else if (sortCol === "progress") { av = computeSetupProgress(a);             bv = computeSetupProgress(b); }
      else if (sortCol === "days")    { av = stageDays(a);                         bv = stageDays(b); }
      else if (sortCol === "lastContacted") { av = a.lastContactedAt ?? "";        bv = b.lastContactedAt ?? ""; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [prospects, sortCol, sortDir]);

  const draftProspect: Prospect | null = selected
    ? { ...selected, onboardingChecklist: draftChecklist }
    : null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-800">Onboarding Tracker</h3>
        <Badge variant="outline" className="text-xs">{prospects.length}</Badge>
        <span className="text-xs text-gray-400 ml-1">— operational view of every active client</span>
      </div>

      {prospects.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8 border rounded-lg bg-gray-50">
          No active prospects to track.
        </p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 text-xs">
                <SortTh col="client"      label="Client / Company" />
                <TableHead className="whitespace-nowrap">Contact Email</TableHead>
                <SortTh col="stage"       label="Current Stage" />
                <TableHead>Owner</TableHead>
                <SortTh col="agreement"   label="Agreement" />
                <SortTh col="payment"     label="Payment" />
                <SortTh col="progress"    label="Setup %" />
                <SortTh col="days"        label="Days in Stage" />
                <TableHead className="whitespace-nowrap">Next Action</TableHead>
                <SortTh col="lastContacted" label="Last Contacted" />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(p => {
                const progress  = computeSetupProgress(p);
                const days      = stageDays(p);
                const stageBadge = STAGE_BADGE_COLORS[p.stage] ?? "bg-gray-100 text-gray-700";
                const stageLabel = PIPELINE_STAGES.find(s => s.key === p.stage)?.label ?? p.stage;
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-blue-50/40 text-sm"
                    onClick={() => openDrawer(p)}
                  >
                    {/* Client / Company */}
                    <TableCell>
                      <div className="font-medium text-gray-900">{p.company || p.name}</div>
                      {p.company && <div className="text-xs text-gray-400">{p.name}</div>}
                    </TableCell>

                    {/* Contact Email */}
                    <TableCell className="text-xs text-gray-500">{p.email}</TableCell>

                    {/* Current Stage */}
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${stageBadge}`}>
                        {stageLabel}
                      </span>
                    </TableCell>

                    {/* Owner */}
                    <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                      {p.owner ?? <span className="text-gray-300">—</span>}
                    </TableCell>

                    {/* Agreement Status */}
                    <TableCell>
                      {p.agreementStatus ? (
                        <Badge variant="outline" className={`text-xs capitalize ${
                          p.agreementStatus === "signed"  ? "border-green-300 text-green-700 bg-green-50" :
                          p.agreementStatus === "sent"    ? "border-blue-300 text-blue-700 bg-blue-50" :
                          "border-gray-300 text-gray-600"
                        }`}>
                          {p.agreementStatus}
                        </Badge>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </TableCell>

                    {/* Payment Status */}
                    <TableCell>
                      {p.paymentStatus ? (
                        <Badge variant="outline" className={`text-xs capitalize ${
                          p.paymentStatus === "paid"    ? "border-green-300 text-green-700 bg-green-50" :
                          p.paymentStatus === "pending" ? "border-amber-300 text-amber-700 bg-amber-50" :
                          "border-gray-300 text-gray-600"
                        }`}>
                          {p.paymentStatus}
                        </Badge>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </TableCell>

                    {/* Setup Progress % */}
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[90px]">
                        <ProgressBar value={progress} className="flex-1" />
                        <span className="text-xs text-gray-600 w-9 text-right tabular-nums">{progress}%</span>
                      </div>
                    </TableCell>

                    {/* Days in Current Stage */}
                    <TableCell className="text-center">
                      <span className={`text-xs font-semibold ${
                        days > 14 ? "text-red-600" : days > 7 ? "text-amber-600" : "text-gray-600"
                      }`}>
                        {days}d
                      </span>
                    </TableCell>

                    {/* Next Action */}
                    <TableCell className="max-w-[180px]">
                      {p.nextAction
                        ? <span className="text-xs text-gray-700 line-clamp-2">{p.nextAction}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </TableCell>

                    {/* Last Contacted */}
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {p.lastContactedAt
                        ? new Date(p.lastContactedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : <span className="text-gray-300">—</span>}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDrawer(p)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View checklist</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(p)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit prospect</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => onDrop(p)}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Archive / Drop</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tracker Detail Drawer ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && draftProspect && (
            <>
              <SheetHeader className="pb-2">
                <SheetTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-gray-500" />
                  {selected.company || selected.name}
                </SheetTitle>
                <SheetDescription className="text-xs">{selected.email}</SheetDescription>
              </SheetHeader>

              {/* Profile summary card */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4 mt-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selected.company || selected.name}</p>
                  {selected.company && <p className="text-xs text-gray-500 truncate">{selected.name}</p>}
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_BADGE_COLORS[selected.stage] ?? "bg-gray-100 text-gray-700"}`}>
                      {PIPELINE_STAGES.find(s => s.key === selected.stage)?.label ?? selected.stage}
                    </span>
                    <span className="text-xs text-gray-400">{stageDays(selected)}d in stage</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-gray-800">{computeSetupProgress(draftProspect)}%</div>
                  <div className="text-xs text-gray-400">complete</div>
                </div>
              </div>

              <ProgressBar value={computeSetupProgress(draftProspect)} className="mb-5" />

              {/* Editable fields */}
              <div className="space-y-3 mb-5">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Owner</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Assign to a team member…"
                    value={draftOwner}
                    onChange={e => setDraftOwner(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Next Action</Label>
                  <Textarea
                    className="text-sm resize-none"
                    rows={2}
                    placeholder="What needs to happen next?"
                    value={draftNextAction}
                    onChange={e => setDraftNextAction(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Last Contacted</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 flex-1">
                      {selected.lastContactedAt
                        ? new Date(selected.lastContactedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                        : <span className="text-gray-400 text-xs">Not yet recorded</span>}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={markContacted}
                      disabled={updateMutation.isPending}
                    >
                      Mark as Contacted
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="mb-4" />

              {/* Onboarding Checklist */}
              <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Onboarding Checklist</p>
              <div className="space-y-3 mb-6">
                {TRACKER_CHECKLIST.map(section => {
                  const sectionChecked = section.items.filter(item =>
                    isChecklistItemComplete(item, draftProspect)
                  ).length;
                  return (
                    <div key={section.section} className="border rounded-lg overflow-hidden">
                      <div className={`px-3 py-2 border-b flex items-center justify-between ${section.headerCls}`}>
                        <span className="text-xs font-semibold">{section.section}</span>
                        <span className="text-xs opacity-60 tabular-nums">
                          {sectionChecked}/{section.items.length}
                        </span>
                      </div>
                      <div className="divide-y bg-white">
                        {section.items.map(item => {
                          const isAuto = !!item.auto;
                          const checked = isAuto ? item.auto!(selected) : !!(draftChecklist[item.key]);
                          return (
                            <div
                              key={item.key}
                              className={`flex items-center gap-3 px-3 py-2.5 ${isAuto ? "bg-gray-50/60" : ""}`}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={isAuto}
                                onCheckedChange={(v) => {
                                  if (!isAuto) setDraftChecklist(prev => ({ ...prev, [item.key]: !!v }));
                                }}
                                className={isAuto ? "opacity-50" : ""}
                              />
                              <span className={`text-xs flex-1 ${checked ? "line-through text-gray-400" : "text-gray-700"}`}>
                                {item.label}
                              </span>
                              {isAuto && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-gray-400 italic cursor-help">auto</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">Auto-detected from system data</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Save / Edit footer */}
              <div className="flex gap-2 sticky bottom-0 bg-white pt-3 pb-1 border-t">
                <Button
                  className="flex-1"
                  onClick={saveDrawer}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setDrawerOpen(false); onEdit(selected); }}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const DEMO_STAGES_SET = new Set<OnboardingStage>(["demo_requested", "demo_sent", "demo_completed", "follow_up_needed", "converted", "not_a_fit"]);

function ProspectCard({
  prospect,
  stuckDays,
  onAdvance,
  onDrop,
  onEdit,
  onOpenResend,
  onSendWelcome,
  sendingEmail,
  onConvertToOrg,
  convertingToOrg,
  onForceLinkExistingOrg,
  forceLinkingExistingOrg,
  onSendDemoEmail,
  sendingDemoEmail,
  onGoToOrganizations,
}: {
  prospect: Prospect;
  stuckDays: number;
  onAdvance: () => void;
  onDrop: () => void;
  onEdit: () => void;
  onOpenResend?: () => void;
  onSendWelcome: () => void;
  sendingEmail: boolean;
  onConvertToOrg: () => void;
  convertingToOrg: boolean;
  onForceLinkExistingOrg?: () => void;
  forceLinkingExistingOrg?: boolean;
  onSendDemoEmail?: () => void;
  sendingDemoEmail?: boolean;
  onGoToOrganizations?: () => void;
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

      {/* ── Beta status badges — three mutually exclusive states ── */}
      {(prospect.trialIntent === "beta_application" || prospect.source === "beta_application" || prospect.isBetaMember || prospect.betaRemovedAt) && (() => {
        const isActive = prospect.isBetaMember === true && !prospect.betaRemovedAt;
        const isFreed  = !!prospect.betaRemovedAt;
        const tierLabel = prospect.betaDiscountTier === "founding_10"
          ? "Founding 10 — 50% off"
          : prospect.betaDiscountTier === "early_access_10"
            ? "Early Access 10 — 25% off"
            : prospect.betaDiscountTier ?? null;

        if (isActive) {
          return (
            <div className="flex flex-wrap gap-1">
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs px-1.5 py-0.5 font-semibold">
                Active Beta Member
              </Badge>
              {tierLabel && (
                <Badge
                  className={`text-xs px-1.5 py-0.5 border font-medium ${
                    prospect.betaDiscountTier === "founding_10"
                      ? "bg-teal-100 text-teal-800 border-teal-200"
                      : "bg-indigo-100 text-indigo-800 border-indigo-200"
                  }`}
                >
                  {tierLabel}
                </Badge>
              )}
              {!prospect.approvalEmailSent && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="w-full mt-0.5"
                      onClick={onOpenResend ?? onEdit}
                    >
                      <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs flex items-center gap-1 px-1.5 py-0.5 font-medium w-full justify-center">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Email pending
                      </Badge>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-xs">
                    Approval email not yet delivered — open to resend
                  </TooltipContent>
                </Tooltip>
              )}
              {prospect.approvalEmailSent && prospect.approvalEmailSentAt && (
                <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs flex items-center gap-1 px-1.5 py-0.5 font-medium w-full justify-center mt-0.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  Email sent {new Date(prospect.approvalEmailSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Badge>
              )}
            </div>
          );
        }

        if (isFreed) {
          return (
            <div className="flex flex-wrap gap-1">
              <Badge className="bg-gray-100 text-gray-500 border border-gray-200 text-xs px-1.5 py-0.5 font-medium">
                Beta Slot Freed
              </Badge>
              {tierLabel && (
                <Badge className="bg-gray-50 text-gray-400 border border-gray-200 text-xs px-1.5 py-0.5 font-medium">
                  {tierLabel}
                </Badge>
              )}
            </div>
          );
        }

        return (
          <div className="flex flex-wrap gap-1">
            <Badge className="bg-violet-100 text-violet-800 border border-violet-200 text-xs px-1.5 py-0.5 font-semibold">
              Beta Applicant
            </Badge>
          </div>
        );
      })()}

      {!DEMO_STAGES_SET.has(prospect.stage) && prospect.confirmationEmailStatus && (
        prospect.confirmationEmailStatus === "sent" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs flex items-center gap-1 px-1.5 py-0.5 font-medium w-full justify-center">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                Agreement email sent
                {prospect.confirmationEmailSentAt && (
                  <> {new Date(prospect.confirmationEmailSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-xs">
              Confirmation email delivered to {prospect.email}
              {prospect.confirmationEmailSentAt && (
                <> on {new Date(prospect.confirmationEmailSentAt).toLocaleString()}</>
              )}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center gap-1 w-full text-left"
                onClick={onEdit}
              >
                <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs flex items-center gap-1 px-1.5 py-0.5 font-medium w-full justify-center">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Agreement email failed
                </Badge>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-xs">
              {prospect.confirmationEmailStatus.replace(/^failed:\s*/i, "") || "Confirmation email failed to send"} — click to view and retry
            </TooltipContent>
          </Tooltip>
        )
      )}

      {/* ── Demo pipeline actions ── */}
      {DEMO_STAGES_SET.has(prospect.stage) && onSendDemoEmail && (
        <div className="text-xs space-y-1">
          {prospect.demoEmailError && (
            <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs w-full justify-center gap-1 px-1.5 py-0.5">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Email failed
            </Badge>
          )}
          {prospect.demoAccessSent && prospect.demoEmailSentAt ? (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Demo sent {new Date(prospect.demoEmailSentAt).toLocaleDateString()}
            </span>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2 w-full"
            onClick={onSendDemoEmail}
            disabled={sendingDemoEmail}
          >
            {sendingDemoEmail
              ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Sending…</>
              : prospect.demoAccessSent
                ? <><Send className="w-3 h-3 mr-1" /> Resend Demo Email</>
                : <><Send className="w-3 h-3 mr-1" /> Send Demo Email</>
            }
          </Button>
        </div>
      )}

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
              onClick={() => onGoToOrganizations?.()}
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

      {/* Force-link button — shown when provisioning is stuck or failed and no org linked yet */}
      {!prospect.orgId && (prospect.provisioningFailed || prospect.stage === "provisioning_failed" || prospect.stage === "platform_initializing") && onForceLinkExistingOrg && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs px-2 w-full border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={onForceLinkExistingOrg}
          disabled={forceLinkingExistingOrg}
          title="Find existing user by email and link this prospect to their org — use when provisioning failed with a duplicate-email error"
        >
          {forceLinkingExistingOrg
            ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Linking…</>
            : <><Link className="w-3 h-3 mr-1" /> Force Link Existing Org</>
          }
        </Button>
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

const SUBMISSION_STATUS_OPTIONS = [
  { value: "new",            label: "New",            color: "bg-slate-100 text-slate-700" },
  { value: "contacted",      label: "Contacted",      color: "bg-blue-100 text-blue-700" },
  { value: "demo_scheduled", label: "Demo Scheduled", color: "bg-yellow-100 text-yellow-700" },
  { value: "trial_started",  label: "Trial Started",  color: "bg-purple-100 text-purple-700" },
  { value: "converted",      label: "Converted",      color: "bg-green-100 text-green-700" },
  { value: "not_a_fit",      label: "Not a Fit",      color: "bg-red-100 text-red-700" },
];

function SubmissionStatusBadge({ status }: { status: string | null }) {
  const opt = SUBMISSION_STATUS_OPTIONS.find(o => o.value === (status ?? "new")) ?? SUBMISSION_STATUS_OPTIONS[0];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>{opt.label}</span>;
}

function SubmissionDetailSheet({ submission, onClose, onStatusChange, onNotesChange, onMoveToPipeline, focusResend, onEdit }: {
  submission: Prospect;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onNotesChange: (id: string, notes: string) => void;
  onMoveToPipeline?: (submission: Prospect) => void;
  focusResend?: boolean;
  onEdit?: (p: Prospect) => void;
}) {
  const { toast } = useToast();
  const [notesValue, setNotesValue] = useState(submission.notes ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesValueRef = useRef(notesValue);
  const saveStatusRef = useRef(saveStatus);
  const isMountedRef = useRef(true);
  const resendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusResend && resendRef.current) {
      setTimeout(() => resendRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, [focusResend]);

  useEffect(() => () => { isMountedRef.current = false; }, []);

  const notesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiRequest("PATCH", `/api/super-admin/submissions/${id}/notes`, { notes }),
    onSuccess: (_, vars) => {
      onNotesChange(vars.id, vars.notes);
      if (isMountedRef.current) setSaveStatus("saved");
    },
    onError: () => {
      if (isMountedRef.current) setSaveStatus("idle");
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    },
  });

  const handleNotesChange = (val: string) => {
    setNotesValue(val);
    notesValueRef.current = val;
    saveStatusRef.current = "pending";
    setSaveStatus("pending");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveStatusRef.current = "saving";
      if (isMountedRef.current) setSaveStatus("saving");
      notesMutation.mutate({ id: submission.id, notes: notesValueRef.current });
    }, 1000);
  };

  const flushNotesSave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (saveStatusRef.current === "pending") {
      notesMutation.mutate({ id: submission.id, notes: notesValueRef.current });
    }
  };

  useEffect(() => () => { flushNotesSave(); }, []);

  const displayName = submission.firstName && submission.lastName
    ? `${submission.firstName} ${submission.lastName}`
    : submission.name;

  // These must be declared before useQuery that uses them in `enabled`
  const isBetaApp = submission.source === "beta_application";
  // Also treat manually-staged prospects (stage set via dropdown without going
  // through the approve-beta flow) as approved so the resend section is visible.
  const isBetaApproved = !!(submission.isBetaMember && !submission.betaRemovedAt) || submission.stage === "beta_approved";
  const showBetaApprovalDetails = isBetaApproved || submission.stage === "agreement_pending";

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [overrideDiscountPct, setOverrideDiscountPct] = useState<string>("");
  const [overrideBetaPrice, setOverrideBetaPrice] = useState<string>("");
  const [overrideSetupFee, setOverrideSetupFee] = useState<string>("");

  const [editingPricing, setEditingPricing] = useState(false);
  const [pricingDraft, setPricingDraft] = useState({
    portfolioTier: submission.portfolioTier ?? "",
    betaCohortNumber: String(submission.betaCohortNumber ?? ""),
    discountPercentage: String(submission.discountPercentage ?? ""),
    originalMonthlyPrice: String(submission.originalMonthlyPrice ?? ""),
    discountedMonthlyPrice: String(submission.discountedMonthlyPrice ?? ""),
    setupFee: String(submission.setupFee ?? ""),
  });

  const betaPricingPreview = useQuery({
    queryKey: ["/api/super-admin/onboarding-prospects", submission.id, "approve-beta", "preview"],
    queryFn: () =>
      fetch(`/api/super-admin/onboarding-prospects/${submission.id}/approve-beta/preview`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null),
    enabled: approveDialogOpen && isBetaApp && !isBetaApproved,
    staleTime: 30_000,
  });

  // Pre-populate override fields when preview data arrives
  useEffect(() => {
    if (betaPricingPreview.data && !betaPricingPreview.data.isFull) {
      setOverrideDiscountPct(String(betaPricingPreview.data.discountPct));
      setOverrideBetaPrice(Number(betaPricingPreview.data.discountedMonthlyPrice).toFixed(2));
      setOverrideSetupFee(Number(betaPricingPreview.data.setupFee).toFixed(2));
    }
  }, [betaPricingPreview.data]);

  const approveBetaMutation = useMutation({
    mutationFn: ({ id, overrides }: { id: string; overrides: Record<string, number> }) =>
      apiRequest("POST", `/api/super-admin/onboarding-prospects/${id}/approve-beta`, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      setApproveDialogOpen(false);
      toast({ title: "Beta application approved", description: "Approval email sent. Prospect moved to Agreement Pending." });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.message ?? "Failed to approve beta application";
      const isEmailFail = msg.toLowerCase().includes("email");
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      setApproveDialogOpen(false);
      toast({
        title: isEmailFail ? "Approved — but email failed to send" : "Approval failed",
        description: isEmailFail
          ? "Pricing and token saved. Use 'Resend Approval Email' to retry."
          : msg,
        variant: "destructive",
      });
      if (isEmailFail) onClose();
    },
  });

  const resendApprovalEmailMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/super-admin/onboarding-prospects/${id}/resend-approval-email`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Approval email sent", description: "The applicant has been sent the onboarding link." });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Email failed", description: err?.message ?? "Failed to resend approval email", variant: "destructive" });
    },
  });

  const savePricingMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${submission.id}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
      setEditingPricing(false);
      toast({ title: "Pricing updated", description: "The pricing structure has been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message ?? "Failed to update pricing", variant: "destructive" });
    },
  });

  const handleSavePricing = () => {
    const patch: Record<string, unknown> = {};
    if (pricingDraft.portfolioTier) patch.portfolioTier = pricingDraft.portfolioTier;
    const cohort = parseInt(pricingDraft.betaCohortNumber, 10);
    if (!isNaN(cohort)) patch.betaCohortNumber = cohort;
    const disc = parseFloat(pricingDraft.discountPercentage);
    if (!isNaN(disc)) patch.discountPercentage = disc;
    const listPrice = parseFloat(pricingDraft.originalMonthlyPrice);
    if (!isNaN(listPrice)) patch.originalMonthlyPrice = listPrice;
    const betaPrice = parseFloat(pricingDraft.discountedMonthlyPrice);
    if (!isNaN(betaPrice)) patch.discountedMonthlyPrice = betaPrice;
    const setup = parseFloat(pricingDraft.setupFee);
    if (!isNaN(setup)) patch.setupFee = setup;
    savePricingMutation.mutate(patch);
  };

  const handleClose = () => {
    flushNotesSave();
    onClose();
  };

  return (
    <Sheet open onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-xl">{displayName}</SheetTitle>
              <SheetDescription className="text-left">
                Submitted {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              </SheetDescription>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 mt-1"
                onClick={() => { handleClose(); onEdit(submission); }}
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Status</p>
            <Select
              value={submission.submissionStatus ?? "new"}
              onValueChange={(val) => onStatusChange(submission.id, val)}
            >
              <SelectTrigger className="w-48">
                <SubmissionStatusBadge status={submission.submissionStatus} />
              </SelectTrigger>
              <SelectContent>
                {SUBMISSION_STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Contact Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Contact Information</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${submission.email}`} className="text-teal-600 hover:underline break-all">{submission.email}</a>
              </div>
              {submission.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{submission.phone}</span>
                </div>
              )}
              {submission.preferredContactMethod && (
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Prefers <span className="text-foreground font-medium capitalize">{submission.preferredContactMethod}</span></span>
                </div>
              )}
              {submission.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={submission.website.startsWith("http") ? submission.website : `https://${submission.website}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline break-all">{submission.website}</a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Organization Details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Organization</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {submission.company && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs mb-0.5">Company</p>
                  <p className="font-medium">{submission.company}</p>
                </div>
              )}
              {submission.businessType && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Business Type</p>
                  <p className="font-medium capitalize">{submission.businessType.replace(/_/g, " ")}</p>
                </div>
              )}
              {submission.serviceArea && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Service Area</p>
                  <p className="font-medium">{submission.serviceArea}</p>
                </div>
              )}
              {submission.estimatedHomes != null && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Est. Properties</p>
                  <p className="font-medium">{submission.estimatedHomes}</p>
                </div>
              )}
              {submission.teamSize != null && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Team Size</p>
                  <p className="font-medium">{submission.teamSize}</p>
                </div>
              )}
              {submission.currentMgmtMethod && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs mb-0.5">Current Management Method</p>
                  <p className="font-medium capitalize">{submission.currentMgmtMethod.replace(/_/g, " ")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Beta Application — always shown for beta_application source; covers all 11 fields */}
          {isBetaApp && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-600 mb-3">Beta Application</p>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  {/* Contact fields */}
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs mb-0.5">Contact Name</p>
                    <p className="font-medium">{displayName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Email</p>
                    <a href={`mailto:${submission.email}`} className="text-teal-600 hover:underline break-all font-medium">{submission.email}</a>
                  </div>
                  {submission.phone && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Phone</p>
                      <p className="font-medium">{submission.phone}</p>
                    </div>
                  )}
                  {submission.company && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs mb-0.5">Organization Name</p>
                      <p className="font-medium">{submission.company}</p>
                    </div>
                  )}
                  {submission.website && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs mb-0.5">Website</p>
                      <a href={submission.website.startsWith("http") ? submission.website : `https://${submission.website}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline break-all font-medium">{submission.website}</a>
                    </div>
                  )}
                  {submission.businessType && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Business Type</p>
                      <p className="font-medium capitalize">{submission.businessType.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {submission.serviceArea && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Service Area</p>
                      <p className="font-medium">{submission.serviceArea}</p>
                    </div>
                  )}
                  {submission.estimatedHomes != null && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Properties Managed</p>
                      <p className="font-medium">{submission.estimatedHomes}</p>
                    </div>
                  )}
                  {submission.teamSize != null && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Staff Users Expected</p>
                      <p className="font-medium">{submission.teamSize}</p>
                    </div>
                  )}
                  {submission.currentMgmtMethod && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs mb-0.5">Current Software / Method</p>
                      <p className="font-medium capitalize">{submission.currentMgmtMethod.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {submission.preferredContactMethod && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Preferred Contact</p>
                      <p className="font-medium capitalize">{submission.preferredContactMethod}</p>
                    </div>
                  )}
                </div>
                {/* Beta-specific questions */}
                <div className="space-y-3 text-sm">
                  {submission.whyInterested ? (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1 font-medium">Why interested in Hubify Homes?</p>
                      <p className="text-foreground leading-relaxed bg-muted/40 rounded p-2">{submission.whyInterested}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1 font-medium">Why interested in Hubify Homes?</p>
                      <p className="text-muted-foreground italic text-xs">Not provided</p>
                    </div>
                  )}
                  {submission.biggestChallenge ? (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1 font-medium">Biggest operational challenge?</p>
                      <p className="text-foreground leading-relaxed bg-muted/40 rounded p-2">{submission.biggestChallenge}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1 font-medium">Biggest operational challenge?</p>
                      <p className="text-muted-foreground italic text-xs">Not provided</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs mb-1 font-medium">Preferred launch timeframe</p>
                    {submission.launchTimeframe ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                        {submission.launchTimeframe}
                      </span>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Tier & Intent */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Tier & Intent</p>
            <div className="flex items-center gap-4 flex-wrap text-sm">
              {submission.suggestedTier ? (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Suggested Tier</p>
                  <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-1">
                    {submission.suggestedTier}
                  </span>
                </div>
              ) : null}
              {submission.trialIntent ? (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Trial Intent</p>
                  <span className="capitalize font-medium">{submission.trialIntent.replace(/_/g, " ")}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Beta Approval Details — shown when isBetaMember OR stage = agreement_pending */}
          {showBetaApprovalDetails && (
            <>
              <Separator />
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Beta Approval Details
                  </p>
                  {!editingPricing ? (
                    <button
                      onClick={() => {
                        setPricingDraft({
                          portfolioTier: submission.portfolioTier ?? "",
                          betaCohortNumber: String(submission.betaCohortNumber ?? ""),
                          discountPercentage: String(submission.discountPercentage ?? ""),
                          originalMonthlyPrice: String(submission.originalMonthlyPrice ?? ""),
                          discountedMonthlyPrice: String(submission.discountedMonthlyPrice ?? ""),
                          setupFee: String(submission.setupFee ?? ""),
                        });
                        setEditingPricing(true);
                      }}
                      className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1 font-medium"
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPricing(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                        disabled={savePricingMutation.isPending}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePricing}
                        disabled={savePricingMutation.isPending}
                        className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded-md font-medium disabled:opacity-50"
                      >
                        {savePricingMutation.isPending ? "Saving…" : "Save"}
                      </button>
                    </div>
                  )}
                </div>

                {editingPricing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-teal-600 text-xs mb-1 block">Portfolio Tier</Label>
                      <Select
                        value={pricingDraft.portfolioTier}
                        onValueChange={v => setPricingDraft(d => ({ ...d, portfolioTier: v }))}
                      >
                        <SelectTrigger className="h-8 text-sm bg-white">
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Starter Portfolio">Starter Portfolio</SelectItem>
                          <SelectItem value="Growth Portfolio">Growth Portfolio</SelectItem>
                          <SelectItem value="Enterprise Portfolio">Enterprise Portfolio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-teal-600 text-xs mb-1 block">Cohort #</Label>
                      <Input
                        type="number"
                        className="h-8 text-sm bg-white"
                        value={pricingDraft.betaCohortNumber}
                        onChange={e => setPricingDraft(d => ({ ...d, betaCohortNumber: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-teal-600 text-xs mb-1 block">Discount %</Label>
                      <Input
                        type="number"
                        className="h-8 text-sm bg-white"
                        value={pricingDraft.discountPercentage}
                        onChange={e => setPricingDraft(d => ({ ...d, discountPercentage: e.target.value }))}
                        placeholder="e.g. 50"
                      />
                    </div>
                    <div>
                      <Label className="text-teal-600 text-xs mb-1 block">List Price ($/mo)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-sm bg-white"
                        value={pricingDraft.originalMonthlyPrice}
                        onChange={e => setPricingDraft(d => ({ ...d, originalMonthlyPrice: e.target.value }))}
                        placeholder="e.g. 65.00"
                      />
                    </div>
                    <div>
                      <Label className="text-teal-600 text-xs mb-1 block">Beta Price ($/mo)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-sm bg-white"
                        value={pricingDraft.discountedMonthlyPrice}
                        onChange={e => setPricingDraft(d => ({ ...d, discountedMonthlyPrice: e.target.value }))}
                        placeholder="e.g. 32.50"
                      />
                    </div>
                    <div>
                      <Label className="text-teal-600 text-xs mb-1 block">Setup Fee ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-sm bg-white"
                        value={pricingDraft.setupFee}
                        onChange={e => setPricingDraft(d => ({ ...d, setupFee: e.target.value }))}
                        placeholder="e.g. 149.00"
                      />
                    </div>
                    <div className="col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                      Note: changing prices here updates the record only. If Stripe payment links have already been created, you will need to handle that separately.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {submission.betaCohortNumber != null && (
                      <div>
                        <p className="text-teal-600 text-xs mb-0.5">Cohort #</p>
                        <p className="font-semibold text-teal-900">{submission.betaCohortNumber}</p>
                      </div>
                    )}
                    {submission.portfolioTier && (
                      <div>
                        <p className="text-teal-600 text-xs mb-0.5">Portfolio Tier</p>
                        <p className="font-semibold text-teal-900">{submission.portfolioTier}</p>
                      </div>
                    )}
                    {submission.discountPercentage != null && (
                      <div>
                        <p className="text-teal-600 text-xs mb-0.5">Discount</p>
                        <p className="font-semibold text-teal-900">{submission.discountPercentage}% off (life-locked)</p>
                      </div>
                    )}
                    {submission.originalMonthlyPrice != null && (
                      <div>
                        <p className="text-teal-600 text-xs mb-0.5">List Price</p>
                        <p className="font-semibold text-teal-900">${submission.originalMonthlyPrice.toFixed(2)}/mo</p>
                      </div>
                    )}
                    {submission.discountedMonthlyPrice != null && (
                      <div>
                        <p className="text-teal-600 text-xs mb-0.5">Beta Price</p>
                        <p className="font-bold text-teal-900 text-base">${submission.discountedMonthlyPrice.toFixed(2)}/mo</p>
                      </div>
                    )}
                    {submission.setupFee != null && (
                      <div>
                        <p className="text-teal-600 text-xs mb-0.5">Setup Fee</p>
                        <p className="font-semibold text-teal-900">${submission.setupFee.toFixed(2)}</p>
                      </div>
                    )}
                    {submission.agreementStatus && (
                      <div>
                        <p className="text-teal-600 text-xs mb-0.5">Agreement</p>
                        <p className="font-semibold text-teal-900 capitalize">{submission.agreementStatus.replace(/_/g, " ")}</p>
                      </div>
                    )}
                    {submission.betaApprovedAt && (
                      <div>
                        <p className="text-teal-600 text-xs mb-0.5">Approved On</p>
                        <p className="font-semibold text-teal-900">{new Date(submission.betaApprovedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Agreement Audit — only shown when at least one audit field is present */}
          {(submission.agreementViewedAt || submission.agreementScrolledAt || submission.agreementSignedAt || submission.agreementVersion || submission.agreementAcceptedIp || submission.agreementEmailStatus) && (
            <>
              <Separator />
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Agreement Audit
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {submission.agreementSignerName && (
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Signer Name</p>
                      <p className="font-medium text-slate-800">{submission.agreementSignerName}</p>
                    </div>
                  )}
                  {submission.agreementOrganizationName && (
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Organization</p>
                      <p className="font-medium text-slate-800">{submission.agreementOrganizationName}</p>
                    </div>
                  )}
                  {submission.agreementVersion && (
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Version</p>
                      <p className="font-medium text-slate-800">{submission.agreementVersion}</p>
                    </div>
                  )}
                  {submission.agreementViewedAt && (
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Viewed At</p>
                      <p className="font-medium text-slate-800">{new Date(submission.agreementViewedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {submission.agreementScrolledAt && (
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Scrolled to Bottom</p>
                      <p className="font-medium text-slate-800">{new Date(submission.agreementScrolledAt).toLocaleString()}</p>
                    </div>
                  )}
                  {submission.agreementSignedAt && (
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Accepted At</p>
                      <p className="font-medium text-slate-800">{new Date(submission.agreementSignedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {submission.agreementAcceptedIp && (
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">IP Address</p>
                      <p className="font-medium text-slate-800 font-mono text-xs">{submission.agreementAcceptedIp}</p>
                    </div>
                  )}
                  {submission.agreementEmailStatus && (
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Confirmation Email</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                        submission.agreementEmailStatus === "sent"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {submission.agreementEmailStatus === "sent" ? "Sent" : "Failed"}
                      </span>
                    </div>
                  )}
                  {submission.agreementEmailSentAt && (
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Email Sent At</p>
                      <p className="font-medium text-slate-800">{new Date(submission.agreementEmailSentAt).toLocaleString()}</p>
                    </div>
                  )}
                  {submission.agreementAcceptedUserAgent && (
                    <div className="col-span-2">
                      <p className="text-slate-500 text-xs mb-0.5">User Agent</p>
                      <p className="font-medium text-slate-800 text-xs break-all line-clamp-2" title={submission.agreementAcceptedUserAgent}>
                        {submission.agreementAcceptedUserAgent.length > 120
                          ? submission.agreementAcceptedUserAgent.slice(0, 120) + "…"
                          : submission.agreementAcceptedUserAgent}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal Notes</p>
              {saveStatus === "pending" && (
                <span className="text-xs text-muted-foreground">Unsaved…</span>
              )}
              {saveStatus === "saving" && (
                <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-teal-600">Saved</span>
              )}
            </div>
            <Textarea
              value={notesValue}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Add call notes, follow-up reminders, or any context…"
              className="text-sm min-h-[120px] resize-y"
            />
          </div>
        </div>

        {/* Approve Beta Application — shown for unapproved beta applicants */}
        {isBetaApp && !isBetaApproved && (
          <div className="pt-4 mt-4 border-t space-y-2">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => setApproveDialogOpen(true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Beta Application
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Assigns cohort slot, computes pricing, and sends onboarding email
            </p>
          </div>
        )}

        {/* Approval email status + resend — shown whenever approved */}
        {isBetaApp && isBetaApproved && (
          <div ref={resendRef} className="pt-4 mt-4 border-t space-y-2">
            {/* Status badge */}
            {submission.approvalEmailSent ? (
              <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Approval email sent</span>
                {submission.approvalEmailSentAt && (
                  <span className="text-green-600 text-xs ml-auto">
                    {new Date(submission.approvalEmailSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                Email not delivered — resend to give the applicant their onboarding link.
              </div>
            )}

            {/* Error detail */}
            {submission.approvalEmailSendError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                Last error: {submission.approvalEmailSendError}
              </p>
            )}

            {/* Token expiry */}
            {submission.onboardingTokenExpiresAt && (
              <p className="text-xs text-muted-foreground">
                Link expires: {new Date(submission.onboardingTokenExpiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {new Date(submission.onboardingTokenExpiresAt) < new Date() && (
                  <span className="ml-1 text-amber-600 font-medium">(expired)</span>
                )}
              </p>
            )}

            {/* Last resent */}
            {submission.approvalEmailLastResentAt && (
              <p className="text-xs text-muted-foreground">
                Last resent: {new Date(submission.approvalEmailLastResentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}

            {/* Resend button — always available for approved prospects */}
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              disabled={resendApprovalEmailMutation.isPending}
              onClick={() => resendApprovalEmailMutation.mutate(submission.id)}
            >
              {resendApprovalEmailMutation.isPending ? (
                <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Sending…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />{submission.approvalEmailSent ? "Resend Approval Email" : "Send Approval Email"}</>
              )}
            </Button>
          </div>
        )}

        {onMoveToPipeline && submission.submissionStatus !== "converted" && !isBetaApp && (
          <div className="pt-4 mt-4 border-t">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => onMoveToPipeline(submission)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Move to Pipeline
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-1.5">
              Creates a prospect pre-filled with this submission's data
            </p>
          </div>
        )}

        {submission.submissionStatus === "converted" && (
          <div className="pt-4 mt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Already moved to pipeline
            </div>
          </div>
        )}

        {/* Approve Beta Confirmation Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Beta Application?</DialogTitle>
              <DialogDescription>
                Review the computed pricing below, then confirm to move <strong>{displayName}</strong> to <strong>Agreement Pending</strong>.
              </DialogDescription>
            </DialogHeader>

            {betaPricingPreview.isLoading && (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600" />
                Computing pricing…
              </div>
            )}

            {betaPricingPreview.data && !betaPricingPreview.data.isFull && (
              <div className="space-y-3">
                {/* Read-only cohort/tier info */}
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Computed Approval Details</p>
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-1 pr-3 text-teal-600 w-40">Cohort #</td>
                        <td className="py-1 font-semibold text-teal-900">{betaPricingPreview.data.cohortNumber} of {betaPricingPreview.data.totalSlotsAvailable}</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-3 text-teal-600">Portfolio Tier</td>
                        <td className="py-1 font-semibold text-teal-900">{betaPricingPreview.data.portfolioTier}</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-3 text-teal-600">List Price</td>
                        <td className="py-1 font-medium text-teal-800">${Number(betaPricingPreview.data.originalMonthlyPrice).toFixed(2)}/mo</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-3 text-teal-600">Slots Remaining</td>
                        <td className="py-1 font-semibold text-teal-900">{betaPricingPreview.data.slotsRemaining} after this approval</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Editable pricing overrides */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pricing — Edit Before Confirming</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-amber-700 font-medium">Discount %</label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={overrideDiscountPct}
                          onChange={e => {
                            setOverrideDiscountPct(e.target.value);
                            const disc = Number(e.target.value);
                            const list = Number(betaPricingPreview.data!.originalMonthlyPrice);
                            if (!isNaN(disc) && !isNaN(list)) {
                              setOverrideBetaPrice((list * (1 - disc / 100)).toFixed(2));
                            }
                          }}
                          className="h-8 text-sm pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-amber-700 font-medium">Beta Price/mo</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min={0}
                          value={overrideBetaPrice}
                          onChange={e => setOverrideBetaPrice(e.target.value)}
                          className="h-8 text-sm pl-5"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-amber-700 font-medium">Setup Fee</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min={0}
                          value={overrideSetupFee}
                          onChange={e => setOverrideSetupFee(e.target.value)}
                          className="h-8 text-sm pl-5"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900"
                    onClick={() => {
                      setOverrideDiscountPct("100");
                      setOverrideBetaPrice("0.00");
                      setOverrideSetupFee("0.00");
                    }}
                  >
                    Set to Free (100% off)
                  </button>
                </div>
              </div>
            )}

            {betaPricingPreview.data?.isFull && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                ⚠ Beta program is full — no slots available. Remove an existing beta member before approving.
              </div>
            )}

            {!betaPricingPreview.isLoading && !betaPricingPreview.data && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Could not load pricing preview. You can still proceed and pricing will be computed on approval.
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={approveBetaMutation.isPending}>
                Cancel
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={approveBetaMutation.isPending || betaPricingPreview.isLoading || betaPricingPreview.data?.isFull}
                onClick={() => {
                  const overrides: Record<string, number> = {};
                  if (overrideDiscountPct !== "") overrides.overrideDiscountPct = Number(overrideDiscountPct);
                  if (overrideBetaPrice !== "") overrides.overrideBetaPrice = Number(overrideBetaPrice);
                  if (overrideSetupFee !== "") overrides.overrideSetupFee = Number(overrideSetupFee);
                  approveBetaMutation.mutate({ id: submission.id, overrides });
                }}
              >
                {approveBetaMutation.isPending ? "Approving…" : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

const SOURCE_META: Record<string, { label: string; color: string }> = {
  get_started:           { label: "Get Started",          color: "bg-green-100 text-green-800" },
  demo_request:          { label: "Demo Request",          color: "bg-blue-100 text-blue-800" },
  marketing_demo_request:{ label: "Demo Request",          color: "bg-blue-100 text-blue-800" },
  beta_application:      { label: "Beta Application",      color: "bg-teal-100 text-teal-800" },
  contact_form:          { label: "Contact Form",          color: "bg-slate-100 text-slate-700" },
  pricing_starter:       { label: "Pricing · Starter",     color: "bg-purple-100 text-purple-800" },
  pricing_growth:        { label: "Pricing · Growth",      color: "bg-purple-100 text-purple-800" },
  pricing_professional:  { label: "Pricing · Professional",color: "bg-purple-100 text-purple-800" },
  pricing_operator:      { label: "Pricing · Operator",    color: "bg-purple-100 text-purple-800" },
  pricing_enterprise:    { label: "Pricing · Enterprise",  color: "bg-purple-100 text-purple-800" },
};

function ProspectSourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-muted-foreground text-xs">—</span>;
  const meta = SOURCE_META[source] ?? { label: source.replace(/_/g, " "), color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${meta.color}`}>
      {meta.label}
    </span>
  );
}

const SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "get_started", label: "Get Started" },
  { value: "demo_request", label: "Demo Request" },
  { value: "beta_application", label: "Beta Application" },
  { value: "contact_form", label: "Contact Form" },
  { value: "pricing_starter",      label: "Pricing · Starter" },
  { value: "pricing_growth",       label: "Pricing · Growth" },
  { value: "pricing_professional", label: "Pricing · Professional" },
  { value: "pricing_operator",     label: "Pricing · Operator" },
  { value: "pricing_enterprise",   label: "Pricing · Enterprise" },
];

function SubmissionsTab({ onMoveToPipeline, defaultSourceFilter, statusFilter, onEdit }: { onMoveToPipeline?: (submission: Prospect) => void; defaultSourceFilter?: string; statusFilter?: string; onEdit?: (p: Prospect) => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState(defaultSourceFilter ?? "all");
  const [selectedSubmission, setSelectedSubmission] = useState<Prospect | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkMoving, setBulkMoving] = useState(false);

  const { data: submissions = [], isLoading } = useQuery<Prospect[]>({
    queryKey: ["/api/super-admin/submissions"],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/super-admin/submissions/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
      toast({ title: "Status updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update status", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions
      .filter(s => !s.orgId && s.stage !== "converted")
      .filter(s => {
        if (statusFilter && statusFilter !== "all") {
          return (s.submissionStatus ?? "new") === statusFilter;
        }
        return true;
      })
      .filter(s => {
        if (sourceFilter === "all") return true;
        const src = s.source === "marketing_demo_request" ? "demo_request" : (s.source ?? "get_started");
        return src === sourceFilter;
      })
      .filter(s =>
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.company?.toLowerCase().includes(q) ||
        s.serviceArea?.toLowerCase().includes(q) ||
        s.suggestedTier?.toLowerCase().includes(q)
      );
  }, [submissions, search, sourceFilter, statusFilter]);

  const allChecked = checkedIds.size > 0 && filtered.every(s => checkedIds.has(s.id));
  const someChecked = checkedIds.size > 0 && !allChecked;

  function toggleAll() {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filtered.map(s => s.id)));
    }
  }

  function toggleOne(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await Promise.all(
        [...checkedIds].map(id => apiRequest("DELETE", `/api/super-admin/onboarding-prospects/${id}`))
      );
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
      toast({ title: `${checkedIds.size} submission${checkedIds.size !== 1 ? "s" : ""} deleted` });
      setCheckedIds(new Set());
      setBulkDeleteOpen(false);
    } catch {
      toast({ title: "Error", description: "Some deletions failed", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleBulkMoveToPipeline() {
    setBulkMoving(true);
    const ids = [...checkedIds];
    try {
      await Promise.all(
        ids.map(id => apiRequest("PATCH", `/api/super-admin/submissions/${id}/status`, { status: "converted" }))
      );
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
      if (onMoveToPipeline) {
        const toMove = filtered.filter(s => ids.includes(s.id));
        toMove.forEach(sub => onMoveToPipeline(sub));
      }
      toast({ title: `${ids.length} submission${ids.length !== 1 ? "s" : ""} moved to pipeline` });
      setCheckedIds(new Set());
    } catch {
      toast({ title: "Error", description: "Some updates failed", variant: "destructive" });
    } finally {
      setBulkMoving(false);
    }
  }

  const fromFormCount = submissions.filter(s => s.firstName || s.estimatedHomes).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Client Submissions</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Leads submitted via the public form — {fromFormCount} rich submission{fromFormCount !== 1 ? "s" : ""} out of {submissions.length} total.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = window.location.origin + "/submit";
                  navigator.clipboard.writeText(url).then(
                    () => toast({ title: "Link copied!", description: "Share this submission form link on your marketing site." }),
                    () => toast({ title: "Copy failed", description: `Please copy manually: ${url}`, variant: "destructive" })
                  );
                }}
              >
                <Link2 className="w-4 h-4 mr-2" /> Copy Form Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const embedUrl = window.location.origin + "/submit?embed=true";
                  const snippet = `<!-- Hubify Get Started Form Popup -->\n<button id="hf-submit-btn" style="background:#0d9488;color:#fff;padding:12px 28px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Get Started</button>\n<div id="hf-submit-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">\n  <div style="position:relative;width:90%;max-width:620px;">\n    <iframe src="${embedUrl}" style="width:100%;height:720px;border:none;border-radius:16px;display:block;" title="Get Started with Hubify" loading="lazy"></iframe>\n    <button onclick="document.getElementById('hf-submit-modal').style.display='none'" style="position:absolute;top:-14px;right:-14px;background:#fff;border:1px solid #e2e8f0;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:18px;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,0.15);">×</button>\n  </div>\n</div>\n<script>document.getElementById('hf-submit-btn').onclick=function(){var m=document.getElementById('hf-submit-modal');m.style.display='flex';}<\/script>`;
                  navigator.clipboard.writeText(snippet).then(
                    () => toast({ title: "Embed snippet copied!", description: "Paste this HTML into your marketing site." }),
                    () => toast({ title: "Copy failed", description: "Please copy the embed snippet manually.", variant: "destructive" })
                  );
                }}
              >
                <Link2 className="w-4 h-4 mr-2" /> Copy Embed Snippet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by name, email, company, area…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {checkedIds.size > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/60 rounded-lg border text-sm">
              <span className="font-medium text-foreground">{checkedIds.size} selected</span>
              <div className="flex gap-2 ml-auto">
                {onMoveToPipeline && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkMoveToPipeline}
                    disabled={bulkMoving || bulkDeleting}
                  >
                    {bulkMoving ? "Moving…" : "Move to Pipeline"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={bulkMoving || bulkDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCheckedIds(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No submissions found.</div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={allChecked}
                        data-state={someChecked ? "indeterminate" : allChecked ? "checked" : "unchecked"}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Est. Homes</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow
                      key={s.id}
                      className={`cursor-pointer hover:bg-muted/50 ${checkedIds.has(s.id) ? "bg-muted/40" : ""}`}
                      onClick={() => setSelectedSubmission(s)}
                    >
                      <TableCell className="pl-4" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={checkedIds.has(s.id)}
                          onCheckedChange={() => toggleOne(s.id)}
                          aria-label={`Select ${s.name ?? s.email}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name}
                      </TableCell>
                      <TableCell>
                        <ProspectSourceBadge source={s.source} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <a
                          href={`mailto:${s.email}`}
                          className="text-teal-600 hover:underline"
                          onClick={e => e.stopPropagation()}
                        >{s.email}</a>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {s.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{s.company}</div>
                        {s.serviceArea && <div className="text-xs text-muted-foreground">{s.serviceArea}</div>}
                      </TableCell>
                      <TableCell>
                        {s.suggestedTier ? (
                          <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                            {s.suggestedTier}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {s.estimatedHomes ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.notes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <MessageSquare className="h-4 w-4 text-teal-600 mx-auto cursor-default" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap text-xs">
                              {s.notes}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Select
                          value={s.submissionStatus ?? "new"}
                          onValueChange={(val) => statusMutation.mutate({ id: s.id, status: val })}
                        >
                          <SelectTrigger className="h-7 text-xs w-36 border-0 p-0 shadow-none focus:ring-0">
                            <SubmissionStatusBadge status={s.submissionStatus} />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBMISSION_STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>
                                  {opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        {onEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => onEdit(s)}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit submission</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSubmission && (
        <SubmissionDetailSheet
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onStatusChange={(id, status) => {
            statusMutation.mutate({ id, status });
            setSelectedSubmission(prev => prev ? { ...prev, submissionStatus: status } : prev);
          }}
          onNotesChange={(id, notes) => {
            queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
            setSelectedSubmission(prev => prev ? { ...prev, notes } : prev);
          }}
          onMoveToPipeline={onMoveToPipeline ? (sub) => {
            statusMutation.mutate({ id: sub.id, status: "converted" });
            setSelectedSubmission(prev => prev ? { ...prev, submissionStatus: "converted" } : prev);
            onMoveToPipeline(sub);
          } : undefined}
          onEdit={onEdit ? (p) => { setSelectedSubmission(null); onEdit(p); } : undefined}
        />
      )}

      <Dialog open={bulkDeleteOpen} onOpenChange={open => { if (!open) setBulkDeleteOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {checkedIds.size} submission{checkedIds.size !== 1 ? "s" : ""}?</DialogTitle>
            <DialogDescription>
              This will permanently remove {checkedIds.size === 1 ? "this submission" : `all ${checkedIds.size} selected submissions`}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? "Deleting…" : `Delete ${checkedIds.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OnboardingPipelineTab({ prefill, onPrefillConsumed, initialBetaOnly, initialDemoOnly, onGoToOrganizations }: { prefill?: ProspectFormValues | null; onPrefillConsumed?: () => void; initialBetaOnly?: boolean; initialDemoOnly?: boolean; onGoToOrganizations?: () => void }) {
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [detailProspect, setDetailProspect] = useState<Prospect | null>(null);
  const [detailFocusResend, setDetailFocusResend] = useState(false);
  const [editingPricingInSheet, setEditingPricingInSheet] = useState(false);
  const [pricingDraftInSheet, setPricingDraftInSheet] = useState({
    portfolioTier: "",
    betaCohortNumber: "",
    discountPercentage: "",
    originalMonthlyPrice: "",
    discountedMonthlyPrice: "",
    setupFee: "",
  });

  const detailStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/super-admin/submissions/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to update status", variant: "destructive" }),
  });

  const [droppingProspect, setDroppingProspect] = useState<Prospect | null>(null);
  const [showDropped, setShowDropped] = useState(false);
  const [stuckDays, setStuckDays] = useState(7);
  const [dragOverStage, setDragOverStage] = useState<OnboardingStage | null>(null);
  const [betaOnly, setBetaOnly] = useState(initialBetaOnly ?? false);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    if (prefill) {
      setEditingProspect(null);
      form.reset({
        name: prefill.name ?? "",
        email: prefill.email ?? "",
        company: prefill.company ?? "",
        phone: prefill.phone ?? "",
        notes: prefill.notes ?? "",
        agreementContent: "",
      });
      setSheetOpen(true);
      onPrefillConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const DEMO_STAGES: string[] = ["demo_requested", "demo_sent", "demo_completed", "follow_up_needed", "converted", "not_a_fit"];
  const active = allProspects.filter(p => {
    if (p.stage === "dropped") return false;
    if (initialDemoOnly && p.source !== "marketing_demo_request" && !DEMO_STAGES.includes(p.stage)) return false;
    if (betaOnly && p.trialIntent !== "beta_application" && p.source !== "beta_application") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.email ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });
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

  const savePricingInSheetMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${id}`, {
        portfolioTier: pricingDraftInSheet.portfolioTier || null,
        betaCohortNumber: pricingDraftInSheet.betaCohortNumber ? Number(pricingDraftInSheet.betaCohortNumber) : null,
        discountPercentage: pricingDraftInSheet.discountPercentage ? Number(pricingDraftInSheet.discountPercentage) : null,
        originalMonthlyPrice: pricingDraftInSheet.originalMonthlyPrice ? Number(pricingDraftInSheet.originalMonthlyPrice) : null,
        discountedMonthlyPrice: pricingDraftInSheet.discountedMonthlyPrice ? Number(pricingDraftInSheet.discountedMonthlyPrice) : null,
        setupFee: pricingDraftInSheet.setupFee ? Number(pricingDraftInSheet.setupFee) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/submissions"] });
      setEditingPricingInSheet(false);
      toast({ title: "Pricing saved" });
    },
    onError: () => toast({ title: "Failed to save pricing", variant: "destructive" }),
  });

  const openEdit = (p: Prospect) => {
    setEditingProspect(p);
    setEditingPricingInSheet(false);
    setPricingDraftInSheet({
      portfolioTier: (p as any).portfolioTier ?? "",
      betaCohortNumber: (p as any).betaCohortNumber != null ? String((p as any).betaCohortNumber) : "",
      discountPercentage: (p as any).discountPercentage != null ? String((p as any).discountPercentage) : "",
      originalMonthlyPrice: (p as any).originalMonthlyPrice != null ? String((p as any).originalMonthlyPrice) : "",
      discountedMonthlyPrice: (p as any).discountedMonthlyPrice != null ? String((p as any).discountedMonthlyPrice) : "",
      setupFee: (p as any).setupFee != null ? String((p as any).setupFee) : "",
    });
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
    mutationFn: async ({ values, editId, agreementSigned }: { values: ProspectFormValues; editId?: string; agreementSigned?: boolean }) => {
      if (editId) {
        // Strip agreementContent from PATCH payload when the agreement is already
        // signed — the server guards immutability and would reject unrelated edits.
        const payload = { ...values };
        if (agreementSigned) {
          delete (payload as Partial<typeof payload>).agreementContent;
        }
        return apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${editId}`, payload);
      }
      return apiRequest("POST", "/api/super-admin/onboarding-prospects", values);
    },
    onSuccess: (_, { editId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      setSheetOpen(false);
      toast({ title: editId ? "Prospect updated" : "Prospect added to Submission" });
    },
    onError: (error: Error) => {
      const match = error.message.match(/^\d+: (.+)$/);
      let description = "Failed to save prospect";
      let statusCode = 0;
      if (match) {
        statusCode = parseInt(error.message);
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed?.message) description = parsed.message;
        } catch {
          description = match[1];
        }
      }
      if (statusCode === 409) {
        form.setError("email", { type: "manual", message: description });
        return;
      }
      toast({ title: "Error", description, variant: "destructive" });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: OnboardingStage }) =>
      apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${id}`, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Prospect advanced" });
    },
    onError: (error: Error) => {
      let description = "Failed to advance prospect";
      try {
        const jsonPart = error.message.replace(/^\d+:\s*/, "");
        const body = JSON.parse(jsonPart);
        if (body?.message) description = body.message;
      } catch {
        if (error?.message) description = error.message;
      }
      toast({ title: "Error", description, variant: "destructive" });
    },
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

  const demoEmailMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/super-admin/onboarding-prospects/${id}/send-demo-email`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Demo email sent!" });
    },
    onError: (e: Error) => toast({
      title: "Demo email failed",
      description: e?.message || "Could not send demo access email",
      variant: "destructive",
    }),
  });

  const resendConfirmationEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/super-admin/onboarding-prospects/${id}/send-confirmation-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      const body = await r.json() as Prospect & { emailSent: boolean; message?: string; retryAfterSeconds?: number };
      if (!r.ok) throw Object.assign(new Error(body.message || `Error ${r.status}`), { retryAfterSeconds: body.retryAfterSeconds });
      return body;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      setEditingProspect(result);
      if (result.emailSent) {
        setConfirmEmailCooldownUntil(Date.now() + 60_000);
        toast({ title: "Confirmation email sent!" });
      } else {
        toast({
          title: "Email not sent",
          description: result.message || result.confirmationEmailStatus || "Could not send confirmation email",
          variant: "destructive",
        });
      }
    },
    onError: (e: any) => toast({
      title: "Email not sent",
      description: e?.message || "Could not send confirmation email",
      variant: "destructive",
    }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${id}`, { stage: "inquiry", droppedReason: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Prospect restored to Submission" });
    },
  });

  // ── Email history & send-now ─────────────────────────────────────────────
  const [confirmEmailCooldownUntil, setConfirmEmailCooldownUntil] = useState<number | null>(null);

  useEffect(() => {
    if (confirmEmailCooldownUntil === null) return;
    const remaining = confirmEmailCooldownUntil - Date.now();
    if (remaining <= 0) { setConfirmEmailCooldownUntil(null); return; }
    const t = setTimeout(() => setConfirmEmailCooldownUntil(null), remaining);
    return () => clearTimeout(t);
  }, [confirmEmailCooldownUntil]);

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

  const [conversionSummary, setConversionSummary] = useState<{
    orgName: string;
    adminEmail: string;
    trialEndFormatted: string;
  } | null>(null);

  const convertToOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/super-admin/onboarding-prospects/${id}/convert-to-org`, {});
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      if (data?.summary) {
        setConversionSummary(data.summary);
      } else {
        toast({ title: "Organization created!", description: "The prospect has been linked to the new org." });
      }
    },
    onError: (e: Error) => toast({
      title: "Conversion failed",
      description: e?.message || "Could not create organization",
      variant: "destructive",
    }),
  });

  const forceLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/super-admin/onboarding-prospects/${id}/force-link-existing-org`, {});
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Force link failed");
      }
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      toast({
        title: "Prospect linked!",
        description: `Linked to org: ${data.org?.name ?? data.orgId}. They can log in at /staff/login.`,
      });
    },
    onError: (e: Error) => toast({
      title: "Force link failed",
      description: e?.message || "Could not link prospect to existing org",
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
              const embedUrl = window.location.origin + "/contact?embed=true";
              const snippet = `<!-- Hubify Homes Contact Form Popup -->\n<button id="hf-contact-btn" style="background:#0d9488;color:#fff;padding:12px 28px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Get in Touch</button>\n<div id="hf-contact-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">\n  <div style="position:relative;width:90%;max-width:580px;">\n    <iframe src="${embedUrl}" style="width:100%;height:680px;border:none;border-radius:16px;display:block;" title="Contact Hubify Homes" loading="lazy"></iframe>\n    <button onclick="document.getElementById('hf-contact-modal').style.display='none'" style="position:absolute;top:-14px;right:-14px;background:#fff;border:1px solid #e2e8f0;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:18px;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,0.15);">×</button>\n  </div>\n</div>\n<script>document.getElementById('hf-contact-btn').onclick=function(){var m=document.getElementById('hf-contact-modal');m.style.display='flex';}<\/script>`;
              navigator.clipboard.writeText(snippet).then(
                () => toast({ title: "Embed snippet copied!", description: "Paste this HTML into your marketing site." }),
                () => toast({ title: "Copy failed", description: "Please copy the embed snippet manually.", variant: "destructive" })
              );
            }}
          >
            <Link2 className="w-4 h-4 mr-2" /> Copy Embed Snippet
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const url = window.location.origin + "/contact";
              navigator.clipboard.writeText(url).then(
                () => toast({ title: "Link copied!", description: "Share this contact form link directly." }),
                () => toast({ title: "Copy failed", description: `Please copy manually: ${url}`, variant: "destructive" })
              );
            }}
          >
            <Link2 className="w-4 h-4 mr-2" /> Copy Contact Link
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 w-52 h-9 text-sm"
            />
          </div>
          <Button
            variant={betaOnly ? "default" : "outline"}
            onClick={() => setBetaOnly(v => !v)}
            className={betaOnly ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
          >
            <Filter className="w-4 h-4 mr-2" /> Beta only ({allProspects.filter(p => p.stage !== "dropped" && (p.trialIntent === "beta_application" || p.source === "beta_application")).length})
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
                        onOpenResend={() => { setDetailProspect(p); setDetailFocusResend(true); }}
                        onSendWelcome={() => welcomeEmailMutation.mutate(p.id)}
                        sendingEmail={welcomeEmailMutation.isPending && welcomeEmailMutation.variables === p.id}
                        onConvertToOrg={() => convertToOrgMutation.mutate(p.id)}
                        convertingToOrg={convertToOrgMutation.isPending && convertToOrgMutation.variables === p.id}
                        onForceLinkExistingOrg={() => forceLinkMutation.mutate(p.id)}
                        forceLinkingExistingOrg={forceLinkMutation.isPending && forceLinkMutation.variables === p.id}
                        onSendDemoEmail={() => demoEmailMutation.mutate(p.id)}
                        sendingDemoEmail={demoEmailMutation.isPending && demoEmailMutation.variables === p.id}
                        onGoToOrganizations={onGoToOrganizations}
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

      {/* Onboarding Tracker Table */}
      <OnboardingTrackerSection
        prospects={active}
        onEdit={openEdit}
        onDrop={(p) => setDroppingProspect(p)}
        onGoToOrganizations={onGoToOrganizations}
      />

      {/* Create / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingProspect ? "Edit Prospect" : "Add New Prospect"}</SheetTitle>
            <SheetDescription>
              {editingProspect ? "Update contact details and notes." : "This will place them in the Submission stage."}
            </SheetDescription>
          </SheetHeader>
          <Separator className="my-4" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMutation.mutate({ values: v, editId: editingProspect?.id, agreementSigned: !!editingProspect?.agreementSignedAt }))} className="space-y-4">
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Confirmation Email
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={resendConfirmationEmailMutation.isPending || (confirmEmailCooldownUntil !== null && Date.now() < confirmEmailCooldownUntil)}
                    onClick={() => resendConfirmationEmailMutation.mutate(editingProspect.id)}
                  >
                    {resendConfirmationEmailMutation.isPending ? "Sending…" : (confirmEmailCooldownUntil !== null && Date.now() < confirmEmailCooldownUntil) ? "Just sent…" : "Resend"}
                  </Button>
                </div>
                {editingProspect.confirmationEmailStatus ? (
                  <div className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 ${
                    editingProspect.confirmationEmailStatus === "sent"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}>
                    {editingProspect.confirmationEmailStatus === "sent" ? (
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium capitalize">
                        {editingProspect.confirmationEmailStatus === "sent" ? "Delivered" : "Failed"}
                      </span>
                      {editingProspect.confirmationEmailSentAt && (
                        <span className="text-gray-500 ml-1">
                          — {new Date(editingProspect.confirmationEmailSentAt).toLocaleString()}
                        </span>
                      )}
                      {editingProspect.confirmationEmailStatus !== "sent" && (
                        <p className="mt-0.5 text-red-600 break-words">
                          {editingProspect.confirmationEmailStatus.replace(/^failed:\s*/i, "")}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No confirmation email recorded.</p>
                )}
              </div>

              {(editingProspect as any).isBetaMember && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2">
                      <Mail className="w-3.5 h-3.5" /> Approval Email
                    </p>
                    {/* Status badge */}
                    {editingProspect.approvalEmailSent ? (
                      <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-medium">Sent</span>
                        {editingProspect.approvalEmailSentAt && (
                          <span className="text-green-600 text-xs ml-auto">
                            {new Date(editingProspect.approvalEmailSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="font-medium">Not sent</span>
                      </div>
                    )}
                    {/* Error */}
                    {editingProspect.approvalEmailSendError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                        Error: {editingProspect.approvalEmailSendError}
                      </p>
                    )}
                    {/* Token expiry */}
                    {editingProspect.onboardingTokenExpiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Link expires: {new Date(editingProspect.onboardingTokenExpiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {new Date(editingProspect.onboardingTokenExpiresAt) < new Date() && (
                          <span className="ml-1 text-amber-600 font-medium">(expired)</span>
                        )}
                      </p>
                    )}
                    {/* Last resent */}
                    {editingProspect.approvalEmailLastResentAt && (
                      <p className="text-xs text-muted-foreground">
                        Last resent: {new Date(editingProspect.approvalEmailLastResentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Beta Pricing — shown for any beta application prospect */}
              {((editingProspect as any).isBetaMember || (editingProspect as any).source === "beta_application" || (editingProspect as any).trialIntent === "beta_application") && (
                <>
                  <Separator className="my-4" />
                  <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Beta Pricing
                      </p>
                      {!editingPricingInSheet ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs border-teal-300 text-teal-700 hover:bg-teal-100"
                          onClick={() => setEditingPricingInSheet(true)}
                        >
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={() => setEditingPricingInSheet(false)}
                            disabled={savePricingInSheetMutation.isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-6 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                            onClick={() => savePricingInSheetMutation.mutate(editingProspect.id)}
                            disabled={savePricingInSheetMutation.isPending}
                          >
                            {savePricingInSheetMutation.isPending ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                    {!editingPricingInSheet ? (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <div>
                          <p className="text-teal-600 mb-0.5">Portfolio Tier</p>
                          <p className="font-medium text-teal-900">{(editingProspect as any).portfolioTier ?? <span className="text-gray-400 italic">Not set</span>}</p>
                        </div>
                        <div>
                          <p className="text-teal-600 mb-0.5">Cohort #</p>
                          <p className="font-medium text-teal-900">{(editingProspect as any).betaCohortNumber ?? <span className="text-gray-400 italic">—</span>}</p>
                        </div>
                        <div>
                          <p className="text-teal-600 mb-0.5">Discount</p>
                          <p className="font-medium text-teal-900">{(editingProspect as any).discountPercentage != null ? `${(editingProspect as any).discountPercentage}%` : <span className="text-gray-400 italic">—</span>}</p>
                        </div>
                        <div>
                          <p className="text-teal-600 mb-0.5">List Price</p>
                          <p className="font-medium text-teal-900">{(editingProspect as any).originalMonthlyPrice != null ? `$${(editingProspect as any).originalMonthlyPrice}/mo` : <span className="text-gray-400 italic">—</span>}</p>
                        </div>
                        <div>
                          <p className="text-teal-600 mb-0.5">Beta Price</p>
                          <p className="font-medium text-teal-900">{(editingProspect as any).discountedMonthlyPrice != null ? `$${(editingProspect as any).discountedMonthlyPrice}/mo` : <span className="text-gray-400 italic">—</span>}</p>
                        </div>
                        <div>
                          <p className="text-teal-600 mb-0.5">Setup Fee</p>
                          <p className="font-medium text-teal-900">{(editingProspect as any).setupFee != null ? `$${(editingProspect as any).setupFee}` : <span className="text-gray-400 italic">—</span>}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-teal-700 mb-1 block">Portfolio Tier</Label>
                          <Select
                            value={pricingDraftInSheet.portfolioTier}
                            onValueChange={v => setPricingDraftInSheet(d => ({ ...d, portfolioTier: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select tier…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Starter Portfolio">Starter Portfolio</SelectItem>
                              <SelectItem value="Growth Portfolio">Growth Portfolio</SelectItem>
                              <SelectItem value="Professional Portfolio">Professional Portfolio</SelectItem>
                              <SelectItem value="Enterprise Portfolio">Enterprise Portfolio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-teal-700 mb-1 block">Cohort #</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              placeholder="1"
                              value={pricingDraftInSheet.betaCohortNumber}
                              onChange={e => setPricingDraftInSheet(d => ({ ...d, betaCohortNumber: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-teal-700 mb-1 block">Discount %</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              placeholder="20"
                              value={pricingDraftInSheet.discountPercentage}
                              onChange={e => setPricingDraftInSheet(d => ({ ...d, discountPercentage: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-teal-700 mb-1 block">List Price ($/mo)</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              placeholder="199"
                              value={pricingDraftInSheet.originalMonthlyPrice}
                              onChange={e => setPricingDraftInSheet(d => ({ ...d, originalMonthlyPrice: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-teal-700 mb-1 block">Beta Price ($/mo)</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              placeholder="159"
                              value={pricingDraftInSheet.discountedMonthlyPrice}
                              onChange={e => setPricingDraftInSheet(d => ({ ...d, discountedMonthlyPrice: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-teal-700 mb-1 block">Setup Fee ($)</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            placeholder="0"
                            value={pricingDraftInSheet.setupFee}
                            onChange={e => setPricingDraftInSheet(d => ({ ...d, setupFee: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Agreement Audit — only shown when at least one audit field is present */}
              {(editingProspect.agreementViewedAt || editingProspect.agreementScrolledAt || editingProspect.agreementSignedAt || editingProspect.agreementVersion || editingProspect.agreementAcceptedIp || editingProspect.agreementEmailStatus) && (
                <>
                  <Separator className="my-4" />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Agreement Audit
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      {editingProspect.agreementSignerName && (
                        <div>
                          <p className="text-slate-500 mb-0.5">Signer Name</p>
                          <p className="font-medium text-slate-800">{editingProspect.agreementSignerName}</p>
                        </div>
                      )}
                      {editingProspect.agreementOrganizationName && (
                        <div>
                          <p className="text-slate-500 mb-0.5">Organization</p>
                          <p className="font-medium text-slate-800">{editingProspect.agreementOrganizationName}</p>
                        </div>
                      )}
                      {editingProspect.agreementVersion && (
                        <div>
                          <p className="text-slate-500 mb-0.5">Version</p>
                          <p className="font-medium text-slate-800">{editingProspect.agreementVersion}</p>
                        </div>
                      )}
                      {editingProspect.agreementViewedAt && (
                        <div>
                          <p className="text-slate-500 mb-0.5">Viewed At</p>
                          <p className="font-medium text-slate-800">{new Date(editingProspect.agreementViewedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {editingProspect.agreementScrolledAt && (
                        <div>
                          <p className="text-slate-500 mb-0.5">Scrolled to Bottom</p>
                          <p className="font-medium text-slate-800">{new Date(editingProspect.agreementScrolledAt).toLocaleString()}</p>
                        </div>
                      )}
                      {editingProspect.agreementSignedAt && (
                        <div>
                          <p className="text-slate-500 mb-0.5">Accepted At</p>
                          <p className="font-medium text-slate-800">{new Date(editingProspect.agreementSignedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {editingProspect.agreementAcceptedIp && (
                        <div>
                          <p className="text-slate-500 mb-0.5">IP Address</p>
                          <p className="font-medium text-slate-800 font-mono">{editingProspect.agreementAcceptedIp}</p>
                        </div>
                      )}
                      {editingProspect.agreementEmailStatus && (
                        <div>
                          <p className="text-slate-500 mb-0.5">Confirmation Email</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            editingProspect.agreementEmailStatus === "sent"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {editingProspect.agreementEmailStatus === "sent" ? "Sent" : "Failed"}
                          </span>
                        </div>
                      )}
                      {editingProspect.agreementEmailSentAt && (
                        <div>
                          <p className="text-slate-500 mb-0.5">Email Sent At</p>
                          <p className="font-medium text-slate-800">{new Date(editingProspect.agreementEmailSentAt).toLocaleString()}</p>
                        </div>
                      )}
                      {editingProspect.agreementAcceptedUserAgent && (
                        <div className="col-span-2">
                          <p className="text-slate-500 mb-0.5">User Agent</p>
                          <p className="font-medium text-slate-800 break-all" title={editingProspect.agreementAcceptedUserAgent}>
                            {editingProspect.agreementAcceptedUserAgent.length > 120
                              ? editingProspect.agreementAcceptedUserAgent.slice(0, 120) + "…"
                              : editingProspect.agreementAcceptedUserAgent}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

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

      {/* Prospect confirmation email template */}
      <ProspectConfirmationEmailPanel />

      {/* Drop dialog */}
      <DropDialog
        open={!!droppingProspect}
        onClose={() => setDroppingProspect(null)}
        onConfirm={reason => {
          if (droppingProspect) dropMutation.mutate({ id: droppingProspect.id, reason });
        }}
      />

      {/* Conversion success dialog */}
      <Dialog open={!!conversionSummary} onOpenChange={() => setConversionSummary(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-5 h-5" /> Organization Created!
            </DialogTitle>
            <DialogDescription>
              The prospect has been converted and their organization is ready.
            </DialogDescription>
          </DialogHeader>
          {conversionSummary && (
            <div className="space-y-3 py-1">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Org name</span>
                  <span className="font-semibold text-gray-900">{conversionSummary.orgName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Admin email</span>
                  <span className="font-medium text-gray-800">{conversionSummary.adminEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Trial ends</span>
                  <span className="font-medium text-emerald-700">{conversionSummary.trialEndFormatted}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Mail className="w-3 h-3" /> An invite email has been sent to the org admin.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConversionSummary(null)}>Close</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                setConversionSummary(null);
                onGoToOrganizations?.();
              }}
            >
              <ExternalLink className="w-4 h-4 mr-1" /> View Organizations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet opened from pipeline card badge click — focuses the resend section */}
      {detailProspect && (
        <SubmissionDetailSheet
          submission={detailProspect}
          focusResend={detailFocusResend}
          onClose={() => { setDetailProspect(null); setDetailFocusResend(false); }}
          onStatusChange={(id, status) => {
            detailStatusMutation.mutate({ id, status });
            setDetailProspect(prev => prev ? { ...prev, submissionStatus: status } : prev);
          }}
          onNotesChange={(id, notes) => {
            setDetailProspect(prev => prev ? { ...prev, notes } : prev);
            queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
          }}
        />
      )}
    </div>
  );
}

// ── Beta Pricing Card ────────────────────────────────────────────────────────

function BetaPricingCard() {
  const { toast } = useToast();

  type BetaPricing = {
    basePrice: number;
    tier1DiscountPct: number;
    tier1Cap: number;
    tier2DiscountPct: number;
    tier2Cap: number;
  };

  const { data: saved } = useQuery<BetaPricing>({
    queryKey: ["/api/super-admin/beta-pricing"],
  });

  // Server-driven counts use isBetaMember flag — survives stage changes (Task #208)
  const { data: betaStatus } = useQuery<BetaStatus>({
    queryKey: ["/api/public/beta-status"],
    staleTime: 30_000,
  });

  const [basePrice, setBasePrice] = useState(199);
  const [tier1DiscountPct, setTier1DiscountPct] = useState(50);
  const [tier1Cap, setTier1Cap] = useState(10);
  const [tier2DiscountPct, setTier2DiscountPct] = useState(25);
  const [tier2Cap, setTier2Cap] = useState(10);

  useEffect(() => {
    if (saved) {
      setBasePrice(Number(saved.basePrice ?? 199));
      setTier1DiscountPct(Number(saved.tier1DiscountPct ?? 50));
      setTier1Cap(Number(saved.tier1Cap ?? 10));
      setTier2DiscountPct(Number(saved.tier2DiscountPct ?? 25));
      setTier2Cap(Number(saved.tier2Cap ?? 10));
    }
  }, [saved]);

  // Local totalCap mirrors the editable inputs — used for the cap fields and remaining preview
  const totalCap = tier1Cap + tier2Cap;

  // Filled counts always from server (isBetaMember = true, betaRemovedAt IS NULL)
  const tier1Filled = betaStatus?.tier1Filled ?? 0;
  const tier2Filled = betaStatus?.tier2Filled ?? 0;
  // Remaining computed against local (possibly unsaved) cap so admin can preview impact
  const tier1Remaining = Math.max(0, tier1Cap - tier1Filled);
  const tier2Remaining = Math.max(0, tier2Cap - tier2Filled);

  // Open/closed and active-tier display use server state (saved caps + isBetaMember counts)
  const isBetaOpen = betaStatus?.open ?? true;
  const inTier1 = (betaStatus?.tier1Remaining ?? tier1Cap) > 0;
  const inTier2 = !inTier1 && (betaStatus?.tier2Remaining ?? tier2Cap) > 0;
  const currentDiscountPct = inTier1 ? tier1DiscountPct : inTier2 ? tier2DiscountPct : 0;
  const effectivePrice = isBetaOpen
    ? Math.round(basePrice * (1 - currentDiscountPct / 100) * 100) / 100
    : basePrice;

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/super-admin/beta-pricing", {
        basePrice, tier1DiscountPct, tier1Cap, tier2DiscountPct, tier2Cap,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/beta-pricing"] });
      toast({ title: "Beta pricing saved" });
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <DollarSign className="w-4 h-4 text-emerald-600" />
        <h3 className="font-semibold text-sm text-gray-800">Beta Pricing</h3>
        <span className="text-xs text-gray-400 ml-1">— Two-tier early-adopter discounts for onboarding prospects</span>
        {isBetaOpen ? (
          <Badge className="ml-auto bg-emerald-100 text-emerald-800 text-xs">Beta Open</Badge>
        ) : (
          <Badge className="ml-auto bg-gray-100 text-gray-600 text-xs">Beta Closed</Badge>
        )}
      </div>

      {/* Base price */}
      <div className="max-w-[180px]">
        <label className="text-xs text-gray-500 block mb-1">Base monthly price ($)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={basePrice}
          onChange={e => setBasePrice(Math.max(0, Number(e.target.value)))}
          className="w-full border rounded px-2 py-1.5 text-sm"
        />
      </div>

      {/* Two-tier grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Tier 1 */}
        <div className="border rounded-lg p-3 space-y-3 bg-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Tier 1 — Founding Members</span>
            <Badge className={`text-xs ${tier1Remaining > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
              {tier1Filled}/{tier1Cap} filled
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Discount (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={tier1DiscountPct}
                onChange={e => setTier1DiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Member cap</label>
              <input
                type="number"
                min={1}
                step={1}
                value={tier1Cap}
                onChange={e => setTier1Cap(Math.max(1, Number(e.target.value)))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Price: <strong className="text-slate-700">${(basePrice * (1 - tier1DiscountPct / 100)).toFixed(2)}/mo</strong>
            {" "}({tier1DiscountPct}% off)
            {tier1Remaining > 0 ? ` · ${tier1Remaining} spot${tier1Remaining !== 1 ? "s" : ""} left` : " · Full"}
          </p>
        </div>

        {/* Tier 2 */}
        <div className="border rounded-lg p-3 space-y-3 bg-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Tier 2 — Early Access</span>
            <Badge className={`text-xs ${tier2Remaining > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"}`}>
              {tier2Filled}/{tier2Cap} filled
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Discount (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={tier2DiscountPct}
                onChange={e => setTier2DiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Member cap</label>
              <input
                type="number"
                min={0}
                step={1}
                value={tier2Cap}
                onChange={e => setTier2Cap(Math.max(0, Number(e.target.value)))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Price: <strong className="text-slate-700">${(basePrice * (1 - tier2DiscountPct / 100)).toFixed(2)}/mo</strong>
            {" "}({tier2DiscountPct}% off)
            {tier2Remaining > 0 ? ` · ${tier2Remaining} spot${tier2Remaining !== 1 ? "s" : ""} left` : " · Full"}
          </p>
        </div>
      </div>

      {/* Live status preview */}
      <div className={`rounded-lg p-3 text-sm ${isBetaOpen ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-200"}`}>
        <p className="font-semibold text-gray-800">
          {inTier1
            ? `Current: $${effectivePrice.toFixed(2)}/mo (${tier1DiscountPct}% off — Tier 1 Founding Member)`
            : inTier2
            ? `Current: $${effectivePrice.toFixed(2)}/mo (${tier2DiscountPct}% off — Tier 2 Early Access)`
            : `Standard price: $${basePrice.toFixed(2)}/mo — beta program full`}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {betaStatus?.activeBetaCount ?? 0} of {betaStatus?.totalCap ?? totalCap} total beta spot{(betaStatus?.totalCap ?? totalCap) !== 1 ? "s" : ""} filled
          {isBetaOpen
            ? ` · ${betaStatus?.totalRemaining ?? 0} spot${(betaStatus?.totalRemaining ?? 0) !== 1 ? "s" : ""} remaining`
            : " · Beta is now closed"}
        </p>
        {!isBetaOpen && (
          <Badge className="mt-2 bg-orange-100 text-orange-800 text-xs">Beta full — standard pricing applies to new signups</Badge>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Saving…</>
            : "Save Pricing"}
        </Button>
      </div>
    </div>
  );
}

// ── Beta Program Tab ─────────────────────────────────────────────────────────

type BetaMember = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  betaDiscountTier: string | null;
  createdAt: string | null;
  stage: string | null;
  submissionStatus: string | null;
  source: string | null;
};

type BetaStatus = {
  open: boolean;
  activeBetaCount: number;
  tier1Filled: number;
  tier1Cap: number;
  tier1Remaining: number;
  tier2Filled: number;
  tier2Cap: number;
  tier2Remaining: number;
  totalCap: number;
  totalRemaining: number;
};

type AddBetaMemberForm = {
  name: string;
  email: string;
  company: string;
  betaDiscountTier: string;
};

function BetaProgramTab() {
  const { toast } = useToast();
  const [removeTarget, setRemoveTarget] = useState<BetaMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BetaMember | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddBetaMemberForm>({ name: "", email: "", company: "", betaDiscountTier: "" });

  const { data: betaStatus, isLoading: statusLoading } = useQuery<BetaStatus>({
    queryKey: ["/api/public/beta-status"],
    staleTime: 30_000,
  });

  const { data: betaMembers = [], isLoading: membersLoading, refetch } = useQuery<BetaMember[]>({
    queryKey: ["/api/super-admin/beta-members"],
  });

  // Soft-remove: frees slot, keeps record (DELETE per spec)
  const removeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/super-admin/beta-members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/beta-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/beta-status"] });
      setRemoveTarget(null);
      toast({ title: "Beta slot freed", description: "The member has been moved back to inquiry stage." });
    },
    onError: () => toast({ title: "Error", description: "Failed to free beta slot.", variant: "destructive" }),
  });

  // Hard delete: permanently removes record
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/super-admin/beta-members/${id}/hard`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/beta-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/beta-status"] });
      setDeleteTarget(null);
      toast({ title: "Beta member permanently deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete beta member.", variant: "destructive" }),
  });

  // Manually add a beta member
  const addMutation = useMutation({
    mutationFn: (data: AddBetaMemberForm) => apiRequest("POST", "/api/super-admin/beta-members", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/beta-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/beta-status"] });
      setAddDialogOpen(false);
      setAddForm({ name: "", email: "", company: "", betaDiscountTier: "" });
      toast({ title: "Beta member added", description: "They have been manually granted a beta slot." });
    },
    onError: (err: any) => toast({ title: "Error", description: err?.message ?? "Failed to add beta member.", variant: "destructive" }),
  });

  const tierLabel = (tier: string | null) => {
    if (tier === "founding_10") return { text: "Founding 10 — 50% off", cls: "bg-teal-100 text-teal-800 border-teal-200" };
    if (tier === "early_access_10") return { text: "Early Access 10 — 25% off", cls: "bg-indigo-100 text-indigo-800 border-indigo-200" };
    return { text: "Unassigned", cls: "bg-gray-100 text-gray-600 border-gray-200" };
  };

  return (
    <div className="space-y-6">
      {/* Slot Summary with Open/Closed badge */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Beta Program Status</h3>
          {!statusLoading && betaStatus && (
            betaStatus.open
              ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">● Open</span>
              : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">● Closed — Full</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">
              {statusLoading ? "…" : `${betaStatus?.activeBetaCount ?? 0} / ${betaStatus?.totalCap ?? 20}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">Total Slots Used</p>
            <p className="text-xs text-muted-foreground">{betaStatus?.totalRemaining ?? "—"} remaining</p>
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-teal-800">
              {statusLoading ? "…" : `${betaStatus?.tier1Filled ?? 0} / ${betaStatus?.tier1Cap ?? 10}`}
            </p>
            <p className="text-xs text-teal-700 mt-1 font-medium uppercase tracking-wide">Founding 10</p>
            <p className="text-xs text-teal-600">50% off · {betaStatus?.tier1Remaining ?? "—"} left</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-indigo-800">
              {statusLoading ? "…" : `${betaStatus?.tier2Filled ?? 0} / ${betaStatus?.tier2Cap ?? 10}`}
            </p>
            <p className="text-xs text-indigo-700 mt-1 font-medium uppercase tracking-wide">Early Access 10</p>
            <p className="text-xs text-indigo-600">25% off · {betaStatus?.tier2Remaining ?? "—"} left</p>
          </div>
        </div>
      </div>

      {/* Beta Pricing Configuration */}
      <BetaPricingCard />

      {/* Beta Members Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Active Beta Members</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Approved beta applicants holding a discounted slot</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Member
            </Button>
          </div>
        </div>

        {membersLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : betaMembers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No approved beta members yet. Approve a beta applicant in the Onboarding pipeline to assign a slot.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {betaMembers.map((member) => {
                  const tl = tierLabel(member.betaDiscountTier);
                  const stageBadge = (() => {
                    if (member.stage === "welcome") return { text: "Active — Approved", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" };
                    if (member.stage === "dropped") return { text: "Dropped", cls: "bg-red-100 text-red-700 border-red-200" };
                    return { text: member.stage ?? "Unknown", cls: "bg-gray-100 text-gray-600 border-gray-200" };
                  })();
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium text-slate-900">{member.name ?? "—"}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{member.email ?? "—"}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{member.company ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${tl.cls}`}>
                            {tl.text}
                          </span>
                          {member.source === "beta_application" && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 w-fit">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                              From pipeline
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${stageBadge.cls}`}>
                          {stageBadge.text}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs"
                            onClick={() => setRemoveTarget(member)}
                          >
                            Free Slot
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                            onClick={() => setDeleteTarget(member)}
                          >
                            Delete
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
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setAddForm({ name: "", email: "", company: "", betaDiscountTier: "" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Beta Member Manually</DialogTitle>
            <DialogDescription>
              Grant a beta slot directly without requiring a pipeline application. The member will be saved with source "manual" and will not show a "From pipeline" badge.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="add-name"
                placeholder="Jane Smith"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="add-email"
                type="email"
                placeholder="jane@example.com"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-company">Company <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="add-company"
                placeholder="Acme Property Mgmt"
                value={addForm.company}
                onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-tier">Beta Tier <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={addForm.betaDiscountTier || "__none__"} onValueChange={(v) => setAddForm((f) => ({ ...f, betaDiscountTier: v === "__none__" ? "" : v }))}>
                <SelectTrigger id="add-tier">
                  <SelectValue placeholder="Select a tier…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (unassigned)</SelectItem>
                  <SelectItem value="founding_10">Founding 10 — 50% off</SelectItem>
                  <SelectItem value="early_access_10">Early Access 10 — 25% off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={addMutation.isPending}>Cancel</Button>
            <Button
              onClick={() => {
                if (!addForm.name.trim() || !addForm.email.trim()) {
                  toast({ title: "Name and email are required", variant: "destructive" });
                  return;
                }
                addMutation.mutate(addForm);
              }}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />Adding…</> : "Add Beta Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Free Slot Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Free Beta Slot</DialogTitle>
            <DialogDescription>
              This will move <strong>{removeTarget?.name}</strong> back to inquiry stage and free their slot for a new applicant. Their record is preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />Freeing…</> : "Free Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete Beta Member</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{deleteTarget?.name}</strong> and frees their slot. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />Deleting…</> : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Demo Tenant Tab ──────────────────────────────────────────────────────────

const DEMO_SCENARIOS = [
  { name: "Beachside Breeze",       type: "Single Family",  location: "Naples, FL",       highlight: "Hurricane prep tasks + seasonal checklist" },
  { name: "Sunset Key Villa",        type: "Villa",          location: "Key West, FL",      highlight: "Pool & landscaping recurring tasks" },
  { name: "Coconut Harbor Retreat",  type: "Single Family",  location: "Coconut Grove, FL", highlight: "Water intrusion inspection scenario" },
  { name: "Pelican Point Cottage",   type: "Cottage",        location: "Sanibel, FL",       highlight: "Post-storm damage assessment flow" },
  { name: "Royal Palm Estate",       type: "Estate",         location: "Palm Beach, FL",    highlight: "Vendor management + priority tasks" },
  { name: "Marina Bay Condo",        type: "Condo",          location: "Miami, FL",         highlight: "Multi-unit condo with HOA integration" },
  { name: "Gulfstream Manor",        type: "Single Family",  location: "Boca Raton, FL",    highlight: "Luxury estate full inspection schedule" },
  { name: "The Sandpiper",           type: "Vacation Home",  location: "Siesta Key, FL",    highlight: "Short-term rental turnover tasks" },
  { name: "Lighthouse Point",        type: "Single Family",  location: "Lighthouse Point, FL", highlight: "Roof & HVAC warranty tracking" },
  { name: "Oceanfront Oasis",        type: "Estate",         location: "Delray Beach, FL",  highlight: "Full invoice + client portal demo" },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="ml-1.5 text-gray-400 hover:text-teal-600 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-teal-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ============================================================================
// Platform Admins Tab
// ============================================================================

function PlatformAdminsTab() {
  const { toast } = useToast();

  type PlatformAdmin = { id: string; email: string; createdAt: string };

  const { data: admins = [], isLoading, refetch } = useQuery<PlatformAdmin[]>({
    queryKey: ["/api/super-admin/admins"],
  });

  // ── Add admin form state ──
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // ── Change password dialog state ──
  const [changePwTarget, setChangePwTarget] = useState<PlatformAdmin | null>(null);
  const [changePw, setChangePw] = useState("");
  const [showChangePw, setShowChangePw] = useState(false);

  // ── Delete confirmation state ──
  const [deleteTarget, setDeleteTarget] = useState<PlatformAdmin | null>(null);

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/super-admin/admins", { email: newEmail.trim(), password: newPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/admins"] });
      toast({ title: "Admin created", description: `${newEmail.trim()} can now log in.` });
      setNewEmail(""); setNewPassword("");
    },
    onError: (e: any) => toast({ title: "Failed to create admin", description: e.message, variant: "destructive" }),
  });

  const changePwMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/super-admin/admins/${changePwTarget?.id}/password`, { password: changePw }),
    onSuccess: () => {
      toast({ title: "Password updated" });
      setChangePwTarget(null); setChangePw("");
    },
    onError: (e: any) => toast({ title: "Failed to update password", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/super-admin/admins/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/admins"] });
      toast({ title: "Admin removed" });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast({ title: "Failed to remove admin", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-violet-50 border border-violet-100">
          <Shield className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Super Admin Accounts</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage who can log in to the Super Admin console. Each account signs in with their own email and password.
          </p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Admin list */}
      <div className="border rounded-xl bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b bg-gray-50">
          <Users className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-sm text-gray-800">Current Admins</h3>
          <Badge variant="outline" className="ml-auto text-xs">{admins.length} account{admins.length !== 1 ? "s" : ""}</Badge>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />)}
          </div>
        ) : admins.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">No admins found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map(admin => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                        <Shield className="w-3.5 h-3.5 text-violet-600" />
                      </div>
                      <span className="font-medium text-sm text-gray-800">{admin.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {new Date(admin.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => { setChangePwTarget(admin); setChangePw(""); setShowChangePw(false); }}
                      >
                        <Key className="w-3 h-3 mr-1" />
                        Change Password
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(admin)}
                        disabled={admins.length <= 1}
                        title={admins.length <= 1 ? "Cannot delete the only admin account" : "Remove this admin"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add new admin */}
      <div className="border rounded-xl bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b bg-gray-50">
          <UserPlus className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-sm text-gray-800">Add New Admin</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Email Address <span className="text-red-400">*</span></label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Password <span className="text-gray-400 font-normal">(min 8 chars)</span> <span className="text-red-400">*</span></label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="h-9 pr-9"
                  onKeyDown={e => { if (e.key === "Enter" && newEmail && newPassword.length >= 8) createMutation.mutate(); }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowNewPassword(v => !v)}
                >
                  {showNewPassword ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-50" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={!newEmail.trim() || newPassword.length < 8 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending
                ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Creating…</>
                : <><UserPlus className="w-3.5 h-3.5 mr-1.5" />Add Admin</>
              }
            </Button>
            <p className="text-xs text-gray-400">The new admin can log in immediately at <span className="font-mono">/super-admin/login</span>.</p>
          </div>
        </div>
      </div>

      {/* Change password dialog */}
      <Dialog open={!!changePwTarget} onOpenChange={open => { if (!open) { setChangePwTarget(null); setChangePw(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{changePwTarget?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-xs font-medium text-gray-600 block">New Password <span className="text-gray-400">(min 8 chars)</span></label>
            <div className="relative">
              <Input
                type={showChangePw ? "text" : "password"}
                placeholder="••••••••"
                value={changePw}
                onChange={e => setChangePw(e.target.value)}
                className="pr-9"
                onKeyDown={e => { if (e.key === "Enter" && changePw.length >= 8) changePwMutation.mutate(); }}
                autoFocus
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowChangePw(v => !v)}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setChangePwTarget(null); setChangePw(""); }}>Cancel</Button>
            <Button
              disabled={changePw.length < 8 || changePwMutation.isPending}
              onClick={() => changePwMutation.mutate()}
            >
              {changePwMutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700">Remove Admin Account</DialogTitle>
            <DialogDescription>
              This will permanently remove <strong>{deleteTarget?.email}</strong> from Super Admin access. They will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Removing…</> : "Remove Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DemoTenantTab() {
  const { toast } = useToast();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  type DemoInfo = {
    exists: boolean;
    orgId?: string;
    orgName?: string;
    domain?: string;
    adminEmail?: string;
    adminPassword?: string;
    portalEmail?: string;
    portalPassword?: string;
    staffLoginUrl?: string;
    portalLoginUrl?: string;
    userCount?: number;
    propertyCount?: number;
    contactCount?: number;
    taskCount?: number;
    invoiceCount?: number;
    eventCount?: number;
    inspectionCount?: number;
    notificationCount?: number;
    demoSiteUrl?: string;
  };

  const { data: info, isLoading, refetch } = useQuery<DemoInfo>({
    queryKey: ["/api/super-admin/demo/info"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/super-admin/demo/seed", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/demo/info"] });
      setSeedConfirmOpen(false);
      toast({ title: "Demo tenant seeded", description: "Demo data has been created successfully." });
    },
    onError: (e: any) => toast({ title: "Seed failed", description: e.message, variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/super-admin/demo/reset", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/demo/info"] });
      setResetConfirmOpen(false);
      toast({ title: "Demo tenant reset", description: "All demo data has been wiped and reseeded." });
    },
    onError: (e: any) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  const inviteMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/super-admin/demo/send-invite", {
      recipientEmail: inviteEmail.trim(),
      recipientName: inviteName.trim() || undefined,
    }),
    onSuccess: () => {
      toast({ title: "Demo invite sent!", description: `Credentials emailed to ${inviteEmail.trim()}` });
      setInviteEmail("");
      setInviteName("");
    },
    onError: (e: any) => toast({ title: "Failed to send invite", description: e.message, variant: "destructive" }),
  });

  const isPending = seedMutation.isPending || resetMutation.isPending;

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-teal-50 border border-teal-100">
            <MonitorPlay className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Demo Environment</h2>
              <Badge className="bg-teal-100 text-teal-800 text-xs font-medium">Sales Demo</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Hubify Demo Portfolio — a dedicated, fully-resettable environment for sales walkthroughs and screencasts.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Demo credentials — always visible ── */}
      <div className="border rounded-xl bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b bg-gray-50">
          <KeyRound className="w-4 h-4 text-teal-600" />
          <h3 className="font-semibold text-sm text-gray-800">Demo Login Credentials</h3>
          <span className="text-xs text-gray-400 ml-1">— share these with anyone you're walking through the demo</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
          {/* Staff / Admin */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-3">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Staff / Admin</span>
              <a href="https://demo.hubifyhomesonline.com/staff/login" target="_blank" rel="noopener noreferrer" className="ml-auto text-teal-500 hover:text-teal-700">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {[
              { label: "URL",      value: "https://demo.hubifyhomesonline.com/staff/login",  href: "https://demo.hubifyhomesonline.com/staff/login" },
              { label: "Email",    value: "demo@hubifyhomesonline.com",                      href: null },
              { label: "Password", value: "Demo2026!",                                       href: null },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-400 text-xs w-16 shrink-0">{row.label}</span>
                <div className="flex items-center gap-1 min-w-0">
                  {row.href
                    ? <a href={row.href} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-teal-600 hover:underline truncate">{row.value}</a>
                    : <span className="font-mono text-xs text-gray-800 truncate">{row.value}</span>
                  }
                  <CopyButton value={row.value} />
                </div>
              </div>
            ))}
          </div>
          {/* Portal / Client */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-3">
              <Home className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Client Portal</span>
              <a href="https://demo.hubifyhomesonline.com/portal/login" target="_blank" rel="noopener noreferrer" className="ml-auto text-teal-500 hover:text-teal-700">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {[
              { label: "URL",      value: "https://demo.hubifyhomesonline.com/portal/login",  href: "https://demo.hubifyhomesonline.com/portal/login" },
              { label: "Email",    value: "client@demo.hubifyhomesonline.com",                href: null },
              { label: "Password", value: "DemoClient2026!",                                  href: null },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-400 text-xs w-16 shrink-0">{row.label}</span>
                <div className="flex items-center gap-1 min-w-0">
                  {row.href
                    ? <a href={row.href} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-teal-600 hover:underline truncate">{row.value}</a>
                    : <span className="font-mono text-xs text-gray-800 truncate">{row.value}</span>
                  }
                  <CopyButton value={row.value} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      ) : !info?.exists ? (

        /* ── Not seeded yet ── */
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <MonitorPlay className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-1">Demo tenant not yet created</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Seed the Hubify Demo Portfolio with 10 Florida properties, realistic tasks, invoices, inspections, and sample data ready for walkthroughs.
          </p>
          <Button onClick={() => setSeedConfirmOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Demo Tenant
          </Button>
        </div>

      ) : (
        <div className="space-y-6">

          {/* ── Stat grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Properties",   value: info.propertyCount   ?? 0, icon: <Building2 className="w-4 h-4" />,    color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-100" },
              { label: "Staff Users",  value: info.userCount       ?? 0, icon: <Users className="w-4 h-4" />,        color: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-100" },
              { label: "Contacts",     value: info.contactCount    ?? 0, icon: <Phone className="w-4 h-4" />,        color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "Tasks",        value: info.taskCount       ?? 0, icon: <ClipboardList className="w-4 h-4" />,color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-100" },
              { label: "Invoices",     value: info.invoiceCount    ?? 0, icon: <DollarSign className="w-4 h-4" />,   color: "text-green-700",  bg: "bg-green-50",   border: "border-green-100" },
              { label: "Events",       value: info.eventCount      ?? 0, icon: <Calendar className="w-4 h-4" />,     color: "text-sky-700",    bg: "bg-sky-50",     border: "border-sky-100" },
              { label: "Inspections",  value: info.inspectionCount ?? 0, icon: <FileCheck className="w-4 h-4" />,    color: "text-rose-700",   bg: "bg-rose-50",    border: "border-rose-100" },
              { label: "Notifications",value: info.notificationCount ?? 0, icon: <Bell className="w-4 h-4" />,      color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-100" },
            ].map(stat => (
              <div key={stat.label} className={`border ${stat.border} rounded-xl p-3 bg-white flex items-center gap-3`}>
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Two-column: org details + credentials ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Org details */}
            <div className="border rounded-xl p-5 bg-white space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <h3 className="font-semibold text-sm text-gray-800">Organization</h3>
                <Badge className="ml-auto bg-teal-100 text-teal-800 text-xs">Active</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-800">{info.orgName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Domain</span>
                  <span className="font-medium text-gray-700">{info.domain}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Org ID</span>
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-gray-500">{info.orgId?.slice(0, 20)}…</span>
                    <CopyButton value={info.orgId ?? ""} />
                  </div>
                </div>
              </div>

              {/* Quick launch links */}
              <div className="pt-1 flex flex-wrap gap-2">
                <a
                  href={`${info.demoSiteUrl}/staff/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-md px-3 py-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Demo App
                </a>
                <a
                  href={`${info.demoSiteUrl}/staff/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md px-3 py-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Staff Login
                </a>
                <a
                  href={`${info.demoSiteUrl}/portal/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md px-3 py-1.5 transition-colors"
                >
                  <Home className="w-3.5 h-3.5" />
                  Portal Login
                </a>
              </div>
            </div>

            {/* Credentials */}
            <div className="border rounded-xl p-5 bg-white space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-sm text-gray-800">Login Credentials</h3>
              </div>

              {/* Staff admin creds */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Staff Admin</p>
                  <a href="/staff/login" target="_blank" rel="noopener noreferrer" className="ml-auto text-teal-600 hover:text-teal-800">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Email</span>
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-gray-800">{info.adminEmail}</span>
                    <CopyButton value={info.adminEmail ?? ""} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Password</span>
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-gray-800">{info.adminPassword}</span>
                    <CopyButton value={info.adminPassword ?? ""} />
                  </div>
                </div>
              </div>

              {/* Portal client creds */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Home className="w-3.5 h-3.5 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Portal Client</p>
                  <a href="/portal/login" target="_blank" rel="noopener noreferrer" className="ml-auto text-teal-600 hover:text-teal-800">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Email</span>
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-gray-800">{info.portalEmail}</span>
                    <CopyButton value={info.portalEmail ?? ""} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Password</span>
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-gray-800">{info.portalPassword}</span>
                    <CopyButton value={info.portalPassword ?? ""} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 10 Property scenarios ── */}
          <div className="border rounded-xl bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b bg-gray-50">
              <Layers className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-sm text-gray-800">Demo Property Scenarios</h3>
              <Badge variant="outline" className="ml-auto text-xs">{DEMO_SCENARIOS.length} properties</Badge>
            </div>
            <div className="divide-y">
              {DEMO_SCENARIOS.map((s, i) => (
                <div key={s.name} className="flex items-start gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <span className="text-xs font-mono text-gray-400 pt-0.5 w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-800">{s.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{s.location}
                      </span>
                      <span className="text-xs text-teal-600">{s.highlight}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Send Demo Invite ── */}
          <div className="border rounded-xl bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b bg-gray-50">
              <Mail className="w-4 h-4 text-sky-600" />
              <h3 className="font-semibold text-sm text-gray-800">Send Demo Invite</h3>
              <span className="text-xs text-gray-400 ml-1">— email credentials directly to a prospect</span>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Recipient Name <span className="text-gray-400 font-normal">(optional)</span></label>
                  <Input
                    placeholder="Jane Smith"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Recipient Email <span className="text-red-400">*</span></label>
                  <Input
                    type="email"
                    placeholder="jane@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={e => { if (e.key === "Enter" && inviteEmail.trim()) inviteMutation.mutate(); }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate()}
                >
                  {inviteMutation.isPending
                    ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
                    : <><Send className="w-3.5 h-3.5 mr-1.5" />Send Invite</>
                  }
                </Button>
                <p className="text-xs text-gray-400">Sends staff + portal credentials with login links in a branded email.</p>
              </div>
            </div>
          </div>

          {/* ── Actions / controls ── */}
          <div className="border rounded-xl bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b bg-gray-50">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-gray-800">Demo Controls</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-3">
                <a
                  href={`${info.demoSiteUrl}/staff/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Demo Site
                </a>
                <Button variant="outline" size="sm" onClick={() => setSeedConfirmOpen(true)} disabled={isPending}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Re-seed Demo Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setResetConfirmOpen(true)}
                  disabled={isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Full Reset
                </Button>
              </div>
              <div className="text-xs text-gray-400 space-y-1 bg-gray-50 rounded-lg p-3">
                <p><strong className="text-gray-600">Re-seed</strong> — adds any missing demo records without touching existing data. Safe to run anytime.</p>
                <p><strong className="text-gray-600">Full Reset</strong> — wipes all demo properties, tasks, contacts, invoices, and events, then rebuilds from scratch. The org record and admin login are preserved. Production orgs are never affected.</p>
              </div>

              {/* CLI reference */}
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">CLI Commands</p>
                </div>
                <div className="space-y-1">
                  {[
                    { label: "Seed",  cmd: "npx tsx scripts/seed-demo-tenant.ts" },
                    { label: "Reset", cmd: "npx tsx scripts/seed-demo-tenant.ts --reset" },
                  ].map(({ label, cmd }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <code className="text-xs text-gray-700 font-mono">{cmd}</code>
                      <CopyButton value={cmd} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Seed confirmation ── */}
      <Dialog open={seedConfirmOpen} onOpenChange={setSeedConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-seed Demo Data</DialogTitle>
            <DialogDescription>
              This will add any missing demo data (properties, tasks, contacts, invoices) to the demo tenant without deleting existing records. Safe to run anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeedConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Seeding…</> : "Confirm Seed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset confirmation ── */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">Full Reset — Demo Data</DialogTitle>
            <DialogDescription>
              This will <strong>permanently delete all existing demo tenant data</strong> — properties, tasks, contacts, invoices, calendar events, and team members — then rebuild everything from scratch.
              <br /><br />
              The demo organization record and the admin login (<code>demo@hubifyhomesonline.com</code>) are preserved. Production client organizations are never touched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
              {resetMutation.isPending
                ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Resetting…</>
                : "Reset Demo Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function DroppedProspectsTab() {
  const { toast } = useToast();
  const { data: allProspects = [], isLoading } = useQuery<Prospect[]>({
    queryKey: ["/api/super-admin/onboarding-prospects"],
  });

  const dropped = allProspects.filter(p => p.stage === "dropped");

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/super-admin/onboarding-prospects/${id}`, { stage: "inquiry", droppedReason: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Prospect restored to Submission" });
    },
    onError: () => toast({ title: "Error", description: "Failed to restore prospect", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/super-admin/onboarding-prospects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/onboarding-prospects"] });
      toast({ title: "Prospect deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete prospect", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Dropped Prospects
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {dropped.length} prospect{dropped.length !== 1 ? "s" : ""} marked as dropped
          </p>
        </CardHeader>
        <CardContent>
          {dropped.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No dropped prospects.</div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Dropped</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dropped.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.company ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {p.droppedReason ?? <span className="italic text-muted-foreground/60">No reason given</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restoreMutation.mutate(p.id)}
                            disabled={restoreMutation.isPending}
                          >
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate(p.id)}
                            disabled={deleteMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DemoRequestsTab() {
  type DemoRequestsSummary = {
    total: number;
    sent: number;
    stageCounts: Record<string, number>;
    recent: Array<{
      id: string;
      name: string;
      company: string | null;
      email: string;
      stage: string;
      demoAccessSent: boolean | null;
      demoEmailSentAt: string | null;
      demoEmailError: string | null;
      createdAt: string | null;
    }>;
  };

  const { data: requestsSummary, isLoading } = useQuery<DemoRequestsSummary>({
    queryKey: ["/api/super-admin/demo/requests-summary"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!requestsSummary) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">No demo request data available.</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-xl bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-gray-50">
          <ClipboardList className="w-4 h-4 text-sky-600" />
          <h3 className="font-semibold text-sm text-gray-800">Demo Requests</h3>
          <Badge className="ml-auto bg-sky-100 text-sky-800 text-xs">{requestsSummary.total} total</Badge>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "demo_requested",   label: "Requested",  color: "border-sky-300 bg-sky-50 text-sky-800" },
              { key: "demo_sent",        label: "Sent",       color: "border-blue-300 bg-blue-50 text-blue-800" },
              { key: "demo_completed",   label: "Completed",  color: "border-violet-300 bg-violet-50 text-violet-800" },
              { key: "follow_up_needed", label: "Follow-Up",  color: "border-amber-300 bg-amber-50 text-amber-800" },
              { key: "converted",        label: "Converted",  color: "border-emerald-300 bg-emerald-50 text-emerald-800" },
              { key: "not_a_fit",        label: "Not a Fit",  color: "border-red-300 bg-red-50 text-red-700" },
            ].map((s, i, arr) => (
              <div key={s.key} className="flex items-center gap-1">
                <div className={`rounded-full px-3 py-1 text-xs font-medium border ${s.color}`}>
                  {s.label}: <span className="font-bold">{requestsSummary.stageCounts[s.key] ?? 0}</span>
                </div>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-gray-400" />}
              </div>
            ))}
          </div>
          {requestsSummary.recent.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Company</TableHead>
                    <TableHead className="text-xs">Stage</TableHead>
                    <TableHead className="text-xs">Email Status</TableHead>
                    <TableHead className="text-xs">Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsSummary.recent.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{r.company ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {r.stage.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.demoAccessSent
                          ? <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sent</span>
                          : r.demoEmailError
                            ? <span className="text-red-600 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>
                            : <span className="text-gray-400 text-xs">Pending</span>
                        }
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No demo requests yet. Share the landing page to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Template panel includes `dropped` so admins can configure a "sorry to see
// you go" email. Kanban PIPELINE_STAGES intentionally excludes dropped.
const TEMPLATE_STAGES: { key: OnboardingStage; label: string }[] = [
  { key: "contact",         label: "Contact" },
  { key: "inquiry",         label: "Submission" },
  { key: "agreement",       label: "Agreement" },
  { key: "payment_setup",   label: "Payment Setup" },
  { key: "initial_payment", label: "Initial Payment" },
  { key: "welcome",         label: "Welcome" },
  { key: "dropped",         label: "Dropped" },
];

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
          {TEMPLATE_STAGES.map(s => {
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

// ── Prospect Confirmation Email Panel ───────────────────────────────────────
const CONFIRMATION_PREVIEW_DUMMY = {
  firstName: "Jane",
  lastName: "Smith",
  name: "Jane Smith",
  company: "Acme Property Group",
  email: "jane@example.com",
  suggestedTier: "Growth Portfolio",
  estimatedHomes: "18",
};

function applyConfirmationMergeTags(text: string): string {
  return text
    .replace(/\{\{firstName\}\}/gi, CONFIRMATION_PREVIEW_DUMMY.firstName)
    .replace(/\{\{lastName\}\}/gi, CONFIRMATION_PREVIEW_DUMMY.lastName)
    .replace(/\{\{name\}\}/gi, CONFIRMATION_PREVIEW_DUMMY.name)
    .replace(/\{\{company\}\}/gi, CONFIRMATION_PREVIEW_DUMMY.company)
    .replace(/\{\{email\}\}/gi, CONFIRMATION_PREVIEW_DUMMY.email)
    .replace(/\{\{suggestedTier\}\}/gi, CONFIRMATION_PREVIEW_DUMMY.suggestedTier)
    .replace(/\{\{estimatedHomes\}\}/gi, CONFIRMATION_PREVIEW_DUMMY.estimatedHomes);
}

interface ProspectConfirmationTemplate {
  id: string;
  subject: string;
  body: string;
  updatedAt: string;
}

function ProspectConfirmationEmailPanel() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [draft, setDraft] = useState({ subject: "", body: "" });

  const { data: template, isLoading } = useQuery<ProspectConfirmationTemplate | null>({
    queryKey: ["/api/super-admin/prospect-confirmation-template"],
  });

  useEffect(() => {
    if (template) {
      setDraft({ subject: template.subject, body: template.body });
    } else {
      setDraft({ subject: "", body: "" });
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: (data: { subject: string; body: string }) =>
      apiRequest("PUT", "/api/super-admin/prospect-confirmation-template", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/prospect-confirmation-template"] });
      toast({ title: "Confirmation email template saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save template", variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/super-admin/prospect-confirmation-template"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/prospect-confirmation-template"] });
      toast({ title: "Template reset", description: "The hardcoded default will be used for new submissions." });
      setDraft({ subject: "", body: "" });
    },
    onError: () => toast({ title: "Error", description: "Failed to reset template", variant: "destructive" }),
  });

  const hasCustomTemplate = !!template;

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-teal-600" />
        <h3 className="font-semibold text-sm text-gray-800">Prospect Confirmation Email</h3>
        <span className="text-xs text-gray-400 ml-1">— Sent to prospects after form submission</span>
        {hasCustomTemplate && (
          <span className="ml-auto text-[10px] bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded-full">Custom template active</span>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Override the default confirmation email sent to prospects who submit the inquiry form.
        When no override is set, the built-in Hubify template is used.
      </p>

      {!expanded ? (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setExpanded(true)}>
          {hasCustomTemplate ? "Edit template" : "Customize template"}
        </Button>
      ) : (
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : (
            <>
              {/* Edit / Preview toggle */}
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  className={`px-2 py-1 rounded font-medium transition-colors ${!previewing ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  onClick={() => setPreviewing(false)}
                >Edit</button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded font-medium transition-colors ${previewing ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  onClick={() => setPreviewing(true)}
                >Preview</button>
              </div>

              {previewing ? (
                <div className="border rounded bg-white p-3 text-xs space-y-2">
                  <p className="text-gray-500 text-[10px] italic">Dummy data: {CONFIRMATION_PREVIEW_DUMMY.name} / {CONFIRMATION_PREVIEW_DUMMY.company}</p>
                  <div>
                    <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Subject</p>
                    <p className="font-medium">{applyConfirmationMergeTags(draft.subject) || <span className="text-gray-300">—</span>}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Body (HTML rendered)</p>
                    <div
                      className="border rounded p-2 bg-gray-50 overflow-auto max-h-60"
                      dangerouslySetInnerHTML={{ __html: applyConfirmationMergeTags(draft.body) || "<span style='color:#ccc'>—</span>" }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs font-medium">Subject</Label>
                    <Input
                      className="h-8 text-xs mt-1"
                      value={draft.subject}
                      onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                      placeholder="e.g. We received your inquiry — here's what happens next"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Body (HTML)</Label>
                    <p className="text-[10px] text-gray-400 mb-1">
                      {"Available merge tags: {{firstName}} {{lastName}} {{name}} {{company}} {{email}} {{suggestedTier}} {{estimatedHomes}}"}
                    </p>
                    <Textarea
                      rows={8}
                      className="text-xs font-mono"
                      value={draft.body}
                      onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                      placeholder="<div>Hi {{firstName}}, thanks for reaching out…</div>"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 items-center">
                {hasCustomTemplate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-red-500 hover:text-red-700"
                    disabled={resetMutation.isPending}
                    onClick={() => {
                      if (confirm("Reset to the default built-in template? Your custom template will be deleted.")) {
                        resetMutation.mutate();
                        setExpanded(false);
                        setPreviewing(false);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Reset to default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => { setExpanded(false); setPreviewing(false); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs ml-auto"
                  disabled={!draft.subject.trim() || !draft.body.trim() || saveMutation.isPending}
                  onClick={() => saveMutation.mutate(draft)}
                >
                  {saveMutation.isPending ? "Saving…" : "Save template"}
                </Button>
              </div>
            </>
          )}
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
          <div className="flex justify-between"><span className="text-sm text-slate-600">Trialing</span><span className="font-semibold text-teal-600" data-testid="text-trialing-orgs">{data.trialingOrgs}</span></div>
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
type ErrorLogEntry = {
  id: number;
  level: string;
  source: string;
  route: string | null;
  method: string | null;
  statusCode: number | null;
  message: string;
  stack: string | null;
  metadata: Record<string, any> | null;
  userId: string | null;
  orgId: string | null;
  ip: string | null;
  resolved: boolean;
  createdAt: string;
};

function LevelBadge({ level }: { level: string }) {
  if (level === "critical") return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Critical</Badge>;
  if (level === "error")    return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Error</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Warn</Badge>;
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    server: "bg-slate-100 text-slate-700",
    unhandled: "bg-red-100 text-red-700",
    stripe: "bg-indigo-100 text-indigo-700",
    email: "bg-teal-100 text-teal-700",
    cron: "bg-green-100 text-green-700",
    webhook: "bg-orange-100 text-orange-700",
  };
  return <Badge className={`${map[source] ?? "bg-slate-100 text-slate-700"} text-xs border-0`}>{source}</Badge>;
}

function ErrorDetailSheet({ entry, onClose, onResolve }: { entry: ErrorLogEntry; onClose: () => void; onResolve: () => void }) {
  const resolveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/super-admin/error-logs/${entry.id}/resolve`, { resolved: !entry.resolved }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/super-admin/error-logs"] }); onResolve(); },
  });
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <LevelBadge level={entry.level} />
            <SourceBadge source={entry.source} />
            <span className="text-sm font-normal text-slate-500">#{entry.id}</span>
          </SheetTitle>
          <SheetDescription className="text-left text-base font-medium text-slate-900 break-words">{entry.message}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {entry.route && <div><span className="text-slate-500">Route</span><div className="font-mono mt-0.5">{entry.method} {entry.route}</div></div>}
            {entry.statusCode && <div><span className="text-slate-500">Status</span><div className="mt-0.5">{entry.statusCode}</div></div>}
            {entry.userId && <div><span className="text-slate-500">User ID</span><div className="font-mono mt-0.5 break-all">{entry.userId}</div></div>}
            {entry.orgId && <div><span className="text-slate-500">Org ID</span><div className="font-mono mt-0.5 break-all">{entry.orgId}</div></div>}
            {entry.ip && <div><span className="text-slate-500">IP Address</span><div className="font-mono mt-0.5">{entry.ip}</div></div>}
            <div><span className="text-slate-500">Timestamp</span><div className="mt-0.5">{new Date(entry.createdAt).toLocaleString()}</div></div>
          </div>
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div>
              <div className="text-sm text-slate-500 mb-1">Metadata</div>
              <pre className="bg-slate-50 border rounded p-3 text-xs overflow-x-auto">{JSON.stringify(entry.metadata, null, 2)}</pre>
            </div>
          )}
          {entry.stack && (
            <div>
              <div className="text-sm text-slate-500 mb-1">Stack Trace</div>
              <pre className="bg-slate-900 text-slate-100 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">{entry.stack}</pre>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant={entry.resolved ? "outline" : "default"} onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
              <CheckCircle className="w-4 h-4 mr-1" />
              {entry.resolved ? "Mark Unresolved" : "Mark Resolved"}
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ErrorLogsSection() {
  const [level, setLevel] = useState("all");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ErrorLogEntry | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const PAGE_SIZE = 50;

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
  if (level !== "all") params.set("level", level);
  if (source !== "all") params.set("source", source);
  if (search.trim()) params.set("search", search.trim());
  if (!showResolved) params.set("resolved", "false");

  const { data, isLoading, refetch, isFetching } = useQuery<{ logs: ErrorLogEntry[]; total: number }>({
    queryKey: ["/api/super-admin/error-logs", level, source, search, showResolved, page],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/error-logs?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    refetchInterval: 60000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolved }: { id: number; resolved: boolean }) =>
      apiRequest("PATCH", `/api/super-admin/error-logs/${id}/resolve`, { resolved }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/super-admin/error-logs"] }),
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/super-admin/error-logs`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/super-admin/error-logs"] }); setClearConfirm(false); },
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const criticalCount = logs.filter(l => l.level === "critical").length;
  const warnCount = logs.filter(l => l.level === "warn").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Error Logs
            {total > 0 && <Badge variant="secondary">{total}</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {!clearConfirm ? (
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setClearConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> Clear All
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600">Confirm?</span>
                <Button size="sm" variant="destructive" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending}>Yes</Button>
                <Button size="sm" variant="outline" onClick={() => setClearConfirm(false)}>No</Button>
              </div>
            )}
          </div>
        </div>
        {total > 0 && (
          <div className="flex gap-3 text-sm mt-1">
            {criticalCount > 0 && <span className="text-purple-700 font-medium">{criticalCount} critical</span>}
            {warnCount > 0 && <span className="text-yellow-700">{warnCount} warnings</span>}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input placeholder="Search message or route…" className="pl-8 h-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <Select value={level} onValueChange={v => { setLevel(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={v => { setSource(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="server">Server</SelectItem>
              <SelectItem value="unhandled">Unhandled</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="cron">Cron</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Switch checked={showResolved} onCheckedChange={v => { setShowResolved(v); setPage(0); }} />
            <span>Show resolved</span>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-8 text-center text-slate-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center" data-testid="text-no-errors">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
            <div className="text-slate-600 font-medium">No errors found</div>
            <div className="text-sm text-slate-400 mt-1">The platform is running cleanly.</div>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[140px]">Time</TableHead>
                    <TableHead className="w-[90px]">Level</TableHead>
                    <TableHead className="w-[100px]">Source</TableHead>
                    <TableHead className="w-[160px]">Route</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow
                      key={log.id}
                      className={`cursor-pointer hover:bg-slate-50 ${log.resolved ? "opacity-50" : ""}`}
                      onClick={() => setSelected(log)}
                    >
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell><LevelBadge level={log.level} /></TableCell>
                      <TableCell><SourceBadge source={log.source} /></TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 max-w-[160px] truncate">
                        {log.method && <span className="text-slate-400 mr-1">{log.method}</span>}
                        {log.route ?? "—"}
                        {log.statusCode && <span className="ml-1 text-slate-400">[{log.statusCode}]</span>}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <span className="line-clamp-1">{log.message}</span>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title={log.resolved ? "Mark unresolved" : "Mark resolved"}
                          onClick={() => resolveMutation.mutate({ id: log.id, resolved: !log.resolved })}
                        >
                          <CheckCircle className={`w-4 h-4 ${log.resolved ? "text-green-500" : "text-slate-300"}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{total} total · page {page + 1} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {selected && (
        <ErrorDetailSheet
          entry={selected}
          onClose={() => setSelected(null)}
          onResolve={() => setSelected(null)}
        />
      )}
    </Card>
  );
}

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

      <ErrorLogsSection />
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
    const color = sev === 'critical' ? 'bg-red-100 text-red-800' : sev === 'warning' ? 'bg-yellow-100 text-yellow-800' : sev === 'success' ? 'bg-green-100 text-green-800' : 'bg-teal-100 text-teal-800';
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
                        ? 'bg-teal-600 text-white border-teal-600'
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
              const bgClass = sev === 'critical' ? 'border-red-200 bg-red-50' : sev === 'warning' ? 'border-yellow-200 bg-yellow-50' : sev === 'success' ? 'border-green-200 bg-green-50' : 'border-teal-200 bg-teal-50';
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
// Self-Signup Card — sub-component used inside SettingsTabContent

function SelfSignupCard() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Record<string, any>>({
    queryKey: ['/api/super-admin/platform-settings'],
  });

  const [copied, setCopied] = useState(false);
  const signupUrl = typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup';

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest('PATCH', '/api/super-admin/platform-settings', { selfSignupEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/platform-settings'] });
      toast({ title: 'Self-signup setting saved' });
    },
    onError: (e: any) => toast({ title: 'Failed to save', description: e.message, variant: 'destructive' }),
  });

  const enabled = !!settings?.selfSignupEnabled;

  function copyLink() {
    navigator.clipboard.writeText(signupUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Self-Service Signup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
          <div>
            <div className="font-medium text-slate-800">Allow new organizations to sign up</div>
            <div className="text-sm text-slate-500 mt-0.5">
              When enabled, anyone with the link can register a new organization and go through the onboarding flow independently.
            </div>
          </div>
          {isLoading ? (
            <div className="w-10 h-6 bg-slate-200 rounded-full animate-pulse" />
          ) : (
            <Switch
              checked={enabled}
              onCheckedChange={(v) => toggleMutation.mutate(v)}
              disabled={toggleMutation.isPending}
              data-testid="switch-self-signup"
            />
          )}
        </div>

        {enabled && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">Shareable signup link</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-md border bg-white text-sm text-slate-700 font-mono truncate">
                {signupUrl}
              </div>
              <Button size="sm" variant="outline" onClick={copyLink} data-testid="button-copy-signup-link">
                {copied ? (
                  <><CheckCircle className="w-4 h-4 mr-1.5 text-green-600" /> Copied</>
                ) : (
                  <><ExternalLink className="w-4 h-4 mr-1.5" /> Copy</>
                )}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="/signup" target="_blank" rel="noopener noreferrer" data-testid="button-open-signup">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Share this link on your website, email campaigns, or social media. New customers can complete the full signup without any manual steps.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
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

// ── Pricing Tiers Card ───────────────────────────────────────────────────────

interface PricingTier {
  name: string;
  homesMin: number;
  homesMax: number;
  monthlyPrice: number;
  setupFee: number;
  startsAt: boolean;
}

const DEFAULT_TIERS: PricingTier[] = [
  { name: "Starter Portfolio",      homesMin: 1,   homesMax: 10,  monthlyPrice: 65,  setupFee: 149, startsAt: false },
  { name: "Growth Portfolio",       homesMin: 11,  homesMax: 25,  monthlyPrice: 145, setupFee: 249, startsAt: false },
  { name: "Professional Portfolio", homesMin: 26,  homesMax: 50,  monthlyPrice: 295, setupFee: 399, startsAt: false },
  { name: "Operator Portfolio",     homesMin: 51,  homesMax: 100, monthlyPrice: 495, setupFee: 599, startsAt: false },
  { name: "Enterprise Portfolio",   homesMin: 101, homesMax: 250, monthlyPrice: 795, setupFee: 999, startsAt: true  },
];

function PricingTiersCard() {
  const { toast } = useToast();

  const { data: serverTiers, isLoading } = useQuery<PricingTier[]>({
    queryKey: ["/api/super-admin/pricing-tiers"],
  });

  const [tiers, setTiers] = useState<PricingTier[]>(DEFAULT_TIERS);

  useEffect(() => {
    if (serverTiers && serverTiers.length > 0) {
      setTiers(serverTiers);
    }
  }, [serverTiers]);

  const setTierField = (idx: number, field: keyof PricingTier, value: string | number | boolean) => {
    setTiers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/super-admin/pricing-tiers", tiers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/pricing-tiers"] });
      toast({ title: "Pricing tiers saved" });
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Pricing Tiers
        </CardTitle>
        <p className="text-sm text-slate-500">
          Edit each tier's name, home volume range, monthly subscription price, and one-time setup fee.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-3 text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
              <span>Tier Name</span>
              <span>Homes Min</span>
              <span>Homes Max</span>
              <span>$/mo</span>
              <span>Setup Fee</span>
              <span>Starts At</span>
            </div>

            {tiers.map((tier, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-3 items-center p-3 border rounded-lg bg-slate-50/50"
              >
                {/* Name */}
                <div>
                  <Label className="md:hidden text-xs text-slate-500 mb-1 block">Tier Name</Label>
                  <Input
                    value={tier.name}
                    onChange={e => setTierField(idx, "name", e.target.value)}
                    className="h-9 text-sm font-medium"
                    placeholder="Tier name"
                  />
                </div>

                {/* Homes Min */}
                <div>
                  <Label className="md:hidden text-xs text-slate-500 mb-1 block">Homes Min</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tier.homesMin}
                    onChange={e => setTierField(idx, "homesMin", Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Homes Max */}
                <div>
                  <Label className="md:hidden text-xs text-slate-500 mb-1 block">Homes Max</Label>
                  <Input
                    type="number"
                    min={1}
                    value={tier.homesMax}
                    onChange={e => setTierField(idx, "homesMax", Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Monthly Price */}
                <div>
                  <Label className="md:hidden text-xs text-slate-500 mb-1 block">$/mo</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={tier.monthlyPrice}
                      onChange={e => setTierField(idx, "monthlyPrice", Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-9 text-sm pl-6"
                    />
                  </div>
                </div>

                {/* Setup Fee */}
                <div>
                  <Label className="md:hidden text-xs text-slate-500 mb-1 block">Setup Fee</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={tier.setupFee}
                      onChange={e => setTierField(idx, "setupFee", Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-9 text-sm pl-6"
                    />
                  </div>
                </div>

                {/* Starts At toggle */}
                <div className="flex flex-col items-start md:items-center gap-1">
                  <Label className="md:hidden text-xs text-slate-500">Starts At</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tier.startsAt}
                      onCheckedChange={v => setTierField(idx, "startsAt", v)}
                    />
                    <span className="text-xs text-slate-500 md:hidden">
                      {tier.startsAt ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Summary preview */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 mt-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Preview</p>
              <div className="space-y-1">
                {tiers.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{t.name}</span>
                    <span className="text-slate-500">
                      {t.homesMin}–{t.homesMax} homes ·{" "}
                      <span className="font-semibold text-slate-800">
                        {t.startsAt ? "Starts at " : ""}${t.monthlyPrice}/mo
                      </span>
                      {" · "}
                      <span className="text-slate-500">${t.setupFee} setup</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                  : <><CreditCard className="w-4 h-4 mr-2" /> Save Pricing Tiers</>}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Discount Codes Card ───────────────────────────────────────────────────────

interface DiscountCode {
  id: number;
  code: string;
  description: string | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  applicableTiers: string[];
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface DiscountCodeUsage {
  id: number;
  discountCodeId: number;
  orgId: string | null;
  orgName: string | null;
  planName: string | null;
  usedAt: string;
}

const TIER_OPTIONS = [
  "Starter Portfolio",
  "Growth Portfolio",
  "Professional Portfolio",
  "Operator Portfolio",
  "Enterprise Portfolio",
];

function DiscountCodesCard() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [historyCode, setHistoryCode] = useState<DiscountCode | null>(null);

  const blankForm = {
    code: "",
    description: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: 10,
    allTiers: true,
    applicableTiers: [] as string[],
    maxUses: "",
    expiresAt: "",
    isActive: true,
  };
  const [form, setForm] = useState(blankForm);

  const openCreate = () => {
    setEditId(null);
    setForm(blankForm);
    setShowDialog(true);
  };

  const openEdit = (code: DiscountCode) => {
    setEditId(code.id);
    setForm({
      code: code.code,
      description: code.description ?? "",
      discountType: code.discountType as "percent" | "fixed",
      discountValue: code.discountValue,
      allTiers: code.applicableTiers.length === 0,
      applicableTiers: code.applicableTiers,
      maxUses: code.maxUses !== null ? String(code.maxUses) : "",
      expiresAt: code.expiresAt ? code.expiresAt.slice(0, 10) : "",
      isActive: code.isActive,
    });
    setShowDialog(true);
  };

  const { data: codes = [], isLoading } = useQuery<DiscountCode[]>({
    queryKey: ["/api/super-admin/discount-codes"],
  });

  const { data: usages = [], isLoading: usagesLoading } = useQuery<DiscountCodeUsage[]>({
    queryKey: [`/api/super-admin/discount-codes/${historyCode?.id}/usages`],
    enabled: historyCode !== null,
  });

  const buildPayload = () => ({
    code: form.code.toUpperCase().trim(),
    description: form.description || null,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    applicableTiers: form.allTiers ? [] : form.applicableTiers,
    maxUses: form.maxUses ? Number(form.maxUses) : null,
    expiresAt: form.expiresAt || null,
    isActive: form.isActive,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/super-admin/discount-codes", buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/discount-codes"] });
      toast({ title: "Discount code created" });
      setShowDialog(false);
      setForm(blankForm);
    },
    onError: (e: Error) => toast({ title: "Failed to create code", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/super-admin/discount-codes/${editId}`, buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/discount-codes"] });
      toast({ title: "Discount code updated" });
      setShowDialog(false);
      setEditId(null);
      setForm(blankForm);
    },
    onError: (e: Error) => toast({ title: "Failed to update code", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/super-admin/discount-codes/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/discount-codes"] });
    },
    onError: (e: Error) => toast({ title: "Failed to update code", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/super-admin/discount-codes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/discount-codes"] });
      toast({ title: "Discount code deleted" });
      setDeleteId(null);
    },
    onError: (e: Error) => toast({ title: "Failed to delete code", description: e.message, variant: "destructive" }),
  });

  const isExpired = (code: DiscountCode) =>
    code.expiresAt ? new Date(code.expiresAt) < new Date() : false;
  const isExhausted = (code: DiscountCode) =>
    code.maxUses !== null && code.usedCount >= code.maxUses;

  const statusBadge = (code: DiscountCode) => {
    if (!code.isActive) return <Badge variant="secondary">Inactive</Badge>;
    if (isExpired(code)) return <Badge variant="destructive">Expired</Badge>;
    if (isExhausted(code)) return <Badge variant="destructive">Exhausted</Badge>;
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Discount Codes
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> New Code
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          Create promotional codes to share with prospects. Codes can be validated publicly at{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">/api/discount-codes/validate?code=XXX</code>
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No discount codes yet. Create your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map(code => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <span className="font-mono font-semibold text-sm">{code.code}</span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-[160px] truncate">
                      {code.description ?? <span className="italic text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{code.discountType}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {code.discountType === "percent"
                        ? `${code.discountValue}%`
                        : `$${(code.discountValue / 100).toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[180px]">
                      {code.applicableTiers.length === 0
                        ? "All tiers"
                        : code.applicableTiers.join(", ")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {code.usedCount}
                      {code.maxUses !== null ? ` / ${code.maxUses}` : " / ∞"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {code.expiresAt
                        ? new Date(code.expiresAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>{statusBadge(code)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={code.isActive}
                          onCheckedChange={v => toggleMutation.mutate({ id: code.id, isActive: v })}
                          className="scale-75"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-500 hover:text-slate-700"
                          title="Usage history"
                          onClick={() => setHistoryCode(code)}
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-500 hover:text-slate-700"
                          onClick={() => openEdit(code)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => setDeleteId(code.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={open => { if (!open) { setShowDialog(false); setEditId(null); setForm(blankForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Discount Code" : "New Discount Code"}</DialogTitle>
            <DialogDescription>
              {editId ? "Update the details for this discount code." : "Create a promotional code to share with prospects."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Code *</Label>
                <Input
                  placeholder="e.g. LAUNCH25"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>Discount Type *</Label>
                <Select
                  value={form.discountType}
                  onValueChange={v => setForm(f => ({ ...f, discountType: v as "percent" | "fixed" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (% off)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($ off)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>
                  {form.discountType === "percent" ? "Percent Off (0–100)" : "Amount Off (cents)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={form.discountType === "percent" ? 100 : undefined}
                  value={form.discountValue}
                  onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                />
                {form.discountType === "percent" && (
                  <p className="text-xs text-slate-500">e.g. 25 = 25% off monthly price</p>
                )}
                {form.discountType === "fixed" && (
                  <p className="text-xs text-slate-500">e.g. 1000 = $10.00 off</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Max Uses (blank = unlimited)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input
                placeholder="e.g. Launch special — 25% off first 3 months"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Expiry Date (optional)</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.allTiers}
                  onCheckedChange={v => setForm(f => ({ ...f, allTiers: v, applicableTiers: [] }))}
                  id="all-tiers"
                />
                <Label htmlFor="all-tiers">Apply to all tiers</Label>
              </div>
              {!form.allTiers && (
                <div className="pl-2 space-y-1">
                  {TIER_OPTIONS.map(tier => (
                    <div key={tier} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`tier-${tier}`}
                        checked={form.applicableTiers.includes(tier)}
                        onChange={e => {
                          setForm(f => ({
                            ...f,
                            applicableTiers: e.target.checked
                              ? [...f.applicableTiers, tier]
                              : f.applicableTiers.filter(t => t !== tier),
                          }));
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`tier-${tier}`} className="font-normal text-sm">{tier}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
                id="is-active"
              />
              <Label htmlFor="is-active">Active immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditId(null); setForm(blankForm); }}>
              Cancel
            </Button>
            {editId ? (
              <Button
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending || !form.code.trim()}
              >
                {editMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            ) : (
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.code.trim()}
              >
                {createMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                ) : (
                  "Create Code"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete discount code?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage history sheet */}
      <Sheet open={historyCode !== null} onOpenChange={open => !open && setHistoryCode(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Usage History
            </SheetTitle>
            <SheetDescription>
              {historyCode && (
                <span>
                  Redemptions of code{" "}
                  <span className="font-mono font-semibold text-slate-700">{historyCode.code}</span>
                  {" "}({historyCode.usedCount} total)
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {usagesLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : usages.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No uses recorded yet.</p>
                <p className="text-xs mt-1 text-slate-300">
                  Usage entries are created when a code is applied during signup.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {usages.map(usage => (
                  <div
                    key={usage.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-slate-800 truncate">
                        {usage.orgName ?? <span className="italic text-slate-400">Unknown org</span>}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {new Date(usage.usedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {usage.planName && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <CreditCard className="w-3 h-3" />
                        {usage.planName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

// ── System Integrations Card ─────────────────────────────────────────────────

interface IntegrationStatus {
  stripe:            { secretKey: boolean; webhookSecret: boolean };
  resend:            { apiKey: boolean; fromEmail: boolean };
  database:          { connected: boolean };
  objectStorage:     { configured: boolean };
  replitAuth:        { configured: boolean };
  billingAutomation: { enabled: boolean };
  superAdmin:        { usernameSet: boolean; passwordSet: boolean };
}

type ConnStatus = "connected" | "partial" | "not_configured";

function statusBadge(s: ConnStatus) {
  if (s === "connected")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Connected</span>;
  if (s === "partial")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" />Partial</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Not configured</span>;
}

function SystemIntegrationsCard() {
  const { data, isLoading, refetch, isFetching } = useQuery<IntegrationStatus>({
    queryKey: ["/api/super-admin/integration-status"],
    refetchOnWindowFocus: false,
  });

  const integrations: Array<{
    key: string;
    icon: React.ReactNode;
    name: string;
    description: string;
    status: ConnStatus;
    details: string[];
  }> = data ? [
    {
      key: "stripe",
      icon: <CreditCard className="w-5 h-5 text-violet-600" />,
      name: "Stripe",
      description: "Payment processing and invoice collection",
      status: data.stripe.secretKey && data.stripe.webhookSecret ? "connected"
            : data.stripe.secretKey ? "partial"
            : "not_configured",
      details: [
        `Secret key: ${data.stripe.secretKey ? "✓ set" : "✗ missing"}`,
        `Webhook secret: ${data.stripe.webhookSecret ? "✓ set" : "✗ missing"}`,
      ],
    },
    {
      key: "resend",
      icon: <Mail className="w-5 h-5 text-teal-600" />,
      name: "Resend",
      description: "Transactional email delivery",
      status: data.resend.apiKey && data.resend.fromEmail ? "connected"
            : data.resend.apiKey ? "partial"
            : "not_configured",
      details: [
        `API key: ${data.resend.apiKey ? "✓ set" : "✗ missing"}`,
        `From email: ${data.resend.fromEmail ? "✓ set" : "✗ missing (using default noreply@hubify.com)"}`,
      ],
    },
    {
      key: "database",
      icon: <Database className="w-5 h-5 text-green-600" />,
      name: "PostgreSQL Database",
      description: "Primary data store for all tenant data",
      status: data.database.connected ? "connected" : "not_configured",
      details: [`Connection string: ${data.database.connected ? "✓ set" : "✗ missing"}`],
    },
    {
      key: "objectStorage",
      icon: <HardDrive className="w-5 h-5 text-orange-600" />,
      name: "Object Storage",
      description: "File and document storage (PDFs, images, exports)",
      status: data.objectStorage.configured ? "connected" : "not_configured",
      details: [`Storage paths: ${data.objectStorage.configured ? "✓ configured" : "✗ not configured"}`],
    },
    {
      key: "replitAuth",
      icon: <Lock className="w-5 h-5 text-indigo-600" />,
      name: "Replit Auth (OIDC)",
      description: "User authentication via OpenID Connect",
      status: data.replitAuth.configured ? "connected" : "not_configured",
      details: [`Issuer URL: ${data.replitAuth.configured ? "✓ set" : "✗ missing"}`],
    },
    {
      key: "billingAutomation",
      icon: <Zap className="w-5 h-5 text-yellow-600" />,
      name: "Billing Automation",
      description: "Automated invoice generation and payment retries",
      status: data.billingAutomation.enabled ? "connected" : "not_configured",
      details: [`BILLING_AUTOMATION_ENABLED: ${data.billingAutomation.enabled ? "✓ true" : "✗ disabled"}`],
    },
    {
      key: "superAdmin",
      icon: <Shield className="w-5 h-5 text-red-600" />,
      name: "Super Admin Credentials",
      description: "Master login for this control panel",
      status: data.superAdmin.usernameSet && data.superAdmin.passwordSet ? "connected"
            : data.superAdmin.passwordSet ? "partial"
            : "not_configured",
      details: [
        `Username: ${data.superAdmin.usernameSet ? "✓ set" : "✗ missing (using default)"}`,
        `Password: ${data.superAdmin.passwordSet ? "✓ set" : "✗ missing"}`,
      ],
    },
  ] : [];

  const connectedCount = integrations.filter(i => i.status === "connected").length;
  const total = integrations.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              System Integrations
            </CardTitle>
            {!isLoading && data && (
              <p className="text-sm text-slate-500 mt-1">
                {connectedCount} of {total} services fully connected
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> Checking integrations…
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {integrations.map((intg) => (
              <div key={intg.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                    {intg.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm leading-tight">{intg.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{intg.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                      {intg.details.map((d, i) => (
                        <span key={i} className="text-xs text-slate-400 font-mono">{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  {statusBadge(intg.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Encryption Card — queries /api/super-admin/platform/encryption-status (read-only)
// Key generation is entirely client-side; no key material travels over the wire.
// Re-encryption: the old key is supplied by the admin, sent to the server only for
// the one-time re-encrypt call, then discarded.
function EncryptionCard() {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery<{
    enabled: boolean;
    canaryOk: boolean | null;
    affectedCount: number;
    totalConnections: number;
    plaintextStripeOrgs?: number;
  }>({
    queryKey: ['/api/super-admin/platform/encryption-status'],
  });

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showReencrypt, setShowReencrypt] = useState(false);
  const [oldKey, setOldKey] = useState('');

  const generateKey = () => {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const b64 = btoa(String.fromCharCode(...bytes));
    setGeneratedKey(b64);
    setCopied(false);
  };

  const copyKey = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      toast({ title: 'Key copied to clipboard' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: 'Copy failed', description: 'Select the key text and copy manually.', variant: 'destructive' });
    }
  };

  const reencryptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/super-admin/platform/reencrypt-stripe-keys', { oldKey });
      return res.json();
    },
    onSuccess: (result: any) => {
      const { reencrypted, skipped, errors } = result;
      if (errors?.length > 0) {
        toast({
          title: 'Re-encryption completed with errors',
          description: `${reencrypted} re-encrypted, ${skipped} skipped, ${errors.length} failed. Check server logs.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Re-encryption complete',
          description: `${reencrypted} connection(s) re-encrypted, ${skipped} already using plaintext (skipped).`,
        });
      }
      setOldKey('');
      setShowReencrypt(false);
      refetch();
    },
    onError: (e: any) => toast({ title: 'Re-encryption failed', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-slate-500 text-sm">Loading encryption status…</CardContent>
      </Card>
    );
  }

  const enabled = !!data?.enabled;
  const canaryOk = data?.canaryOk ?? null;
  const affectedCount = data?.affectedCount ?? 0;
  const totalConnections = data?.totalConnections ?? 0;
  const plaintextStripeOrgs = data?.plaintextStripeOrgs ?? 0;
  const keyMismatch = enabled && (canaryOk === false || affectedCount > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Lock className="w-5 h-5 mr-2" />Encryption</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key-mismatch critical warning */}
        {keyMismatch && (
          <div className="flex items-start space-x-3 p-4 rounded-lg bg-red-50 border border-red-300">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-red-900 mb-1">Encryption Key Mismatch Detected</div>
              <p className="text-sm text-red-700 mb-3">
                The current <code className="font-mono bg-red-100 px-1 rounded">PLATFORM_ENCRYPTION_KEY</code> does
                not match the key that was used to encrypt the stored Stripe credentials
                {affectedCount > 0 ? ` (${affectedCount} of ${totalConnections} connection${totalConnections !== 1 ? 's' : ''} affected)` : ''}.
                Stripe payments will fail for affected organisations until the keys are re-encrypted.
              </p>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowReencrypt(true)}
                data-testid="button-open-reencrypt"
              >
                <Key className="w-4 h-4 mr-2" />
                Re-encrypt stored keys…
              </Button>
            </div>
          </div>
        )}

        {/* Normal encrypted state */}
        {enabled && !keyMismatch && (
          <div className="flex items-start space-x-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-green-900">Encryption Active</span>
                <Badge className="bg-green-100 text-green-800 border-green-300">AES-256-GCM</Badge>
                <Badge variant="outline" className="text-green-800 border-green-300">32-byte key</Badge>
              </div>
              <p className="text-sm text-green-700 mb-2">
                <code className="font-mono bg-green-100 px-1 rounded">PLATFORM_ENCRYPTION_KEY</code> is set and
                verified. Stripe secret keys are encrypted at rest using AES-256-GCM.
              </p>
              {totalConnections > 0 && (
                <p className="text-xs text-green-600">
                  {totalConnections} Stripe connection{totalConnections !== 1 ? 's' : ''} — all decrypt correctly.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Encryption not active */}
        {!enabled && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-amber-900 mb-1">Encryption Not Active</div>
                <p className="text-sm text-amber-700">
                  <code className="font-mono bg-amber-100 px-1 rounded">PLATFORM_ENCRYPTION_KEY</code> is not set.
                  Stripe secret keys are stored as plaintext. Set this environment variable to enable AES-256-GCM encryption at rest.
                </p>
              </div>
            </div>

            {plaintextStripeOrgs > 0 && (
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-red-50 border border-red-300" data-testid="plaintext-stripe-orgs-warning">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-red-900 mb-1">
                    {plaintextStripeOrgs} org{plaintextStripeOrgs !== 1 ? 's have' : ' has'} Stripe keys stored as plaintext
                  </div>
                  <p className="text-sm text-red-700">
                    {plaintextStripeOrgs === 1
                      ? 'This organisation has a connected Stripe account whose secret key is unencrypted on disk.'
                      : `These ${plaintextStripeOrgs} organisations have connected Stripe accounts whose secret keys are unencrypted on disk.`}{' '}
                    Generate and set <code className="font-mono bg-red-100 px-1 rounded">PLATFORM_ENCRYPTION_KEY</code> above to protect them.
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-slate-600 mb-3">
                Generate a cryptographically secure 32-byte key below, then add it as an environment variable named{' '}
                <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">PLATFORM_ENCRYPTION_KEY</code>{' '}
                in your hosting environment (e.g. Replit Secrets or your deployment platform). The key is generated locally in your browser — it is never sent to the server.
              </p>

              <Button onClick={generateKey} variant="outline" data-testid="button-generate-encryption-key">
                <Key className="w-4 h-4 mr-2" />
                Generate Key
              </Button>
            </div>

            {generatedKey && (
              <div className="space-y-2">
                <Label>Generated Key (base64, 32 bytes)</Label>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 block font-mono text-xs bg-slate-100 border rounded px-3 py-2 break-all select-all"
                    data-testid="text-generated-key"
                  >
                    {generatedKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyKey} data-testid="button-copy-encryption-key">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Key className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Add this as a secret named <code className="font-mono bg-slate-100 px-1 rounded">PLATFORM_ENCRYPTION_KEY</code> and restart the server. Keep a secure backup — losing the key means losing access to encrypted data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Re-encrypt panel — shown when triggered from the key-mismatch warning */}
        {enabled && showReencrypt && (
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
            <div className="font-medium text-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Re-encrypt Stored Stripe Keys
            </div>
            <p className="text-sm text-slate-600">
              Enter the <strong>old</strong> encryption key (the key that was active when the Stripe credentials were
              originally saved). The server will decrypt each stored credential with the old key and immediately
              re-encrypt it with the current key. The old key is used only for this operation and is not stored.
            </p>
            <div className="space-y-1">
              <Label htmlFor="old-key-input">Old encryption key (base64)</Label>
              <Input
                id="old-key-input"
                type="password"
                placeholder="Paste your old PLATFORM_ENCRYPTION_KEY here…"
                value={oldKey}
                onChange={(e) => setOldKey(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-old-encryption-key"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!oldKey.trim() || reencryptMutation.isPending}
                onClick={() => reencryptMutation.mutate()}
                data-testid="button-confirm-reencrypt"
              >
                {reencryptMutation.isPending ? 'Re-encrypting…' : 'Re-encrypt now'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowReencrypt(false); setOldKey(''); }}
                disabled={reencryptMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Manual re-encrypt trigger when encryption is active but no mismatch */}
        {enabled && !keyMismatch && !showReencrypt && totalConnections > 0 && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReencrypt(true)}
              data-testid="button-open-reencrypt-manual"
            >
              <Key className="w-4 h-4 mr-2" />
              Re-encrypt after key rotation…
            </Button>
            <p className="text-xs text-slate-500 mt-1">
              Use this after rotating <code className="font-mono bg-slate-100 px-1 rounded">PLATFORM_ENCRYPTION_KEY</code> to migrate stored credentials to the new key.
            </p>
          </div>
        )}

        {/* Re-encrypt panel when triggered manually (no mismatch) */}
        {enabled && !keyMismatch && showReencrypt && (
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
            <div className="font-medium text-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Re-encrypt Stored Stripe Keys
            </div>
            <p className="text-sm text-slate-600">
              Enter the <strong>previous</strong> encryption key. The server will re-encrypt all stored Stripe
              credentials from the old key to the current one.
            </p>
            <div className="space-y-1">
              <Label htmlFor="old-key-input-manual">Previous encryption key (base64)</Label>
              <Input
                id="old-key-input-manual"
                type="password"
                placeholder="Paste your previous PLATFORM_ENCRYPTION_KEY here…"
                value={oldKey}
                onChange={(e) => setOldKey(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-old-encryption-key-manual"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!oldKey.trim() || reencryptMutation.isPending}
                onClick={() => reencryptMutation.mutate()}
                data-testid="button-confirm-reencrypt-manual"
              >
                {reencryptMutation.isPending ? 'Re-encrypting…' : 'Re-encrypt now'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowReencrypt(false); setOldKey(''); }}
                disabled={reencryptMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
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
      <SystemIntegrationsCard />

      <SelfSignupCard />

      <EncryptionCard />

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

      <PricingTiersCard />

      <DiscountCodesCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><CreditCard className="w-5 h-5 mr-2" />Billing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="grace-period">Payment Grace Period (days)</Label>
            <Input id="grace-period" type="number" value={draft.paymentGracePeriodDays ?? ''} onChange={(e) => set('paymentGracePeriodDays', parseInt(e.target.value) || 0)} data-testid="input-grace-period" />
          </div>
          <Button onClick={() => saveSection.mutate(['paymentGracePeriodDays'])} disabled={saveSection.isPending} data-testid="button-save-billing-settings">
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
              <Input id="brand-color" type="color" value={draft.brandPrimaryColor || '#0d9488'} onChange={(e) => set('brandPrimaryColor', e.target.value)} className="w-20 h-10" data-testid="input-default-color" />
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
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <Label className="text-sm font-medium text-teal-900">Available Variables</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getVariableHints(formData.type).map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs font-mono">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-teal-700 mt-2">
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
        return 'bg-teal-100 text-teal-700';
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
                    className="text-teal-600 hover:underline"
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
                      className="flex items-center gap-2 text-sm text-teal-600 hover:underline"
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

type OrgUserRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  isAdminAccount: boolean | null;
  createdAt: string | null;
};

type OrgOverviewRow = {
  id: string;
  name: string;
  isActive: boolean;
  slug: string | null;
  orgStatus: string | null;
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
          <Building2 className="h-4 w-4 text-teal-600" />
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

const ORG_STATUSES = ["pending", "onboarding", "active", "suspended", "archived"] as const;
type OrgStatusValue = typeof ORG_STATUSES[number];

const ORG_STATUS_BADGE: Record<OrgStatusValue, { label: string; className: string }> = {
  pending:    { label: "Pending",    className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  onboarding: { label: "Onboarding", className: "bg-blue-100 text-blue-800 border-blue-200" },
  active:     { label: "Active",     className: "bg-green-100 text-green-800 border-green-200" },
  suspended:  { label: "Suspended",  className: "bg-red-100 text-red-800 border-red-200" },
  archived:   { label: "Archived",   className: "bg-slate-100 text-slate-600 border-slate-200" },
};

function OrgDetailSheet({ org, open, onClose }: { org: OrgOverviewRow | null; open: boolean; onClose: () => void }) {
  const [innerTab, setInnerTab] = useState("users");
  const { data: orgUsers = [], isLoading: usersLoading } = useQuery<OrgUserRow[]>({
    queryKey: ["/api/super-admin/orgs", org?.id, "users"],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/orgs/${org!.id}/users`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
    enabled: open && !!org?.id,
  });

  if (!org) return null;

  const ROLE_LABEL: Record<string, string> = {
    admin: "Admin",
    supervisor: "Supervisor",
    staff: "Staff",
    super_admin: "Super Admin",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            {org.name}
          </SheetTitle>
          <SheetDescription>
            {org.slug ? <span className="font-mono text-xs">{org.slug}.hubifyhomesonline.com</span> : <span className="text-slate-400 italic text-xs">No slug set</span>}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={innerTab} onValueChange={setInnerTab} className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">
              Users
              {orgUsers.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold leading-none min-w-[16px] h-4 px-1">
                  {orgUsers.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            {[
              ["Organization", org.name],
              ["Slug", org.slug ?? "—"],
              ["Plan", org.tier],
              ["Subscription", org.subscriptionStatus.replace("_", " ")],
              ["Status", org.orgStatus ?? "—"],
              ["Primary Admin", org.primaryAdminEmail ?? "—"],
              ["Properties", String(org.propertyCount)],
              ["Users", String(org.userCount)],
              ["MRR", `$${(org.mrrCents / 100).toFixed(0)}/mo`],
              ["Created", org.createdAt ? new Date(org.createdAt).toLocaleDateString() : "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800 capitalize">{value}</span>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="users">
            {usersLoading ? (
              <div className="text-sm text-slate-500 py-4 text-center">Loading users…</div>
            ) : orgUsers.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">No users in this organization yet.</div>
            ) : (
              <div className="space-y-2">
                {orgUsers.map((u) => {
                  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—";
                  const isOwner = !!u.isAdminAccount;
                  return (
                    <div
                      key={u.id}
                      className={`flex items-start justify-between rounded-lg border p-3 text-sm ${isOwner ? "border-teal-200 bg-teal-50/40" : "border-slate-100 bg-white"}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{name}</span>
                          {isOwner && (
                            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100">
                              Account Owner
                            </Badge>
                          )}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5 truncate">{u.email ?? "—"}</div>
                        {u.createdAt && (
                          <div className="text-slate-400 text-xs mt-0.5">
                            Joined {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] capitalize">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                        <Badge
                          variant={u.isActive ? "default" : "secondary"}
                          className={`text-[10px] ${u.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200" : ""}`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function OrganizationsTab() {
  const { toast } = useToast();
  const { data: orgs = [], isLoading } = useQuery<OrgOverviewRow[]>({
    queryKey: ["/api/super-admin/orgs-overview"],
  });

  const [detailOrg, setDetailOrg] = useState<OrgOverviewRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Inline slug editing state: orgId -> draft value (null = not editing)
  const [slugDraft, setSlugDraft] = useState<Record<string, string>>({});
  const [slugEditing, setSlugEditing] = useState<string | null>(null);

  const updateOrgMut = useMutation({
    mutationFn: async ({ orgId, payload }: { orgId: string; payload: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/super-admin/orgs/${orgId}/status`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/orgs-overview"] });
      toast({ title: "Organization updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message || "Could not update", variant: "destructive" });
    },
  });

  function saveSlug(orgId: string) {
    const slug = (slugDraft[orgId] ?? "").trim().toLowerCase();
    if (!slug) { setSlugEditing(null); return; }
    updateOrgMut.mutate({ orgId, payload: { slug } }, {
      onSettled: () => setSlugEditing(null),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Organizations Management
          </CardTitle>
          <Button size="sm" variant="outline" asChild data-testid="button-export-orgs">
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Primary Admin</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Org Status</TableHead>
                  <TableHead className="text-right">Properties</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((o) => {
                  const isEditingSlug = slugEditing === o.id;
                  const currentStatus = (o.orgStatus ?? (o.isActive ? "active" : "suspended")) as OrgStatusValue;
                  const statusConfig = ORG_STATUS_BADGE[currentStatus] ?? ORG_STATUS_BADGE.active;
                  return (
                    <TableRow key={o.id} data-testid={`row-org-${o.id}`}>
                      <TableCell className="font-medium whitespace-nowrap">{o.name}</TableCell>

                      {/* Slug — inline edit */}
                      <TableCell className="min-w-[140px]">
                        {isEditingSlug ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 text-xs font-mono w-28"
                              value={slugDraft[o.id] ?? o.slug ?? ""}
                              autoFocus
                              onChange={(e) => setSlugDraft(d => ({ ...d, [o.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveSlug(o.id);
                                if (e.key === "Escape") setSlugEditing(null);
                              }}
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-1.5 text-xs text-teal-700"
                              onClick={() => saveSlug(o.id)} disabled={updateOrgMut.isPending}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-1.5 text-xs"
                              onClick={() => setSlugEditing(null)}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            <span className="text-xs font-mono text-slate-600">
                              {o.slug ?? <span className="text-slate-400 italic">—</span>}
                            </span>
                            <Button
                              size="sm" variant="ghost"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setSlugDraft(d => ({ ...d, [o.id]: o.slug ?? "" }));
                                setSlugEditing(o.id);
                              }}
                              title="Edit slug"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>

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

                      {/* Org Status — inline dropdown */}
                      <TableCell>
                        <Select
                          value={currentStatus}
                          onValueChange={(val) => {
                            if (val === currentStatus) return;
                            if ((val === "suspended" || val === "archived") &&
                              !confirm(`Set "${o.name}" to ${val}? Users will lose access.`)) return;
                            updateOrgMut.mutate({
                              orgId: o.id,
                              payload: {
                                orgStatus: val,
                                isActive: val === "active" || val === "onboarding",
                              },
                            });
                          }}
                          disabled={updateOrgMut.isPending}
                        >
                          <SelectTrigger
                            className={`h-7 text-xs border w-[120px] ${statusConfig.className}`}
                            data-testid={`badge-org-status-${o.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORG_STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-right">{o.propertyCount}</TableCell>
                      <TableCell className="text-right">
                        <button
                          className="text-teal-700 hover:underline font-medium"
                          onClick={() => { setDetailOrg(o); setDetailOpen(true); }}
                          title="View org users"
                        >
                          {o.userCount}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">${(o.mrrCents / 100).toFixed(0)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm" variant="ghost" title="View organization"
                            onClick={() => { setDetailOrg(o); setDetailOpen(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {o.isActive ? (
                            <Button
                              size="sm" variant="ghost" title="Suspend organization"
                              disabled={updateOrgMut.isPending}
                              onClick={() => {
                                if (confirm(`Suspend ${o.name}? Users will lose access until reactivated.`)) {
                                  updateOrgMut.mutate({ orgId: o.id, payload: { isActive: false, orgStatus: "suspended" } });
                                }
                              }}
                              data-testid={`button-suspend-${o.id}`}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm" variant="ghost" title="Reactivate organization"
                              disabled={updateOrgMut.isPending}
                              onClick={() => updateOrgMut.mutate({ orgId: o.id, payload: { isActive: true, orgStatus: "active" } })}
                              data-testid={`button-activate-${o.id}`}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <OrgDetailSheet
        org={detailOrg}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
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
              <Users className="w-12 h-12 text-teal-500" />
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
  const [activeTab, setActiveTab] = useState("onboarding");
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState<boolean | null>(null);
  const [superAdminUsername, setSuperAdminUsername] = useState<string>("");
  const [pipelinePrefill, setPipelinePrefill] = useState<ProspectFormValues | null>(null);
  const [onboardingInnerTab, setOnboardingInnerTab] = useState("new");
  const [orgsInnerTab, setOrgsInnerTab] = useState("orgs");
  const [platformInnerTab, setPlatformInnerTab] = useState("settings");
  const [supportInnerTab, setSupportInnerTab] = useState("tickets");

  const { data: submissionsData = [] } = useQuery<Prospect[]>({
    queryKey: ["/api/super-admin/submissions"],
    enabled: isSuperAdminAuthenticated === true,
  });
  const newSubmissionsCount = submissionsData.filter(s => !s.orgId).length;

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
          <TabsTrigger value="onboarding" className="relative">
            Onboarding
            {newSubmissionsCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none min-w-[16px] h-4 px-1">
                {newSubmissionsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ── ONBOARDING ── */}
        <TabsContent value="onboarding">
          <Tabs value={onboardingInnerTab} onValueChange={setOnboardingInnerTab} className="space-y-4">
            <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/60 p-1">
              <TabsTrigger value="new" className="relative">
                Submissions
                {newSubmissionsCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none min-w-[16px] h-4 px-1">
                    {newSubmissionsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="beta">Beta Applications</TabsTrigger>
              <TabsTrigger value="demo-requests">Demo Requests</TabsTrigger>
              <TabsTrigger value="dropped">Dropped</TabsTrigger>
            </TabsList>
            <TabsContent value="new">
              <SubmissionsTab
                onEdit={(submission) => {
                  const displayName = submission.firstName && submission.lastName
                    ? `${submission.firstName} ${submission.lastName}`
                    : submission.name;
                  setPipelinePrefill({
                    name: displayName ?? "",
                    email: submission.email ?? "",
                    company: submission.company ?? "",
                    phone: submission.phone ?? "",
                    notes: submission.notes ?? "",
                    agreementContent: submission.agreementContent ?? "",
                  });
                  setOnboardingInnerTab("pipeline");
                  toast({ title: "Opening pipeline editor", description: `Pre-filled with ${displayName}'s data.` });
                }}
                onMoveToPipeline={(submission) => {
                  const displayName = submission.firstName && submission.lastName
                    ? `${submission.firstName} ${submission.lastName}`
                    : submission.name;
                  setPipelinePrefill({
                    name: displayName ?? "",
                    email: submission.email ?? "",
                    company: submission.company ?? "",
                    phone: submission.phone ?? "",
                    notes: submission.notes ?? "",
                    agreementContent: "",
                  });
                  setOnboardingInnerTab("pipeline");
                  toast({ title: "Opening pipeline", description: `Pre-filled with ${displayName}'s data.` });
                }}
              />
            </TabsContent>
            <TabsContent value="pipeline">
              <OnboardingPipelineTab
                prefill={pipelinePrefill}
                onPrefillConsumed={() => setPipelinePrefill(null)}
                onGoToOrganizations={() => { setActiveTab("organizations"); setOrgsInnerTab("orgs"); }}
              />
            </TabsContent>
            <TabsContent value="beta">
              <OnboardingPipelineTab
                initialBetaOnly={true}
                onGoToOrganizations={() => { setActiveTab("organizations"); setOrgsInnerTab("orgs"); }}
              />
              <div className="mt-6">
                <BetaProgramTab />
              </div>
            </TabsContent>
            <TabsContent value="demo-requests">
              <OnboardingPipelineTab
                initialDemoOnly={true}
                onGoToOrganizations={() => { setActiveTab("organizations"); setOrgsInnerTab("orgs"); }}
              />
              <div className="mt-6">
                <DemoRequestsTab />
              </div>
            </TabsContent>
            <TabsContent value="dropped">
              <DroppedProspectsTab />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── ORGANIZATIONS ── */}
        <TabsContent value="organizations">
          <Tabs value={orgsInnerTab} onValueChange={setOrgsInnerTab} className="space-y-4">
            <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/60 p-1">
              <TabsTrigger value="orgs">Organizations</TabsTrigger>
              <TabsTrigger value="users">All Users</TabsTrigger>
            </TabsList>
            <TabsContent value="orgs">
              <OrganizationsTab />
            </TabsContent>
            <TabsContent value="users">
              <AllUsersTab />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── REVENUE ── */}
        <TabsContent value="revenue">
          <RevenueTabContent />
        </TabsContent>

        {/* ── MONITORING ── */}
        <TabsContent value="monitoring">
          <MonitoringTabContent />
        </TabsContent>

        {/* ── PLATFORM ── */}
        <TabsContent value="platform">
          <Tabs value={platformInnerTab} onValueChange={setPlatformInnerTab} className="space-y-4">
            <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/60 p-1">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="features">Feature Flags</TabsTrigger>
              <TabsTrigger value="email-templates" data-testid="tab-email-templates">Email Templates</TabsTrigger>
              <TabsTrigger value="templates">Template Management</TabsTrigger>
              <TabsTrigger value="admins">Admins</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="demo-tenant">
                <MonitorPlay className="w-3.5 h-3.5 mr-1.5" />
                Demo Tenant
              </TabsTrigger>
            </TabsList>
            <TabsContent value="settings">
              <SettingsTabContent />
            </TabsContent>
            <TabsContent value="features">
              <FeatureFlagsTabContent />
            </TabsContent>
            <TabsContent value="email-templates">
              <EmailTemplates />
            </TabsContent>
            <TabsContent value="templates">
              <TemplateManagement />
            </TabsContent>
            <TabsContent value="admins">
              <PlatformAdminsTab />
            </TabsContent>
            <TabsContent value="compliance">
              <ComplianceTab />
            </TabsContent>
            <TabsContent value="demo-tenant">
              <DemoTenantTab />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── SUPPORT ── */}
        <TabsContent value="support">
          <Tabs value={supportInnerTab} onValueChange={setSupportInnerTab} className="space-y-4">
            <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/60 p-1">
              <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
              <TabsTrigger value="alerts">System Alerts</TabsTrigger>
            </TabsList>
            <TabsContent value="tickets">
              <SupportTickets />
            </TabsContent>
            <TabsContent value="alerts">
              <CommunicationTabContent />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── REPORTS ── */}
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
      </Tabs>
    </main>
  );
}