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
  Award
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const editMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"), 
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "supervisor", "staff"]),
  isActive: z.boolean(),
});

type EditMemberFormData = z.infer<typeof editMemberSchema>;

export default function TeamMemberProfile() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();
  
  const memberId = params.id;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Get current user for authorization
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Completed Tasks
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900" data-testid="completed-tasks">
                    {taskStats?.completed || 0}
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
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Active Tasks
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900" data-testid="active-tasks">
                    {taskStats?.active || 0}
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
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Properties Managed
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900" data-testid="managed-properties">
                    {managedProperties.length}
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
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Completion Rate
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900" data-testid="completion-rate">
                    {taskStats?.completionRate || 0}%
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
    </main>
  );
}