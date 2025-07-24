import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  CheckSquare,
  AlertCircle,
  FileText,
  MessageSquare,
  Edit,
  Save,
  X,
  MapPin,
  Phone,
  Mail,
  Tag,
  History
} from "lucide-react";

export default function TaskProfile() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [match, params] = useRoute("/task-profile");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "",
    status: "",
    dueDate: "",
    assignedTo: ""
  });

  // Get task ID from URL params or localStorage
  const taskId = new URLSearchParams(window.location.search).get('id') || localStorage.getItem('selectedTaskId');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch task details
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["/api/tasks", taskId],
    enabled: isAuthenticated && !!taskId,
  });

  // Fetch task comments/notes
  const { data: comments } = useQuery({
    queryKey: ["/api/tasks", taskId, "comments"],
    enabled: isAuthenticated && !!taskId,
  });

  // Fetch task history
  const { data: history } = useQuery({
    queryKey: ["/api/tasks", taskId, "history"],
    enabled: isAuthenticated && !!taskId,
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: any) => {
      return await apiRequest(`/api/tasks/${taskId}`, "PATCH", updatedTask);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (task && !isEditing) {
      setEditForm({
        title: (task as any).title || "",
        description: (task as any).description || "",
        priority: (task as any).priority || "",
        status: (task as any).status || "",
        dueDate: (task as any).dueDate || "",
        assignedTo: (task as any).assignedTo || ""
      });
    }
  }, [task, isEditing]);

  const handleSave = () => {
    updateTaskMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (task) {
      setEditForm({
        title: (task as any).title || "",
        description: (task as any).description || "",
        priority: (task as any).priority || "",
        status: (task as any).status || "",
        dueDate: (task as any).dueDate || "",
        assignedTo: (task as any).assignedTo || ""
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "secondary";
      case "normal":
        return "outline";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading || taskLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Task Not Found</h2>
          <p className="text-slate-600 mb-4">The task you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate("/tasks")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/tasks")}
            className="flex items-center text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateTaskMutation.isPending}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateTaskMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Task
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="text-3xl font-bold border-none p-0 h-auto text-slate-900 bg-transparent"
                placeholder="Task title"
              />
            ) : (
              <h1 className="text-3xl font-bold text-slate-900">{(task as any).title}</h1>
            )}
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant={getPriorityColor((task as any).priority)} className="capitalize">
                {(task as any).priority} Priority
              </Badge>
              <Badge variant={getStatusColor((task as any).status)} className="capitalize">
                {(task as any).status.replace('_', ' ')}
              </Badge>
              <div className="flex items-center text-slate-500">
                <Calendar className="w-4 h-4 mr-1" />
                Due: {formatDate((task as any).dueDate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="notes">Notes & Comments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Task description..."
                      rows={6}
                    />
                  ) : (
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {(task as any).description || "No description provided."}
                    </p>
                  )}
                </CardContent>
              </Card>

              {(task as any).propertyId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-slate-500">Property</Label>
                        <p className="font-medium">{(task as any).property?.name || "Unknown Property"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-500">Address</Label>
                        <p className="text-slate-700">{(task as any).property?.address || "Address not available"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-500">Type</Label>
                        <p className="text-slate-700 capitalize">{(task as any).property?.type || "Unknown"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Priority</Label>
                    {isEditing ? (
                      <Select
                        value={editForm.priority}
                        onValueChange={(value) => setEditForm({ ...editForm, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium capitalize">{(task as any).priority}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Status</Label>
                    {isEditing ? (
                      <Select
                        value={editForm.status}
                        onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium capitalize">{(task as any).status.replace('_', ' ')}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Due Date</Label>
                    {isEditing ? (
                      <Input
                        type="datetime-local"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">{formatDate((task as any).dueDate)}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Assigned To</Label>
                    <div className="flex items-center mt-1">
                      <Avatar className="w-8 h-8 mr-3">
                        <AvatarImage src={(task as any).assignedUser?.profileImageUrl} />
                        <AvatarFallback>
                          {(task as any).assignedUser?.firstName?.[0]}{(task as any).assignedUser?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {(task as any).assignedUser ? 
                            `${(task as any).assignedUser.firstName} ${(task as any).assignedUser.lastName}` : 
                            "Unassigned"
                          }
                        </p>
                        {(task as any).assignedUser?.email && (
                          <p className="text-sm text-slate-500">{(task as any).assignedUser.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Created</Label>
                    <p className="font-medium">{formatDate((task as any).createdAt)}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Last Updated</Label>
                    <p className="font-medium">{formatDate((task as any).updatedAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Notes & Comments Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Notes & Comments
              </CardTitle>
              <CardDescription>
                Task-related discussions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <p className="text-center text-slate-500 py-8">
                    No comments yet. Comments and notes will appear here once added.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2" />
                Task History
              </CardTitle>
              <CardDescription>
                Track all changes and updates to this task
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <p className="text-center text-slate-500 py-8">
                    No history available. Activity logs will appear here once changes are made.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}