import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, Eye, EyeOff, Upload, PenTool } from 'lucide-react';

interface FormField {
  id: number;
  label: string;
  type: string;
  required: boolean;
  context: string;
  options?: string[];
  conditions?: {
    showIf?: { fieldId: number; operator: string; value: string }[];
    hideIf?: { fieldId: number; operator: string; value: string }[];
  };
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    fileTypes?: string[];
    maxFileSize?: number;
  };
}

interface EnhancedFormBuilderProps {
  initialFields?: FormField[];
  onSave: (formData: { title: string; slug: string; contexts: string[]; fields: FormField[] }) => void;
}

export function EnhancedFormBuilder({ initialFields = [], onSave }: EnhancedFormBuilderProps) {
  const [formTitle, setFormTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [selectedContexts, setSelectedContexts] = useState<string[]>(['people']);
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkboxes' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'file', label: 'File Upload' },
    { value: 'signature', label: 'E-Signature' },
  ];

  const contexts = [
    { value: 'people', label: 'People/Contacts' },
    { value: 'property', label: 'Properties' },
    { value: 'task', label: 'Tasks/Services' },
  ];

  const addField = (context: string) => {
    const newField: FormField = {
      id: Date.now(),
      label: 'New Field',
      type: 'text',
      required: false,
      context,
    };
    setFields([...fields, newField]);
    setEditingField(newField);
  };

  const updateField = (fieldId: number, updates: Partial<FormField>) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
    if (editingField && editingField.id === fieldId) {
      setEditingField({ ...editingField, ...updates });
    }
  };

  const removeField = (fieldId: number) => {
    setFields(fields.filter(field => field.id !== fieldId));
    if (editingField && editingField.id === fieldId) {
      setEditingField(null);
    }
  };

  const addCondition = (fieldId: number, type: 'showIf' | 'hideIf') => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const newCondition = { fieldId: 0, operator: 'equals', value: '' };
    const updatedConditions = {
      ...field.conditions,
      [type]: [...(field.conditions?.[type] || []), newCondition]
    };
    
    updateField(fieldId, { conditions: updatedConditions });
  };

  const handleSave = () => {
    onSave({
      title: formTitle,
      slug: slug,
      contexts: selectedContexts,
      fields: fields
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Form Title</Label>
                <Input
                  id="title"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  placeholder="Enter form title"
                />
              </div>
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="form-url-slug"
                />
              </div>
              <div>
                <Label>Form Contexts</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {contexts.map(context => (
                    <div key={context.value} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedContexts.includes(context.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedContexts([...selectedContexts, context.value]);
                          } else {
                            setSelectedContexts(selectedContexts.filter(c => c !== context.value));
                          }
                        }}
                      />
                      <label className="text-sm">{context.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Form Fields</h3>
            <Tabs defaultValue={selectedContexts[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {selectedContexts.map(context => (
                  <TabsTrigger key={context} value={context}>
                    {contexts.find(c => c.value === context)?.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {selectedContexts.map(context => (
                <TabsContent key={context} value={context} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">
                      {contexts.find(c => c.value === context)?.label} Fields
                    </h4>
                    <Button
                      onClick={() => addField(context)}
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Field</span>
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {fields.filter(field => field.context === context).map(field => (
                      <Card key={field.id} className="relative">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="outline">{field.type}</Badge>
                                {field.required && <Badge variant="secondary">Required</Badge>}
                                {field.conditions && <Badge variant="outline">Conditional</Badge>}
                              </div>
                              <h5 className="font-medium">{field.label}</h5>
                              {field.options && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Options: {field.options.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingField(field)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeField(field.id)}
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review & Save</h3>
            <Card>
              <CardHeader>
                <CardTitle>{formTitle}</CardTitle>
                <p className="text-sm text-gray-600">Slug: {slug}</p>
                <div className="flex space-x-2">
                  {selectedContexts.map(context => (
                    <Badge key={context} variant="outline">
                      {contexts.find(c => c.value === context)?.label}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-medium">Fields ({fields.length})</h4>
                  {fields.map(field => (
                    <div key={field.id} className="flex justify-between items-center p-2 border rounded">
                      <span>{field.label}</span>
                      <div className="flex space-x-1">
                        <Badge variant="outline" className="text-xs">{field.type}</Badge>
                        <Badge variant="outline" className="text-xs">{field.context}</Badge>
                        {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Step Navigation */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map(step => (
            <div
              key={step}
              className={`flex items-center space-x-2 ${
                step === currentStep ? 'text-blue-600' : 
                step < currentStep ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                step === currentStep ? 'border-blue-600 bg-blue-50' : 
                step < currentStep ? 'border-green-600 bg-green-50' : 'border-gray-300'
              }`}>
                {step}
              </div>
              <span className="text-sm font-medium">
                {step === 1 && 'Basic Info'}
                {step === 2 && 'Fields'}
                {step === 3 && 'Review'}
              </span>
              {step < 3 && <div className="w-8 border-t border-gray-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Form Builder */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>

        {/* Field Editor Sidebar */}
        {editingField && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Field Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Field Label</Label>
                  <Input
                    value={editingField.label}
                    onChange={(e) => updateField(editingField.id, { label: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Field Type</Label>
                  <Select
                    value={editingField.type}
                    onValueChange={(value) => updateField(editingField.id, { type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={editingField.required}
                    onCheckedChange={(checked) => updateField(editingField.id, { required: !!checked })}
                  />
                  <Label>Required field</Label>
                </div>

                {(editingField.type === 'select' || editingField.type === 'checkbox') && (
                  <div>
                    <Label>Options (one per line)</Label>
                    <Textarea
                      value={editingField.options?.join('\n') || ''}
                      onChange={(e) => updateField(editingField.id, { 
                        options: e.target.value.split('\n').filter(opt => opt.trim()) 
                      })}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}

                {editingField.type === 'file' && (
                  <div className="space-y-2">
                    <Label>File Settings</Label>
                    <Input
                      placeholder="Allowed file types (e.g., .jpg,.png,.pdf)"
                      value={editingField.validation?.fileTypes?.join(',') || ''}
                      onChange={(e) => updateField(editingField.id, {
                        validation: {
                          ...editingField.validation,
                          fileTypes: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                        }
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max file size (MB)"
                      value={editingField.validation?.maxFileSize || ''}
                      onChange={(e) => updateField(editingField.id, {
                        validation: {
                          ...editingField.validation,
                          maxFileSize: parseInt(e.target.value) || undefined
                        }
                      })}
                    />
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-medium">Conditional Logic</Label>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCondition(editingField.id, 'showIf')}
                      className="w-full justify-start"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Show if...
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCondition(editingField.id, 'hideIf')}
                      className="w-full justify-start"
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide if...
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        <div className="flex space-x-2">
          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
              disabled={currentStep === 1 && (!formTitle || !slug)}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Save Form
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}