import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

type AlertSeverity = "info" | "warning" | "critical" | "success";

interface SystemAlert {
  id: number;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  isActive: boolean;
  targetType: "all" | "roles" | "users";
  targetRoles?: string[];
  targetUserIds?: string[];
  expiresAt?: string;
  createdAt: string;
}

interface PlatformAlert {
  id: number;
  title: string;
  message: string;
  severity: AlertSeverity;
  isActive: boolean;
  requireAck: boolean;
  showOncePerSession: boolean;
  actionLabel?: string | null;
  actionUrl?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

interface MergedAlert {
  source: "system" | "platform";
  id: number;
  title: string;
  message: string;
  severity: AlertSeverity;
  requireAck: boolean;
  actionLabel?: string | null;
  actionUrl?: string | null;
}

const SEVERITY_CONFIG: Record<AlertSeverity, {
  icon: typeof Info;
  bgColor: string;
  iconColor: string;
  titleColor: string;
  borderColor: string;
}> = {
  info: {
    icon: Info,
    bgColor: "bg-blue-50 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
    titleColor: "text-blue-900 dark:text-blue-100",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    titleColor: "text-yellow-900 dark:text-yellow-100",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  critical: {
    icon: AlertCircle,
    bgColor: "bg-red-50 dark:bg-red-950",
    iconColor: "text-red-600 dark:text-red-400",
    titleColor: "text-red-900 dark:text-red-100",
    borderColor: "border-red-200 dark:border-red-800",
  },
  success: {
    icon: CheckCircle2,
    bgColor: "bg-green-50 dark:bg-green-950",
    iconColor: "text-green-600 dark:text-green-400",
    titleColor: "text-green-900 dark:text-green-100",
    borderColor: "border-green-200 dark:border-green-800",
  },
};

const SESSION_DISMISSED_KEY = "platformAlertsDismissedThisSession";

function getDismissedThisSession(): Set<number> {
  try {
    const raw = sessionStorage.getItem(SESSION_DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function addDismissedThisSession(id: number) {
  const s = getDismissedThisSession();
  s.add(id);
  sessionStorage.setItem(SESSION_DISMISSED_KEY, JSON.stringify(Array.from(s)));
}

export function GlobalAlertModal() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedTick, setDismissedTick] = useState(0);

  const { data: systemAlerts = [], isLoading: loadingSystem } = useQuery<SystemAlert[]>({
    queryKey: ["/api/system-alerts"],
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const { data: platformAlertsRaw = [], isLoading: loadingPlatform } = useQuery<PlatformAlert[]>({
    queryKey: ["/api/platform-alerts/active"],
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const dismissed = (() => {
    void dismissedTick; // re-evaluate when state ticks
    return getDismissedThisSession();
  })();

  const merged: MergedAlert[] = [
    ...(systemAlerts || []).map<MergedAlert>((a) => ({
      source: "system",
      id: a.id,
      title: a.title,
      message: a.message,
      severity: a.severity,
      requireAck: true,
    })),
    ...(platformAlertsRaw || [])
      .filter((a) => !(a.showOncePerSession && dismissed.has(a.id)))
      .map<MergedAlert>((a) => ({
        source: "platform",
        id: a.id,
        title: a.title,
        message: a.message,
        severity: a.severity,
        requireAck: a.requireAck,
        actionLabel: a.actionLabel,
        actionUrl: a.actionUrl,
      })),
  ];

  const acknowledgeSystemMutation = useMutation({
    mutationFn: async (alertId: number) => apiRequest("POST", `/api/system-alerts/${alertId}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts"] });
      advance();
    },
    onError: (error: any) => {
      toast({ title: "Failed to acknowledge alert", description: error.message, variant: "destructive" });
    },
  });

  const acknowledgePlatformMutation = useMutation({
    mutationFn: async (alertId: number) => apiRequest("POST", `/api/platform-alerts/${alertId}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-alerts/active"] });
      advance();
    },
    onError: (error: any) => {
      toast({ title: "Failed to acknowledge alert", description: error.message, variant: "destructive" });
    },
  });

  function advance() {
    if (currentIndex < merged.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  }

  useEffect(() => {
    if (merged.length === 0) setCurrentIndex(0);
  }, [merged.length]);

  if (!isAuthenticated || loadingSystem || loadingPlatform) return null;
  if (merged.length === 0) return null;

  const current = merged[currentIndex] || merged[0];
  if (!current) return null;

  const config = SEVERITY_CONFIG[current.severity] || SEVERITY_CONFIG.info;
  const Icon = config.icon;

  function handleDismiss() {
    if (current.source === "system") {
      acknowledgeSystemMutation.mutate(current.id);
    } else {
      if (current.requireAck) {
        acknowledgePlatformMutation.mutate(current.id);
      } else {
        addDismissedThisSession(current.id);
        setDismissedTick((t) => t + 1);
        advance();
      }
    }
  }

  const isPending = acknowledgeSystemMutation.isPending || acknowledgePlatformMutation.isPending;

  return (
    <Dialog open={merged.length > 0} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl"
        onEscapeKeyDown={(e) => current.requireAck && e.preventDefault()}
        onPointerDownOutside={(e) => current.requireAck && e.preventDefault()}
        onInteractOutside={(e) => current.requireAck && e.preventDefault()}
        data-testid="dialog-global-alert"
      >
        <div className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} p-6`}>
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className={`rounded-full p-3 ${config.bgColor}`}>
                <Icon className={`w-8 h-8 ${config.iconColor}`} />
              </div>
              <div className="flex-1">
                <DialogTitle className={`text-2xl font-bold ${config.titleColor}`} data-testid="text-alert-title">
                  {current.title}
                </DialogTitle>
                <DialogDescription className="mt-2 text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap" data-testid="text-alert-message">
                  {current.message}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-6 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {merged.length > 1 && (
                <span data-testid="text-alert-count">
                  Alert {currentIndex + 1} of {merged.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {current.actionUrl && current.actionLabel && (() => {
                let safeUrl: string | null = null;
                try {
                  const u = new URL(current.actionUrl, window.location.origin);
                  if (u.protocol === "http:" || u.protocol === "https:") {
                    safeUrl = u.toString();
                  }
                } catch {
                  // invalid URL — hide the button
                }
                if (!safeUrl) return null;
                return (
                  <Button
                    variant="outline"
                    onClick={() => window.open(safeUrl!, "_blank", "noopener,noreferrer")}
                    data-testid="button-alert-action"
                  >
                    {current.actionLabel}
                  </Button>
                );
              })()}
              <Button
                onClick={handleDismiss}
                disabled={isPending}
                size="lg"
                className="min-w-[120px]"
                data-testid="button-acknowledge-alert"
              >
                {isPending ? "Saving..." : current.requireAck ? "I Understand" : "Dismiss"}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
