import { useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check } from 'lucide-react';

interface ConditionalFormFieldProps {
  field: {
    id: number | string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    allowOther?: boolean;
    conditions?: {
      showIf?: { fieldId: number | string; operator: 'equals' | 'not_equals' | 'contains'; value: string }[];
      hideIf?: { fieldId: number | string; operator: 'equals' | 'not_equals' | 'contains'; value: string }[];
    };
    validation?: {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      fileTypes?: string[];
      maxFileSize?: number;
    };
  };
  formData: Record<string, any>;
  onChange: (fieldId: number | string, value: any) => void;
  control: any;
}

export function ConditionalFormField({ field, formData, onChange, control }: ConditionalFormFieldProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [signatureData, setSignatureData] = useState<string>('');
  const [otherText, setOtherText] = useState<string>('');

  // Initialize otherText from formData if value starts with "Other:"
  useEffect(() => {
    const currentValue = formData[field.id];
    if (typeof currentValue === 'string' && currentValue.startsWith('Other: ')) {
      setOtherText(currentValue.replace('Other: ', ''));
    } else if (Array.isArray(currentValue)) {
      const otherValue = currentValue.find((v: string) => v.startsWith('Other: '));
      if (otherValue) {
        setOtherText(otherValue.replace('Other: ', ''));
      }
    }
  }, [field.id, formData]);

  // Check conditional visibility
  useEffect(() => {
    let shouldShow = true;

    if (field.conditions?.showIf) {
      shouldShow = field.conditions.showIf.some(condition => 
        evaluateCondition(condition, formData)
      );
    }

    if (field.conditions?.hideIf) {
      const shouldHide = field.conditions.hideIf.some(condition => 
        evaluateCondition(condition, formData)
      );
      if (shouldHide) shouldShow = false;
    }

    setIsVisible(shouldShow);
  }, [field.conditions, formData]);

  const evaluateCondition = (condition: any, data: Record<string, any>) => {
    const fieldValue = data[condition.fieldId]?.toString() || '';
    const targetValue = condition.value.toString();

    switch (condition.operator) {
      case 'equals':
        return fieldValue === targetValue;
      case 'not_equals':
        return fieldValue !== targetValue;
      case 'contains':
        return fieldValue.includes(targetValue);
      default:
        return false;
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => {
      if (field.validation?.fileTypes) {
        const fileType = file.type || file.name.split('.').pop() || '';
        return field.validation.fileTypes.some(type => 
          fileType.includes(type) || file.name.endsWith(type)
        );
      }
      return true;
    }).filter(file => {
      if (field.validation?.maxFileSize) {
        return file.size <= field.validation.maxFileSize * 1024 * 1024; // Convert MB to bytes
      }
      return true;
    });

    setUploadedFiles(validFiles);
    onChange(field.id, validFiles);
  };

  const initSignaturePad = () => {
    // Simple signature implementation - in production, use a proper signature pad library
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    canvas.style.border = '1px solid #ccc';
    canvas.style.borderRadius = '4px';
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    let isDrawing = false;

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (isDrawing && ctx) {
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
      }
    });

    canvas.addEventListener('mouseup', () => {
      isDrawing = false;
      const signature = canvas.toDataURL();
      setSignatureData(signature);
      onChange(field.id, signature);
    });

    return canvas;
  };

  if (!isVisible) return null;

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <FormField
            control={control}
            name={field.id.toString()}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    type={field.type}
                    required={field.required}
                    minLength={field.validation?.minLength}
                    maxLength={field.validation?.maxLength}
                    pattern={field.validation?.pattern}
                    onChange={(e) => {
                      formField.onChange(e);
                      onChange(field.id, e.target.value);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );

      case 'textarea':
        return (
          <FormField
            control={control}
            name={field.id.toString()}
            render={({ field: formField }) => (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  {...formField}
                  required={field.required}
                  minLength={field.validation?.minLength}
                  maxLength={field.validation?.maxLength}
                  onChange={(e) => {
                    formField.onChange(e);
                    onChange(field.id, e.target.value);
                  }}
                />
              </div>
            )}
          />
        );

      case 'select':
        return (
          <FormField
            control={control}
            name={field.id.toString()}
            render={({ field: formField }) => {
              // Normalize value: if it starts with "Other:", map to "__other__"
              const displayValue = formField.value?.startsWith?.('Other: ') ? '__other__' : formField.value;
              const showOtherInput = displayValue === '__other__';
              
              return (
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <Select
                    value={displayValue}
                    onValueChange={(value) => {
                      if (value === '__other__') {
                        formField.onChange('__other__');
                        onChange(field.id, '__other__');
                      } else {
                        formField.onChange(value);
                        onChange(field.id, value);
                        setOtherText('');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                      {field.allowOther && (
                        <SelectItem value="__other__">Other</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {field.allowOther && showOtherInput && (
                    <Input
                      placeholder="Please specify..."
                      value={otherText}
                      onChange={(e) => {
                        setOtherText(e.target.value);
                        const newValue = e.target.value ? `Other: ${e.target.value}` : '__other__';
                        formField.onChange(newValue);
                        onChange(field.id, newValue);
                      }}
                      className="mt-2"
                    />
                  )}
                </div>
              );
            }}
          />
        );

      case 'radio':
        return (
          <FormField
            control={control}
            name={field.id.toString()}
            render={({ field: formField }) => {
              const isOtherSelected = formField.value === '__other__' || formField.value?.startsWith?.('Other: ');
              
              return (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name={field.id.toString()}
                        value={option}
                        checked={formField.value === option}
                        onChange={(e) => {
                          formField.onChange(e.target.value);
                          onChange(field.id, e.target.value);
                          setOtherText('');
                        }}
                        className="w-4 h-4"
                      />
                      <label className="text-sm cursor-pointer">{option}</label>
                    </div>
                  ))}
                  {field.allowOther && (
                    <>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={field.id.toString()}
                          value="__other__"
                          checked={isOtherSelected}
                          onChange={(e) => {
                            formField.onChange('__other__');
                            onChange(field.id, '__other__');
                          }}
                          className="w-4 h-4"
                        />
                        <label className="text-sm cursor-pointer">Other</label>
                      </div>
                      {isOtherSelected && (
                        <Input
                          placeholder="Please specify..."
                          value={otherText}
                          onChange={(e) => {
                            setOtherText(e.target.value);
                            const newValue = e.target.value ? `Other: ${e.target.value}` : '__other__';
                            formField.onChange(newValue);
                            onChange(field.id, newValue);
                          }}
                          className="ml-6"
                        />
                      )}
                    </>
                  )}
                </div>
              );
            }}
          />
        );

      case 'checkbox':
        return (
          <FormField
            control={control}
            name={field.id.toString()}
            render={({ field: formField }) => {
              // Check if "Other" is selected (either "__other__" sentinel or "Other: text")
              const hasOtherValue = formField.value?.some((v: string) => v === '__other__' || v?.startsWith?.('Other: '));
              
              return (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formField.value?.includes(option)}
                        onCheckedChange={(checked) => {
                          const currentValues = formField.value || [];
                          let newValues;
                          if (checked) {
                            newValues = [...currentValues, option];
                          } else {
                            newValues = currentValues.filter((v: string) => v !== option);
                          }
                          formField.onChange(newValues);
                          onChange(field.id, newValues);
                        }}
                      />
                      <label className="text-sm">{option}</label>
                    </div>
                  ))}
                  {field.allowOther && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hasOtherValue}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Add "__other__" as placeholder
                              const currentValues = (formField.value || []).filter((v: string) => !v.startsWith('Other: '));
                              const newValues = [...currentValues, '__other__'];
                              formField.onChange(newValues);
                              onChange(field.id, newValues);
                            } else {
                              // Remove all "Other" values
                              const newValues = (formField.value || []).filter((v: string) => v !== '__other__' && !v.startsWith('Other: '));
                              setOtherText('');
                              formField.onChange(newValues);
                              onChange(field.id, newValues);
                            }
                          }}
                        />
                        <label className="text-sm">Other</label>
                      </div>
                      {hasOtherValue && (
                        <Input
                          placeholder="Please specify..."
                          value={otherText}
                          onChange={(e) => {
                            setOtherText(e.target.value);
                            // Remove "__other__" sentinel and any existing "Other: " values
                            const baseValues = (formField.value || []).filter(
                              (v: string) => v !== '__other__' && !v.startsWith('Other: ')
                            );
                            const newValues = e.target.value 
                              ? [...baseValues, `Other: ${e.target.value}`]
                              : [...baseValues, '__other__']; // Keep sentinel if no text yet
                            formField.onChange(newValues);
                            onChange(field.id, newValues);
                          }}
                          className="ml-6"
                        />
                      )}
                    </>
                  )}
                </div>
              );
            }}
          />
        );

      case 'file':
        return (
          <div>
            <label className="block text-sm font-medium mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept={field.validation?.fileTypes?.join(',')}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id={`file-${field.id}`}
              />
              <label
                htmlFor={`file-${field.id}`}
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </span>
                {field.validation?.fileTypes && (
                  <span className="text-xs text-gray-500">
                    Supported: {field.validation.fileTypes.join(', ')}
                  </span>
                )}
                {field.validation?.maxFileSize && (
                  <span className="text-xs text-gray-500">
                    Max size: {field.validation.maxFileSize}MB
                  </span>
                )}
              </label>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <FileText className="h-4 w-4" />
                    <span>{file.name}</span>
                    <span className="text-gray-500">({Math.round(file.size / 1024)}KB)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'signature':
        return (
          <div>
            <label className="block text-sm font-medium mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              <div 
                className="border border-gray-300 rounded-lg p-2 bg-white"
                ref={(div) => {
                  if (div && !div.querySelector('canvas')) {
                    const canvas = initSignaturePad();
                    div.appendChild(canvas);
                  }
                }}
              />
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const canvas = document.querySelector(`canvas`) as HTMLCanvasElement;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        setSignatureData('');
                        onChange(field.id, '');
                      }
                    }
                  }}
                >
                  Clear
                </Button>
                {signatureData && (
                  <div className="flex items-center space-x-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>Signature captured</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-medium mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <Input
              type="text"
              required={field.required}
              onChange={(e) => onChange(field.id, e.target.value)}
            />
          </div>
        );
    }
  };

  return <div className="mb-4">{renderField()}</div>;
}