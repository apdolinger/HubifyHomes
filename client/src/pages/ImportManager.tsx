import { useState } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface ParsedData {
  columns: string[];
  rows: any[];
}

export default function ImportManager() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setParsedData(null);
    }
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
        setIsLoading(false);
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
        setIsLoading(false);
      },
    });
  };

  const handleClear = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Import Manager</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Upload and preview CSV files for data import
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Select a CSV file to preview its columns and data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleParseCSV}
            disabled={!file || isLoading}
            data-testid="button-parse-csv"
          >
            {isLoading ? 'Parsing...' : 'Parse CSV'}
          </Button>
        </CardContent>
      </Card>

      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>CSV Preview</CardTitle>
            <CardDescription>
              {parsedData.rows.length} rows × {parsedData.columns.length} columns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 bg-slate-100 dark:bg-slate-800">#</TableHead>
                    {parsedData.columns.map((column, index) => (
                      <TableHead key={index} className="font-semibold bg-slate-100 dark:bg-slate-800">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.map((row, rowIndex) => (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
