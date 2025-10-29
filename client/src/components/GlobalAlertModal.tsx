import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

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

const SEVERITY_CONFIG = {
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
};

export function GlobalAlertModal() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);

  const { data: alerts = [], isLoading, refetch } = useQuery<SystemAlert[]>({
    queryKey: ["/api/system-alerts"],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Check for new alerts every minute
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest("POST", `/api/system-alerts/${alertId}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts"] });
      
      // Move to next alert or close
      if (currentAlertIndex < alerts.length - 1) {
        setCurrentAlertIndex(currentAlertIndex + 1);
      } else {
        setCurrentAlertIndex(0);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to acknowledge alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const currentAlert = alerts[currentAlertIndex];
  const hasAlerts = alerts.length > 0;

  // Reset index when alerts change
  useEffect(() => {
    if (alerts.length === 0) {
      setCurrentAlertIndex(0);
    }
  }, [alerts.length]);

  if (!isAuthenticated || isLoading || !hasAlerts || !currentAlert) {
    return null;
  }

  const config = SEVERITY_CONFIG[currentAlert.severity];
  const Icon = config.icon;

  return (
    <Dialog open={hasAlerts} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
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
                  {currentAlert.title}
                </DialogTitle>
                <DialogDescription className="mt-2 text-base text-slate-700 dark:text-slate-300" data-testid="text-alert-message">
                  {currentAlert.message}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-6 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {alerts.length > 1 && (
                <span data-testid="text-alert-count">
                  Alert {currentAlertIndex + 1} of {alerts.length}
                </span>
              )}
            </div>
            <Button
              onClick={() => acknowledgeMutation.mutate(currentAlert.id)}
              disabled={acknowledgeMutation.isPending}
              size="lg"
              className="min-w-[120px]"
              data-testid="button-acknowledge-alert"
            >
              {acknowledgeMutation.isPending ? "Acknowledging..." : "I Understand"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
