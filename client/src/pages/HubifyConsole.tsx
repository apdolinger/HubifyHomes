import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";
import { useToast } from "@/hooks/use-toast";
import SupportModal from "@/components/SupportModal";
import InviteToPortalModal from "@/components/InviteToPortalModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  MapPin, 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle,
  MessageCircle,
  Phone,
  Mail,
  Eye,
  Send,
  RefreshCw,
  Trash2,
  Plus,
  Building2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function HubifyConsole() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitationFilter, setInvitationFilter] = useState<"all" | "sent" | "registered" | "expired">("all");
  const { data: supportInfo } = useQuery<{ supportPhone: string | null }>({
    queryKey: ["/api/support-info"],
    // Override the global staleTime: Infinity so this query stays fresh
    // when admins change the support phone number. Refetch on window focus
    // and on a short interval as a safety net in case the broadcast below
    // is missed (e.g. unsupported browser, different origin context).
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  const supportPhone = supportInfo?.supportPhone ?? null;
  const telHref = supportPhone ? `tel:${supportPhone.replace(/[^+\d]/g, "")}` : null;

  // Listen for cross-tab notifications that the support phone changed so
  // the Call Support button appears/disappears within seconds without a
  // manual page reload.
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }
    const channel = new BroadcastChannel("hubify-support-info");
    const handleMessage = (event: MessageEvent) => {
      if (event?.data?.type === "support-info-changed") {
        queryClient.invalidateQueries({ queryKey: ["/api/support-info"] });
      }
    };
    channel.addEventListener("message", handleMessage);
    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/staff/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch properties for client view
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
  });

  // Fetch tasks related to properties
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
  });

  // Fetch portal invitations
  const { data: portalInvitations = [], isLoading: invitationsLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/invitations"],
    enabled: isAuthenticated,
  });

  const getInvitationStatus = (inv: any) => {
    if (inv.isUsed) return "registered";
    if (new Date(inv.expiresAt) < new Date()) return "expired";
    return "sent";
  };

  const resendInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/portal/invitations/${id}/resend`, {});
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to resend");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/invitations"] });
      toast({ title: "Invitation resent", description: "A new email has been sent." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/portal/invitations/${id}`);
      if (!res.ok && res.status !== 204) {
        const d = await res.json();
        throw new Error(d.message || "Failed to cancel");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/invitations"] });
      toast({ title: "Invitation cancelled" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getTasksForProperty = (propertyId: number) => {
    if (!tasks || !Array.isArray(tasks)) return [];
    return tasks.filter((task: any) => task.propertyId === propertyId);
  };

  const getContactsForProperty = (propertyId: number) => {
    if (!contacts || !Array.isArray(contacts)) return [];
    return contacts.filter((contact: any) => contact.propertyId === propertyId);
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Hubify Console</h1>
          <p className="mt-2 text-lg text-slate-600">
            Manage portal settings and property access
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Properties</h3>
            <p className="text-3xl font-bold text-teal-600">
              {propertiesLoading ? "..." : Array.isArray(properties) ? properties.length : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Active Tasks</h3>
            <p className="text-3xl font-bold text-green-600">
              {tasksLoading ? "..." : Array.isArray(tasks) ? tasks.filter((t: any) => t.status !== "completed").length : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Contacts</h3>
            <p className="text-3xl font-bold text-purple-600">
              {contactsLoading ? "..." : Array.isArray(contacts) ? contacts.length : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Properties List */}
      <div className="space-y-8">
        {propertiesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : Array.isArray(properties) && properties.length > 0 ? (
          properties.map((property: any) => {
            const propertyTasks = getTasksForProperty(property.id);
            const propertyContacts = getContactsForProperty(property.id);
            const urgentTasks = propertyTasks.filter(
              (task: any) => task.priority === "urgent" && task.status !== "completed"
            );

            return (
              <Card key={property.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <Home className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{property.name}</CardTitle>
                        <div className="flex items-center text-slate-600 mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="text-sm">
                            {[
                              property.address1,
                              property.address2,
                              property.city,
                              property.state,
                              property.zip
                            ].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{property.type}</Badge>
                      <Badge variant={property.isActive ? "default" : "secondary"}>
                        {property.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Property Tasks */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-slate-900 flex items-center">
                          <CheckSquare className="w-5 h-5 mr-2" />
                          Tasks
                        </h3>
                        {urgentTasks.length > 0 && (
                          <Badge variant="destructive" className="flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {urgentTasks.length} urgent
                          </Badge>
                        )}
                      </div>

                      {propertyTasks.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {propertyTasks.slice(0, 5).map((task: any) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-slate-900">
                                  {task.title}
                                </h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                    {task.priority}
                                  </Badge>
                                  <Badge variant={getTaskStatusColor(task.status)} className="text-xs">
                                    {task.status.replace('_', ' ')}
                                  </Badge>
                                  {task.dueDate && (
                                    <span className="text-xs text-slate-500 flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {new Date(task.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {propertyTasks.length > 5 && (
                            <p className="text-sm text-slate-500 text-center">
                              and {propertyTasks.length - 5} more tasks...
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-500">
                          <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                          <p>No tasks for this property</p>
                        </div>
                      )}
                    </div>

                    {/* Property Contacts */}
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Contacts
                      </h3>

                      {propertyContacts.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {propertyContacts.map((contact: any) => (
                            <div
                              key={contact.id}
                              className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {contact.firstName[0]}{contact.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-slate-900">
                                  {contact.firstName} {contact.lastName}
                                </h4>
                                <div className="flex items-center space-x-3 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {contact.type.replace('_', ' ')}
                                  </Badge>
                                  {contact.email && (
                                    <span className="text-xs text-slate-500 flex items-center">
                                      <Mail className="w-3 h-3 mr-1" />
                                      {contact.email}
                                    </span>
                                  )}
                                  {contact.phone && (
                                    <span className="text-xs text-slate-500 flex items-center">
                                      <Phone className="w-3 h-3 mr-1" />
                                      {contact.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-500">
                          <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                          <p>No contacts for this property</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Property Info Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-500">
                        <span>{property.units} {property.units === 1 ? 'unit' : 'units'}</span>
                        <span className="ml-4">Added {new Date(property.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(routes.adminClientPortalSettings(property.id))}
                        data-testid={`button-portal-settings-${property.id}`}
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Portal Settings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Home className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No properties available
              </h3>
              <p className="text-slate-600">
                Properties will appear here once they are added to your account
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Portal Invitations */}
      <Card className="mt-8" data-testid="portal-invitations-section">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-teal-600" />
              Client Portal Invitations
            </CardTitle>
            <Button size="sm" onClick={() => setIsInviteModalOpen(true)} data-testid="button-new-invitation">
              <Plus className="w-4 h-4 mr-2" />
              Invite Client
            </Button>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 mt-3 flex-wrap">
            {(["all", "sent", "registered", "expired"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setInvitationFilter(f)}
                data-testid={`filter-invitations-${f}`}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  invitationFilter === f
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f === "all" ? "All" : f === "sent" ? "Pending" : f === "registered" ? "Registered" : "Expired"}
                {" "}
                <span className="opacity-70">
                  ({(portalInvitations as any[]).filter((inv: any) => {
                    if (f === "all") return true;
                    const s = getInvitationStatus(inv);
                    return s === f;
                  }).length})
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invitationsLoading ? (
            <div className="text-center py-6 text-slate-500">Loading invitations…</div>
          ) : (portalInvitations as any[]).length === 0 ? (
            <div className="text-center py-8">
              <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No invitations sent yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click "Invite Client" to send a branded portal invitation.</p>
            </div>
          ) : (() => {
            const filtered = (portalInvitations as any[]).filter((inv: any) => {
              if (invitationFilter === "all") return true;
              return getInvitationStatus(inv) === invitationFilter;
            });
            if (filtered.length === 0) {
              return (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No {invitationFilter} invitations.
                </div>
              );
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">Email / Contact</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">Sent</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">Expires</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">Properties</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((inv: any) => {
                      const status = getInvitationStatus(inv);
                      const propCount = Array.isArray(inv.propertyIds) ? inv.propertyIds.length : 0;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors" data-testid={`invitation-${inv.id}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 truncate max-w-[220px]">{inv.email}</p>
                            <p className="text-xs text-slate-400 capitalize">{inv.role}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={status === "registered" ? "default" : status === "expired" ? "destructive" : "secondary"}
                            >
                              {status === "registered" ? "Registered" : status === "expired" ? "Expired" : "Pending"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {inv.sentAt
                              ? new Date(inv.sentAt).toLocaleDateString()
                              : <span className="text-slate-400 italic">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {status === "registered" ? (
                              <span className="text-slate-400 italic">—</span>
                            ) : (
                              new Date(inv.expiresAt).toLocaleDateString()
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {propCount > 0 ? (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {propCount} {propCount === 1 ? "property" : "properties"}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              {!inv.isUsed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title="Resend invitation"
                                  disabled={resendInvitationMutation.isPending}
                                  onClick={() => resendInvitationMutation.mutate(inv.id)}
                                  data-testid={`resend-invite-${inv.id}`}
                                >
                                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                  Resend
                                </Button>
                              )}
                              {!inv.isUsed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title="Cancel invitation"
                                  disabled={cancelInvitationMutation.isPending}
                                  onClick={() => cancelInvitationMutation.mutate(inv.id)}
                                  data-testid={`cancel-invite-${inv.id}`}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="text-center">
            <MessageCircle className="w-8 h-8 text-teal-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Need Help or Have Questions?
            </h3>
            <p className="text-slate-600 mb-4">
              Our property management team is here to assist you with any questions or concerns.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Button 
                variant="outline"
                onClick={() => setIsSupportModalOpen(true)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              {telHref && (
                <Button variant="outline" asChild data-testid="button-call-support">
                  <a href={telHref}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call Support {supportPhone && <span className="ml-1 text-slate-500">({supportPhone})</span>}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      <InviteToPortalModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </main>
  );
}
