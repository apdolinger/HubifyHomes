import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft,
  Database,
  Server,
  Settings,
  Users,
  Shield,
  Activity,
  AlertTriangle,
  TrendingUp,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Eye,
  UserPlus,
  UserMinus,
  Key,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Edit
} from "lucide-react";

export default function SuperAdmin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("system");

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== 'admin')) {
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
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.role !== 'admin') {
    return null;
  }

  const systemStats = {
    uptime: "15 days, 4 hours",
    cpu: "12%",
    memory: "2.1GB / 8GB",
    disk: "45GB / 100GB",
    network: "↑ 1.2MB/s ↓ 3.4MB/s",
    activeUsers: 24,
    totalRequests: "1.2M",
    errorRate: "0.02%"
  };

  const databaseStats = {
    size: "1.8GB",
    tables: 12,
    connections: 15,
    queries: "45.2K/hour",
    avgResponseTime: "12ms",
    slowQueries: 3
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
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Panel</h1>
            <p className="text-lg text-slate-600">Advanced system administration and configuration</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <Shield className="w-3 h-3 mr-1" />
            Super Admin Access
          </Badge>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{systemStats.uptime}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.cpu}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.memory}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.activeUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="system" className="flex items-center">
            <Server className="w-4 h-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center">
            <Database className="w-4 h-4 mr-2" />
            Database
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        {/* System Management Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Disk Usage</Label>
                    <p className="text-lg font-semibold">{systemStats.disk}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Network I/O</Label>
                    <p className="text-lg font-semibold">{systemStats.network}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Total Requests</Label>
                    <p className="text-lg font-semibold">{systemStats.totalRequests}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Error Rate</Label>
                    <p className="text-lg font-semibold text-green-600">{systemStats.errorRate}</p>
                  </div>
                </div>
                <div className="pt-4 space-y-2">
                  <Button className="w-full" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Restart Application
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download System Logs
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Environment Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="nodeEnv">Node Environment</Label>
                    <Select defaultValue="production">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="logLevel">Log Level</Label>
                    <Select defaultValue="info">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debug">Debug</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="maxConnections">Max Database Connections</Label>
                    <Input id="maxConnections" type="number" defaultValue="20" />
                  </div>
                </div>
                <Button className="w-full">
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Database Management Tab */}
        <TabsContent value="database" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Database Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Database Size</Label>
                    <p className="text-lg font-semibold">{databaseStats.size}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Active Connections</Label>
                    <p className="text-lg font-semibold">{databaseStats.connections}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Queries/Hour</Label>
                    <p className="text-lg font-semibold">{databaseStats.queries}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Avg Response Time</Label>
                    <p className="text-lg font-semibold text-green-600">{databaseStats.avgResponseTime}</p>
                  </div>
                </div>
                <div className="pt-4 space-y-2">
                  <Button variant="outline" className="w-full" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Query Logs
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Database
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="w-5 h-5 mr-2" />
                  Database Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Optimize Database
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Backup Database
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full justify-start">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Reset Database
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Database</DialogTitle>
                        <DialogDescription>
                          This action will permanently delete all data. This cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button variant="destructive">Confirm Reset</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  System Users Management
                </CardTitle>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Admin User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">John Admin</TableCell>
                    <TableCell>john@nestive.com</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Admin</Badge>
                    </TableCell>
                    <TableCell>2 hours ago</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Sarah Manager</TableCell>
                    <TableCell>sarah@nestive.com</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Manager</Badge>
                    </TableCell>
                    <TableCell>1 day ago</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input id="sessionTimeout" type="number" defaultValue="60" />
                  </div>
                  <div>
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input id="maxLoginAttempts" type="number" defaultValue="5" />
                  </div>
                  <div>
                    <Label htmlFor="passwordPolicy">Password Policy</Label>
                    <Select defaultValue="strong">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                        <SelectItem value="strong">Strong (12+ chars, mixed case, numbers)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (16+ chars, symbols required)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full">
                  Update Security Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  API Keys & Tokens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">System API Key</p>
                      <p className="text-sm text-slate-500">Created 30 days ago</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Backup Service Token</p>
                      <p className="text-sm text-slate-500">Created 7 days ago</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button className="w-full">
                  <Key className="w-4 h-4 mr-2" />
                  Generate New API Key
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>API Response Time</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Normal (45ms avg)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database Performance</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Excellent
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Memory Usage</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      Moderate (65%)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Error Rate</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Low (0.02%)
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>CPU Usage</span>
                      <span>12%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '12%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Memory Usage</span>
                      <span>65%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Disk Usage</span>
                      <span>45%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  System Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Clear Application Cache
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clean Temporary Files
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="w-4 h-4 mr-2" />
                    Optimize Database Tables
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Generate System Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Maintenance Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Maintenance Mode</h4>
                      <p className="text-sm text-yellow-700">
                        Enable to prevent user access during system updates.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                    <Textarea 
                      id="maintenanceMessage" 
                      placeholder="System is currently undergoing maintenance..."
                      rows={3}
                    />
                  </div>
                  <Button className="w-full" variant="destructive">
                    Enable Maintenance Mode
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}