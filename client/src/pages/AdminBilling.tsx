import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard,
  DollarSign,
  Building2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  ArrowLeft
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function AdminBilling() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [priceId, setPriceId] = useState("");

  const { data: organizations = [] } = useQuery({
    queryKey: ['/api/organizations'],
  });

  const { data: subscriptions = [], isLoading: isSubscriptionsLoading } = useQuery({
    queryKey: ['/api/stripe/subscriptions'],
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: { orgId: string; priceId: string }) => {
      const org = organizations.find((o: any) => o.id === data.orgId);
      
      if (!org?.billingEmail) {
        throw new Error("Organization billing email is required. Please update the organization settings first.");
      }
      
      const response = await apiRequest("POST", "/api/stripe/create-subscription", {
        orgId: data.orgId,
        orgName: org?.name || "Organization",
        email: org.billingEmail,
        priceId: data.priceId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscriptions'] });
      setIsCreateDialogOpen(false);
      setSelectedOrgId("");
      setPriceId("");
      toast({
        title: "Subscription Created",
        description: "The subscription has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const response = await apiRequest("POST", "/api/stripe/cancel-subscription", { orgId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscriptions'] });
      toast({
        title: "Subscription Cancelled",
        description: "The subscription has been cancelled and will end at the current period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "You need admin access to view this page.",
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

  if (!isAuthenticated || (user as any)?.role !== 'admin') {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      active: { variant: "default", icon: CheckCircle, label: "Active" },
      trialing: { variant: "secondary", icon: RefreshCw, label: "Trial" },
      past_due: { variant: "destructive", icon: AlertCircle, label: "Past Due" },
      canceled: { variant: "outline", icon: XCircle, label: "Cancelled" },
      unpaid: { variant: "destructive", icon: XCircle, label: "Unpaid" },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

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
            <h1 className="text-3xl font-bold text-slate-900">Billing Management</h1>
            <p className="text-slate-600 mt-2">
              Manage organization subscriptions and billing for Hubify platform
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/invoices">
            <Button variant="outline" data-testid="button-view-invoices">
              View Invoices
            </Button>
          </Link>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
            data-testid="button-create-subscription"
          >
            <Plus className="w-4 h-4" />
            Create Subscription
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter((s: any) => s.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter((s: any) => s.status === 'past_due').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Subscriptions</CardTitle>
          <CardDescription>
            View and manage Stripe subscriptions for all organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubscriptionsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p>No subscriptions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Current Period</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub: any) => {
                  const org = organizations.find((o: any) => o.id === sub.orgId);
                  return (
                    <TableRow key={sub.orgId} data-testid={`row-subscription-${sub.orgId}`}>
                      <TableCell className="font-medium">
                        {org?.name || "Unknown"}
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {sub.stripeCustomerId}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sub.stripeSubscriptionId}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(sub.currentPeriodStart).toLocaleDateString()} - {" "}
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelSubscriptionMutation.mutate(sub.orgId)}
                            disabled={cancelSubscriptionMutation.isPending}
                            data-testid={`button-cancel-${sub.orgId}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                        {sub.cancelAtPeriodEnd && (
                          <Badge variant="outline" className="text-orange-600">
                            Cancelling
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-subscription">
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
            <DialogDescription>
              Create a new Stripe subscription for an organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger id="organization" data-testid="select-organization">
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceId">Stripe Price ID</Label>
              <Input
                id="priceId"
                placeholder="price_xxxxx"
                value={priceId}
                onChange={(e) => setPriceId(e.target.value)}
                data-testid="input-price-id"
              />
              <p className="text-xs text-slate-500">
                Enter the Stripe Price ID from your dashboard (starts with price_)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              data-testid="button-cancel-dialog"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createSubscriptionMutation.mutate({ orgId: selectedOrgId, priceId })}
              disabled={!selectedOrgId || !priceId || createSubscriptionMutation.isPending}
              data-testid="button-submit-subscription"
            >
              {createSubscriptionMutation.isPending && (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              )}
              Create Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
