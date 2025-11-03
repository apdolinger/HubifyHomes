import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft,
  Shield,
  Building2,
  DollarSign,
  ToggleLeft,
  Activity,
  MessageSquare,
  Settings,
  FileText,
  Users,
  Database,
  Server,
  Cpu,
  HardDrive,
  Network,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Globe,
  Zap,
  Palette,
  Code,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  Archive,
  AlertCircle,
  Info,
  UserPlus,
  UserMinus,
  CreditCard,
  Bell,
  Bookmark,
  LogIn,
  Ban,
  Play,
  Pause,
  Send,
  FileCode,
  Headphones,
  ExternalLink,
  Paperclip,
  Star
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Template Management Component
function TemplateManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    subject: '',
    htmlContent: '',
    variables: [] as string[],
    isActive: true,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/super-admin/templates'],
  });

  const templatesList = (templates as any[]) || [];
  const filteredTemplates = templatesList.filter((template: any) =>
    template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setFormData({
      type: '',
      name: '',
      subject: '',
      htmlContent: '',
      variables: [],
      isActive: true,
    });
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleEdit = (template: any) => {
    setFormData({
      type: template.type || '',
      name: template.name || '',
      subject: template.subject || '',
      htmlContent: template.htmlContent || '',
      variables: template.variables || [],
      isActive: template.isActive ?? true,
    });
    setEditingTemplate(template);
    setIsCreating(true);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await apiRequest('PATCH', `/api/super-admin/templates/${editingTemplate.id}`, formData);
        toast({ title: "Template updated successfully" });
      } else {
        await apiRequest('POST', '/api/super-admin/templates', formData);
        toast({ title: "Template created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/templates'] });
      setIsCreating(false);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save template",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await apiRequest('DELETE', `/api/super-admin/templates/${id}`);
      toast({ title: "Template deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/templates'] });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete template",
        variant: "destructive" 
      });
    }
  };

  const handleAddVariable = () => {
    const varName = prompt('Enter variable name (e.g., organizationName, eventTitle):');
    if (varName && !formData.variables.includes(varName)) {
      setFormData({ ...formData, variables: [...formData.variables, varName] });
    }
  };

  const handleRemoveVariable = (variable: string) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter(v => v !== variable)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <FileCode className="w-5 h-5 mr-2" />
            Email Template Management
          </CardTitle>
          <Button onClick={handleCreate} data-testid="button-create-template">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-templates"
            />
          </div>

          {/* Templates Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No templates found. Create your first template to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template: any) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.variables?.slice(0, 3).map((v: string) => (
                            <Badge key={v} variant="secondary" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                          {template.variables?.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.variables.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={template.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewTemplate(template)}
                            data-testid={`button-preview-${template.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            data-testid={`button-edit-${template.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update the template details below.'
                : 'Create a new email template for platform communications.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="template-type" data-testid="select-template-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_invitation">Email Invitation</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template-name">Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Event Invitation Template"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-template-name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="template-subject">Subject Line</Label>
              <Input
                id="template-subject"
                placeholder="e.g., You're invited to {{eventTitle}}"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                data-testid="input-template-subject"
              />
            </div>

            <div>
              <Label htmlFor="template-content">HTML Content</Label>
              <Textarea
                id="template-content"
                placeholder="Enter HTML content with variables like {{organizationName}}, {{eventTitle}}, etc."
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                className="min-h-[300px] font-mono text-sm"
                data-testid="input-template-content"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Template Variables</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariable}
                  data-testid="button-add-variable"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Variable
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[60px]">
                {formData.variables.length === 0 ? (
                  <p className="text-sm text-gray-500">No variables defined</p>
                ) : (
                  formData.variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-sm">
                      {`{{${variable}}}`}
                      <button
                        onClick={() => handleRemoveVariable(variable)}
                        className="ml-2 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="template-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-template-active"
              />
              <Label htmlFor="template-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)} data-testid="button-cancel-template">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-template">
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Template Preview - Type: {previewTemplate?.type}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Subject</Label>
              <p className="text-sm mt-1">{previewTemplate?.subject}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Variables</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {previewTemplate?.variables?.map((v: string) => (
                  <Badge key={v} variant="secondary">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">HTML Preview</Label>
              <div
                className="border rounded-lg p-4 mt-2 bg-white"
                dangerouslySetInnerHTML={{ __html: previewTemplate?.htmlContent || '' }}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">HTML Source</Label>
              <pre className="bg-gray-50 p-4 rounded-lg mt-2 overflow-x-auto text-xs">
                <code>{previewTemplate?.htmlContent}</code>
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setPreviewTemplate(null)} data-testid="button-close-preview">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Email Templates Component
function EmailTemplates() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: '' as 'ticket_receipt' | 'ticket_notification' | 'status_update' | '',
    subject: '',
    fromEmail: '',
    fromName: '',
    bodyHtml: '',
    bodyText: '',
    isActive: true,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/super-admin/email-templates'],
  });

  const templatesList = (templates as any[]) || [];
  const filteredTemplates = templatesList.filter((template: any) =>
    template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.fromEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Variable hints based on template type
  const getVariableHints = (type: string) => {
    switch (type) {
      case 'ticket_receipt':
        return ['userName', 'subject', 'message', 'ticketId', 'createdAt'];
      case 'ticket_notification':
        return ['userName', 'organizationName', 'subject', 'message', 'ticketId', 'email', 'createdAt'];
      case 'status_update':
        return ['userName', 'subject', 'status', 'ticketId'];
      default:
        return [];
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      type: '',
      subject: '',
      fromEmail: '',
      fromName: '',
      bodyHtml: '',
      bodyText: '',
      isActive: true,
    });
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name || '',
      type: template.type || '',
      subject: template.subject || '',
      fromEmail: template.fromEmail || '',
      fromName: template.fromName || '',
      bodyHtml: template.bodyHtml || '',
      bodyText: template.bodyText || '',
      isActive: template.isActive ?? true,
    });
    setEditingTemplate(template);
    setIsCreating(true);
  };

  const handleSave = async () => {
    try {
      // Basic validation
      if (!formData.name || !formData.type || !formData.subject || !formData.fromEmail || !formData.fromName) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      if (!formData.bodyHtml || !formData.bodyText) {
        toast({
          title: "Validation Error",
          description: "Both HTML and Text body are required",
          variant: "destructive"
        });
        return;
      }

      if (editingTemplate) {
        await apiRequest('PATCH', `/api/super-admin/email-templates/${editingTemplate.id}`, formData);
        toast({ title: "Template updated successfully" });
      } else {
        await apiRequest('POST', '/api/super-admin/email-templates', formData);
        toast({ title: "Template created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/email-templates'] });
      setIsCreating(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const confirmDelete = (template: any) => {
    setTemplateToDelete(template);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await apiRequest('DELETE', `/api/super-admin/email-templates/${templateToDelete.id}`);
      toast({ title: "Template deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/email-templates'] });
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (template: any) => {
    try {
      await apiRequest('PATCH', `/api/super-admin/email-templates/${template.id}`, {
        ...template,
        isActive: !template.isActive
      });
      toast({ title: `Template ${!template.isActive ? 'activated' : 'deactivated'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/email-templates'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update template status",
        variant: "destructive"
      });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ticket_receipt':
        return 'Ticket Receipt';
      case 'ticket_notification':
        return 'Ticket Notification';
      case 'status_update':
        return 'Status Update';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Templates for Support Tickets
            </CardTitle>
            <Button onClick={handleCreate} data-testid="button-create-email-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search templates by name, type, subject, or from email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-email-templates"
              />
            </div>

            {/* Templates Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>From Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        {searchTerm
                          ? 'No templates match your search.'
                          : 'No email templates found. Create your first template to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template: any) => (
                      <TableRow key={template.id} data-testid={`row-email-template-${template.id}`}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(template.type)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                        <TableCell className="text-sm text-gray-600">{template.fromEmail}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={template.isActive}
                              onCheckedChange={() => handleToggleStatus(template)}
                              data-testid={`switch-status-${template.id}`}
                            />
                            <span className="text-sm text-gray-600">
                              {template.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(template)}
                              data-testid={`button-edit-${template.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDelete(template)}
                              data-testid={`button-delete-${template.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredTemplates.length > 0 && (
              <div className="text-sm text-gray-500">
                Showing {filteredTemplates.length} of {templatesList.length} email templates
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Email Template' : 'Create New Email Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update the email template details below.'
                : 'Create a new email template for support ticket communications.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Support Ticket Receipt"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-template-name"
                />
              </div>

              <div>
                <Label htmlFor="template-type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="template-type" data-testid="select-template-type">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ticket_receipt">Ticket Receipt</SelectItem>
                    <SelectItem value="ticket_notification">Ticket Notification</SelectItem>
                    <SelectItem value="status_update">Status Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="template-subject">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="template-subject"
                placeholder="e.g., Your support ticket has been received - {{ticketId}}"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                data-testid="input-template-subject"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-from-email">
                  From Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="template-from-email"
                  type="email"
                  placeholder="e.g., support@hubify.com"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  data-testid="input-template-from-email"
                />
              </div>

              <div>
                <Label htmlFor="template-from-name">
                  From Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="template-from-name"
                  placeholder="e.g., Hubify Support Team"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  data-testid="input-template-from-name"
                />
              </div>
            </div>

            {formData.type && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-sm font-medium text-blue-900">Available Variables</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getVariableHints(formData.type).map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs font-mono">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Use these variables in your subject and body to personalize emails. They will be replaced with actual values when emails are sent.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="template-body-html">
                Body HTML <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="template-body-html"
                placeholder="Enter HTML content with variables like {{userName}}, {{ticketId}}, etc."
                value={formData.bodyHtml}
                onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
                className="min-h-[200px] font-mono text-sm"
                data-testid="input-template-body-html"
              />
              <p className="text-xs text-gray-500 mt-1">
                HTML version of the email for rich formatting
              </p>
            </div>

            <div>
              <Label htmlFor="template-body-text">
                Body Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="template-body-text"
                placeholder="Enter plain text content with variables like {{userName}}, {{ticketId}}, etc."
                value={formData.bodyText}
                onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                className="min-h-[200px] font-mono text-sm"
                data-testid="input-template-body-text"
              />
              <p className="text-xs text-gray-500 mt-1">
                Plain text version for email clients that don't support HTML
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="template-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-template-active"
              />
              <Label htmlFor="template-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)} data-testid="button-cancel-email-template">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-email-template">
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Email Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template "{templateToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setTemplateToDelete(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              data-testid="button-confirm-delete"
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Support Tickets Component
function SupportTickets() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { data: supportRequests, isLoading, error } = useQuery({
    queryKey: ['/api/super-admin/support-requests'],
  });

  const requestsList = (supportRequests as any[]) || [];
  
  // Extract unique organizations
  const uniqueOrganizations = Array.from(
    new Set(
      requestsList
        .map((req: any) => req.organizationName)
        .filter((name: any) => name && name !== 'N/A')
    )
  ).sort();
  
  const filteredRequests = requestsList.filter((request: any) => {
    const matchesSearch = 
      request.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    const matchesUrgency = selectedUrgency === 'all' || request.urgency === selectedUrgency;
    
    const matchesOrg = selectedOrg === 'all' || request.organizationName === selectedOrg;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const requestDate = request.createdAt ? new Date(request.createdAt) : null;
      if (requestDate) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (requestDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (requestDate > end) matchesDate = false;
        }
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesUrgency && matchesOrg && matchesDate;
  });
  
  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleStatusUpdate = async (requestId: number, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await apiRequest('PATCH', `/api/super-admin/support-requests/${requestId}`, { status: newStatus });
      toast({ title: "Status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/support-requests'] });
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update status",
        variant: "destructive" 
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      case 'resolved':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return status;
    }
  };

  const getUrgencyBadgeClass = (urgency: string) => {
    switch (urgency) {
      case 'low':
        return 'bg-slate-100 text-slate-700';
      case 'medium':
        return 'bg-blue-100 text-blue-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'critical':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    if (!urgency) return 'Low';
    return urgency.charAt(0).toUpperCase() + urgency.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        Error loading support requests: {error.message}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Headphones className="w-5 h-5 mr-2" />
              Support Tickets
            </CardTitle>
            <Badge variant="outline" className="px-3 py-1">
              {filteredRequests.length} tickets
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by subject, email, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-support"
                />
              </div>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger className="w-[200px]" data-testid="select-organization-filter">
                  <SelectValue placeholder="Filter by organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {uniqueOrganizations.map((org: string) => (
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
                <SelectTrigger className="w-[180px]" data-testid="select-urgency-filter">
                  <SelectValue placeholder="Filter by urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="urgency-all">All Urgencies</SelectItem>
                  <SelectItem value="low" data-testid="urgency-low">Low</SelectItem>
                  <SelectItem value="medium" data-testid="urgency-medium">Medium</SelectItem>
                  <SelectItem value="high" data-testid="urgency-high">High</SelectItem>
                  <SelectItem value="critical" data-testid="urgency-critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
                placeholder="Start date"
                data-testid="input-start-date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
                placeholder="End date"
                data-testid="input-end-date"
              />
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearDates}
                  data-testid="button-clear-dates"
                >
                  Clear Dates
                </Button>
              )}
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        {searchTerm || statusFilter !== 'all' || selectedUrgency !== 'all' || selectedOrg !== 'all' || startDate || endDate
                          ? 'No support requests match your filters.'
                          : 'No support requests found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request: any) => (
                      <TableRow 
                        key={request.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedRequest(request)}
                        data-testid={`row-support-${request.id}`}
                      >
                        <TableCell className="font-mono text-sm">#{request.id}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.subject}
                        </TableCell>
                        <TableCell>
                          <Badge className={getUrgencyBadgeClass(request.urgency || 'low')} data-testid={`badge-urgency-${request.id}`}>
                            {getUrgencyLabel(request.urgency || 'low')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {request.organizationName || 'N/A'}
                        </TableCell>
                        <TableCell>{request.userName || 'Anonymous'}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(request.status)}>
                            {getStatusLabel(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {request.createdAt 
                            ? new Date(request.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredRequests.length > 0 && (
              <div className="text-sm text-gray-500">
                Showing {filteredRequests.length} of {requestsList.length} support requests
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              Support Request #{selectedRequest?.id}
            </DialogTitle>
            <DialogDescription>
              Submitted on {selectedRequest?.createdAt 
                ? new Date(selectedRequest.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'N/A'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Organization</Label>
                <p className="text-sm mt-1 font-medium">
                  {selectedRequest?.organizationName || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Status</Label>
                <div className="mt-1">
                  <Select 
                    value={selectedRequest?.status || 'new'}
                    onValueChange={(value) => handleStatusUpdate(selectedRequest?.id, value)}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-full" data-testid="select-update-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Urgency</Label>
                <div className="mt-1">
                  <Badge className={getUrgencyBadgeClass(selectedRequest?.urgency || 'low')}>
                    {getUrgencyLabel(selectedRequest?.urgency || 'low')}
                  </Badge>
                </div>
              </div>
              <div></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">User Name</Label>
                <p className="text-sm mt-1">{selectedRequest?.userName || 'Anonymous'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <p className="text-sm mt-1">
                  <a 
                    href={`mailto:${selectedRequest?.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {selectedRequest?.email}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Subject</Label>
              <p className="text-sm mt-1 font-medium">{selectedRequest?.subject}</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Message</Label>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap">
                  {selectedRequest?.message || 'No message provided.'}
                </p>
              </div>
            </div>

            {selectedRequest?.hyperlinks && selectedRequest.hyperlinks.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Links</Label>
                <div className="mt-2 space-y-2">
                  {selectedRequest.hyperlinks.map((link: string, index: number) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      data-testid={`link-hyperlink-${index}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {selectedRequest?.attachments && selectedRequest.attachments.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Attachments</Label>
                <div className="mt-2 space-y-2">
                  {selectedRequest.attachments.map((attachment: any, index: number) => (
                    <a
                      key={index}
                      href={attachment.url || attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50"
                      data-testid={`link-attachment-${index}`}
                    >
                      <Paperclip className="w-4 h-4" />
                      <span className="text-sm">
                        {attachment.name || attachment.url || attachment}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedRequest(null)}
              data-testid="button-close-details"
            >
              Close
            </Button>
            <Button 
              onClick={() => window.open(`mailto:${selectedRequest?.email}`, '_blank')}
              data-testid="button-reply-email"
            >
              <Mail className="w-4 h-4 mr-2" />
              Reply via Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Communities Report Component
function CommunitiesReport() {
  const { data: communitiesData, isLoading, error } = useQuery({
    queryKey: ['/api/super-admin/communities-report'],
    enabled: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading communities report: {error.message}
      </div>
    );
  }

  const communitiesList = (communitiesData as any[]) || [];
  const filteredCommunities = communitiesList.filter((community: any) =>
    community.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.organizationNames?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.fullAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadCSV = () => {
    if (!communitiesList || communitiesList.length === 0) return;

    const headers = [
      'Community Name',
      'Address',
      'City',
      'State',
      'ZIP',
      'Manager',
      'Manager Email',
      'Property Count',
      'Organizations',
      'Status',
      'Created Date'
    ];

    const csvData = [
      headers,
      ...communitiesList.map((community: any) => [
        community.name || '',
        community.address1 || '',
        community.city || '',
        community.state || '',
        community.zip || '',
        community.managerName || 'N/A',
        community.managerEmail || 'N/A',
        community.propertyCount || 0,
        community.organizationNames || 'No Properties',
        community.isActive ? 'Active' : 'Inactive',
        community.createdAt ? new Date(community.createdAt).toLocaleDateString() : 'N/A'
      ])
    ];

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `communities-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Badge variant="outline" className="px-3 py-1">
            {filteredCommunities.length} communities
          </Badge>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Community Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Properties</TableHead>
              <TableHead>Organizations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCommunities.map((community: any) => (
              <TableRow key={community.id}>
                <TableCell className="font-medium">
                  {community.name || 'Unnamed Community'}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {community.fullAddress || 'No Address'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{community.managerName}</div>
                    {community.managerEmail && (
                      <div className="text-gray-500">{community.managerEmail}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {community.propertyCount || 0} properties
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={community.organizationNames}>
                    {community.organizationNames}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={community.isActive ? "default" : "secondary"}
                  >
                    {community.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {community.createdAt ? new Date(community.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredCommunities.length === 0 && communitiesList && communitiesList.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          No communities match your search criteria.
        </div>
      )}

      {(!communitiesList || communitiesList.length === 0) && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          No communities found in the database.
        </div>
      )}
    </div>
  );
}

// Vendors Report Component
function VendorsReport() {
  const { data: vendorsData, isLoading, error } = useQuery({
    queryKey: ['/api/super-admin/vendors-report'],
    enabled: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading vendors report: {error.message}
      </div>
    );
  }

  const vendorsList = (vendorsData as any[]) || [];
  const filteredVendors = vendorsList.filter((vendor: any) =>
    vendor.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.vendorType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadCSV = () => {
    if (!vendorsList || vendorsList.length === 0) return;

    const headers = [
      'Vendor Name',
      'Company',
      'Email',
      'Phone',
      'Vendor Type',
      'Category',
      'Organization',
      'Task Count',
      'Average Rating',
      'Total Ratings',
      'Created Date'
    ];

    const csvData = [
      headers,
      ...vendorsList.map((vendor: any) => [
        vendor.fullName || '',
        vendor.companyName || '',
        vendor.email || '',
        vendor.phone || '',
        vendor.vendorType || '',
        vendor.vendorCategory || '',
        vendor.organizationName || 'Unknown',
        vendor.taskCount || 0,
        vendor.averageRating || 'N/A',
        vendor.ratingCount || 0,
        vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'
      ])
    ];

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendors-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const renderStars = (rating: number | null, count: number) => {
    if (rating === null || count === 0) {
      return <span className="text-gray-400 text-sm">No ratings</span>;
    }
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star}
            className={`w-4 h-4 ${star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
            data-testid="input-search-vendors"
          />
          <Badge variant="outline" className="px-3 py-1">
            {filteredVendors.length} vendors
          </Badge>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm" data-testid="button-export-vendors-csv">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Satisfaction Rating</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.map((vendor: any) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">
                  <div>
                    <div>{vendor.displayName}</div>
                    {vendor.companyName && vendor.displayName === vendor.fullName && (
                      <div className="text-sm text-gray-500">{vendor.companyName}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {vendor.email && <div className="text-gray-700">{vendor.email}</div>}
                    {vendor.phone && <div className="text-gray-500">{vendor.phone}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  {vendor.vendorType && (
                    <Badge variant="outline">{vendor.vendorType}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={vendor.organizationName}>
                    {vendor.organizationName}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {vendor.taskCount || 0} tasks
                  </Badge>
                </TableCell>
                <TableCell>
                  {renderStars(vendor.averageRating, vendor.ratingCount)}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredVendors.length === 0 && vendorsList && vendorsList.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          No vendors match your search criteria.
        </div>
      )}

      {(!vendorsList || vendorsList.length === 0) && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          No vendors found in the database.
        </div>
      )}
    </div>
  );
}

export default function SuperAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("organizations");
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState<boolean | null>(null);
  const [superAdminUsername, setSuperAdminUsername] = useState<string>("");

  // Check super admin session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/super-admin/session');
        const data = await response.json();
        
        if (data.authenticated) {
          setIsSuperAdminAuthenticated(true);
          setSuperAdminUsername(data.username);
        } else {
          setIsSuperAdminAuthenticated(false);
          toast({
            title: "Access Denied",
            description: "Super Admin authentication required.",
            variant: "destructive",
          });
          setTimeout(() => {
            setLocation("/super-admin/login");
          }, 1000);
        }
      } catch (error) {
        console.error("Error checking super admin session:", error);
        setIsSuperAdminAuthenticated(false);
        setTimeout(() => {
          setLocation("/super-admin/login");
        }, 1000);
      }
    };

    checkSession();
  }, [toast, setLocation]);

  const handleLogout = async () => {
    try {
      await fetch('/api/super-admin/logout', { method: 'POST' });
      toast({
        title: "Logged Out",
        description: "You have been logged out of Super Admin.",
      });
      setLocation("/super-admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isSuperAdminAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSuperAdminAuthenticated) {
    return null;
  }

  const platformStats = {
    totalOrganizations: 247,
    activeOrganizations: 235,
    totalUsers: 1842,
    activeUsers: 1654,
    totalProperties: 8934,
    totalTasks: 45672,
    monthlyRevenue: "$47,830",
    uptime: "99.97%"
  };

  const organizations = [
    { id: 1, name: "Sterling Property Management", admin: "andrew.dolinger@gmail.com", plan: "Professional", status: "Active", properties: 45, users: 12, mrr: "$149" },
    { id: 2, name: "Coastal Home Watch", admin: "sarah.johnson@coastal.com", plan: "Enterprise", status: "Active", properties: 128, users: 24, mrr: "$299" },
    { id: 3, name: "Desert Valley HOA", admin: "mike.torres@dvhoa.org", plan: "Starter", status: "Trial", properties: 15, users: 3, mrr: "$0" },
    { id: 4, name: "Pacific Property Care", admin: "lisa.chen@pacificcare.com", plan: "Professional", status: "Suspended", properties: 67, users: 8, mrr: "$149" }
  ];

  const systemMetrics = {
    cpu: "23%",
    memory: "4.2GB / 16GB",
    disk: "67GB / 200GB",
    network: "↑ 2.1MB/s ↓ 5.8MB/s",
    dbConnections: 45,
    apiRequests: "12.4K/hour",
    errorRate: "0.03%"
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Control Panel</h1>
            <p className="text-lg text-slate-600">Platform-wide monitoring and management for Hubify team</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <Shield className="w-3 h-3 mr-1" />
            Internal Access Only
          </Badge>
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <span>Logged in as: <strong>{superAdminUsername}</strong></span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
            className="text-red-600 border-red-300 hover:bg-red-50"
            data-testid="button-logout"
          >
            <Lock className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              {platformStats.activeOrganizations} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {platformStats.activeUsers} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.monthlyRevenue}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{platformStats.uptime}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-12">
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="email-templates" data-testid="tab-email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Organizations Management
                </CardTitle>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Organization
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Admin Contact</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">
                        <button 
                          onClick={() => setLocation(`/nestive-admin/organization/${org.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {org.name}
                        </button>
                      </TableCell>
                      <TableCell>{org.admin}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{org.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={org.status === 'Active' ? 'default' : 
                                   org.status === 'Trial' ? 'secondary' : 'destructive'}
                        >
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.properties}</TableCell>
                      <TableCell>{org.users}</TableCell>
                      <TableCell>{org.mrr}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" title="Login as Admin">
                            <LogIn className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {org.status === 'Active' ? (
                            <Button size="sm" variant="ghost" title="Suspend">
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" title="Activate">
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Communities Report
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Comprehensive view of all communities across all organizations
                </p>
              </CardHeader>
              <CardContent>
                <CommunitiesReport />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Vendors Report
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Comprehensive view of all vendors across all organizations with satisfaction ratings
                </p>
              </CardHeader>
              <CardContent>
                <VendorsReport />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support">
          <SupportTickets />
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates">
          <EmailTemplates />
        </TabsContent>

        {/* All Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  All Users Across Platform
                </CardTitle>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search users..."
                    className="w-64"
                  />
                  <Select>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="staff">Field Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Selected Users
                </Button>
                <span className="ml-2 text-sm text-gray-500">0 users selected</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input type="checkbox" className="rounded" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      User Name ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Email ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Company ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Role ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Status ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Last Login ↕
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50">
                      Created ↕
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell className="font-medium">Andrew Dolinger</TableCell>
                    <TableCell>andrew.dolinger@gmail.com</TableCell>
                    <TableCell>Sterling Property Management</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700">Admin</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </TableCell>
                    <TableCell>2 hours ago</TableCell>
                    <TableCell>Jan 15, 2023</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell className="font-medium">Sarah Johnson</TableCell>
                    <TableCell>sarah.johnson@coastal.com</TableCell>
                    <TableCell>Coastal Home Watch</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">Supervisor</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </TableCell>
                    <TableCell>1 day ago</TableCell>
                    <TableCell>Mar 22, 2023</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell className="font-medium">Mike Torres</TableCell>
                    <TableCell>mike.torres@dvhoa.org</TableCell>
                    <TableCell>Desert Valley HOA</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">Field Staff</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-red-100 text-red-800">Suspended</Badge>
                    </TableCell>
                    <TableCell>3 weeks ago</TableCell>
                    <TableCell>Jun 8, 2024</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell className="font-medium">Lisa Chen</TableCell>
                    <TableCell>lisa.chen@pacificcare.com</TableCell>
                    <TableCell>Pacific Property Care</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700">Admin</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </TableCell>
                    <TableCell>5 hours ago</TableCell>
                    <TableCell>Aug 14, 2023</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 text-sm text-gray-500">
                Showing 4 of 1,842 users
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Tab - System Alerts */}
        <TabsContent value="communication">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Alert */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Create System Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="alert-title">Alert Title</Label>
                  <Input 
                    placeholder="e.g., Scheduled Maintenance Notice"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="alert-message">Message</Label>
                  <Textarea 
                    placeholder="Alert message content..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input type="datetime-local" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input type="datetime-local" className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="target">Target Audience</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admins">Admin Users Only</SelectItem>
                      <SelectItem value="account">Specific Account</SelectItem>
                      <SelectItem value="role">Specific Role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="severity">Alert Severity</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select severity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info (Blue)</SelectItem>
                      <SelectItem value="warning">Warning (Yellow)</SelectItem>
                      <SelectItem value="error">Critical (Red)</SelectItem>
                      <SelectItem value="success">Success (Green)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Page/Location (Optional)</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Show on all pages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pages</SelectItem>
                      <SelectItem value="dashboard">Dashboard Only</SelectItem>
                      <SelectItem value="properties">Properties Page</SelectItem>
                      <SelectItem value="tasks">Tasks Page</SelectItem>
                      <SelectItem value="calendar">Calendar Page</SelectItem>
                      <SelectItem value="team">Team Page</SelectItem>
                      <SelectItem value="contacts">Contacts Page</SelectItem>
                      <SelectItem value="billing">Billing Page</SelectItem>
                      <SelectItem value="settings">Settings Page</SelectItem>
                      <SelectItem value="support">Support Area</SelectItem>
                      <SelectItem value="admin">Admin Pages Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Alert will only appear on the selected page/location
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="require-ack" className="rounded" />
                  <Label htmlFor="require-ack">Require acknowledgment</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="show-once" className="rounded" />
                  <Label htmlFor="show-once">Show only once per session</Label>
                </div>

                <div>
                  <Label htmlFor="action-button">Action Button (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Input placeholder="Button text" />
                    <Input placeholder="Button URL" />
                  </div>
                </div>

                <Button className="w-full">
                  Create Alert
                </Button>
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Active System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sample Active Alert */}
                <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="font-semibold text-yellow-800">Scheduled Maintenance</span>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Warning</Badge>
                      </div>
                      <p className="text-sm text-yellow-700 mb-2">
                        Platform will be offline for maintenance on Jan 25, 2025 from 1:00 AM - 3:00 AM EST.
                      </p>
                      <div className="text-xs text-yellow-600">
                        Active: Jan 24, 1:00 PM - Jan 25, 4:00 AM | Target: All Users | Location: All Pages
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sample Feature Alert */}
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-800">New Feature Available</span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">Info</Badge>
                      </div>
                      <p className="text-sm text-blue-700 mb-2">
                        🎉 Dashboard customization is now live! Personalize your workspace with drag-and-drop widgets.
                      </p>
                      <div className="text-xs text-blue-600">
                        Active: Jan 22, 9:00 AM - Jan 29, 11:59 PM | Target: Admin Users | Location: Dashboard Only
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-500 mt-4">
                  2 active alerts • 847 users notified today
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Revenue Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">MRR</span>
                  <span className="font-semibold">$47,830</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">ARR</span>
                  <span className="font-semibold">$573,960</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Churn Rate</span>
                  <span className="font-semibold text-green-600">2.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">ARPU</span>
                  <span className="font-semibold">$203</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Starter</span>
                  <span className="font-semibold">78 orgs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Professional</span>
                  <span className="font-semibold">142 orgs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Enterprise</span>
                  <span className="font-semibold">27 orgs</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Credit Card</span>
                  <span className="font-semibold">89%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">ACH/Bank</span>
                  <span className="font-semibold">11%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ToggleLeft className="w-5 h-5 mr-2" />
                Feature Flags & Beta Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { name: 'Task Cost Tracking', description: 'Track labor and material costs per task', enabled: true, beta: true },
                  { name: 'Community Profiles', description: 'HOA community management features', enabled: false, beta: true },
                  { name: 'Zapier Integration', description: 'Third-party automation integration', enabled: true, beta: false },
                  { name: 'Advanced Reporting', description: 'Custom report builder and analytics', enabled: false, beta: true },
                  { name: 'Mobile Push Notifications', description: 'Native mobile app notifications', enabled: true, beta: false },
                  { name: 'White Label Branding', description: 'Custom branding and domain options', enabled: false, beta: true }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-slate-900">{feature.name}</h4>
                        {feature.beta && (
                          <Badge variant="secondary" className="text-xs">Beta</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{feature.description}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Switch checked={feature.enabled} />
                      <Button size="sm" variant="outline">
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">CPU Usage</span>
                      <span className="font-semibold">{systemMetrics.cpu}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Memory</span>
                      <span className="font-semibold">{systemMetrics.memory}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '26%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Disk Usage</span>
                      <span className="font-semibold">{systemMetrics.disk}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '33%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Recent Errors & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">Database Connection Timeout</div>
                        <div className="text-sm text-red-700">Organization: Coastal Home Watch</div>
                      </div>
                    </div>
                    <div className="text-xs text-red-600">2 min ago</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-medium text-yellow-900">High API Request Volume</div>
                        <div className="text-sm text-yellow-700">15.2K requests in last hour</div>
                      </div>
                    </div>
                    <div className="text-xs text-yellow-600">5 min ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Messaging Tab */}
        <TabsContent value="messaging">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Platform Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium text-slate-900 mb-4">Send New Announcement</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="announcement-type">Message Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select message type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maintenance">Maintenance Notice</SelectItem>
                          <SelectItem value="feature">New Feature</SelectItem>
                          <SelectItem value="security">Security Alert</SelectItem>
                          <SelectItem value="general">General Announcement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="announcement-title">Title</Label>
                      <Input id="announcement-title" placeholder="Announcement title" />
                    </div>
                    <div>
                      <Label htmlFor="announcement-message">Message</Label>
                      <Textarea 
                        id="announcement-message" 
                        placeholder="Announcement content..."
                        className="min-h-24"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch id="email-delivery" />
                        <Label htmlFor="email-delivery">Send Email</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="inapp-delivery" defaultChecked />
                        <Label htmlFor="inapp-delivery">In-App Banner</Label>
                      </div>
                    </div>
                    <Button>
                      <Send className="w-4 h-4 mr-2" />
                      Send Announcement
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Tab */}
        <TabsContent value="platform">
          <TemplateManagement />
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <div className="space-y-6">
            {/* Audit Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Security Audit Logs
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-export-audit-logs">
                    <FileText className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex gap-2">
                    <Select>
                      <SelectTrigger className="w-[180px]" data-testid="select-severity-filter">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select>
                      <SelectTrigger className="w-[180px]" data-testid="select-action-type-filter">
                        <SelectValue placeholder="Action Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="auth">Authentication</SelectItem>
                        <SelectItem value="admin">Admin Action</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input 
                      type="date" 
                      placeholder="Start Date"
                      className="w-[180px]"
                      data-testid="input-start-date"
                    />
                    
                    <Input 
                      type="date" 
                      placeholder="End Date"
                      className="w-[180px]"
                      data-testid="input-end-date"
                    />
                  </div>
                  
                  {/* Audit Log Table */}
                  <div className="border rounded-md">
                    <div className="max-h-96 overflow-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium">Timestamp</th>
                            <th className="text-left p-3 text-sm font-medium">User</th>
                            <th className="text-left p-3 text-sm font-medium">Action</th>
                            <th className="text-left p-3 text-sm font-medium">Resource</th>
                            <th className="text-left p-3 text-sm font-medium">Severity</th>
                            <th className="text-left p-3 text-sm font-medium">IP Address</th>
                            <th className="text-left p-3 text-sm font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b hover:bg-slate-50" data-testid="audit-log-row-sample">
                            <td className="p-3 text-sm">Loading...</td>
                            <td className="p-3 text-sm" colSpan={6}>
                              <span className="text-slate-500">Connect to view audit logs</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Access Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Admin Access Review
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-export-access-review">
                    <FileText className="w-4 h-4 mr-2" />
                    Export Review
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Quarterly review of all users with admin, supervisor, or super_admin privileges (required for SOC 2 compliance)
                </p>
                <div className="border rounded-md">
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">Name</th>
                          <th className="text-left p-3 text-sm font-medium">Email</th>
                          <th className="text-left p-3 text-sm font-medium">Role</th>
                          <th className="text-left p-3 text-sm font-medium">Admin Account</th>
                          <th className="text-left p-3 text-sm font-medium">Last Active</th>
                          <th className="text-left p-3 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-slate-50" data-testid="access-review-row-sample">
                          <td className="p-3 text-sm">Loading...</td>
                          <td className="p-3 text-sm" colSpan={5}>
                            <span className="text-slate-500">Connect to view admin users</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Active Sessions
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-refresh-sessions">
                    <Activity className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Monitor and manage active user sessions. Force logout if needed.
                </p>
                <div className="border rounded-md">
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">User</th>
                          <th className="text-left p-3 text-sm font-medium">Email</th>
                          <th className="text-left p-3 text-sm font-medium">IP Address</th>
                          <th className="text-left p-3 text-sm font-medium">Last Activity</th>
                          <th className="text-left p-3 text-sm font-medium">Duration</th>
                          <th className="text-left p-3 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-slate-50" data-testid="session-row-sample">
                          <td className="p-3 text-sm">Loading...</td>
                          <td className="p-3 text-sm" colSpan={5}>
                            <span className="text-slate-500">Connect to view active sessions</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security & Compliance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security & Compliance
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Comprehensive security controls achieving 85% vulnerability mitigation for SOC 2 and GDPR compliance
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm text-slate-600 mb-2">Overall Security Mitigation</p>
                  <p className="text-5xl font-bold text-green-600" data-testid="text-overall-mitigation">85%</p>
                  <p className="text-sm text-slate-600 mt-2">Target Achievement: 85% of security vulnerabilities mitigated</p>
                </div>

                <h3 className="text-lg font-semibold mb-4">Security Control Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">MFA Enforcement</p>
                        <p className="text-4xl font-bold text-blue-600" data-testid="text-mfa-percentage">20%</p>
                        <p className="text-xs text-slate-500 mt-2">All admin accounts require 2FA</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">Separate Admin Accounts</p>
                        <p className="text-4xl font-bold text-purple-600" data-testid="text-admin-accounts-percentage">30%</p>
                        <p className="text-xs text-slate-500 mt-2">Least privilege controls enforced</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">Comprehensive Audit Logging</p>
                        <p className="text-4xl font-bold text-amber-600" data-testid="text-audit-logging-percentage">15%</p>
                        <p className="text-xs text-slate-500 mt-2">All actions tracked & logged</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-teal-200 bg-teal-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">Session Management</p>
                        <p className="text-4xl font-bold text-teal-600" data-testid="text-session-management-percentage">10%</p>
                        <p className="text-xs text-slate-500 mt-2">Concurrent session limits & monitoring</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">IP Allowlist Enforcement</p>
                        <p className="text-4xl font-bold text-red-600" data-testid="text-ip-allowlist-percentage">5%</p>
                        <p className="text-xs text-slate-500 mt-2">Geographic access restrictions</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-indigo-200 bg-indigo-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">Quarterly Access Reviews</p>
                        <p className="text-4xl font-bold text-indigo-600" data-testid="text-access-reviews-percentage">5%</p>
                        <p className="text-xs text-slate-500 mt-2">Regular privilege verification</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Security Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Security Score</p>
                      <p className="text-3xl font-bold text-green-600" data-testid="text-security-score">85%</p>
                      <p className="text-xs text-slate-500 mt-1">Target: 85% mitigation</p>
                    </div>
                    <Shield className="w-12 h-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Failed Auth Attempts</p>
                      <p className="text-3xl font-bold" data-testid="text-failed-auth">0</p>
                      <p className="text-xs text-slate-500 mt-1">Last 24 hours</p>
                    </div>
                    <AlertTriangle className="w-12 h-12 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Active Admins</p>
                      <p className="text-3xl font-bold" data-testid="text-active-admins">0</p>
                      <p className="text-xs text-slate-500 mt-1">Requires MFA</p>
                    </div>
                    <Users className="w-12 h-12 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Platform Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Platform Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="api-rate-limit">API Rate Limit (requests/hour)</Label>
                    <Input id="api-rate-limit" type="number" defaultValue="10000" data-testid="input-api-rate-limit" />
                  </div>
                  <div>
                    <Label htmlFor="session-timeout">Default Session Timeout (minutes)</Label>
                    <Input id="session-timeout" type="number" defaultValue="60" data-testid="input-session-timeout" />
                  </div>
                  <div>
                    <Label htmlFor="max-file-size">Max File Upload Size (MB)</Label>
                    <Input id="max-file-size" type="number" defaultValue="25" data-testid="input-max-file-size" />
                  </div>
                  <div>
                    <Label htmlFor="webhook-retries">Webhook Retry Attempts</Label>
                    <Input id="webhook-retries" type="number" defaultValue="3" data-testid="input-webhook-retries" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="global-timezone">Global Time Zone</Label>
                  <Select>
                    <SelectTrigger id="global-timezone" data-testid="select-global-timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern (EST/EDT)</SelectItem>
                      <SelectItem value="cst">Central (CST/CDT)</SelectItem>
                      <SelectItem value="mst">Mountain (MST/MDT)</SelectItem>
                      <SelectItem value="pst">Pacific (PST/PDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="button-save-platform-config">
                  <Settings className="w-4 h-4 mr-2" />
                  Save Platform Configuration
                </Button>
              </CardContent>
            </Card>

            {/* Email & Communication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Email & Communication Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="smtp-provider">Email Provider</Label>
                  <Select>
                    <SelectTrigger id="smtp-provider" data-testid="select-smtp-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="smtp">Custom SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sendgrid-key">SendGrid API Key</Label>
                  <Input id="sendgrid-key" type="password" placeholder="SG.xxxxx" data-testid="input-sendgrid-key" />
                </div>
                <div>
                  <Label htmlFor="from-email">Default From Email</Label>
                  <Input id="from-email" type="email" defaultValue="noreply@hubify.com" data-testid="input-from-email" />
                </div>
                <div>
                  <Label htmlFor="sms-provider">SMS Gateway Provider</Label>
                  <Select>
                    <SelectTrigger id="sms-provider" data-testid="select-sms-provider">
                      <SelectValue placeholder="Select SMS provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="plivo">Plivo</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="email-notifications" defaultChecked data-testid="switch-email-notifications" />
                  <Label htmlFor="email-notifications">Enable System Email Notifications</Label>
                </div>
                <Button data-testid="button-save-email-settings">
                  <Mail className="w-4 h-4 mr-2" />
                  Save Email Settings
                </Button>
              </CardContent>
            </Card>

            {/* Integration Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Integration Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="stripe-master-key">Stripe Master Secret Key</Label>
                  <Input id="stripe-master-key" type="password" placeholder="sk_live_xxxxx" data-testid="input-stripe-master-key" />
                  <p className="text-xs text-gray-500 mt-1">Used for platform billing</p>
                </div>
                <div>
                  <Label htmlFor="oauth-google">Google OAuth Client ID</Label>
                  <Input id="oauth-google" placeholder="xxxxx.apps.googleusercontent.com" data-testid="input-oauth-google" />
                </div>
                <div>
                  <Label htmlFor="oauth-microsoft">Microsoft OAuth Client ID</Label>
                  <Input id="oauth-microsoft" placeholder="xxxxx-xxxxx-xxxxx" data-testid="input-oauth-microsoft" />
                </div>
                <div>
                  <Label htmlFor="quickbooks-key">QuickBooks API Key</Label>
                  <Input id="quickbooks-key" type="password" placeholder="Optional" data-testid="input-quickbooks-key" />
                </div>
                <Button data-testid="button-save-integrations">
                  <Zap className="w-4 h-4 mr-2" />
                  Save Integration Settings
                </Button>
              </CardContent>
            </Card>

            {/* Default Organization Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Default Organization Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="default-plan">Default Plan for New Orgs</Label>
                    <Select>
                      <SelectTrigger id="default-plan" data-testid="select-default-plan">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="trial-length">Free Trial Length (days)</Label>
                    <Input id="trial-length" type="number" defaultValue="14" data-testid="input-trial-length" />
                  </div>
                  <div>
                    <Label htmlFor="default-storage">Default Storage Quota (GB)</Label>
                    <Input id="default-storage" type="number" defaultValue="10" data-testid="input-default-storage" />
                  </div>
                  <div>
                    <Label htmlFor="max-users">Default Max Users</Label>
                    <Input id="max-users" type="number" defaultValue="5" data-testid="input-max-users" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Feature Toggles</Label>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-maintenance" defaultChecked data-testid="switch-feature-maintenance" />
                      <Label htmlFor="feature-maintenance">Maintenance Module</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-calendar" defaultChecked data-testid="switch-feature-calendar" />
                      <Label htmlFor="feature-calendar">Calendar System</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-invoices" defaultChecked data-testid="switch-feature-invoices" />
                      <Label htmlFor="feature-invoices">Invoice Management</Label>
                    </div>
                  </div>
                </div>
                <Button data-testid="button-save-org-defaults">
                  <Building2 className="w-4 h-4 mr-2" />
                  Save Organization Defaults
                </Button>
              </CardContent>
            </Card>

            {/* Billing & Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Billing & Subscription Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Starter Plan Price</Label>
                    <Input type="number" defaultValue="49" placeholder="$/month" data-testid="input-price-starter" />
                  </div>
                  <div>
                    <Label>Professional Plan Price</Label>
                    <Input type="number" defaultValue="149" placeholder="$/month" data-testid="input-price-professional" />
                  </div>
                  <div>
                    <Label>Enterprise Plan Price</Label>
                    <Input type="number" defaultValue="399" placeholder="$/month" data-testid="input-price-enterprise" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="grace-period">Payment Grace Period (days)</Label>
                  <Input id="grace-period" type="number" defaultValue="3" data-testid="input-grace-period" />
                </div>
                <div>
                  <Label>Add-ons Pricing</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="addon-storage">Extra Storage (per 10GB/month)</Label>
                      <Input id="addon-storage" type="number" defaultValue="15" data-testid="input-addon-storage" />
                    </div>
                    <div>
                      <Label htmlFor="addon-support">Premium Support (/month)</Label>
                      <Input id="addon-support" type="number" defaultValue="99" data-testid="input-addon-support" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="referral-program" data-testid="switch-referral-program" />
                  <Label htmlFor="referral-program">Enable Referral Program</Label>
                </div>
                <Button data-testid="button-save-billing-settings">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Save Billing Settings
                </Button>
              </CardContent>
            </Card>

            {/* Compliance & Legal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Compliance & Legal Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="retention-period">Document Retention Period (years)</Label>
                  <Input id="retention-period" type="number" defaultValue="7" data-testid="input-retention-period" />
                </div>
                <div>
                  <Label htmlFor="esign-provider">E-Signature Provider</Label>
                  <Select>
                    <SelectTrigger id="esign-provider" data-testid="select-esign-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="docusign">DocuSign</SelectItem>
                      <SelectItem value="hellosign">HelloSign</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Privacy Controls</Label>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="gdpr-compliance" defaultChecked data-testid="switch-gdpr-compliance" />
                      <Label htmlFor="gdpr-compliance">GDPR Compliance Mode</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="ccpa-compliance" defaultChecked data-testid="switch-ccpa-compliance" />
                      <Label htmlFor="ccpa-compliance">CCPA Compliance Mode</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="audit-logging" defaultChecked data-testid="switch-audit-logging" />
                      <Label htmlFor="audit-logging">Global Audit Logging</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="data-purge">Auto Data Purge Schedule</Label>
                  <Select>
                    <SelectTrigger id="data-purge" data-testid="select-data-purge">
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="30days">After 30 days of deletion</SelectItem>
                      <SelectItem value="90days">After 90 days of deletion</SelectItem>
                      <SelectItem value="1year">After 1 year of deletion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="button-save-compliance-settings">
                  <FileText className="w-4 h-4 mr-2" />
                  Save Compliance Settings
                </Button>
              </CardContent>
            </Card>

            {/* System Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  System Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-medium text-yellow-900">Maintenance Mode</div>
                        <div className="text-sm text-yellow-700">Enable to prevent user access during maintenance</div>
                      </div>
                    </div>
                    <Switch id="maintenance-mode" data-testid="switch-maintenance-mode" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="downtime-message">Maintenance Mode Message</Label>
                  <Textarea 
                    id="downtime-message" 
                    placeholder="We're performing scheduled maintenance. We'll be back shortly!"
                    defaultValue="We're performing scheduled maintenance. We'll be back shortly!"
                    data-testid="textarea-downtime-message"
                  />
                </div>
                <div>
                  <Label htmlFor="backup-schedule">Automated Backup Schedule</Label>
                  <Select>
                    <SelectTrigger id="backup-schedule" data-testid="select-backup-schedule">
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily at 2 AM</SelectItem>
                      <SelectItem value="weekly">Weekly (Sunday 2 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="health-check">System Health Check Interval</Label>
                  <Select>
                    <SelectTrigger id="health-check" data-testid="select-health-check">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1min">Every 1 minute</SelectItem>
                      <SelectItem value="5min">Every 5 minutes</SelectItem>
                      <SelectItem value="15min">Every 15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="button-save-maintenance-settings">
                  <Server className="w-4 h-4 mr-2" />
                  Save Maintenance Settings
                </Button>
              </CardContent>
            </Card>

            {/* Security & Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Security & Access Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="2fa-policy">Two-Factor Authentication Policy</Label>
                  <Select>
                    <SelectTrigger id="2fa-policy" data-testid="select-2fa-policy">
                      <SelectValue placeholder="Select policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Required for all users</SelectItem>
                      <SelectItem value="admins">Required for admins only</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="off">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Password Complexity Requirements</Label>
                  <div className="space-y-2 mt-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="pwd-length" defaultChecked data-testid="switch-pwd-length" />
                      <Label htmlFor="pwd-length">Minimum 8 characters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="pwd-uppercase" defaultChecked data-testid="switch-pwd-uppercase" />
                      <Label htmlFor="pwd-uppercase">Require uppercase letters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="pwd-numbers" defaultChecked data-testid="switch-pwd-numbers" />
                      <Label htmlFor="pwd-numbers">Require numbers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="pwd-special" defaultChecked data-testid="switch-pwd-special" />
                      <Label htmlFor="pwd-special">Require special characters</Label>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="session-length">Max Session Length (hours)</Label>
                    <Input id="session-length" type="number" defaultValue="24" data-testid="input-session-length" />
                  </div>
                  <div>
                    <Label htmlFor="reauth-period">Re-authentication Period (hours)</Label>
                    <Input id="reauth-period" type="number" defaultValue="8" data-testid="input-reauth-period" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ip-whitelist">IP Whitelist (comma-separated)</Label>
                  <Textarea 
                    id="ip-whitelist" 
                    placeholder="192.168.1.1, 10.0.0.0/24"
                    data-testid="textarea-ip-whitelist"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="intrusion-detection" defaultChecked data-testid="switch-intrusion-detection" />
                  <Label htmlFor="intrusion-detection">Enable Intrusion Detection Alerts</Label>
                </div>
                <Button data-testid="button-save-security-settings">
                  <Lock className="w-4 h-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>

            {/* Customization Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  Customization Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Global Feature Toggles</Label>
                  <div className="space-y-2 mt-2 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-vendor-portal" defaultChecked data-testid="switch-feature-vendor-portal" />
                      <Label htmlFor="feature-vendor-portal">Vendor Portal (all orgs)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-client-portal" defaultChecked data-testid="switch-feature-client-portal" />
                      <Label htmlFor="feature-client-portal">Client Portal (all orgs)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="feature-mobile-app" data-testid="switch-feature-mobile-app" />
                      <Label htmlFor="feature-mobile-app">Mobile App Access</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="global-theme">Global Default Theme</Label>
                  <Select>
                    <SelectTrigger id="global-theme" data-testid="select-global-theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="dark">Dark Mode</SelectItem>
                      <SelectItem value="auto">Auto (System Preference)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="default-color">Default Brand Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="default-color" 
                      type="color" 
                      defaultValue="#3b82f6" 
                      className="w-20 h-10"
                      data-testid="input-default-color"
                    />
                    <Input 
                      type="text" 
                      defaultValue="#3b82f6" 
                      className="flex-1"
                      data-testid="input-default-color-hex"
                    />
                  </div>
                </div>
                <div>
                  <Label>Default Notification Templates</Label>
                  <div className="mt-2 space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-edit-welcome-template">
                      <Mail className="w-4 h-4 mr-2" />
                      Edit Welcome Email Template
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-edit-reminder-template">
                      <Bell className="w-4 h-4 mr-2" />
                      Edit Reminder Email Template
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-edit-invoice-template">
                      <FileText className="w-4 h-4 mr-2" />
                      Edit Invoice Email Template
                    </Button>
                  </div>
                </div>
                <Button data-testid="button-save-customization-settings">
                  <Palette className="w-4 h-4 mr-2" />
                  Save Customization Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}