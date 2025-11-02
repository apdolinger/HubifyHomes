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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  ExternalLink,
  Copy,
  Link,
  Settings,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckSquare,
  Upload,
  Type,
  GitBranch,
  X,
  AlignLeft,
  List,
  Circle,
  Clock,
  PenTool,
  Heading2,
  Hash,
  ChevronDown
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

interface FieldCondition {
  fieldId: string | number;
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
}

interface FormFieldOption {
  label: string;
  description?: string;
  type: string;
  required: boolean;
  profileFieldKey: string; // maps to DB field on the person profile
  icon?: React.ReactNode;
  options?: string[]; // for select/checkbox fields
  placeholder?: string;
  conditions?: {
    showIf?: FieldCondition[];
    hideIf?: FieldCondition[];
  };
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

// General Fields - Form Field Library (not tied to Hubify system)
const GeneralFields: FormFieldOption[] = [
  { label: 'Short Text', type: 'text', required: false, profileFieldKey: 'general_text', icon: <Type className="w-4 h-4" />, placeholder: 'Enter text' },
  { label: 'Paragraph Text', type: 'textarea', required: false, profileFieldKey: 'general_paragraph', icon: <AlignLeft className="w-4 h-4" />, placeholder: 'Enter detailed response' },
  { label: 'Dropdown', type: 'select', required: false, profileFieldKey: 'general_dropdown', icon: <List className="w-4 h-4" />, options: ['Option 1', 'Option 2', 'Option 3'] },
  { label: 'Checkbox Group', type: 'checkbox', required: false, profileFieldKey: 'general_checkbox', icon: <CheckSquare className="w-4 h-4" />, options: ['Choice 1', 'Choice 2', 'Choice 3'] },
  { label: 'Radio Buttons', type: 'radio', required: false, profileFieldKey: 'general_radio', icon: <Circle className="w-4 h-4" />, options: ['Yes', 'No'] },
  { label: 'Date Picker', type: 'date', required: false, profileFieldKey: 'general_date', icon: <Calendar className="w-4 h-4" /> },
  { label: 'Date & Time Picker', type: 'datetime', required: false, profileFieldKey: 'general_datetime', icon: <Clock className="w-4 h-4" /> },
  { label: 'Number Field', type: 'number', required: false, profileFieldKey: 'general_number', icon: <Hash className="w-4 h-4" />, placeholder: 'Enter number' },
  { label: 'Email', type: 'email', required: false, profileFieldKey: 'general_email', icon: <Mail className="w-4 h-4" />, placeholder: 'email@example.com' },
  { label: 'Phone', type: 'tel', required: false, profileFieldKey: 'general_phone', icon: <Phone className="w-4 h-4" />, placeholder: '(555) 123-4567' },
  { label: 'File Upload', type: 'file', required: false, profileFieldKey: 'general_file', icon: <Upload className="w-4 h-4" /> },
  { label: 'Signature', type: 'signature', required: false, profileFieldKey: 'general_signature', icon: <PenTool className="w-4 h-4" /> },
  { label: 'Section Header', type: 'heading', required: false, profileFieldKey: 'general_heading', icon: <Heading2 className="w-4 h-4" />, placeholder: 'Section Title' },
];

// System-Linked Fields - Hubify Fields (tied to database entities)
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

// Conditional Logic Editor Component
interface ConditionalLogicEditorProps {
  fieldIndex: number;
  field: FormFieldOption;
  allFields: FormFieldOption[];
  onUpdateField: (index: number, updates: Partial<FormFieldOption>) => void;
}

const ConditionalLogicEditor: React.FC<ConditionalLogicEditorProps> = ({
  fieldIndex,
  field,
  allFields,
  onUpdateField
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [conditionType, setConditionType] = useState<'showIf' | 'hideIf'>('showIf');
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [operator, setOperator] = useState<'equals' | 'not_equals' | 'contains'>('equals');
  const [value, setValue] = useState('');

  // Get other fields (excluding current field)
  const availableFields = allFields.filter((_, idx) => idx !== fieldIndex);

  const addCondition = () => {
    if (!selectedFieldId || !value) return;

    const newCondition: FieldCondition = {
      fieldId: selectedFieldId,
      operator,
      value
    };

    const currentConditions = field.conditions || { showIf: [], hideIf: [] };
    const updatedConditions = {
      ...currentConditions,
      [conditionType]: [...(currentConditions[conditionType] || []), newCondition]
    };

    onUpdateField(fieldIndex, { conditions: updatedConditions });
    
    // Reset form
    setSelectedFieldId('');
    setValue('');
    setShowDialog(false);
  };

  const removeCondition = (type: 'showIf' | 'hideIf', index: number) => {
    const currentConditions = field.conditions || { showIf: [], hideIf: [] };
    const updatedConditions = {
      ...currentConditions,
      [type]: currentConditions[type]?.filter((_, i) => i !== index) || []
    };
    onUpdateField(fieldIndex, { conditions: updatedConditions });
  };

  const hasConditions = (field.conditions?.showIf?.length || 0) + (field.conditions?.hideIf?.length || 0) > 0;

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-700">Conditional Logic</span>
          {hasConditions && (
            <Badge variant="secondary" className="text-xs">
              {(field.conditions?.showIf?.length || 0) + (field.conditions?.hideIf?.length || 0)} rules
            </Badge>
          )}
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              data-testid={`add-condition-btn-${fieldIndex}`}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Conditional Logic Rule</DialogTitle>
              <DialogDescription>
                Control when this field is shown or hidden based on other field values
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rule Type</Label>
                <Select value={conditionType} onValueChange={(v: 'showIf' | 'hideIf') => setConditionType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="showIf">Show this field if...</SelectItem>
                    <SelectItem value="hideIf">Hide this field if...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>When Field</Label>
                <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((f, idx) => (
                      <SelectItem key={idx} value={f.profileFieldKey}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Operator</Label>
                <Select value={operator} onValueChange={(v: 'equals' | 'not_equals' | 'contains') => setOperator(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Does not equal</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Value</Label>
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter comparison value"
                  data-testid="condition-value-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={addCondition}
                disabled={!selectedFieldId || !value}
                data-testid="save-condition-btn"
              >
                Add Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Display existing conditions */}
      {hasConditions && (
        <div className="space-y-2">
          {field.conditions?.showIf?.map((condition, idx) => {
            const relatedField = allFields.find(f => f.profileFieldKey === condition.fieldId);
            return (
              <div key={`show-${idx}`} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800">Show</Badge>
                  <span>
                    when <strong>{relatedField?.label || condition.fieldId}</strong> {' '}
                    {condition.operator.replace('_', ' ')} {' '}
                    <strong>{condition.value}</strong>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCondition('showIf', idx)}
                  className="h-6 w-6 p-0"
                  data-testid={`remove-show-condition-${idx}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
          {field.conditions?.hideIf?.map((condition, idx) => {
            const relatedField = allFields.find(f => f.profileFieldKey === condition.fieldId);
            return (
              <div key={`hide-${idx}`} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-100 text-red-800">Hide</Badge>
                  <span>
                    when <strong>{relatedField?.label || condition.fieldId}</strong> {' '}
                    {condition.operator.replace('_', ' ')} {' '}
                    <strong>{condition.value}</strong>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCondition('hideIf', idx)}
                  className="h-6 w-6 p-0"
                  data-testid={`remove-hide-condition-${idx}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
          <div className="flex items-center space-x-3">
            <Label>Allow Multiple Submissions</Label>
            <Switch
              checked={formSchema.allowMultipleSubmissions}
              onCheckedChange={(checked) => updateFormSchema({ allowMultipleSubmissions: checked })}
            />
          </div>
          
          <div className="flex items-center space-x-3">
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

export default function FormBuilder({ onSave, initialForm }: FormBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formSchema, setFormSchema] = useState<FormSchema>({
    formTitle: initialForm?.formTitle || '',
    exteriorName: initialForm?.exteriorName || '',
    internalDescription: initialForm?.internalDescription || '',
    exteriorDescription: initialForm?.exteriorDescription || '',
    slug: initialForm?.slug || '',
    contexts: initialForm?.contexts ? (Array.isArray(initialForm.contexts) ? initialForm.contexts : ['people']) : ['people'],
    fields: initialForm?.fields || [],
    allowMultipleSubmissions: initialForm?.allowMultipleSubmissions || false,
    matchExistingBy: initialForm?.matchExistingBy || 'email',
    triggerAutomation: initialForm?.triggerAutomation || false,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [persistedSlug, setPersistedSlug] = useState(initialForm?.slug || '');

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

    // Only allow dropping into form-fields
    if (destination.droppableId !== 'form-fields') return;

    if (source.droppableId === 'general-fields' && destination.droppableId === 'form-fields') {
      // Add general field from library to form
      const fieldToAdd = GeneralFields[source.index];
      const newField = {
        ...fieldToAdd,
        id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        profileFieldKey: `${fieldToAdd.profileFieldKey}_${Date.now()}` // Make unique
      };
      
      const newFields = [...formSchema.fields];
      newFields.splice(destination.index, 0, newField);
      
      setFormSchema(prev => ({ ...prev, fields: newFields }));
    } else if (source.droppableId === 'available-fields' && destination.droppableId === 'form-fields') {
      // Add system-linked field to form
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
        slug: formData.slug,
        description: formData.internalDescription,
        contexts: formData.contexts,
        schema: {
          fields: formData.fields.map(field => ({
            id: field.profileFieldKey,
            label: field.label,
            type: field.type,
            required: field.required,
            options: field.options,
            profileFieldKey: field.profileFieldKey,
            conditions: field.conditions
          })),
          allowMultipleSubmissions: formData.allowMultipleSubmissions,
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
      setPersistedSlug(formSchema.slug);
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

  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/forms/${persistedSlug}`;
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Link Copied",
      description: "Public form link copied to clipboard.",
    });
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
          <Button variant="outline" onClick={() => setShowPreview(true)} data-testid="button-preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveFormMutation.isPending}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-save-form"
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

      {/* Public Link Section */}
      {persistedSlug && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Public Form Link</p>
                  <p className="text-sm text-slate-600 font-mono">
                    {window.location.origin}/forms/{persistedSlug}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPublicLink}
                  data-testid="button-copy-public-link"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/forms/${persistedSlug}`, '_blank')}
                  data-testid="button-open-public-link"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Configuration */}
          <div className="lg:col-span-1 space-y-4">
            {/* Form Field Library - General Fields */}
            <Card>
              <Collapsible defaultOpen={true}>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                    <div>
                      <CardTitle className="flex items-center text-base">
                        <FileText className="w-4 h-4 mr-2" />
                        Form Field Library
                      </CardTitle>
                      <p className="text-xs text-gray-600 mt-1 text-left">General-purpose form inputs</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Droppable droppableId="general-fields" isDropDisabled={true}>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2"
                        >
                          {GeneralFields.map((field, index) => (
                            <Draggable
                              key={`general-${field.profileFieldKey}`}
                              draggableId={`general-${field.profileFieldKey}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex items-center p-2.5 border rounded-lg cursor-move hover:bg-slate-50 ${
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
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* System-Linked Fields - Hubify Fields */}
            <Card>
              <Collapsible defaultOpen={true}>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                    <div>
                      <CardTitle className="flex items-center text-base">
                        <Link className="w-4 h-4 mr-2" />
                        System-Linked Fields
                      </CardTitle>
                      <p className="text-xs text-gray-600 mt-1 text-left">
                        {formSchema.contexts.length > 0 
                          ? `${formSchema.contexts.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')} fields`
                          : 'Select contexts above'}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Droppable droppableId="available-fields" isDropDisabled={true}>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2"
                        >
                          {getAvailableFields(formSchema.contexts).map((field, index) => (
                            <Draggable
                              key={`system-${field.profileFieldKey}`}
                              draggableId={`system-${field.profileFieldKey}`}
                              index={index + GeneralFields.length}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex items-center p-2.5 border rounded-lg cursor-move hover:bg-slate-50 ${
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
                </CollapsibleContent>
              </Collapsible>
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
                                        
                                        {/* Conditional Logic Section */}
                                        <ConditionalLogicEditor
                                          fieldIndex={index}
                                          field={field}
                                          allFields={formSchema.fields}
                                          onUpdateField={updateField}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={field.required}
                                      onCheckedChange={(checked) => updateField(index, { required: checked })}
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