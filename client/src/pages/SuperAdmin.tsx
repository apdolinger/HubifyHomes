import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  Send,
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
  Pause
} from "lucide-react";

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
        description: "Super Admin access is restricted to Nestive platform team only.",
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
            <p className="text-lg text-slate-600">Platform-wide monitoring and management for Nestive team</p>
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
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
      </Tabs>
    </main>
  );
}