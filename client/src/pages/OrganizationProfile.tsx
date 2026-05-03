import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Users, DollarSign, Calendar, Mail, Phone, Globe, MapPin, Settings, Activity, BarChart3, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface Organization {
  id: string;
  name: string;
  adminContact: string;
  plan: string;
  status: string;
  properties: number;
  users: number;
  mrr: string;
  createdAt: string;
  lastActive: string;
  billingEmail: string;
  phone: string;
  website: string;
  address: string;
  logo?: string;
}

// Mock data for organization details
const mockOrganization: Organization = {
  id: "sterling-pm",
  name: "Sterling Property Management",
  adminContact: "andrew.dolinger@gmail.com",
  plan: "Professional",
  status: "Active",
  properties: 45,
  users: 12,
  mrr: "$149",
  createdAt: "2023-01-15",
  lastActive: "2 hours ago",
  billingEmail: "billing@sterlingpm.com",
  phone: "(555) 123-4567",
  website: "www.sterlingpm.com",
  address: "123 Business St, Suite 100, Miami, FL 33101"
};

const mockUsage = {
  storageUsed: "2.3 GB",
  storageLimit: "10 GB",
  apiCalls: 1250,
  apiLimit: 5000,
  activeUsers: 8,
  userLimit: 15
};

const mockActivity = [
  { date: "2025-01-24", action: "User login", user: "john.manager@sterling.com", details: "Successful login from mobile app" },
  { date: "2025-01-24", action: "Property added", user: "sarah.admin@sterling.com", details: "Added new property: Ocean View Condos" },
  { date: "2025-01-23", action: "Task completed", user: "mike.staff@sterling.com", details: "Completed maintenance task #1847" },
  { date: "2025-01-23", action: "Invoice generated", user: "System", details: "Monthly invoice generated for January 2025" }
];

export default function OrganizationProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  // In a real app, this would fetch organization data by ID
  const { data: organization, isLoading } = useQuery({
    queryKey: ['/api/super-admin/organizations', id],
    queryFn: () => Promise.resolve(mockOrganization), // Mock for now
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Organization Not Found</h2>
          <p className="text-gray-600 mb-4">The organization you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/nestive-admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Organizations
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'professional': return 'bg-blue-100 text-blue-800';
      case 'starter': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/hubify-admin')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Organizations
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={organization.logo} />
                <AvatarFallback className="text-lg font-semibold bg-blue-100 text-blue-600">
                  {organization.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {organization.name}
                </h1>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge className={getPlanColor(organization.plan)}>
                    {organization.plan}
                  </Badge>
                  <Badge className={getStatusColor(organization.status)}>
                    {organization.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Member since {new Date(organization.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Manage Account
              </Button>
              <Button variant="outline" size="sm">
                Login As
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                Suspend
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{organization.properties}</p>
                  <p className="text-sm text-gray-600">Properties</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{organization.users}</p>
                  <p className="text-sm text-gray-600">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold">{organization.mrr}</p>
                  <p className="text-sm text-gray-600">Monthly Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Activity className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">Online</p>
                  <p className="text-sm text-gray-600">Last active {organization.lastActive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="h-5 w-5" />
                    <span>Contact Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">Admin Contact</p>
                      <p className="text-sm text-gray-600">{organization.adminContact}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">Billing Email</p>
                      <p className="text-sm text-gray-600">{organization.billingEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-sm text-gray-600">{organization.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">Website</p>
                      <p className="text-sm text-gray-600">{organization.website}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-sm text-gray-600">{organization.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Account Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Payment Status</span>
                    <Badge className="bg-green-100 text-green-800">Current</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Support Tickets</span>
                    <span className="text-sm text-gray-600">2 Open</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Health</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Data Backup</span>
                    <span className="text-sm text-gray-600">Last: 2 hours ago</span>
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600">
                      Storage usage at 80% capacity
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Manage users and their permissions for this organization.</p>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">Manage users from the Team page or Super Admin Console.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Current Plan</span>
                    <Badge className={getPlanColor(organization.plan)}>
                      {organization.plan}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Monthly Revenue</span>
                    <span className="text-lg font-bold text-green-600">{organization.mrr}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Next Billing Date</span>
                    <span>February 15, 2025</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Payment Method</span>
                    <span>•••• •••• •••• 4242</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle>Usage Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Storage Used</span>
                      <span>{mockUsage.storageUsed} / {mockUsage.storageLimit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>API Calls (This Month)</span>
                      <span>{mockUsage.apiCalls} / {mockUsage.apiLimit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Active Users</span>
                      <span>{mockUsage.activeUsers} / {mockUsage.userLimit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '53%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Activity className="h-4 w-4 text-blue-600 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-600">{activity.details}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">{activity.user}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{activity.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Feature Flags</h3>
                      <p className="text-sm text-gray-600">Manage beta features for this organization</p>
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">API Access</h3>
                      <p className="text-sm text-gray-600">Configure API keys and rate limits</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Data Export</h3>
                      <p className="text-sm text-gray-600">Export organization data</p>
                    </div>
                    <Button variant="outline" size="sm">Export</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}