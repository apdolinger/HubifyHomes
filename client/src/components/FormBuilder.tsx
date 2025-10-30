import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Settings,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckSquare,
  Upload,
  Type
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { FormContext } from '@/../../shared/schema';

/**
 * FORM MANAGEMENT AREA
 * Purpose: Admins can build forms and map fields directly to Person Profile fields.
 * Outcome: Submissions either create or update a profile, based on mapped fields.
 */

interface FormFieldOption {
  label: string;
  description?: string;
  type: string;
  required: boolean;
  profileFieldKey: string; // maps to DB field on the person profile
  icon?: React.ReactNode;
  options?: string[]; // for select/checkbox fields
  placeholder?: string;
}

interface FormSchema {
  formTitle: string;
  exteriorName?: string;
  internalDescription?: string;
  exteriorDescription?: string;
  slug: string;
  contexts: FormContext[];
  fields: FormFieldOption[];
  allowMultipleSubmissions: boolean;
  matchExistingBy: 'email' | 'phone' | 'none';
  triggerAutomation?: boolean;
}

const PeopleFields: FormFieldOption[] = [
  { label: 'First Name', type: 'text', required: true, profileFieldKey: 'firstName', icon: <User className="w-4 h-4" /> },
  { label: 'Last Name', type: 'text', required: true, profileFieldKey: 'lastName', icon: <User className="w-4 h-4" /> },
  { label: 'Phone Number', type: 'tel', required: false, profileFieldKey: 'phone', icon: <Phone className="w-4 h-4" /> },
  { label: 'Email', type: 'email', required: true, profileFieldKey: 'email', icon: <Mail className="w-4 h-4" /> },
  { label: 'Notes', type: 'textarea', required: false, profileFieldKey: 'notes', icon: <FileText className="w-4 h-4" /> },
];

const PropertyFields: FormFieldOption[] = [
  { label: 'Address', type: 'text', required: true, profileFieldKey: 'address', icon: <MapPin className="w-4 h-4" /> },
  { label: 'Square Footage', type: 'number', required: false, profileFieldKey: 'squareFootage', icon: <Type className="w-4 h-4" /> },
  { label: 'Bedrooms', type: 'number', required: false, profileFieldKey: 'bedrooms', icon: <Type className="w-4 h-4" /> },
  { label: 'Garage Spots', type: 'number', required: false, profileFieldKey: 'garageSpots', icon: <Type className="w-4 h-4" /> },
  { label: 'Vehicles on Site', type: 'textarea', required: false, profileFieldKey: 'vehicleList', icon: <FileText className="w-4 h-4" /> },
  { label: 'Room List', type: 'textarea', required: false, profileFieldKey: 'roomList', icon: <FileText className="w-4 h-4" /> },
  { label: 'Supplies Needed', type: 'textarea', required: false, profileFieldKey: 'supplies', icon: <FileText className="w-4 h-4" /> },
];

const TaskFields: FormFieldOption[] = [
  { label: 'Task Title', type: 'text', required: true, profileFieldKey: 'taskTitle', icon: <Type className="w-4 h-4" /> },
  { label: 'Task Description', type: 'textarea', required: true, profileFieldKey: 'taskDescription', icon: <FileText className="w-4 h-4" /> },
  { label: 'Requested Date', type: 'date', required: false, profileFieldKey: 'requestedDate', icon: <Calendar className="w-4 h-4" /> },
  { label: 'Priority Level', type: 'select', required: false, options: ['Low', 'Medium', 'High'], profileFieldKey: 'priority', icon: <CheckSquare className="w-4 h-4" /> },
  { label: 'Assign To', type: 'select', required: false, profileFieldKey: 'assignedUserId', icon: <User className="w-4 h-4" /> },
];

const MultiFields: FormFieldOption[] = [
  ...PeopleFields,
  ...PropertyFields,
  ...TaskFields,
];

// Get available fields based on selected contexts
const getAvailableFields = (contexts: FormContext[]): FormFieldOption[] => {
  if (contexts.length === 0) return PeopleFields;
  
  const fieldsMap = new Map<string, FormFieldOption>();
  
  contexts.forEach(context => {
    let contextFields: FormFieldOption[] = [];
    switch (context) {
      case 'people':
        contextFields = PeopleFields;
        break;
      case 'property':
        contextFields = PropertyFields;
        break;
      case 'task':
        contextFields = TaskFields;
        break;
      case 'multi':
        contextFields = MultiFields;
        break;
    }
    
    contextFields.forEach(field => {
      fieldsMap.set(field.profileFieldKey, field);
    });
  });
  
  return Array.from(fieldsMap.values());
};

interface FormBuilderProps {
  onSave?: (form: FormSchema) => void;
  initialForm?: Partial<FormSchema>;
}

// FormSettingsPanel Component
interface FormSettingsPanelProps {
  formSchema: FormSchema;
  updateFormSchema: (updates: Partial<FormSchema>) => void;
}

const FormSettingsPanel: React.FC<FormSettingsPanelProps> = ({
  formSchema,
  updateFormSchema
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Form Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="formTitle">Interior Name (Admin View) *</Label>
            <Input
              id="formTitle"
              value={formSchema.formTitle}
              onChange={(e) => {
                const title = e.target.value;
                updateFormSchema({ 
                  formTitle: title,
                  slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                });
              }}
              placeholder="New Client Intake Form"
              data-testid="input-interior-name"
            />
            <p className="text-xs text-gray-500 mt-1">Internal name you see in the admin panel</p>
          </div>
          
          <div>
            <Label htmlFor="exteriorName">Exterior Name (Public View)</Label>
            <Input
              id="exteriorName"
              value={formSchema.exteriorName || ''}
              onChange={(e) => updateFormSchema({ exteriorName: e.target.value })}
              placeholder="Get Started Today!"
              data-testid="input-exterior-name"
            />
            <p className="text-xs text-gray-500 mt-1">Name shown to people filling out the form</p>
          </div>
        </div>

        {/* Form Slug */}
        <div>
          <Label htmlFor="formSlug">Form Slug</Label>
          <Input
            id="formSlug"
            value={formSchema.slug}
            onChange={(e) => updateFormSchema({ slug: e.target.value })}
            placeholder="new-client-inquiry"
            data-testid="input-form-slug"
          />
          <p className="text-xs text-gray-500 mt-1">Used in form URLs. Auto-generated from interior name.</p>
        </div>
        
        {/* Form Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="internalDescription">Interior Description (Admin Notes)</Label>
            <Textarea
              id="internalDescription"
              value={formSchema.internalDescription || ''}
              onChange={(e) => updateFormSchema({ internalDescription: e.target.value })}
              placeholder="Internal notes about this form..."
              rows={3}
              className="resize-none"
              data-testid="textarea-interior-description"
            />
            <p className="text-xs text-gray-500 mt-1">Private notes for your team</p>
          </div>

          <div>
            <Label htmlFor="exteriorDescription">Exterior Description (Public View)</Label>
            <Textarea
              id="exteriorDescription"
              value={formSchema.exteriorDescription || ''}
              onChange={(e) => updateFormSchema({ exteriorDescription: e.target.value })}
              placeholder="Please provide your information below..."
              rows={3}
              className="resize-none"
              data-testid="textarea-exterior-description"
            />
            <p className="text-xs text-gray-500 mt-1">Instructions shown to form users</p>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Form Contexts</h4>
            <p className="text-sm text-gray-600">Select one or more contexts to determine available fields and submission processing</p>
          </div>
          <div className="space-y-2">
            {(['people', 'property', 'task'] as FormContext[]).map((context) => (
              <div key={context} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded border">
                <input
                  type="checkbox"
                  id={`context-${context}`}
                  checked={formSchema.contexts.includes(context)}
                  onChange={(e) => {
                    const newContexts = e.target.checked
                      ? [...formSchema.contexts, context]
                      : formSchema.contexts.filter(c => c !== context);
                    updateFormSchema({ contexts: newContexts });
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <label htmlFor={`context-${context}`} className="text-sm font-medium capitalize cursor-pointer">
                    {context === 'people' ? 'People - Contact/Client Forms' :
                     context === 'property' ? 'Property - Property Information Forms' :
                     'Task - Service Request Forms'}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between">
            <Label>Allow Multiple Submissions</Label>
            <Switch
              checked={formSchema.allowMultipleSubmissions}
              onCheckedChange={(checked) => updateFormSchema({ allowMultipleSubmissions: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label>Trigger Automation</Label>
            <Switch
              checked={formSchema.triggerAutomation || false}
              onCheckedChange={(checked) => updateFormSchema({ triggerAutomation: checked })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="matchExistingBy">Match Existing Contacts By</Label>
          <Select 
            value={formSchema.matchExistingBy} 
            onValueChange={(value: 'email' | 'phone' | 'none') => updateFormSchema({ matchExistingBy: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select matching method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email Address</SelectItem>
              <SelectItem value="phone">Phone Number</SelectItem>
              <SelectItem value="none">No Profile Matching</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

// FormDeploySection Component
interface FormDeploySectionProps {
  formSchema: FormSchema;
}

const FormDeploySection: React.FC<FormDeploySectionProps> = ({ formSchema }) => {
  const { toast } = useToast();
  
  const embedCode = `<iframe src="${window.location.origin}/forms/${formSchema.slug}" width="100%" height="600" frameborder="0"></iframe>`;
  
  const handlePublish = () => {
    if (!formSchema.formTitle || !formSchema.slug) {
      toast({
        title: "Cannot Publish",
        description: "Please save the form first before publishing.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Form Published",
      description: "Your form is now live and accepting submissions.",
    });
  };
  
  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      toast({
        title: "Copied!",
        description: "Embed code copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the embed code.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          Form Deployment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button onClick={handlePublish} className="bg-green-600 hover:bg-green-700">
            <Upload className="w-4 h-4 mr-2" />
            Publish Form
          </Button>
          <Badge variant={formSchema.formTitle ? "default" : "secondary"}>
            {formSchema.formTitle ? "Ready to Publish" : "Save First"}
          </Badge>
        </div>
        
        <div>
          <Label htmlFor="embedCode">Embed Code</Label>
          <div className="flex space-x-2">
            <Input
              id="embedCode"
              value={embedCode}
              readOnly
              className="flex-1"
            />
            <Button variant="outline" onClick={copyEmbedCode}>
              Copy Embed Code
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Use this code to embed the form on your website.
          </p>
        </div>
        
        {formSchema.slug && (
          <div>
            <Label>Form URL</Label>
            <div className="flex space-x-2">
              <Input
                value={`${window.location.origin}/forms/${formSchema.slug}`}
                readOnly
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={() => window.open(`/forms/${formSchema.slug}`, '_blank')}
              >
                Open Form
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function FormBuilder({ onSave, initialForm }: FormBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formSchema, setFormSchema] = useState<FormSchema>({
    formTitle: initialForm?.formTitle || '',
    exteriorName: initialForm?.exteriorName || '',
    internalDescription: initialForm?.internalDescription || '',
    exteriorDescription: initialForm?.exteriorDescription || '',
    slug: initialForm?.slug || '',
    contexts: initialForm?.contexts ? (Array.isArray(initialForm.contexts) ? initialForm.contexts : [initialForm.context || 'people']) : ['people'],
    fields: initialForm?.fields || [],
    allowMultipleSubmissions: initialForm?.allowMultipleSubmissions || false,
    matchExistingBy: initialForm?.matchExistingBy || 'email',
    triggerAutomation: initialForm?.triggerAutomation || false,
  });

  const [showPreview, setShowPreview] = useState(false);

  // Generate slug from title
  const generateSlug = useCallback((title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }, []);

  // Update form schema helper
  const updateFormSchema = useCallback((updates: Partial<FormSchema>) => {
    setFormSchema(prev => {
      const updated = { ...prev, ...updates };
      // Auto-generate slug when title changes
      if (updates.formTitle !== undefined) {
        updated.slug = generateSlug(updates.formTitle);
      }
      return updated;
    });
  }, [generateSlug]);

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId === 'available-fields' && destination.droppableId === 'form-fields') {
      // Add field from available to form
      const fieldToAdd = getAvailableFields(formSchema.contexts)[source.index];
      const newField = {
        ...fieldToAdd,
        id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      const newFields = [...formSchema.fields];
      newFields.splice(destination.index, 0, newField);
      
      setFormSchema(prev => ({ ...prev, fields: newFields }));
    } else if (source.droppableId === 'form-fields' && destination.droppableId === 'form-fields') {
      // Reorder fields within form
      const newFields = [...formSchema.fields];
      const [removed] = newFields.splice(source.index, 1);
      newFields.splice(destination.index, 0, removed);
      
      setFormSchema(prev => ({ ...prev, fields: newFields }));
    }
  };

  // Remove field from form
  const removeField = (index: number) => {
    setFormSchema(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  // Update field properties
  const updateField = (index: number, updates: Partial<FormFieldOption>) => {
    setFormSchema(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      )
    }));
  };

  // Save form mutation
  const saveFormMutation = useMutation({
    mutationFn: async (formData: FormSchema) => {
      return apiRequest('POST', '/api/forms', {
        name: formData.formTitle,
        displayName: formData.exteriorName,
        description: formData.internalDescription,
        displayDescription: formData.exteriorDescription,
        schema: {
          fields: formData.fields.map(field => ({
            id: field.profileFieldKey,
            label: field.label,
            type: field.type,
            required: field.required,
            options: field.options,
            profileFieldKey: field.profileFieldKey
          })),
          matchExistingBy: formData.matchExistingBy,
          fieldMapping: formData.fields.reduce((acc, field) => {
            acc[field.profileFieldKey] = field.profileFieldKey;
            return acc;
          }, {} as Record<string, string>),
          triggerAutomation: formData.triggerAutomation,
          submitLabel: 'Submit Form',
          successMessage: 'Thank you for your submission!'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Form Saved",
        description: "Your form has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/forms'] });
      onSave?.(formSchema);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save form. Please try again.",
        variant: "destructive",
      });
      console.error('Save error:', error);
    }
  });

  const handleSave = () => {
    if (!formSchema.formTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a form title.",
        variant: "destructive",
      });
      return;
    }

    if (formSchema.fields.length === 0) {
      toast({
        title: "Validation Error", 
        description: "Please add at least one field to your form.",
        variant: "destructive",
      });
      return;
    }

    saveFormMutation.mutate(formSchema);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Form Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Form Builder</h1>
          <p className="text-slate-600">Create custom forms with smart field mapping and automated processing</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveFormMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveFormMutation.isPending ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      {/* Form Settings Panel */}
      <FormSettingsPanel 
        formSchema={formSchema}
        updateFormSchema={updateFormSchema}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Quick Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Multiple Submissions</Label>
                  <Switch
                    checked={formSchema.allowMultipleSubmissions}
                    onCheckedChange={(checked) => 
                      updateFormSchema({ allowMultipleSubmissions: checked })
                    }
                  />
                </div>

                <div>
                  <Label>Match Existing Contacts By</Label>
                  <Select
                    value={formSchema.matchExistingBy}
                    onValueChange={(value: 'email' | 'phone' | 'none') =>
                      updateFormSchema({ matchExistingBy: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email Address</SelectItem>
                      <SelectItem value="phone">Phone Number</SelectItem>
                      <SelectItem value="none">Always Create New</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Trigger Automation</Label>
                  <Switch
                    checked={formSchema.triggerAutomation}
                    onCheckedChange={(checked) => 
                      updateFormSchema({ triggerAutomation: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Available Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Available Fields
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {formSchema.contexts.length > 0 
                    ? `Showing fields for: ${formSchema.contexts.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}`
                    : 'Select contexts above to see available fields'
                  }
                </p>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="available-fields" isDropDisabled={true}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {getAvailableFields(formSchema.contexts).map((field, index) => (
                        <Draggable
                          key={field.profileFieldKey}
                          draggableId={`available-${field.profileFieldKey}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center p-3 border rounded-lg cursor-move hover:bg-slate-50 ${
                                snapshot.isDragging ? 'bg-blue-50 border-blue-200' : 'bg-white'
                              }`}
                            >
                              <GripVertical className="w-4 h-4 text-slate-400 mr-2" />
                              {field.icon}
                              <span className="ml-2 text-sm font-medium">{field.label}</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {field.type}
                              </Badge>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* Form Builder Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GripVertical className="w-4 h-4 mr-2" />
                  Form Builder
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Drag fields from the left panel to build your form. Customize labels, descriptions, and field requirements.
                </p>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="form-fields">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`min-h-96 space-y-3 p-4 border-2 border-dashed rounded-lg ${
                        snapshot.isDraggingOver 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-slate-200'
                      } ${formSchema.fields.length === 0 ? 'flex items-center justify-center' : ''}`}
                    >
                      {formSchema.fields.length === 0 ? (
                        <div className="text-center text-slate-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                          <p className="text-lg font-medium">No fields added yet</p>
                          <p className="text-sm">Drag fields from the left panel to start building your form</p>
                        </div>
                      ) : (
                        formSchema.fields.map((field, index) => (
                          <Draggable
                            key={`form-field-${index}`}
                            draggableId={`form-field-${index}`}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-4 border rounded-lg bg-white ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                                    </div>
                                    {field.icon}
                                    <div className="flex-1">
                                      <div className="space-y-2">
                                        {/* Field Label */}
                                        <div>
                                          <Label className="text-xs text-slate-600">Field Label</Label>
                                          <Input
                                            value={field.label}
                                            onChange={(e) => updateField(index, { label: e.target.value })}
                                            className="font-medium"
                                            placeholder="Enter question text (e.g., Please provide your business phone number)"
                                          />
                                        </div>
                                        
                                        {/* Field Description */}
                                        <div>
                                          <Label className="text-xs text-slate-600">Description</Label>
                                          <Input
                                            value={field.description || ''}
                                            onChange={(e) => updateField(index, { description: e.target.value })}
                                            className="text-sm"
                                            placeholder="Enter description (e.g., This could be a mobile number, work number or home phone)"
                                          />
                                        </div>
                                        
                                        {/* Field Type and Profile Mapping */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <Badge variant="outline" className="text-xs">
                                              Type: {field.type}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                              Maps to: {field.profileFieldKey}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={field.required}
                                      onCheckedChange={(checked) => updateField(index, { required: checked })}
                                      size="sm"
                                    />
                                    <span className="text-xs text-slate-500">Required</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeField(index)}
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>
        </div>
      </DragDropContext>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Form Preview</DialogTitle>
            <DialogDescription>
              This is how your form will appear to clients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold">{formSchema.formTitle || 'Untitled Form'}</h3>
            {formSchema.fields.map((field, index) => (
              <div key={index} className="space-y-2">
                <Label className="flex items-center">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea placeholder={`Enter ${field.label.toLowerCase()}...`} disabled />
                ) : field.type === 'select' ? (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                    </SelectTrigger>
                  </Select>
                ) : field.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {field.options?.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2">
                        <input type="checkbox" disabled className="rounded" />
                        <span className="text-sm">{option}</span>
                      </div>
                    ))}
                  </div>
                ) : field.type === 'file' ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
                    <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                  </div>
                ) : (
                  <Input 
                    type={field.type} 
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    disabled 
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Deploy Section */}
      <FormDeploySection formSchema={formSchema} />
    </div>
  );
}