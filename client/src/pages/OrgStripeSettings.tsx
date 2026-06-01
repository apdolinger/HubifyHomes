import { useEffect, useState, useCallback } from "react";
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
  Shield,
  Copy,
  Webhook,
  Info,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";

export default function OrgStripeSettings() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [activeTab, setActiveTab] = useState("overview");
  const [directSecretKey, setDirectSecretKey] = useState("");
  const [directPublishableKey, setDirectPublishableKey] = useState("");
  const [webhookSecretInput, setWebhookSecretInput] = useState("");

  const orgId = (user as any)?.orgId;

  const { data: connection, isLoading: isConnectionLoading } = useQuery({
    queryKey: ["/api/orgs", orgId, "stripe-connection"],
    enabled: !!orgId,
  });

  // Handle Stripe Connect return URL query params
  useEffect(() => {
    if (params.get("connected") === "true") {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "stripe-connection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "payment-readiness"] });
      toast({
        title: "Stripe Connected",
        description: "Your Stripe account has been connected successfully. Set up your webhook to enable automatic payment updates.",
      });
      setActiveTab("webhooks");
      setLocation("/settings/stripe", { replace: true });
    } else if (params.get("onboarding") === "incomplete") {
      toast({
        title: "Onboarding Incomplete",
        description: "Please complete your Stripe account setup to start accepting payments.",
        variant: "destructive",
      });
      setLocation("/settings/stripe", { replace: true });
    } else if (params.get("error")) {
      toast({
        title: "Connection Error",
        description: "There was a problem connecting your Stripe account. Please try again.",
        variant: "destructive",
      });
      setLocation("/settings/stripe", { replace: true });
    }
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

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
        description: error.message || "Failed to start Stripe Connect onboarding",
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
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "stripe-connection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "payment-readiness"] });
      setDirectSecretKey("");
      setDirectPublishableKey("");
      toast({
        title: "Keys Saved",
        description: "Your Stripe API keys are saved. Now set up your webhook in the Webhooks tab.",
      });
      setActiveTab("webhooks");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Stripe keys",
        variant: "destructive",
      });
    },
  });

  const saveWebhookSecretMutation = useMutation({
    mutationFn: async (secret: string) => {
      const response = await apiRequest("PATCH", `/api/orgs/${orgId}/stripe-connection`, {
        stripeWebhookSecret: secret,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "stripe-connection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "payment-readiness"] });
      setWebhookSecretInput("");
      toast({
        title: "Webhook Secret Saved",
        description: "Webhook configured. Invoice statuses will now update automatically after payment.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save webhook secret",
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
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "stripe-connection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "payment-readiness"] });
      toast({ title: "Disconnected", description: "Your Stripe account has been disconnected." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Stripe account",
        variant: "destructive",
      });
    },
  });

  const copyWebhookUrl = useCallback(() => {
    if (!orgId) return;
    const url = `${window.location.origin}/api/stripe/webhooks/org/${orgId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Copied", description: "Webhook URL copied to clipboard." });
    });
  }, [orgId, toast]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !(user as any)?.orgId)) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to view this page.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/"), 1000);
    }
  }, [isAuthenticated, isLoading, user, toast, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !(user as any)?.orgId) return null;

  const webhookUrl = `${window.location.origin}/api/stripe/webhooks/org/${orgId}`;

  const getConnectionStatus = () => {
    if (!connection) {
      return { status: "disconnected", icon: XCircle, color: "text-slate-400", badge: "Not Connected", variant: "outline" as const };
    }
    if (!connection.isActive) {
      return { status: "inactive", icon: AlertTriangle, color: "text-yellow-600", badge: "Inactive", variant: "secondary" as const };
    }
    return { status: "connected", icon: CheckCircle, color: "text-green-600", badge: "Connected", variant: "default" as const };
  };

  const statusConfig = getConnectionStatus();
  const StatusIcon = statusConfig.icon;
  const webhookOk = !!(connection as any)?.hasWebhookSecret;

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
        <div className="flex items-center gap-2">
          <Badge variant={statusConfig.variant} className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
            {statusConfig.badge}
          </Badge>
          {connection && (
            <Badge variant={webhookOk ? "default" : "outline"} className="flex items-center gap-2">
              {webhookOk
                ? <CheckCircle className="w-4 h-4 text-green-600" />
                : <AlertTriangle className="w-4 h-4 text-yellow-600" />}
              {webhookOk ? "Webhook ✓" : "Webhook ⚠"}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="connect" data-testid="tab-connect">Stripe Connect</TabsTrigger>
          <TabsTrigger value="direct" data-testid="tab-direct">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="tab-webhooks">
            Webhooks
            {connection && !webhookOk && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Current status of your Stripe integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnectionLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : connection ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">Stripe</p>
                        <p className="text-sm text-slate-600">
                          {connection.accountType === "connect" ? "Stripe Connect" : "Direct API Keys"}
                        </p>
                      </div>
                      <StatusIcon className={`w-7 h-7 ${statusConfig.color}`} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">Webhooks</p>
                        <p className="text-sm text-slate-600">
                          {webhookOk ? "Signing secret saved" : "Not configured"}
                        </p>
                      </div>
                      {webhookOk
                        ? <CheckCircle className="w-7 h-7 text-green-600" />
                        : <AlertTriangle className="w-7 h-7 text-yellow-500" />}
                    </div>
                  </div>

                  {connection.accountType === "connect" && connection.stripeAccountId && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="font-medium mb-1">Account ID</p>
                      <p className="text-sm font-mono text-slate-600">{connection.stripeAccountId}</p>
                    </div>
                  )}

                  {!webhookOk && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Webhook not configured.</strong> Without it, invoice statuses won't update after payment.{" "}
                        <button
                          className="underline text-primary"
                          onClick={() => setActiveTab("webhooks")}
                        >
                          Set up webhooks →
                        </button>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="destructive"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    data-testid="button-disconnect"
                  >
                    {disconnectMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Disconnect Stripe
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">No Stripe Connection</h3>
                  <p className="text-slate-600 mb-4">Connect your Stripe account to start processing payments</p>
                  <div className="flex justify-center gap-3">
                    <Button onClick={() => setActiveTab("connect")} data-testid="button-goto-connect">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Use Stripe Connect
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("direct")} data-testid="button-goto-direct">
                      <Key className="w-4 h-4 mr-2" />
                      Use API Keys
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── STRIPE CONNECT TAB ─── */}
        <TabsContent value="connect" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Connect (Recommended)</CardTitle>
              <CardDescription>
                Securely connect your Stripe account with OAuth. Easiest and most secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  ["Secure OAuth Connection", "No copying and pasting API keys manually"],
                  ["Automatic Updates", "Your connection stays up to date automatically"],
                  ["Easy to Revoke", "Disconnect anytime from your Stripe dashboard"],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-slate-600">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {connection ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You already have a Stripe connection. Disconnect it first if you want to switch methods.
                  </AlertDescription>
                </Alert>
              ) : (
                <Button
                  onClick={() => createConnectAccountMutation.mutate()}
                  disabled={createConnectAccountMutation.isPending}
                  className="w-full"
                  data-testid="button-connect-stripe"
                >
                  {createConnectAccountMutation.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Redirecting to Stripe...</>
                  ) : (
                    <><ExternalLink className="w-4 h-4 mr-2" />Connect with Stripe</>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DIRECT API KEYS TAB ─── */}
        <TabsContent value="direct" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Direct API Keys</CardTitle>
              <CardDescription>
                Manually enter your Stripe secret key. Use this if you prefer not to use Stripe Connect.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your secret key is encrypted at rest using AES-256-GCM before being stored. It is never returned to the frontend.
                </AlertDescription>
              </Alert>

              {connection ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    A Stripe connection already exists. Disconnect it first to enter new keys.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="secretKey">Secret Key</Label>
                    <Input
                      id="secretKey"
                      type="password"
                      placeholder="sk_test_xxxxx or sk_live_xxxxx"
                      value={directSecretKey}
                      onChange={(e) => setDirectSecretKey(e.target.value)}
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
                      data-testid="input-publishable-key"
                    />
                  </div>

                  <Button
                    onClick={() =>
                      saveDirectKeysMutation.mutate({
                        stripeSecretKey: directSecretKey,
                        stripePublishableKey: directPublishableKey || "",
                      })
                    }
                    disabled={!directSecretKey || saveDirectKeysMutation.isPending}
                    className="w-full"
                    data-testid="button-save-keys"
                  >
                    {saveDirectKeysMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Save API Keys
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── WEBHOOKS TAB ─── */}
        <TabsContent value="webhooks" className="space-y-6">
          {!connection ? (
            <Card>
              <CardContent className="py-10 text-center text-slate-500">
                <Webhook className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">Connect Stripe first</p>
                <p className="text-sm mt-1">Set up a Stripe connection before configuring webhooks.</p>
                <Button className="mt-4" variant="outline" onClick={() => setActiveTab("overview")}>
                  Back to Overview
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Webhook Endpoint URL</CardTitle>
                  <CardDescription>
                    Add this URL to your Stripe dashboard so Stripe can notify Hubify when payments succeed or fail.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      In your{" "}
                      <a
                        href="https://dashboard.stripe.com/webhooks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-primary"
                      >
                        Stripe dashboard → Developers → Webhooks
                      </a>
                      , click <strong>Add endpoint</strong>, paste the URL below, and select these events:{" "}
                      <code className="text-xs bg-slate-100 px-1 rounded">payment_intent.succeeded</code>{" "}
                      <code className="text-xs bg-slate-100 px-1 rounded">payment_intent.payment_failed</code>{" "}
                      <code className="text-xs bg-slate-100 px-1 rounded">charge.refunded</code>.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Your Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={webhookUrl}
                        className="font-mono text-sm bg-slate-50"
                        data-testid="webhook-url-display"
                      />
                      <Button variant="outline" size="icon" onClick={copyWebhookUrl} title="Copy to clipboard">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Webhook Signing Secret
                    {webhookOk && <CheckCircle className="w-5 h-5 text-green-600" />}
                  </CardTitle>
                  <CardDescription>
                    After adding the endpoint in Stripe, copy the <strong>Signing secret</strong> (starts with{" "}
                    <code className="text-xs bg-slate-100 px-1 rounded">whsec_</code>) and paste it here.
                    This lets Hubify verify that webhook events are genuinely from Stripe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {webhookOk && (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Webhook secret is saved. Invoice statuses update automatically after payment.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="webhookSecret">
                      {webhookOk ? "Update Signing Secret" : "Signing Secret"}
                    </Label>
                    <Input
                      id="webhookSecret"
                      type="password"
                      placeholder="whsec_xxxxxxxxxxxxxxxxxxxx"
                      value={webhookSecretInput}
                      onChange={(e) => setWebhookSecretInput(e.target.value)}
                      data-testid="input-webhook-secret"
                    />
                  </div>

                  <Button
                    onClick={() => saveWebhookSecretMutation.mutate(webhookSecretInput)}
                    disabled={!webhookSecretInput || saveWebhookSecretMutation.isPending}
                    data-testid="button-save-webhook-secret"
                  >
                    {saveWebhookSecretMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    {webhookOk ? "Update Secret" : "Save Signing Secret"}
                  </Button>

                  {webhookOk && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500"
                      onClick={() => saveWebhookSecretMutation.mutate("")}
                      disabled={saveWebhookSecretMutation.isPending}
                    >
                      Remove webhook secret
                    </Button>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
