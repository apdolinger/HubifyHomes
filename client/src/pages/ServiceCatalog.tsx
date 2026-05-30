import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  Plus, Pencil, Trash2, Tag, DollarSign, Clock, RefreshCw,
  CheckCircle2, XCircle, ChevronDown, Briefcase, Building, ExternalLink,
  ListChecks, Search, MinusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest } from "@/lib/queryClient";
import type { OrganizationService } from "@shared/schema";

// ── Service property assignment popover ───────────────────────────────────────
function ServicePropertyBadge({ serviceId, count }: { serviceId: number; count: number }) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: assignments = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/admin/services/${serviceId}/assignments`],
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className="text-xs border-blue-200 text-blue-700 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
        >
          <Building className="w-2.5 h-2.5 mr-1" />
          {count} {count === 1 ? "property" : "properties"}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="text-xs font-semibold text-slate-700 mb-2">
          Assigned to {count} {count === 1 ? "property" : "properties"}
        </p>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : (assignments as any[]).length === 0 ? (
          <p className="text-xs text-slate-400">No active assignments found.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(assignments as any[]).map((a: any) => {
              const isCustomPrice = a.customPriceCents != null;
              const priceCents: number | null = isCustomPrice ? a.customPriceCents : (a.serviceDefaultPriceCents ?? null);
              const priceLabel = priceCents != null
                ? `$${(priceCents / 100).toFixed(2)}`
                : null;
              return (
                <button
                  key={a.id}
                  onClick={() => { setOpen(false); navigate(`/properties/${a.propertyId}`); }}
                  className="w-full text-left px-2 py-2 rounded hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-slate-800 truncate flex-1 mr-2 font-medium">
                      {a.propertyName || `Property #${a.propertyId}`}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-xs font-medium ${a.status === "active" ? "text-emerald-600" : a.status === "paused" ? "text-yellow-600" : "text-slate-400"}`}>
                        {a.status}
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {a.startDate && (
                      <span className="text-xs text-slate-500">
                        From {new Date(a.startDate).toLocaleDateString()}
                      </span>
                    )}
                    {priceLabel && (
                      <span className={`text-xs ${isCustomPrice ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                        {priceLabel}
                        {!isCustomPrice && <span className="ml-0.5 text-slate-400">(catalog rate)</span>}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Bulk-assign modal ─────────────────────────────────────────────────────────
function BulkAssignModal({
  service,
  open,
  onOpenChange,
}: {
  service: OrganizationService | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [billingFrequency, setBillingFrequency] = useState("");
  const [progress, setProgress] = useState<{ processed: number; total: number; created: number; skipped: number; failed: number } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const { data: properties = [], isLoading: propsLoading } = useQuery<any[]>({
    queryKey: ["/api/properties"],
    enabled: open,
  });

  const { data: existingAssignments = [] } = useQuery<any[]>({
    queryKey: [`/api/admin/services/${service?.id}/assignments`],
    enabled: open && !!service,
  });

  const alreadyAssigned = new Set(existingAssignments.map((a: any) => a.propertyId));

  const filtered = properties.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.address?.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const unassignedIds = filtered.filter((p: any) => !alreadyAssigned.has(p.id)).map((p: any) => p.id);
    const allSelected = unassignedIds.every(id => selected.has(id));
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        unassignedIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        unassignedIds.forEach(id => next.add(id));
        return next;
      });
    }
  }

  function startBulkAssign() {
    if (!service || selected.size === 0) return;
    const params = new URLSearchParams();
    params.set("propertyIds", Array.from(selected).join(","));
    if (startDate) params.set("startDate", startDate);
    if (customPrice) params.set("customPriceCents", String(Math.round(parseFloat(customPrice) * 100)));
    if (billingFrequency) params.set("billingFrequencyOverride", billingFrequency);
    const url = `/api/admin/services/${service.id}/bulk-assign/progress?${params.toString()}`;
    const es = new EventSource(url);
    esRef.current = es;
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.error) {
        es.close();
        esRef.current = null;
        setProgress(null);
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setProgress({ processed: data.processed, total: data.total, created: data.created, skipped: data.skipped, failed: data.failed });
      if (data.done) {
        es.close();
        esRef.current = null;
        queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/services/${service.id}/assignments`] });
        const { created = 0, skipped = 0, failed = 0, createdIds = [] } = data;
        const parts: string[] = [];
        if (skipped > 0) parts.push(`${skipped} already assigned — skipped`);
        if (failed > 0) parts.push(`${failed} failed`);
        toast({
          title: created > 0
            ? `Assigned to ${created} ${created === 1 ? "property" : "properties"}`
            : "No new assignments made",
          description: parts.length > 0 ? parts.join(" · ") : undefined,
          ...(created > 0 && createdIds.length > 0 ? {
            action: (
              <ToastAction altText="Undo" onClick={async () => {
                try {
                  const result = await apiRequest("POST", `/api/admin/services/${service.id}/bulk-unassign`, { propertyIds: createdIds });
                  const { removed = 0 } = await result.json();
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
                  queryClient.invalidateQueries({ queryKey: [`/api/admin/services/${service.id}/assignments`] });
                  toast({
                    title: removed > 0
                      ? `Removed ${removed} ${removed === 1 ? "assignment" : "assignments"}`
                      : "Nothing to undo",
                  });
                } catch {
                  toast({ title: "Undo failed", variant: "destructive" });
                }
              }}>Undo</ToastAction>
            ),
          } : {}),
        });
        setProgress(null);
        setSelected(new Set());
        onOpenChange(false);
      }
    };
    es.onerror = () => {
      es.close();
      esRef.current = null;
      setProgress(null);
      toast({ title: "Error", description: "Failed to assign service", variant: "destructive" });
    };
  }

  function handleClose() {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setProgress(null);
    setSelected(new Set());
    setSearch("");
    setStartDate("");
    setCustomPrice("");
    setBillingFrequency("");
    onOpenChange(false);
  }

  const isAssigning = progress !== null;

  const unassignedFiltered = filtered.filter((p: any) => !alreadyAssigned.has(p.id));
  const allUnassignedSelected =
    unassignedFiltered.length > 0 && unassignedFiltered.every((p: any) => selected.has(p.id));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-teal-600" />
            Assign to Properties
          </DialogTitle>
          {service && (
            <p className="text-sm text-slate-500 mt-1">
              Assigning <strong>{service.name}</strong> to selected properties
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search properties…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Select-all row */}
          {!propsLoading && unassignedFiltered.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                id="select-all"
                checked={allUnassignedSelected}
                onCheckedChange={toggleAll}
              />
              <label htmlFor="select-all" className="text-xs text-slate-500 cursor-pointer select-none">
                Select all unassigned ({unassignedFiltered.length})
              </label>
            </div>
          )}

          {/* Property list */}
          <ScrollArea className="h-72 rounded-md border">
            {propsLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400 text-sm">
                <Building className="w-8 h-8 mb-2 opacity-40" />
                {search ? "No properties match your search." : "No properties in your organization."}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map((property: any) => {
                  const isAssigned = alreadyAssigned.has(property.id);
                  const isChecked = selected.has(property.id);
                  return (
                    <label
                      key={property.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                        isAssigned
                          ? "opacity-50 cursor-not-allowed bg-slate-50"
                          : isChecked
                          ? "bg-teal-50 border border-teal-200"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <Checkbox
                        checked={isAssigned || isChecked}
                        disabled={isAssigned}
                        onCheckedChange={() => !isAssigned && toggle(property.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{property.name}</p>
                        {property.address && (
                          <p className="text-xs text-slate-400 truncate">{property.address}</p>
                        )}
                      </div>
                      {isAssigned && (
                        <span className="text-xs text-emerald-600 font-medium flex-shrink-0">Already assigned</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Optional overrides */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Start Date <span className="text-slate-400 font-normal">(optional)</span></label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Custom Price <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  className="pl-6 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-slate-600">Billing Frequency <span className="text-slate-400 font-normal">(optional)</span></label>
              <Select value={billingFrequency} onValueChange={setBillingFrequency}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Use service default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                  <SelectItem value="per_visit">Per Visit</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isAssigning && progress ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="text-teal-700 font-medium">
                  {progress.processed} of {progress.total} processed
                </span>
                <span className="flex gap-2">
                  {progress.created > 0 && <span className="text-emerald-600">{progress.created} assigned</span>}
                  {progress.skipped > 0 && <span className="text-slate-400">{progress.skipped} skipped</span>}
                  {progress.failed > 0 && <span className="text-red-500">{progress.failed} failed</span>}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-200"
                  style={{ width: progress.total > 0 ? `${Math.round((progress.processed / progress.total) * 100)}%` : "0%" }}
                />
              </div>
              <p className="text-xs text-slate-400 text-center">
                {Math.round((progress.processed / progress.total) * 100)}% complete
              </p>
            </div>
          ) : selected.size > 0 ? (
            <p className="text-sm text-teal-700 font-medium text-center">
              {selected.size} {selected.size === 1 ? "property" : "properties"} selected
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isAssigning}>Cancel</Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            disabled={selected.size === 0 || isAssigning}
            onClick={startBulkAssign}
          >
            {isAssigning
              ? "Assigning…"
              : `Assign to ${selected.size} ${selected.size === 1 ? "property" : "properties"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk-remove modal ─────────────────────────────────────────────────────────
function BulkRemoveModal({
  service,
  open,
  onOpenChange,
}: {
  service: OrganizationService | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<any[]>({
    queryKey: [`/api/admin/services/${service?.id}/assignments`],
    enabled: open && !!service,
  });

  const filtered = assignments.filter((a: any) =>
    (a.propertyName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const allIds = filtered.map((a: any) => a.propertyId);
    const allSelected = allIds.every(id => selected.has(id));
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        allIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        allIds.forEach(id => next.add(id));
        return next;
      });
    }
  }

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/services/${service!.id}/bulk-remove`, {
        propertyIds: Array.from(selected),
      });
      return res.json() as Promise<{ removed: number; notFound: number; failed: number }>;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/services/${service!.id}/assignments`] });
      const { removed = 0, notFound = 0, failed = 0 } = data ?? {};
      const parts: string[] = [];
      if (notFound > 0) parts.push(`${notFound} not found — skipped`);
      if (failed > 0) parts.push(`${failed} failed`);
      toast({
        title: removed > 0
          ? `Removed from ${removed} ${removed === 1 ? "property" : "properties"}`
          : "No assignments removed",
        description: parts.length > 0 ? parts.join(" · ") : undefined,
      });
      setSelected(new Set());
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove service assignments", variant: "destructive" });
    },
  });

  function handleClose() {
    setSelected(new Set());
    setSearch("");
    onOpenChange(false);
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((a: any) => selected.has(a.propertyId));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MinusCircle className="w-5 h-5 text-red-500" />
            Remove from Properties
          </DialogTitle>
          {service && (
            <p className="text-sm text-slate-500 mt-1">
              Remove <strong>{service.name}</strong> from selected properties
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search assigned properties…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Select-all row */}
          {!assignmentsLoading && filtered.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                id="remove-select-all"
                checked={allFilteredSelected}
                onCheckedChange={toggleAll}
              />
              <label htmlFor="remove-select-all" className="text-xs text-slate-500 cursor-pointer select-none">
                Select all ({filtered.length})
              </label>
            </div>
          )}

          {/* Assignment list */}
          <ScrollArea className="h-72 rounded-md border">
            {assignmentsLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400 text-sm">
                <Building className="w-8 h-8 mb-2 opacity-40" />
                This service is not assigned to any properties.
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400 text-sm">
                <Building className="w-8 h-8 mb-2 opacity-40" />
                No properties match your search.
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map((assignment: any) => {
                  const isChecked = selected.has(assignment.propertyId);
                  return (
                    <label
                      key={assignment.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-red-50 border border-red-200"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggle(assignment.propertyId)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {assignment.propertyName || `Property #${assignment.propertyId}`}
                        </p>
                      </div>
                      <span className={`text-xs font-medium flex-shrink-0 ${
                        assignment.status === "active" ? "text-emerald-600" :
                        assignment.status === "paused" ? "text-yellow-600" : "text-slate-400"
                      }`}>
                        {assignment.status}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {removeMutation.isPending ? (
            <div className="space-y-2 pt-1">
              <p className="text-sm text-red-600 font-medium text-center">
                Removing from {selected.size} {selected.size === 1 ? "property" : "properties"}…
              </p>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full w-1/3 bg-red-400 rounded-full"
                  style={{ animation: "progress-indeterminate 1.4s ease-in-out infinite" }}
                />
              </div>
            </div>
          ) : selected.size > 0 ? (
            <p className="text-sm text-red-600 font-medium text-center">
              {selected.size} {selected.size === 1 ? "property" : "properties"} selected for removal
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={removeMutation.isPending}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={selected.size === 0 || removeMutation.isPending}
            onClick={() => removeMutation.mutate()}
          >
            {removeMutation.isPending
              ? "Removing…"
              : `Remove from ${selected.size} ${selected.size === 1 ? "property" : "properties"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BILLING_FREQUENCIES = [
  { value: "one_time", label: "One-time" },
  { value: "per_visit", label: "Per visit" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
  { value: "custom", label: "Custom" },
] as const;

const TASK_CATEGORIES = [
  { value: "maintenance", label: "Maintenance" },
  { value: "inspection", label: "Inspection" },
  { value: "cleaning", label: "Cleaning" },
  { value: "landscaping", label: "Landscaping" },
  { value: "administrative", label: "Administrative" },
  { value: "concierge", label: "Concierge" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
] as const;

const SERVICE_CATEGORIES = [
  "Home Watch",
  "Inspection",
  "Maintenance",
  "Concierge",
  "Cleaning",
  "Storm Services",
  "Vendor Coordination",
  "Administrative",
  "Other",
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  defaultPriceCents: z.coerce.number().int().min(0).optional().nullable(),
  billingFrequency: z.enum(["one_time", "weekly", "biweekly", "monthly", "quarterly", "annually", "per_visit", "custom"]).default("monthly"),
  isBillable: z.boolean().default(true),
  createsTasks: z.boolean().default(false),
  defaultTaskCategory: z.string().optional().nullable(),
  recurrenceRule: z.string().optional().nullable(),
  estimatedDurationMinutes: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function frequencyLabel(freq: string | null | undefined): string {
  return BILLING_FREQUENCIES.find(f => f.value === freq)?.label ?? freq ?? "—";
}

function ServiceFormDialog({
  open,
  onOpenChange,
  editingService,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingService?: OrganizationService | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editingService?.name ?? "",
      description: editingService?.description ?? "",
      category: editingService?.category ?? "",
      defaultPriceCents: editingService?.defaultPriceCents != null ? editingService.defaultPriceCents / 100 : undefined,
      billingFrequency: (editingService?.billingFrequency as FormValues["billingFrequency"]) ?? "monthly",
      isBillable: editingService?.isBillable ?? true,
      createsTasks: editingService?.createsTasks ?? false,
      defaultTaskCategory: editingService?.defaultTaskCategory ?? "",
      recurrenceRule: editingService?.recurrenceRule ?? "",
      estimatedDurationMinutes: editingService?.estimatedDurationMinutes ?? undefined,
      isActive: editingService?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        defaultPriceCents: values.defaultPriceCents != null ? Math.round(Number(values.defaultPriceCents) * 100) : null,
        description: values.description || null,
        category: values.category || null,
        defaultTaskCategory: values.defaultTaskCategory || null,
        recurrenceRule: values.recurrenceRule || null,
        estimatedDurationMinutes: values.estimatedDurationMinutes || null,
      };
      if (editingService) {
        return apiRequest("PATCH", `/api/admin/services/${editingService.id}`, payload);
      }
      return apiRequest("POST", "/api/admin/services", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      toast({ title: editingService ? "Service updated" : "Service created" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save service", variant: "destructive" });
    },
  });

  function onSubmit(values: FormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingService ? "Edit Service" : "Create Service"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Service Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Home Watch Visit" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="billingFrequency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BILLING_FREQUENCIES.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="defaultPriceCents" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Price ($)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="estimatedDurationMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Est. Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 60"
                      {...field}
                      value={field.value ?? ""}
                      onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Describe what this service includes…" rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
              <p className="text-sm font-medium text-slate-700">Billing & Task Options</p>

              <FormField control={form.control} name="isBillable" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Billable</FormLabel>
                    <FormDescription className="text-xs">This service generates a billing charge</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="createsTasks" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Creates Tasks</FormLabel>
                    <FormDescription className="text-xs">Will generate operational tasks when applied</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />

              {form.watch("createsTasks") && (
                <FormField control={form.control} name="defaultTaskCategory" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Task Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select task category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {form.watch("createsTasks") && (
                <FormField control={form.control} name="recurrenceRule" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence Rule</FormLabel>
                    <FormControl><Input placeholder="e.g. FREQ=WEEKLY;BYDAY=MO" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription className="text-xs">RFC5545 RRULE — used when auto-generating tasks</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Active</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : editingService ? "Save Changes" : "Create Service"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ServiceCatalog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<OrganizationService | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [bulkAssignService, setBulkAssignService] = useState<OrganizationService | null>(null);
  const [bulkRemoveService, setBulkRemoveService] = useState<OrganizationService | null>(null);

  const { data: services = [], isLoading } = useQuery<OrganizationService[]>({
    queryKey: ["/api/admin/services"],
  });

  const toggleMutation = useMutation({
    mutationFn: (service: OrganizationService) =>
      apiRequest("PATCH", `/api/admin/services/${service.id}`, { isActive: !service.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] }),
    onError: () => toast({ title: "Error", description: "Failed to update status", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      toast({ title: "Service deactivated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to deactivate service", variant: "destructive" }),
  });

  const categories = Array.from(new Set(services.map(s => s.category).filter(Boolean)));

  const filtered = services.filter(s => {
    const matchStatus = statusFilter === "all" ? true : statusFilter === "active" ? s.isActive : !s.isActive;
    const matchCat = categoryFilter === "all" ? true : s.category === categoryFilter;
    return matchStatus && matchCat;
  });

  function openCreate() {
    setEditingService(null);
    setDialogOpen(true);
  }

  function openEdit(service: OrganizationService) {
    setEditingService(service);
    setDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-teal-600" />
              Service Catalog
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Define the services your organization offers, how you charge for them, and how they connect to tasks.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c!} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(statusFilter !== "active" || categoryFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("active"); setCategoryFilter("all"); }}>
              Clear filters
            </Button>
          )}

          <span className="ml-auto text-sm text-slate-500">
            {filtered.length} service{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {services.length === 0 ? "No services yet" : "No services match your filters"}
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              {services.length === 0
                ? "Define the services your organization offers — like Home Watch Visits, Storm Checks, or Maintenance Coordination. These become the building blocks for billing and task automation."
                : "Try adjusting your filters to see more services."}
            </p>
            {services.length === 0 && (
              <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Create your first service
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(service => (
              <Card key={service.id} className={`border ${!service.isActive ? "opacity-60 bg-slate-50" : "bg-white"}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-900 text-base">{service.name}</h3>
                        {service.category && (
                          <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50">
                            <Tag className="w-2.5 h-2.5 mr-1" />
                            {service.category}
                          </Badge>
                        )}
                        {!service.isActive && (
                          <Badge variant="outline" className="text-xs border-slate-300 text-slate-500">Inactive</Badge>
                        )}
                        {(service as any).assignedPropertyCount > 0 && (
                          <ServicePropertyBadge
                            serviceId={service.id}
                            count={(service as any).assignedPropertyCount}
                          />
                        )}
                      </div>

                      {service.description && (
                        <p className="text-sm text-slate-500 mb-2 line-clamp-2">{service.description}</p>
                      )}

                      <div className="flex items-center gap-5 flex-wrap text-sm text-slate-600">
                        {service.isBillable && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-green-500" />
                            <strong>{formatPrice(service.defaultPriceCents)}</strong>
                            <span className="text-slate-400">/ {frequencyLabel(service.billingFrequency)}</span>
                          </span>
                        )}
                        {!service.isBillable && (
                          <span className="text-slate-400 text-xs italic">Non-billable</span>
                        )}
                        {service.estimatedDurationMinutes && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {service.estimatedDurationMinutes} min
                          </span>
                        )}
                        {service.createsTasks && (
                          <span className="flex items-center gap-1 text-teal-600">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Creates tasks
                            {service.defaultTaskCategory && <span className="text-slate-400">· {service.defaultTaskCategory}</span>}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300"
                        onClick={() => setBulkAssignService(service)}
                        title="Assign to multiple properties"
                      >
                        <ListChecks className="w-3.5 h-3.5 mr-1.5" />
                        Assign to Properties
                      </Button>
                      {(service as any).assignedPropertyCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                          onClick={() => setBulkRemoveService(service)}
                          title="Remove from properties"
                        >
                          <MinusCircle className="w-3.5 h-3.5 mr-1.5" />
                          Remove from Properties
                        </Button>
                      )}
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={() => toggleMutation.mutate(service)}
                        disabled={toggleMutation.isPending}
                        title={service.isActive ? "Deactivate" : "Activate"}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(service)}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(service.id)}
                        disabled={deleteMutation.isPending}
                        title="Deactivate service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ServiceFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingService(null);
        }}
        editingService={editingService}
      />

      <BulkAssignModal
        service={bulkAssignService}
        open={!!bulkAssignService}
        onOpenChange={(v) => { if (!v) setBulkAssignService(null); }}
      />

      <BulkRemoveModal
        service={bulkRemoveService}
        open={!!bulkRemoveService}
        onOpenChange={(v) => { if (!v) setBulkRemoveService(null); }}
      />
    </div>
  );
}
