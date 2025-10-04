import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTaskModal } from "@/contexts/TaskModalContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  X,
  Reply,
  Heart,
  ThumbsUp,
  Smile,
  Mail
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import DashboardCustomizationModal from "@/components/DashboardCustomizationModal";
import { CalendarWidget, SupportWidget, DuplicatesWidget } from "@/components/DashboardWidgets";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openTaskModal } = useTaskModal();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [newMessage, setNewMessage] = useState("");
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [emailNotification, setEmailNotification] = useState(false);
  
  // @mention autocomplete state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  
  // Recent Activity filter state
  const [activityFilter, setActivityFilter] = useState<"all" | "task" | "property" | "contact">("all");
  
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

// Helper function to render message content with highlighted @mentions
function renderMessageWithMentions(content: string) {
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>{content.substring(lastIndex, match.index)}</span>
      );
    }

    // Add the highlighted mention
    parts.push(
      <span
        key={`mention-${key++}`}
        className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1 rounded font-medium"
      >
        @{match[1]}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < content.length) {
    parts.push(<span key={`text-${key++}`}>{content.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : content;
}

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

  // Team members query for @mention autocomplete
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && showMentionDropdown,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, emailNotification }: { content: string; emailNotification: boolean }) => {
      return await apiRequest("POST", "/api/team-messages", { content, emailNotification });
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

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      return await apiRequest("PUT", `/api/team-messages/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
      setEditingMessageId(null);
      setEditingContent("");
      toast({
        title: "Message updated",
        description: "Your message has been updated.",
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
        description: "Failed to update message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/team-messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
      toast({
        title: "Message deleted",
        description: "The message has been deleted.",
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
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
    },
  });



  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({ content: newMessage.trim(), emailNotification });
  };

  const handleEditMessage = (message: any) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleSaveEdit = () => {
    if (!editingContent.trim() || !editingMessageId) return;
    editMessageMutation.mutate({ id: editingMessageId, content: editingContent.trim() });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleDeleteMessage = (messageId: number) => {
    if (confirm("Are you sure you want to delete this message?")) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  // Reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: number; reaction: string }) => {
      return await apiRequest("POST", `/api/team-messages/${messageId}/reactions`, { reaction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
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
        description: "Failed to add reaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ messageId, content, emailNotification }: { messageId: number; content: string; emailNotification: boolean }) => {
      return await apiRequest("POST", `/api/team-messages/${messageId}/reply`, { content, emailNotification });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
      setReplyingToId(null);
      setReplyContent("");
      setEmailNotification(false);
      toast({
        title: "Reply sent",
        description: "Your reply has been sent.",
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
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReaction = (messageId: number, reaction: string) => {
    reactionMutation.mutate({ messageId, reaction });
  };

  const handleStartReply = (messageId: number) => {
    setReplyingToId(messageId);
    setReplyContent("");
  };

  const handleSendReply = () => {
    if (!replyContent.trim() || !replyingToId) return;
    replyMutation.mutate({ 
      messageId: replyingToId, 
      content: replyContent.trim(),
      emailNotification 
    });
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyContent("");
    setEmailNotification(false);
  };



  // Get enabled widgets sorted by order
  const enabledWidgets = dashboardWidgets
    .filter((widget) => widget.enabled)
    .sort((a, b) => a.order - b.order);

  const handleSaveWidgets = (newWidgets: typeof dashboardWidgets) => {
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
                    ) : urgentTasks && Array.isArray(urgentTasks) && urgentTasks.length > 0 ? (
                      <div className="space-y-3">
                        {urgentTasks.slice(0, 3).map((task: any) => (
                          <div 
                            key={task.id} 
                            className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getTaskCardClass(task.priority)}`}
                            onClick={() => setLocation(`/task-profile/${task.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{task.title}</h4>
                                <p className="text-xs text-slate-600 mt-1">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center">
                                <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                  {task.priority}
                                </Badge>
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
                        <div 
                          className="text-center p-3 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors"
                          onClick={() => setLocation('/properties')}
                          data-testid="stat-properties"
                        >
                          <div className="text-2xl font-bold text-primary">{(stats as any)?.totalProperties || 0}</div>
                          <div className="text-xs text-slate-600">Properties</div>
                        </div>
                        <div 
                          className="text-center p-3 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors"
                          onClick={() => setLocation('/tasks?priority=urgent')}
                          data-testid="stat-urgent-tasks"
                        >
                          <div className="text-2xl font-bold text-orange-600">{(stats as any)?.urgentTasks || 0}</div>
                          <div className="text-xs text-slate-600">Urgent Tasks</div>
                        </div>
                        <div 
                          className="text-center p-3 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors"
                          onClick={() => setLocation('/tasks?status=overdue')}
                          data-testid="stat-overdue"
                        >
                          <div className="text-2xl font-bold text-red-600">{(stats as any)?.overdueTasks || 0}</div>
                          <div className="text-xs text-slate-600">Overdue</div>
                        </div>
                        <div 
                          className="text-center p-3 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors"
                          onClick={() => setLocation('/team')}
                          data-testid="stat-team-members"
                        >
                          <div className="text-2xl font-bold text-blue-600">{(stats as any)?.activeTeam || 0}</div>
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
                      ) : teamMessages && Array.isArray(teamMessages) && teamMessages.length > 0 ? (
                        teamMessages.slice(0, 2).map((message: any) => (
                          <div key={message.id} className="flex space-x-3 group">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={message.user?.profileImageUrl} />
                              <AvatarFallback className="text-xs">
                                {message.user?.firstName?.[0]}{message.user?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              {editingMessageId === message.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="text-xs resize-none min-h-0 h-16"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit();
                                      }
                                      if (e.key === "Escape") {
                                        handleCancelEdit();
                                      }
                                    }}
                                  />
                                  <div className="flex space-x-1">
                                    <Button
                                      size="sm"
                                      onClick={handleSaveEdit}
                                      disabled={editMessageMutation.isPending || !editingContent.trim()}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCancelEdit}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-xs text-slate-900">{renderMessageWithMentions(message.content)}</p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500">
                                      {message.author?.firstName} {message.author?.lastName} • {formatTimeAgo(message.createdAt)}
                                      {message.isEdited && " (edited)"}
                                      {message.emailNotification && <Mail className="w-3 h-3 inline ml-1" />}
                                    </p>
                                    <div className="flex items-center space-x-1">
                                      {/* Reaction buttons */}
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleReaction(message.id, "👍")}
                                          className="h-5 w-5 p-0 text-xs"
                                          title="Like"
                                        >
                                          👍
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleReaction(message.id, "❤️")}
                                          className="h-5 w-5 p-0 text-xs"
                                          title="Love"
                                        >
                                          ❤️
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleReaction(message.id, "😄")}
                                          className="h-5 w-5 p-0 text-xs"
                                          title="Laugh"
                                        >
                                          😄
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleStartReply(message.id)}
                                          className="h-5 w-5 p-0"
                                          title="Reply"
                                        >
                                          <Reply className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      {/* Edit/Delete buttons for message author */}
                                      {user && message.authorId === user.id && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEditMessage(message)}
                                            className="h-5 w-5 p-0"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteMessage(message.id)}
                                            className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Display reactions */}
                                  {message.reactions && message.reactions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {Object.entries(
                                        message.reactions.reduce((acc: any, reaction: any) => {
                                          const key = reaction.reaction;
                                          if (!acc[key]) acc[key] = [];
                                          acc[key].push(reaction);
                                          return acc;
                                        }, {})
                                      ).map(([emoji, reactions]: [string, any]) => {
                                        const userReacted = (reactions as any[]).some((r: any) => r.userId === user?.id);
                                        return (
                                          <Button
                                            key={emoji}
                                            size="sm"
                                            variant={userReacted ? "default" : "outline"}
                                            onClick={() => handleReaction(message.id, emoji)}
                                            className={`h-5 text-xs px-1 ${userReacted ? 'bg-blue-100 border-blue-300' : ''}`}
                                          >
                                            {emoji} {(reactions as any[]).length}
                                          </Button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Display replies */}
                                  {message.replies && message.replies.length > 0 && (
                                    <div className="mt-2 pl-4 border-l-2 border-slate-200 space-y-2">
                                      {message.replies.map((reply: any) => (
                                        <div key={reply.id} className="text-xs">
                                          <div className="flex items-start space-x-2">
                                            <Avatar className="h-4 w-4">
                                              <AvatarImage src={reply.author?.profileImageUrl} />
                                              <AvatarFallback className="text-xs">
                                                {reply.author?.firstName?.[0]}{reply.author?.lastName?.[0]}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                              <p className="text-slate-900">{reply.content}</p>
                                              <p className="text-slate-500 text-xs">
                                                {reply.author?.firstName} {reply.author?.lastName} • {formatTimeAgo(reply.createdAt)}
                                                {reply.isEdited && " (edited)"}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Reply input */}
                                  {replyingToId === message.id && (
                                    <div className="mt-2 space-y-2">
                                      <Textarea
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="Write a reply..."
                                        className="text-xs resize-none min-h-0 h-16"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendReply();
                                          }
                                          if (e.key === "Escape") {
                                            handleCancelReply();
                                          }
                                        }}
                                      />
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id="reply-email"
                                            checked={emailNotification}
                                            onCheckedChange={(checked) => setEmailNotification(!!checked)}
                                          />
                                          <label htmlFor="reply-email" className="text-xs text-slate-600">
                                            Email team members
                                          </label>
                                        </div>
                                        <div className="flex space-x-1">
                                          <Button
                                            size="sm"
                                            onClick={handleSendReply}
                                            disabled={replyMutation.isPending || !replyContent.trim()}
                                            className="h-6 px-2 text-xs"
                                          >
                                            <Check className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCancelReply}
                                            className="h-6 px-2 text-xs"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-4">No recent messages</p>
                      )}
                      
                      <div className="pt-2 space-y-2">
                        <Textarea
                          placeholder="Send a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="w-full min-h-0 h-16 text-xs resize-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="message-email"
                              checked={emailNotification}
                              onCheckedChange={(checked) => setEmailNotification(!!checked)}
                            />
                            <label htmlFor="message-email" className="text-xs text-slate-600">
                              Email team members
                            </label>
                          </div>
                          <Button
                            size="sm"
                            onClick={handleSendMessage}
                            disabled={sendMessageMutation.isPending || !newMessage.trim()}
                            className="h-7 px-3"
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );

            case "recent-activity":
              // Filter activity based on selected category
              const filteredActivity = recentActivity && Array.isArray(recentActivity)
                ? recentActivity.filter((activity: any) => {
                    if (activityFilter === "all") return true;
                    return activity.entityType === activityFilter;
                  })
                : [];

              return (
                <Card key={widget.id} className="lg:col-span-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center">
                        {widget.icon}
                        <span className="ml-2">{widget.name}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            data-testid="button-activity-filter"
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setActivityFilter("all")}
                            className={activityFilter === "all" ? "bg-slate-100" : ""}
                            data-testid="filter-all"
                          >
                            <CheckCircle className="w-3 h-3 mr-2" />
                            All Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setActivityFilter("task")}
                            className={activityFilter === "task" ? "bg-slate-100" : ""}
                            data-testid="filter-tasks"
                          >
                            <AlertTriangle className="w-3 h-3 mr-2" />
                            Tasks
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setActivityFilter("property")}
                            className={activityFilter === "property" ? "bg-slate-100" : ""}
                            data-testid="filter-properties"
                          >
                            <Building className="w-3 h-3 mr-2" />
                            Properties
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setActivityFilter("contact")}
                            className={activityFilter === "contact" ? "bg-slate-100" : ""}
                            data-testid="filter-contacts"
                          >
                            <Users className="w-3 h-3 mr-2" />
                            Contacts
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredActivity && filteredActivity.length > 0 ? (
                      <div className="space-y-3">
                        {filteredActivity.slice(0, 4).map((activity: any) => (
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
                        {activityFilter === "all" 
                          ? "No recent activity" 
                          : `No recent ${activityFilter} activity`}
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