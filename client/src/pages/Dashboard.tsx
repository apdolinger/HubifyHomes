import { useEffect, useState } from "react";
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
  User,
  Settings,
  HelpCircle,
  Calendar,
  Copy,
  MessageSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import DashboardCustomizationModal from "@/components/DashboardCustomizationModal";
import { CalendarWidget, SupportWidget, DuplicatesWidget } from "@/components/DashboardWidgets";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [newMessage, setNewMessage] = useState("");
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  
  // Widget icon mapping for consistent icons
  const getWidgetIcon = (id: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      "urgent-tasks": <AlertTriangle className="w-4 h-4" />,
      "stats-overview": <Building className="w-4 h-4" />,
      "team-chat": <MessageSquare className="w-4 h-4" />,
      "recent-activity": <Clock className="w-4 h-4" />,
      "calendar": <Calendar className="w-4 h-4" />,
      "support": <HelpCircle className="w-4 h-4" />,
      "duplicates": <Copy className="w-4 h-4" />
    };
    return iconMap[id] || <Building className="w-4 h-4" />;
  };

  // Default widget configuration
  const getDefaultWidgets = () => [{
      id: "urgent-tasks",
      name: "Urgent Tasks",
      description: "View and manage high-priority tasks",
      icon: getWidgetIcon("urgent-tasks"),
      enabled: true,
      order: 1,
      category: "content" as const
    },
    {
      id: "stats-overview",
      name: "Statistics Overview", 
      description: "Key metrics at a glance",
      icon: getWidgetIcon("stats-overview"),
      enabled: true,
      order: 2,
      category: "stats" as const
    },
    {
      id: "team-chat",
      name: "Team Chat",
      description: "Quick team communication",
      icon: getWidgetIcon("team-chat"),
      enabled: true,
      order: 3,
      category: "communication" as const
    },
    {
      id: "recent-activity",
      name: "Recent Activity",
      description: "Latest system activity and updates", 
      icon: getWidgetIcon("recent-activity"),
      enabled: true,
      order: 4,
      category: "content" as const
    },
    {
      id: "calendar",
      name: "Calendar",
      description: "Upcoming events and deadlines",
      icon: getWidgetIcon("calendar"),
      enabled: false,
      order: 5,
      category: "content" as const
    },
    {
      id: "support",
      name: "Support",
      description: "Help, training, and tips",
      icon: getWidgetIcon("support"),
      enabled: false,
      order: 6,
      category: "content" as const
    },
    {
      id: "duplicates",
      name: "Duplicates", 
      description: "Flagged duplicate people or properties",
      icon: getWidgetIcon("duplicates"),
      enabled: false,
      order: 7,
      category: "content" as const
    }];

  // Load saved widget configuration from localStorage or use defaults
  const [dashboardWidgets, setDashboardWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    if (saved) {
      try {
        const savedWidgets = JSON.parse(saved);
        // Merge saved data with default structure and add icons
        return savedWidgets.map((savedWidget: any) => ({
          ...savedWidget,
          icon: getWidgetIcon(savedWidget.id)
        }));
      } catch (error) {
        console.error('Failed to parse saved dashboard widgets:', error);
      }
    }
    return getDefaultWidgets();
  });

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
  const { data: teamMessages, isLoading: teamMessagesLoading } = useQuery({
    queryKey: ["/api/dashboard/team-messages"],
    enabled: isAuthenticated,
  });

  // Recent activity query
  const { data: recentActivity, isLoading: recentActivityLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-activity"],
    enabled: isAuthenticated,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      await apiRequest("/api/dashboard/team-messages", {
        method: "POST",
        body: { message }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
      setNewMessage("");
      toast({
        title: "Message sent",
        description: "Your message has been sent to the team.",
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
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete task mutation  
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: { status: "completed" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/urgent-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Task completed",
        description: "Task has been marked as completed successfully.",
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
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  const handleCompleteTask = (taskId: number) => {
    completeTaskMutation.mutate(taskId);
  };

  // Get enabled widgets sorted by order
  const enabledWidgets = dashboardWidgets
    .filter(widget => widget.enabled)
    .sort((a, b) => a.order - b.order);

  const handleSaveWidgets = (newWidgets: any[]) => {
    setDashboardWidgets(newWidgets);
    // Save to localStorage for persistence (exclude non-serializable icon property)
    const serializableWidgets = newWidgets.map(widget => ({
      id: widget.id,
      name: widget.name,
      description: widget.description,
      enabled: widget.enabled,
      order: widget.order,
      category: widget.category
    }));
    localStorage.setItem('dashboardWidgets', JSON.stringify(serializableWidgets));
    toast({
      title: "Dashboard Updated",
      description: "Your dashboard layout has been saved successfully.",
    });
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
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                // Trigger keyboard shortcut to open modal
                const event = new KeyboardEvent('keydown', { key: 't' });
                document.dispatchEvent(event);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Task
              <kbd className="kbd-light ml-2">T</kbd>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              onClick={() => setIsCustomizationModalOpen(true)}
            >
              <Settings className="w-4 h-4" />
              <span className="sr-only">Customize Dashboard</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {enabledWidgets.map((widget) => {
          switch (widget.id) {
            case "urgent-tasks":
              return (
                <Card key={widget.id} className="lg:col-span-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      {widget.icon}
                      <span className="ml-2">{widget.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {urgentTasksLoading ? (
                      <div className="space-y-2">
                        <div className="h-12 bg-slate-100 rounded animate-pulse"></div>
                        <div className="h-12 bg-slate-100 rounded animate-pulse"></div>
                      </div>
                    ) : urgentTasks && urgentTasks.length > 0 ? (
                      <div className="space-y-3">
                        {urgentTasks.slice(0, 3).map((task: any) => (
                          <div key={task.id} className={`p-3 rounded-lg border ${getTaskCardClass(task.priority)}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{task.title}</h4>
                                <p className="text-xs text-slate-600 mt-1">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                  {task.priority}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCompleteTask(task.id)}
                                  disabled={completeTaskMutation.isPending}
                                  className="h-6 w-6 p-0"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setLocation("/tasks")}
                        >
                          View all tasks <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-slate-500">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No urgent tasks at the moment
                      </div>
                    )}
                  </CardContent>
                </Card>
              );

            case "stats-overview":
              return (
                <Card key={widget.id} className="lg:col-span-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      {widget.icon}
                      <span className="ml-2">{widget.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-16 bg-slate-100 rounded animate-pulse"></div>
                        <div className="h-16 bg-slate-100 rounded animate-pulse"></div>
                        <div className="h-16 bg-slate-100 rounded animate-pulse"></div>
                        <div className="h-16 bg-slate-100 rounded animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3">
                          <div className="text-2xl font-bold text-primary">{stats?.totalProperties || 0}</div>
                          <div className="text-xs text-slate-600">Properties</div>
                        </div>
                        <div className="text-center p-3">
                          <div className="text-2xl font-bold text-orange-600">{stats?.urgentTasks || 0}</div>
                          <div className="text-xs text-slate-600">Urgent Tasks</div>
                        </div>
                        <div className="text-center p-3">
                          <div className="text-2xl font-bold text-green-600">{stats?.completedTasks || 0}</div>
                          <div className="text-xs text-slate-600">Completed</div>
                        </div>
                        <div className="text-center p-3">
                          <div className="text-2xl font-bold text-blue-600">{stats?.activeTeamMembers || 0}</div>
                          <div className="text-xs text-slate-600">Team Members</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );

            case "team-chat":
              return (
                <Card key={widget.id} className="lg:col-span-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      {widget.icon}
                      <span className="ml-2">{widget.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {teamMessagesLoading ? (
                        <div className="space-y-2">
                          <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
                          <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
                        </div>
                      ) : teamMessages && teamMessages.length > 0 ? (
                        teamMessages.slice(0, 2).map((message: any) => (
                          <div key={message.id} className="flex space-x-3">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={message.user?.profileImageUrl} />
                              <AvatarFallback className="text-xs">
                                {message.user?.firstName?.[0]}{message.user?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-900">{message.message}</p>
                              <p className="text-xs text-slate-500">
                                {message.user?.firstName} • {formatTimeAgo(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-4">No recent messages</p>
                      )}
                      
                      <div className="flex space-x-2 pt-2">
                        <Textarea
                          placeholder="Send a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1 min-h-0 h-8 text-xs resize-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={handleSendMessage}
                          disabled={sendMessageMutation.isPending || !newMessage.trim()}
                          className="h-8 px-3"
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );

            case "recent-activity":
              return (
                <Card key={widget.id} className="lg:col-span-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center">
                        {widget.icon}
                        <span className="ml-2">{widget.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Settings className="w-3 h-3" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentActivityLoading ? (
                      <div className="space-y-2">
                        <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
                        <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
                        <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
                      </div>
                    ) : recentActivity && recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {recentActivity.slice(0, 4).map((activity: any) => (
                          <div key={activity.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-900">{activity.description}</p>
                              <p className="text-xs text-slate-500">{formatTimeAgo(activity.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-slate-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No recent activity
                      </div>
                    )}
                  </CardContent>
                </Card>
              );

            case "calendar":
              return <CalendarWidget key={widget.id} className="lg:col-span-4" />;

            case "support":
              return <SupportWidget key={widget.id} className="lg:col-span-4" />;

            case "duplicates":
              return <DuplicatesWidget key={widget.id} className="lg:col-span-4" />;

            default:
              return null;
          }
        })}
      </div>

      {/* Dashboard Customization Modal */}
      <DashboardCustomizationModal
        isOpen={isCustomizationModalOpen}
        onClose={() => setIsCustomizationModalOpen(false)}
        onSave={handleSaveWidgets}
        currentWidgets={dashboardWidgets}
      />
    </main>
  );
}