import { useState } from 'react';
import Papa from 'papaparse';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, ArrowRight, CheckCircle2, MapPin, AlertTriangle, Download, X, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ParsedData {
  columns: string[];
  rows: any[];
}

interface FieldMapping {
  [csvColumn: string]: string; // Maps CSV column to database field
}

interface ValidationIssue {
  row: number;
  field: string;
  type: 'error' | 'warning';
  message: string;
}

interface ValidationResult {
  issues: ValidationIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

interface ImportSummary {
  totalRecords: number;
  newRecords: number;
  updates: number;
  skipped: number;
}

interface ImportResult {
  row: number;
  status: 'success' | 'failed' | 'skipped';
  action: 'created' | 'updated' | 'skipped';
  message?: string;
  recordId?: number;
}

interface ImportExecutionResults {
  summary: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    skipped: number;
  };
  results: ImportResult[];
}

type EntityType = 'properties' | 'contacts' | 'tasks';
type ImportStep = 'upload' | 'map' | 'validate' | 'preview' | 'importing' | 'complete';

interface FieldDefinition {
  name: string;
  label: string;
  required: boolean;
  type?: 'text' | 'number' | 'email' | 'date';
  uniqueKey?: boolean; // For duplicate detection
}

const ENTITY_FIELDS: Record<EntityType, FieldDefinition[]> = {
  properties: [
    { name: 'name', label: 'Property Name', required: true, type: 'text' },
    { name: 'address1', label: 'Address Line 1', required: true, type: 'text' },
    { name: 'address2', label: 'Address Line 2', required: false, type: 'text' },
    { name: 'city', label: 'City', required: true, type: 'text' },
    { name: 'state', label: 'State', required: true, type: 'text' },
    { name: 'zip', label: 'ZIP Code', required: true, type: 'text' },
    { name: 'type', label: 'Property Type', required: true, type: 'text' },
    { name: 'accountId', label: 'Account ID', required: false, type: 'text', uniqueKey: true },
    { name: 'units', label: 'Number of Units', required: false, type: 'number' },
    { name: 'squareFootage', label: 'Square Footage', required: false, type: 'number' },
    { name: 'status', label: 'Status', required: false, type: 'text' },
  ],
  contacts: [
    { name: 'firstName', label: 'First Name', required: true, type: 'text' },
    { name: 'lastName', label: 'Last Name', required: true, type: 'text' },
    { name: 'email', label: 'Email', required: false, type: 'email', uniqueKey: true },
    { name: 'phone', label: 'Phone', required: false, type: 'text' },
    { name: 'type', label: 'Contact Type', required: true, type: 'text' },
    { name: 'accountId', label: 'Account ID', required: false, type: 'text', uniqueKey: true },
    { name: 'notes', label: 'Notes', required: false, type: 'text' },
  ],
  tasks: [
    { name: 'title', label: 'Task Title', required: true, type: 'text' },
    { name: 'description', label: 'Description', required: false, type: 'text' },
    { name: 'priority', label: 'Priority', required: false, type: 'text' },
    { name: 'status', label: 'Status', required: false, type: 'text' },
    { name: 'category', label: 'Category', required: false, type: 'text' },
    { name: 'dueDate', label: 'Due Date', required: false, type: 'date' },
    { name: 'timeEstimate', label: 'Time Estimate', required: false, type: 'text' },
  ],
};

export default function ImportManager() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [editedRows, setEditedRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [entityType, setEntityType] = useState<EntityType>('properties');
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importResults, setImportResults] = useState<ImportExecutionResults | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setParsedData(null);
      setCurrentStep('upload');
      setFieldMapping({});
      setValidationResult(null);
      setEditedRows([]);
    }
  };

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateNumber = (value: string): boolean => {
    return !isNaN(Number(value)) && value.trim() !== '';
  };

  const validateDate = (value: string): boolean => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  };

  const validateData = (rows: any[], mapping: FieldMapping, entityType: EntityType): ValidationResult => {
    const issues: ValidationIssue[] = [];
    const fields = ENTITY_FIELDS[entityType];
    
    // Get mapped fields
    const mappedFields = Object.entries(mapping)
      .filter(([_, dbField]) => dbField !== '__skip__')
      .reduce((acc, [csvCol, dbField]) => {
        acc[dbField] = csvCol;
        return acc;
      }, {} as Record<string, string>);

    // Track values for duplicate detection
    const uniqueKeyValues: Record<string, Set<string>> = {};
    fields.filter(f => f.uniqueKey).forEach(f => {
      uniqueKeyValues[f.name] = new Set();
    });

    rows.forEach((row, rowIndex) => {
      fields.forEach(field => {
        const csvColumn = mappedFields[field.name];
        if (!csvColumn) return;

        const value = row[csvColumn];
        const trimmedValue = value?.toString().trim() || '';

        // Check required fields
        if (field.required && !trimmedValue) {
          issues.push({
            row: rowIndex,
            field: field.name,
            type: 'error',
            message: `${field.label} is required but missing`
          });
        }

        // Check data types
        if (trimmedValue) {
          if (field.type === 'email' && !validateEmail(trimmedValue)) {
            issues.push({
              row: rowIndex,
              field: field.name,
              type: 'error',
              message: `Invalid email format: ${trimmedValue}`
            });
          }

          if (field.type === 'number' && !validateNumber(trimmedValue)) {
            issues.push({
              row: rowIndex,
              field: field.name,
              type: 'error',
              message: `Expected a number but got: ${trimmedValue}`
            });
          }

          if (field.type === 'date' && !validateDate(trimmedValue)) {
            issues.push({
              row: rowIndex,
              field: field.name,
              type: 'error',
              message: `Invalid date format: ${trimmedValue}`
            });
          }
        }

        // Check for duplicates within CSV
        if (field.uniqueKey && trimmedValue) {
          if (uniqueKeyValues[field.name].has(trimmedValue.toLowerCase())) {
            issues.push({
              row: rowIndex,
              field: field.name,
              type: 'warning',
              message: `Duplicate ${field.label}: ${trimmedValue}`
            });
          } else {
            uniqueKeyValues[field.name].add(trimmedValue.toLowerCase());
          }
        }
      });
    });

    return {
      issues,
      hasErrors: issues.some(i => i.type === 'error'),
      hasWarnings: issues.some(i => i.type === 'warning')
    };
  };

  // Auto-suggest field mapping based on column name similarity
  const suggestFieldMapping = (columns: string[], entityType: EntityType): FieldMapping => {
    const mapping: FieldMapping = {};
    const fields = ENTITY_FIELDS[entityType];

    columns.forEach(column => {
      const normalizedColumn = column.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Try exact match first
      const exactMatch = fields.find(
        f => f.name.toLowerCase() === normalizedColumn
      );
      if (exactMatch) {
        mapping[column] = exactMatch.name;
        return;
      }

      // Try partial match
      const partialMatch = fields.find(f => {
        const normalizedField = f.name.toLowerCase();
        return normalizedColumn.includes(normalizedField) || normalizedField.includes(normalizedColumn);
      });
      if (partialMatch) {
        mapping[column] = partialMatch.name;
        return;
      }

      // Common name variations
      const nameVariations: Record<string, string[]> = {
        firstName: ['firstname', 'fname', 'givenname', 'first'],
        lastName: ['lastname', 'lname', 'surname', 'last'],
        email: ['emailaddress', 'mail', 'contact'],
        phone: ['phonenumber', 'telephone', 'mobile', 'cell'],
        address1: ['address', 'street', 'streetaddress', 'addr'],
        city: ['municipality', 'town'],
        state: ['province', 'region'],
        zip: ['zipcode', 'postalcode', 'postal'],
        type: ['category', 'kind'],
        title: ['name', 'subject', 'task'],
      };

      for (const [field, variations] of Object.entries(nameVariations)) {
        if (variations.some(v => normalizedColumn.includes(v) || v.includes(normalizedColumn))) {
          const matchedField = fields.find(f => f.name === field);
          if (matchedField) {
            mapping[column] = matchedField.name;
            return;
          }
        }
      }

      // Default to unmapped (use special value, not empty string)
      mapping[column] = '__skip__';
    });

    return mapping;
  };

  const handleParseCSV = () => {
    if (!file) {
      setError('Please select a CSV file first');
      return;
    }

    setIsLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`);
          setIsLoading(false);
          return;
        }

        const columns = results.meta.fields || [];
        const rows = results.data;

        setParsedData({
          columns,
          rows,
        });
        setEditedRows([...rows]);

        // Auto-suggest field mappings
        const suggestedMapping = suggestFieldMapping(columns, entityType);
        setFieldMapping(suggestedMapping);
        setCurrentStep('map');
        setIsLoading(false);
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
        setIsLoading(false);
      },
    });
  };

  const handleMappingChange = (csvColumn: string, dbField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvColumn]: dbField,
    }));
  };

  const handleConfirmMapping = () => {
    // Validate required fields are mapped
    const requiredFields = ENTITY_FIELDS[entityType].filter(f => f.required);
    const mappedFields = Object.values(fieldMapping).filter(v => v !== '' && v !== '__skip__');
    
    const missingRequired = requiredFields.filter(
      rf => !mappedFields.includes(rf.name)
    );

    if (missingRequired.length > 0) {
      setError(`Please map the required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setError(null);
    
    // Run validation
    if (parsedData) {
      const result = validateData(editedRows, fieldMapping, entityType);
      setValidationResult(result);
      setCurrentStep('validate');
    }
  };

  const handleCellEdit = (rowIndex: number, csvColumn: string, newValue: string) => {
    const updatedRows = [...editedRows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [csvColumn]: newValue
    };
    setEditedRows(updatedRows);

    // Re-run validation
    if (parsedData) {
      const result = validateData(updatedRows, fieldMapping, entityType);
      setValidationResult(result);
    }
  };

  const handleProceedToImport = () => {
    if (!validationResult || !parsedData) return;

    // Analyze data to create import summary
    const totalRecords = editedRows.length;
    
    // Get rows with duplicate warnings (these will be skipped)
    const duplicateRows = new Set(
      validationResult.issues
        .filter(i => i.type === 'warning' && i.message.toLowerCase().includes('duplicate'))
        .map(i => i.row)
    );
    const skipped = duplicateRows.size;

    // NOTE: Update detection requires database lookup
    // For now, we assume all non-duplicate records are NEW
    // In production, this would query the database to check if records exist
    const updates = 0; // Will be determined by backend during actual import
    const newRecords = totalRecords - skipped; // All non-duplicates are treated as new for now

    setImportSummary({
      totalRecords,
      newRecords,
      updates,
      skipped
    });

    setCurrentStep('preview');
  };

  const handleExecuteImport = async () => {
    if (!editedRows.length || !fieldMapping) return;

    setIsImporting(true);
    setCurrentStep('importing');
    
    try {
      // Transform editedRows to match expected database schema
      const transformedData = editedRows.map(row => {
        const transformed: any = {};
        
        // Map CSV columns to database fields
        Object.entries(fieldMapping).forEach(([csvCol, dbField]) => {
          if (dbField && dbField !== '__skip__') {
            let value = row[csvCol];
            
            // Data type conversions
            const field = ENTITY_FIELDS[entityType].find(f => f.name === dbField);
            if (field) {
              if (field.type === 'number' && value) {
                value = Number(value);
              } else if (field.type === 'date' && value) {
                value = new Date(value).toISOString();
              }
            }
            
            transformed[dbField] = value;
          }
        });
        
        return transformed;
      });

      const response = await fetch('/api/admin/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          data: transformedData,
          fieldMapping,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Import failed' }));
        
        // Handle validation errors
        if (response.status === 400 && errorData.errors) {
          const errorMessages = errorData.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
          throw new Error(`Validation error: ${errorMessages}`);
        }
        
        throw new Error(errorData.message || 'Import failed');
      }

      const results: ImportExecutionResults = await response.json();
      setImportResults(results);
      setCurrentStep('complete');
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
      setCurrentStep('preview'); // Return to preview on error
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!validationResult || !parsedData) return;

    const errorRows: any[] = [];
    
    validationResult.issues.forEach(issue => {
      const row = editedRows[issue.row];
      const csvColumn = Object.entries(fieldMapping).find(([_, db]) => db === issue.field)?.[0] || issue.field;
      
      errorRows.push({
        'Row #': issue.row + 1,
        'Field': ENTITY_FIELDS[entityType].find(f => f.name === issue.field)?.label || issue.field,
        'Issue Type': issue.type === 'error' ? 'ERROR' : 'WARNING',
        'Message': issue.message,
        'Current Value': row[csvColumn] || ''
      });
    });

    const csv = Papa.unparse(errorRows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadImportLog = () => {
    if (!importResults) return;

    const logRows = importResults.results.map(result => ({
      'Row #': result.row,
      'Status': result.status.toUpperCase(),
      'Action': result.action.charAt(0).toUpperCase() + result.action.slice(1),
      'Record ID': result.recordId || 'N/A',
      'Message': result.message || 'Success',
    }));

    const csv = Papa.unparse(logRows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
    setCurrentStep('upload');
    setFieldMapping({});
    setValidationResult(null);
    setEditedRows([]);
    setImportSummary(null);
    setImportResults(null);
    setIsImporting(false);
  };

  const getMappedFieldsCount = () => {
    return Object.values(fieldMapping).filter(v => v !== '' && v !== '__skip__').length;
  };

  const getRequiredFieldsCount = () => {
    const requiredFields = ENTITY_FIELDS[entityType].filter(f => f.required);
    const mappedFields = Object.values(fieldMapping).filter(v => v !== '' && v !== '__skip__');
    return requiredFields.filter(rf => mappedFields.includes(rf.name)).length;
  };

  const getIssuesForCell = (rowIndex: number, fieldName: string): ValidationIssue[] => {
    if (!validationResult) return [];
    return validationResult.issues.filter(i => i.row === rowIndex && i.field === fieldName);
  };

  const getIssuesForRow = (rowIndex: number): ValidationIssue[] => {
    if (!validationResult) return [];
    return validationResult.issues.filter(i => i.row === rowIndex);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Import Manager</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Upload CSV files, map fields, and validate data before importing
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 justify-center" data-testid="step-indicator">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {currentStep === 'upload' ? '1' : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <span className="font-medium">Upload</span>
        </div>
        <ArrowRight className="text-slate-400" />
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'map' ? 'bg-blue-600 text-white' : 
            currentStep === 'validate' || currentStep === 'preview' || currentStep === 'importing' || currentStep === 'complete' ? 'bg-green-600 text-white' : 
            'bg-slate-300 text-slate-600'
          }`}>
            {currentStep === 'validate' || currentStep === 'preview' || currentStep === 'importing' || currentStep === 'complete' ? <CheckCircle2 className="w-5 h-5" /> : '2'}
          </div>
          <span className="font-medium">Map</span>
        </div>
        <ArrowRight className="text-slate-400" />
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'validate' ? 'bg-blue-600 text-white' : 
            currentStep === 'preview' || currentStep === 'importing' || currentStep === 'complete' ? 'bg-green-600 text-white' : 
            'bg-slate-300 text-slate-600'
          }`}>
            {currentStep === 'preview' || currentStep === 'importing' || currentStep === 'complete' ? <CheckCircle2 className="w-5 h-5" /> : '3'}
          </div>
          <span className="font-medium">Validate</span>
        </div>
        <ArrowRight className="text-slate-400" />
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'preview' ? 'bg-blue-600 text-white' : 
            currentStep === 'importing' || currentStep === 'complete' ? 'bg-green-600 text-white' : 
            'bg-slate-300 text-slate-600'
          }`}>
            {currentStep === 'importing' || currentStep === 'complete' ? <CheckCircle2 className="w-5 h-5" /> : '4'}
          </div>
          <span className="font-medium">Preview</span>
        </div>
        <ArrowRight className="text-slate-400" />
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'importing' ? 'bg-blue-600 text-white' : 
            currentStep === 'complete' ? 'bg-green-600 text-white' : 
            'bg-slate-300 text-slate-600'
          }`}>
            {currentStep === 'complete' ? <CheckCircle2 className="w-5 h-5" /> : '5'}
          </div>
          <span className="font-medium">Import</span>
        </div>
      </div>

      {/* Upload Step */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Select the type of data and upload your CSV file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entity-type">Data Type</Label>
              <Select value={entityType} onValueChange={(value) => setEntityType(value as EntityType)}>
                <SelectTrigger data-testid="select-entity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="properties" data-testid="option-properties">Properties</SelectItem>
                  <SelectItem value="contacts" data-testid="option-contacts">Contacts</SelectItem>
                  <SelectItem value="tasks" data-testid="option-tasks">Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <div className="flex gap-2">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="flex-1"
                  data-testid="input-csv-file"
                />
                {file && (
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    data-testid="button-clear"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {file && (
                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive" data-testid="alert-csv-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-testid="text-error-message">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleParseCSV}
              disabled={!file || isLoading}
              data-testid="button-parse-csv"
            >
              {isLoading ? 'Parsing...' : 'Parse & Continue'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mapping Step */}
      {currentStep === 'map' && parsedData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Map CSV Columns to {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Fields
              </CardTitle>
              <CardDescription>
                AI suggested mappings are pre-selected. Review and adjust as needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Badge variant="outline" data-testid="badge-mapped-count">
                  {getMappedFieldsCount()} of {parsedData.columns.length} columns mapped
                </Badge>
                <Badge 
                  variant={getRequiredFieldsCount() === ENTITY_FIELDS[entityType].filter(f => f.required).length ? 'default' : 'destructive'}
                  data-testid="badge-required-count"
                >
                  {getRequiredFieldsCount()} of {ENTITY_FIELDS[entityType].filter(f => f.required).length} required fields
                </Badge>
              </div>

              {error && (
                <Alert variant="destructive" data-testid="alert-mapping-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription data-testid="text-mapping-error-message">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {parsedData.columns.map((column, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{column}</Label>
                      <p className="text-xs text-slate-500 mt-1">
                        Sample: {parsedData.rows[0]?.[column]?.toString().substring(0, 50) || 'N/A'}
                      </p>
                    </div>
                    <ArrowRight className="text-slate-400" />
                    <div className="flex-1">
                      <Select
                        value={fieldMapping[column] || ''}
                        onValueChange={(value) => handleMappingChange(column, value)}
                      >
                        <SelectTrigger data-testid={`select-mapping-${index}`}>
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__" data-testid={`mapping-skip-${index}`}>
                            Skip (don't import)
                          </SelectItem>
                          {ENTITY_FIELDS[entityType].map(field => (
                            <SelectItem 
                              key={field.name} 
                              value={field.name}
                              data-testid={`mapping-${field.name}-${index}`}
                            >
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('upload')}
                  data-testid="button-back-to-upload"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmMapping}
                  data-testid="button-confirm-mapping"
                >
                  Validate Data & Continue
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview table */}
          <Card data-testid="card-csv-preview">
            <CardHeader>
              <CardTitle>CSV Preview</CardTitle>
              <CardDescription data-testid="text-csv-summary">
                {parsedData.rows.length} rows × {parsedData.columns.length} columns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 bg-slate-100 dark:bg-slate-800">#</TableHead>
                      {parsedData.columns.map((column, index) => (
                        <TableHead key={index} className="font-semibold bg-slate-100 dark:bg-slate-800">
                          <div>
                            {column}
                            {fieldMapping[column] && fieldMapping[column] !== '__skip__' && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                → {ENTITY_FIELDS[entityType].find(f => f.name === fieldMapping[column])?.label}
                              </Badge>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.rows.slice(0, 5).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell className="font-medium text-slate-500 bg-slate-50 dark:bg-slate-900">
                          {rowIndex + 1}
                        </TableCell>
                        {parsedData.columns.map((column, colIndex) => (
                          <TableCell key={colIndex} data-testid={`cell-${rowIndex}-${colIndex}`}>
                            {row[column]?.toString() || ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-slate-500 mt-2">Showing first 5 rows</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Step */}
      {currentStep === 'validate' && parsedData && validationResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {validationResult.hasErrors ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : validationResult.hasWarnings ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                Data Validation Results
              </CardTitle>
              <CardDescription>
                Review and fix any issues before importing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {validationResult.hasErrors && (
                  <Badge variant="destructive" data-testid="badge-error-count">
                    {validationResult.issues.filter(i => i.type === 'error').length} Errors
                  </Badge>
                )}
                {validationResult.hasWarnings && (
                  <Badge variant="outline" className="border-yellow-600 text-yellow-600" data-testid="badge-warning-count">
                    {validationResult.issues.filter(i => i.type === 'warning').length} Warnings
                  </Badge>
                )}
                {!validationResult.hasErrors && !validationResult.hasWarnings && (
                  <Badge variant="default" className="bg-green-600" data-testid="badge-no-issues">
                    No Issues Found
                  </Badge>
                )}
              </div>

              {(validationResult.hasErrors || validationResult.hasWarnings) && (
                <>
                  <Alert data-testid="alert-validation-info">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {validationResult.hasErrors 
                        ? 'Fix all errors before importing. You can edit cells directly in the table below.'
                        : 'Warnings indicate potential issues but won\'t prevent import.'}
                    </AlertDescription>
                  </Alert>

                  <Button
                    variant="outline"
                    onClick={downloadErrorReport}
                    data-testid="button-download-errors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Error Report CSV
                  </Button>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('map')}
                  data-testid="button-back-to-mapping"
                >
                  Back to Mapping
                </Button>
                <Button
                  onClick={handleProceedToImport}
                  disabled={validationResult.hasErrors}
                  data-testid="button-proceed-to-import"
                >
                  {validationResult.hasErrors ? 'Fix Errors to Continue' : 'Proceed to Import'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Validation Preview Table with Inline Editing */}
          <Card data-testid="card-validation-preview">
            <CardHeader>
              <CardTitle>Data Preview with Validation</CardTitle>
              <CardDescription>
                Click on cells to edit values. Red = Error, Yellow = Warning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="rounded-md border overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 bg-slate-100 dark:bg-slate-800">#</TableHead>
                        <TableHead className="w-16 bg-slate-100 dark:bg-slate-800">
                          <AlertCircle className="w-4 h-4" />
                        </TableHead>
                        {parsedData.columns.map((column, index) => {
                          const dbField = fieldMapping[column];
                          if (dbField === '__skip__') return null;
                          
                          return (
                            <TableHead key={index} className="font-semibold bg-slate-100 dark:bg-slate-800">
                              {ENTITY_FIELDS[entityType].find(f => f.name === dbField)?.label || column}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editedRows.map((row, rowIndex) => {
                        const rowIssues = getIssuesForRow(rowIndex);
                        const hasError = rowIssues.some(i => i.type === 'error');
                        const hasWarning = rowIssues.some(i => i.type === 'warning');

                        return (
                          <TableRow key={rowIndex} className={hasError ? 'bg-red-50 dark:bg-red-950/20' : hasWarning ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                            <TableCell className="font-medium text-slate-500">
                              {rowIndex + 1}
                            </TableCell>
                            <TableCell>
                              {rowIssues.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    {hasError ? (
                                      <AlertCircle className="w-4 h-4 text-red-600" data-testid={`row-error-${rowIndex}`} />
                                    ) : (
                                      <AlertTriangle className="w-4 h-4 text-yellow-600" data-testid={`row-warning-${rowIndex}`} />
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      {rowIssues.map((issue, idx) => (
                                        <p key={idx} className="text-xs">
                                          • {issue.message}
                                        </p>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                            {parsedData.columns.map((column, colIndex) => {
                              const dbField = fieldMapping[column];
                              if (dbField === '__skip__') return null;

                              const cellIssues = getIssuesForCell(rowIndex, dbField);
                              const hasError = cellIssues.some(i => i.type === 'error');
                              const hasWarning = cellIssues.some(i => i.type === 'warning');

                              return (
                                <TableCell 
                                  key={colIndex} 
                                  className={`${hasError ? 'bg-red-100 dark:bg-red-900/30' : hasWarning ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}
                                  data-testid={`validation-cell-${rowIndex}-${colIndex}`}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Input
                                        value={row[column]?.toString() || ''}
                                        onChange={(e) => handleCellEdit(rowIndex, column, e.target.value)}
                                        className={`h-8 ${cellIssues.length > 0 ? 'border-2' : ''} ${hasError ? 'border-red-500' : hasWarning ? 'border-yellow-500' : ''}`}
                                        data-testid={`input-cell-${rowIndex}-${colIndex}`}
                                      />
                                    </TooltipTrigger>
                                    {cellIssues.length > 0 && (
                                      <TooltipContent>
                                        <div className="space-y-1">
                                          {cellIssues.map((issue, idx) => (
                                            <p key={idx} className="text-xs">
                                              {issue.message}
                                            </p>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview & Summary Step */}
      {currentStep === 'preview' && parsedData && importSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import Preview & Summary
            </CardTitle>
            <CardDescription>
              Review the import summary before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-total-records">
                      {importSummary.totalRecords}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Records to Import
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="stat-new-records">
                      {importSummary.newRecords}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      New
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400" data-testid="stat-updates">
                      {importSummary.updates}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Updates
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-slate-600 dark:text-slate-400" data-testid="stat-skipped">
                      {importSummary.skipped}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Skipped (duplicates)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Import Details */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-3">
              <h4 className="font-medium">Import Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Entity Type:</span>
                  <span className="font-medium capitalize">{entityType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Fields Mapped:</span>
                  <span className="font-medium">{getMappedFieldsCount()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Validation Status:</span>
                  <Badge variant="default" className="bg-green-600">Passed</Badge>
                </div>
                {importSummary.skipped > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600 dark:text-slate-400">Duplicates:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {importSummary.skipped} record{importSummary.skipped > 1 ? 's' : ''} will be skipped
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Breakdown */}
            <Alert data-testid="alert-import-breakdown">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What will happen:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{importSummary.newRecords} {entityType} will be processed</li>
                  {importSummary.skipped > 0 && (
                    <li>{importSummary.skipped} duplicate{importSummary.skipped > 1 ? 's' : ''} will be skipped</li>
                  )}
                  <li className="text-slate-600 dark:text-slate-400 text-sm">
                    Note: The system will automatically check for existing records during import and update them if found.
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('validate')}
                data-testid="button-back-to-validation"
              >
                Back to Validation
              </Button>
              <Button
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-import-now"
              >
                {isImporting ? 'Importing...' : 'Import Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Importing Progress Step */}
      {currentStep === 'importing' && (
        <Card data-testid="card-importing-progress">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              Importing Data...
            </CardTitle>
            <CardDescription>
              Please wait while we import your data into the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg text-center">
              <p className="text-slate-600 dark:text-slate-400">
                Processing {importSummary?.totalRecords || 0} records...
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                This may take a moment depending on the size of your dataset
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Complete Step */}
      {currentStep === 'complete' && importResults && (
        <Card data-testid="card-import-complete">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
            <CardDescription>
              Your data has been successfully imported
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg" data-testid="result-total">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {importResults.summary.total}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Records</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg" data-testid="result-created">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importResults.summary.created}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Created</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg" data-testid="result-updated">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {importResults.summary.updated}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Updated</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg" data-testid="result-failed">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {importResults.summary.failed}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Failed</div>
              </div>
            </div>

            {/* Success Message */}
            {importResults.summary.failed === 0 && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  All records were successfully imported! {importResults.summary.created > 0 && `${importResults.summary.created} new records created.`} {importResults.summary.updated > 0 && `${importResults.summary.updated} records updated.`}
                </AlertDescription>
              </Alert>
            )}

            {/* Partial Success Message */}
            {importResults.summary.failed > 0 && importResults.summary.created + importResults.summary.updated > 0 && (
              <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  Import completed with {importResults.summary.failed} failed records. {importResults.summary.created + importResults.summary.updated} records were successfully processed.
                </AlertDescription>
              </Alert>
            )}

            {/* Failure Message */}
            {importResults.summary.failed > 0 && importResults.summary.created + importResults.summary.updated === 0 && (
              <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  Import failed. All {importResults.summary.failed} records encountered errors. Please check the import log for details.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={downloadImportLog}
                variant="outline"
                data-testid="button-download-import-log"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Import Log
              </Button>
              
              {(importResults.summary.created > 0 || importResults.summary.updated > 0) && (
                <Link href={
                  entityType === 'properties' ? '/properties' :
                  entityType === 'contacts' ? '/people' :
                  '/tasks'
                }>
                  <Button
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                    data-testid="button-view-imported-records"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Imported {entityType === 'properties' ? 'Properties' : entityType === 'contacts' ? 'Contacts' : 'Tasks'}
                  </Button>
                </Link>
              )}
              
              <Button
                onClick={handleClear}
                variant="default"
                data-testid="button-new-import"
              >
                Start New Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
