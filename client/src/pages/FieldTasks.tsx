import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { format, isPast } from "date-fns";

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

export default function FieldTasks() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const userId = (user as any)?.id;

  const { data: allTasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks?showArchived=false"],
    enabled: !!userId,
  });

  const myTasks = useMemo(() => {
    if (!Array.isArray(allTasks)) return [];
    return allTasks
      .filter((t: any) => t.assignedUser?.id === userId && t.status !== "cancelled")
      .sort((a: any, b: any) => {
        const statusOrder: Record<string, number> = { in_progress: 0, pending: 1, completed: 2 };
        const aOrder = statusOrder[a.status] ?? 3;
        const bOrder = statusOrder[b.status] ?? 3;
        if (aOrder !== bOrder) return aOrder - bOrder;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  }, [allTasks, userId]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900 pt-2">My Tasks</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : myTasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No tasks assigned to you</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myTasks.map((task: any) => {
            const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "completed";
            return (
              <button
                key={task.id}
                className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left flex items-start gap-3 hover:border-blue-200 active:bg-slate-50 transition-colors"
                onClick={() => navigate(`/field/task/${task.id}`)}
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{task.title}</p>
                  {task.property && (
                    <p className="text-xs text-slate-500 truncate">{task.property.name}</p>
                  )}
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    {isOverdue && (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="w-3 h-3" />Overdue
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
