import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface CustomField {
  id: number;
  fieldKey: string;
  fieldName: string;
  fieldType: "text"|"textarea"|"number"|"date"|"select"|"multiselect"|"checkbox";
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: string[] | null;
}

interface CustomFieldsRendererProps {
  fields: CustomField[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  mode?: "edit" | "view";
  className?: string;
}

export function CustomFieldsRenderer({
  fields,
  values,
  onChange,
  mode = "edit",
  className = "",
}: CustomFieldsRendererProps) {
  if (fields.length === 0) {
    return null;
  }

  const handleChange = (fieldKey: string, value: any) => {
    onChange({
      ...values,
      [fieldKey]: value,
    });
  };

  const renderField = (field: CustomField) => {
    const value = values[field.fieldKey];

    // View mode - display values
    if (mode === "view") {
      return (
        <div key={field.id} className="space-y-1">
          <Label className="text-sm font-medium text-slate-700">{field.fieldName}</Label>
          <div className="text-sm text-slate-900">
            {field.fieldType === "checkbox" ? (
              value ? (
                <Badge variant="secondary">Yes</Badge>
              ) : (
                <Badge variant="outline">No</Badge>
              )
            ) : field.fieldType === "multiselect" && Array.isArray(value) ? (
              value.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {value.map((v, i) => (
                    <Badge key={i} variant="outline">{v}</Badge>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500">—</span>
              )
            ) : value ? (
              <span>{String(value)}</span>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </div>
        </div>
      );
    }

    // Edit mode - form inputs
    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={`custom-field-${field.fieldKey}`}>
          {field.fieldName}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        {field.helpText && (
          <p className="text-xs text-slate-500">{field.helpText}</p>
        )}

        {field.fieldType === "text" && (
          <Input
            id={`custom-field-${field.fieldKey}`}
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            placeholder={field.placeholder || ""}
            required={field.required}
            data-testid={`input-custom-${field.fieldKey}`}
          />
        )}

        {field.fieldType === "textarea" && (
          <Textarea
            id={`custom-field-${field.fieldKey}`}
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            placeholder={field.placeholder || ""}
            required={field.required}
            rows={3}
            data-testid={`textarea-custom-${field.fieldKey}`}
          />
        )}

        {field.fieldType === "number" && (
          <Input
            id={`custom-field-${field.fieldKey}`}
            type="number"
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value ? Number(e.target.value) : "")}
            placeholder={field.placeholder || ""}
            required={field.required}
            data-testid={`input-custom-${field.fieldKey}`}
          />
        )}

        {field.fieldType === "date" && (
          <Input
            id={`custom-field-${field.fieldKey}`}
            type="date"
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            required={field.required}
            data-testid={`input-custom-${field.fieldKey}`}
          />
        )}

        {field.fieldType === "select" && (
          <Select 
            value={value || ""} 
            onValueChange={(v) => handleChange(field.fieldKey, v)}
          >
            <SelectTrigger data-testid={`select-custom-${field.fieldKey}`}>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.fieldType === "multiselect" && (
          <div className="space-y-2 border rounded-md p-3">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`custom-field-${field.fieldKey}-${index}`}
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (checked) {
                      handleChange(field.fieldKey, [...currentValues, option]);
                    } else {
                      handleChange(field.fieldKey, currentValues.filter(v => v !== option));
                    }
                  }}
                  data-testid={`checkbox-custom-${field.fieldKey}-${index}`}
                />
                <Label 
                  htmlFor={`custom-field-${field.fieldKey}-${index}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        )}

        {field.fieldType === "checkbox" && (
          <div className="flex items-center space-x-2">
            <Switch
              id={`custom-field-${field.fieldKey}`}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(field.fieldKey, checked)}
              data-testid={`switch-custom-${field.fieldKey}`}
            />
            <Label htmlFor={`custom-field-${field.fieldKey}`} className="text-sm font-normal">
              {field.placeholder || `Enable ${field.fieldName}`}
            </Label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {mode === "edit" && fields.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Custom Fields</h3>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(renderField)}
      </div>
    </div>
  );
}
