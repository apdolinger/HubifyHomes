import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft,
  Shield,
  Building2,
  DollarSign,
  ToggleLeft,
  Activity,
  MessageSquare,
  Settings,
  FileText,
  Users,
  Database,
  Server,
  Cpu,
  HardDrive,
  Network,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Globe,
  Zap,
  Palette,
  Code,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  Archive,
  AlertCircle,
  Info,
  UserPlus,
  UserMinus,
  CreditCard,
  Bell,
  Bookmark,
  LogIn,
  Ban,
  Play,
  Pause,
  Send
} from "lucide-react";

// Communities Report Component
function CommunitiesReport() {
  const { data: communitiesData, isLoading, error } = useQuery({
    queryKey: ['/api/super-admin/communities-report'],
    enabled: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading communities report: {error.message}
      </div>
    );
  }

  const filteredCommunities = communitiesData?.filter((community: any) =>
    community.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.organizationNames?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.fullAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const downloadCSV = () => {
    if (!communitiesData || communitiesData.length === 0) return;

    const headers = [
      'Community Name',
      'Address',
      'City',
      'State',
      'ZIP',
      'Manager',
      'Manager Email',
      'Property Count',
      'Organizations',
      'Status',
      'Created Date'
    ];

    const csvData = [
      headers,
      ...communitiesData.map((community: any) => [
        community.name || '',
        community.address1 || '',
        community.city || '',
        community.state || '',
        community.zip || '',
        community.managerName || 'N/A',
        community.managerEmail || 'N/A',
        community.propertyCount || 0,
        community.organizationNames || 'No Properties',
        community.isActive ? 'Active' : 'Inactive',
        community.createdAt ? new Date(community.createdAt).toLocaleDateString() : 'N/A'
      ])
    ];

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `communities-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Badge variant="outline" className="px-3 py-1">
            {filteredCommunities.length} communities
          </Badge>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Community Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Properties</TableHead>
              <TableHead>Organizations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCommunities.map((community: any) => (
              <TableRow key={community.id}>
                <TableCell className="font-medium">
                  {community.name || 'Unnamed Community'}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {community.fullAddress || 'No Address'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{community.managerName}</div>
                    {community.managerEmail && (
                      <div className="text-gray-500">{community.managerEmail}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {community.propertyCount || 0} properties
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={community.organizationNames}>
                    {community.organizationNames}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={community.isActive ? "default" : "secondary"}
                  >
                    {community.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {community.createdAt ? new Date(community.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredCommunities.length === 0 && communitiesData && communitiesData.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          No communities match your search criteria.
        </div>
      )}

      {(!communitiesData || communitiesData.length === 0) && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          No communities found in the database.
        </div>
      )}
    </div>
  );
}

export default function SuperAdmin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("organizations");

  // This is internal-only access - in real implementation, would check for internal employee role
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Access Denied",
        description: "Super Admin access is restricted to Dwellerly platform team only.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const platformStats = {
    totalOrganizations: 247,
    activeOrganizations: 235,
    totalUsers: 1842,
    activeUsers: 1654,
    totalProperties: 8934,
    totalTasks: 45672,
    monthlyRevenue: "$47,830",
    uptime: "99.97%"
  };

  const organizations = [
    { id: 1, name: "Sterling Property Management", admin: "andrew.dolinger@gmail.com", plan: "Professional", status: "Active", properties: 45, users: 12, mrr: "$149" },
    { id: 2, name: "Coastal Home Watch", admin: "sarah.johnson@coastal.com", plan: "Enterprise", status: "Active", properties: 128, users: 24, mrr: "$299" },
    { id: 3, name: "Desert Valley HOA", admin: "mike.torres@dvhoa.org", plan: "Starter", status: "Trial", properties: 15, users: 3, mrr: "$0" },
    { id: 4, name: "Pacific Property Care", admin: "lisa.chen@pacificcare.com", plan: "Professional", status: "Suspended", properties: 67, users: 8, mrr: "$149" }
  ];

  const systemMetrics = {
    cpu: "23%",
    memory: "4.2GB / 16GB",
    disk: "67GB / 200GB",
    network: "↑ 2.1MB/s ↓ 5.8MB/s",
    dbConnections: 45,
    apiRequests: "12.4K/hour",
    errorRate: "0.03%"
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Control Panel</h1>
            <p className="text-lg text-slate-600">Platform-wide monitoring and management for Hubify team</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <Shield className="w-3 h-3 mr-1" />
            Internal Access Only
          </Badge>
        </div>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              {platformStats.activeOrganizations} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {platformStats.activeUsers} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.monthlyRevenue}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{platformStats.uptime}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-11">
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="messaging">Mass Email</TabsTrigger>
          <TabsTrigger value="alerts">System Alerts</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Organizations Management
                </CardTitle>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Organization
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Admin Contact</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">
                        <button 
                          onClick={() => setLocation(`/nestive-admin/organization/${org.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {org.name}
                        </button>
                      </TableCell>
                      <TableCell>{org.admin}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{org.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={org.status === 'Active' ? 'default' : 
                                   org.status === 'Trial' ? 'secondary' : 'destructive'}
                        >
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.properties}</TableCell>
                      <TableCell>{org.users}</TableCell>
                      <TableCell>{org.mrr}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" title="Login as Admin">
                            <LogIn className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {org.status === 'Active' ? (
                            <Button size="sm" variant="ghost" title="Suspend">
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" title="Activate">
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Communities Report
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Comprehensive view of all communities across all organizations
                </p>
              </CardHeader>
              <CardContent>
                <CommunitiesReport />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  All Users Across Platform
                </CardTitle>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search users..."
                    className="w-64"
                  />
                  <Select>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="staff">Field Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Selected Users
                </Button>
                <span className="ml-2 text-sm text-gray-500">0 users selected</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input type="checkbox" className="rounded" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      User Name ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Email ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Company ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Role ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Status ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Last Login ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Created ↕
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell className="font-medium">Andrew Dolinger</TableCell>
                    <TableCell>andrew.dolinger@gmail.com</TableCell>
                    <TableCell>Sterling Property Management</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700">Admin</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </TableCell>
                    <TableCell>2 hours ago</TableCell>
                    <TableCell>Jan 15, 2023</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell className="font-medium">Sarah Johnson</TableCell>
                    <TableCell>sarah.johnson@coastal.com</TableCell>
                    <TableCell>Coastal Home Watch</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">Supervisor</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </TableCell>
                    <TableCell>1 day ago</TableCell>
                    <TableCell>Mar 22, 2023</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell className="font-medium">Mike Torres</TableCell>
                    <TableCell>mike.torres@dvhoa.org</TableCell>
                    <TableCell>Desert Valley HOA</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">Field Staff</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-red-100 text-red-800">Suspended</Badge>
                    </TableCell>
                    <TableCell>3 weeks ago</TableCell>
                    <TableCell>Jun 8, 2024</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell className="font-medium">Lisa Chen</TableCell>
                    <TableCell>lisa.chen@pacificcare.com</TableCell>
                    <TableCell>Pacific Property Care</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700">Admin</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </TableCell>
                    <TableCell>5 hours ago</TableCell>
                    <TableCell>Aug 14, 2023</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 text-sm text-gray-500">
                Showing 4 of 1,842 users
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mass Email Tab */}
        <TabsContent value="messaging">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Mass Email Tool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Email Composition */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipients">Recipients</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="admins">Admin Users Only</SelectItem>
                        <SelectItem value="selected">Selected from User Table</SelectItem>
                        <SelectItem value="account">Specific Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input 
                      placeholder="Enter email subject..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea 
                      placeholder="Compose your message here... Use {{firstName}}, {{accountName}}, etc. for dynamic fields"
                      rows={8}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="schedule" className="rounded" />
                      <Label htmlFor="schedule">Schedule Send</Label>
                    </div>
                    <Input type="datetime-local" className="w-48" />
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Message
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Send className="w-4 h-4 mr-2" />
                      Send Email
                    </Button>
                  </div>
                </div>

                {/* Dynamic Fields & Templates */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Available Dynamic Fields</h3>
                    <div className="space-y-2">
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        <code>{'{{firstName}}'}</code> - User's first name
                      </div>
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        <code>{'{{lastName}}'}</code> - User's last name
                      </div>
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        <code>{'{{email}}'}</code> - User's email address
                      </div>
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        <code>{'{{accountName}}'}</code> - User's company name
                      </div>
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        <code>{'{{role}}'}</code> - User's role (Admin, Staff, etc.)
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Quick Templates</h3>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        Maintenance Notice
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        New Feature Announcement
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        System Update
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        Account Reminder
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Delivery Stats</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Last Campaign:</span>
                        <span>Jan 20, 2025</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Emails Sent:</span>
                        <span>1,247</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Rate:</span>
                        <span>97.8%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Open Rate:</span>
                        <span>68.2%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Alerts Tab */}
        <TabsContent value="alerts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Alert */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Create System Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="alert-title">Alert Title</Label>
                  <Input 
                    placeholder="e.g., Scheduled Maintenance Notice"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="alert-message">Message</Label>
                  <Textarea 
                    placeholder="Alert message content..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input type="datetime-local" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input type="datetime-local" className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="target">Target Audience</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admins">Admin Users Only</SelectItem>
                      <SelectItem value="account">Specific Account</SelectItem>
                      <SelectItem value="role">Specific Role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="severity">Alert Severity</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select severity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info (Blue)</SelectItem>
                      <SelectItem value="warning">Warning (Yellow)</SelectItem>
                      <SelectItem value="error">Critical (Red)</SelectItem>
                      <SelectItem value="success">Success (Green)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="require-ack" className="rounded" />
                  <Label htmlFor="require-ack">Require acknowledgment</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="show-once" className="rounded" />
                  <Label htmlFor="show-once">Show only once per session</Label>
                </div>

                <div>
                  <Label htmlFor="action-button">Action Button (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Input placeholder="Button text" />
                    <Input placeholder="Button URL" />
                  </div>
                </div>

                <Button className="w-full">
                  Create Alert
                </Button>
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Active System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sample Active Alert */}
                <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="font-semibold text-yellow-800">Scheduled Maintenance</span>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Warning</Badge>
                      </div>
                      <p className="text-sm text-yellow-700 mb-2">
                        Platform will be offline for maintenance on Jan 25, 2025 from 1:00 AM - 3:00 AM EST.
                      </p>
                      <div className="text-xs text-yellow-600">
                        Active: Jan 24, 1:00 PM - Jan 25, 4:00 AM | Target: All Users
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sample Feature Alert */}
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-800">New Feature Available</span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">Info</Badge>
                      </div>
                      <p className="text-sm text-blue-700 mb-2">
                        🎉 Dashboard customization is now live! Personalize your workspace with drag-and-drop widgets.
                      </p>
                      <div className="text-xs text-blue-600">
                        Active: Jan 22, 9:00 AM - Jan 29, 11:59 PM | Target: Admin Users
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-500 mt-4">
                  2 active alerts • 847 users notified today
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Revenue Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">MRR</span>
                  <span className="font-semibold">$47,830</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">ARR</span>
                  <span className="font-semibold">$573,960</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Churn Rate</span>
                  <span className="font-semibold text-green-600">2.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">ARPU</span>
                  <span className="font-semibold">$203</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Starter</span>
                  <span className="font-semibold">78 orgs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Professional</span>
                  <span className="font-semibold">142 orgs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Enterprise</span>
                  <span className="font-semibold">27 orgs</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Credit Card</span>
                  <span className="font-semibold">89%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">ACH/Bank</span>
                  <span className="font-semibold">11%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ToggleLeft className="w-5 h-5 mr-2" />
                Feature Flags & Beta Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { name: 'Task Cost Tracking', description: 'Track labor and material costs per task', enabled: true, beta: true },
                  { name: 'Community Profiles', description: 'HOA community management features', enabled: false, beta: true },
                  { name: 'Zapier Integration', description: 'Third-party automation integration', enabled: true, beta: false },
                  { name: 'Advanced Reporting', description: 'Custom report builder and analytics', enabled: false, beta: true },
                  { name: 'Mobile Push Notifications', description: 'Native mobile app notifications', enabled: true, beta: false },
                  { name: 'White Label Branding', description: 'Custom branding and domain options', enabled: false, beta: true }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-slate-900">{feature.name}</h4>
                        {feature.beta && (
                          <Badge variant="secondary" className="text-xs">Beta</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{feature.description}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Switch checked={feature.enabled} />
                      <Button size="sm" variant="outline">
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">CPU Usage</span>
                      <span className="font-semibold">{systemMetrics.cpu}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Memory</span>
                      <span className="font-semibold">{systemMetrics.memory}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '26%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Disk Usage</span>
                      <span className="font-semibold">{systemMetrics.disk}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '33%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Recent Errors & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">Database Connection Timeout</div>
                        <div className="text-sm text-red-700">Organization: Coastal Home Watch</div>
                      </div>
                    </div>
                    <div className="text-xs text-red-600">2 min ago</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-medium text-yellow-900">High API Request Volume</div>
                        <div className="text-sm text-yellow-700">15.2K requests in last hour</div>
                      </div>
                    </div>
                    <div className="text-xs text-yellow-600">5 min ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Messaging Tab */}
        <TabsContent value="messaging">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Platform Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium text-slate-900 mb-4">Send New Announcement</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="announcement-type">Message Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select message type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maintenance">Maintenance Notice</SelectItem>
                          <SelectItem value="feature">New Feature</SelectItem>
                          <SelectItem value="security">Security Alert</SelectItem>
                          <SelectItem value="general">General Announcement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="announcement-title">Title</Label>
                      <Input id="announcement-title" placeholder="Announcement title" />
                    </div>
                    <div>
                      <Label htmlFor="announcement-message">Message</Label>
                      <Textarea 
                        id="announcement-message" 
                        placeholder="Announcement content..."
                        className="min-h-24"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch id="email-delivery" />
                        <Label htmlFor="email-delivery">Send Email</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="inapp-delivery" defaultChecked />
                        <Label htmlFor="inapp-delivery">In-App Banner</Label>
                      </div>
                    </div>
                    <Button>
                      <Send className="w-4 h-4 mr-2" />
                      Send Announcement
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Tab */}
        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Platform Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Settings className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Platform configuration settings</p>
                <p className="text-sm mt-2">Global defaults, API limits, security settings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Compliance & Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Compliance monitoring and security logs</p>
                <p className="text-sm mt-2">GDPR, SOC 2, security certifications</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Platform Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Platform Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="api-rate-limit">API Rate Limit (requests/hour)</Label>
                    <Input id="api-rate-limit" type="number" defaultValue="10000" data-testid="input-api-rate-limit" />
                  </div>
                  <div>
                    <Label htmlFor="session-timeout">Default Session Timeout (minutes)</Label>
                    <Input id="session-timeout" type="number" defaultValue="60" data-testid="input-session-timeout" />
                  </div>
                  <div>
                    <Label htmlFor="max-file-size">Max File Upload Size (MB)</Label>
                    <Input id="max-file-size" type="number" defaultValue="25" data-testid="input-max-file-size" />
                  </div>
                  <div>
                    <Label htmlFor="webhook-retries">Webhook Retry Attempts</Label>
                    <Input id="webhook-retries" type="number" defaultValue="3" data-testid="input-webhook-retries" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="global-timezone">Global Time Zone</Label>
                  <Select>
                    <SelectTrigger id="global-timezone" data-testid="select-global-timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern (EST/EDT)</SelectItem>
                      <SelectItem value="cst">Central (CST/CDT)</SelectItem>
                      <SelectItem value="mst">Mountain (MST/MDT)</SelectItem>
                      <SelectItem value="pst">Pacific (PST/PDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="button-save-platform-config">
                  <Settings className="w-4 h-4 mr-2" />
                  Save Platform Configuration
                </Button>
              </CardContent>
            </Card>

            {/* Email & Communication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Email & Communication Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="smtp-provider">Email Provider</Label>
                  <Select>
                    <SelectTrigger id="smtp-provider" data-testid="select-smtp-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="smtp">Custom SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sendgrid-key">SendGrid API Key</Label>
                  <Input id="sendgrid-key" type="password" placeholder="SG.xxxxx" data-testid="input-sendgrid-key" />
                </div>
                <div>
                  <Label htmlFor="from-email">Default From Email</Label>
                  <Input id="from-email" type="email" defaultValue="noreply@hubify.com" data-testid="input-from-email" />
                </div>
                <div>
                  <Label htmlFor="sms-provider">SMS Gateway Provider</Label>
                  <Select>
                    <SelectTrigger id="sms-provider" data-testid="select-sms-provider">
                      <SelectValue placeholder="Select SMS provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="plivo">Plivo</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="email-notifications" defaultChecked data-testid="switch-email-notifications" />
                  <Label htmlFor="email-notifications">Enable System Email Notifications</Label>
                </div>
                <Button data-testid="button-save-email-settings">
                  <Mail className="w-4 h-4 mr-2" />
                  Save Email Settings
                </Button>
              </CardContent>
            </Card>

            {/* Integration Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Integration Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="stripe-master-key">Stripe Master Secret Key</Label>
                  <Input id="stripe-master-key" type="password" placeholder="sk_live_xxxxx" data-testid="input-stripe-master-key" />
                  <p className="text-xs text-gray-500 mt-1">Used for platform billing</p>
                </div>
                <div>
                  <Label htmlFor="oauth-google">Google OAuth Client ID</Label>
                  <Input id="oauth-google" placeholder="xxxxx.apps.googleusercontent.com" data-testid="input-oauth-google" />
                </div>
                <div>
                  <Label htmlFor="oauth-microsoft">Microsoft OAuth Client ID</Label>
                  <Input id="oauth-microsoft" placeholder="xxxxx-xxxxx-xxxxx" data-testid="input-oauth-microsoft" />
                </div>
                <div>
                  <Label htmlFor="quickbooks-key">QuickBooks API Key</Label>
                  <Input id="quickbooks-key" type="password" placeholder="Optional" data-testid="input-quickbooks-key" />
                </div>
                <Button data-testid="button-save-integrations">
                  <Zap className="w-4 h-4 mr-2" />
                  Save Integration Settings
                </Button>
              </CardContent>
            </Card>

            {/* Default Organization Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Default Organization Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="default-plan">Default Plan for New Orgs</Label>
                    <Select>
                      <SelectTrigger id="default-plan" data-testid="select-default-plan">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="trial-length">Free Trial Length (days)</Label>
                    <Input id="trial-length" type="number" defaultValue="14" data-testid="input-trial-length" />
                  </div>
                  <div>
                    <Label htmlFor="default-storage">Default Storage Quota (GB)</Label>
                    <Input id="default-storage" type="number" defaultValue="10" data-testid="input-default-storage" />
                  </div>
                  <div>
                    <Label htmlFor="max-users">Default Max Users</Label>
                    <Input id="max-users" type="number" defaultValue="5" data-testid="input-max-users" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Feature Toggles</Label>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-maintenance" defaultChecked data-testid="switch-feature-maintenance" />
                      <Label htmlFor="feature-maintenance">Maintenance Module</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-calendar" defaultChecked data-testid="switch-feature-calendar" />
                      <Label htmlFor="feature-calendar">Calendar System</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-invoices" defaultChecked data-testid="switch-feature-invoices" />
                      <Label htmlFor="feature-invoices">Invoice Management</Label>
                    </div>
                  </div>
                </div>
                <Button data-testid="button-save-org-defaults">
                  <Building2 className="w-4 h-4 mr-2" />
                  Save Organization Defaults
                </Button>
              </CardContent>
            </Card>

            {/* Billing & Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Billing & Subscription Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Starter Plan Price</Label>
                    <Input type="number" defaultValue="49" placeholder="$/month" data-testid="input-price-starter" />
                  </div>
                  <div>
                    <Label>Professional Plan Price</Label>
                    <Input type="number" defaultValue="149" placeholder="$/month" data-testid="input-price-professional" />
                  </div>
                  <div>
                    <Label>Enterprise Plan Price</Label>
                    <Input type="number" defaultValue="399" placeholder="$/month" data-testid="input-price-enterprise" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="grace-period">Payment Grace Period (days)</Label>
                  <Input id="grace-period" type="number" defaultValue="3" data-testid="input-grace-period" />
                </div>
                <div>
                  <Label>Add-ons Pricing</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="addon-storage">Extra Storage (per 10GB/month)</Label>
                      <Input id="addon-storage" type="number" defaultValue="15" data-testid="input-addon-storage" />
                    </div>
                    <div>
                      <Label htmlFor="addon-support">Premium Support (/month)</Label>
                      <Input id="addon-support" type="number" defaultValue="99" data-testid="input-addon-support" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="referral-program" data-testid="switch-referral-program" />
                  <Label htmlFor="referral-program">Enable Referral Program</Label>
                </div>
                <Button data-testid="button-save-billing-settings">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Save Billing Settings
                </Button>
              </CardContent>
            </Card>

            {/* Compliance & Legal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Compliance & Legal Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="retention-period">Document Retention Period (years)</Label>
                  <Input id="retention-period" type="number" defaultValue="7" data-testid="input-retention-period" />
                </div>
                <div>
                  <Label htmlFor="esign-provider">E-Signature Provider</Label>
                  <Select>
                    <SelectTrigger id="esign-provider" data-testid="select-esign-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="docusign">DocuSign</SelectItem>
                      <SelectItem value="hellosign">HelloSign</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Privacy Controls</Label>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="gdpr-compliance" defaultChecked data-testid="switch-gdpr-compliance" />
                      <Label htmlFor="gdpr-compliance">GDPR Compliance Mode</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="ccpa-compliance" defaultChecked data-testid="switch-ccpa-compliance" />
                      <Label htmlFor="ccpa-compliance">CCPA Compliance Mode</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="audit-logging" defaultChecked data-testid="switch-audit-logging" />
                      <Label htmlFor="audit-logging">Global Audit Logging</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="data-purge">Auto Data Purge Schedule</Label>
                  <Select>
                    <SelectTrigger id="data-purge" data-testid="select-data-purge">
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="30days">After 30 days of deletion</SelectItem>
                      <SelectItem value="90days">After 90 days of deletion</SelectItem>
                      <SelectItem value="1year">After 1 year of deletion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="button-save-compliance-settings">
                  <FileText className="w-4 h-4 mr-2" />
                  Save Compliance Settings
                </Button>
              </CardContent>
            </Card>

            {/* System Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  System Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-medium text-yellow-900">Maintenance Mode</div>
                        <div className="text-sm text-yellow-700">Enable to prevent user access during maintenance</div>
                      </div>
                    </div>
                    <Switch id="maintenance-mode" data-testid="switch-maintenance-mode" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="downtime-message">Maintenance Mode Message</Label>
                  <Textarea 
                    id="downtime-message" 
                    placeholder="We're performing scheduled maintenance. We'll be back shortly!"
                    defaultValue="We're performing scheduled maintenance. We'll be back shortly!"
                    data-testid="textarea-downtime-message"
                  />
                </div>
                <div>
                  <Label htmlFor="backup-schedule">Automated Backup Schedule</Label>
                  <Select>
                    <SelectTrigger id="backup-schedule" data-testid="select-backup-schedule">
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily at 2 AM</SelectItem>
                      <SelectItem value="weekly">Weekly (Sunday 2 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="health-check">System Health Check Interval</Label>
                  <Select>
                    <SelectTrigger id="health-check" data-testid="select-health-check">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1min">Every 1 minute</SelectItem>
                      <SelectItem value="5min">Every 5 minutes</SelectItem>
                      <SelectItem value="15min">Every 15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="button-save-maintenance-settings">
                  <Server className="w-4 h-4 mr-2" />
                  Save Maintenance Settings
                </Button>
              </CardContent>
            </Card>

            {/* Security & Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Security & Access Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="2fa-policy">Two-Factor Authentication Policy</Label>
                  <Select>
                    <SelectTrigger id="2fa-policy" data-testid="select-2fa-policy">
                      <SelectValue placeholder="Select policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Required for all users</SelectItem>
                      <SelectItem value="admins">Required for admins only</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="off">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Password Complexity Requirements</Label>
                  <div className="space-y-2 mt-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="pwd-length" defaultChecked data-testid="switch-pwd-length" />
                      <Label htmlFor="pwd-length">Minimum 8 characters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="pwd-uppercase" defaultChecked data-testid="switch-pwd-uppercase" />
                      <Label htmlFor="pwd-uppercase">Require uppercase letters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="pwd-numbers" defaultChecked data-testid="switch-pwd-numbers" />
                      <Label htmlFor="pwd-numbers">Require numbers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="pwd-special" defaultChecked data-testid="switch-pwd-special" />
                      <Label htmlFor="pwd-special">Require special characters</Label>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="session-length">Max Session Length (hours)</Label>
                    <Input id="session-length" type="number" defaultValue="24" data-testid="input-session-length" />
                  </div>
                  <div>
                    <Label htmlFor="reauth-period">Re-authentication Period (hours)</Label>
                    <Input id="reauth-period" type="number" defaultValue="8" data-testid="input-reauth-period" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ip-whitelist">IP Whitelist (comma-separated)</Label>
                  <Textarea 
                    id="ip-whitelist" 
                    placeholder="192.168.1.1, 10.0.0.0/24"
                    data-testid="textarea-ip-whitelist"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="intrusion-detection" defaultChecked data-testid="switch-intrusion-detection" />
                  <Label htmlFor="intrusion-detection">Enable Intrusion Detection Alerts</Label>
                </div>
                <Button data-testid="button-save-security-settings">
                  <Lock className="w-4 h-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>

            {/* Customization Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  Customization Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Global Feature Toggles</Label>
                  <div className="space-y-2 mt-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-vendor-portal" defaultChecked data-testid="switch-feature-vendor-portal" />
                      <Label htmlFor="feature-vendor-portal">Vendor Portal (all orgs)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-client-portal" defaultChecked data-testid="switch-feature-client-portal" />
                      <Label htmlFor="feature-client-portal">Client Portal (all orgs)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-mobile-app" data-testid="switch-feature-mobile-app" />
                      <Label htmlFor="feature-mobile-app">Mobile App Access</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="global-theme">Global Default Theme</Label>
                  <Select>
                    <SelectTrigger id="global-theme" data-testid="select-global-theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="dark">Dark Mode</SelectItem>
                      <SelectItem value="auto">Auto (System Preference)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="default-color">Default Brand Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="default-color" 
                      type="color" 
                      defaultValue="#3b82f6" 
                      className="w-20 h-10"
                      data-testid="input-default-color"
                    />
                    <Input 
                      type="text" 
                      defaultValue="#3b82f6" 
                      className="flex-1"
                      data-testid="input-default-color-hex"
                    />
                  </div>
                </div>
                <div>
                  <Label>Default Notification Templates</Label>
                  <div className="mt-2 space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-edit-welcome-template">
                      <Mail className="w-4 h-4 mr-2" />
                      Edit Welcome Email Template
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-edit-reminder-template">
                      <Bell className="w-4 h-4 mr-2" />
                      Edit Reminder Email Template
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-edit-invoice-template">
                      <FileText className="w-4 h-4 mr-2" />
                      Edit Invoice Email Template
                    </Button>
                  </div>
                </div>
                <Button data-testid="button-save-customization-settings">
                  <Palette className="w-4 h-4 mr-2" />
                  Save Customization Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}