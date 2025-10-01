import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Key,
  Link as LinkIcon,
  ArrowLeft,
  Shield
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function OrgStripeSettings() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [directSecretKey, setDirectSecretKey] = useState("");
  const [directPublishableKey, setDirectPublishableKey] = useState("");

  const orgId = (user as any)?.orgId;

  const { data: connection, isLoading: isConnectionLoading } = useQuery({
    queryKey: ['/api/orgs', orgId, 'stripe-connection'],
    enabled: !!orgId,
  });

  const createConnectAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/orgs/${orgId}/stripe-connect/account-link`, {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Stripe Connect account",
        variant: "destructive",
      });
    },
  });

  const saveDirectKeysMutation = useMutation({
    mutationFn: async (data: { stripeSecretKey: string; stripePublishableKey: string }) => {
      const response = await apiRequest("POST", `/api/orgs/${orgId}/stripe-connection`, {
        accountType: "direct",
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orgs', orgId, 'stripe-connection'] });
      setDirectSecretKey("");
      setDirectPublishableKey("");
      toast({
        title: "Keys Saved",
        description: "Your Stripe API keys have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Stripe keys",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/orgs/${orgId}/stripe-connection`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orgs', orgId, 'stripe-connection'] });
      toast({
        title: "Disconnected",
        description: "Your Stripe account has been disconnected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Stripe account",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !(user as any)?.orgId)) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to view this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !(user as any)?.orgId) {
    return null;
  }

  const getConnectionStatus = () => {
    if (!connection) {
      return {
        status: "disconnected",
        icon: XCircle,
        color: "text-slate-400",
        badge: "Not Connected",
        variant: "outline" as const
      };
    }

    if (!connection.isActive) {
      return {
        status: "inactive",
        icon: AlertTriangle,
        color: "text-yellow-600",
        badge: "Inactive",
        variant: "secondary" as const
      };
    }

    return {
      status: "connected",
      icon: CheckCircle,
      color: "text-green-600",
      badge: "Connected",
      variant: "default" as const
    };
  };

  const statusConfig = getConnectionStatus();
  const StatusIcon = statusConfig.icon;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="ghost" className="flex items-center" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stripe Settings</h1>
            <p className="text-slate-600 mt-2">
              Connect your Stripe account to process payments from your clients
            </p>
          </div>
        </div>
        <Badge variant={statusConfig.variant} className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
          {statusConfig.badge}
        </Badge>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your Stripe credentials are securely stored and encrypted. They are only used to process 
          payments on your behalf and are never shared with third parties.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="connect" data-testid="tab-connect">Stripe Connect</TabsTrigger>
          <TabsTrigger value="direct" data-testid="tab-direct">Direct API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>
                Current status of your Stripe integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnectionLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : connection ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">Connection Type</p>
                      <p className="text-sm text-slate-600">
                        {connection.accountType === 'connect' ? 'Stripe Connect' : 'Direct API Keys'}
                      </p>
                    </div>
                    <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
                  </div>

                  {connection.accountType === 'connect' && connection.stripeAccountId && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="font-medium mb-1">Account ID</p>
                      <p className="text-sm font-mono text-slate-600">
                        {connection.stripeAccountId}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                      data-testid="button-disconnect"
                    >
                      {disconnectMutation.isPending && (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Disconnect Stripe
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">No Stripe Connection</h3>
                  <p className="text-slate-600 mb-4">
                    Connect your Stripe account to start processing payments
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button
                      onClick={() => setActiveTab("connect")}
                      data-testid="button-goto-connect"
                    >
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Use Stripe Connect
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("direct")}
                      data-testid="button-goto-direct"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Use API Keys
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connect" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Connect (Recommended)</CardTitle>
              <CardDescription>
                Securely connect your Stripe account with OAuth. This is the easiest and most secure method.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Secure OAuth Connection</p>
                    <p className="text-sm text-slate-600">
                      No need to copy and paste API keys manually
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Automatic Updates</p>
                    <p className="text-sm text-slate-600">
                      Your connection stays up to date automatically
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Easy to Revoke</p>
                    <p className="text-sm text-slate-600">
                      You can disconnect anytime from your Stripe dashboard
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => createConnectAccountMutation.mutate()}
                disabled={createConnectAccountMutation.isPending || !!connection}
                className="w-full"
                data-testid="button-connect-stripe"
              >
                {createConnectAccountMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect with Stripe
                  </>
                )}
              </Button>

              {connection && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You already have a Stripe connection. Disconnect your current connection first 
                    if you want to set up a new one.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direct" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Direct API Keys</CardTitle>
              <CardDescription>
                Manually enter your Stripe API keys. Use this if you prefer not to use Stripe Connect.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your API keys will be stored securely, but Stripe Connect is the recommended method 
                  for better security and easier management.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    placeholder="sk_test_xxxxx or sk_live_xxxxx"
                    value={directSecretKey}
                    onChange={(e) => setDirectSecretKey(e.target.value)}
                    disabled={!!connection}
                    data-testid="input-secret-key"
                  />
                  <p className="text-xs text-slate-500">
                    Find this in your Stripe Dashboard under Developers → API keys
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publishableKey">Publishable Key (Optional)</Label>
                  <Input
                    id="publishableKey"
                    placeholder="pk_test_xxxxx or pk_live_xxxxx"
                    value={directPublishableKey}
                    onChange={(e) => setDirectPublishableKey(e.target.value)}
                    disabled={!!connection}
                    data-testid="input-publishable-key"
                  />
                </div>

                <Button
                  onClick={() => saveDirectKeysMutation.mutate({
                    stripeSecretKey: directSecretKey,
                    stripePublishableKey: directPublishableKey || undefined,
                  })}
                  disabled={!directSecretKey || saveDirectKeysMutation.isPending || !!connection}
                  className="w-full"
                  data-testid="button-save-keys"
                >
                  {saveDirectKeysMutation.isPending && (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save API Keys
                </Button>

                {connection && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      You already have a Stripe connection. Disconnect your current connection first 
                      if you want to set up a new one.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
