import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
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
  Settings,
  Edit,
  Plus,
  Trash2,
  Upload,
  X as XIcon
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Billing({ embedded = false }: { embedded?: boolean }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editSubmissionId, setEditSubmissionId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [submissionToReject, setSubmissionToReject] = useState<any>(null);

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

  // Fetch organization settings
  const { data: orgSettings } = useQuery({
    queryKey: ["/api/orgs/current"],
    enabled: isAuthenticated,
  });

  // Parse URL query parameters to auto-open submission detail
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const submissionId = searchParams.get('submissionId');
    
    if (submissionId && submissions && submissions.length > 0) {
      const submission = (submissions as any[]).find((s: any) => s.id === submissionId);
      
      if (submission) {
        setEditSubmissionId(submissionId);
        setEditDialogOpen(true);
        
        // Clear the submissionId from URL after opening
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('submissionId');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [submissions]);

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
      setSubmissionToReject(null);
      setRejectDialogOpen(false);
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

  // Batch authorize and send mutation (for consolidated invoices)
  const [batchAuthorizeDialog, setBatchAuthorizeDialog] = useState(false);
  const [batchClient, setBatchClient] = useState<any>(null);
  const [batchSubmissions, setBatchSubmissions] = useState<any[]>([]);
  const [batchEmail, setBatchEmail] = useState("");
  const [batchMessage, setBatchMessage] = useState("");

  const batchAuthorizeAndSendMutation = useMutation({
    mutationFn: async ({ submissionIds, recipientEmail, message }: { submissionIds: string[]; recipientEmail: string; message?: string }) => {
      return apiRequest("POST", `/api/billing-submissions/batch-authorize-and-send`, { submissionIds, recipientEmail, message });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-submissions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orgs`] });
      const count = batchSubmissions.length;
      toast({
        title: "Consolidated Invoice Created!",
        description: `${count} submission${count > 1 ? 's' : ''} consolidated into one invoice and sent to ${batchEmail}.`,
      });
      setBatchAuthorizeDialog(false);
      setBatchClient(null);
      setBatchSubmissions([]);
      setBatchEmail("");
      setBatchMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBatchAuthorizeAndSend = () => {
    if (!batchEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please provide a recipient email address.",
        variant: "destructive",
      });
      return;
    }
    if (!batchSubmissions || batchSubmissions.length === 0) {
      toast({
        title: "No submissions",
        description: "No submissions selected for batching.",
        variant: "destructive",
      });
      return;
    }
    batchAuthorizeAndSendMutation.mutate({
      submissionIds: batchSubmissions.map(s => s.id),
      recipientEmail: batchEmail,
      message: batchMessage
    });
  };

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
    if (!submissionToReject) return;
    rejectMutation.mutate({ submissionId: submissionToReject.id, reason: rejectionReason });
  };

  const filteredSubmissions = (submissions as any[] || []).filter((submission: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      submission.description?.toLowerCase().includes(searchLower) ||
      submission.sourceType?.toLowerCase().includes(searchLower)
    );
  });

  // Group pending submissions by client OR property based on org settings
  const pendingGroupedByClient = useMemo(() => {
    const pending = filteredSubmissions.filter((s: any) => s.status === "pending");
    const groupingStrategy = (orgSettings as any)?.invoiceGroupingStrategy || "client";
    
    const grouped = new Map<string, { 
      client: any; 
      property?: any;
      submissions: any[]; 
      totalCents: number;
      groupKey: string;
    }>();
    
    pending.forEach((submission: any) => {
      // Group by client or property based on org settings
      const groupKey = groupingStrategy === "property" 
        ? submission.propertyId 
        : submission.clientId;
      
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          client: submission.client,
          property: submission.property,
          submissions: [],
          totalCents: 0,
          groupKey,
        });
      }
      const group = grouped.get(groupKey)!;
      group.submissions.push(submission);
      group.totalCents += submission.amountCents;
    });
    
    return Array.from(grouped.values()).sort((a, b) => {
      if (groupingStrategy === "property") {
        return (a.property?.name || "").localeCompare(b.property?.name || "");
      }
      return `${a.client?.firstName} ${a.client?.lastName}`.localeCompare(`${b.client?.firstName} ${b.client?.lastName}`);
    });
  }, [filteredSubmissions, orgSettings]);

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

          {/* Pending Submissions Grouped by Client or Property */}
          {statusFilter === "pending" ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Pending Billing Submissions - Grouped by {(orgSettings as any)?.invoiceGroupingStrategy === "property" ? "Property" : "Client"}
                </CardTitle>
                <CardDescription>
                  Review submissions grouped by {(orgSettings as any)?.invoiceGroupingStrategy === "property" ? "property" : "client"}. Create consolidated invoices for multiple submissions at once.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <p className="text-center text-slate-500 py-8">Loading submissions...</p>
                ) : pendingGroupedByClient.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-medium mb-2">No pending submissions</h3>
                    <p className="text-slate-500">No pending billing submissions found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingGroupedByClient.map((group, idx) => {
                      const isPropertyGrouping = (orgSettings as any)?.invoiceGroupingStrategy === "property";
                      const displayName = isPropertyGrouping 
                        ? (group.property?.name || "Unknown Property")
                        : (group.client?.firstName && group.client?.lastName 
                            ? `${group.client.firstName} ${group.client.lastName}` 
                            : "Unknown Client");
                      const initials = isPropertyGrouping
                        ? (group.property?.name?.substring(0, 2)?.toUpperCase() || "??")
                        : ((group.client?.firstName?.[0] || "?") + (group.client?.lastName?.[0] || "?"));
                      
                      return (
                        <div key={group.groupKey || idx} className="border rounded-lg p-4 bg-slate-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                {initials}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {displayName}
                                </h3>
                                {isPropertyGrouping && group.client && group.client.firstName && group.client.lastName && (
                                  <p className="text-xs text-slate-400">
                                    Client: {group.client.firstName} {group.client.lastName}
                                  </p>
                                )}
                                <p className="text-sm text-slate-500">
                                  {group.submissions.length} submission{group.submissions.length > 1 ? 's' : ''} • 
                                  Total: <span className="font-medium text-slate-700">${(group.totalCents / 100).toFixed(2)}</span>
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="default"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => {
                                setBatchClient(group.client);
                                setBatchSubmissions(group.submissions);
                                setBatchEmail(group.client?.email || '');
                                setBatchAuthorizeDialog(true);
                              }}
                              data-testid={`button-create-invoice-${group.groupKey}`}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Create Invoice Now
                            </Button>
                          </div>
                        
                        <div className="space-y-2">
                          {group.submissions.map((submission: any) => (
                            <div
                              key={submission.id}
                              className="flex items-center justify-between p-3 bg-white rounded border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                              onClick={() => {
                                setEditSubmissionId(submission.id);
                                setEditDialogOpen(true);
                              }}
                              data-testid={`submission-${submission.id}`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm">{submission.description}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {submission.sourceType}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                  <span>${(submission.amountCents / 100).toFixed(2)}</span>
                                  {submission.quantity > 1 && <span>Qty: {submission.quantity}</span>}
                                  <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditSubmissionId(submission.id);
                                  setEditDialogOpen(true);
                                }}
                                data-testid={`button-edit-details-${submission.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // Original table view for non-pending statuses
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
                        onClick={() => {
                          setEditSubmissionId(submission.id);
                          setEditDialogOpen(true);
                        }}
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <InvoicesTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>

      {/* Reject Submission Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent data-testid="dialog-reject-submission">
          <DialogHeader>
            <DialogTitle>Reject Billing Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this billing submission
            </DialogDescription>
          </DialogHeader>
          {submissionToReject && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Submission</label>
                <p className="text-sm text-slate-700">{submissionToReject.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm text-slate-700">${(submissionToReject.amountCents / 100).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Client</label>
                  <p className="text-sm text-slate-700">{submissionToReject.client?.firstName} {submissionToReject.client?.lastName}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Rejection Reason</label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  data-testid="textarea-rejection-reason"
                />
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRejectDialogOpen(false);
                    setRejectionReason("");
                  }}
                  data-testid="button-cancel-reject"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  {rejectMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Submission
                    </>
                  )}
                </Button>
              </DialogFooter>
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

      {/* Batch Authorize & Send Dialog */}
      <Dialog open={batchAuthorizeDialog} onOpenChange={setBatchAuthorizeDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-batch-authorize-send">
          <DialogHeader>
            <DialogTitle>Create Consolidated Invoice</DialogTitle>
            <DialogDescription>
              This will combine all {batchSubmissions.length} submissions into a single invoice and send it to the client.
            </DialogDescription>
          </DialogHeader>
          {batchClient && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Client: {batchClient.firstName} {batchClient.lastName}</h4>
                <p className="text-sm text-slate-600 mb-3">
                  {batchSubmissions.length} submission{batchSubmissions.length > 1 ? 's' : ''} will be consolidated into one invoice
                </p>
                <div className="space-y-1">
                  {batchSubmissions.map((sub: any) => (
                    <div key={sub.id} className="flex justify-between text-sm">
                      <span className="text-slate-700">{sub.description}</span>
                      <span className="font-medium">${(sub.amountCents / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-semibold pt-2 border-t border-blue-300">
                    <span>Total:</span>
                    <span>${(batchSubmissions.reduce((sum: number, s: any) => sum + s.amountCents, 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Recipient Email *</label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={batchEmail}
                  onChange={(e) => setBatchEmail(e.target.value)}
                  data-testid="input-batch-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message (optional)</label>
                <Textarea
                  placeholder="Add a custom message to include in the email..."
                  value={batchMessage}
                  onChange={(e) => setBatchMessage(e.target.value)}
                  rows={3}
                  data-testid="textarea-batch-message"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchAuthorizeDialog(false)}
              data-testid="button-cancel-batch-authorize"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchAuthorizeAndSend}
              disabled={batchAuthorizeAndSendMutation.isPending}
              data-testid="button-confirm-batch-authorize"
            >
              {batchAuthorizeAndSendMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating Invoice...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Create & Send Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission Detail Dialog */}
      <SubmissionDetailDialog
        submissionId={editSubmissionId}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
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

  const updateGroupingStrategyMutation = useMutation({
    mutationFn: async (strategy: "client" | "property") => {
      return apiRequest("PATCH", `/api/orgs/${orgId}`, { invoiceGroupingStrategy: strategy });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orgs/current"] });
      toast({
        title: "Settings updated",
        description: "Invoice grouping strategy has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGroupingStrategyChange = (strategy: string) => {
    updateGroupingStrategyMutation.mutate(strategy as "client" | "property");
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

      <Card>
        <CardHeader>
          <CardTitle>Invoice Grouping Strategy</CardTitle>
          <CardDescription>
            Choose how to group pending billing submissions for consolidated invoicing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="groupByClient"
                name="grouping"
                value="client"
                checked={org?.invoiceGroupingStrategy === "client"}
                onChange={(e) => handleGroupingStrategyChange(e.target.value)}
                className="mt-1"
                data-testid="radio-group-by-client"
              />
              <div>
                <label htmlFor="groupByClient" className="font-medium cursor-pointer">
                  Group by Client
                </label>
                <p className="text-sm text-slate-500">
                  All pending submissions for a client are grouped together into one consolidated invoice, 
                  regardless of which property they're for. Best for clients with multiple properties.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="groupByProperty"
                name="grouping"
                value="property"
                checked={org?.invoiceGroupingStrategy === "property"}
                onChange={(e) => handleGroupingStrategyChange(e.target.value)}
                className="mt-1"
                data-testid="radio-group-by-property"
              />
              <div>
                <label htmlFor="groupByProperty" className="font-medium cursor-pointer">
                  Group by Property
                </label>
                <p className="text-sm text-slate-500">
                  Submissions are grouped by property, creating separate invoices for each property. 
                  Best for billing each property individually.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Current Strategy</h4>
            <Badge variant="outline" className="text-base px-3 py-1">
              {org?.invoiceGroupingStrategy === "property" ? "Group by Property" : "Group by Client"}
            </Badge>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// Submission Detail Dialog - Itemized Receipt Editor
function SubmissionDetailDialog({
  submissionId,
  open,
  onOpenChange
}: {
  submissionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch submission details
  const { data: submission, isLoading } = useQuery({
    queryKey: [`/api/billing-submissions/${submissionId}`],
    enabled: !!submissionId && open,
  });

  // Photo attachments state
  const [photoAttachments, setPhotoAttachments] = useState<Array<{url: string, filename: string}>>([]);
  const [isDragOverPhotos, setIsDragOverPhotos] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  // Form schema
  const lineItemSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Description required"),
    quantity: z.number().min(0.01, "Quantity must be positive"),
    rate: z.number().min(0, "Rate must be non-negative"),
    amount: z.number(),
    type: z.enum(["task", "time_entry", "material", "other"]),
  });

  const formSchema = z.object({
    description: z.string().min(1, "Description required"),
    notes: z.string().optional(),
    lineItems: z.array(lineItemSchema),
  });

  type FormData = z.infer<typeof formSchema>;

  // Initialize form with default values
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      notes: "",
      lineItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Update form when submission loads
  useMemo(() => {
    if (submission) {
      form.reset({
        description: submission.description || "",
        notes: submission.notes || "",
        lineItems: (submission.lineItems || []).map((item: any) => ({
          ...item,
          rate: item.rateCents / 100,
          amount: item.amountCents / 100,
        })),
      });
      // Initialize photo attachments from submission
      setPhotoAttachments(submission.attachments || []);
    }
  }, [submission, form]);

  // Watch line items using useWatch for proper subscription
  const lineItems = useWatch({
    control: form.control,
    name: "lineItems",
    defaultValue: [],
  }) || [];
  
  // Calculate totals (recalculates when lineItems changes)
  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totals = {
    subtotal,
    tax: 0,
    total: subtotal,
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("PATCH", `/api/billing-submissions/${submissionId}`, {
        description: data.description,
        notes: data.notes,
        lineItems: data.lineItems.map(item => ({
          ...item,
          rateCents: Math.round(item.rate * 100),
          amountCents: Math.round(item.amount * 100),
        })),
        amountCents: Math.round(totals.total * 100),
        attachments: photoAttachments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-submissions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/billing-submissions/${submissionId}`] });
      toast({
        title: "Submission updated",
        description: "Billing submission has been saved successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update submission",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  // Calculate line item amount when quantity or rate changes
  const updateLineItemAmount = (index: number) => {
    const item = form.getValues(`lineItems.${index}`);
    const amount = item.quantity * item.rate;
    form.setValue(`lineItems.${index}.amount`, amount);
  };

  // Photo attachment handlers
  const handlePhotoUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Allow image files only
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        return false;
      }
      
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    setIsPhotoUploading(true);

    try {
      const uploadedPhotos: Array<{url: string, filename: string}> = [];

      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('directory', '.private/submission-attachments');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const uploadData = await uploadResponse.json();
        if (uploadData.urls && uploadData.urls.length > 0) {
          uploadedPhotos.push({
            url: uploadData.urls[0],
            filename: file.name
          });
        }
      }

      if (uploadedPhotos.length > 0) {
        setPhotoAttachments(prev => [...prev, ...uploadedPhotos]);
        toast({
          title: "Photos Uploaded",
          description: `${uploadedPhotos.length} photo(s) uploaded successfully.`,
        });
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPhotos(true);
  };

  const handlePhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPhotos(false);
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPhotos(false);

    if (e.dataTransfer.files) {
      handlePhotoUpload(e.dataTransfer.files);
    }
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handlePhotoUpload(e.target.files);
      e.target.value = ''; // Clear input
    }
  };

  const removePhotoAttachment = (index: number) => {
    setPhotoAttachments(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Photo Removed",
      description: "Attachment has been removed",
    });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center p-8">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Billing Submission</DialogTitle>
          <DialogDescription>
            Modify submission details and line items. Total will be recalculated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <Input
                  {...field}
                  id="description"
                  placeholder="Enter description"
                  data-testid="input-description"
                />
              )}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Controller
              control={form.control}
              name="notes"
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="notes"
                  placeholder="Additional notes or details"
                  rows={3}
                  data-testid="textarea-notes"
                />
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({
                  id: `new-${Date.now()}`,
                  description: "",
                  quantity: 1,
                  rate: 0,
                  amount: 0,
                  type: "other",
                })}
                data-testid="button-add-line-item"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Line Item
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead className="w-[15%]">Qty</TableHead>
                    <TableHead className="w-[20%]">Rate</TableHead>
                    <TableHead className="w-[20%]">Amount</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Controller
                          control={form.control}
                          name={`lineItems.${index}.description`}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Item description"
                              className="h-8"
                              data-testid={`input-line-item-desc-${index}`}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          control={form.control}
                          name={`lineItems.${index}.quantity`}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0.01"
                              className="h-8"
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                updateLineItemAmount(index);
                              }}
                              data-testid={`input-line-item-qty-${index}`}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          control={form.control}
                          name={`lineItems.${index}.rate`}
                          render={({ field }) => (
                            <div className="flex items-center">
                              <span className="text-slate-500 mr-1">$</span>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-8"
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0);
                                  updateLineItemAmount(index);
                                }}
                                data-testid={`input-line-item-rate-${index}`}
                              />
                            </div>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ${form.watch(`lineItems.${index}.amount`)?.toFixed(2) || "0.00"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          data-testid={`button-remove-line-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {fields.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        No line items. Click "Add Line Item" to add one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Photos & Attachments Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Photos & Attachments</Label>
            
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOverPhotos
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragOver={handlePhotoDragOver}
              onDragLeave={handlePhotoDragLeave}
              onDrop={handlePhotoDrop}
              data-testid="dropzone-photos"
            >
              {isPhotoUploading ? (
                <div className="flex flex-col items-center py-4">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <p className="text-sm text-slate-600">Uploading photos...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-2">
                    Drag and drop photos here, or click to browse
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Supports JPG, PNG, GIF up to 10MB
                  </p>
                  <label>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={isPhotoUploading}
                      data-testid="button-upload-photo"
                      asChild
                    >
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Photos
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoInputChange}
                      className="hidden"
                      disabled={isPhotoUploading}
                      data-testid="input-photo-upload"
                    />
                  </label>
                </>
              )}
            </div>

            {/* Display Uploaded Photos */}
            {photoAttachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photoAttachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-slate-300 transition-colors"
                    data-testid={`photo-attachment-${index}`}
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-end">
                      <div className="w-full p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate mb-1">{attachment.filename}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="w-full h-7 text-xs"
                          onClick={() => removePhotoAttachment(index)}
                          data-testid={`button-remove-photo-${index}`}
                        >
                          <XIcon className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {photoAttachments.length === 0 && !isPhotoUploading && (
              <p className="text-sm text-slate-500 text-center py-4">
                No photos attached yet
              </p>
            )}
          </div>

          {/* Totals Section */}
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span className="font-medium">${totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total:</span>
                  <span data-testid="text-total">${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
