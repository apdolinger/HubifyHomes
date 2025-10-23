import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ConflictResolution } from "@shared/schema";

interface ConflictResolutionPanelProps {
  orgId: string;
  userId: string;
  userRole: string;
}

export function ConflictResolutionPanel({
  orgId,
  userId,
  userRole,
}: ConflictResolutionPanelProps) {
  const { toast } = useToast();
  const [selectedConflict, setSelectedConflict] =
    useState<ConflictResolution | null>(null);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "resolve" | null
  >(null);
  const [notes, setNotes] = useState("");

  const { data: conflicts, isLoading } = useQuery<ConflictResolution[]>({
    queryKey: [`/api/orgs/${orgId}/conflicts`, "pending"],
    enabled: !!orgId,
  });

  const { data: events } = useQuery({
    queryKey: [`/api/orgs/${orgId}/events`],
    enabled: !!orgId,
  });

  const { data: users } = useQuery({
    queryKey: [`/api/orgs/${orgId}/users`],
    enabled: !!orgId,
  });

  const { data: properties } = useQuery({
    queryKey: [`/api/orgs/${orgId}/properties`],
    enabled: !!orgId,
  });

  const approveMutation = useMutation({
    mutationFn: async (data: { id: number; notes?: string }) => {
      return await apiRequest(
        "PATCH",
        `/api/orgs/${orgId}/conflicts/${data.id}/approve`,
        { notes: data.notes }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/orgs/${orgId}/conflicts`],
      });
      toast({
        title: "Conflict approved",
        description: "The scheduling conflict has been approved.",
      });
      setSelectedConflict(null);
      setNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve conflict",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (data: { id: number; notes?: string }) => {
      return await apiRequest(
        "PATCH",
        `/api/orgs/${orgId}/conflicts/${data.id}/reject`,
        { notes: data.notes }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/orgs/${orgId}/conflicts`],
      });
      toast({
        title: "Conflict rejected",
        description: "The scheduling conflict has been rejected.",
      });
      setSelectedConflict(null);
      setNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject conflict",
        variant: "destructive",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (data: { id: number; notes?: string }) => {
      return await apiRequest(
        "PATCH",
        `/api/orgs/${orgId}/conflicts/${data.id}/resolve`,
        { notes: data.notes }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/orgs/${orgId}/conflicts`],
      });
      toast({
        title: "Conflict resolved",
        description: "The scheduling conflict has been marked as resolved.",
      });
      setSelectedConflict(null);
      setNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve conflict",
        variant: "destructive",
      });
    },
  });

  const handleAction = (
    conflict: ConflictResolution,
    type: "approve" | "reject" | "resolve"
  ) => {
    setSelectedConflict(conflict);
    setActionType(type);
    setNotes(conflict.resolutionNotes || "");
  };

  const handleConfirmAction = () => {
    if (!selectedConflict) return;

    const data = { id: selectedConflict.id, notes };

    if (actionType === "approve") {
      approveMutation.mutate(data);
    } else if (actionType === "reject") {
      rejectMutation.mutate(data);
    } else if (actionType === "resolve") {
      resolveMutation.mutate(data);
    }
  };

  const getEventDetails = (eventId: string) => {
    return (events as any[])?.find((e) => e.id === eventId);
  };

  const getUserName = (userId: string) => {
    const user = (users as any[])?.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  const getPropertyName = (propertyId: number) => {
    const property = (properties as any[])?.find((p) => p.id === propertyId);
    return property ? property.name : `Property #${propertyId}`;
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case "staff":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "property":
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      case "resource":
        return <AlertTriangle className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50">Rejected</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-blue-50">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduling Conflicts</CardTitle>
          <CardDescription>Loading conflicts...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pendingConflicts = conflicts?.filter((c) => c.status === "pending") || [];
  const isSupervisor = userRole === "supervisor" || userRole === "admin";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduling Conflicts</CardTitle>
              <CardDescription>
                Conflicts requiring supervisor approval
              </CardDescription>
            </div>
            {pendingConflicts.length > 0 && (
              <Badge variant="destructive" className="h-6">
                {pendingConflicts.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingConflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending conflicts
            </p>
          ) : (
            <div className="space-y-4">
              {pendingConflicts.map((conflict) => (
                <Card key={conflict.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getConflictTypeIcon(conflict.conflictType)}
                          <div>
                            <h4 className="font-semibold text-sm">
                              {conflict.conflictType.charAt(0).toUpperCase() +
                                conflict.conflictType.slice(1)}{" "}
                              Conflict
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {conflict.eventIds.length} conflicting events
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(conflict.status)}
                      </div>

                      {conflict.propertyId && (
                        <div className="text-sm">
                          <span className="font-medium">Property: </span>
                          {getPropertyName(conflict.propertyId)}
                        </div>
                      )}

                      {conflict.userIds && conflict.userIds.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Affected Staff: </span>
                          {conflict.userIds.map((uid) => getUserName(uid)).join(", ")}
                        </div>
                      )}

                      <div className="space-y-2">
                        <span className="text-sm font-medium">Conflicting Events:</span>
                        <div className="space-y-1">
                          {conflict.eventIds.map((eventId) => {
                            const event = getEventDetails(eventId);
                            if (!event) return null;
                            return (
                              <div
                                key={eventId}
                                className="text-sm pl-4 border-l-2 border-gray-200"
                              >
                                <div className="font-medium">{event.title}</div>
                                <div className="text-muted-foreground">
                                  {new Date(event.start).toLocaleString()} -{" "}
                                  {new Date(event.end).toLocaleString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {conflict.resolutionNotes && (
                        <div className="text-sm bg-gray-50 p-3 rounded">
                          <span className="font-medium">Notes: </span>
                          {conflict.resolutionNotes}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {isSupervisor && conflict.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAction(conflict, "approve")}
                              data-testid={`button-approve-conflict-${conflict.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(conflict, "reject")}
                              data-testid={`button-reject-conflict-${conflict.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                        {conflict.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(conflict, "resolve")}
                            data-testid={`button-resolve-conflict-${conflict.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedConflict && !!actionType}
        onOpenChange={() => {
          setSelectedConflict(null);
          setActionType(null);
          setNotes("");
        }}
      >
        <DialogContent data-testid="dialog-conflict-action">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Conflict"}
              {actionType === "reject" && "Reject Conflict"}
              {actionType === "resolve" && "Resolve Conflict"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" &&
                "Approve this scheduling conflict to allow it to proceed."}
              {actionType === "reject" &&
                "Reject this scheduling conflict. The events will need to be rescheduled."}
              {actionType === "resolve" &&
                "Mark this conflict as resolved after it has been addressed."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label
                htmlFor="notes"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Notes (optional)
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this decision..."
                className="mt-2"
                data-testid="textarea-conflict-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedConflict(null);
                setActionType(null);
                setNotes("");
              }}
              data-testid="button-cancel-conflict-action"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={
                approveMutation.isPending ||
                rejectMutation.isPending ||
                resolveMutation.isPending
              }
              data-testid="button-confirm-conflict-action"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
