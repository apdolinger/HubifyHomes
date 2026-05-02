import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, Building, ChevronRight, Loader2, ArrowRight, Camera, ListChecks, TrendingUp } from "lucide-react";
import { format, isToday, isPast, startOfDay, endOfDay } from "date-fns";

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "bg-green-100 text-green-700 border-green-200";
    case "in_progress": return "bg-blue-100 text-blue-700 border-blue-200";
    case "pending": return "bg-slate-100 text-slate-600 border-slate-200";
    case "cancelled": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "completed": return "Done";
    case "in_progress": return "In Progress";
    case "pending": return "Open";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

function getNextStatus(status: string): string | null {
  switch (status) {
    case "pending": return "in_progress";
    case "in_progress": return "completed";
    default: return null;
  }
}

function getNextStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Start";
    case "in_progress": return "Complete";
    default: return "";
  }
}

export default function FieldHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userId = (user as any)?.id;

  const { data: allTasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks?showArchived=false"],
    enabled: !!userId,
  });

  const { data: todaySummary } = useQuery<{
    tasksCompleted: number;
    tasksTotal: number;
    checklistPass: number;
    checklistFail: number;
    checklistNa: number;
    photosUploaded: number;
  }>({
    queryKey: ["/api/field-mode/today-summary"],
    enabled: !!userId,
  });

  const advanceStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks?showArchived=false"] });
      toast({ title: "Task updated", description: "Status has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task status.", variant: "destructive" });
    },
  });

  const todaysTasks = useMemo(() => {
    if (!Array.isArray(allTasks)) return [];
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    return allTasks.filter((task: any) => {
      if (task.assignedUser?.id !== userId) return false;
      if (task.status === "cancelled" || task.status === "completed") {
        if (!task.completedAt) return false;
        const completedDate = new Date(task.completedAt);
        return completedDate >= todayStart && completedDate <= todayEnd;
      }
      if (task.status === "in_progress") return true;
      if (task.dueDate) {
        const due = new Date(task.dueDate);
        return isToday(due) || (isPast(due) && task.status !== "completed");
      }
      return false;
    });
  }, [allTasks, userId]);

  const groupedByProperty = useMemo(() => {
    const groups: Record<string, { property: any; tasks: any[] }> = {};
    const sorted = [...todaysTasks].sort((a, b) => {
      const aAddr = [a.property?.address1, a.property?.city, a.property?.name].filter(Boolean).join(" ") || "zzz";
      const bAddr = [b.property?.address1, b.property?.city, b.property?.name].filter(Boolean).join(" ") || "zzz";
      return aAddr.localeCompare(bAddr);
    });
    for (const task of sorted) {
      const key = task.property?.id ? String(task.property.id) : "no-property";
      if (!groups[key]) {
        groups[key] = { property: task.property, tasks: [] };
      }
      groups[key].tasks.push(task);
    }
    return Object.values(groups);
  }, [todaysTasks]);

  const stats = useMemo(() => {
    const total = todaysTasks.filter((t: any) => t.status !== "cancelled").length;
    const done = todaysTasks.filter((t: any) => t.status === "completed").length;
    const inProgress = todaysTasks.filter((t: any) => t.status === "in_progress").length;
    const overdue = todaysTasks.filter((t: any) => {
      if (t.status === "completed" || t.status === "cancelled") return false;
      return t.dueDate && isPast(new Date(t.dueDate));
    }).length;
    return { total, done, inProgress, overdue };
  }, [todaysTasks]);

  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-900">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
          {(user as any)?.firstName || "there"}
        </h1>
        <p className="text-sm text-slate-500">{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col items-center">
          <div className="text-2xl font-bold text-blue-600">{stats.done}/{stats.total}</div>
          <div className="text-xs text-slate-500 mt-0.5 text-center">Tasks Done</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col items-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.inProgress}</div>
          <div className="text-xs text-slate-500 mt-0.5 text-center">In Progress</div>
        </div>
        <div className={`rounded-xl border p-3 flex flex-col items-center ${stats.overdue > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
          <div className={`text-2xl font-bold ${stats.overdue > 0 ? "text-red-600" : "text-slate-400"}`}>{stats.overdue}</div>
          <div className="text-xs text-slate-500 mt-0.5 text-center">Overdue</div>
        </div>
      </div>

      {/* Today's tasks */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
          Today's Tasks
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : groupedByProperty.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No tasks for today</p>
            <p className="text-sm text-slate-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByProperty.map(({ property, tasks }) => (
              <div key={property?.name || "no-property"} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Property header (tap to open property detail) */}
                {property?.id ? (
                  <button
                    onClick={() => navigate(`/field/property/${property.id}`)}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 text-left"
                    data-testid={`property-header-${property.id}`}
                  >
                    <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {property?.name || "No Property"}
                      </p>
                      {property?.address1 && (
                        <p className="text-xs text-slate-500 truncate">
                          {[property.address1, property.city, property.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">No Property</p>
                    </div>
                  </div>
                )}

                {/* Tasks */}
                <div className="divide-y divide-slate-100">
                  {tasks.map((task: any) => {
                    const nextStatus = getNextStatus(task.status);
                    const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "completed";
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-4"
                      >
                        <div className="flex-1 min-w-0" onClick={() => navigate(`/field/task/${task.id}`)}>
                          <div className="flex items-start gap-2 mb-2">
                            <p className="text-sm font-semibold text-slate-900 flex-1 leading-snug">{task.title}</p>
                          </div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColor(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                            {isOverdue && (
                              <span className="flex items-center gap-1 text-xs text-red-600">
                                <AlertCircle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                            {task.dueDate && !isOverdue && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                {format(new Date(task.dueDate), "h:mm a")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {nextStatus && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 px-3 font-medium border-blue-200 text-blue-600 hover:bg-blue-50"
                              disabled={advanceStatusMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                advanceStatusMutation.mutate({ taskId: task.id, newStatus: nextStatus });
                              }}
                            >
                              <ArrowRight className="w-3.5 h-3.5 mr-1" />
                              {getNextStatusLabel(task.status)}
                            </Button>
                          )}
                          <button
                            className="text-slate-400 p-1"
                            onClick={() => navigate(`/field/task/${task.id}`)}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Summary — only shows when there's something to celebrate */}
      {todaySummary && todaySummary.tasksCompleted > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 space-y-3" data-testid="today-summary">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">Today's Summary</h2>
          </div>

          {/* Progress bar */}
          {todaySummary.tasksTotal > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span>Progress</span>
                <span data-testid="summary-progress-text">
                  {todaySummary.tasksCompleted}/{todaySummary.tasksTotal} ({Math.round((todaySummary.tasksCompleted / todaySummary.tasksTotal) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${Math.min(100, (todaySummary.tasksCompleted / todaySummary.tasksTotal) * 100)}%` }}
                  data-testid="summary-progress-bar"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-lg p-3 text-center">
              <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-900" data-testid="summary-tasks-completed">{todaySummary.tasksCompleted}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Done</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <ListChecks className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-900" data-testid="summary-checklist-count">
                {todaySummary.checklistPass + todaySummary.checklistFail + todaySummary.checklistNa}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                {todaySummary.checklistPass}P · {todaySummary.checklistFail}F · {todaySummary.checklistNa}NA
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <Camera className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-900" data-testid="summary-photos">{todaySummary.photosUploaded}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Photos</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
