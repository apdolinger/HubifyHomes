import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  Edit, 
  Activity,
  CheckSquare,
  Building,
  Clock,
  TrendingUp,
  Users,
  Star,
  AlertCircle,
  Award,
  Plus,
  Trash2,
  CalendarIcon,
  MessageSquare,
  Settings
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ClientsStatsCustomizationModal, { StatsWidget } from "@/components/ClientsStatsCustomizationModal";

const editMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"), 
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "supervisor", "staff"]),
  isActive: z.boolean(),
});

type EditMemberFormData = z.infer<typeof editMemberSchema>;

const oooSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  reason: z.string().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type OOOFormData = z.infer<typeof oooSchema>;

export default function TeamMemberProfile() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();
  
  const memberId = params.id;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOOOModalOpen, setIsOOOModalOpen] = useState(false);
  const [isStatsCustomizeModalOpen, setIsStatsCustomizeModalOpen] = useState(false);

  // Default stats widgets configuration
  const defaultStatsWidgets: StatsWidget[] = [
    { id: 'completedTasks', name: 'Completed Tasks', description: 'Show completed tasks count', enabled: true, order: 1 },
    { id: 'activeTasks', name: 'Active Tasks', description: 'Show active tasks count', enabled: true, order: 2 },
    { id: 'managedProperties', name: 'Properties Managed', description: 'Show managed properties count', enabled: true, order: 3 },
    { id: 'completionRate', name: 'Completion Rate', description: 'Show task completion rate', enabled: true, order: 4 },
  ];

  // Load stats widgets configuration from localStorage
  const [statsWidgets, setStatsWidgets] = useState<StatsWidget[]>(() => {
    const saved = localStorage.getItem('teamMemberProfileStatsWidgets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultStatsWidgets;
      }
    }
    return defaultStatsWidgets;
  });

  // Save stats widgets configuration to localStorage
  const handleSaveStatsWidgets = (newWidgets: StatsWidget[]) => {
    setStatsWidgets(newWidgets);
    localStorage.setItem('teamMemberProfileStatsWidgets', JSON.stringify(newWidgets));
  };

  // Get current user for authorization
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  // Fetch out-of-office periods for this member
  const { data: oooPeriods = [], isLoading: oooLoading, error: oooError } = useQuery({
    queryKey: [`/api/out-of-office/${memberId}`],
    enabled: isAuthenticated && !!memberId,
  });

  // Fetch active out-of-office period
  const { data: activeOOO, isLoading: activeOOOLoading, error: activeOOOError } = useQuery({
    queryKey: [`/api/out-of-office/${memberId}/active`],
    enabled: isAuthenticated && !!memberId,
  });

  // Show error toast for OOO queries
  useEffect(() => {
    if (oooError || activeOOOError) {
      toast({
        title: "Error",
        description: "Failed to load out-of-office periods. Please try again.",
        variant: "destructive",
      });
    }
  }, [oooError, activeOOOError, toast]);

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

  // Fetch team member details
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: [`/api/users/${memberId}`],
    enabled: isAuthenticated && !!memberId,
  });

  // Fetch member's task statistics
  const { data: taskStats } = useQuery({
    queryKey: [`/api/users/${memberId}/task-stats`],
    enabled: isAuthenticated && !!memberId,
  });

  // Fetch member's recent tasks
  const { data: recentTasks = [] } = useQuery({
    queryKey: [`/api/tasks`, { assignedTo: memberId, limit: 10 }],
    enabled: isAuthenticated && !!memberId,
  });

  // Fetch member's properties (if any are managed by them)
  const { data: managedProperties = [] } = useQuery({
    queryKey: [`/api/properties`, { managerId: memberId }],
    enabled: isAuthenticated && !!memberId,
  });

  // Fetch messages where this user is mentioned
  const { data: mentionedMessages = [], isLoading: mentionedMessagesLoading } = useQuery({
    queryKey: [`/api/mentions/user/${memberId}`],
    enabled: isAuthenticated && !!memberId,
  });

  // Edit form
  const editForm = useForm<EditMemberFormData>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "staff",
      isActive: true,
    },
  });

  // Update form when member data loads
  useEffect(() => {
    if (member) {
      editForm.reset({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        email: member.email || "",
        role: member.role || "staff",
        isActive: member.isActive ?? true,
      });
    }
  }, [member, editForm]);

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async (data: EditMemberFormData) => {
      return await apiRequest("PATCH", `/api/users/${memberId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${memberId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Team member updated successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired", 
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 1000);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    },
  });

  const handleEditSubmit = (data: EditMemberFormData) => {
    updateMemberMutation.mutate(data);
  };

  // Out-of-Office form
  const oooForm = useForm<OOOFormData>({
    resolver: zodResolver(oooSchema),
    defaultValues: {
      startDate: undefined,
      endDate: undefined,
      reason: "",
    },
  });

  // Create OOO period mutation
  const createOOOMutation = useMutation({
    mutationFn: async (data: OOOFormData) => {
      return await apiRequest("POST", "/api/out-of-office", {
        userId: memberId,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        reason: data.reason || null,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/out-of-office/${memberId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/out-of-office/${memberId}/active`] });
      queryClient.invalidateQueries({ queryKey: ["/api/out-of-office/active-statuses"] });
      setIsOOOModalOpen(false);
      oooForm.reset();
      toast({
        title: "Success",
        description: "Out-of-office period added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create out-of-office period",
        variant: "destructive",
      });
    },
  });

  // Delete OOO period mutation
  const deleteOOOMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/out-of-office/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/out-of-office/${memberId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/out-of-office/${memberId}/active`] });
      queryClient.invalidateQueries({ queryKey: ["/api/out-of-office/active-statuses"] });
      toast({
        title: "Success",
        description: "Out-of-office period deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete out-of-office period",
        variant: "destructive",
      });
    },
  });

  const handleOOOSubmit = (data: OOOFormData) => {
    createOOOMutation.mutate(data);
  };

  const handleDeleteOOO = (id: number) => {
    if (confirm("Are you sure you want to delete this out-of-office period?")) {
      deleteOOOMutation.mutate(id);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "supervisor":
        return "default";
      case "staff":
        return "secondary";
      default:
        return "outline";
    }
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

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || 'U'}${lastName?.[0] || 'U'}`.toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const renderMessageWithMentions = (content: string) => {
    const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>{content.substring(lastIndex, match.index)}</span>
        );
      }

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

    if (lastIndex < content.length) {
      parts.push(<span key={`text-${key++}`}>{content.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : content;
  };

  if (isLoading || memberLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Team Member Not Found</h2>
          <p className="text-slate-600 mb-4">The requested team member could not be found.</p>
          <Button onClick={() => setLocation("/team")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setLocation("/team")} data-testid="back-to-team">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Team
            </Button>
            
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={member.profileImageUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {getUserInitials(member.firstName, member.lastName)}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-2xl font-bold text-slate-900" data-testid="member-name">
                  {member.firstName} {member.lastName}
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <Badge variant={getRoleColor(member.role)} data-testid="member-role">
                    {member.role}
                  </Badge>
                  <Badge variant={member.isActive ? "default" : "secondary"} data-testid="member-status">
                    {member.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex items-center text-sm text-slate-600">
                    <Mail className="w-3 h-3 mr-1" />
                    {member.email}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0">
            {/* Only show edit button for admins/supervisors or if editing own profile */}
            {(currentUser && (currentUser.role === 'admin' || currentUser.role === 'supervisor' || currentUser.id === memberId)) && (
              <Button onClick={() => setIsEditModalOpen(true)} data-testid="edit-member-btn">
                <Edit className="w-4 h-4 mr-2" />
                Edit Member
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Stats Overview</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatsCustomizeModalOpen(true)}
            data-testid="customize-team-member-stats-btn"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        <div className={`grid grid-cols-1 gap-6 ${
          statsWidgets.filter(w => w.enabled).length === 1 ? 'md:grid-cols-1 max-w-sm' :
          statsWidgets.filter(w => w.enabled).length === 2 ? 'md:grid-cols-2' :
          statsWidgets.filter(w => w.enabled).length === 3 ? 'md:grid-cols-3' :
          statsWidgets.filter(w => w.enabled).length === 4 ? 'md:grid-cols-4' :
          'md:grid-cols-5'
        }`}>
          {statsWidgets
            .filter(widget => widget.enabled)
            .sort((a, b) => a.order - b.order)
            .map((widget) => {
              const widgetConfigs = {
                completedTasks: {
                  bgColor: 'bg-green-100',
                  iconColor: 'text-green-600',
                  label: 'Completed Tasks',
                  value: taskStats?.completed || 0,
                  icon: CheckSquare,
                  testId: 'completed-tasks'
                },
                activeTasks: {
                  bgColor: 'bg-yellow-100',
                  iconColor: 'text-yellow-600',
                  label: 'Active Tasks',
                  value: taskStats?.active || 0,
                  icon: Clock,
                  testId: 'active-tasks'
                },
                managedProperties: {
                  bgColor: 'bg-blue-100',
                  iconColor: 'text-blue-600',
                  label: 'Properties Managed',
                  value: managedProperties.length,
                  icon: Building,
                  testId: 'managed-properties'
                },
                completionRate: {
                  bgColor: 'bg-purple-100',
                  iconColor: 'text-purple-600',
                  label: 'Completion Rate',
                  value: `${taskStats?.completionRate || 0}%`,
                  icon: TrendingUp,
                  testId: 'completion-rate'
                }
              };

              const config = widgetConfigs[widget.id as keyof typeof widgetConfigs];
              if (!config) return null;

              const IconComponent = config.icon;

              return (
                <Card key={widget.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 ${config.bgColor} rounded-full flex items-center justify-center`}>
                          <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
                        </div>
                      </div>
                      <div className="ml-4">
                        <dl>
                          <dt className="text-sm font-medium text-slate-500 truncate">
                            {config.label}
                          </dt>
                          <dd className="text-2xl font-semibold text-slate-900" data-testid={config.testId}>
                            {config.value}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Out-of-Office Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Out-of-Office
                  </div>
                  {activeOOO && (
                    <Badge variant="default" className="bg-yellow-500">
                      Currently Out
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Set your out-of-office periods. Tasks assigned during these times will notify your supervisor.
                </p>
                
                {/* Loading state */}
                {(oooLoading || activeOOOLoading) && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
                
                {/* Show active period */}
                {!oooLoading && !activeOOOLoading && activeOOO && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-slate-900">Active Period</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {format(new Date(activeOOO.startDate), "MMM d, yyyy")} - {format(new Date(activeOOO.endDate), "MMM d, yyyy")}
                    </p>
                    {activeOOO.reason && (
                      <p className="text-xs text-slate-600 mt-1 italic">{activeOOO.reason}</p>
                    )}
                  </div>
                )}
                
                {/* List of upcoming periods */}
                {!oooLoading && !activeOOOLoading && oooPeriods.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-slate-700">Scheduled Periods</p>
                    {oooPeriods
                      .filter((period: any) => new Date(period.endDate) >= new Date())
                      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                      .slice(0, 3)
                      .map((period: any) => (
                        <div key={period.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div className="flex-1">
                            <p className="text-xs text-slate-900">
                              {format(new Date(period.startDate), "MMM d")} - {format(new Date(period.endDate), "MMM d, yyyy")}
                            </p>
                            {period.reason && (
                              <p className="text-xs text-slate-500 truncate">{period.reason}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOOO(period.id)}
                            data-testid={`delete-ooo-${period.id}`}
                            disabled={deleteOOOMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
                
                {!oooLoading && !activeOOOLoading && (
                  <Button 
                    className="w-full" 
                    onClick={() => setIsOOOModalOpen(true)}
                    data-testid="add-ooo-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Out-of-Office Period
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Tasks Completed</span>
                  <span className="font-semibold">{taskStats?.completed || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Active Tasks</span>
                  <span className="font-semibold">{taskStats?.active || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Properties Managed</span>
                  <span className="font-semibold">{managedProperties.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Full Name</label>
                  <p className="text-slate-900">{member.firstName} {member.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Email</label>
                  <p className="text-slate-900">{member.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Role</label>
                  <p className="text-slate-900 capitalize">{member.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Member Since</label>
                  <p className="text-slate-900">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {recentTasks.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-slate-900">{task.title}</h4>
                          <p className="text-xs text-slate-600 mt-1">
                            {task.property?.name && `${task.property.name} • `}
                            {formatTimeAgo(task.updatedAt)}
                          </p>
                        </div>
                        <Badge variant={getTaskStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-slate-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No recent activity
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task History</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTasks.length > 0 ? (
                <div className="space-y-4">
                  {recentTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-slate-900">{task.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                          {task.property && (
                            <span className="flex items-center">
                              <Building className="w-3 h-3 mr-1" />
                              {task.property.name}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={getTaskStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                        <Badge variant="outline">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-500">
                  <CheckSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  No tasks assigned to this member
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Managed Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {managedProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {managedProperties.map((property: any) => (
                    <div key={property.id} className="p-4 border border-slate-200 rounded-lg">
                      <h3 className="text-sm font-medium text-slate-900">{property.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {property.address1}, {property.city}, {property.state}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline">{property.type}</Badge>
                        <Badge variant={property.status === 'occupied' ? 'default' : 'secondary'}>
                          {property.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-500">
                  <Building className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  No properties currently managed by this member
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Mentioned Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mentionedMessagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : mentionedMessages.length > 0 ? (
                <div className="space-y-4">
                  {mentionedMessages.map((mention: any) => (
                    <div key={mention.id} className="p-4 border border-slate-200 rounded-lg bg-white">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getUserInitials(mention.message.author.firstName, mention.message.author.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-slate-900">
                              {mention.message.author.firstName} {mention.message.author.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatTimeAgo(mention.message.createdAt)}
                            </p>
                          </div>
                          <p className="text-sm text-slate-700">
                            {renderMessageWithMentions(mention.message.content)}
                          </p>
                          {mention.message.isEdited && (
                            <p className="text-xs text-slate-400 mt-1">(edited)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  No messages mention this user yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-4 h-4 mr-2" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Task Completion Rate</span>
                  <span className="text-sm font-medium">{taskStats?.completionRate || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Average Response Time</span>
                  <span className="text-sm font-medium">{taskStats?.avgResponseTime || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">On-Time Completion</span>
                  <span className="text-sm font-medium">{taskStats?.onTimeRate || 0}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-4 h-4 mr-2" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-sm text-slate-500">
                  <Star className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  Achievement tracking coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Member Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="edit-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="edit-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="edit-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  data-testid="cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMemberMutation.isPending}
                  data-testid="save-member"
                >
                  {updateMemberMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Out-of-Office Modal */}
      <Dialog open={isOOOModalOpen} onOpenChange={setIsOOOModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Out-of-Office Period</DialogTitle>
          </DialogHeader>
          <Form {...oooForm}>
            <form onSubmit={oooForm.handleSubmit(handleOOOSubmit)} className="space-y-4">
              <FormField
                control={oooForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="start-date-picker"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={oooForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="end-date-picker"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={oooForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Vacation, Personal leave..."
                        {...field}
                        data-testid="ooo-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOOOModalOpen(false)}
                  data-testid="cancel-ooo"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createOOOMutation.isPending}
                  data-testid="save-ooo"
                >
                  {createOOOMutation.isPending ? "Adding..." : "Add Period"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Stats Customization Modal */}
      <ClientsStatsCustomizationModal
        isOpen={isStatsCustomizeModalOpen}
        onClose={() => setIsStatsCustomizeModalOpen(false)}
        currentWidgets={statsWidgets}
        defaultWidgets={defaultStatsWidgets}
        onSave={handleSaveStatsWidgets}
      />
    </main>
  );
}