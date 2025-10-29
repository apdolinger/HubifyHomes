import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, X, AlertCircle, AlertTriangle, Info, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AlertType = "client" | "property" | "task";
type AlertSeverity = "info" | "warning" | "error" | "critical";

interface Alert {
  id: number;
  type: AlertType;
  entityId: number;
  severity: AlertSeverity;
  message: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AlertLimits {
  tier: string;
  characterLimit: number;
  allLimits: Record<string, number>;
}

interface AlertBannerProps {
  type: AlertType;
  entityId: number;
  canManage?: boolean;
}

export interface AlertBannerRef {
  openDialog: () => void;
}

const severityConfig = {
  info: {
    icon: Info,
    className: "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
    iconClassName: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100",
    iconClassName: "text-yellow-500",
  },
  error: {
    icon: AlertCircle,
    className: "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
    iconClassName: "text-orange-500",
  },
  critical: {
    icon: XCircle,
    className: "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
    iconClassName: "text-red-500",
  },
};

export const AlertBanner = forwardRef<AlertBannerRef, AlertBannerProps>(({ type, entityId, canManage = false }, ref) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAlertMessage, setNewAlertMessage] = useState("");
  const [newAlertSeverity, setNewAlertSeverity] = useState<AlertSeverity>("info");
  const [targetType, setTargetType] = useState<"all" | "roles" | "users">("all");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Expose openDialog method to parent components via ref
  useImperativeHandle(ref, () => ({
    openDialog: () => {
      setIsDialogOpen(true);
    },
  }));

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts/entity", type, entityId],
  });

  const { data: limits } = useQuery<AlertLimits>({
    queryKey: ["/api/alerts/limits"],
    enabled: canManage,
  });

  // Fetch organization users for targeting
  const { data: users = [] } = useQuery<Array<{ id: string; firstName: string; lastName: string; email: string; role: string }>>({
    queryKey: ["/api/users"],
    enabled: canManage && isDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { 
      type: AlertType; 
      entityId: number; 
      severity: AlertSeverity; 
      message: string;
      targetType?: "all" | "roles" | "users";
      targetRoles?: string[];
      targetUserIds?: string[];
    }) =>
      apiRequest("POST", "/api/alerts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/entity", type, entityId] });
      setIsDialogOpen(false);
      setNewAlertMessage("");
      setNewAlertSeverity("info");
      setTargetType("all");
      setSelectedRoles([]);
      setSelectedUserIds([]);
      toast({
        title: "Alert created",
        description: "The alert has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create alert",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (alertId: number) =>
      apiRequest("PATCH", `/api/alerts/${alertId}`, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/entity", type, entityId] });
      toast({
        title: "Alert dismissed",
        description: "The alert has been dismissed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss alert",
        variant: "destructive",
      });
    },
  });

  const handleCreateAlert = () => {
    if (!newAlertMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter an alert message",
        variant: "destructive",
      });
      return;
    }

    if (limits && newAlertMessage.length > limits.characterLimit) {
      toast({
        title: "Message too long",
        description: `Your message exceeds the ${limits.characterLimit} character limit for the ${limits.tier} plan. Please upgrade or shorten your message.`,
        variant: "destructive",
      });
      return;
    }

    // Validate targeting options
    if (targetType === "roles" && selectedRoles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one role",
        variant: "destructive",
      });
      return;
    }

    if (targetType === "users" && selectedUserIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      type,
      entityId,
      severity: newAlertSeverity,
      message: newAlertMessage,
      targetType,
      targetRoles: targetType === "roles" ? selectedRoles : undefined,
      targetUserIds: targetType === "users" ? selectedUserIds : undefined,
    });
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (isLoading) {
    return null;
  }

  if (alerts.length === 0 && !canManage) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6" data-testid="alert-banner-container">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;

        return (
          <Alert key={alert.id} className={config.className} data-testid={`alert-${alert.id}`}>
            <Icon className={`h-4 w-4 ${config.iconClassName}`} />
            <div className="flex items-start justify-between w-full">
              <div className="flex-1">
                <AlertTitle className="capitalize" data-testid={`alert-title-${alert.id}`}>
                  {alert.severity}
                </AlertTitle>
                <AlertDescription data-testid={`alert-message-${alert.id}`}>
                  {alert.message}
                </AlertDescription>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1"
                  onClick={() => deactivateMutation.mutate(alert.id)}
                  disabled={deactivateMutation.isPending}
                  data-testid={`alert-dismiss-${alert.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Alert>
        );
      })}

      {canManage && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full" data-testid="alert-create-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Alert
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="alert-create-dialog">
            <DialogHeader>
              <DialogTitle>Create Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select value={newAlertSeverity} onValueChange={(value: AlertSeverity) => setNewAlertSeverity(value)}>
                  <SelectTrigger id="severity" data-testid="alert-severity-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info" data-testid="severity-info">Info</SelectItem>
                    <SelectItem value="warning" data-testid="severity-warning">Warning</SelectItem>
                    <SelectItem value="error" data-testid="severity-error">Error</SelectItem>
                    <SelectItem value="critical" data-testid="severity-critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message">Message</Label>
                  {limits && (
                    <span className="text-xs text-muted-foreground">
                      {newAlertMessage.length}/{limits.characterLimit} characters
                    </span>
                  )}
                </div>
                <Textarea
                  id="message"
                  placeholder="Enter alert message..."
                  value={newAlertMessage}
                  onChange={(e) => setNewAlertMessage(e.target.value)}
                  rows={4}
                  maxLength={limits?.characterLimit}
                  data-testid="alert-message-input"
                />
                {limits && (
                  <p className="text-xs text-muted-foreground">
                    Your {limits.tier} plan allows up to {limits.characterLimit} characters.
                  </p>
                )}
              </div>

              {/* Targeting Section */}
              <div className="space-y-3 border-t pt-4">
                <Label>Who should see this alert?</Label>
                <RadioGroup value={targetType} onValueChange={(value: "all" | "roles" | "users") => setTargetType(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="target-all" data-testid="target-all" />
                    <Label htmlFor="target-all" className="font-normal cursor-pointer">Everyone</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="roles" id="target-roles" data-testid="target-roles" />
                    <Label htmlFor="target-roles" className="font-normal cursor-pointer">Specific Roles</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="users" id="target-users" data-testid="target-users" />
                    <Label htmlFor="target-users" className="font-normal cursor-pointer">Specific Users</Label>
                  </div>
                </RadioGroup>

                {/* Role Selection */}
                {targetType === "roles" && (
                  <div className="space-y-2 pl-6 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-admin"
                        checked={selectedRoles.includes("admin")}
                        onCheckedChange={() => toggleRole("admin")}
                        data-testid="role-admin"
                      />
                      <Label htmlFor="role-admin" className="font-normal cursor-pointer">Admin</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-supervisor"
                        checked={selectedRoles.includes("supervisor")}
                        onCheckedChange={() => toggleRole("supervisor")}
                        data-testid="role-supervisor"
                      />
                      <Label htmlFor="role-supervisor" className="font-normal cursor-pointer">Supervisor</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-staff"
                        checked={selectedRoles.includes("staff")}
                        onCheckedChange={() => toggleRole("staff")}
                        data-testid="role-staff"
                      />
                      <Label htmlFor="role-staff" className="font-normal cursor-pointer">Staff</Label>
                    </div>
                  </div>
                )}

                {/* User Selection */}
                {targetType === "users" && (
                  <div className="space-y-2 pl-6 pt-2 max-h-48 overflow-y-auto">
                    {users.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No users available</p>
                    ) : (
                      users.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                            data-testid={`user-${user.id}`}
                          />
                          <Label htmlFor={`user-${user.id}`} className="font-normal cursor-pointer">
                            {user.firstName} {user.lastName} ({user.email})
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                data-testid="alert-cancel-button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAlert}
                disabled={createMutation.isPending}
                data-testid="alert-submit-button"
              >
                {createMutation.isPending ? "Creating..." : "Create Alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});
