import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import FormBuilder from "@/components/FormBuilder";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Link as RouterLink } from "wouter";
import { 
  Trash2, 
  FileText, 
  Calendar,
  Users,
  Code,
  Link,
  Pencil,
  Eye,
  Download,
  Printer
} from "lucide-react";

interface FormSubmissionsViewerProps {
  formId: number;
  formTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

function FormSubmissionsViewer({ formId, formTitle, isOpen, onClose }: FormSubmissionsViewerProps) {
  const { toast } = useToast();
  
  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: ["/api/forms", formId, "submissions"],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${formId}/submissions`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
    enabled: isOpen,
  });

  // Show error toast if there's an error
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load form submissions. Please try again.",
      variant: "destructive",
    });
  }

  const formatFieldValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-400">—</span>;
    }
    
    if (fieldType === 'checkbox') {
      return value ? <Badge variant="secondary">Yes</Badge> : <Badge variant="outline">No</Badge>;
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((v, i) => (
            <Badge key={i} variant="outline">{v}</Badge>
          ))}
        </div>
      );
    }
    
    if (fieldType === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    
    return String(value);
  };

  const exportToCSV = () => {
    if (submissions.length === 0) return;
    
    const fields = submissions[0]?.fields || [];
    const headers = ['Submission Date', ...fields.map((f: any) => f.label)];
    
    const rows = submissions.map((sub: any) => {
      const fieldValues = fields.map((field: any) => {
        const value = sub.data?.[`field-${field.id}`] || '';
        if (Array.isArray(value)) return value.join('; ');
        return value;
      });
      return [new Date(sub.submittedAt).toLocaleString(), ...fieldValues];
    });
    
    const csv = [headers, ...rows].map(row => 
      row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle.replace(/[^a-z0-9]/gi, '_')}_submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (submissions.length === 0) return;
    
    const fields = submissions[0]?.fields || [];
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Blocked",
        description: "Please allow pop-ups to print",
        variant: "destructive",
      });
      return;
    }
    
    const escapeHtml = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    const getPlainTextValue = (value: any, fieldType: string): string => {
      if (value === null || value === undefined || value === '') return '—';
      if (fieldType === 'checkbox') return value ? 'Yes' : 'No';
      if (Array.isArray(value)) return value.join(', ');
      if (fieldType === 'date' && value) return new Date(value).toLocaleDateString();
      return String(value);
    };
    
    const submissionsHTML = submissions.map((submission: any, index: number) => {
      const fieldsHTML = fields.map((field: any) => {
        const fieldId = `field-${field.id}`;
        const value = submission.data?.[fieldId];
        const plainTextValue = getPlainTextValue(value, field.type);
        return `
          <tr>
            <td class="field-label">${escapeHtml(field.label)}</td>
            <td class="field-value">${escapeHtml(plainTextValue)}</td>
          </tr>
        `;
      }).join('');
      
      return `
        <div class="submission">
          <div class="submission-header">
            <strong>Submission ${index + 1}</strong>
            <span>${escapeHtml(new Date(submission.submittedAt).toLocaleString())}</span>
          </div>
          <table class="fields-table">
            ${fieldsHTML}
          </table>
        </div>
      `;
    }).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(formTitle)} - Submissions</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              .submission { page-break-inside: avoid; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #1e293b;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 8px;
              color: #0f172a;
            }
            .subtitle {
              color: #64748b;
              margin-bottom: 30px;
              font-size: 14px;
            }
            .submission {
              margin-bottom: 30px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              page-break-inside: avoid;
            }
            .submission-header {
              background: #f8fafc;
              padding: 12px 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #e2e8f0;
            }
            .submission-header strong {
              color: #0f172a;
            }
            .submission-header span {
              color: #64748b;
              font-size: 14px;
            }
            .fields-table {
              width: 100%;
              border-collapse: collapse;
            }
            .fields-table tr {
              border-bottom: 1px solid #f1f5f9;
            }
            .fields-table tr:last-child {
              border-bottom: none;
            }
            .field-label {
              font-weight: 600;
              padding: 12px 16px;
              width: 35%;
              color: #475569;
              vertical-align: top;
              font-size: 14px;
            }
            .field-value {
              padding: 12px 16px;
              color: #1e293b;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(formTitle)}</h1>
          <div class="subtitle">${submissions.length} submission${submissions.length !== 1 ? 's' : ''}</div>
          ${submissionsHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{formTitle} - Submissions</DialogTitle>
              <DialogDescription>
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
            {submissions.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handlePrint}
                  size="sm"
                  variant="outline"
                  data-testid="button-print-submissions"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button
                  onClick={exportToCSV}
                  size="sm"
                  variant="outline"
                  data-testid="button-export-csv"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission: any) => {
                const fields = submission.fields || [];
                return (
                  <Card key={submission.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(submission.submittedAt).toLocaleString()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fields.map((field: any) => {
                          const fieldId = `field-${field.id}`;
                          const value = submission.data?.[fieldId];
                          return (
                            <div key={field.id} className="space-y-1">
                              <div className="text-sm font-medium text-slate-700">{field.label}</div>
                              <div className="text-sm text-slate-900">
                                {formatFieldValue(value, field.type)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminForms() {
  const { toast } = useToast();
  const [viewingSubmissions, setViewingSubmissions] = useState<{ formId: number; formTitle: string } | null>(null);

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["/api/forms"],
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      return apiRequest("DELETE", `/api/forms/${formId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Form Deleted",
        description: "The form has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete form",
        variant: "destructive",
      });
    },
  });

  const copyEmbedCode = (formKey: string) => {
    const embedCode = `<iframe
  src="${window.location.origin}/forms/${formKey}/embed"
  width="100%"
  height="600"
  frameborder="0"
></iframe>`;
    
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard",
    });
  };

  const copyPublicLink = (slug: string) => {
    if (!slug) {
      toast({
        title: "No Public Link",
        description: "This form doesn't have a public URL yet.",
        variant: "destructive",
      });
      return;
    }
    const publicUrl = `${window.location.origin}/forms/${slug}`;
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Link Copied",
      description: "Public form link copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Forms Management</h1>
        <p className="text-slate-600 mt-2">Create and manage forms for data collection</p>
      </div>

      {/* Form Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Form</CardTitle>
        </CardHeader>
        <CardContent>
          <FormBuilder />
        </CardContent>
      </Card>

      {/* Existing Forms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Your Forms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(forms as any[]).length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
              <p className="text-gray-500">Create your first form above to start collecting data</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Embed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(forms as any[]).map((form: any) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <RouterLink href={`/admin/forms/${form.id}`}>
                          <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline" data-testid={`form-title-${form.id}`}>
                            {form.formTitle || form.form_title || 'Untitled Form'}
                          </div>
                        </RouterLink>
                        {(form.settings?.internalDescription || form.description) && (
                          <div className="text-sm text-gray-500">{form.settings?.internalDescription || form.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(form.isActive !== false) ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700" data-testid={`status-badge-${form.id}`}>
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700" data-testid={`status-badge-${form.id}`}>
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(form.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {form.submissionCount || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {form.embedEnabled ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setViewingSubmissions({ formId: form.id, formTitle: form.formTitle || form.form_title || 'Untitled Form' })}
                          data-testid={`view-submissions-btn-${form.id}`}
                          title="View submissions"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <RouterLink href={`/admin/forms/${form.id}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`edit-form-btn-${form.id}`}
                            title="Edit form"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </RouterLink>
                        {form.slug && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyPublicLink(form.slug)}
                            data-testid="copy-link-btn"
                            title="Copy public link"
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyEmbedCode(form.formKey)}
                          data-testid="copy-embed-btn"
                          title="Copy embed code"
                        >
                          <Code className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteFormMutation.mutate(form.id)}
                          data-testid="delete-form-btn"
                          title="Delete form"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Submissions Viewer Dialog */}
      {viewingSubmissions && (
        <FormSubmissionsViewer
          formId={viewingSubmissions.formId}
          formTitle={viewingSubmissions.formTitle}
          isOpen={!!viewingSubmissions}
          onClose={() => setViewingSubmissions(null)}
        />
      )}
    </div>
  );
}
