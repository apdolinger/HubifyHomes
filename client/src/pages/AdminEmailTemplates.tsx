import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { OrgEmailTemplate } from "@shared/schema";
import { insertOrgEmailTemplateSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Eye, MoreVertical, ArrowUpDown, Mail } from "lucide-react";

const MERGE_FIELDS = [
  { label: "First Name", value: "{{firstName}}" },
  { label: "Last Name", value: "{{lastName}}" },
  { label: "Full Name", value: "{{fullName}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Phone", value: "{{phone}}" },
  { label: "Property Name", value: "{{propertyName}}" },
  { label: "Property Address", value: "{{propertyAddress}}" },
  { label: "Property City", value: "{{propertyCity}}" },
  { label: "Sender Name", value: "{{senderName}}" },
  { label: "Sender Email", value: "{{senderEmail}}" },
  { label: "Organization Name", value: "{{organizationName}}" },
];

const templateFormSchema = insertOrgEmailTemplateSchema.omit({
  orgId: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export default function AdminEmailTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "createdAt">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OrgEmailTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<OrgEmailTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<OrgEmailTemplate | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<OrgEmailTemplate[]>({
    queryKey: ['/api/email-templates'],
  });

  // Form
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
      description: "",
      isActive: true,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return apiRequest("POST", "/api/email-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({
        title: "Template created",
        description: "Email template has been created successfully.",
      });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create template",
        description: error.message || "An error occurred while creating the template.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TemplateFormData> }) => {
      return apiRequest("PATCH", `/api/email-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({
        title: "Template updated",
        description: "Email template has been updated successfully.",
      });
      setEditingTemplate(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update template",
        description: error.message || "An error occurred while updating the template.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/email-templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({
        title: "Template deleted",
        description: "Email template has been deleted successfully.",
      });
      setDeletingTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete template",
        description: error.message || "An error occurred while deleting the template.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreate = () => {
    form.reset({
      name: "",
      subject: "",
      body: "",
      description: "",
      isActive: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (template: OrgEmailTemplate) => {
    form.reset({
      name: template.name,
      subject: template.subject,
      body: template.body,
      description: template.description || "",
      isActive: template.isActive,
    });
    setEditingTemplate(template);
  };

  const handleSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (template: OrgEmailTemplate) => {
    setDeletingTemplate(template);
  };

  const confirmDelete = () => {
    if (deletingTemplate) {
      deleteMutation.mutate(deletingTemplate.id);
    }
  };

  const insertMergeField = (field: string) => {
    const currentBody = form.getValues("body");
    form.setValue("body", currentBody + field);
  };

  const toggleSort = (field: "name" | "createdAt") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort templates
  const filteredTemplates = templates
    .filter((template) => {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.subject.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aVal = sortField === "name" ? a.name : new Date(a.createdAt).getTime();
      const bVal = sortField === "name" ? b.name : new Date(b.createdAt).getTime();
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === "asc" 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-8 h-8" />
            Email Templates
          </h1>
          <p className="text-slate-600 mt-2">
            Create and manage reusable email templates for client communication
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Templates</CardTitle>
                <CardDescription>
                  Manage organization email templates with merge fields
                </CardDescription>
              </div>
              <Button onClick={handleCreate} data-testid="button-create-template">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search templates by name or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-templates"
                />
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="text-center py-12 text-slate-500">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {searchQuery ? "No templates match your search." : "No templates yet. Create your first template to get started."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          onClick={() => toggleSort("name")}
                          className="flex items-center gap-1 hover:text-slate-900"
                          data-testid="button-sort-name"
                        >
                          Name
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <button
                          onClick={() => toggleSort("createdAt")}
                          className="flex items-center gap-1 hover:text-slate-900"
                          data-testid="button-sort-created"
                        >
                          Created
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                        <TableCell className="font-medium" data-testid={`text-name-${template.id}`}>
                          {template.name}
                        </TableCell>
                        <TableCell className="max-w-xs text-slate-600 text-sm" data-testid={`text-description-${template.id}`}>
                          {template.description ? truncateText(template.description, 80) : <span className="text-slate-400 italic">No description</span>}
                        </TableCell>
                        <TableCell className="max-w-md" data-testid={`text-subject-${template.id}`}>
                          {truncateText(template.subject, 100)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={template.isActive ? "default" : "secondary"}
                            className={template.isActive ? "bg-green-500" : "bg-gray-400"}
                            data-testid={`badge-status-${template.id}`}
                          >
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-created-${template.id}`}>
                          {format(new Date(template.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-actions-${template.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setViewingTemplate(template)}
                                data-testid={`button-view-${template.id}`}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(template)}
                                data-testid={`button-edit-${template.id}`}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(template)}
                                className="text-red-600"
                                data-testid={`button-delete-${template.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setEditingTemplate(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? "Update the email template details below."
                : "Create a new email template with merge fields for personalization."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Welcome Email"
                        {...field}
                        data-testid="input-template-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Internal note to describe the purpose of this template (e.g. 'Sent to new clients after onboarding')"
                        rows={2}
                        {...field}
                        data-testid="textarea-template-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Welcome to {{organizationName}}"
                        {...field}
                        data-testid="input-template-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body *</FormLabel>
                    <div className="mb-2">
                      <p className="text-sm text-slate-600 mb-2">
                        Available merge fields (click to insert):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MERGE_FIELDS.map((mergeField) => (
                          <Button
                            key={mergeField.value}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertMergeField(mergeField.value)}
                            data-testid={`button-insert-${mergeField.value.replace(/[{}]/g, '')}`}
                          >
                            {mergeField.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your email body here. Use merge fields like {{firstName}} for personalization."
                        rows={12}
                        {...field}
                        data-testid="textarea-template-body"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <div className="text-sm text-slate-600">
                        Enable this template for use in email composition
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-template-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingTemplate(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingTemplate
                    ? "Update Template"
                    : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setViewingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-view-modal-title">
              {viewingTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Template preview
            </DialogDescription>
          </DialogHeader>

          {viewingTemplate && (
            <div className="space-y-4">
              {viewingTemplate.description && (
                <div>
                  <Label className="text-sm font-medium text-slate-700">Description</Label>
                  <p className="mt-1 text-sm text-slate-600" data-testid="text-view-description">
                    {viewingTemplate.description}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-slate-700">Subject</Label>
                <p className="mt-1 text-sm text-slate-900" data-testid="text-view-subject">
                  {viewingTemplate.subject}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Body</Label>
                <div className="mt-1 p-4 bg-slate-50 rounded-md border">
                  <pre className="whitespace-pre-wrap text-sm text-slate-900 font-sans" data-testid="text-view-body">
                    {viewingTemplate.body}
                  </pre>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={viewingTemplate.isActive ? "default" : "secondary"}
                    className={viewingTemplate.isActive ? "bg-green-500" : "bg-gray-400"}
                    data-testid="badge-view-status"
                  >
                    {viewingTemplate.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Created</Label>
                <p className="mt-1 text-sm text-slate-900" data-testid="text-view-created">
                  {format(new Date(viewingTemplate.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewingTemplate(null)} data-testid="button-close-view">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title">
              Delete Template?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
