import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Download,
  Send,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Billing({ embedded = false }: { embedded?: boolean }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch billing submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/billing-submissions", { status: statusFilter, clientId: clientFilter !== "all" ? clientFilter : undefined }],
    enabled: isAuthenticated,
  });

  // Fetch all clients for filtering
  const { data: clients } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
  });

  // Authorize submission mutation
  const authorizeMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      return apiRequest("POST", `/api/billing-submissions/${submissionId}/authorize`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-submissions"] });
      toast({
        title: "Submission authorized",
        description: "The billing submission has been approved and marked for invoicing.",
      });
      setSelectedSubmission(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to authorize",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject submission mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      return apiRequest("POST", `/api/billing-submissions/${submissionId}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-submissions"] });
      toast({
        title: "Submission rejected",
        description: "The billing submission has been rejected.",
      });
      setSelectedSubmission(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reject",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Authorize & Send mutation (admin/supervisor only)
  const [authorizeAndSendDialog, setAuthorizeAndSendDialog] = useState(false);
  const [authorizeAndSendSubmission, setAuthorizeAndSendSubmission] = useState<any>(null);
  const [quickSendEmail, setQuickSendEmail] = useState("");
  const [quickSendMessage, setQuickSendMessage] = useState("");

  const authorizeAndSendMutation = useMutation({
    mutationFn: async ({ submissionId, recipientEmail, message }: { submissionId: string; recipientEmail: string; message?: string }) => {
      return apiRequest("POST", `/api/billing-submissions/${submissionId}/authorize-and-send`, { recipientEmail, message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-submissions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orgs`] });
      toast({
        title: "Success!",
        description: "Submission authorized, invoice created and sent to client.",
      });
      setAuthorizeAndSendDialog(false);
      setAuthorizeAndSendSubmission(null);
      setQuickSendEmail("");
      setQuickSendMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAuthorizeAndSend = () => {
    if (!quickSendEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please provide a recipient email address.",
        variant: "destructive",
      });
      return;
    }
    authorizeAndSendMutation.mutate({
      submissionId: authorizeAndSendSubmission.id,
      recipientEmail: quickSendEmail,
      message: quickSendMessage
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ submissionId: selectedSubmission.id, reason: rejectionReason });
  };

  const filteredSubmissions = (submissions as any[] || []).filter((submission: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      submission.description?.toLowerCase().includes(searchLower) ||
      submission.sourceType?.toLowerCase().includes(searchLower)
    );
  });

  const pendingCount = (submissions as any[] || []).filter((s: any) => s.status === "pending").length;

  return (
    <div className={embedded ? "" : "p-6 max-w-7xl mx-auto"}>
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Billing Management</h1>
          <p className="text-slate-500">Review and authorize billing submissions, manage invoices</p>
        </div>
      )}

      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions" data-testid="tab-submissions">
            Pending Submissions
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2" data-testid="badge-pending-count">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-submissions"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="authorized">Authorized</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="invoiced">Invoiced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Client</label>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger data-testid="select-client-filter">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {(clients as any[] || []).map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.firstName} {client.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Submissions</CardTitle>
              <CardDescription>
                Review and authorize billable work before it's included in invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissionsLoading ? (
                <p className="text-center text-slate-500 py-8">Loading submissions...</p>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">No submissions found</h3>
                  <p className="text-slate-500">No billing submissions match your filters.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSubmissions.map((submission: any) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      onClick={() => setSelectedSubmission(submission)}
                      data-testid={`submission-${submission.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{submission.description}</h4>
                          <Badge variant="outline" className="text-xs">
                            {submission.sourceType}
                          </Badge>
                          <Badge
                            variant={
                              submission.status === "pending" ? "secondary" :
                              submission.status === "authorized" ? "default" :
                              submission.status === "rejected" ? "destructive" :
                              "outline"
                            }
                          >
                            {submission.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>Client: {submission.client?.firstName} {submission.client?.lastName}</span>
                          <span>Amount: ${(submission.amountCents / 100).toFixed(2)}</span>
                          {submission.quantity > 1 && <span>Qty: {submission.quantity}</span>}
                          <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {submission.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAuthorizeAndSendSubmission(submission);
                              setQuickSendEmail(submission.client?.email || '');
                              setAuthorizeAndSendDialog(true);
                            }}
                            disabled={authorizeAndSendMutation.isPending}
                            data-testid={`button-authorize-send-${submission.id}`}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Authorize & Send
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              authorizeMutation.mutate(submission.id);
                            }}
                            disabled={authorizeMutation.isPending}
                            data-testid={`button-authorize-${submission.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Authorize
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubmission(submission);
                            }}
                            data-testid={`button-reject-${submission.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <InvoicesTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>

      {/* Submission Details/Reject Modal */}
      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent data-testid="dialog-submission-details">
          <DialogHeader>
            <DialogTitle>Billing Submission Details</DialogTitle>
            <DialogDescription>
              Review submission details and take action
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-slate-700">{selectedSubmission.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm text-slate-700">${(selectedSubmission.amountCents / 100).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <p className="text-sm text-slate-700">{selectedSubmission.quantity}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Source Type</label>
                <p className="text-sm text-slate-700">{selectedSubmission.sourceType}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Badge variant={
                  selectedSubmission.status === "pending" ? "secondary" :
                  selectedSubmission.status === "authorized" ? "default" :
                  "destructive"
                }>
                  {selectedSubmission.status}
                </Badge>
              </div>
              {selectedSubmission.status === "pending" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rejection Reason (optional)</label>
                    <Textarea
                      placeholder="Enter reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      data-testid="textarea-rejection-reason"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => authorizeMutation.mutate(selectedSubmission.id)}
                      disabled={authorizeMutation.isPending}
                      data-testid="button-authorize-submission"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Authorize
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={rejectMutation.isPending}
                      data-testid="button-reject-submission"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Authorize & Send Dialog */}
      <Dialog open={authorizeAndSendDialog} onOpenChange={setAuthorizeAndSendDialog}>
        <DialogContent data-testid="dialog-authorize-send">
          <DialogHeader>
            <DialogTitle>Authorize & Send Invoice</DialogTitle>
            <DialogDescription>
              This will authorize the submission, create an invoice, generate a PDF, and send it to the client in one action.
            </DialogDescription>
          </DialogHeader>
          {authorizeAndSendSubmission && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Submission</label>
                <p className="text-sm text-slate-700">{authorizeAndSendSubmission.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm text-slate-700">${(authorizeAndSendSubmission.amountCents / 100).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Client</label>
                  <p className="text-sm text-slate-700">{authorizeAndSendSubmission.client?.name || "Unknown"}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Recipient Email *</label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={quickSendEmail}
                  onChange={(e) => setQuickSendEmail(e.target.value)}
                  data-testid="input-quick-send-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message (optional)</label>
                <Textarea
                  placeholder="Add a custom message to include in the email..."
                  value={quickSendMessage}
                  onChange={(e) => setQuickSendMessage(e.target.value)}
                  rows={3}
                  data-testid="textarea-quick-send-message"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAuthorizeAndSendDialog(false)}
              data-testid="button-cancel-authorize-send"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAuthorizeAndSend}
              disabled={authorizeAndSendMutation.isPending}
              data-testid="button-confirm-authorize-send"
            >
              {authorizeAndSendMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Authorize & Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Invoices Tab Component
function InvoicesTab() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const orgId = (user as any)?.orgId;

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [invoiceClientFilter, setInvoiceClientFilter] = useState<string>("all");
  
  const [sendInvoiceDialogOpen, setSendInvoiceDialogOpen] = useState(false);
  const [viewInvoiceDialogOpen, setViewInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Fetch all invoices
  const { data: allInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: [`/api/orgs/${orgId}/client-invoices`],
    enabled: isAuthenticated && !!orgId,
  });

  // Fetch clients for filtering
  const { data: clients } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, email, message }: { invoiceId: string; email: string; message?: string }) => {
      const user = await queryClient.fetchQuery({ queryKey: ["/api/auth/user"] }) as any;
      const orgId = user.orgId;
      return apiRequest("POST", `/api/orgs/${orgId}/client-invoices/${invoiceId}/send`, {
        recipientEmail: email,
        message: message || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/client-invoices`] });
      toast({
        title: "Invoice sent",
        description: "The invoice has been sent successfully.",
      });
      setSendInvoiceDialogOpen(false);
      setSelectedInvoice(null);
      setRecipientEmail("");
      setEmailMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setRecipientEmail(invoice.client?.email || "");
    setSendInvoiceDialogOpen(true);
  };

  const handleConfirmSend = () => {
    if (!recipientEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please provide a recipient email address.",
        variant: "destructive",
      });
      return;
    }
    sendInvoiceMutation.mutate({
      invoiceId: selectedInvoice.id,
      email: recipientEmail,
      message: emailMessage,
    });
  };

  const handleGeneratePDF = async (invoice: any) => {
    try {
      const user = await queryClient.fetchQuery({ queryKey: ["/api/auth/user"] }) as any;
      const orgId = user.orgId;
      
      const response = await fetch(`/api/orgs/${orgId}/client-invoices/${invoice.id}/generate-pdf`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber || invoice.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF generated",
        description: "Invoice PDF downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to generate PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredInvoices = (allInvoices as any[] || []).filter((invoice: any) => {
    if (invoiceStatusFilter !== "all" && invoice.status !== invoiceStatusFilter) return false;
    if (invoiceClientFilter !== "all" && invoice.clientId !== invoiceClientFilter) return false;
    return true;
  });

  // Calculate failed and overdue invoices
  const failedInvoices = (allInvoices as any[] || []).filter((inv: any) => inv.paymentStatus === 'failed');
  const overdueInvoices = (allInvoices as any[] || []).filter((inv: any) => {
    const isDue = inv.dueDate && new Date(inv.dueDate) < new Date();
    const isNotPaid = inv.status !== 'paid';
    return isDue && isNotPaid;
  });
  
  const failedAmount = failedInvoices.reduce((sum: number, inv: any) => sum + inv.amountCents, 0);
  const overdueAmount = overdueInvoices.reduce((sum: number, inv: any) => sum + inv.amountCents, 0);
  const totalAtRisk = failedAmount + overdueAmount;

  return (
    <div className="space-y-4">
      {/* Failed Payments Alert Widget */}
      {(failedInvoices.length > 0 || overdueInvoices.length > 0) && (
        <Card className="border-red-200 bg-red-50" data-testid="card-failed-payments">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-900">Payment Issues Detected</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              Review and take action on failed payments and overdue invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Failed Payments</span>
                  <Badge variant="destructive" data-testid="badge-failed-count">
                    {failedInvoices.length}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-red-600" data-testid="text-failed-amount">
                  ${(failedAmount / 100).toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Overdue Invoices</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800" data-testid="badge-overdue-count">
                    {overdueInvoices.length}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-orange-600" data-testid="text-overdue-amount">
                  ${(overdueAmount / 100).toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Total at Risk</span>
                </div>
                <p className="text-2xl font-bold text-slate-900" data-testid="text-total-at-risk">
                  ${(totalAtRisk / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Failed Payments List */}
            {failedInvoices.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-red-900 mb-2">Failed Payments</h4>
                {failedInvoices.map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="bg-white p-3 rounded-lg border border-red-200"
                    data-testid={`failed-invoice-${invoice.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            Invoice #{invoice.invoiceNumber || invoice.id.slice(0, 8)}
                          </span>
                          <Badge variant="destructive" className="text-xs">Failed</Badge>
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <div>Client: {invoice.client?.firstName} {invoice.client?.lastName}</div>
                          <div className="font-semibold text-red-600">
                            Amount: ${(invoice.amountCents / 100).toFixed(2)}
                          </div>
                          {invoice.paymentError && (
                            <div className="text-red-700 bg-red-50 p-2 rounded mt-2">
                              <span className="font-medium">Error:</span> {invoice.paymentError}
                            </div>
                          )}
                          {invoice.paymentDate && (
                            <div>Last attempt: {new Date(invoice.paymentDate).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs">
                        Retry Payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Overdue Invoices List */}
            {overdueInvoices.length > 0 && failedInvoices.length > 0 && (
              <div className="h-px bg-slate-200 my-4"></div>
            )}
            {overdueInvoices.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-orange-900 mb-2">Overdue Invoices</h4>
                {overdueInvoices.slice(0, 3).map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="bg-white p-3 rounded-lg border border-orange-200"
                    data-testid={`overdue-invoice-${invoice.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            Invoice #{invoice.invoiceNumber || invoice.id.slice(0, 8)}
                          </span>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">Overdue</Badge>
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <div>Client: {invoice.client?.firstName} {invoice.client?.lastName}</div>
                          <div className="font-semibold text-orange-600">
                            Amount: ${(invoice.amountCents / 100).toFixed(2)}
                          </div>
                          {invoice.dueDate && (
                            <div className="text-orange-700">
                              Due: {new Date(invoice.dueDate).toLocaleDateString()} 
                              ({Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue)
                            </div>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs">
                        Send Reminder
                      </Button>
                    </div>
                  </div>
                ))}
                {overdueInvoices.length > 3 && (
                  <p className="text-xs text-slate-500 text-center pt-2">
                    + {overdueInvoices.length - 3} more overdue invoice{overdueInvoices.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger data-testid="select-invoice-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Client</label>
              <Select value={invoiceClientFilter} onValueChange={setInvoiceClientFilter}>
                <SelectTrigger data-testid="select-invoice-client-filter">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {(clients as any[] || []).map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Invoices</CardTitle>
          <CardDescription>
            View and manage all client invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <p className="text-center text-slate-500 py-8">Loading invoices...</p>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-2">No invoices found</h3>
              <p className="text-slate-500">No invoices match your filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  data-testid={`invoice-${invoice.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">
                        Invoice #{invoice.invoiceNumber || invoice.id.slice(0, 8)}
                      </h4>
                      <Badge
                        variant={
                          invoice.status === "paid" ? "default" :
                          invoice.status === "sent" ? "secondary" :
                          invoice.status === "overdue" ? "destructive" :
                          "outline"
                        }
                      >
                        {invoice.status}
                      </Badge>
                      {invoice.paymentStatus && (
                        <Badge
                          variant={
                            invoice.paymentStatus === "succeeded" ? "default" :
                            invoice.paymentStatus === "failed" ? "destructive" :
                            invoice.paymentStatus === "processing" ? "secondary" :
                            invoice.paymentStatus === "refunded" ? "outline" :
                            "secondary"
                          }
                          className={
                            invoice.paymentStatus === "succeeded" ? "bg-green-600" :
                            invoice.paymentStatus === "failed" ? "bg-red-600" :
                            invoice.paymentStatus === "processing" ? "bg-blue-600" :
                            invoice.paymentStatus === "refunded" ? "bg-gray-600" :
                            ""
                          }
                          data-testid={`badge-payment-status-${invoice.id}`}
                        >
                          {invoice.paymentStatus === "succeeded" ? "Payment Successful" :
                           invoice.paymentStatus === "failed" ? "Payment Failed" :
                           invoice.paymentStatus === "processing" ? "Processing" :
                           invoice.paymentStatus === "refunded" ? "Refunded" :
                           invoice.paymentStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>Client: {invoice.client?.firstName} {invoice.client?.lastName}</span>
                      <span className="font-semibold text-slate-700">
                        ${(invoice.amountCents / 100).toFixed(2)}
                      </span>
                      {invoice.issuedAt && (
                        <span>Issued: {new Date(invoice.issuedAt).toLocaleDateString()}</span>
                      )}
                      {invoice.dueDate && (
                        <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setViewInvoiceDialogOpen(true);
                      }}
                      data-testid={`button-view-invoice-${invoice.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleGeneratePDF(invoice)}
                      data-testid={`button-generate-pdf-${invoice.id}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleSendInvoice(invoice)}
                      data-testid={`button-send-invoice-${invoice.id}`}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={sendInvoiceDialogOpen} onOpenChange={setSendInvoiceDialogOpen}>
        <DialogContent data-testid="dialog-send-invoice">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Send invoice #{selectedInvoice?.invoiceNumber || selectedInvoice?.id?.slice(0, 8)} to the client via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Email</label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                data-testid="input-recipient-email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message (Optional)</label>
              <Textarea
                placeholder="Add a personal message to include in the email..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
                data-testid="textarea-email-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendInvoiceDialogOpen(false)}
              data-testid="button-cancel-send"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSend}
              disabled={sendInvoiceMutation.isPending}
              data-testid="button-confirm-send"
            >
              {sendInvoiceMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewInvoiceDialogOpen} onOpenChange={setViewInvoiceDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-view-invoice">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Complete information for Invoice #{selectedInvoice?.invoiceNumber || selectedInvoice?.id?.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              {/* Status Badges */}
              <div className="flex gap-2">
                <Badge
                  variant={
                    selectedInvoice.status === "paid" ? "default" :
                    selectedInvoice.status === "sent" ? "secondary" :
                    selectedInvoice.status === "overdue" ? "destructive" :
                    "outline"
                  }
                >
                  {selectedInvoice.status}
                </Badge>
                {selectedInvoice.paymentStatus && (
                  <Badge
                    variant={
                      selectedInvoice.paymentStatus === "succeeded" ? "default" :
                      selectedInvoice.paymentStatus === "failed" ? "destructive" :
                      "secondary"
                    }
                    className={
                      selectedInvoice.paymentStatus === "succeeded" ? "bg-green-600" :
                      selectedInvoice.paymentStatus === "failed" ? "bg-red-600" :
                      ""
                    }
                  >
                    {selectedInvoice.paymentStatus === "succeeded" ? "Payment Successful" :
                     selectedInvoice.paymentStatus === "failed" ? "Payment Failed" :
                     selectedInvoice.paymentStatus === "processing" ? "Processing" :
                     selectedInvoice.paymentStatus}
                  </Badge>
                )}
              </div>

              {/* Invoice Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Invoice Number</label>
                  <p className="text-base font-semibold">{selectedInvoice.invoiceNumber || selectedInvoice.id.slice(0, 8)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Amount</label>
                  <p className="text-base font-semibold text-green-600">
                    ${(selectedInvoice.amountCents / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Client</label>
                  <p className="text-base">{selectedInvoice.client?.firstName} {selectedInvoice.client?.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Client Email</label>
                  <p className="text-base">{selectedInvoice.client?.email || 'N/A'}</p>
                </div>
                {selectedInvoice.issuedAt && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Issued Date</label>
                    <p className="text-base">{new Date(selectedInvoice.issuedAt).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedInvoice.dueDate && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Due Date</label>
                    <p className="text-base">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedInvoice.paymentDate && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Payment Date</label>
                    <p className="text-base">{new Date(selectedInvoice.paymentDate).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedInvoice.sentAt && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Sent Date</label>
                    <p className="text-base">{new Date(selectedInvoice.sentAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedInvoice.description && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Description</label>
                  <p className="text-base mt-1">{selectedInvoice.description}</p>
                </div>
              )}

              {/* Payment Error */}
              {selectedInvoice.paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-red-900">Payment Error</label>
                  <p className="text-sm text-red-700 mt-1">{selectedInvoice.paymentError}</p>
                </div>
              )}

              {/* Line Items */}
              {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-2 block">Line Items</label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">Description</th>
                          <th className="text-right p-3 text-sm font-medium">Quantity</th>
                          <th className="text-right p-3 text-sm font-medium">Rate</th>
                          <th className="text-right p-3 text-sm font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedInvoice.lineItems.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-3 text-sm">{item.description}</td>
                            <td className="p-3 text-sm text-right">{item.quantity}</td>
                            <td className="p-3 text-sm text-right">${(item.rateCents / 100).toFixed(2)}</td>
                            <td className="p-3 text-sm text-right font-medium">
                              ${((item.quantity * item.rateCents) / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewInvoiceDialogOpen(false)}
              data-testid="button-close-view"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setViewInvoiceDialogOpen(false);
                handleGeneratePDF(selectedInvoice);
              }}
              data-testid="button-download-pdf-from-view"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Settings Tab Component
function SettingsTab() {
  const { user, isAuthenticated, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const orgId = (user as any)?.orgId;

  // Fetch organization settings
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: [`/api/orgs/${orgId}`],
    enabled: isAuthenticated && !!orgId,
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async (mode: "automatic" | "require_authorization" | "manual") => {
      return apiRequest("PATCH", `/api/orgs/${orgId}`, { billingWorkflowMode: mode });
    },
    onMutate: async (mode) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/orgs/${orgId}`] });
      
      // Snapshot the previous value
      const previousOrg = queryClient.getQueryData([`/api/orgs/${orgId}`]);
      
      // Optimistically update to the new value
      queryClient.setQueryData([`/api/orgs/${orgId}`], (old: any) => ({
        ...old,
        billingWorkflowMode: mode
      }));
      
      // Return context with the previous value
      return { previousOrg };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}`] });
      toast({
        title: "Settings updated",
        description: "Billing workflow mode has been updated successfully.",
      });
    },
    onError: (error: any, _mode, context) => {
      // Rollback to previous value on error
      if (context?.previousOrg) {
        queryClient.setQueryData([`/api/orgs/${orgId}`], context.previousOrg);
      }
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWorkflowChange = (mode: string) => {
    updateWorkflowMutation.mutate(mode as "automatic" | "require_authorization" | "manual");
  };

  if (userLoading || orgLoading) {
    return <div className="flex justify-center p-8">Loading settings...</div>;
  }

  if (!orgId) {
    return <div className="flex justify-center p-8">No organization found.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing Workflow Mode</CardTitle>
          <CardDescription>
            Configure how billing submissions are processed in your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="automatic"
                name="workflow"
                value="automatic"
                checked={org?.billingWorkflowMode === "automatic"}
                onChange={(e) => handleWorkflowChange(e.target.value)}
                className="mt-1"
                data-testid="radio-automatic"
              />
              <div>
                <label htmlFor="automatic" className="font-medium cursor-pointer">
                  Automatic
                </label>
                <p className="text-sm text-slate-500">
                  Billing submissions are automatically converted to invoices without requiring authorization. 
                  Ideal for streamlined workflows with high trust.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="require_authorization"
                name="workflow"
                value="require_authorization"
                checked={org?.billingWorkflowMode === "require_authorization"}
                onChange={(e) => handleWorkflowChange(e.target.value)}
                className="mt-1"
                data-testid="radio-require-authorization"
              />
              <div>
                <label htmlFor="require_authorization" className="font-medium cursor-pointer">
                  Require Authorization
                </label>
                <p className="text-sm text-slate-500">
                  Billing submissions require supervisor/admin approval before being converted to invoices. 
                  Provides oversight while maintaining efficiency.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="manual"
                name="workflow"
                value="manual"
                checked={org?.billingWorkflowMode === "manual"}
                onChange={(e) => handleWorkflowChange(e.target.value)}
                className="mt-1"
                data-testid="radio-manual"
              />
              <div>
                <label htmlFor="manual" className="font-medium cursor-pointer">
                  Manual
                </label>
                <p className="text-sm text-slate-500">
                  Billing submissions remain as submissions only. Invoices must be created manually. 
                  Maximum control for complex billing scenarios.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Current Mode</h4>
            <Badge variant="outline" className="text-base px-3 py-1">
              {org?.billingWorkflowMode === "automatic" ? "Automatic" :
               org?.billingWorkflowMode === "require_authorization" ? "Require Authorization" :
               "Manual"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
