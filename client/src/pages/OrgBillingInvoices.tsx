import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, DollarSign, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";

type PlatformInvoice = {
  id: string;
  orgId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  description?: string;
  dueDate?: string;
  pdfStorageKey?: string;
  stripeInvoiceId?: string;
  createdAt: string;
};

export default function OrgBillingInvoices() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const orgId = (user as any)?.orgId;

  const { data: allInvoices = [], isLoading } = useQuery<PlatformInvoice[]>({
    queryKey: ['/api/orgs', orgId, 'platform-invoices'],
    enabled: isAuthenticated && !!orgId,
  });

  const invoices = allInvoices.filter(inv => 
    filterStatus === "all" || inv.status === filterStatus
  );

  const handleDownload = async (invoiceId: string) => {
    try {
      const response = await apiRequest("GET", `/api/orgs/${orgId}/platform-invoices/${invoiceId}/download`);
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
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/billing">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Hubify Invoices
            </CardTitle>
            <CardDescription>View and download invoices from Hubify</CardDescription>
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {invoice.amount.toFixed(2)} {invoice.currency}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>{format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {invoice.pdfStorageKey && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(invoice.id)}
                          data-testid={`button-download-${invoice.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
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
    </div>
  );
}
