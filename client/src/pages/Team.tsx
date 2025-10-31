import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Mail, User, Search, Settings, ArrowUpDown, ArrowUp, ArrowDown, Filter, ChevronDown, ChevronUp, UserPlus, UserCheck, ShieldCheck, UserCog } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TableCustomizationModal, { ColumnConfig } from "@/components/TableCustomizationModal";
import ClientsStatsCustomizationModal, { StatsWidget } from "@/components/ClientsStatsCustomizationModal";

// Form schema for inviting team members
const inviteTeamMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["staff", "supervisor", "admin"], {
    required_error: "Please select a role",
  }),
});

type InviteTeamMemberForm = z.infer<typeof inviteTeamMemberSchema>;

// Form schema for creating teams
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).min(1, "At least one team member is required"),
  teamLeadId: z.string().optional(),
});

type CreateTeamForm = z.infer<typeof createTeamSchema>;

export default function Team() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isTeamCreationModalOpen, setIsTeamCreationModalOpen] = useState(false);
  const [isTeamAssignmentsModalOpen, setIsTeamAssignmentsModalOpen] = useState(false);
  const [selectedTeamForManagement, setSelectedTeamForManagement] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isMyTeamExpanded, setIsMyTeamExpanded] = useState(true);
  const [isStatsCustomizeModalOpen, setIsStatsCustomizeModalOpen] = useState(false);

  // Default stats widgets configuration
  const defaultStatsWidgets: StatsWidget[] = [
    { id: 'totalTeams', name: 'Total Teams', description: 'Show total number of teams', enabled: true, order: 1 },
    { id: 'totalMembers', name: 'Total Members', description: 'Show total team members count', enabled: true, order: 2 },
    { id: 'admins', name: 'Admins', description: 'Show admins count', enabled: true, order: 3 },
    { id: 'supervisors', name: 'Supervisors', description: 'Show supervisors count', enabled: true, order: 4 },
    { id: 'staff', name: 'Staff', description: 'Show staff count', enabled: true, order: 5 },
  ];

  // Load stats widgets configuration from localStorage
  const [statsWidgets, setStatsWidgets] = useState<StatsWidget[]>(() => {
    const saved = localStorage.getItem('teamStatsWidgets');
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
    localStorage.setItem('teamStatsWidgets', JSON.stringify(newWidgets));
  };

  // Default column configuration for team table
  const defaultColumns: ColumnConfig[] = [
    { id: 'member', label: 'Member', visible: true, required: true },
    { id: 'email', label: 'Email', visible: true },
    { id: 'role', label: 'Role', visible: true },
    { id: 'status', label: 'Status', visible: true },
  ];

  // Load column configuration from localStorage
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('teamTableColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });

  // Save column configuration to localStorage
  const handleSaveColumns = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    localStorage.setItem('teamTableColumns', JSON.stringify(newColumns));
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort icon helper
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

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

  // Fetch current user info
  const { data: currentUser, isLoading: currentUserLoading } = useQuery({
    queryKey: ["/api/current-user"],
    enabled: isAuthenticated,
  });

  // Fetch team members from API
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  // Fetch user's teams - only when currentUser is loaded
  const { data: userTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: [`/api/users/${currentUser?.id}/teams`],
    enabled: isAuthenticated && !!currentUser?.id && !currentUserLoading,
  });

  // Fetch all organization teams
  const { data: allTeams = [], isLoading: allTeamsLoading } = useQuery({
    queryKey: ["/api/teams"],
    enabled: isAuthenticated,
  });

  // Fetch active OOO periods for all team members
  const { data: activeOOOPeriods = {} } = useQuery({
    queryKey: ["/api/out-of-office/active-statuses"],
    enabled: isAuthenticated && teamMembers.length > 0,
    select: (data: any) => {
      // Transform array of OOO periods into a map by userId for quick lookup
      if (!Array.isArray(data)) return {};
      return data.reduce((acc: any, period: any) => {
        acc[period.userId] = period;
        return acc;
      }, {});
    },
  });

  // Helper function to check if user is currently out of office
  const isUserOutOfOffice = (member: any) => {
    return !!activeOOOPeriods[member.id];
  };

  // Form for inviting team members
  const inviteForm = useForm<InviteTeamMemberForm>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "staff",
    },
  });

  // Mutation for creating new team members
  const createTeamMemberMutation = useMutation({
    mutationFn: async (data: InviteTeamMemberForm) => {
      return apiRequest("POST", "/api/users", {
        ...data,
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate a temporary ID
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsInviteModalOpen(false);
      inviteForm.reset();
      toast({
        title: "Team member invited!",
        description: "The new team member has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInviteTeamMember = (data: InviteTeamMemberForm) => {
    createTeamMemberMutation.mutate(data);
  };

  // Form for creating teams
  const teamCreationForm = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      memberIds: [],
      teamLeadId: "",
    },
  });

  // Mutation for creating new teams
  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamForm) => {
      const response = await apiRequest("POST", "/api/teams", {
        name: data.name,
        description: data.description,
      });
      const team = await response.json();
      
      // Add the creator as a member of the team first
      if (currentUser?.id) {
        await apiRequest("POST", `/api/teams/${team.id}/members`, {
          userId: currentUser.id,
          role: currentUser.id === data.teamLeadId ? "lead" : "member",
        });
      }
      
      // Add selected members to the team
      for (const memberId of data.memberIds) {
        // Skip if already added (the creator)
        if (memberId !== currentUser?.id) {
          await apiRequest("POST", `/api/teams/${team.id}/members`, {
            userId: memberId,
            role: memberId === data.teamLeadId ? "lead" : "member",
          });
        }
      }
      
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}/teams`] });
      setIsTeamCreationModalOpen(false);
      teamCreationForm.reset();
      toast({
        title: "Team created!",
        description: "Your team has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create team. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTeam = (data: CreateTeamForm) => {
    createTeamMutation.mutate(data);
  };

  // Mutation for adding team member
  const addTeamMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      return apiRequest("POST", `/api/teams/${teamId}/members`, {
        userId,
        role: "member",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}/teams`] });
      toast({
        title: "Member added",
        description: "Team member has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for removing team member
  const removeTeamMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      return apiRequest("DELETE", `/api/teams/${teamId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}/teams`] });
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating team member role
  // Backend automatically demotes existing leads when promoting a new one
  const updateTeamMemberRoleMutation = useMutation({
    mutationFn: async ({ teamId, userId, role }: { teamId: string; userId: string; role: 'lead' | 'member' }) => {
      return apiRequest("PATCH", `/api/teams/${teamId}/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}/teams`] });
      toast({
        title: "Role updated",
        description: "Team member role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "supervisor":
        return "default";
      case "staff":
        return "secondary";
      case "client":
        return "outline";
      default:
        return "outline";
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  // Reset to page 1 when items per page, search term, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, roleFilter, statusFilter]);

  // Filter and sort team members
  const filteredAndSortedTeamMembers = teamMembers
    .filter((member: any) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          member.firstName?.toLowerCase().includes(searchLower) ||
          member.lastName?.toLowerCase().includes(searchLower) ||
          member.email?.toLowerCase().includes(searchLower) ||
          member.role?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Role filter
      if (roleFilter !== "all" && member.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "active" && !member.isActive) {
        return false;
      }
      if (statusFilter === "inactive" && member.isActive) {
        return false;
      }
      if (statusFilter === "out_of_office" && !isUserOutOfOffice(member)) {
        return false;
      }

      return true;
    })
    .sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle special cases
      if (sortField === "name" || sortField === "lastName") {
        aValue = `${a.lastName} ${a.firstName}`;
        bValue = `${b.lastName} ${b.firstName}`;
      } else if (sortField === "firstName") {
        aValue = a.firstName;
        bValue = b.firstName;
      }

      // Convert to lowercase for comparison
      aValue = aValue?.toString().toLowerCase() || "";
      bValue = bValue?.toString().toLowerCase() || "";

      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

  // Paginate the filtered and sorted team members
  const totalItems = filteredAndSortedTeamMembers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const effectivePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

  // Update currentPage state if it exceeds valid range
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalItems, itemsPerPage, currentPage, totalPages]);

  const startIndex = (effectivePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTeamMembers = filteredAndSortedTeamMembers.slice(startIndex, endIndex);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Team</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your team members and their roles
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button 
              onClick={() => setIsInviteModalOpen(true)}
              data-testid="invite-team-member-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Invite Team Member
            </Button>
          </div>
        </div>
      </div>

      {/* My Team Section - Collapsible */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Team</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Team members assigned to you or those you work closely with
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMyTeamExpanded(!isMyTeamExpanded)}
              data-testid="toggle-my-team-btn"
            >
              {isMyTeamExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {isMyTeamExpanded && (
          <CardContent>
            <div className="space-y-4">
              {teamsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-slate-500 mt-2">Loading teams...</p>
                </div>
              ) : userTeams.length === 0 ? (
                /* Empty state - Build your team */
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Build Your Team</h3>
                  <p className="text-slate-600 mb-4">
                    Create and manage your direct team assignments to collaborate more effectively.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsTeamCreationModalOpen(true)}
                      data-testid="build-team-btn"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Build Team
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsTeamAssignmentsModalOpen(true)}
                      data-testid="manage-team-assignments-btn"
                    >
                      Manage Team Assignments
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display teams */
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-slate-600">
                      You are a member of {userTeams.length} team{userTeams.length !== 1 ? 's' : ''}
                    </p>
                    <Button 
                      size="sm"
                      onClick={() => setIsTeamCreationModalOpen(true)}
                      data-testid="add-team-btn"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Team
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userTeams.map((team: any) => {
                      const teamLead = team.members?.find((m: any) => m.role === 'lead');
                      return (
                        <Card key={team.id} data-testid={`team-card-${team.id}`}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{team.name}</CardTitle>
                            {team.description && (
                              <p className="text-sm text-slate-500 mt-1">{team.description}</p>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Members</span>
                                <Badge variant="secondary">{team.memberCount || 0}</Badge>
                              </div>
                              {teamLead && (
                                <div className="flex items-center gap-2 text-sm">
                                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                                  <span className="text-slate-600">Lead:</span>
                                  <span className="font-medium">{teamLead.firstName} {teamLead.lastName}</span>
                                </div>
                              )}
                              {team.members && team.members.length > 0 && (
                                <div className="flex -space-x-2 mt-2">
                                  {team.members.slice(0, 5).map((member: any) => (
                                    <Avatar key={member.userId} className={`h-8 w-8 border-2 ${member.role === 'lead' ? 'border-blue-600' : 'border-white'}`}>
                                      <AvatarFallback className="text-xs">
                                        {getUserInitials(member.firstName || '', member.lastName || '')}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {team.members.length > 5 && (
                                    <div className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                                      <span className="text-xs text-slate-600">+{team.members.length - 5}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Team Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Stats Overview</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatsCustomizeModalOpen(true)}
            data-testid="customize-team-stats-btn"
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
                totalTeams: {
                  bgColor: 'bg-indigo-100',
                  iconColor: 'text-indigo-600',
                  label: 'Total Teams',
                  value: allTeams.length,
                  icon: Users,
                  testId: 'stat-total-teams'
                },
                totalMembers: {
                  bgColor: 'bg-purple-100',
                  iconColor: 'text-purple-600',
                  label: 'Total Members',
                  value: teamMembers.length,
                  icon: UserCheck,
                  testId: 'stat-total-members'
                },
                admins: {
                  bgColor: 'bg-blue-100',
                  iconColor: 'text-blue-600',
                  label: 'Admins',
                  value: teamMembers.filter((m: any) => m.role === 'admin').length,
                  icon: ShieldCheck,
                  testId: 'stat-admins'
                },
                supervisors: {
                  bgColor: 'bg-green-100',
                  iconColor: 'text-green-600',
                  label: 'Supervisors',
                  value: teamMembers.filter((m: any) => m.role === 'supervisor').length,
                  icon: UserCog,
                  testId: 'stat-supervisors'
                },
                staff: {
                  bgColor: 'bg-amber-100',
                  iconColor: 'text-amber-600',
                  label: 'Staff',
                  value: teamMembers.filter((m: any) => m.role === 'staff').length,
                  icon: User,
                  testId: 'stat-staff'
                }
              };

              const config = widgetConfigs[widget.id as keyof typeof widgetConfigs];
              if (!config) return null;

              const IconComponent = config.icon;

              return (
                <Card 
                  key={widget.id}
                  data-testid={config.testId}
                >
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
                          <dd className="text-2xl font-semibold text-slate-900">
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

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search team members by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="team-search-input"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="min-w-[140px]">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger data-testid="role-filter">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[160px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="out_of_office">Out of Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                  className="whitespace-nowrap"
                  data-testid="clear-filters-btn"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Members</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizeModalOpen(true)}
              data-testid="customize-team-table-btn"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {teamLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.find(col => col.id === 'member')?.visible && (
                    <TableHead className="w-[300px]">
                      <div className="flex items-center space-x-2">
                        <span>Member</span>
                      </div>
                    </TableHead>
                  )}
                  {columns.find(col => col.id === 'email')?.visible && (
                    <TableHead>
                      <div className="flex items-center space-x-2">
                        <span>Email</span>
                      </div>
                    </TableHead>
                  )}
                  {columns.find(col => col.id === 'role')?.visible && (
                    <TableHead>
                      <div className="flex items-center space-x-2">
                        <span>Role</span>
                      </div>
                    </TableHead>
                  )}
                  {columns.find(col => col.id === 'status')?.visible && (
                    <TableHead>Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    {columns.find(col => col.id === 'member')?.visible && (
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-slate-200 rounded-full animate-pulse"></div>
                          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                      </TableCell>
                    )}
                    {columns.find(col => col.id === 'email')?.visible && (
                      <TableCell>
                        <div className="h-3 w-48 bg-slate-200 rounded animate-pulse"></div>
                      </TableCell>
                    )}
                    {columns.find(col => col.id === 'role')?.visible && (
                      <TableCell>
                        <div className="h-5 w-16 bg-slate-200 rounded animate-pulse"></div>
                      </TableCell>
                    )}
                    {columns.find(col => col.id === 'status')?.visible && (
                      <TableCell>
                        <div className="h-5 w-12 bg-slate-200 rounded animate-pulse"></div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.find(col => col.id === 'member')?.visible && (
                    <TableHead 
                      className="w-[300px] cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("lastName")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Member</span>
                        {getSortIcon("lastName")}
                      </div>
                    </TableHead>
                  )}
                  {columns.find(col => col.id === 'email')?.visible && (
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Email</span>
                        {getSortIcon("email")}
                      </div>
                    </TableHead>
                  )}
                  {columns.find(col => col.id === 'role')?.visible && (
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("role")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Role</span>
                        {getSortIcon("role")}
                      </div>
                    </TableHead>
                  )}
                  {columns.find(col => col.id === 'status')?.visible && (
                    <TableHead>Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTeamMembers.map((member: any) => (
                  <TableRow 
                    key={member.id} 
                    className="hover:bg-slate-50 cursor-pointer" 
                    onClick={() => setLocation(`/team/member/${member.id}`)}
                    data-testid={`team-row-${member.id}`}
                  >
                    {columns.find(col => col.id === 'member')?.visible && (
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {getUserInitials(member.firstName || 'U', member.lastName || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="font-medium text-slate-900">
                            {member.firstName} {member.lastName}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    
                    {columns.find(col => col.id === 'email')?.visible && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span className="text-sm text-slate-600">{member.email}</span>
                        </div>
                      </TableCell>
                    )}
                    
                    {columns.find(col => col.id === 'role')?.visible && (
                      <TableCell>
                        <Badge variant={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                      </TableCell>
                    )}
                    
                    {columns.find(col => col.id === 'status')?.visible && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant={member.isActive ? "default" : "secondary"}>
                            {member.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {isUserOutOfOffice(member) && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              Out of Office
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination */}
          {totalItems > 0 && (
            <TablePagination
              currentPage={effectivePage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Invite Team Member Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(handleInviteTeamMember)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={inviteForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter first name"
                          data-testid="input-first-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={inviteForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter last name"
                          data-testid="input-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email" 
                        placeholder="Enter email address"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteModalOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTeamMemberMutation.isPending}
                  data-testid="button-invite"
                >
                  {createTeamMemberMutation.isPending ? "Inviting..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Table Customization Modal */}
      <TableCustomizationModal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        columns={columns}
        defaultColumns={defaultColumns}
        onSave={handleSaveColumns}
      />

      {/* Stats Customization Modal */}
      <ClientsStatsCustomizationModal
        isOpen={isStatsCustomizeModalOpen}
        onClose={() => setIsStatsCustomizeModalOpen(false)}
        currentWidgets={statsWidgets}
        defaultWidgets={defaultStatsWidgets}
        onSave={handleSaveStatsWidgets}
      />

      {/* Team Creation Modal */}
      <Dialog open={isTeamCreationModalOpen} onOpenChange={setIsTeamCreationModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Build Your Team</DialogTitle>
          </DialogHeader>
          
          <Form {...teamCreationForm}>
            <form onSubmit={teamCreationForm.handleSubmit(handleCreateTeam)} className="space-y-4">
              <FormField
                control={teamCreationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Field Crew A, Office Team"
                        data-testid="input-team-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={teamCreationForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Brief description of the team's purpose"
                        data-testid="input-team-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={teamCreationForm.control}
                name="memberIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Members</FormLabel>
                    <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-slate-500">No team members available</p>
                      ) : (
                        teamMembers
                          .filter((member: any) => member.isActive)
                          .map((member: any) => (
                            <div key={member.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`member-${member.id}`}
                                checked={field.value?.includes(member.id)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentValue, member.id]);
                                  } else {
                                    field.onChange(currentValue.filter((id: string) => id !== member.id));
                                  }
                                }}
                                data-testid={`checkbox-member-${member.id}`}
                              />
                              <label
                                htmlFor={`member-${member.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center space-x-2 cursor-pointer"
                                data-testid={`label-member-${member.id}`}
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {getUserInitials(member.firstName || '', member.lastName || '')}
                                  </AvatarFallback>
                                </Avatar>
                                <span>
                                  {member.firstName} {member.lastName}
                                </span>
                                <Badge variant={getRoleColor(member.role)} className="text-xs">
                                  {member.role}
                                </Badge>
                              </label>
                            </div>
                          ))
                      )}
                    </div>
                    <FormMessage />
                    <p className="text-xs text-slate-500 mt-1">
                      Select at least one team member
                    </p>
                  </FormItem>
                )}
              />
              
              <FormField
                control={teamCreationForm.control}
                name="teamLeadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Lead (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-team-lead">
                          <SelectValue placeholder="Select a team lead" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamCreationForm.watch("memberIds")?.length > 0 ? (
                          teamMembers
                            .filter((member: any) => 
                              member.isActive && 
                              teamCreationForm.watch("memberIds")?.includes(member.id)
                            )
                            .map((member: any) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.firstName} {member.lastName}
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="" disabled>
                            Select team members first
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-slate-500 mt-1">
                      Choose a team lead from the selected members
                    </p>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTeamCreationModalOpen(false)}
                  data-testid="button-cancel-team"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTeamMutation.isPending}
                  data-testid="button-create-team"
                >
                  {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Team Assignments Modal */}
      <Dialog open={isTeamAssignmentsModalOpen} onOpenChange={setIsTeamAssignmentsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Team Assignments</DialogTitle>
            <p className="text-sm text-slate-600 mt-1">
              Add or remove members from teams across your organization
            </p>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {allTeamsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-slate-500 mt-2">Loading teams...</p>
              </div>
            ) : allTeams.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No teams yet</h3>
                <p className="text-slate-600 mb-4">
                  Create your first team to start managing team assignments
                </p>
                <Button onClick={() => {
                  setIsTeamAssignmentsModalOpen(false);
                  setIsTeamCreationModalOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </div>
            ) : (
              allTeams.map((team: any) => (
                <Card key={team.id} data-testid={`team-assignment-${team.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        {team.description && (
                          <p className="text-sm text-slate-500 mt-1">{team.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Current Members */}
                      {team.members && team.members.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">Current Members</h4>
                          <div className="space-y-2">
                            {team.members.map((member: any) => (
                              <div 
                                key={member.userId} 
                                className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"
                                data-testid={`team-member-${team.id}-${member.userId}`}
                              >
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {getUserInitials(member.firstName || '', member.lastName || '')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">
                                        {member.firstName} {member.lastName}
                                      </p>
                                      {member.role === 'lead' && (
                                        <Badge variant="default" className="text-xs flex items-center gap-1">
                                          <ShieldCheck className="w-3 h-3" />
                                          Team Lead
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500">{member.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {member.role === 'lead' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateTeamMemberRoleMutation.mutate({ 
                                        teamId: team.id, 
                                        userId: member.userId,
                                        role: 'member'
                                      })}
                                      disabled={updateTeamMemberRoleMutation.isPending}
                                      data-testid={`demote-member-${team.id}-${member.userId}`}
                                    >
                                      <UserCog className="w-3 h-3 mr-1" />
                                      Demote
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateTeamMemberRoleMutation.mutate({ 
                                        teamId: team.id, 
                                        userId: member.userId,
                                        role: 'lead'
                                      })}
                                      disabled={updateTeamMemberRoleMutation.isPending}
                                      data-testid={`promote-member-${team.id}-${member.userId}`}
                                    >
                                      <ShieldCheck className="w-3 h-3 mr-1" />
                                      Make Lead
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTeamMemberMutation.mutate({ 
                                      teamId: team.id, 
                                      userId: member.userId 
                                    })}
                                    disabled={removeTeamMemberMutation.isPending}
                                    data-testid={`remove-member-${team.id}-${member.userId}`}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Members */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">
                          {team.members?.length > 0 ? 'Add More Members' : 'Add Members'}
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                          {teamMembers
                            .filter((member: any) => 
                              member.isActive && 
                              !team.members?.some((m: any) => m.userId === member.id)
                            )
                            .map((member: any) => (
                              <div 
                                key={member.id} 
                                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded"
                              >
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {getUserInitials(member.firstName || '', member.lastName || '')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {member.firstName} {member.lastName}
                                    </p>
                                    <Badge variant={getRoleColor(member.role)} className="text-xs">
                                      {member.role}
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addTeamMemberMutation.mutate({ 
                                    teamId: team.id, 
                                    userId: member.id 
                                  })}
                                  disabled={addTeamMemberMutation.isPending}
                                  data-testid={`add-member-${team.id}-${member.id}`}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </Button>
                              </div>
                            ))}
                          {teamMembers.filter((member: any) => 
                            member.isActive && 
                            !team.members?.some((m: any) => m.userId === member.id)
                          ).length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">
                              All active team members are already assigned
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsTeamAssignmentsModalOpen(false)}
              data-testid="button-close-assignments"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
