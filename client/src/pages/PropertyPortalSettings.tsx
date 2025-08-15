import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { routes } from '@/lib/routes';
import { Save, Eye, Upload, Palette, Settings, Shield, Globe } from 'lucide-react';
import type { PropertyPortalSettings } from '@shared/schema';

interface BrandingCapabilities {
  logoUpload: boolean;
  primaryColor: boolean;
  secondaryColor: boolean;
  customCss: boolean;
  fontSelection: boolean;
}

interface OrgBranding {
  branding: Record<string, any>;
  theme: Record<string, any>;
  capabilities: BrandingCapabilities;
  tier: string;
}

export default function PropertyPortalSettings() {
  const { propertyId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get user's organization ID from auth context
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const orgId = (user as any)?.orgId || "default-org";

  // State for portal settings form
  const [formData, setFormData] = useState({
    branding: {
      logoUrl: '',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      companyName: ''
    },
    theme: {
      colorScheme: 'light',
      fontFamily: 'Inter',
      borderRadius: 'medium'
    },
    layout: {
      headerStyle: 'standard',
      footerEnabled: true,
      sidebarEnabled: true
    },
    modulesEnabled: {
      taskRequests: true,
      messages: true,
      documents: false,
      payments: false
    },
    copy: {
      welcomeMessage: 'Welcome to your property portal',
      supportEmail: '',
      phoneNumber: ''
    },
    legal: {
      privacyPolicyUrl: '',
      termsOfServiceUrl: '',
      cookieNotice: true
    },
    i18n: {
      defaultLocale: 'en',
      supportedLocales: ['en']
    },
    authOptions: {
      allowedLogin: 'both',
      mfa: 'sms'
    }
  });

  const [currentVersion, setCurrentVersion] = useState(1);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);

  // Fetch organization branding capabilities
  const { data: orgBranding, isLoading: brandingLoading } = useQuery<OrgBranding>({
    queryKey: [routes.api.adminBranding(orgId)],
    enabled: !!orgId
  });

  // Fetch property portal settings (using new admin API)
  const { data: portalSettings, isLoading: settingsLoading } = useQuery<PropertyPortalSettings[]>({
    queryKey: [routes.api.adminClientPortal(orgId, propertyId)],
    enabled: !!orgId && !!propertyId
  });

  // Fetch latest draft settings
  const { data: draftSettings } = useQuery<PropertyPortalSettings>({
    queryKey: [routes.api.adminClientPortal(orgId, propertyId), { status: 'draft' }],
    enabled: !!orgId && !!propertyId
  });

  // Fetch published settings
  const { data: publishedSettings } = useQuery<PropertyPortalSettings>({
    queryKey: [routes.api.adminClientPortal(orgId, propertyId), { status: 'published' }],
    enabled: !!orgId && !!propertyId
  });

  // Create portal settings mutation
  const createSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(routes.api.adminClientPortal(orgId, propertyId), 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Client portal settings have been saved as draft",
      });
      queryClient.invalidateQueries({
        queryKey: [routes.api.adminClientPortal(orgId, propertyId)]
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Publish settings mutation
  const publishMutation = useMutation({
    mutationFn: async (version: number) => {
      return apiRequest(routes.api.adminClientPortalPublish(orgId, propertyId!), 'POST', { version });
    },
    onSuccess: () => {
      toast({
        title: "Settings Published",
        description: "Client portal settings are now live",
      });
      queryClient.invalidateQueries({
        queryKey: [routes.api.adminClientPortal(orgId, propertyId)]
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to publish settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Initialize form data with existing settings
  useEffect(() => {
    if (draftSettings) {
      setFormData(prev => ({
        branding: {
          ...prev.branding,
          ...(draftSettings.branding || {}),
        },
        theme: {
          ...prev.theme,
          ...(draftSettings.theme || {}),
        },
        layout: {
          ...prev.layout,
          ...(draftSettings.layout || {}),
        },
        modulesEnabled: {
          ...prev.modulesEnabled,
          ...(draftSettings.modulesEnabled || {}),
        },
        copy: {
          ...prev.copy,
          ...(draftSettings.copy || {}),
        },
        legal: {
          ...prev.legal,
          ...(draftSettings.legal || {}),
        },
        i18n: {
          ...prev.i18n,
          ...(draftSettings.i18n || {}),
        },
        authOptions: {
          ...prev.authOptions,
          ...(draftSettings.authOptions || {}),
        }
      }));
      setCurrentVersion(draftSettings.version);
    }
  }, [draftSettings]);

  useEffect(() => {
    if (publishedSettings) {
      setPublishedVersion(publishedSettings.version);
    }
  }, [publishedSettings]);

  const handleSave = () => {
    createSettingsMutation.mutate({
      ...formData,
      status: 'draft'
    });
  };

  const handlePublish = () => {
    if (draftSettings) {
      publishMutation.mutate(draftSettings.version);
    }
  };

  const updateFormData = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const getBrandingRestrictions = () => {
    if (!orgBranding) return null;
    
    const tier = orgBranding.tier;
    const capabilities = orgBranding.capabilities;
    
    return {
      tier,
      canCustomizeLogo: capabilities.logoUpload,
      canCustomizePrimaryColor: capabilities.primaryColor,
      canCustomizeSecondaryColor: capabilities.secondaryColor,
      canUseCustomCss: capabilities.customCss,
      canSelectFonts: capabilities.fontSelection
    };
  };

  if (settingsLoading || brandingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client portal settings...</p>
        </div>
      </div>
    );
  }

  const restrictions = getBrandingRestrictions();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Client Portal Settings</h1>
          <p className="text-gray-600 mt-2">Configure branding, navigation, pages, and forms for the client-facing portal. Publish when ready.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={publishedVersion ? "default" : "secondary"}>
            {publishedVersion ? `Published: v${publishedVersion}` : "No Published Version"}
          </Badge>
          <Badge variant="outline">
            {restrictions?.tier.toUpperCase()} PLAN
          </Badge>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Button 
          onClick={handleSave} 
          disabled={createSettingsMutation.isPending}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Draft
        </Button>
        <Button 
          onClick={handlePublish} 
          disabled={!draftSettings || publishMutation.isPending}
          variant="default"
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          Publish Settings
        </Button>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding Configuration</CardTitle>
              <CardDescription>
                Customize your client portal's appearance. {restrictions && (
                  <>Available features for {restrictions.tier.toUpperCase()} plan.</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.branding.companyName}
                    onChange={(e) => updateFormData('branding', 'companyName', e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
                
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    value={formData.branding.logoUrl}
                    onChange={(e) => updateFormData('branding', 'logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    disabled={!restrictions?.canCustomizeLogo}
                  />
                  {!restrictions?.canCustomizeLogo && (
                    <p className="text-sm text-gray-500 mt-1">Logo upload requires Pro plan or higher</p>
                  )}
                </div>

                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.branding.primaryColor}
                      onChange={(e) => updateFormData('branding', 'primaryColor', e.target.value)}
                      disabled={!restrictions?.canCustomizePrimaryColor}
                      className="w-16"
                    />
                    <Input
                      value={formData.branding.primaryColor}
                      onChange={(e) => updateFormData('branding', 'primaryColor', e.target.value)}
                      disabled={!restrictions?.canCustomizePrimaryColor}
                    />
                  </div>
                  {!restrictions?.canCustomizePrimaryColor && (
                    <p className="text-sm text-gray-500 mt-1">Color customization requires Pro plan or higher</p>
                  )}
                </div>

                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.branding.secondaryColor}
                      onChange={(e) => updateFormData('branding', 'secondaryColor', e.target.value)}
                      disabled={!restrictions?.canCustomizeSecondaryColor}
                      className="w-16"
                    />
                    <Input
                      value={formData.branding.secondaryColor}
                      onChange={(e) => updateFormData('branding', 'secondaryColor', e.target.value)}
                      disabled={!restrictions?.canCustomizeSecondaryColor}
                    />
                  </div>
                  {!restrictions?.canCustomizeSecondaryColor && (
                    <p className="text-sm text-gray-500 mt-1">Advanced colors require Grow plan or higher</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Font Family</Label>
                <Select
                  value={formData.theme.fontFamily}
                  onValueChange={(value) => updateFormData('theme', 'fontFamily', value)}
                  disabled={!restrictions?.canSelectFonts}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Open Sans">Open Sans</SelectItem>
                    <SelectItem value="Lato">Lato</SelectItem>
                  </SelectContent>
                </Select>
                {!restrictions?.canSelectFonts && (
                  <p className="text-sm text-gray-500 mt-1">Font selection requires Grow plan or higher</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Layout Settings</CardTitle>
              <CardDescription>Configure the overall layout and structure of your portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Header Style</Label>
                  <Select
                    value={formData.layout.headerStyle}
                    onValueChange={(value) => updateFormData('layout', 'headerStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Color Scheme</Label>
                  <Select
                    value={formData.theme.colorScheme}
                    onValueChange={(value) => updateFormData('theme', 'colorScheme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Footer</Label>
                  <p className="text-sm text-gray-500">Show footer with company information</p>
                </div>
                <Switch
                  checked={formData.layout.footerEnabled}
                  onCheckedChange={(checked) => updateFormData('layout', 'footerEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Sidebar</Label>
                  <p className="text-sm text-gray-500">Show navigation sidebar</p>
                </div>
                <Switch
                  checked={formData.layout.sidebarEnabled}
                  onCheckedChange={(checked) => updateFormData('layout', 'sidebarEnabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Module Configuration</CardTitle>
              <CardDescription>Enable or disable portal features for tenants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Task Requests</Label>
                    <p className="text-sm text-gray-500">Allow tenants to submit maintenance requests</p>
                  </div>
                  <Switch
                    checked={formData.modulesEnabled.taskRequests}
                    onCheckedChange={(checked) => updateFormData('modulesEnabled', 'taskRequests', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Messages</Label>
                    <p className="text-sm text-gray-500">Enable messaging between tenants and management</p>
                  </div>
                  <Switch
                    checked={formData.modulesEnabled.messages}
                    onCheckedChange={(checked) => updateFormData('modulesEnabled', 'messages', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Document Library</Label>
                    <p className="text-sm text-gray-500">Share documents and lease information</p>
                  </div>
                  <Switch
                    checked={formData.modulesEnabled.documents}
                    onCheckedChange={(checked) => updateFormData('modulesEnabled', 'documents', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Payment Portal</Label>
                    <p className="text-sm text-gray-500">Allow online rent and fee payments</p>
                  </div>
                  <Switch
                    checked={formData.modulesEnabled.payments}
                    onCheckedChange={(checked) => updateFormData('modulesEnabled', 'payments', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content & Copy</CardTitle>
              <CardDescription>Customize text and contact information displayed in the portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Welcome Message</Label>
                <Textarea
                  value={formData.copy.welcomeMessage}
                  onChange={(e) => updateFormData('copy', 'welcomeMessage', e.target.value)}
                  placeholder="Welcome to your property portal..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Support Email</Label>
                  <Input
                    type="email"
                    value={formData.copy.supportEmail}
                    onChange={(e) => updateFormData('copy', 'supportEmail', e.target.value)}
                    placeholder="support@example.com"
                  />
                </div>

                <div>
                  <Label>Support Phone</Label>
                  <Input
                    type="tel"
                    value={formData.copy.phoneNumber}
                    onChange={(e) => updateFormData('copy', 'phoneNumber', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Legal & Compliance</CardTitle>
              <CardDescription>Configure legal documents and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Privacy Policy URL</Label>
                  <Input
                    type="url"
                    value={formData.legal.privacyPolicyUrl}
                    onChange={(e) => updateFormData('legal', 'privacyPolicyUrl', e.target.value)}
                    placeholder="https://example.com/privacy"
                  />
                </div>

                <div>
                  <Label>Terms of Service URL</Label>
                  <Input
                    type="url"
                    value={formData.legal.termsOfServiceUrl}
                    onChange={(e) => updateFormData('legal', 'termsOfServiceUrl', e.target.value)}
                    placeholder="https://example.com/terms"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Cookie Notice</Label>
                  <p className="text-sm text-gray-500">Display cookie consent banner</p>
                </div>
                <Switch
                  checked={formData.legal.cookieNotice}
                  onCheckedChange={(checked) => updateFormData('legal', 'cookieNotice', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Settings</CardTitle>
              <CardDescription>Configure how tenants access the portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Allowed Login Methods</Label>
                <Select
                  value={formData.authOptions.allowedLogin}
                  onValueChange={(value) => updateFormData('authOptions', 'allowedLogin', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Only</SelectItem>
                    <SelectItem value="phone">Phone Only</SelectItem>
                    <SelectItem value="both">Email & Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Multi-Factor Authentication</Label>
                <Select
                  value={formData.authOptions.mfa}
                  onValueChange={(value) => updateFormData('authOptions', 'mfa', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Disabled</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="both">SMS & Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}