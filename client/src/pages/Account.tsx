import { useEffect, useState } from "react";
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
  Settings,
  FileText,
  Users,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Bell,
  Download,
  Edit,
  Plus,
  Trash2,
  Save,
  Upload,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Zap,
  Database,
  Activity
} from "lucide-react";

export default function Account() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("account-info");
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "You need admin access to view account settings.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
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

  // Mock data - in real app this would come from API
  const accountInfo = {
    companyName: "Sterling Property Management",
    logo: null,
    address: "123 Business Ave, Suite 400",
    city: "Miami",
    state: "FL",
    zipCode: "33101",
    businessPhone: "(305) 555-0123",
    businessEmail: "info@sterlingpm.com",
    billingContact: "Andrew Dolinger",
    billingEmail: "billing@sterlingpm.com"
  };

  const subscriptionInfo = {
    plan: "Professional Tier",
    status: "Active",
    billingCycle: "Monthly",
    nextBilling: "2025-08-24",
    amount: "$149/month",
    paymentMethod: "**** **** **** 4532"
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
            <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
            <p className="text-lg text-slate-600">Manage your business account, billing, and configuration</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Shield className="w-3 h-3 mr-1" />
            Admin Access
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="account-info">Account Info</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="task-templates">Task Templates</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team-roles">Team & Roles</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
        </TabsList>

        {/* Account Information Tab */}
        <TabsContent value="account-info">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Account Information
                  </CardTitle>
                </div>
                <Button
                  variant={isEditingInfo ? "outline" : "default"}
                  onClick={() => setIsEditingInfo(!isEditingInfo)}
                >
                  {isEditingInfo ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={accountInfo.companyName}
                      disabled={!isEditingInfo}
                      className={!isEditingInfo ? "bg-slate-50" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Business Address</Label>
                    <Input
                      id="address"
                      value={accountInfo.address}
                      disabled={!isEditingInfo}
                      className={!isEditingInfo ? "bg-slate-50" : ""}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={accountInfo.city}
                        disabled={!isEditingInfo}
                        className={!isEditingInfo ? "bg-slate-50" : ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={accountInfo.state}
                        disabled={!isEditingInfo}
                        className={!isEditingInfo ? "bg-slate-50" : ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={accountInfo.zipCode}
                        disabled={!isEditingInfo}
                        className={!isEditingInfo ? "bg-slate-50" : ""}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      value={accountInfo.businessPhone}
                      disabled={!isEditingInfo}
                      className={!isEditingInfo ? "bg-slate-50" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessEmail">Business Email</Label>
                    <Input
                      id="businessEmail"
                      value={accountInfo.businessEmail}
                      disabled={!isEditingInfo}
                      className={!isEditingInfo ? "bg-slate-50" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingContact">Billing Contact</Label>
                    <Input
                      id="billingContact"
                      value={accountInfo.billingContact}
                      disabled={!isEditingInfo}
                      className={!isEditingInfo ? "bg-slate-50" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingEmail">Billing Email</Label>
                    <Input
                      id="billingEmail"
                      value={accountInfo.billingEmail}
                      disabled={!isEditingInfo}
                      className={!isEditingInfo ? "bg-slate-50" : ""}
                    />
                  </div>
                </div>
              </div>
              {isEditingInfo && (
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsEditingInfo(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    setIsEditingInfo(false);
                    toast({
                      title: "Account Updated",
                      description: "Your account information has been saved successfully.",
                    });
                  }}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription & Billing Tab */}
        <TabsContent value="billing">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Subscription & Billing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-green-900">{subscriptionInfo.plan}</h3>
                          <p className="text-sm text-green-700">{subscriptionInfo.status}</p>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          Active
                        </Badge>
                      </div>
                      <div className="mt-3 text-sm text-green-700">
                        <p>Billing: {subscriptionInfo.amount} ({subscriptionInfo.billingCycle})</p>
                        <p>Next billing: {subscriptionInfo.nextBilling}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-2">Payment Method</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{subscriptionInfo.paymentMethod}</span>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Plan Options</h4>
                      <div className="space-y-2">
                        <Button className="w-full justify-start" variant="outline">
                          Upgrade to Enterprise
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          Change Billing Cycle
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Billing History</h4>
                      <Button className="w-full justify-start" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download Invoices
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="custom-fields">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Custom Fields Configuration
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-slate-600 mb-4">
                  Create custom fields that can be used across properties, people, and tasks.
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Used In</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Property Manager</TableCell>
                      <TableCell>Text</TableCell>
                      <TableCell>Properties</TableCell>
                      <TableCell>
                        <Badge variant="outline">Optional</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Emergency Contact</TableCell>
                      <TableCell>Text</TableCell>
                      <TableCell>People</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Required</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Email Template Editor
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Template Categories</h3>
                  <div className="space-y-2">
                    {['Welcome Emails', 'Task Notifications', 'Reminders & Alerts', 'Billing Notices'].map((category) => (
                      <Button key={category} variant="ghost" className="w-full justify-start">
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">Welcome Email Template</h4>
                    <p className="text-sm text-slate-600 mb-4">Sent to new team members when they join</p>
                    <Textarea
                      className="min-h-32"
                      placeholder="Hi {{firstName}}, welcome to {{companyName}}! Your account has been created..."
                    />
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-xs text-slate-500">
                        Available variables: {{firstName}}, {{lastName}}, {{companyName}}, {{loginUrl}}
                      </div>
                      <Button size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task Templates Tab */}
        <TabsContent value="task-templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Task Template Manager
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['Weekly Inspection Checklist', 'Monthly Maintenance Review', 'New Property Setup', 'Emergency Response'].map((template) => (
                  <Card key={template} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-900">{template}</h4>
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      {template === 'Weekly Inspection Checklist' && '8 tasks • Used by 12 properties'}
                      {template === 'Monthly Maintenance Review' && '5 tasks • Used by 8 properties'}
                      {template === 'New Property Setup' && '15 tasks • Used by all new properties'}
                      {template === 'Emergency Response' && '6 tasks • High priority template'}
                    </p>
                    <Button size="sm" variant="outline" className="w-full">
                      Apply to Property
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-medium text-slate-900 mb-4">Delivery Methods</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-notifications">Email</Label>
                        <Switch id="email-notifications" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms-notifications">SMS</Label>
                        <Switch id="sms-notifications" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="inapp-notifications">In-App</Label>
                        <Switch id="inapp-notifications" defaultChecked />
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="font-medium text-slate-900 mb-4">Notification Categories</h3>
                    <div className="space-y-4">
                      {[
                        { name: 'New Task Assigned', description: 'When a task is assigned to you or your team' },
                        { name: 'Task Overdue', description: 'When a task passes its due date' },
                        { name: 'Billing Notices', description: 'Payment reminders and billing updates' },
                        { name: 'System Updates', description: 'Platform updates and maintenance notices' },
                        { name: 'Team Messages', description: 'New messages in team chat' }
                      ].map((notification) => (
                        <div key={notification.name} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-slate-900">{notification.name}</div>
                            <div className="text-sm text-slate-600">{notification.description}</div>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Roles Tab */}
        <TabsContent value="team-roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Team Roles & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['Field Staff', 'Supervisor', 'Admin'].map((role) => (
                    <Card key={role} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900">{role}</h4>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>View Properties</span>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Create Tasks</span>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Manage Team</span>
                          {role === 'Admin' ? 
                            <CheckCircle className="w-4 h-4 text-green-600" /> :
                            <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                          }
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Billing Access</span>
                          {role === 'Admin' ? 
                            <CheckCircle className="w-4 h-4 text-green-600" /> :
                            <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                          }
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit-log">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    System activity log - read only
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Log
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { time: '2025-07-24 17:15:23', user: 'andrew.dolinger@gmail.com', action: 'Task Created', details: 'Created task "Finishing painting living room"' },
                      { time: '2025-07-24 16:42:15', user: 'andrew.dolinger@gmail.com', action: 'Property Added', details: 'Added property "141 E Riverside"' },
                      { time: '2025-07-24 15:30:08', user: 'andrew.dolinger@gmail.com', action: 'User Login', details: 'Successful login from IP 192.168.1.100' },
                      { time: '2025-07-24 14:25:42', user: 'andrew.dolinger@gmail.com', action: 'Task Completed', details: 'Completed task "Flush toilets"' }
                    ].map((log, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">{log.time}</TableCell>
                        <TableCell className="text-sm">{log.user}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{log.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Report Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Report template configuration will be available in Phase 2</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Automation Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Zap className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Automation rules will be available in Phase 2</p>
                <p className="text-sm mt-2">Create IF/THEN rules to automate workflows</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}