import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ClipboardCheck, Search, Calendar, User, Building, Filter,
  ExternalLink, RefreshCw, List, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  format, parseISO, isValid, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  isSameDay, isSameMonth, setMonth, setYear,
} from "date-fns";

function safeDateFormat(dateValue: any, fmt: string): string {
  if (!dateValue) return "—";
  try {
    const d = typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
    return isValid(d) ? format(d, fmt) : "—";
  } catch {
    return "—";
  }
}

function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  try {
    const d = typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

const FREQUENCY_COLORS: Record<string, string> = {
  weekly: "bg-blue-100 text-blue-800",
  monthly: "bg-green-100 text-green-800",
  quarterly: "bg-purple-100 text-purple-800",
  annually: "bg-orange-100 text-orange-800",
};

const PROPERTY_PALETTE = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
  "bg-orange-500",
  "bg-teal-500",
];

function buildCalendarWeeks(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let day = start;
  while (day <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function InspectionSchedules() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const [searchTerm, setSearchTerm] = useState("");
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterInspector, setFilterInspector] = useState("all");
  const [filterFrequency, setFilterFrequency] = useState("all");
  const [sortField, setSortField] = useState<"nextDueDate" | "property" | "frequency">("nextDueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: schedules = [], isLoading: schedulesLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/inspection-schedules"],
    enabled: isAuthenticated,
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/checklist-templates"],
    enabled: isAuthenticated,
  });

  const propertiesMap = useMemo(() => {
    const m: Record<number, any> = {};
    (properties as any[]).forEach((p: any) => { m[p.id] = p; });
    return m;
  }, [properties]);

  const usersMap = useMemo(() => {
    const m: Record<string, any> = {};
    (users as any[]).forEach((u: any) => { m[u.id] = u; });
    return m;
  }, [users]);

  const templatesMap = useMemo(() => {
    const m: Record<string, any> = {};
    (templates as any[]).forEach((t: any) => { m[t.id] = t; });
    return m;
  }, [templates]);

  const uniquePropertyIds = useMemo(() => {
    const ids = new Set<number>();
    (schedules as any[]).forEach((s: any) => ids.add(s.propertyId));
    return Array.from(ids);
  }, [schedules]);

  const uniqueInspectorIds = useMemo(() => {
    const ids = new Set<string>();
    (schedules as any[]).forEach((s: any) => { if (s.inspectorUserId) ids.add(s.inspectorUserId); });
    return Array.from(ids);
  }, [schedules]);

  const propertyColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    uniquePropertyIds.forEach((pid, i) => {
      m[pid] = PROPERTY_PALETTE[i % PROPERTY_PALETTE.length];
    });
    return m;
  }, [uniquePropertyIds]);

  const filtered = useMemo(() => {
    let result = (schedules as any[]).filter((s: any) => {
      const prop = propertiesMap[s.propertyId];
      const propName = prop ? `${prop.name} ${prop.address1 || ""}`.toLowerCase() : "";
      const inspector = s.inspectorUserId ? usersMap[s.inspectorUserId] : null;
      const inspectorName = inspector ? `${inspector.firstName || ""} ${inspector.lastName || ""}`.toLowerCase() : "";
      const matchSearch = !searchTerm || propName.includes(searchTerm.toLowerCase()) || inspectorName.includes(searchTerm.toLowerCase());
      const matchProperty = filterProperty === "all" || s.propertyId === parseInt(filterProperty);
      const matchInspector = filterInspector === "all" || s.inspectorUserId === filterInspector;
      const matchFrequency = filterFrequency === "all" || s.frequency === filterFrequency;
      return matchSearch && matchProperty && matchInspector && matchFrequency;
    });

    result.sort((a: any, b: any) => {
      let valA: string, valB: string;
      if (sortField === "nextDueDate") {
        valA = a.nextDueDate || "";
        valB = b.nextDueDate || "";
      } else if (sortField === "property") {
        valA = (propertiesMap[a.propertyId]?.name || "").toLowerCase();
        valB = (propertiesMap[b.propertyId]?.name || "").toLowerCase();
      } else {
        valA = a.frequency || "";
        valB = b.frequency || "";
      }
      const cmp = valA.localeCompare(valB);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [schedules, searchTerm, filterProperty, filterInspector, filterFrequency, sortField, sortDir, propertiesMap, usersMap]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIndicator = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-slate-600 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const calendarWeeks = useMemo(() => buildCalendarWeeks(calendarMonth), [calendarMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((s: any) => {
      const d = parseDate(s.nextDueDate);
      if (!d) return;
      const key = format(d, "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [filtered]);

  const filteredPropertyIds = useMemo(() => {
    const ids = new Set<number>();
    filtered.forEach((s: any) => ids.add(s.propertyId));
    return Array.from(ids);
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inspection Schedules</h1>
            <p className="text-sm text-slate-500">All recurring inspection schedules across your portfolio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 h-9"
              onClick={() => setViewMode("list")}
              data-testid="btn-view-list"
            >
              <List className="w-4 h-4 mr-1" /> List
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 h-9"
              onClick={() => setViewMode("calendar")}
              data-testid="btn-view-calendar"
            >
              <Calendar className="w-4 h-4 mr-1" /> Calendar
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="btn-refresh-schedules">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by property or inspector..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-schedules"
              />
            </div>

            <Select value={filterProperty} onValueChange={setFilterProperty}>
              <SelectTrigger className="w-48" data-testid="select-filter-property">
                <Building className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {uniquePropertyIds.map(pid => (
                  <SelectItem key={pid} value={pid.toString()}>
                    {propertiesMap[pid]?.name || `Property ${pid}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterInspector} onValueChange={setFilterInspector}>
              <SelectTrigger className="w-48" data-testid="select-filter-inspector">
                <User className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="All Inspectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Inspectors</SelectItem>
                {uniqueInspectorIds.map(uid => (
                  <SelectItem key={uid} value={uid}>
                    {usersMap[uid] ? `${usersMap[uid].firstName || ""} ${usersMap[uid].lastName || ""}`.trim() : uid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterFrequency} onValueChange={setFilterFrequency}>
              <SelectTrigger className="w-44" data-testid="select-filter-frequency">
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="All Frequencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>

            {(filterProperty !== "all" || filterInspector !== "all" || filterFrequency !== "all" || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterProperty("all"); setFilterInspector("all"); setFilterFrequency("all"); setSearchTerm(""); }}
                data-testid="btn-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
        <Filter className="w-4 h-4" />
        <span>Showing <strong>{filtered.length}</strong> of <strong>{schedules.length}</strong> schedules</span>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            {schedulesLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No inspection schedules found</p>
                <p className="text-slate-400 text-sm mt-1">
                  {schedules.length === 0
                    ? "Add inspection schedules from any property profile."
                    : "Try adjusting your filters."}
                </p>
              </div>
            ) : (
              <Table data-testid="table-inspection-schedules">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort("property")}
                      data-testid="th-property"
                    >
                      Property <SortIndicator field="property" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort("frequency")}
                      data-testid="th-frequency"
                    >
                      Frequency <SortIndicator field="frequency" />
                    </TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort("nextDueDate")}
                      data-testid="th-next-due"
                    >
                      Next Due Date <SortIndicator field="nextDueDate" />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((schedule: any) => {
                    const prop = propertiesMap[schedule.propertyId];
                    const inspector = schedule.inspectorUserId ? usersMap[schedule.inspectorUserId] : null;
                    const template = schedule.templateId ? templatesMap[schedule.templateId] : null;
                    return (
                      <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                        <TableCell>
                          <div className="font-medium text-slate-900">{prop?.name || `Property ${schedule.propertyId}`}</div>
                          {prop?.address1 && (
                            <div className="text-xs text-slate-500">{prop.address1}{prop.city ? `, ${prop.city}` : ""}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${FREQUENCY_COLORS[schedule.frequency] || "bg-slate-100 text-slate-800"} font-medium`}>
                            {FREQUENCY_LABELS[schedule.frequency] || schedule.frequency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inspector
                            ? <span className="text-slate-700">{`${inspector.firstName || ""} ${inspector.lastName || ""}`.trim()}</span>
                            : <span className="text-slate-400 italic text-sm">Unassigned</span>}
                        </TableCell>
                        <TableCell>
                          {template
                            ? <span className="text-slate-700">{template.name}</span>
                            : <span className="text-slate-400 italic text-sm">No template</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700 font-medium">
                              {safeDateFormat(schedule.nextDueDate, "MMM d, yyyy")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={schedule.isActive ? "default" : "secondary"}>
                            {schedule.isActive ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/property-profile/${schedule.propertyId}?tab=inspections`)}
                            data-testid={`btn-view-property-${schedule.id}`}
                            title="View property"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Calendar View */
        <div data-testid="calendar-view">
          <Card>
            <CardContent className="p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCalendarMonth(m => subMonths(m, 1))}
                    data-testid="btn-cal-prev-month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-lg font-semibold text-slate-800 min-w-[160px] text-center" data-testid="cal-month-label">
                    {format(calendarMonth, "MMMM yyyy")}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCalendarMonth(m => addMonths(m, 1))}
                    data-testid="btn-cal-next-month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(calendarMonth.getMonth())}
                    onValueChange={val => setCalendarMonth(m => setMonth(m, parseInt(val)))}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-sm" data-testid="select-cal-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["January","February","March","April","May","June","July","August","September","October","November","December"].map((name, idx) => (
                        <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(calendarMonth.getFullYear())}
                    onValueChange={val => setCalendarMonth(m => setYear(m, parseInt(val)))}
                  >
                    <SelectTrigger className="w-[90px] h-8 text-sm" data-testid="select-cal-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map(yr => (
                        <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-sm"
                    onClick={() => setCalendarMonth(new Date())}
                    data-testid="btn-cal-today"
                  >
                    Today
                  </Button>
                </div>
              </div>

              {schedulesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                      <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <TooltipProvider delayDuration={300}>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {calendarWeeks.map((week, wi) => (
                      <div key={wi} className="grid grid-cols-7 divide-x divide-slate-200">
                        {week.map((day, di) => {
                          const dateKey = format(day, "yyyy-MM-dd");
                          const dayEvents = eventsByDate[dateKey] || [];
                          const isCurrentMonth = isSameMonth(day, calendarMonth);
                          const isToday = isSameDay(day, new Date());

                          return (
                            <div
                              key={di}
                              className={`min-h-[100px] p-1.5 ${wi < calendarWeeks.length - 1 ? "border-b border-slate-200" : ""} ${isCurrentMonth ? "bg-white" : "bg-slate-50"}`}
                              data-testid={`cal-day-${dateKey}`}
                            >
                              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : isCurrentMonth ? "text-slate-700" : "text-slate-300"}`}>
                                {format(day, "d")}
                              </div>
                              <div className="space-y-0.5">
                                {dayEvents.map((s: any) => {
                                  const prop = propertiesMap[s.propertyId];
                                  const propName = prop?.name || `Property ${s.propertyId}`;
                                  const color = propertyColorMap[s.propertyId] || PROPERTY_PALETTE[0];
                                  const inspector = s.inspectorUserId ? usersMap[s.inspectorUserId] : null;
                                  const inspectorName = inspector
                                    ? `${inspector.firstName || ""} ${inspector.lastName || ""}`.trim() || "Unassigned"
                                    : "Unassigned";
                                  const template = s.templateId ? templatesMap[s.templateId] : null;
                                  const templateName = template?.name || "No template";
                                  return (
                                    <Tooltip key={s.id}>
                                      <TooltipTrigger asChild>
                                        <button
                                          className={`w-full text-left text-white text-xs rounded px-1.5 py-0.5 truncate ${color} hover:opacity-80 transition-opacity cursor-pointer`}
                                          onClick={() => setLocation(`/property-profile/${s.propertyId}?tab=inspections`)}
                                          data-testid={`cal-event-${s.id}`}
                                        >
                                          {propName}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[220px] p-3 space-y-1.5">
                                        <p className="font-semibold text-sm leading-tight">{propName}</p>
                                        <div className="text-xs space-y-1 text-muted-foreground">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-foreground">Frequency:</span>
                                            {FREQUENCY_LABELS[s.frequency] || s.frequency}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-foreground">Inspector:</span>
                                            {inspectorName}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-foreground">Template:</span>
                                            {templateName}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-foreground">Status:</span>
                                            <span className={s.isActive ? "text-green-600" : "text-slate-500"}>
                                              {s.isActive ? "Active" : "Paused"}
                                            </span>
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  </TooltipProvider>

                  {/* Legend — only shows properties in the current filtered result */}
                  {filteredPropertyIds.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {filteredPropertyIds.map(pid => {
                        const prop = propertiesMap[pid];
                        if (!prop) return null;
                        const color = propertyColorMap[pid] || PROPERTY_PALETTE[0];
                        return (
                          <div key={pid} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-sm ${color}`} />
                            <span className="text-xs text-slate-600">{prop.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
