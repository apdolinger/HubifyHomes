import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, Download, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";

type ClientInvoice = {
  id: string;
  orgId: string;
  clientId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  description?: string;
  dueDate?: string;
  pdfStorageKey?: string;
  createdAt: string;
};

export default function OrgClientInvoices() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const orgId = (user as any)?.orgId;

  const [formData, setFormData] = useState({
    clientId: "",
    invoiceNumber: "",
    amount: "",
    currency: "USD",
    status: "draft" as const,
    description: "",
    dueDate: "",
  });

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/people'],
    enabled: isAuthenticated && !!orgId,
  });

  const { data: customFields = [] } = useQuery<any[]>({
    queryKey: ["/api/custom-fields", "invoice"],
    enabled: isAuthenticated && !!orgId,
  });

  const { data: allInvoices = [], isLoading } = useQuery<ClientInvoice[]>({
    queryKey: ['/api/orgs', orgId, 'client-invoices'],
    enabled: isAuthenticated && !!orgId,
  });

  const invoices = allInvoices.filter(inv => 
    filterStatus === "all" || inv.status === filterStatus
  );

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", `/api/orgs/${orgId}/clients/${data.clientId}/invoices`, {
        ...data,
        amount: parseFloat(data.amount),
        customFieldValues,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orgs', orgId, 'client-invoices'] });
      setIsCreateDialogOpen(false);
      setFormData({
        clientId: "",
        invoiceNumber: "",
        amount: "",
        currency: "USD",
        status: "draft",
        description: "",
        dueDate: "",
      });
      setCustomFieldValues({});
      toast({
        title: "Invoice Created",
        description: "The client invoice has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ invoiceId, file }: { invoiceId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/orgs/${orgId}/client-invoices/${invoiceId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orgs', orgId, 'client-invoices'] });
      setUploadDialogOpen(false);
      setUploadFile(null);
      setSelectedInvoiceId("");
      toast({
        title: "File Uploaded",
        description: "The invoice file has been uploaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (invoiceId: string) => {
    try {
      const response = await apiRequest("GET", `/api/orgs/${orgId}/client-invoices/${invoiceId}/download`);
      const data = await response.json();
      window.open(data.downloadUrl, '_blank');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvoiceMutation.mutate(formData);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedInvoiceId) return;
    uploadFileMutation.mutate({ invoiceId: selectedInvoiceId, file: uploadFile });
  };

  if (!isAuthenticated || !orgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need to be part of an organization to view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "default",
      paid: "outline",
      overdue: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Client Invoices
              </CardTitle>
              <CardDescription>Manage invoices for your clients</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-invoice">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const client = clients.find((c: any) => c.id === invoice.clientId);
                  return (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {client?.name || invoice.clientId}
                        </div>
                      </TableCell>
                      <TableCell>{invoice.amount.toFixed(2)} {invoice.currency}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell>{format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!invoice.pdfStorageKey ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id);
                                setUploadDialogOpen(true);
                              }}
                              data-testid={`button-upload-${invoice.id}`}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(invoice.id)}
                              data-testid={`button-download-${invoice.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
        <DialogContent data-testid="dialog-create-invoice">
          <DialogHeader>
            <DialogTitle>Create Client Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice for a client
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="clientId">Client</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                  required
                >
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="INV-2024-001"
                  required
                  data-testid="input-invoice-number"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="99.99"
                    required
                    data-testid="input-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  data-testid="input-due-date"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Invoice details..."
                  data-testid="textarea-description"
                />
              </div>

              {customFields.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Custom Fields</h4>
                  <CustomFieldsRenderer
                    fields={customFields}
                    values={customFieldValues}
                    onChange={setCustomFieldValues}
                    mode="edit"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoiceMutation.isPending} data-testid="button-submit-invoice">
                {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent data-testid="dialog-upload-file">
          <DialogHeader>
            <DialogTitle>Upload Invoice File</DialogTitle>
            <DialogDescription>
              Upload a PDF or image file for this invoice
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  data-testid="input-file"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Accepted formats: PDF, PNG, JPEG (max 25MB)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadFileMutation.isPending || !uploadFile} data-testid="button-submit-upload">
                {uploadFileMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
