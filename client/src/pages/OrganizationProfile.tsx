import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Users, DollarSign, Activity, Mail, Settings, Shield, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface OrgOverviewRow {
  id: string;
  name: string;
  isActive: boolean;
  primaryAdminEmail: string | null;
  tier: string;
  subscriptionStatus: string;
  propertyCount: number;
  userCount: number;
  mrrCents: number;
  createdAt: string | null;
}

export default function OrganizationProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: orgs = [], isLoading } = useQuery<OrgOverviewRow[]>({
    queryKey: ["/api/super-admin/orgs-overview"],
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<any[]>({
    queryKey: ["/api/super-admin/audit-logs"],
    select: (data: any) => {
      const list = Array.isArray(data) ? data : (data?.logs ?? []);
      return list.filter((l: any) => l.orgId === id).slice(0, 20);
    },
  });

  const organization = orgs.find(o => o.id === id);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-teal-100 text-teal-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'professional': return 'bg-teal-100 text-teal-800';
      case 'starter': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMrr = (cents: number) => {
    if (!cents) return '$0';
    return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Organization Not Found</h2>
          <p className="text-gray-600 mb-4">The organization you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation('/hubify-admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Organizations
          </Button>
        </div>
      </div>
    );
  }

  const initials = organization.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setLocation('/hubify-admin')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Organizations
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-semibold bg-teal-100 text-teal-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge className={getTierColor(organization.tier)}>{organization.tier || 'No Plan'}</Badge>
                  <Badge className={getStatusColor(organization.subscriptionStatus)}>
                    {organization.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {organization.createdAt && (
                    <span className="text-sm text-gray-500">
                      Member since {new Date(organization.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Building2 className="h-8 w-8 text-teal-600" />
                <div>
                  <p className="text-2xl font-bold">{organization.propertyCount}</p>
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
                  <p className="text-2xl font-bold">{organization.userCount}</p>
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
                  <p className="text-2xl font-bold">{formatMrr(organization.mrrCents)}</p>
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
                  <p className={`text-2xl font-bold ${organization.isActive ? 'text-green-600' : 'text-red-500'}`}>
                    {organization.isActive ? 'Active' : 'Inactive'}
                  </p>
                  <p className="text-sm text-gray-600">Account status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <p className="font-medium">Primary Admin</p>
                      <p className="text-sm text-gray-600">{organization.primaryAdminEmail ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">Plan</p>
                      <p className="text-sm text-gray-600">{organization.tier || 'None'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">Subscription Status</p>
                      <p className="text-sm text-gray-600">{organization.subscriptionStatus || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Account Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Account Active</span>
                    {organization.isActive
                      ? <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</Badge>
                      : <Badge className="bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactive</Badge>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Subscription</span>
                    <span className="text-sm text-gray-600">{organization.subscriptionStatus || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Properties</span>
                    <span className="text-sm text-gray-600">{organization.propertyCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Users</span>
                    <span className="text-sm text-gray-600">{organization.userCount}</span>
                  </div>
                  {!organization.isActive && (
                    <div className="flex items-center space-x-2 pt-1">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-600">This organization account is currently inactive.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Current Plan</span>
                    <Badge className={getTierColor(organization.tier)}>{organization.tier || 'None'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Monthly Revenue</span>
                    <span className="text-lg font-bold text-green-600">{formatMrr(organization.mrrCents)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Subscription Status</span>
                    <span className="text-sm text-gray-600">{organization.subscriptionStatus || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Next Billing Date</span>
                    <span className="text-sm text-gray-500 italic">Managed via Stripe</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Payment Method</span>
                    <span className="text-sm text-gray-500 italic">Managed via Stripe</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  This organization has <strong>{organization.userCount}</strong> user{organization.userCount !== 1 ? 's' : ''}. Manage them from the All Users tab in the super admin panel.
                </p>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">Use the All Users tab to filter by this organization.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm">No audit events recorded for this organization yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Activity className="h-4 w-4 text-teal-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">{log.action?.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-gray-600">{log.resource}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500">{log.userEmail ?? 'System'}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs flex-shrink-0 ${log.severity === 'critical' ? 'border-red-300 text-red-600' : log.severity === 'warning' ? 'border-yellow-300 text-yellow-600' : 'border-gray-200 text-gray-500'}`}
                        >
                          {log.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
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
                    <Button variant="outline" size="sm" onClick={() => setLocation('/hubify-admin?tab=feature-flags')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Suspend / Reactivate</h3>
                      <p className="text-sm text-gray-600">Control this organization's platform access</p>
                    </div>
                    <Badge className={organization.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {organization.isActive ? 'Active' : 'Suspended'}
                    </Badge>
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
