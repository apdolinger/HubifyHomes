import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormBuilder from "@/components/FormBuilder";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Edit, 
  Eye, 
  Copy, 
  Trash2, 
  FileText, 
  Calendar,
  Users,
  ExternalLink,
  Settings,
  Code,
  Crown,
  Shield,
  Zap,
  Hammer
} from "lucide-react";
import type { Form, InsertForm } from "@shared/schema";

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export default function AdminForms() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form creation state
  const [newForm, setNewForm] = useState<Partial<InsertForm>>({
    title: "",
    description: "",
    fields: [],
    embedEnabled: false,
    tierRequired: "standard"
  });
  const [formFields, setFormFields] = useState<FormField[]>([]);

  const userTier = (user as any)?.tier || 'basic';

  // Fetch forms
  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["/api/forms"],
  });

  // Create form mutation
  const createFormMutation = useMutation({
    mutationFn: async (formData: InsertForm) => {
      return apiRequest("/api/forms", {
        method: "POST",
        body: JSON.stringify(formData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setIsCreateDialogOpen(false);
      resetCreateForm();
      toast({
        title: "Form Created",
        description: "Your form has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create form",
        variant: "destructive",
      });
    },
  });

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      return apiRequest(`/api/forms/${formId}`, {
        method: "DELETE",
      });
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

  const resetCreateForm = () => {
    setNewForm({
      title: "",
      description: "",
      fields: [],
      embedEnabled: false,
      tierRequired: "standard"
    });
    setFormFields([]);
  };

  const addFormField = () => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      label: "",
      type: "text",
      required: false,
    };
    setFormFields([...formFields, newField]);
  };

  const updateFormField = (id: string, updates: Partial<FormField>) => {
    setFormFields(formFields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeFormField = (id: string) => {
    setFormFields(formFields.filter(field => field.id !== id));
  };

  const generateFormKey = () => {
    return Math.random().toString(36).substr(2, 8);
  };

  const handleCreateForm = () => {
    if (!newForm.title) {
      toast({
        title: "Error",
        description: "Form title is required",
        variant: "destructive",
      });
      return;
    }

    // Check tier limits
    const tierLimits = {
      basic: 2,
      standard: 20,
      premium: Infinity
    };

    const currentLimit = tierLimits[userTier as keyof typeof tierLimits] || 0;
    if (forms.length >= currentLimit) {
      toast({
        title: "Limit Reached",
        description: `Your ${userTier} plan allows up to ${currentLimit === Infinity ? 'unlimited' : currentLimit} forms. Upgrade to create more.`,
        variant: "destructive",
      });
      return;
    }

    const formData: InsertForm = {
      title: newForm.title!,
      description: newForm.description,
      fields: formFields,
      embedEnabled: newForm.embedEnabled || false,
      tierRequired: newForm.tierRequired || "standard",
      formKey: generateFormKey(),
      createdBy: (user as any)?.id
    };

    createFormMutation.mutate(formData);
  };

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

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'basic': return <Shield className="w-4 h-4" />;
      case 'standard': return <Crown className="w-4 h-4" />;
      case 'premium': return <Zap className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'standard': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'premium': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Forms Management</h1>
          <p className="text-lg text-slate-600">Create and manage embeddable forms for data collection</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className={getTierColor(userTier)}>
            {getTierIcon(userTier)}
            {userTier.charAt(0).toUpperCase() + userTier.slice(1)} Plan
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="builder" className="flex items-center">
            <Hammer className="w-4 h-4 mr-2" />
            Form Builder
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Manage Forms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <FormBuilder />
        </TabsContent>

        <TabsContent value="manage">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Existing Forms</h2>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Legacy Form
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Form</DialogTitle>
                <DialogDescription>
                  Build a custom form to collect data from your website visitors.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Form Title *</Label>
                    <Input
                      id="title"
                      value={newForm.title || ""}
                      onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                      placeholder="e.g., Property Intake Form"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newForm.description || ""}
                      onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                      placeholder="Brief description of what this form is for..."
                    />
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Form Settings</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Enable Embedding</Label>
                      <p className="text-sm text-gray-500">Allow this form to be embedded on external websites</p>
                    </div>
                    <Switch
                      checked={newForm.embedEnabled || false}
                      onCheckedChange={(checked) => setNewForm({ ...newForm, embedEnabled: checked })}
                      disabled={userTier === 'basic'}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tierRequired">Access Level</Label>
                    <Select
                      value={newForm.tierRequired || "standard"}
                      onValueChange={(value) => setNewForm({ ...newForm, tierRequired: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Form Fields</h3>
                    <Button variant="outline" size="sm" onClick={addFormField}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Field
                    </Button>
                  </div>

                  {formFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Field {index + 1}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeFormField(field.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Field Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateFormField(field.id, { label: e.target.value })}
                            placeholder="e.g., Full Name"
                          />
                        </div>
                        <div>
                          <Label>Field Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateFormField(field.id, { type: value as FormField['type'] })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="select">Dropdown</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateFormField(field.id, { required: checked })}
                          />
                          <Label className="text-sm">Required field</Label>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formFields.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No fields added yet. Click "Add Field" to get started.</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateForm}
                  disabled={createFormMutation.isPending}
                >
                  {createFormMutation.isPending ? "Creating..." : "Create Form"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            </div>

            {/* Forms List */}
            <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Your Forms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
              <p className="text-gray-500 mb-4">Create your first form to start collecting data</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Form
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Title</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Tier Access</TableHead>
                  <TableHead>Embed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form: any) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{form.title}</div>
                        {form.description && (
                          <div className="text-sm text-gray-500">{form.description}</div>
                        )}
                      </div>
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
                      <Badge variant="outline" className={getTierColor(form.tierRequired)}>
                        {getTierIcon(form.tierRequired)}
                        {form.tierRequired}
                      </Badge>
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
                          onClick={() => window.open(`/forms/${form.formKey}`, '_blank')}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        {form.embedEnabled && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyEmbedCode(form.formKey)}
                          >
                            <Code className="w-3 h-3" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteFormMutation.mutate(form.id)}
                        >
                          <Trash2 className="w-3 h-3" />
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

            {/* Tier Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Plan Limits & Features
                </CardTitle>
              </CardHeader>
              <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="w-4 h-4 mr-2" />
                <h3 className="font-medium">Basic Plan</h3>
              </div>
              <ul className="text-sm space-y-1">
                <li>✓ Up to 2 forms</li>
                <li>✗ No embedding</li>
                <li>✓ Basic form fields</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Crown className="w-4 h-4 mr-2" />
                <h3 className="font-medium">Standard Plan</h3>
              </div>
              <ul className="text-sm space-y-1">
                <li>✓ Up to 20 forms</li>
                <li>✓ Embedding enabled</li>
                <li>✓ All form fields</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Zap className="w-4 h-4 mr-2" />
                <h3 className="font-medium">Premium Plan</h3>
              </div>
              <ul className="text-sm space-y-1">
                <li>✓ Unlimited forms</li>
                <li>✓ Embedding enabled</li>
                <li>✓ Advanced features</li>
              </ul>
            </div>
          </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}