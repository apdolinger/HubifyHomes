import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import AdminForms from "./AdminForms";
import { SupportModal } from "@/components/SupportModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  CheckCircle,
  Home,
  Database
} from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("forms");
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Sample CSV data from user's provided file
  const csvData = [
    {
      fullName: "Bruce Wayne",
      propertyName: "Wayne Manor",
      streetAddress: "1313 Mockingbird Ln.",
      city: "Gotham City",
      county: "Bristol County",
      state: "NJ",
      zipCode: "00001",
      phoneNumber: "(807) 536-1076",
      email: "bruce.wayne@example.com",
      tasks: "Replace roof tiles; Inspect security cameras"
    },
    {
      fullName: "Tony Stark",
      propertyName: "Stark Lake House",
      streetAddress: "10880 Malibu Point",
      city: "Malibu",
      county: "Ventura County",
      state: "CA",
      zipCode: "90265",
      phoneNumber: "(625) 667-8476",
      email: "tony.stark@example.com",
      tasks: "Calibrate solar panels; Reset water system"
    },
    {
      fullName: "Bilbo Baggins",
      propertyName: "Bag End",
      streetAddress: "111 Bag End, Bagshot Row",
      city: "Hobbiton, The Shire",
      county: "Shire County",
      state: "ME",
      zipCode: "24791",
      phoneNumber: "(397) 259-9198",
      email: "bilbo.baggins@example.com",
      tasks: "Chimney sweep; Pantry pest control"
    },
    {
      fullName: "Jay Gatsby",
      propertyName: "Gatsby Estate",
      streetAddress: "1 Gatsby Lane",
      city: "West Egg",
      county: "Nassau County",
      state: "NY",
      zipCode: "11560",
      phoneNumber: "(734) 348-9487",
      email: "jay.gatsby@example.com",
      tasks: "Clean pool; Repair ballroom lights"
    },
    {
      fullName: "Elsa Arendelle",
      propertyName: "Ice Castle",
      streetAddress: "1 Ice Palace Rd",
      city: "North Mountain",
      county: "Northern Peaks County",
      state: "AK",
      zipCode: "99686",
      phoneNumber: "(918) 766-7895",
      email: "elsa.arendelle@example.com",
      tasks: "De-ice entry; Inspect HVAC"
    },
    {
      fullName: "Clark Kent",
      propertyName: "Smallville Farmhouse",
      streetAddress: "100 Farmhouse Way",
      city: "Smallville",
      county: "Republic County",
      state: "KS",
      zipCode: "67524",
      phoneNumber: "(884) 945-4765",
      email: "clark.kent@example.com",
      tasks: "Repair barn door; Reset perimeter alert"
    },
    {
      fullName: "Sherlock Holmes",
      propertyName: "221B Baker Street",
      streetAddress: "221B Baker Street",
      city: "London",
      county: "Greater London",
      state: "UK",
      zipCode: "NW1 6XE",
      phoneNumber: "(366) 722-1185",
      email: "sherlock.holmes@example.com",
      tasks: "Check gas line; Fix loose window latch"
    },
    {
      fullName: "Lara Croft",
      propertyName: "Croft Manor",
      streetAddress: "1 Croft Manor",
      city: "Surrey",
      county: "Surrey County",
      state: "UK",
      zipCode: "GU1 1AA",
      phoneNumber: "(743) 571-6460",
      email: "lara.croft@example.com",
      tasks: "Fix surveillance system; Schedule garden trim"
    },
    {
      fullName: "Doc Brown",
      propertyName: "Hill Valley Garage",
      streetAddress: "1640 Riverside Drive",
      city: "Hill Valley",
      county: "Sierra County",
      state: "CA",
      zipCode: "95420",
      phoneNumber: "(380) 547-9627",
      email: "doc.brown@example.com",
      tasks: "Clean flux capacitor bay; Inspect storm damage"
    },
    {
      fullName: "Willy Wonka",
      propertyName: "Chocolate Factory Guest House",
      streetAddress: "10 Candy Cane Lane",
      city: "Candy Town",
      county: "Sweet County",
      state: "PA",
      zipCode: "15001",
      phoneNumber: "(720) 511-5742",
      email: "willy.wonka@example.com",
      tasks: "Sanitize chocolate river filter; Inspect candy wall"
    }
  ];

  const importMutation = useMutation({
    mutationFn: async () => {
      const importResults = {
        properties: 0,
        contacts: 0,
        tasks: 0
      };

      for (const record of csvData) {
        // Split full name
        const nameParts = record.fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        // Create property
        const property = await apiRequest('/api/properties', {
          method: 'POST',
          body: JSON.stringify({
            name: record.propertyName,
            type: "house",
            address1: record.streetAddress,
            address2: "",
            city: record.city,
            state: record.state,
            zipCode: record.zipCode,
            status: "active",
            units: 1,
            squareFootage: 2500,
            yearBuilt: 1980,
            isActive: true
          })
        });
        importResults.properties++;

        // Create contact
        const contact = await apiRequest('/api/contacts', {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName,
            email: record.email,
            phone: record.phoneNumber,
            type: "owner",
            propertyId: property.id,
            isActive: true
          })
        });
        importResults.contacts++;

        // Create tasks
        const taskList = record.tasks.split(';').map(task => task.trim());
        for (const taskTitle of taskList) {
          if (taskTitle) {
            await apiRequest('/api/tasks', {
              method: 'POST',
              body: JSON.stringify({
                title: taskTitle,
                description: `Task for ${record.propertyName}`,
                priority: "normal",
                status: "pending",
                propertyId: property.id,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              })
            });
            importResults.tasks++;
          }
        }
      }

      return importResults;
    },
    onSuccess: (results) => {
      toast({
        title: "Import Successful!",
        description: `Imported ${results.properties} properties, ${results.contacts} contacts, and ${results.tasks} tasks from your CSV data.`,
      });
      
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import sample data. Please try again.",
        variant: "destructive",
      });
    }
  });

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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Management
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

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Properties Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Properties
                </CardTitle>
                <CardDescription>
                  Manage property records and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/properties">
                    <Button variant="outline" className="w-full justify-start">
                      <Home className="w-4 h-4 mr-2" />
                      View All Properties
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Property
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Import
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* People Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  People
                </CardTitle>
                <CardDescription>
                  Manage contacts and relationships
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/people">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      View All Contacts
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Contact
                  </Button>
                  <Link href="/duplicates">
                    <Button variant="outline" className="w-full justify-start">
                      <Copy className="w-4 h-4 mr-2" />
                      Manage Duplicates
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Contacts
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Team Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Team
                </CardTitle>
                <CardDescription>
                  Manage team members and access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/team">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      View Team Members
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Team Member
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Permissions
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Role Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Home className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">16</p>
                    <p className="text-gray-600">Total Properties</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">42</p>
                    <p className="text-gray-600">Total Contacts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-gray-600">Team Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Copy className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-gray-600">Potential Duplicates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => importMutation.mutate()}
                      disabled={importMutation.isPending}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importMutation.isPending ? 'Importing...' : 'Import Sample Data'}
                    </Button>
                    <p className="text-xs text-slate-500 mt-1">
                      Import 10 properties, contacts, and tasks from your CSV dataset
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