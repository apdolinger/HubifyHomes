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
  Filter
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Billing({ embedded = false }: { embedded?: boolean }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch billing submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/billing-submissions", { status: statusFilter, clientId: clientFilter || undefined }],
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
                      <SelectItem value="">All Clients</SelectItem>
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
    </div>
  );
}

// Invoices Tab Component
function InvoicesTab() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [invoiceClientFilter, setInvoiceClientFilter] = useState<string>("");

  // Fetch all invoices
  const { data: allInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/billing/invoices"],
    enabled: isAuthenticated,
  });

  // Fetch clients for filtering
  const { data: clients } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
  });

  const filteredInvoices = (allInvoices as any[] || []).filter((invoice: any) => {
    if (invoiceStatusFilter !== "all" && invoice.status !== invoiceStatusFilter) return false;
    if (invoiceClientFilter && invoice.clientId !== invoiceClientFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
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
                  <SelectItem value="">All Clients</SelectItem>
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
                    <Button size="sm" variant="outline" data-testid={`button-view-invoice-${invoice.id}`}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {invoice.pdfStorageKey && (
                      <Button size="sm" variant="outline" data-testid={`button-download-invoice-${invoice.id}`}>
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
