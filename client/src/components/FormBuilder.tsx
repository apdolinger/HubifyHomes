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

/**
 * FORM MANAGEMENT AREA
 * Purpose: Admins can build forms and map fields directly to Person Profile fields.
 * Outcome: Submissions either create or update a profile, based on mapped fields.
 */

interface FormFieldOption {
  label: string;
  type: string;
  required: boolean;
  profileFieldKey: string; // maps to DB field on the person profile
  icon?: React.ReactNode;
  options?: string[]; // for select/checkbox fields
}

interface FormSchema {
  formTitle: string;
  internalDescription?: string;
  slug: string;
  fields: FormFieldOption[];
  allowMultipleSubmissions: boolean;
  matchExistingBy: 'email' | 'phone' | 'none';
  triggerAutomation?: boolean;
}

const AvailableFields: FormFieldOption[] = [
  { 
    label: 'First Name', 
    type: 'text', 
    required: true, 
    profileFieldKey: 'firstName',
    icon: <User className="w-4 h-4" />
  },
  { 
    label: 'Last Name', 
    type: 'text', 
    required: true, 
    profileFieldKey: 'lastName',
    icon: <User className="w-4 h-4" />
  },
  { 
    label: 'Email', 
    type: 'email', 
    required: true, 
    profileFieldKey: 'email',
    icon: <Mail className="w-4 h-4" />
  },
  { 
    label: 'Phone Number', 
    type: 'tel', 
    required: false, 
    profileFieldKey: 'phone',
    icon: <Phone className="w-4 h-4" />
  },
  { 
    label: 'Address', 
    type: 'textarea', 
    required: false, 
    profileFieldKey: 'address',
    icon: <MapPin className="w-4 h-4" />
  },
  { 
    label: 'Paragraph Text', 
    type: 'textarea', 
    required: false, 
    profileFieldKey: 'notes',
    icon: <FileText className="w-4 h-4" />
  },
  { 
    label: 'Date of Birth', 
    type: 'date', 
    required: false, 
    profileFieldKey: 'dob',
    icon: <Calendar className="w-4 h-4" />
  },
  { 
    label: 'Preferred Contact Method', 
    type: 'select', 
    required: false, 
    profileFieldKey: 'preferredContact',
    icon: <Settings className="w-4 h-4" />,
    options: ['Email', 'Phone', 'Text Message', 'Mail']
  },
  { 
    label: 'Services Interested In', 
    type: 'checkbox', 
    required: false, 
    profileFieldKey: 'interests',
    icon: <CheckSquare className="w-4 h-4" />,
    options: ['Property Management', 'Maintenance', 'HOA Services', 'Inspections']
  },
  { 
    label: 'Upload File', 
    type: 'file', 
    required: false, 
    profileFieldKey: 'attachment',
    icon: <Upload className="w-4 h-4" />
  },
  { 
    label: 'Custom Field', 
    type: 'text', 
    required: false, 
    profileFieldKey: 'customField1',
    icon: <Type className="w-4 h-4" />
  }
];

interface FormBuilderProps {
  onSave?: (form: FormSchema) => void;
  initialForm?: Partial<FormSchema>;
}

export default function FormBuilder({ onSave, initialForm }: FormBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formSchema, setFormSchema] = useState<FormSchema>({
    formTitle: initialForm?.formTitle || '',
    internalDescription: initialForm?.internalDescription || '',
    slug: initialForm?.slug || '',
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

  // Update slug when title changes
  const handleTitleChange = (title: string) => {
    setFormSchema(prev => ({
      ...prev,
      formTitle: title,
      slug: generateSlug(title)
    }));
  };

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId === 'available-fields' && destination.droppableId === 'form-fields') {
      // Add field from available to form
      const fieldToAdd = AvailableFields[source.index];
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
      return apiRequest('/api/forms', {
        method: 'POST',
        body: {
          name: formData.formTitle,
          description: formData.internalDescription,
          schema: {
            fields: formData.fields.map(field => ({
              id: field.profileFieldKey,
              label: field.label,
              type: field.type,
              required: field.required,
              options: field.options,
              profileFieldKey: field.profileFieldKey
            })),
            submitLabel: 'Submit Form',
            successMessage: 'Thank you for your submission!'
          }
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
          <p className="text-slate-600">Create forms that map directly to person profiles</p>
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="form-title">Form Title *</Label>
                  <Input
                    id="form-title"
                    value={formSchema.formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., New Client Registration"
                  />
                </div>

                <div>
                  <Label htmlFor="form-slug">Form Slug</Label>
                  <Input
                    id="form-slug"
                    value={formSchema.slug}
                    onChange={(e) => setFormSchema(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="auto-generated-from-title"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Used in form URLs. Auto-generated from title.
                  </p>
                </div>

                <div>
                  <Label htmlFor="form-description">Internal Description</Label>
                  <Textarea
                    id="form-description"
                    value={formSchema.internalDescription}
                    onChange={(e) => setFormSchema(prev => ({ ...prev, internalDescription: e.target.value }))}
                    placeholder="Internal notes about this form..."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Allow Multiple Submissions</Label>
                    <Switch
                      checked={formSchema.allowMultipleSubmissions}
                      onCheckedChange={(checked) => 
                        setFormSchema(prev => ({ ...prev, allowMultipleSubmissions: checked }))
                      }
                    />
                  </div>

                  <div>
                    <Label>Match Existing Contacts By</Label>
                    <Select
                      value={formSchema.matchExistingBy}
                      onValueChange={(value: 'email' | 'phone' | 'none') =>
                        setFormSchema(prev => ({ ...prev, matchExistingBy: value }))
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
                        setFormSchema(prev => ({ ...prev, triggerAutomation: checked }))
                      }
                    />
                  </div>
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
              </CardHeader>
              <CardContent>
                <Droppable droppableId="available-fields" isDropDisabled={true}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {AvailableFields.map((field, index) => (
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
                <CardTitle>Form Fields</CardTitle>
                <p className="text-sm text-slate-600">
                  Drag fields from the left panel to build your form. Submissions will map to person profile fields.
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
                                      <div className="flex items-center space-x-2">
                                        <Input
                                          value={field.label}
                                          onChange={(e) => updateField(index, { label: e.target.value })}
                                          className="font-medium"
                                          placeholder="Field label"
                                        />
                                        <Badge variant="outline">{field.type}</Badge>
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">
                                        Maps to: <code className="bg-slate-100 px-1 rounded">{field.profileFieldKey}</code>
                                      </p>
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
    </div>
  );
}