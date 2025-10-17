import { useState } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, ArrowRight, CheckCircle2, MapPin } from 'lucide-react';

interface ParsedData {
  columns: string[];
  rows: any[];
}

interface FieldMapping {
  [csvColumn: string]: string; // Maps CSV column to database field
}

type EntityType = 'properties' | 'contacts' | 'tasks';
type ImportStep = 'upload' | 'map' | 'ready';

interface FieldDefinition {
  name: string;
  label: string;
  required: boolean;
  type?: string;
}

const ENTITY_FIELDS: Record<EntityType, FieldDefinition[]> = {
  properties: [
    { name: 'name', label: 'Property Name', required: true },
    { name: 'address1', label: 'Address Line 1', required: true },
    { name: 'address2', label: 'Address Line 2', required: false },
    { name: 'city', label: 'City', required: true },
    { name: 'state', label: 'State', required: true },
    { name: 'zip', label: 'ZIP Code', required: true },
    { name: 'type', label: 'Property Type', required: true },
    { name: 'accountId', label: 'Account ID', required: false },
    { name: 'units', label: 'Number of Units', required: false },
    { name: 'squareFootage', label: 'Square Footage', required: false },
    { name: 'status', label: 'Status', required: false },
  ],
  contacts: [
    { name: 'firstName', label: 'First Name', required: true },
    { name: 'lastName', label: 'Last Name', required: true },
    { name: 'email', label: 'Email', required: false },
    { name: 'phone', label: 'Phone', required: false },
    { name: 'type', label: 'Contact Type', required: true },
    { name: 'accountId', label: 'Account ID', required: false },
    { name: 'notes', label: 'Notes', required: false },
  ],
  tasks: [
    { name: 'title', label: 'Task Title', required: true },
    { name: 'description', label: 'Description', required: false },
    { name: 'priority', label: 'Priority', required: false },
    { name: 'status', label: 'Status', required: false },
    { name: 'category', label: 'Category', required: false },
    { name: 'dueDate', label: 'Due Date', required: false },
    { name: 'timeEstimate', label: 'Time Estimate', required: false },
  ],
};

export default function ImportManager() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [entityType, setEntityType] = useState<EntityType>('properties');
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setParsedData(null);
      setCurrentStep('upload');
      setFieldMapping({});
    }
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
    const mappedFields = Object.values(fieldMapping).filter(v => v !== '');
    
    const missingRequired = requiredFields.filter(
      rf => !mappedFields.includes(rf.name)
    );

    if (missingRequired.length > 0) {
      setError(`Please map the required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setError(null);
    setCurrentStep('ready');
  };

  const handleClear = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
    setCurrentStep('upload');
    setFieldMapping({});
  };

  const getMappedFieldsCount = () => {
    return Object.values(fieldMapping).filter(v => v !== '' && v !== '__skip__').length;
  };

  const getRequiredFieldsCount = () => {
    const requiredFields = ENTITY_FIELDS[entityType].filter(f => f.required);
    const mappedFields = Object.values(fieldMapping).filter(v => v !== '' && v !== '__skip__');
    return requiredFields.filter(rf => mappedFields.includes(rf.name)).length;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Import Manager</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Upload CSV files and map fields to import data
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 justify-center" data-testid="step-indicator">
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
            currentStep === 'ready' ? 'bg-green-600 text-white' : 
            'bg-slate-300 text-slate-600'
          }`}>
            {currentStep === 'ready' ? <CheckCircle2 className="w-5 h-5" /> : '2'}
          </div>
          <span className="font-medium">Map Fields</span>
        </div>
        <ArrowRight className="text-slate-400" />
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'ready' ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
          }`}>
            3
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
                  Confirm Mapping & Continue
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
                            {fieldMapping[column] && (
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

      {/* Ready to Import Step */}
      {currentStep === 'ready' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Ready to Import
            </CardTitle>
            <CardDescription>
              Your field mapping is complete. Review the summary below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Data Type:</span>
                <span className="capitalize">{entityType}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Total Rows:</span>
                <span>{parsedData.rows.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Mapped Fields:</span>
                <span>{getMappedFieldsCount()}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
              <h4 className="font-medium mb-2">Field Mapping Summary</h4>
              {Object.entries(fieldMapping)
                .filter(([_, dbField]) => dbField !== '' && dbField !== '__skip__')
                .map(([csvColumn, dbField]) => (
                  <div key={csvColumn} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{csvColumn}</Badge>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <Badge variant="secondary">
                      {ENTITY_FIELDS[entityType].find(f => f.name === dbField)?.label}
                    </Badge>
                  </div>
                ))}
            </div>

            <Alert data-testid="alert-import-info">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Import functionality coming soon. This feature will allow you to import {parsedData.rows.length} {entityType} into your database.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('map')}
                data-testid="button-back-to-mapping"
              >
                Back to Mapping
              </Button>
              <Button
                disabled
                data-testid="button-start-import"
              >
                Start Import (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
