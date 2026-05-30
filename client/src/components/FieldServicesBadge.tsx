import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, ExternalLink, DollarSign } from "lucide-react";

function formatPrice(customPriceCents: number | null, defaultPriceCents: number | null): string | null {
  const cents = customPriceCents ?? defaultPriceCents;
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

function statusColor(status: string): string {
  switch (status) {
    case "active": return "text-emerald-600";
    case "paused": return "text-yellow-600";
    case "cancelled": return "text-red-500";
    default: return "text-slate-400";
  }
}

interface FieldServicesBadgeProps {
  propertyId: number | string;
  propertyName?: string;
}

export default function FieldServicesBadge({ propertyId, propertyName }: FieldServicesBadgeProps) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: assignments = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/properties/${propertyId}/service-assignments`],
    enabled: !!propertyId,
  });

  const activeCount = Array.isArray(assignments)
    ? assignments.filter((a: any) => a.status === "active").length
    : 0;

  if (!propertyId) return null;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200 transition-colors"
      >
        <Briefcase className="w-3 h-3 flex-shrink-0" />
        {isLoading ? "…" : `${activeCount} service${activeCount !== 1 ? "s" : ""}`}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-full w-full sm:max-w-md rounded-t-2xl rounded-b-none fixed bottom-0 left-0 right-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-violet-600" />
              {propertyName ? `Services — ${propertyName}` : "Service Assignments"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="px-4 py-3 space-y-1">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-3/4" />
                </div>
              ) : (assignments as any[]).length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No service assignments for this property.</p>
              ) : (
                (assignments as any[]).map((a: any) => {
                  const isCustomPrice = a.customPriceCents != null;
                  const priceLabel = formatPrice(a.customPriceCents, a.serviceDefaultPriceCents ?? a.defaultPriceCents ?? null);
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setOpen(false);
                        navigate(`/field/property/${propertyId}`);
                      }}
                      className="w-full text-left px-3 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800 leading-snug flex-1">
                          {a.serviceName || a.name || `Service #${a.serviceId}`}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                          <span className={`text-xs font-medium capitalize ${statusColor(a.status)}`}>
                            {a.status}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-1">
                        {priceLabel && (
                          <span className="flex items-center gap-0.5 text-xs text-slate-500">
                            <DollarSign className="w-3 h-3" />
                            <span className={isCustomPrice ? "font-medium text-slate-700" : "text-slate-400"}>
                              {priceLabel.replace("$", "")}
                              {!isCustomPrice && <span className="text-slate-400"> catalog rate</span>}
                            </span>
                          </span>
                        )}
                        {a.billingFrequencyOverride && (
                          <span className="text-xs text-slate-400 capitalize">{a.billingFrequencyOverride.replace("_", " ")}</span>
                        )}
                        {a.startDate && (
                          <span className="text-xs text-slate-400">
                            From {new Date(a.startDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
