import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  Activity,
  Key,
  Copy,
  Info,
  Globe,
  XCircle
} from "lucide-react";

// Organization form schema
const orgFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  primaryContact: z.string().optional(),
  industry: z.string().optional(),
});

type OrgFormData = z.infer<typeof orgFormSchema>;

export default function Account() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("account-info");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [createApiKeyDialogOpen, setCreateApiKeyDialogOpen] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  const orgId = (user as any)?.orgId;

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

  // Fetch organization data
  const { data: org, isLoading: isLoadingOrg } = useQuery<any>({
    queryKey: ['/api/orgs', orgId],
    enabled: !!orgId && isAuthenticated,
  });

  // Fetch API keys
  const { data: apiKeys = [], isLoading: isLoadingApiKeys } = useQuery<any[]>({
    queryKey: [`/api/orgs/${orgId}/api-keys`],
    enabled: !!orgId && isAuthenticated,
  });

  // Form for organization info
  const form = useForm<OrgFormData>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: {
      name: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      country: "USA",
      phone: "",
      website: "",
      timezone: "America/New_York",
      currency: "USD",
      primaryContact: "",
      industry: "",
    },
  });

  // Update form when org data loads
  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name || "",
        address1: org.address1 || "",
        address2: org.address2 || "",
        city: org.city || "",
        state: org.state || "",
        zip: org.zip || "",
        country: org.country || "USA",
        phone: org.phone || "",
        website: org.website || "",
        timezone: org.timezone || "America/New_York",
        currency: org.currency || "USD",
        primaryContact: org.primaryContact || "",
        industry: org.industry || "",
      });
    }
  }, [org, form]);

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: OrgFormData) => {
      const response = await fetch(`/api/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update organization');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orgs', orgId] });
      setIsEditingInfo(false);
      toast({
        title: "Success",
        description: "Organization information updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
        variant: "destructive",
      });
    },
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/orgs/${orgId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create API key');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/api-keys`] });
      setGeneratedApiKey(data.plainKey);
      setShowApiKeyDialog(true);
      setCreateApiKeyDialogOpen(false);
      setNewApiKeyName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Revoke API key mutation
  const revokeApiKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const response = await fetch(`/api/orgs/${orgId}/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke API key');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/api-keys`] });
      toast({
        title: "Success",
        description: "API key revoked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke API key",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrgFormData) => {
    updateOrgMutation.mutate(data);
  };

  const handleCopyApiKey = () => {
    if (generatedApiKey) {
      navigator.clipboard.writeText(generatedApiKey);
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    }
  };

  const handleRevokeKey = (keyId: number, keyName: string) => {
    if (confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
      revokeApiKeyMutation.mutate(keyId);
    }
  };

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
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-12">
          <TabsTrigger value="account-info" data-testid="tab-account-info">Account Info</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
          <TabsTrigger value="forms" data-testid="tab-forms">Forms</TabsTrigger>
          <TabsTrigger value="custom-fields" data-testid="tab-custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="email-templates" data-testid="tab-email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="task-templates" data-testid="tab-task-templates">Task Templates</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team-roles" data-testid="tab-team-roles">Team & Roles</TabsTrigger>
          <TabsTrigger value="automation" data-testid="tab-automation">Automation</TabsTrigger>
          <TabsTrigger value="audit-log" data-testid="tab-audit-log">Audit Log</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
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
                {!isEditingInfo ? (
                  <Button
                    onClick={() => setIsEditingInfo(true)}
                    data-testid="button-edit-account"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingInfo(false);
                      form.reset();
                    }}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingOrg ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-company-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 1</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-address1"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 2</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-address2"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-6 gap-2">
                          <div className="col-span-3">
                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      disabled={!isEditingInfo}
                                      className={!isEditingInfo ? "bg-slate-50" : ""}
                                      data-testid="input-city"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-1">
                            <FormField
                              control={form.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      disabled={!isEditingInfo}
                                      className={!isEditingInfo ? "bg-slate-50" : ""}
                                      data-testid="input-state"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-2">
                            <FormField
                              control={form.control}
                              name="zip"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ZIP</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      disabled={!isEditingInfo}
                                      className={!isEditingInfo ? "bg-slate-50" : ""}
                                      data-testid="input-zip"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-country"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Phone</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-website"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="primaryContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Contact</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-primary-contact"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  placeholder="e.g., Property Management"
                                  data-testid="input-industry"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="timezone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Timezone</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-timezone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditingInfo}
                                  className={!isEditingInfo ? "bg-slate-50" : ""}
                                  data-testid="input-currency"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    {isEditingInfo && (
                      <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditingInfo(false);
                            form.reset();
                          }}
                          data-testid="button-cancel-save"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateOrgMutation.isPending}
                          data-testid="button-save-account"
                        >
                          {updateOrgMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
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

        {/* Forms Tab */}
        <TabsContent value="forms">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Form Management
                  </CardTitle>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Form
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample Forms */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">Property Intake Form</h3>
                        <p className="text-sm text-gray-600">Collect new property information from clients</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700">Public</Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">Embeddable</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Fields:</span> 8 fields
                      </div>
                      <div>
                        <span className="font-medium">Submissions:</span> 23 total
                      </div>
                      <div>
                        <span className="font-medium">Destination:</span> Creates Contacts
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="text-sm text-gray-500">
                        Created: Jan 15, 2025 • Last updated: Jan 20, 2025
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          Embed Code
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-3 h-3 mr-1" />
                          Export Data
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">Maintenance Request Form</h3>
                        <p className="text-sm text-gray-600">Allow residents to submit maintenance requests</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">Private</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Fields:</span> 12 fields
                      </div>
                      <div>
                        <span className="font-medium">Submissions:</span> 47 total
                      </div>
                      <div>
                        <span className="font-medium">Destination:</span> Creates Tasks
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="text-sm text-gray-500">
                        Created: Dec 8, 2024 • Last updated: Jan 18, 2025
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          Share Link
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-3 h-3 mr-1" />
                          Export Data
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">Client Feedback Survey</h3>
                        <p className="text-sm text-gray-600">Collect service feedback from property owners</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700">Public</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Fields:</span> 6 fields
                      </div>
                      <div>
                        <span className="font-medium">Submissions:</span> 12 total
                      </div>
                      <div>
                        <span className="font-medium">Destination:</span> None (Survey only)
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="text-sm text-gray-500">
                        Created: Jan 5, 2025 • Last updated: Jan 5, 2025
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          Share Link
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-3 h-3 mr-1" />
                          Export Data
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Builder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Form Templates & Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-24 flex flex-col justify-center">
                    <FileText className="w-6 h-6 mb-2" />
                    <span className="font-medium">Property Intake</span>
                    <span className="text-xs text-gray-500">Collect new property info</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col justify-center">
                    <Settings className="w-6 h-6 mb-2" />
                    <span className="font-medium">Maintenance Request</span>
                    <span className="text-xs text-gray-500">Resident service requests</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col justify-center">
                    <User className="w-6 h-6 mb-2" />
                    <span className="font-medium">Contact Information</span>
                    <span className="text-xs text-gray-500">Collect contact details</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col justify-center">
                    <CheckCircle className="w-6 h-6 mb-2" />
                    <span className="font-medium">Service Feedback</span>
                    <span className="text-xs text-gray-500">Customer satisfaction</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col justify-center">
                    <AlertTriangle className="w-6 h-6 mb-2" />
                    <span className="font-medium">Incident Report</span>
                    <span className="text-xs text-gray-500">Report issues or incidents</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col justify-center">
                    <Plus className="w-6 h-6 mb-2" />
                    <span className="font-medium">Custom Form</span>
                    <span className="text-xs text-gray-500">Build from scratch</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="custom-fields">
          <CustomFieldsSettings />
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
                        Available variables: {'{'}firstName{'}'}, {'{'}lastName{'}'}, {'{'}companyName{'}'}, {'{'}loginUrl{'}'}
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
                  <Button size="sm" variant="outline" data-testid="button-export-log">
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

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* API Keys Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Key className="w-5 h-5 mr-2" />
                      API Keys
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Manage API keys for programmatic access to your organization's data
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setCreateApiKeyDialogOpen(true)}
                    data-testid="button-create-api-key"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingApiKeys ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Key className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No API keys created yet</p>
                    <p className="text-sm mt-2">Create an API key to enable programmatic access</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Key Prefix</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key: any) => (
                        <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                          <TableCell className="font-medium" data-testid={`text-key-name-${key.id}`}>
                            {key.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm" data-testid={`text-key-prefix-${key.id}`}>
                            {key.keyPrefix}...
                          </TableCell>
                          <TableCell className="text-sm text-slate-600" data-testid={`text-key-created-${key.id}`}>
                            {new Date(key.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600" data-testid={`text-key-last-used-${key.id}`}>
                            {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell data-testid={`status-api-key-${key.id}`}>
                            {key.isActive ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                Revoked
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {key.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeKey(key.id, key.name)}
                                data-testid={`button-revoke-key-${key.id}`}
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Third-party Services Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Third-Party Services
                </CardTitle>
                <CardDescription className="mt-1">
                  Connect external services to enhance your platform capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    These integrations are managed through Replit's secure integration system, which handles authentication and API key management automatically.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SendGrid Card */}
                  <div className="border rounded-lg p-6 relative">
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">SendGrid</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Send transactional and marketing emails
                        </p>
                        <div className="mt-4">
                          <Button variant="outline" size="sm" disabled data-testid="button-connect-sendgrid">
                            Connect
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Twilio Card */}
                  <div className="border rounded-lg p-6 relative">
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <Phone className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">Twilio</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Send SMS notifications and alerts
                        </p>
                        <div className="mt-4">
                          <Button variant="outline" size="sm" disabled data-testid="button-connect-twilio">
                            Connect
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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

      {/* Create API Key Dialog */}
      <Dialog open={createApiKeyDialogOpen} onOpenChange={setCreateApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for programmatic access to your organization's data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKeyName">API Key Name *</Label>
              <Input
                id="apiKeyName"
                value={newApiKeyName}
                onChange={(e) => setNewApiKeyName(e.target.value)}
                placeholder="e.g., Production API, Mobile App"
                data-testid="input-api-key-name"
              />
              <p className="text-sm text-slate-500 mt-1">
                Give your API key a descriptive name to identify its purpose
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateApiKeyDialogOpen(false);
                setNewApiKeyName("");
              }}
              data-testid="button-cancel-create-key"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newApiKeyName.trim()) {
                  createApiKeyMutation.mutate(newApiKeyName.trim());
                } else {
                  toast({
                    title: "Validation Error",
                    description: "Please enter a name for the API key",
                    variant: "destructive",
                  });
                }
              }}
              disabled={createApiKeyMutation.isPending || !newApiKeyName.trim()}
              data-testid="button-confirm-create-key"
            >
              {createApiKeyMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                "Create API Key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Generated API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>
              Copy your API key now. For security reasons, you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Store this key securely. It provides full access to your organization's data.
              </AlertDescription>
            </Alert>
            <div>
              <Label>Your API Key</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  value={generatedApiKey || ""}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="text-generated-api-key"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyApiKey}
                  data-testid="button-copy-api-key"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowApiKeyDialog(false);
                setGeneratedApiKey(null);
              }}
              data-testid="button-close-api-key-dialog"
            >
              I've Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Custom Fields Settings Component
export function CustomFieldsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeEntity, setActiveEntity] = useState<"task"|"property"|"contact">("task");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    fieldName: "",
    fieldType: "text" as "text"|"textarea"|"number"|"date"|"select"|"multiselect"|"checkbox",
    required: false,
    placeholder: "",
    helpText: "",
    options: [] as string[],
    optionInput: "",
  });
  
  const orgId = (user as any)?.orgId;
  
  // Fetch custom fields for the current entity type
  const { data: customFields = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/custom-fields", activeEntity],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/custom-fields?entityType=${activeEntity}`);
      return response.json();
    },
    enabled: !!orgId,
  });
  
  // Create mutation
  const createFieldMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      const response = await apiRequest("POST", "/api/custom-fields", fieldData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({
        title: "Success",
        description: "Custom field created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create custom field",
        variant: "destructive",
      });
    },
  });
  
  // Update mutation
  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/custom-fields/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({
        title: "Success",
        description: "Custom field updated successfully",
      });
      setEditingField(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update custom field",
        variant: "destructive",
      });
    },
  });
  
  // Delete mutation
  const deleteFieldMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/custom-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({
        title: "Success",
        description: "Custom field deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete custom field",
        variant: "destructive",
      });
    },
  });
  
  const resetForm = () => {
    setFormData({
      fieldName: "",
      fieldType: "text",
      required: false,
      placeholder: "",
      helpText: "",
      options: [],
      optionInput: "",
    });
  };
  
  const handleSubmit = () => {
    if (!formData.fieldName) {
      toast({
        title: "Validation Error",
        description: "Field name is required",
        variant: "destructive",
      });
      return;
    }
    
    const fieldData = {
      entityType: activeEntity,
      fieldName: formData.fieldName,
      fieldType: formData.fieldType,
      required: formData.required,
      placeholder: formData.placeholder || null,
      helpText: formData.helpText || null,
      options: ["select", "multiselect"].includes(formData.fieldType) ? formData.options : null,
    };
    
    if (editingField) {
      updateFieldMutation.mutate({ id: editingField.id, data: fieldData });
    } else {
      createFieldMutation.mutate(fieldData);
    }
  };
  
  const handleEdit = (field: any) => {
    setEditingField(field);
    setFormData({
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      required: field.required,
      placeholder: field.placeholder || "",
      helpText: field.helpText || "",
      options: field.options || [],
      optionInput: "",
    });
    setIsCreateDialogOpen(true);
  };
  
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this custom field? This cannot be undone.")) {
      deleteFieldMutation.mutate(id);
    }
  };
  
  const addOption = () => {
    if (formData.optionInput.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, formData.optionInput.trim()],
        optionInput: "",
      });
    }
  };
  
  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };
  
  const getFieldTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text: "Text",
      textarea: "Text Area",
      number: "Number",
      date: "Date",
      select: "Dropdown",
      multiselect: "Multi-Select",
      checkbox: "Checkbox",
    };
    return types[type] || type;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Custom Fields Configuration
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Create custom fields that can be used across properties, contacts, and tasks
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Entity Type Tabs */}
        <Tabs value={activeEntity} onValueChange={(v) => setActiveEntity(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="task">Tasks</TabsTrigger>
            <TabsTrigger value="property">Properties</TabsTrigger>
            <TabsTrigger value="contact">Contacts</TabsTrigger>
          </TabsList>
          
          {/* Fields Table */}
          <div>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : customFields.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No custom fields defined for {activeEntity}s yet</p>
                <p className="text-sm mt-2">Click "Add Field" to create your first custom field</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customFields.map((field: any) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.fieldName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getFieldTypeLabel(field.fieldType)}</Badge>
                      </TableCell>
                      <TableCell>
                        {field.required ? (
                          <Badge variant="secondary">Required</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {field.options && field.options.length > 0 
                          ? `${field.options.length} options` 
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleEdit(field)}
                            data-testid={`button-edit-field-${field.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDelete(field.id)}
                            data-testid={`button-delete-field-${field.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Tabs>
      </CardContent>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { 
        setIsCreateDialogOpen(open); 
        if (!open) { setEditingField(null); resetForm(); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit Custom Field" : "Create Custom Field"}
            </DialogTitle>
            <DialogDescription>
              Define a custom field for {activeEntity}s
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="fieldName">Field Name *</Label>
              <Input
                id="fieldName"
                value={formData.fieldName}
                onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                placeholder="e.g., Property Manager, Emergency Contact"
                data-testid="input-field-name"
              />
            </div>
            
            <div>
              <Label htmlFor="fieldType">Field Type *</Label>
              <Select 
                value={formData.fieldType} 
                onValueChange={(value) => setFormData({ ...formData, fieldType: value as any })}
              >
                <SelectTrigger data-testid="select-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Dropdown (Single Select)</SelectItem>
                  <SelectItem value="multiselect">Multi-Select</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
                data-testid="switch-required"
              />
              <Label htmlFor="required" className="cursor-pointer">
                Required Field
              </Label>
            </div>
            
            <div>
              <Label htmlFor="placeholder">Placeholder Text</Label>
              <Input
                id="placeholder"
                value={formData.placeholder}
                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                placeholder="e.g., Enter property manager name"
                data-testid="input-placeholder"
              />
            </div>
            
            <div>
              <Label htmlFor="helpText">Help Text</Label>
              <Textarea
                id="helpText"
                value={formData.helpText}
                onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
                placeholder="Additional information to help users fill out this field"
                rows={2}
                data-testid="textarea-help-text"
              />
            </div>
            
            {["select", "multiselect"].includes(formData.fieldType) && (
              <div>
                <Label>Options *</Label>
                <div className="flex space-x-2 mb-2">
                  <Input
                    value={formData.optionInput}
                    onChange={(e) => setFormData({ ...formData, optionInput: e.target.value })}
                    placeholder="Enter an option"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                    data-testid="input-option"
                  />
                  <Button type="button" onClick={addOption} data-testid="button-add-option">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm">{option}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeOption(index)}
                        data-testid={`button-remove-option-${index}`}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setIsCreateDialogOpen(false); setEditingField(null); resetForm(); }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
              data-testid="button-save-field"
            >
              {createFieldMutation.isPending || updateFieldMutation.isPending ? "Saving..." : editingField ? "Update Field" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}