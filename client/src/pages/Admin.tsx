import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import AdminForms from "./AdminForms";
import { SupportModal } from "@/components/SupportModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Settings, 
  Shield,
  Mail,
  FileText,
  Sliders,
  Bell,
  Download,
  Upload,
  HelpCircle,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Save,
  Copy,
  CheckCircle
} from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("forms");
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Redirect if not admin or manager
  useEffect(() => {
    if (!isLoading && isAuthenticated && (user as any)?.role !== 'admin' && (user as any)?.role !== 'manager') {
      toast({
        title: "Access Denied",
        description: "You need admin or manager permissions to access this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, user, toast]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'manager')) {
    return null;
  }

  // Mock data for templates
  const emailTemplates = [
    { id: 1, name: "New Client Welcome", subject: "Welcome to Nestive Property Management", type: "client", lastModified: "2 days ago" },
    { id: 2, name: "Team Member Invitation", subject: "Join Our Property Management Team", type: "team", lastModified: "1 week ago" },
    { id: 3, name: "Property Report Summary", subject: "Monthly Property Report - {PropertyAddress}", type: "report", lastModified: "3 days ago" },
    { id: 4, name: "Task Notification", subject: "New Task Assigned: {TaskTitle}", type: "task", lastModified: "5 days ago" },
    { id: 5, name: "Payment Reminder", subject: "Payment Due for {PropertyAddress}", type: "billing", lastModified: "1 day ago" },
  ];

  const taskTemplates = [
    { id: 1, name: "New Property Onboarding", tasks: 8, category: "onboarding", lastUsed: "Yesterday" },
    { id: 2, name: "Pool Inspection Checklist", tasks: 12, category: "inspection", lastUsed: "3 days ago" },
    { id: 3, name: "Emergency Visit Protocol", tasks: 6, category: "emergency", lastUsed: "1 week ago" },
    { id: 4, name: "Vendor Visit Tasks", tasks: 5, category: "vendor", lastUsed: "2 days ago" },
  ];

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-slate-600 mt-2">
            Manage templates, settings, and system configuration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {(user as any)?.role === 'admin' && (
            <Link href="/super-admin">
              <Button className="bg-red-600 hover:bg-red-700">
                <Shield className="w-4 h-4 mr-2" />
                Account
              </Button>
            </Link>
          )}
          <Badge variant="secondary" className="px-3 py-1">
            <Shield className="w-4 h-4 mr-1" />
            {(user as any)?.role === 'admin' ? 'Admin' : 'Manager'} Access
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Tools & Support
          </TabsTrigger>
        </TabsList>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-6">
          <AdminForms />
        </TabsContent>

        {/* Email & Message Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Email & Message Templates</h3>
              <p className="text-slate-600">Configure reusable templates for communication</p>
            </div>
            <Dialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Email Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable template with smart tags like ClientName, PropertyAddress
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input id="templateName" placeholder="e.g., New Client Welcome" />
                  </div>
                  <div>
                    <Label htmlFor="templateType">Template Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client Communication</SelectItem>
                        <SelectItem value="team">Team Communication</SelectItem>
                        <SelectItem value="report">Reports</SelectItem>
                        <SelectItem value="task">Task Notifications</SelectItem>
                        <SelectItem value="billing">Billing & Payments</SelectItem>
                        <SelectItem value="emergency">Emergency Alerts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input id="subject" placeholder="Use ClientName, PropertyAddress, TaskTitle etc." />
                  </div>
                  <div>
                    <Label htmlFor="body">Message Body</Label>
                    <Textarea id="body" rows={6} placeholder="Dear ClientName, Welcome to our property management services..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewTemplateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    setIsNewTemplateDialogOpen(false);
                    toast({
                      title: "Template Created",
                      description: "Email template has been saved successfully.",
                    });
                  }}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Email Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-slate-500">{template.subject}</p>
                        <p className="text-xs text-slate-400">Modified {template.lastModified}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Task Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {taskTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-slate-500">{template.tasks} tasks • {template.category}</p>
                        <p className="text-xs text-slate-400">Last used {template.lastUsed}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="fields" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Custom Field Manager</h3>
              <p className="text-slate-600">Add custom fields across People, Properties, and Tasks</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Field
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>People Fields</CardTitle>
                <CardDescription>Custom fields for contacts and team members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Gate Code</p>
                      <p className="text-sm text-slate-500">Text field • Required</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Preferred Language</p>
                      <p className="text-sm text-slate-500">Dropdown • Optional</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add People Field
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Property Fields</CardTitle>
                <CardDescription>Custom fields for properties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Garage Code</p>
                      <p className="text-sm text-slate-500">Text field • Optional</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Trash Day</p>
                      <p className="text-sm text-slate-500">Dropdown • Required</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property Field
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Fields</CardTitle>
                <CardDescription>Custom fields for tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Estimated Time</p>
                      <p className="text-sm text-slate-500">Number field • Optional</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Service Type</p>
                      <p className="text-sm text-slate-500">Dropdown • Required</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task Field
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Team Roles & Permissions</h3>
            <p className="text-slate-600">Define what each role can view or edit</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Staff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>View Properties</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Edit Properties</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>View Financial Info</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Manage Users</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Contacts</CardTitle>
                <CardDescription>Designate main points of contact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mainContact">Main Point of Contact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin1">John Admin</SelectItem>
                      <SelectItem value="manager1">Sarah Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="billingContact">Billing Contact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin1">John Admin</SelectItem>
                      <SelectItem value="manager1">Sarah Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supportContact">Support Contact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin1">John Admin</SelectItem>
                      <SelectItem value="manager1">Sarah Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  Save Contact Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Notifications & Alerts</h3>
            <p className="text-slate-600">Manage system-wide alert settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Alert Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Task Deadline Alerts</p>
                    <p className="text-sm text-slate-500">Email notifications for overdue tasks</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Duplicate Warnings</p>
                    <p className="text-sm text-slate-500">Alert when potential duplicates are detected</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Login Failure Alerts</p>
                    <p className="text-sm text-slate-500">Security notifications for failed logins</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Property Access Logs</p>
                    <p className="text-sm text-slate-500">Weekly summary of property visits</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Urgent Alerts</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent-email" defaultChecked />
                      <Label htmlFor="urgent-email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent-sms" />
                      <Label htmlFor="urgent-sms">SMS</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent-app" defaultChecked />
                      <Label htmlFor="urgent-app">In-App</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-base font-medium">Regular Updates</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="regular-email" defaultChecked />
                      <Label htmlFor="regular-email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="regular-app" defaultChecked />
                      <Label htmlFor="regular-app">In-App</Label>
                    </div>
                  </div>
                </div>
                <Button className="w-full">
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tools & Support Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Tools & Support</h3>
            <p className="text-slate-600">Export/import data and access support resources</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Export / Import Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All People (CSV)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Properties (CSV)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Tasks (CSV)
                  </Button>
                  <div className="border-t pt-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Upload className="w-4 h-4 mr-2" />
                      Import People Template
                    </Button>
                    <p className="text-xs text-slate-500 mt-1">
                      Download template first, then upload with your data
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Support & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start"
                    onClick={() => setIsSupportModalOpen(true)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Request a Feature
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help Documentation
                  </Button>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">Quick Tip</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Use the search shortcut (Space) to quickly find properties, people, or tasks anywhere in the app.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
    </main>
  );
}