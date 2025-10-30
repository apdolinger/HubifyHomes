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
import { Users, Plus, Mail, User, Search, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TableCustomizationModal, { ColumnConfig } from "@/components/TableCustomizationModal";

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

export default function Team() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

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

  // Fetch team members from API
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ["/api/users"],
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

  // Reset to page 1 when items per page or search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm]);

  // Filter team members based on search term
  const filteredTeamMembers = teamMembers.filter((member: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      member.firstName?.toLowerCase().includes(searchLower) ||
      member.lastName?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.role?.toLowerCase().includes(searchLower)
    );
  });

  // Paginate the filtered team members
  const totalItems = filteredTeamMembers.length;
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
  const paginatedTeamMembers = filteredTeamMembers.slice(startIndex, endIndex);

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

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Total Members
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {teamMembers.length}
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
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Admins
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {teamMembers.filter(m => m.role === 'admin').length}
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
                  <User className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Supervisors
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {teamMembers.filter(m => m.role === 'supervisor').length}
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
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Staff
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {teamMembers.filter(m => m.role === 'staff').length}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search team members by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="team-search-input"
          />
        </div>
      </div>

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
                    <TableHead className="w-[300px]">Member</TableHead>
                  )}
                  {columns.find(col => col.id === 'email')?.visible && (
                    <TableHead>Email</TableHead>
                  )}
                  {columns.find(col => col.id === 'role')?.visible && (
                    <TableHead>Role</TableHead>
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
                    <TableHead className="w-[300px]">Member</TableHead>
                  )}
                  {columns.find(col => col.id === 'email')?.visible && (
                    <TableHead>Email</TableHead>
                  )}
                  {columns.find(col => col.id === 'role')?.visible && (
                    <TableHead>Role</TableHead>
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

      {/* My Team Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Team</CardTitle>
          <p className="text-sm text-slate-600">
            Team members assigned to you or those you work closely with
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* For now, showing placeholder content - this would be populated based on user's direct reports/teammates */}
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Direct Team Members</h3>
              <p className="text-slate-600 mb-4">
                Team assignment features will be available in a future update.
              </p>
              <Button variant="outline" disabled>
                Manage Team Assignments
              </Button>
            </div>
          </div>
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
    </main>
  );
}
