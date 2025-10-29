import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Plus, Edit, Trash2, Users, User, Target } from "lucide-react";

const systemAlertSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  message: z.string().min(1, "Message is required"),
  severity: z.enum(["info", "warning", "critical"]),
  targetType: z.enum(["all", "roles", "users"]),
  targetRoles: z.array(z.string()).optional(),
  targetUserIds: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

type SystemAlertFormData = z.infer<typeof systemAlertSchema>;

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

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "staff", label: "Staff" },
];

const SEVERITY_COLORS = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function SystemAlertsManagement({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<SystemAlert | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: alerts = [], isLoading } = useQuery<SystemAlert[]>({
    queryKey: ["/api/system-alerts/all"],
    enabled: !!orgId,
  });

  const { data: users = [] } = useQuery<Array<{ id: string; firstName: string; lastName: string; email: string }>>({
    queryKey: ["/api/users"],
    enabled: !!orgId,
  });

  const form = useForm<SystemAlertFormData>({
    resolver: zodResolver(systemAlertSchema),
    defaultValues: {
      title: "",
      message: "",
      severity: "info",
      targetType: "all",
      targetRoles: [],
      targetUserIds: [],
      isActive: true,
    },
  });

  const targetType = form.watch("targetType");

  const createMutation = useMutation({
    mutationFn: async (data: SystemAlertFormData) => {
      return apiRequest("POST", "/api/system-alerts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts"] });
      toast({
        title: "Alert created",
        description: "The system alert has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedRoles([]);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SystemAlertFormData> }) => {
      return apiRequest("PATCH", `/api/system-alerts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts"] });
      toast({
        title: "Alert updated",
        description: "The system alert has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingAlert(null);
      form.reset();
      setSelectedRoles([]);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/system-alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts"] });
      toast({
        title: "Alert deleted",
        description: "The system alert has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/system-alerts/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-alerts"] });
      toast({
        title: "Alert updated",
        description: "Alert status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (alert?: SystemAlert) => {
    if (alert) {
      setEditingAlert(alert);
      form.reset({
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        targetType: alert.targetType,
        targetRoles: alert.targetRoles || [],
        targetUserIds: alert.targetUserIds || [],
        expiresAt: alert.expiresAt ? new Date(alert.expiresAt).toISOString().split('T')[0] : undefined,
        isActive: alert.isActive,
      });
      setSelectedRoles(alert.targetRoles || []);
    } else {
      setEditingAlert(null);
      form.reset();
      setSelectedRoles([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAlert(null);
    form.reset();
    setSelectedRoles([]);
  };

  const onSubmit = (data: SystemAlertFormData) => {
    const payload = {
      ...data,
      targetRoles: data.targetType === "roles" ? data.targetRoles : [],
      targetUserIds: data.targetType === "users" ? data.targetUserIds : [],
      expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
    };

    if (editingAlert) {
      updateMutation.mutate({ id: editingAlert.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleRoleToggle = (role: string) => {
    const newRoles = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];
    setSelectedRoles(newRoles);
    form.setValue("targetRoles", newRoles);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading system alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                System Alerts
              </CardTitle>
              <CardDescription>
                Create and manage platform-wide alerts for users. These alerts will appear as blocking modals that users must acknowledge.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-alert">
              <Plus className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No system alerts created yet. Create one to notify users of important information.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id} data-testid={`row-alert-${alert.id}`}>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell>
                        <Badge className={SEVERITY_COLORS[alert.severity]}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {alert.targetType === "all" && (
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            All Users
                          </span>
                        )}
                        {alert.targetType === "roles" && (
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {alert.targetRoles?.join(", ")}
                          </span>
                        )}
                        {alert.targetType === "users" && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {alert.targetUserIds?.length} user(s)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={alert.isActive}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: alert.id, isActive: checked })
                          }
                          data-testid={`switch-active-${alert.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        {alert.expiresAt
                          ? new Date(alert.expiresAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(alert)}
                            data-testid={`button-edit-${alert.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(alert.id)}
                            data-testid={`button-delete-${alert.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-alert">
              {editingAlert ? "Edit System Alert" : "Create System Alert"}
            </DialogTitle>
            <DialogDescription>
              System alerts appear as blocking modals to users and require acknowledgement to dismiss.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Important Update" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the alert..."
                        rows={4}
                        {...field}
                        data-testid="textarea-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-severity">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Info: Blue, Warning: Yellow, Critical: Red
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-target-type">
                          <SelectValue placeholder="Select target audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="roles">Specific Roles</SelectItem>
                        <SelectItem value="users">Specific Users</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {targetType === "roles" && (
                <FormField
                  control={form.control}
                  name="targetRoles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Roles</FormLabel>
                      <div className="space-y-2">
                        {ROLE_OPTIONS.map((role) => (
                          <div key={role.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`role-${role.value}`}
                              checked={selectedRoles.includes(role.value)}
                              onChange={() => handleRoleToggle(role.value)}
                              className="rounded"
                              data-testid={`checkbox-role-${role.value}`}
                            />
                            <label htmlFor={`role-${role.value}`} className="text-sm">
                              {role.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {targetType === "users" && (
                <FormField
                  control={form.control}
                  name="targetUserIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Users</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const currentIds = field.value || [];
                          if (!currentIds.includes(value)) {
                            field.onChange([...currentIds, value]);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-users">
                            <SelectValue placeholder="Select users" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.firstName} {u.lastName} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(field.value || []).map((userId) => {
                          const user = users.find((u) => u.id === userId);
                          return (
                            <Badge key={userId} variant="secondary">
                              {user ? `${user.firstName} ${user.lastName}` : userId}
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange(field.value?.filter((id) => id !== userId));
                                }}
                                className="ml-2"
                              >
                                ×
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires At (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-expires-at" />
                    </FormControl>
                    <FormDescription>
                      Leave empty for no expiration
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Only active alerts will be shown to users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-alert"
                >
                  {editingAlert ? "Update Alert" : "Create Alert"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
