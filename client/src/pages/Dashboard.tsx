import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Plus,
  ArrowRight,
  Clock,
  User
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");

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

  // Dashboard stats query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  // Urgent tasks query
  const { data: urgentTasks, isLoading: urgentTasksLoading } = useQuery({
    queryKey: ["/api/dashboard/urgent-tasks"],
    enabled: isAuthenticated,
  });

  // Team messages query
  const { data: teamMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/dashboard/team-messages"],
    enabled: isAuthenticated,
  });

  // Recent activity query
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-activity"],
    enabled: isAuthenticated,
  });

  // Post team message mutation
  const postMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/team-messages", { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
      setNewMessage("");
      toast({
        title: "Message Posted",
        description: "Your message has been posted to the team.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to post message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, assignedToId }: { taskId: number; assignedToId: string }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/assign`, { assignedToId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/urgent-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Task Assigned",
        description: "Task has been assigned successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to assign task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAssignTask = (taskId: number) => {
    if (user?.id) {
      assignTaskMutation.mutate({ taskId, assignedToId: user.id });
    }
  };

  const handlePostMessage = () => {
    if (newMessage.trim()) {
      postMessageMutation.mutate(newMessage.trim());
    }
  };

  const getTaskCardClass = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "urgent-task-card";
      case "high":
        return "high-task-card";
      default:
        return "normal-task-card";
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
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
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Welcome back! Here's what's happening with your properties.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Quick Add Task
              <kbd className="kbd-light ml-2">T</kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Total Properties
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {statsLoading ? "..." : stats?.totalProperties || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Urgent Tasks
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {statsLoading ? "..." : stats?.urgentTasks || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Completed Today
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {statsLoading ? "..." : stats?.completedToday || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Active Team
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {statsLoading ? "..." : stats?.activeTeam || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Tasks List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Urgent Tasks</CardTitle>
                <Badge variant="destructive">
                  {urgentTasks?.length || 0} pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {urgentTasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : urgentTasks?.length > 0 ? (
                <div className="space-y-4">
                  {urgentTasks.map((task: any) => (
                    <div key={task.id} className={getTaskCardClass(task.priority)}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-slate-900">
                            {task.title}
                          </h4>
                          {task.propertyId && (
                            <p className="text-xs text-slate-600 mt-1">
                              Property ID: {task.propertyId}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                              {task.priority}
                            </Badge>
                            {task.dueDate && (
                              <span className="text-xs text-slate-500 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAssignTask(task.id)}
                          disabled={assignTaskMutation.isPending}
                          className="assign-button ml-4"
                        >
                          {assignTaskMutation.isPending ? "..." : "Assign"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-4">
                    <Button variant="link" className="text-primary">
                      View all urgent tasks <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No urgent tasks at the moment
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team Messages */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Messages</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePostMessage}
                  disabled={!newMessage.trim() || postMessageMutation.isPending}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Post
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMessages?.length > 0 ? (
                    teamMessages.map((message: any) => (
                      <div key={message.id} className="flex space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.author?.profileImageUrl} />
                          <AvatarFallback>
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-medium text-slate-900">
                              {message.author?.firstName} {message.author?.lastName}
                            </span>
                            <span className="text-slate-500 text-xs ml-2">
                              {formatTimeAgo(message.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-1">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-500">
                      No team messages yet
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-2">
                    <Textarea
                      placeholder="Post a message to your team..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : recentActivity?.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentActivity.map((activity: any, index: number) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {index !== recentActivity.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-primary flex items-center justify-center ring-8 ring-white">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5">
                            <div>
                              <p className="text-sm text-slate-600">
                                {activity.description}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatTimeAgo(activity.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
