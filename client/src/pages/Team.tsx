import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Mail, User, Eye } from "lucide-react";

export default function Team() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
            <Button>
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

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-slate-200 rounded-full animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-3 w-48 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-5 w-16 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-5 w-12 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {getUserInitials(member.firstName || 'U', member.lastName || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">
                        {member.firstName} {member.lastName}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-600">{member.email}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge variant={getRoleColor(member.role)}>
                      {member.role}
                    </Badge>
                    
                    <Badge variant={member.isActive ? "default" : "secondary"}>
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation(`/team/member/${member.id}`)}
                      data-testid={`view-member-${member.id}`}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
    </main>
  );
}
