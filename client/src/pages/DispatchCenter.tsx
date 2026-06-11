import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin, Plus, ChevronDown, ChevronUp, ChevronRight,
  Clock, AlertTriangle, CheckCircle2, Send, FileText,
  Trash2, ArrowUp, ArrowDown, Calendar, RefreshCw, Save,
  Copy, LayoutList, Pencil, X, Play, Square, Timer, TrendingUp
} from "lucide-react";

type StopDraft = {
  id?: string;
  propertyId?: number | null;
  taskId?: number | null;
  assignedUserId?: string | null;
  serviceType?: string;
  estimatedWorkMinutes: number;
  travelMinutesFromPrevious: number;
  bufferMinutes: number;
  notes?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  calendarEventId?: string | null;
  status?: string;
  actualStartedAt?: string | null;
  actualCompletedAt?: string | null;
  actualWorkMinutes?: number | null;
  property?: any;
  task?: any;
};

type Itinerary = {
  id: string;
  name: string;
  date: string;
  assignedUserId?: string;
  templateId?: string;
  startTime: string;
  status: string;
  totalWorkMinutes: number;
  totalTravelMinutes: number;
  totalBufferMinutes: number;
  totalDayMinutes: number;
  needsCalendarSync: boolean;
  stops: StopDraft[];
};

type Template = {
  id: string;
  name: string;
  description?: string;
  preferredStartTime?: string;
  defaultAssignedUserId?: string;
  stops: any[];
};

function formatMinutes(mins: number) {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  try { return format(new Date(iso), "h:mm a"); } catch { return "—"; }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft:     { label: "Draft",     variant: "secondary" },
    published: { label: "Published", variant: "default" },
    completed: { label: "Completed", variant: "outline" },
    pending:   { label: "Pending",   variant: "secondary" },
    in_progress: { label: "In Progress", variant: "default" },
    skipped:   { label: "Skipped",   variant: "outline" },
  };
  const cfg = map[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const calc = () => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  const [elapsed, setElapsed] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setElapsed(calc()), 30000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span className="text-teal-600 font-medium flex items-center gap-1"><Timer className="w-3 h-3" />{elapsed}m elapsed</span>;
}

export default function DispatchCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const role = (user as any)?.role;
  const isManager = role === "admin" || role === "supervisor";

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [startTime, setStartTime] = useState("08:00");
  const [activeItineraryId, setActiveItineraryId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(true);

  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateForm, setSaveTemplateForm] = useState({ name: "", description: "", preferredStartTime: "08:00" });
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateFromTemplateId, setGenerateFromTemplateId] = useState<string | null>(null);
  const [generateForm, setGenerateForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), assignedUserId: "", startTime: "08:00" });
  const [newItineraryOpen, setNewItineraryOpen] = useState(false);
  const [newItineraryForm, setNewItineraryForm] = useState({ name: "", date: format(new Date(), "yyyy-MM-dd"), startTime: "08:00", assignedUserId: "" });

  const [editingStopId, setEditingStopId] = useState<string | null>(null);

  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: templates = [], isLoading: templatesLoading } = useQuery<Template[]>({ queryKey: ["/api/dispatch/templates"] });
  const { data: itineraries = [], isLoading: itiLoading } = useQuery<Itinerary[]>({
    queryKey: ["/api/dispatch/itineraries", selectedDate, selectedUserId],
    queryFn: () => {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedUserId && selectedUserId !== "all") params.append("assignedUserId", selectedUserId);
      return fetch(`/api/dispatch/itineraries?${params}`).then(r => r.json());
    },
  });
  const { data: unscheduledTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/dispatch/unscheduled-tasks", selectedDate, selectedUserId],
    queryFn: () => {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedUserId && selectedUserId !== "all") params.append("assignedUserId", selectedUserId);
      return fetch(`/api/dispatch/unscheduled-tasks?${params}`).then(r => r.json());
    },
  });
  const { data: activeItinerary, isLoading: activeLoading } = useQuery<Itinerary>({
    queryKey: ["/api/dispatch/itineraries", activeItineraryId],
    queryFn: () => fetch(`/api/dispatch/itineraries/${activeItineraryId}`).then(r => r.json()),
    enabled: !!activeItineraryId,
  });

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["/api/dispatch/itineraries"] });
    qc.invalidateQueries({ queryKey: ["/api/dispatch/unscheduled-tasks"] });
    qc.invalidateQueries({ queryKey: ["/api/dispatch/templates"] });
  }, [qc]);

  const createItinerary = useMutation({
    // Parse JSON in mutationFn so onSuccess is synchronous — ensures React
    // batches setActiveItineraryId + setNewItineraryOpen in the same render
    mutationFn: async (body: any) => {
      const res = await apiRequest("POST", "/api/dispatch/itineraries", body);
      return await res.json();
    },
    onSuccess: (data: any) => {
      // Immediately seed the detail cache so activeItinerary is available
      // before the invalidation refetch completes — fixes disabled "Add to Itinerary" buttons
      qc.setQueryData(["/api/dispatch/itineraries", data.id], { ...data, stops: data.stops ?? [] });
      setActiveItineraryId(data.id);
      setNewItineraryOpen(false);
      toast({ title: "Itinerary created" });
      invalidateAll();
    },
    onError: () => toast({ title: "Failed to create itinerary", variant: "destructive" }),
  });

  const deleteItinerary = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dispatch/itineraries/${id}`),
    onSuccess: () => { invalidateAll(); setActiveItineraryId(null); toast({ title: "Itinerary deleted" }); },
    onError: () => toast({ title: "Failed to delete itinerary", variant: "destructive" }),
  });

  const updateStops = useMutation({
    mutationFn: ({ id, stops }: { id: string; stops: any[] }) => apiRequest("PATCH", `/api/dispatch/itineraries/${id}/stops`, { stops }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/dispatch/itineraries", activeItineraryId] }); qc.invalidateQueries({ queryKey: ["/api/dispatch/unscheduled-tasks"] }); },
    onError: () => toast({ title: "Failed to update stops", variant: "destructive" }),
  });

  const deleteStop = useMutation({
    mutationFn: ({ itinId, stopId }: { itinId: string; stopId: string }) => apiRequest("DELETE", `/api/dispatch/itineraries/${itinId}/stops/${stopId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/dispatch/itineraries", activeItineraryId] }); qc.invalidateQueries({ queryKey: ["/api/dispatch/unscheduled-tasks"] }); },
    onError: () => toast({ title: "Failed to remove stop", variant: "destructive" }),
  });

  const publishItinerary = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/dispatch/itineraries/${id}/publish`, {});
      return await res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/dispatch/itineraries", activeItineraryId] });
      qc.invalidateQueries({ queryKey: ["/api/dispatch/itineraries"] });
      toast({ title: `Published — ${data.eventsCreated} event(s) created, ${data.eventsUpdated} updated` });
    },
    onError: () => toast({ title: "Failed to publish itinerary", variant: "destructive" }),
  });

  const createTemplate = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/dispatch/templates", body),
    onSuccess: () => { invalidateAll(); setSaveTemplateOpen(false); toast({ title: "Template saved" }); },
    onError: () => toast({ title: "Failed to save template", variant: "destructive" }),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dispatch/templates/${id}`),
    onSuccess: () => { invalidateAll(); toast({ title: "Template deleted" }); },
    onError: () => toast({ title: "Failed to delete template", variant: "destructive" }),
  });

  const generateFromTemplate = useMutation({
    mutationFn: async ({ templateId, body }: { templateId: string; body: any }) => {
      const res = await apiRequest("POST", `/api/dispatch/templates/${templateId}/generate`, body);
      return await res.json();
    },
    onSuccess: (data: any) => {
      qc.setQueryData(["/api/dispatch/itineraries", data.id], { ...data, stops: data.stops ?? [] });
      setActiveItineraryId(data.id);
      setGenerateOpen(false);
      toast({ title: "Daily Itinerary generated" });
      invalidateAll();
    },
    onError: () => toast({ title: "Failed to generate itinerary", variant: "destructive" }),
  });

  const markCompleted = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/dispatch/itineraries/${id}`, { status: "completed" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/dispatch/itineraries", activeItineraryId] }); qc.invalidateQueries({ queryKey: ["/api/dispatch/itineraries"] }); toast({ title: "Marked as completed" }); },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const startStop = useMutation({
    mutationFn: ({ itinId, stopId }: { itinId: string; stopId: string }) =>
      apiRequest("PATCH", `/api/dispatch/itineraries/${itinId}/stops/${stopId}/start`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/dispatch/itineraries", activeItineraryId] }); },
    onError: () => toast({ title: "Failed to start stop", variant: "destructive" }),
  });

  const completeStop = useMutation({
    mutationFn: ({ itinId, stopId }: { itinId: string; stopId: string }) =>
      apiRequest("PATCH", `/api/dispatch/itineraries/${itinId}/stops/${stopId}/complete`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/dispatch/itineraries", activeItineraryId] }); },
    onError: () => toast({ title: "Failed to complete stop", variant: "destructive" }),
  });

  const editingStopObj = activeItinerary?.stops?.find((s, i) =>
    editingStopId === (s.id ?? String(i))
  ) ?? null;
  const suggestionUserId = (editingStopObj as any)?.assignedUserId || activeItinerary?.assignedUserId;
  const suggestionPropertyId = editingStopObj?.propertyId;
  const { data: timeSuggestion } = useQuery<{ suggestedMinutes: number; sampleCount: number } | null>({
    queryKey: ["/api/dispatch/time-suggestions", suggestionUserId, suggestionPropertyId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (suggestionUserId) params.append("userId", suggestionUserId);
      if (suggestionPropertyId) params.append("propertyId", String(suggestionPropertyId));
      return fetch(`/api/dispatch/time-suggestions?${params}`).then(r => r.json());
    },
    enabled: !!editingStopId && !!suggestionUserId && !!suggestionPropertyId,
    staleTime: 5 * 60 * 1000,
  });

  if (!isManager) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Dispatch Center is available to admins and supervisors only.</p>
      </div>
    );
  }

  function stopToPayload(s: any) {
    return {
      id: s.id ?? undefined,
      propertyId: s.propertyId ?? null,
      taskId: s.taskId ?? null,
      assignedUserId: s.assignedUserId ?? null,
      estimatedWorkMinutes: s.estimatedWorkMinutes ?? 60,
      travelMinutesFromPrevious: s.travelMinutesFromPrevious ?? 15,
      bufferMinutes: s.bufferMinutes ?? 0,
      notes: s.notes ?? "",
      status: s.status ?? "pending",
      calendarEventId: s.calendarEventId ?? null,
      actualStartedAt: s.actualStartedAt ?? null,
      actualCompletedAt: s.actualCompletedAt ?? null,
      actualWorkMinutes: s.actualWorkMinutes ?? null,
    };
  }

  async function addTaskToItinerary(task: any) {
    if (!activeItineraryId) return;
    const current = activeItinerary?.stops ?? [];
    const propertyId = task.property?.id ?? task.propertyId ?? null;
    const userId = activeItinerary?.assignedUserId ?? null;

    let estimatedMins = 60;
    if (propertyId && userId) {
      try {
        const params = new URLSearchParams({ userId, propertyId: String(propertyId) });
        const suggestion = await fetch(`/api/dispatch/time-suggestions?${params}`).then(r => r.json());
        if (suggestion?.suggestedMinutes) estimatedMins = suggestion.suggestedMinutes;
      } catch {}
    }

    const newStop: any = {
      propertyId,
      taskId: task.id,
      estimatedWorkMinutes: estimatedMins,
      travelMinutesFromPrevious: 15,
      bufferMinutes: 0,
      notes: "",
      status: "pending",
      property: task.property ?? null,
      task,
    };
    const newStops = [...current, newStop].map(stopToPayload);
    updateStops.mutate({ id: activeItineraryId, stops: newStops });
  }

  function moveStop(index: number, dir: -1 | 1) {
    if (!activeItinerary) return;
    const stops = [...(activeItinerary.stops ?? [])];
    const target = index + dir;
    if (target < 0 || target >= stops.length) return;
    [stops[index], stops[target]] = [stops[target], stops[index]];
    updateStops.mutate({ id: activeItinerary.id, stops: stops.map(stopToPayload) });
  }

  function updateStopField(stopIndex: number, field: string, value: any) {
    if (!activeItinerary) return;
    const stops = (activeItinerary.stops ?? []).map((s, i) =>
      i === stopIndex ? { ...s, [field]: value } : s
    );
    updateStops.mutate({ id: activeItinerary.id, stops: stops.map(stopToPayload) });
  }

  const itin = activeItinerary;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-teal-600" />
            <h1 className="font-semibold text-lg">Dispatch Center</h1>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Staff Member</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Default Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-8 text-sm" />
            </div>
            <Button size="sm" className="w-full" onClick={() => { setNewItineraryForm(f => ({ ...f, date: selectedDate, startTime, assignedUserId: selectedUserId !== "all" ? selectedUserId : "" })); setNewItineraryOpen(true); }}>
              <Plus className="w-3 h-3 mr-1" /> New Itinerary
            </Button>
          </div>
        </div>

        {/* Itinerary list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Itineraries — {selectedDate}</p>
          {itiLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {itineraries.length === 0 && !itiLoading && (
            <p className="text-xs text-muted-foreground italic">No itineraries for this date.</p>
          )}
          {itineraries.map((iti) => (
            <div
              key={iti.id}
              onClick={() => setActiveItineraryId(iti.id)}
              className={`rounded-lg border p-3 cursor-pointer transition-colors ${activeItineraryId === iti.id ? "bg-teal-50 border-teal-300 dark:bg-teal-950/40 dark:border-teal-700" : "bg-card hover:bg-muted/40"}`}
            >
              <p className="text-sm font-medium truncate">{iti.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={iti.status} />
                {iti.needsCalendarSync && <span title="Needs calendar sync"><AlertTriangle className="w-3 h-3 text-amber-500" /></span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{iti.stops?.length ?? 0} stops · {formatMinutes(iti.totalDayMinutes)}</p>
            </div>
          ))}
        </div>

        {/* Templates */}
        <div className="border-t">
          <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/40 text-sm font-medium">
              <span className="flex items-center gap-2"><LayoutList className="w-4 h-4" /> Itinerary Templates</span>
              {templatesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="max-h-52">
                <div className="p-2 space-y-1">
                  {templatesLoading && <p className="text-xs p-2 text-muted-foreground">Loading…</p>}
                  {templates.length === 0 && !templatesLoading && (
                    <p className="text-xs p-2 text-muted-foreground italic">No templates yet.</p>
                  )}
                  {templates.map((t) => (
                    <div key={t.id} className="rounded border bg-card p-2">
                      <p className="text-xs font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.stops.length} stops · {t.preferredStartTime}</p>
                      <div className="flex gap-1 mt-1">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setGenerateFromTemplateId(t.id); setGenerateForm(f => ({ ...f, date: selectedDate, startTime: t.preferredStartTime ?? "08:00", assignedUserId: t.defaultAssignedUserId ?? "" })); setGenerateOpen(true); }}>
                          <Copy className="w-3 h-3 mr-1" /> Generate
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => deleteTemplate.mutate(t.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex gap-0 overflow-hidden">

        {/* Unscheduled Tasks panel */}
        <div className="w-80 border-r flex flex-col shrink-0">
          <div className="p-3 border-b bg-muted/10">
            <p className="font-medium text-sm">Unscheduled Tasks</p>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedDate} · {selectedUserId !== "all" ? users.find((u: any) => u.id === selectedUserId)?.firstName ?? "Staff" : "All staff"}</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {unscheduledTasks.length === 0 && (
                <p className="text-xs text-muted-foreground italic p-3 text-center">No unscheduled tasks found.</p>
              )}
              {unscheduledTasks.map((task: any) => (
                <div key={task.id} className="rounded-lg border bg-card p-3 space-y-1">
                  <p className="text-sm font-medium leading-tight">{task.title}</p>
                  {task.property && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {task.property.name}
                    </p>
                  )}
                  {task.property?.address1 && (
                    <p className="text-xs text-muted-foreground pl-4">{task.property.address1}, {task.property.city}</p>
                  )}
                  {task.dueDate && (
                    <p className="text-xs text-muted-foreground">Due {format(new Date(task.dueDate), "MMM d")}</p>
                  )}
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs mt-1" disabled={!activeItineraryId || updateStops.isPending} onClick={() => addTaskToItinerary(task)}>
                    <Plus className="w-3 h-3 mr-1" /> Add to Itinerary
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Active Itinerary panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeItinerary && !activeLoading && (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <LayoutList className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground mb-4">Select an itinerary from the sidebar or create a new one.</p>
                <Button onClick={() => { setNewItineraryForm(f => ({ ...f, date: selectedDate, startTime, assignedUserId: selectedUserId !== "all" ? selectedUserId : "" })); setNewItineraryOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> New Itinerary
                </Button>
              </div>
            </div>
          )}

          {activeLoading && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          )}

          {itin && !activeLoading && (
            <>
              {/* Itinerary header */}
              <div className="border-b p-4 bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-lg">{itin.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge status={itin.status} />
                      <span className="text-sm text-muted-foreground">{format(parseISO(itin.date), "EEEE, MMM d, yyyy")}</span>
                      <span className="text-sm text-muted-foreground">· Start {itin.startTime}</span>
                    </div>
                    {itin.needsCalendarSync && (
                      <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Itinerary has unpublished changes — re-publish to sync the calendar.
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    {itin.status === "published" && (
                      <Button size="sm" variant="outline" onClick={() => markCompleted.mutate(itin.id)} disabled={markCompleted.isPending}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Completed
                      </Button>
                    )}
                    {itin.status !== "completed" && (
                      <Button size="sm" variant="outline" onClick={() => { setSaveTemplateForm(f => ({ ...f, preferredStartTime: itin.startTime })); setSaveTemplateOpen(true); }}>
                        <Save className="w-4 h-4 mr-1" /> Save as Template
                      </Button>
                    )}
                    {itin.status !== "completed" && (
                      <Button size="sm" onClick={() => publishItinerary.mutate(itin.id)} disabled={publishItinerary.isPending}>
                        <Send className="w-4 h-4 mr-1" />
                        {itin.status === "published" ? "Re-publish" : "Publish to Calendar"}
                      </Button>
                    )}
                    {itin.status === "published" && (
                      <Button size="sm" variant="ghost" onClick={() => window.location.href = "/calendar"}>
                        <Calendar className="w-4 h-4 mr-1" /> View Calendar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete this itinerary?")) deleteItinerary.mutate(itin.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Totals bar */}
                {(() => {
                  const completedStops = (itin.stops ?? []).filter(s => s.actualWorkMinutes != null);
                  const actualTotal = completedStops.reduce((sum, s) => sum + (s.actualWorkMinutes ?? 0), 0);
                  return (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 pt-3 border-t text-sm">
                      <div><span className="text-muted-foreground">Est. work: </span><strong>{formatMinutes(itin.totalWorkMinutes)}</strong></div>
                      {completedStops.length > 0 && (
                        <div className="flex items-center gap-1 text-teal-700 dark:text-teal-400">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-muted-foreground">Actual: </span><strong>{formatMinutes(actualTotal)}</strong>
                          <span className="text-xs text-muted-foreground">({completedStops.length}/{itin.stops?.length ?? 0} stops)</span>
                        </div>
                      )}
                      <div><span className="text-muted-foreground">Travel: </span><strong>{formatMinutes(itin.totalTravelMinutes)}</strong></div>
                      <div><span className="text-muted-foreground">Buffer: </span><strong>{formatMinutes(itin.totalBufferMinutes)}</strong></div>
                      <div><span className="text-muted-foreground">Total day: </span><strong>{formatMinutes(itin.totalDayMinutes)}</strong></div>
                      <div><span className="text-muted-foreground">Stops: </span><strong>{itin.stops?.length ?? 0}</strong></div>
                    </div>
                  );
                })()}
              </div>

              {/* Stops list */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {(!itin.stops || itin.stops.length === 0) && (
                    <div className="text-center py-12 text-muted-foreground">
                      <MapPin className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No stops yet. Add tasks from the Unscheduled Tasks panel.</p>
                    </div>
                  )}
                  {(itin.stops ?? []).map((stop, idx) => {
                    const isEditing = editingStopId === (stop.id ?? String(idx));
                    const propName = stop.property?.name ?? (stop.propertyId ? `Property #${stop.propertyId}` : null);
                    const address = stop.property ? [stop.property.address1, stop.property.city, stop.property.state].filter(Boolean).join(", ") : null;
                    const taskTitle = stop.task?.title ?? (stop.taskId ? `Task #${stop.taskId}` : null);

                    return (
                      <Card key={stop.id ?? idx} className="relative">
                        <CardContent className="p-4">
                          {/* Stop header row */}
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                              <span className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 flex items-center justify-center text-sm font-semibold">{idx + 1}</span>
                              {idx > 0 && stop.travelMinutesFromPrevious > 0 && (
                                <span className="text-[10px] text-muted-foreground leading-tight text-center">{stop.travelMinutesFromPrevious}m<br/>drive</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  {propName && <p className="font-medium text-sm">{propName}</p>}
                                  {address && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" />{address}</p>}
                                  {taskTitle && <p className="text-xs mt-1 text-muted-foreground">Task: {taskTitle}</p>}
                                  {stop.serviceType && <p className="text-xs mt-0.5 text-muted-foreground">Service: {stop.serviceType}</p>}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={idx === 0} onClick={() => moveStop(idx, -1)}><ArrowUp className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={idx === (itin.stops?.length ?? 0) - 1} onClick={() => moveStop(idx, 1)}><ArrowDown className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingStopId(isEditing ? null : (stop.id ?? String(idx)))}><Pencil className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => stop.id && deleteStop.mutate({ itinId: itin.id, stopId: stop.id })}><X className="w-3 h-3" /></Button>
                                </div>
                              </div>

                              {/* Time info */}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(stop.scheduledStart)} – {formatTime(stop.scheduledEnd)}</span>
                                {stop.actualWorkMinutes != null ? (
                                  <span className="flex items-center gap-1 text-teal-600 font-medium">
                                    <CheckCircle2 className="w-3 h-3" />{stop.actualWorkMinutes}m actual
                                    <span className="text-muted-foreground font-normal">(est. {formatMinutes(stop.estimatedWorkMinutes)})</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">{formatMinutes(stop.estimatedWorkMinutes)} est.</span>
                                )}
                                {stop.actualStartedAt && !stop.actualCompletedAt && (
                                  <ElapsedTimer startedAt={stop.actualStartedAt} />
                                )}
                                {stop.bufferMinutes > 0 && <span className="text-muted-foreground">+{stop.bufferMinutes}m buffer</span>}
                                {stop.calendarEventId && <span className="text-teal-600 flex items-center gap-1"><Calendar className="w-3 h-3" /> On calendar</span>}
                              </div>

                              {/* Clock-in / Clock-out actions */}
                              {stop.id && (itin.status === "published" || itin.status === "in_progress") && stop.status !== "completed" && (
                                <div className="flex gap-2 mt-2">
                                  {!stop.actualStartedAt ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400"
                                      disabled={startStop.isPending}
                                      onClick={() => startStop.mutate({ itinId: itin.id, stopId: stop.id! })}
                                    >
                                      <Play className="w-3 h-3 mr-1" /> Start
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                                      disabled={completeStop.isPending}
                                      onClick={() => completeStop.mutate({ itinId: itin.id, stopId: stop.id! })}
                                    >
                                      <Square className="w-3 h-3 mr-1" /> Complete
                                    </Button>
                                  )}
                                </div>
                              )}

                              {stop.notes && !isEditing && <p className="text-xs text-muted-foreground mt-2 italic">"{stop.notes}"</p>}
                            </div>
                          </div>

                          {/* Inline editor */}
                          {isEditing && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Work time (min)</Label>
                                <Input type="number" min={5} value={stop.estimatedWorkMinutes} className="h-8 mt-1" onChange={e => updateStopField(idx, "estimatedWorkMinutes", parseInt(e.target.value) || 60)} />
                                {timeSuggestion && (
                                  <button
                                    type="button"
                                    className="mt-1 text-[11px] text-teal-600 hover:text-teal-800 flex items-center gap-1"
                                    onClick={() => updateStopField(idx, "estimatedWorkMinutes", timeSuggestion.suggestedMinutes)}
                                  >
                                    <TrendingUp className="w-3 h-3" />
                                    Avg: {timeSuggestion.suggestedMinutes}m ({timeSuggestion.sampleCount} visits) — apply
                                  </button>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs">Travel from prev (min)</Label>
                                <Input type="number" min={0} value={stop.travelMinutesFromPrevious} className="h-8 mt-1" onChange={e => updateStopField(idx, "travelMinutesFromPrevious", parseInt(e.target.value) || 0)} />
                              </div>
                              <div>
                                <Label className="text-xs">Buffer (min)</Label>
                                <Input type="number" min={0} value={stop.bufferMinutes} className="h-8 mt-1" onChange={e => updateStopField(idx, "bufferMinutes", parseInt(e.target.value) || 0)} />
                              </div>
                              <div className="col-span-3">
                                <Label className="text-xs">Notes</Label>
                                <Textarea value={stop.notes ?? ""} rows={2} className="mt-1 text-xs" onChange={e => updateStopField(idx, "notes", e.target.value)} placeholder="Add notes…" />
                              </div>
                              <div className="col-span-3 flex justify-end">
                                <Button size="sm" variant="outline" onClick={() => setEditingStopId(null)}>Done</Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      {/* New Itinerary dialog */}
      <Dialog open={newItineraryOpen} onOpenChange={setNewItineraryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Daily Itinerary</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={newItineraryForm.name} onChange={e => setNewItineraryForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tuesday Coastal Itinerary" className="mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={newItineraryForm.date} onChange={e => setNewItineraryForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={newItineraryForm.startTime} onChange={e => setNewItineraryForm(f => ({ ...f, startTime: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={newItineraryForm.assignedUserId || "unassigned"} onValueChange={v => setNewItineraryForm(f => ({ ...f, assignedUserId: v === "unassigned" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewItineraryOpen(false)}>Cancel</Button>
            <Button disabled={!newItineraryForm.name || !newItineraryForm.date || createItinerary.isPending} onClick={() => createItinerary.mutate({ name: newItineraryForm.name, date: newItineraryForm.date, startTime: newItineraryForm.startTime, assignedUserId: newItineraryForm.assignedUserId || null })}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Save as Itinerary Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Template Name</Label>
              <Input value={saveTemplateForm.name} onChange={e => setSaveTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tuesday Coastal Itinerary" className="mt-1" />
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={saveTemplateForm.description} onChange={e => setSaveTemplateForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Preferred Start Time</Label>
              <Input type="time" value={saveTemplateForm.preferredStartTime} onChange={e => setSaveTemplateForm(f => ({ ...f, preferredStartTime: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
            <Button
              disabled={!saveTemplateForm.name || createTemplate.isPending}
              onClick={() => {
                if (!itin) return;
                createTemplate.mutate({
                  name: saveTemplateForm.name,
                  description: saveTemplateForm.description,
                  preferredStartTime: saveTemplateForm.preferredStartTime,
                  stops: (itin.stops ?? []).map(s => ({
                    propertyId: s.propertyId ?? null,
                    taskId: s.taskId ?? null,
                    estimatedWorkMinutes: s.estimatedWorkMinutes,
                    travelMinutesFromPrevious: s.travelMinutesFromPrevious,
                    bufferMinutes: s.bufferMinutes,
                    notes: s.notes ?? null,
                    serviceType: (s as any).serviceType ?? null,
                  })),
                });
              }}
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate from Template dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Generate Daily Itinerary</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">Creates a new itinerary from the template. Changes to the itinerary will not affect the template.</p>
          <div className="space-y-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={generateForm.date} onChange={e => setGenerateForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={generateForm.startTime} onChange={e => setGenerateForm(f => ({ ...f, startTime: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={generateForm.assignedUserId || "unassigned"} onValueChange={v => setGenerateForm(f => ({ ...f, assignedUserId: v === "unassigned" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button
              disabled={!generateForm.date || !generateFromTemplateId || generateFromTemplate.isPending}
              onClick={() => generateFromTemplate.mutate({ templateId: generateFromTemplateId!, body: { date: generateForm.date, startTime: generateForm.startTime, assignedUserId: generateForm.assignedUserId || null } })}
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
