import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MapPin, Phone, Mail, User as UserIcon,
  Building, Loader2, ChevronRight, AlertCircle, Navigation as NavigationIcon,
} from "lucide-react";
import { format, isPast } from "date-fns";

function formatAddress(p: any): string {
  if (!p) return "";
  return [p.address1, p.address2, p.city, p.state, p.zipCode]
    .filter(Boolean)
    .join(", ");
}

function buildMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function statusColor(status: string) {
  switch (status) {
    case "completed": return "bg-green-100 text-green-700 border-green-200";
    case "in_progress": return "bg-blue-100 text-blue-700 border-blue-200";
    case "pending": return "bg-slate-100 text-slate-600 border-slate-200";
    case "cancelled": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "completed": return "Done";
    case "in_progress": return "In Progress";
    case "pending": return "Open";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

export default function FieldPropertyDetail() {
  const [, params] = useRoute("/field/property/:id");
  const [, navigate] = useLocation();
  const propertyId = params?.id;

  const { data: property, isLoading: propLoading, isError } = useQuery<any>({
    queryKey: [`/api/properties/${propertyId}`],
    enabled: !!propertyId,
  });

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks?showArchived=false"],
  });

  const activeTasks = useMemo(() => {
    if (!Array.isArray(allTasks) || !propertyId) return [];
    // propertyId from the route is a string; task.property.id may be a number
    // (DB serial) or string. Normalize both sides for the comparison.
    const targetId = String(propertyId);
    return allTasks
      .filter((t: any) => String(t.property?.id ?? t.propertyId ?? "") === targetId)
      .filter((t: any) => t.status !== "completed" && t.status !== "cancelled")
      .sort((a: any, b: any) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aDue - bDue;
      });
  }, [allTasks, propertyId]);

  const fullAddress = formatAddress(property);
  const mapsUrl = fullAddress ? buildMapsUrl(fullAddress) : null;

  if (propLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-slate-700 font-medium">Couldn't load that property.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/field")}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
      </div>
    );
  }

  const ownerName = property.ownerName || property.contactName || null;
  const ownerPhone = property.ownerPhone || property.contactPhone || null;
  const ownerEmail = property.ownerEmail || property.contactEmail || null;

  return (
    <div className="p-4 space-y-4" data-testid="field-property-detail">
      {/* Back button */}
      <button
        onClick={() => navigate("/field")}
        className="flex items-center gap-2 text-sm text-slate-600 font-medium"
        data-testid="button-field-property-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Today
      </button>

      {/* Property header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-slate-900 leading-tight" data-testid="text-property-name">
              {property.name || "Unnamed Property"}
            </h1>
            {fullAddress && (
              <p className="text-sm text-slate-500 mt-1" data-testid="text-property-address">
                {fullAddress}
              </p>
            )}
          </div>
        </div>

        {/* Get Directions */}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl"
            data-testid="link-get-directions"
          >
            <NavigationIcon className="w-5 h-5" />
            Get Directions
          </a>
        )}
      </div>

      {/* Contact info */}
      {(ownerName || ownerPhone || ownerEmail) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Contact</h2>
          {ownerName && (
            <div className="flex items-center gap-3">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-900" data-testid="text-property-contact-name">{ownerName}</span>
            </div>
          )}
          {ownerPhone && (
            <a href={`tel:${ownerPhone}`} className="flex items-center gap-3" data-testid="link-property-contact-phone">
              <Phone className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">{ownerPhone}</span>
            </a>
          )}
          {ownerEmail && (
            <a href={`mailto:${ownerEmail}`} className="flex items-center gap-3" data-testid="link-property-contact-email">
              <Mail className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium break-all">{ownerEmail}</span>
            </a>
          )}
        </div>
      )}

      {/* Active tasks */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
          Active Tasks ({activeTasks.length})
        </h2>
        {tasksLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : activeTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">No active tasks at this property.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {activeTasks.map((task: any) => {
              const overdue = task.dueDate && isPast(new Date(task.dueDate));
              return (
                <button
                  key={task.id}
                  onClick={() => navigate(`/field/task/${task.id}`)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50"
                  data-testid={`property-task-row-${task.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{task.title}</p>
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className={`text-xs ${statusColor(task.status)}`}>
                        {statusLabel(task.status)}
                      </Badge>
                      {overdue && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="w-3 h-3" />Overdue
                        </span>
                      )}
                      {task.dueDate && !overdue && (
                        <span className="text-xs text-slate-500">
                          Due {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
