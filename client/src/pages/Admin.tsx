import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import AdminForms from "./AdminForms";
import SupportModal from "@/components/SupportModal";
import Billing from "./Billing";
import { CustomFieldsSettings } from "./Account";
import { SystemAlertsManagement } from "@/components/SystemAlertsManagement";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Settings, 
  Shield,
  Mail,
  FileText,
  Sliders,
  Bell,
  Download,
  Upload,
  HelpCircle,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Save,
  Copy,
  CheckCircle,
  Home,
  Database,
  Building,
  MapPin,
  User,
  Phone,
  Eye,
  DollarSign,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  X as XIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Check,
  ChevronsUpDown
} from "lucide-react";
import TableCustomizationModal, { ColumnConfig } from "@/components/TableCustomizationModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Supply Settings Manager Component
function SupplySettingsManager({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [newType, setNewType] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: [`/api/organizations/${orgId}/supply-settings`],
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { supplyTypes?: string[]; supplyUnits?: string[] }) => {
      return apiRequest("PATCH", `/api/organizations/${orgId}/supply-settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/supply-settings`] });
      toast({
        title: "Settings updated",
        description: "Supply categories have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddType = () => {
    if (!newType.trim()) return;
    const currentTypes = settings?.supplyTypes || [];
    if (currentTypes.includes(newType.trim().toLowerCase())) {
      toast({
        title: "Duplicate type",
        description: "This supply type already exists.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      supplyTypes: [...currentTypes, newType.trim().toLowerCase()],
    });
    setNewType("");
  };

  const handleRemoveType = (type: string) => {
    const currentTypes = settings?.supplyTypes || [];
    updateMutation.mutate({
      supplyTypes: currentTypes.filter(t => t !== type),
    });
  };

  const handleAddUnit = () => {
    if (!newUnit.trim()) return;
    const currentUnits = settings?.supplyUnits || [];
    if (currentUnits.includes(newUnit.trim().toLowerCase())) {
      toast({
        title: "Duplicate unit",
        description: "This supply unit already exists.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      supplyUnits: [...currentUnits, newUnit.trim().toLowerCase()],
    });
    setNewUnit("");
  };

  const handleRemoveUnit = (unit: string) => {
    const currentUnits = settings?.supplyUnits || [];
    updateMutation.mutate({
      supplyUnits: currentUnits.filter(u => u !== unit),
    });
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Supply Types Section */}
      <div>
        <h4 className="font-medium mb-3">Supply Types</h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {(settings?.supplyTypes || []).map((type: string) => (
            <Badge
              key={type}
              variant="secondary"
              className="pl-3 pr-1 py-1 capitalize"
            >
              {type}
              <button
                onClick={() => handleRemoveType(type)}
                className="ml-2 hover:bg-slate-300 rounded p-0.5"
                data-testid={`button-remove-type-${type}`}
              >
                <XIcon className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add new supply type..."
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddType();
              }
            }}
            className="max-w-xs"
            data-testid="input-new-supply-type"
          />
          <Button
            onClick={handleAddType}
            disabled={!newType.trim() || updateMutation.isPending}
            data-testid="button-add-supply-type"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Type
          </Button>
        </div>
      </div>

      {/* Supply Units Section */}
      <div className="pt-4 border-t">
        <h4 className="font-medium mb-3">Supply Units</h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {(settings?.supplyUnits || []).map((unit: string) => (
            <Badge
              key={unit}
              variant="secondary"
              className="pl-3 pr-1 py-1 capitalize"
            >
              {unit}
              <button
                onClick={() => handleRemoveUnit(unit)}
                className="ml-2 hover:bg-slate-300 rounded p-0.5"
                data-testid={`button-remove-unit-${unit}`}
              >
                <XIcon className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add new supply unit..."
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUnit();
              }
            }}
            className="max-w-xs"
            data-testid="input-new-supply-unit"
          />
          <Button
            onClick={handleAddUnit}
            disabled={!newUnit.trim() || updateMutation.isPending}
            data-testid="button-add-supply-unit"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
          </Button>
        </div>
      </div>
    </div>
  );
}

// Invoice Template Preview Component
function InvoiceTemplatePreview({ templateId }: { templateId: string }) {
  const sampleData = {
    invoiceNumber: "INV-2024-001",
    date: "November 5, 2024",
    dueDate: "December 5, 2024",
    billTo: {
      name: "Sample Client",
      address: "123 Main Street",
      city: "Miami, FL 33101"
    },
    items: [
      { description: "Property Inspection", quantity: 1, rate: 150.00, amount: 150.00 },
      { description: "Maintenance Service", quantity: 2, rate: 75.00, amount: 150.00 },
      { description: "Consulting Fee", quantity: 1, rate: 200.00, amount: 200.00 }
    ],
    subtotal: 500.00,
    tax: 35.00,
    total: 535.00
  };

  const getTemplateStyles = (id: string) => {
    const styles = {
      modern: {
        header: "bg-gradient-to-r from-blue-600 to-purple-600 text-white",
        accent: "text-blue-600",
        border: "border-blue-200"
      },
      minimal: {
        header: "bg-gray-50 text-gray-900 border-b-2 border-gray-200",
        accent: "text-gray-700",
        border: "border-gray-100"
      },
      classic: {
        header: "bg-slate-800 text-white border-4 border-slate-600",
        accent: "text-slate-800",
        border: "border-slate-300"
      },
      compact: {
        header: "bg-emerald-700 text-white",
        accent: "text-emerald-700",
        border: "border-emerald-200"
      },
      bold: {
        header: "bg-red-600 text-white",
        accent: "text-red-600",
        border: "border-red-300"
      }
    };
    return styles[id as keyof typeof styles] || styles.modern;
  };

  const styles = getTemplateStyles(templateId);

  return (
    <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white shadow-lg scale-90 origin-top">
      {/* Header */}
      <div className={`p-6 ${styles.header}`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-1">INVOICE</h2>
            <p className="text-sm opacity-90">{sampleData.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Your Company Name</p>
            <p className="text-sm opacity-90">123 Business Ave</p>
            <p className="text-sm opacity-90">City, ST 12345</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Dates and Bill To */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className={`font-semibold mb-2 ${styles.accent}`}>Bill To:</h3>
            <div className="text-sm">
              <p className="font-medium">{sampleData.billTo.name}</p>
              <p className="text-slate-600">{sampleData.billTo.address}</p>
              <p className="text-slate-600">{sampleData.billTo.city}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="mb-3">
              <span className="text-slate-600 text-sm">Invoice Date: </span>
              <span className="font-medium text-sm">{sampleData.date}</span>
            </div>
            <div>
              <span className="text-slate-600 text-sm">Due Date: </span>
              <span className="font-medium text-sm">{sampleData.dueDate}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className={`border ${styles.border} rounded`}>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 text-sm font-semibold text-slate-700">Description</th>
                <th className="text-right p-3 text-sm font-semibold text-slate-700">Qty</th>
                <th className="text-right p-3 text-sm font-semibold text-slate-700">Rate</th>
                <th className="text-right p-3 text-sm font-semibold text-slate-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.items.map((item, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-3 text-sm">{item.description}</td>
                  <td className="p-3 text-sm text-right">{item.quantity}</td>
                  <td className="p-3 text-sm text-right">${item.rate.toFixed(2)}</td>
                  <td className="p-3 text-sm text-right font-medium">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium">${sampleData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Tax (7%):</span>
              <span className="font-medium">${sampleData.tax.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between pt-2 border-t ${styles.border}`}>
              <span className={`font-bold ${styles.accent}`}>Total:</span>
              <span className={`font-bold text-lg ${styles.accent}`}>${sampleData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Invoice Template Selector Component
function InvoiceTemplateSelector({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("modern");
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const templates = [
    {
      id: "modern",
      name: "Modern",
      description: "Clean design with gradient header and side-by-side layout. Professional and contemporary.",
      icon: "✨",
    },
    {
      id: "minimal",
      name: "Minimal",
      description: "Ultra-clean design with minimal colors and maximum white space. Simple and elegant.",
      icon: "🎨",
    },
    {
      id: "classic",
      name: "Classic",
      description: "Traditional invoice layout with borders and structured sections. Timeless and formal.",
      icon: "📄",
    },
    {
      id: "compact",
      name: "Compact",
      description: "Space-efficient layout perfect for detailed invoices. Maximum information density.",
      icon: "📋",
    },
    {
      id: "bold",
      name: "Bold",
      description: "Eye-catching design with strong colors and large typography. Makes a statement.",
      icon: "💥",
    },
  ];

  const { data: templateSettings, isLoading } = useQuery({
    queryKey: [`/api/organizations/${orgId}/invoice-template`],
    enabled: !!orgId,
  });

  useEffect(() => {
    if (templateSettings?.invoiceTemplateId) {
      setSelectedTemplate(templateSettings.invoiceTemplateId);
    }
  }, [templateSettings]);

  const updateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest("PATCH", `/api/organizations/${orgId}/invoice-template`, {
        invoiceTemplateId: templateId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/invoice-template`] });
      toast({
        title: "Template updated",
        description: "Invoice template has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    updateMutation.mutate(templateId);
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading invoice templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Invoice Template</h4>
        <p className="text-sm text-slate-600 mb-4">
          Choose a professional invoice layout for your organization. All future invoices will use this template.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`p-4 border-2 rounded-lg transition-all ${
              selectedTemplate === template.id
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
            data-testid={`template-${template.id}`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{template.icon}</span>
              {selectedTemplate === template.id && (
                <CheckCircle className="w-5 h-5 text-blue-500" />
              )}
            </div>
            <h5 className="font-semibold text-slate-900 mb-1">{template.name}</h5>
            <p className="text-xs text-slate-600 mb-3">{template.description}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPreviewTemplate(template.id)}
                className="flex-1"
                data-testid={`button-preview-${template.id}`}
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
              <Button
                size="sm"
                onClick={() => handleTemplateSelect(template.id)}
                disabled={updateMutation.isPending || selectedTemplate === template.id}
                className="flex-1"
                data-testid={`button-select-${template.id}`}
              >
                {selectedTemplate === template.id ? "Selected" : "Select"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedTemplate && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Selected:</strong> {templates.find(t => t.id === selectedTemplate)?.name} template
          </p>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {templates.find(t => t.id === previewTemplate)?.name} Template Preview
            </DialogTitle>
            <DialogDescription>
              Preview of how your invoices will look with this template
            </DialogDescription>
          </DialogHeader>
          <InvoiceTemplatePreview templateId={previewTemplate || 'modern'} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Billing Settings Manager Component
function BillingSettingsManager({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hourlyRate, setHourlyRate] = useState("");

  const { data: org, isLoading } = useQuery({
    queryKey: [`/api/organizations/${orgId}`],
    enabled: !!orgId,
  });

  // Set initial hourly rate value
  useEffect(() => {
    if (org?.defaultHourlyRateCents) {
      setHourlyRate((org.defaultHourlyRateCents / 100).toFixed(2));
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: async (data: { defaultHourlyRateCents: number | null }) => {
      return apiRequest("PATCH", `/api/organizations/${orgId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}`] });
      toast({
        title: "Settings updated",
        description: "Default billing settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const rate = hourlyRate.trim() ? parseFloat(hourlyRate) : null;
    if (rate !== null && (isNaN(rate) || rate < 0)) {
      toast({
        title: "Invalid hourly rate",
        description: "Please enter a valid hourly rate (or leave empty to clear)",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      defaultHourlyRateCents: rate !== null ? Math.round(rate * 100) : null,
    });
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Default Hourly Rate Section */}
      <div>
        <h4 className="font-medium mb-2">Default Hourly Rate</h4>
        <p className="text-sm text-slate-600 mb-4">
          Set a default hourly rate that will auto-populate when enabling hourly billing for new clients. 
          Individual clients can still override this rate.
        </p>
        <div className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="pl-7"
              data-testid="input-default-hourly-rate"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-hourly-rate"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
        {org?.defaultHourlyRateCents && (
          <p className="text-sm text-slate-500 mt-2">
            Current default: ${(org.defaultHourlyRateCents / 100).toFixed(2)}/hour
          </p>
        )}
      </div>
      
      {/* Invoice Template Section */}
      <div className="pt-6 border-t">
        <InvoiceTemplateSelector orgId={orgId} />
      </div>
    </div>
  );
}

// Task Templates Manager Component
function TaskTemplatesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    title: "",
    description: "",
    priority: "normal" as "urgent" | "high" | "normal" | "low",
    category: "",
    timeEstimate: "",
  });
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [currentItem, setCurrentItem] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/tasks/templates"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/templates"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Template Created",
        description: "The task template has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/tasks/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/templates"] });
      toast({
        title: "Template Deleted",
        description: "The task template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewTemplate({
      title: "",
      description: "",
      priority: "normal",
      category: "",
      timeEstimate: "",
    });
    setChecklistItems([]);
    setCurrentItem("");
    setEditingTemplate(null);
  };

  const addChecklistItem = () => {
    if (currentItem.trim()) {
      setChecklistItems([...checklistItems, currentItem.trim()]);
      setCurrentItem("");
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.title) {
      toast({
        title: "Missing Fields",
        description: "Please provide a template title.",
        variant: "destructive",
      });
      return;
    }

    const templateData = {
      ...newTemplate,
      isTemplate: true,
      status: "pending",
    };

    createTemplateMutation.mutate(templateData);
  };

  if (isLoading) {
    return <div className="text-sm text-slate-600">Loading templates...</div>;
  }

  return (
    <div>
      {templates.length === 0 ? (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600 mb-3">
            No task templates yet. Create reusable templates with pre-configured checklists and settings.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" data-testid="button-create-first-task-template">
            <Plus className="w-4 h-4 mr-2" />
            Create First Template
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {templates.length} template{templates.length !== 1 ? "s" : ""} available
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" data-testid="button-create-task-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
          <div className="border rounded-lg divide-y">
            {templates.map((template: any) => (
              <div key={template.id} className="p-3 hover:bg-slate-50 transition-colors" data-testid={`task-template-${template.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">{template.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.priority}
                      </Badge>
                      {template.category && (
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                    )}
                    {template.timeEstimate && (
                      <p className="text-xs text-slate-500 mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {template.timeEstimate}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsCreateDialogOpen(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Task Template</DialogTitle>
            <DialogDescription>
              Create a reusable task template with pre-configured settings and checklist items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                placeholder="e.g. Property Inspection Checklist"
                data-testid="input-template-title"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="What is this template used for?"
                rows={2}
                data-testid="textarea-template-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select
                  value={newTemplate.priority}
                  onValueChange={(value: any) => setNewTemplate({ ...newTemplate, priority: value })}
                >
                  <SelectTrigger data-testid="select-template-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Input
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  placeholder="e.g. inspection, maintenance"
                  data-testid="input-template-category"
                />
              </div>
            </div>

            <div>
              <Label>Time Estimate</Label>
              <Input
                value={newTemplate.timeEstimate}
                onChange={(e) => setNewTemplate({ ...newTemplate, timeEstimate: e.target.value })}
                placeholder="e.g. 2 hours, 1 day"
                data-testid="input-template-time-estimate"
              />
            </div>

            <div>
              <Label>Checklist Items (Coming Soon)</Label>
              <p className="text-xs text-slate-500 mt-1">
                Checklist functionality will be added in the next update. For now, you can create the basic template structure.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Document Templates Manager Component
function DocumentTemplatesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    documentType: "",
    fileName: "",
    fileUrl: "",
  });
  const [isUploading, setIsUploading] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/document-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/document-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      setIsUploadDialogOpen(false);
      setNewTemplate({ name: "", description: "", documentType: "", fileName: "", fileUrl: "" });
      toast({
        title: "Template Created",
        description: "The document template has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/document-templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      toast({
        title: "Template Deleted",
        description: "The document template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const duplicateData = {
        name: `Copy of ${template.name}`,
        description: template.description,
        documentType: template.documentType,
        fileName: template.fileName,
        fileUrl: template.fileUrl,
      };
      return apiRequest("POST", "/api/document-templates", duplicateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      toast({
        title: "Template Duplicated",
        description: "A copy of the template has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate template",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // In a real implementation, this would upload to object storage
      // For now, we'll just set a placeholder URL
      const mockFileUrl = `/documents/templates/${file.name}`;
      setNewTemplate(prev => ({
        ...prev,
        fileName: file.name,
        fileUrl: mockFileUrl,
      }));
      toast({
        title: "File Ready",
        description: "File is ready to be saved as a template.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.documentType || !newTemplate.fileName) {
      toast({
        title: "Missing Fields",
        description: "Please provide a name, document type, and upload a file.",
        variant: "destructive",
      });
      return;
    }
    createTemplateMutation.mutate(newTemplate);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          {templates.length} template{templates.length !== 1 ? 's' : ''} available
        </p>
        <Button 
          onClick={() => setIsUploadDialogOpen(true)}
          size="sm"
          data-testid="button-add-template"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed rounded-lg">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p>No document templates yet</p>
          <p className="text-xs mt-1">Create your first template to get started</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {templates.map((template: any) => (
            <div key={template.id} className="p-4 flex items-start justify-between hover:bg-slate-50">
              <div className="flex items-start gap-3 flex-1">
                <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium">{template.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {template.documentType}
                    </Badge>
                    <span className="text-xs text-slate-500">{template.fileName}</span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateTemplateMutation.mutate(template)}
                  data-testid={`button-duplicate-template-${template.id}`}
                  title="Duplicate template"
                >
                  <Copy className="w-4 h-4 text-blue-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this template?')) {
                      deleteTemplateMutation.mutate(template.id);
                    }
                  }}
                  data-testid={`button-delete-template-${template.id}`}
                  title="Delete template"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Document Template</DialogTitle>
            <DialogDescription>
              Upload a document that can be reused across multiple communities
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., Standard HOA Declaration"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                data-testid="input-template-name"
              />
            </div>

            <div>
              <Label>Document Type *</Label>
              <Select
                value={newTemplate.documentType}
                onValueChange={(value) => setNewTemplate({ ...newTemplate, documentType: value })}
              >
                <SelectTrigger data-testid="select-document-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoa-declaration">HOA Declaration</SelectItem>
                  <SelectItem value="bylaws">Bylaws</SelectItem>
                  <SelectItem value="faq">FAQ Sheet</SelectItem>
                  <SelectItem value="welcome-packet">Welcome Packet</SelectItem>
                  <SelectItem value="rules-regulations">Rules & Regulations</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Brief description of this document..."
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                rows={2}
                data-testid="input-template-description"
              />
            </div>

            <div>
              <Label>Upload File *</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isUploading}
                data-testid="input-template-file"
              />
              {newTemplate.fileName && (
                <p className="text-xs text-green-600 mt-1">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  {newTemplate.fileName}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setNewTemplate({ name: "", description: "", documentType: "", fileName: "", fileUrl: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending || isUploading}
              data-testid="button-create-template"
            >
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Check URL query parameters for initial tab
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'forms';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isNewCommunityDialogOpen, setIsNewCommunityDialogOpen] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeContacts, setIncludeContacts] = useState(true);
  const [includeRooms, setIncludeRooms] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const queryClient = useQueryClient();

  // Communities table state
  type CommunitySortField = 'name' | 'address1' | 'city' | 'state' | 'propertyCount' | 'isActive';
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  const [communitySortField, setCommunitySortField] = useState<CommunitySortField>('name');
  const [communitySortDirection, setCommunitySortDirection] = useState<'asc' | 'desc'>('asc');
  const [isCustomizeCommunitiesModalOpen, setIsCustomizeCommunitiesModalOpen] = useState(false);

  // Default column configuration for Communities table
  const defaultCommunityColumns: ColumnConfig[] = [
    { id: 'name', label: 'Community Name', visible: true, required: true },
    { id: 'address1', label: 'Address', visible: true },
    { id: 'city', label: 'City', visible: true },
    { id: 'state', label: 'State', visible: true },
    { id: 'propertyCount', label: 'Properties', visible: true },
    { id: 'isActive', label: 'Status', visible: true },
  ];

  // Load column configuration from localStorage
  const [communityColumns, setCommunityColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('communityTableColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultCommunityColumns;
      }
    }
    return defaultCommunityColumns;
  });

  // Save column configuration to localStorage
  const handleSaveCommunityColumns = (newColumns: ColumnConfig[]) => {
    setCommunityColumns(newColumns);
    localStorage.setItem('communityTableColumns', JSON.stringify(newColumns));
  };

  // Get visible columns
  const visibleCommunityColumns = communityColumns.filter(col => col.visible);

  // Fetch properties for the property selector
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
    staleTime: 30000,
  });

  // Fetch all users in the organization for HR permissions management
  const { data: orgUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user?.orgId,
  });

  // Mutation to toggle HR permissions
  const toggleHrPermissionsMutation = useMutation({
    mutationFn: async ({ userId, hasHrPermissions }: { userId: string; hasHrPermissions: boolean }) => {
      return await apiRequest('PATCH', `/api/users/${userId}/hr-permissions`, { hasHrPermissions });
    },
    onSuccess: () => {
      refetchUsers();
      toast({ title: "Permissions updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating permissions",
        description: error.message || "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  // Property report generation function
  const generatePropertyReport = async (property: any) => {
    if (!property) return;
    
    setIsGeneratingReport(true);
    
    try {
      // Fetch comprehensive property data
      const responses = await Promise.all([
        fetch(`/api/properties/${property.id}`).then(r => r.json()),
        includeNotes ? fetch(`/api/properties/${property.id}/notes`).then(r => r.json()) : Promise.resolve([]),
        includeTasks ? fetch(`/api/tasks?propertyId=${property.id}`).then(r => r.json()) : Promise.resolve([]),
        includeContacts ? fetch(`/api/properties/${property.id}/contacts`).then(r => r.json()) : Promise.resolve([]),
        includeRooms ? fetch(`/api/properties/${property.id}/rooms`).then(r => r.json()) : Promise.resolve([]),
      ]);

      const [propertyDetails, notes, tasks, contacts, rooms] = responses;

      // Generate CSV content
      const csvContent = generatePropertyReportCSV({
        property: propertyDetails,
        notes: includeNotes ? notes : [],
        tasks: includeTasks ? tasks : [],
        contacts: includeContacts ? contacts : [],
        rooms: includeRooms ? rooms : [],
      });

      // Download the report
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Property_Report_${property.name || 'Property'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Report Generated",
        description: `Comprehensive report for ${property.name || 'Property'} has been downloaded.`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate property report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Generate CSV content for property report
  const generatePropertyReportCSV = (data: any) => {
    const { property, notes, tasks, contacts, rooms } = data;
    
    let csvContent = `Property Comprehensive Report\n`;
    csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    // Property Details
    csvContent += `PROPERTY INFORMATION\n`;
    csvContent += `Name,${property.name || 'N/A'}\n`;
    csvContent += `Address,"${property.address || 'N/A'}"\n`;
    csvContent += `Type,${property.type || 'N/A'}\n`;
    csvContent += `Status,${property.status || 'N/A'}\n`;
    csvContent += `Square Footage,${property.squareFootage || 'N/A'}\n`;
    csvContent += `Bedrooms,${property.bedrooms || 'N/A'}\n`;
    csvContent += `Bathrooms,${property.bathrooms || 'N/A'}\n`;
    csvContent += `Year Built,${property.yearBuilt || 'N/A'}\n`;
    csvContent += `Lot Size,${property.lotSize || 'N/A'}\n`;
    csvContent += `HOA Fee,${property.hoaFee || 'N/A'}\n`;
    csvContent += `Property Tax,${property.propertyTax || 'N/A'}\n`;
    csvContent += `Manager,${property.manager || 'N/A'}\n\n`;

    // Contacts
    if (includeContacts && contacts.length > 0) {
      csvContent += `CONTACTS\n`;
      csvContent += `Name,Type,Email,Phone,Address\n`;
      contacts.forEach((contact: any) => {
        csvContent += `"${contact.firstName} ${contact.lastName}",${contact.type || 'N/A'},${contact.email || 'N/A'},${contact.phone || 'N/A'},"${contact.address || 'N/A'}"\n`;
      });
      csvContent += `\n`;
    }

    // Tasks
    if (includeTasks && tasks.length > 0) {
      csvContent += `TASKS\n`;
      csvContent += `Title,Description,Status,Priority,Due Date,Assigned To\n`;
      tasks.forEach((task: any) => {
        csvContent += `"${task.title}","${task.description || 'N/A'}",${task.status || 'N/A'},${task.priority || 'N/A'},${task.dueDate || 'N/A'},${task.assignedTo || 'N/A'}\n`;
      });
      csvContent += `\n`;
    }

    // Rooms
    if (includeRooms && rooms.length > 0) {
      csvContent += `ROOMS\n`;
      csvContent += `Room Name,Type,Notes\n`;
      rooms.forEach((room: any) => {
        csvContent += `"${room.name}",${room.type || 'N/A'},"${room.notes || 'N/A'}"\n`;
      });
      csvContent += `\n`;
    }

    // Notes
    if (includeNotes && notes.length > 0) {
      csvContent += `PROPERTY NOTES\n`;
      csvContent += `Date,Category,Content,Author\n`;
      notes.forEach((note: any) => {
        csvContent += `${note.createdAt || 'N/A'},${note.category || 'General'},"${note.content || 'N/A'}",${note.author || 'N/A'}\n`;
      });
    }

    return csvContent;
  };

  // Export all properties summary
  const exportAllPropertiesSummary = async () => {
    try {
      const response = await fetch('/api/properties');
      const properties = await response.json();
      
      let csvContent = 'Properties Summary Report\n';
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Name,Address Line 1,Address Line 2,City,State,Zip,Type,Status,Bedrooms,Bathrooms,Square Footage\n';
      
      properties.forEach((prop: any) => {
        csvContent += `"${prop.name || 'N/A'}","${prop.address1 || 'N/A'}","${prop.address2 || ''}",${prop.city || 'N/A'},${prop.state || 'N/A'},${prop.zip || 'N/A'},${prop.type || 'N/A'},${prop.status || 'N/A'},${prop.bedrooms || 'N/A'},${prop.bathrooms || 'N/A'},${prop.squareFootage || 'N/A'}\n`;
      });
      
      downloadCSV(csvContent, `Properties_Summary_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Export Complete", description: `Exported ${properties.length} properties` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export properties", variant: "destructive" });
    }
  };

  // Export active tasks report
  const exportActiveTasksReport = async () => {
    try {
      const response = await fetch('/api/tasks');
      const tasks = await response.json();
      const activeTasks = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
      
      let csvContent = 'Active Tasks Report\n';
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Title,Property,Status,Priority,Due Date,Assigned To,Description\n';
      
      activeTasks.forEach((task: any) => {
        const propertyName = task.property?.name || 'N/A';
        const assignedTo = task.assignedUser ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}` : 'Unassigned';
        csvContent += `"${task.title}","${propertyName}",${task.status || 'N/A'},${task.priority || 'N/A'},${task.dueDate || 'N/A'},"${assignedTo}","${task.description || 'N/A'}"\n`;
      });
      
      downloadCSV(csvContent, `Active_Tasks_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Export Complete", description: `Exported ${activeTasks.length} active tasks` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export tasks", variant: "destructive" });
    }
  };

  // Export contact directory
  const exportContactDirectory = async () => {
    try {
      const response = await fetch('/api/contacts');
      const contacts = await response.json();
      
      let csvContent = 'Contact Directory\n';
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'First Name,Last Name,Type,Email,Phone,Mobile,Address Line 1,Address Line 2,City,State,Zip,Company,Notes\n';
      
      contacts.forEach((contact: any) => {
        csvContent += `"${contact.firstName || ''}","${contact.lastName || ''}",${contact.type || 'N/A'},${contact.email || 'N/A'},${contact.phone || 'N/A'},${contact.mobile || 'N/A'},"${contact.address1 || ''}","${contact.address2 || ''}",${contact.city || 'N/A'},${contact.state || 'N/A'},${contact.zip || 'N/A'},"${contact.companyName || 'N/A'}","${contact.notes || 'N/A'}"\n`;
      });
      
      downloadCSV(csvContent, `Contact_Directory_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Export Complete", description: `Exported ${contacts.length} contacts` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export contacts", variant: "destructive" });
    }
  };

  // Export billing summary
  const exportBillingSummary = async () => {
    try {
      const response = await fetch('/api/invoices');
      const invoices = await response.json();
      
      let csvContent = 'Billing Summary Report\n';
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Invoice Number,Client,Date,Due Date,Amount,Status,Payment Method\n';
      
      invoices.forEach((invoice: any) => {
        const clientName = invoice.client ? `${invoice.client.firstName} ${invoice.client.lastName}` : 'N/A';
        const amount = invoice.totalAmount ? `$${(invoice.totalAmount / 100).toFixed(2)}` : '$0.00';
        csvContent += `${invoice.invoiceNumber || 'N/A'},"${clientName}",${invoice.invoiceDate || 'N/A'},${invoice.dueDate || 'N/A'},${amount},${invoice.status || 'N/A'},${invoice.paymentMethod || 'N/A'}\n`;
      });
      
      downloadCSV(csvContent, `Billing_Summary_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Export Complete", description: `Exported ${invoices.length} invoices` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export billing data", variant: "destructive" });
    }
  };

  // Export properties data
  const exportPropertiesData = async () => {
    try {
      const response = await fetch('/api/properties');
      const properties = await response.json();
      
      let csvContent = 'Properties Data Export\n';
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Name,Address Line 1,Address Line 2,City,State,Zip,Type,Status,Bedrooms,Bathrooms,Square Footage,Year Built,Lot Size,HOA Fee,Property Tax,Manager,Notes\n';
      
      properties.forEach((prop: any) => {
        csvContent += `"${prop.name || 'N/A'}","${prop.address1 || ''}","${prop.address2 || ''}",${prop.city || 'N/A'},${prop.state || 'N/A'},${prop.zip || 'N/A'},${prop.type || 'N/A'},${prop.status || 'N/A'},${prop.bedrooms || 'N/A'},${prop.bathrooms || 'N/A'},${prop.squareFootage || 'N/A'},${prop.yearBuilt || 'N/A'},${prop.lotSize || 'N/A'},${prop.hoaFee || 'N/A'},${prop.propertyTax || 'N/A'},"${prop.manager || 'N/A'}","${prop.notes || 'N/A'}"\n`;
      });
      
      downloadCSV(csvContent, `Properties_Export_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Export Complete", description: `Exported ${properties.length} properties` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export properties", variant: "destructive" });
    }
  };

  // Export clients data
  const exportClientsData = async () => {
    try {
      const response = await fetch('/api/contacts');
      const contacts = await response.json();
      const clients = contacts.filter((c: any) => c.type === 'client' || c.type === 'owner' || c.type === 'tenant');
      
      let csvContent = 'Clients Data Export\n';
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'First Name,Last Name,Type,Email,Phone,Mobile,Address Line 1,Address Line 2,City,State,Zip,Company,Client Category,Notes\n';
      
      clients.forEach((client: any) => {
        csvContent += `"${client.firstName || ''}","${client.lastName || ''}",${client.type || 'N/A'},${client.email || 'N/A'},${client.phone || 'N/A'},${client.mobile || 'N/A'},"${client.address1 || ''}","${client.address2 || ''}",${client.city || 'N/A'},${client.state || 'N/A'},${client.zip || 'N/A'},"${client.companyName || 'N/A'}","${client.clientCategory || 'N/A'}","${client.notes || 'N/A'}"\n`;
      });
      
      downloadCSV(csvContent, `Clients_Export_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Export Complete", description: `Exported ${clients.length} clients` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export clients", variant: "destructive" });
    }
  };

  // Export communities data
  const exportCommunitiesData = async () => {
    try {
      const response = await fetch('/api/communities');
      const communities = await response.json();
      
      let csvContent = 'Communities Data Export\n';
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Name,Address Line 1,Address Line 2,City,State,Zip,Status,Property Count,Notes\n';
      
      communities.forEach((community: any) => {
        const address1 = community.address1 || '';
        const address2 = community.address2 || '';
        const status = community.isActive ? 'Active' : 'Inactive';
        csvContent += `"${community.name || ''}","${address1}","${address2}",${community.city || 'N/A'},${community.state || 'N/A'},${community.zip || 'N/A'},${status},${community.propertyCount || 0},"${community.notes || ''}"\n`;
      });
      
      downloadCSV(csvContent, `Communities_Export_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Export Complete", description: `Exported ${communities.length} communities` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export communities", variant: "destructive" });
    }
  };

  // Export vendors data
  const exportVendorsData = async () => {
    try {
      const response = await fetch('/api/contacts');
      const contacts = await response.json();
      const vendors = contacts.filter((c: any) => c.type === 'vendor');
      
      let csvContent = 'Vendors Data Export\n';
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'First Name,Last Name,Company,Vendor Type,Category,Email,Phone,Mobile,Address Line 1,Address Line 2,City,State,Zip,Website,Notes\n';
      
      vendors.forEach((vendor: any) => {
        csvContent += `"${vendor.firstName || ''}","${vendor.lastName || ''}","${vendor.companyName || 'N/A'}",${vendor.vendorType || 'N/A'},${vendor.vendorCategory || 'N/A'},${vendor.email || 'N/A'},${vendor.phone || 'N/A'},${vendor.mobile || 'N/A'},"${vendor.address1 || ''}","${vendor.address2 || ''}",${vendor.city || 'N/A'},${vendor.state || 'N/A'},${vendor.zip || 'N/A'},${vendor.website || 'N/A'},"${vendor.notes || 'N/A'}"\n`;
      });
      
      downloadCSV(csvContent, `Vendors_Export_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Export Complete", description: `Exported ${vendors.length} vendors` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export vendors", variant: "destructive" });
    }
  };

  // Helper function to download CSV
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PropertySelector component - Searchable Combobox
  const PropertySelector = ({ onPropertyChange, selectedProperty }: { onPropertyChange: (property: any) => void, selectedProperty: any }) => {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredProperties = properties.filter((property: any) => {
      const searchLower = searchQuery.toLowerCase();
      const name = (property.name || '').toLowerCase();
      const address = (property.address1 || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      return name.includes(searchLower) || address.includes(searchLower) || city.includes(searchLower);
    });

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            data-testid="property-selector-trigger"
          >
            {selectedProperty
              ? selectedProperty.name || 'Unnamed Property'
              : "Choose a property..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search properties..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
              data-testid="property-search-input"
            />
            <CommandList>
              <CommandEmpty>No property found.</CommandEmpty>
              <CommandGroup>
                {filteredProperties.map((property: any) => (
                  <CommandItem
                    key={property.id}
                    value={`${property.name || 'Unnamed Property'} ${property.address1 || ''}`}
                    onSelect={() => {
                      onPropertyChange(property);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    data-testid={`property-option-${property.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedProperty?.id === property.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{property.name || 'Unnamed Property'}</span>
                      <span className="text-sm text-slate-500">
                        {[property.address1, property.city, property.state].filter(Boolean).join(', ') || 'No address'}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  // Handle URL parameters to set initial tab and community focus
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const communityId = urlParams.get('community');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    // If a community ID is specified and we're on communities tab, we could scroll to it
    // For now, just focus on the communities tab
    if (communityId && tab === 'communities') {
      setActiveTab('communities');
    }
  }, []);

  // Community form schema
  const communitySchema = z.object({
    // Basic Info
    name: z.string().min(1, "Community name is required"),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    notes: z.string().optional(),
    
    // Community Profile
    gateCodes: z.string().optional(),
    propertyManagerName: z.string().optional(),
    propertyManagerCompany: z.string().optional(),
    emergencyContactNumber: z.string().optional(),
    hoaMailingAddress: z.string().optional(),
    
    // Rules & Access
    rentalRestrictions: z.string().optional(),
    petPolicy: z.string().optional(),
    parkingRestrictions: z.string().optional(),
    noiseRestrictions: z.string().optional(),
    accessProcedures: z.string().optional(),
    
    // Schedules
    trashPickupDays: z.string().optional(),
    bulkTrashDates: z.string().optional(),
    landscapeSchedule: z.string().optional(),
    pestControlSchedule: z.string().optional(),
    hoaMeetingSchedule: z.string().optional(),
    
    // Financial Info
    hoaDuesFrequency: z.string().optional(),
    hoaDuesAmount: z.string().optional(),
    paymentInstructions: z.string().optional(),
    paymentPortalUrl: z.string().optional(),
    lateFeePolicy: z.string().optional(),
    specialAssessments: z.string().optional(),
    
    // Amenities & Maintenance
    ongoingProjects: z.string().optional(),
  });

  const communityForm = useForm({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      // Basic Info
      name: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      notes: "",
      
      // Community Profile
      gateCodes: "",
      propertyManagerName: "",
      propertyManagerCompany: "",
      emergencyContactNumber: "",
      hoaMailingAddress: "",
      
      // Rules & Access
      rentalRestrictions: "",
      petPolicy: "",
      parkingRestrictions: "",
      noiseRestrictions: "",
      accessProcedures: "",
      
      // Schedules
      trashPickupDays: "",
      bulkTrashDates: "",
      landscapeSchedule: "",
      pestControlSchedule: "",
      hoaMeetingSchedule: "",
      
      // Financial Info
      hoaDuesFrequency: "",
      hoaDuesAmount: "",
      paymentInstructions: "",
      paymentPortalUrl: "",
      lateFeePolicy: "",
      specialAssessments: "",
      
      // Amenities & Maintenance
      ongoingProjects: "",
    },
  });

  // Fetch communities
  const { data: communities = [], isLoading: isCommunitiesLoading } = useQuery({
    queryKey: ["/api/communities"],
  });

  // Helper function to handle community sorting
  const handleCommunitySort = (field: CommunitySortField) => {
    if (communitySortField === field) {
      setCommunitySortDirection(communitySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCommunitySortField(field);
      setCommunitySortDirection('asc');
    }
  };

  // Helper function to get sort icon for community columns
  const getCommunitySortIcon = (field: CommunitySortField) => {
    if (communitySortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-2" />;
    }
    return communitySortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-2" />
      : <ArrowDown className="w-4 h-4 ml-2" />;
  };

  // Filter and sort communities
  const filteredAndSortedCommunities = useMemo(() => {
    if (!communities || !Array.isArray(communities)) return [];
    
    let filtered = [...communities] as any[];
    
    // Apply search filter
    if (communitySearchQuery) {
      const query = communitySearchQuery.toLowerCase();
      filtered = filtered.filter(community => 
        community.name?.toLowerCase().includes(query) ||
        community.address1?.toLowerCase().includes(query) ||
        community.city?.toLowerCase().includes(query) ||
        community.state?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[communitySortField];
      let bValue = b[communitySortField];
      
      // Handle property count (numeric)
      if (communitySortField === 'propertyCount') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }
      
      // Handle boolean (isActive)
      if (communitySortField === 'isActive') {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }
      
      // Handle strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return communitySortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Handle numbers
      if (communitySortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }
    });
    
    return filtered;
  }, [communities, communitySearchQuery, communitySortField, communitySortDirection]);

  // Fetch document templates
  const { data: documentTemplates = [], isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["/api/document-templates"],
  });

  // Create community mutation  
  const createCommunityMutation = useMutation({
    mutationFn: async (communityData: any) => {
      const response = await apiRequest("POST", "/api/communities", communityData);
      const community = await response.json();
      
      // Link selected templates to the new community
      if (selectedTemplateIds.length > 0) {
        await Promise.all(
          selectedTemplateIds.map((templateId) =>
            apiRequest("POST", `/api/communities/${community.id}/link-template/${templateId}`, {})
          )
        );
      }
      
      return community;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      setIsNewCommunityDialogOpen(false);
      setSelectedTemplateIds([]);
      communityForm.reset();
      toast({
        title: "Community Created",
        description: selectedTemplateIds.length > 0 
          ? `The community has been created successfully with ${selectedTemplateIds.length} document(s) linked.`
          : "The community has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create community",
        variant: "destructive",
      });
    },
  });

  // Sample CSV data from user's provided file
  const csvData = [
    {
      fullName: "Bruce Wayne",
      propertyName: "Wayne Manor",
      streetAddress: "1313 Mockingbird Ln.",
      city: "Gotham City",
      county: "Bristol County",
      state: "NJ",
      zipCode: "00001",
      phoneNumber: "(807) 536-1076",
      email: "bruce.wayne@example.com",
      tasks: "Replace roof tiles; Inspect security cameras"
    },
    {
      fullName: "Tony Stark",
      propertyName: "Stark Lake House",
      streetAddress: "10880 Malibu Point",
      city: "Malibu",
      county: "Ventura County",
      state: "CA",
      zipCode: "90265",
      phoneNumber: "(625) 667-8476",
      email: "tony.stark@example.com",
      tasks: "Calibrate solar panels; Reset water system"
    },
    {
      fullName: "Bilbo Baggins",
      propertyName: "Bag End",
      streetAddress: "111 Bag End, Bagshot Row",
      city: "Hobbiton, The Shire",
      county: "Shire County",
      state: "ME",
      zipCode: "24791",
      phoneNumber: "(397) 259-9198",
      email: "bilbo.baggins@example.com",
      tasks: "Chimney sweep; Pantry pest control"
    },
    {
      fullName: "Jay Gatsby",
      propertyName: "Gatsby Estate",
      streetAddress: "1 Gatsby Lane",
      city: "West Egg",
      county: "Nassau County",
      state: "NY",
      zipCode: "11560",
      phoneNumber: "(734) 348-9487",
      email: "jay.gatsby@example.com",
      tasks: "Clean pool; Repair ballroom lights"
    },
    {
      fullName: "Elsa Arendelle",
      propertyName: "Ice Castle",
      streetAddress: "1 Ice Palace Rd",
      city: "North Mountain",
      county: "Northern Peaks County",
      state: "AK",
      zipCode: "99686",
      phoneNumber: "(918) 766-7895",
      email: "elsa.arendelle@example.com",
      tasks: "De-ice entry; Inspect HVAC"
    },
    {
      fullName: "Clark Kent",
      propertyName: "Smallville Farmhouse",
      streetAddress: "100 Farmhouse Way",
      city: "Smallville",
      county: "Republic County",
      state: "KS",
      zipCode: "67524",
      phoneNumber: "(884) 945-4765",
      email: "clark.kent@example.com",
      tasks: "Repair barn door; Reset perimeter alert"
    },
    {
      fullName: "Sherlock Holmes",
      propertyName: "221B Baker Street",
      streetAddress: "221B Baker Street",
      city: "London",
      county: "Greater London",
      state: "UK",
      zipCode: "NW1 6XE",
      phoneNumber: "(366) 722-1185",
      email: "sherlock.holmes@example.com",
      tasks: "Check gas line; Fix loose window latch"
    },
    {
      fullName: "Lara Croft",
      propertyName: "Croft Manor",
      streetAddress: "1 Croft Manor",
      city: "Surrey",
      county: "Surrey County",
      state: "UK",
      zipCode: "GU1 1AA",
      phoneNumber: "(743) 571-6460",
      email: "lara.croft@example.com",
      tasks: "Fix surveillance system; Schedule garden trim"
    },
    {
      fullName: "Doc Brown",
      propertyName: "Hill Valley Garage",
      streetAddress: "1640 Riverside Drive",
      city: "Hill Valley",
      county: "Sierra County",
      state: "CA",
      zipCode: "95420",
      phoneNumber: "(380) 547-9627",
      email: "doc.brown@example.com",
      tasks: "Clean flux capacitor bay; Inspect storm damage"
    },
    {
      fullName: "Willy Wonka",
      propertyName: "Chocolate Factory Guest House",
      streetAddress: "10 Candy Cane Lane",
      city: "Candy Town",
      county: "Sweet County",
      state: "PA",
      zipCode: "15001",
      phoneNumber: "(720) 511-5742",
      email: "willy.wonka@example.com",
      tasks: "Sanitize chocolate river filter; Inspect candy wall"
    }
  ];

  const importMutation = useMutation({
    mutationFn: async () => {
      const importResults = {
        properties: 0,
        contacts: 0,
        tasks: 0
      };

      for (const record of csvData) {
        // Split full name
        const nameParts = record.fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        // Create property
        const property = await apiRequest('/api/properties', {
          method: 'POST',
          body: JSON.stringify({
            name: record.propertyName,
            type: "house",
            address1: record.streetAddress,
            address2: "",
            city: record.city,
            state: record.state,
            zipCode: record.zipCode,
            status: "active",
            units: 1,
            squareFootage: 2500,
            yearBuilt: 1980,
            isActive: true
          })
        });
        importResults.properties++;

        // Create contact
        const contact = await apiRequest('/api/contacts', {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName,
            email: record.email,
            phone: record.phoneNumber,
            type: "owner",
            propertyId: property.id,
            isActive: true
          })
        });
        importResults.contacts++;

        // Create tasks
        const taskList = record.tasks.split(';').map(task => task.trim());
        for (const taskTitle of taskList) {
          if (taskTitle) {
            await apiRequest('/api/tasks', {
              method: 'POST',
              body: JSON.stringify({
                title: taskTitle,
                description: `Task for ${record.propertyName}`,
                priority: "normal",
                status: "pending",
                propertyId: property.id,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              })
            });
            importResults.tasks++;
          }
        }
      }

      return importResults;
    },
    onSuccess: (results) => {
      toast({
        title: "Import Successful!",
        description: `Imported ${results.properties} properties, ${results.contacts} contacts, and ${results.tasks} tasks from your CSV data.`,
      });
      
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import sample data. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Redirect if not admin or manager
  useEffect(() => {
    if (!isLoading && isAuthenticated && (user as any)?.role !== 'admin' && (user as any)?.role !== 'manager') {
      toast({
        title: "Access Denied",
        description: "You need admin or manager permissions to access this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'manager')) {
    return null;
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-slate-600 mt-2">
            Manage templates, settings, and system configuration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/account">
            <Button variant="outline" data-testid="button-account-settings">
              <Settings className="w-4 h-4 mr-2" />
              Account Settings
            </Button>
          </Link>
          <Badge variant="secondary" className="px-3 py-1">
            <Shield className="w-4 h-4 mr-1" />
            {(user as any)?.role === 'admin' ? 'Admin' : 'Manager'} Access
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="communities" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Communities
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="customization" className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Customization
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2" data-testid="tab-alerts">
            <AlertCircle className="w-4 h-4" />
            System Alerts
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Tools & Support
          </TabsTrigger>
        </TabsList>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-6">
          <AdminForms />
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Properties Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Properties
                </CardTitle>
                <CardDescription>
                  Manage property records and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/properties">
                    <Button variant="outline" className="w-full justify-start">
                      <Home className="w-4 h-4 mr-2" />
                      View All Properties
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/properties")}
                    data-testid="button-add-property"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Property
                  </Button>
                  <Link href="/admin/import?type=properties">
                    <Button variant="outline" className="w-full justify-start">
                      <Upload className="w-4 h-4 mr-2" />
                      Bulk Import
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={exportPropertiesData}
                    data-testid="button-export-properties"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Communities Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Communities
                </CardTitle>
                <CardDescription>
                  Manage HOAs, communities, and associations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab("communities")}
                  >
                    <Building className="w-4 h-4 mr-2" />
                    View All Communities
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab("communities");
                      setIsNewCommunityDialogOpen(true);
                    }}
                    data-testid="button-add-community"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Community
                  </Button>
                  <Link href="/admin/import?type=communities">
                    <Button variant="outline" className="w-full justify-start">
                      <Upload className="w-4 h-4 mr-2" />
                      Bulk Import
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={exportCommunitiesData}
                    data-testid="button-export-communities"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* People Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Clients
                </CardTitle>
                <CardDescription>
                  Manage tenants, owners, and contacts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/people">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      View All Clients
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/people")}
                    data-testid="button-add-client"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Client
                  </Button>
                  <Link href="/duplicates">
                    <Button variant="outline" className="w-full justify-start">
                      <Copy className="w-4 h-4 mr-2" />
                      Manage Duplicates
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={exportClientsData}
                    data-testid="button-export-clients"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Clients
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Vendors Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Vendors
                </CardTitle>
                <CardDescription>
                  Manage service providers and vendors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/admin/vendors">
                    <Button variant="outline" className="w-full justify-start" data-testid="button-view-vendors">
                      <Building className="w-4 h-4 mr-2" />
                      View All Vendors
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/admin/vendors")}
                    data-testid="button-add-vendor"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Vendor
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={exportVendorsData}
                    data-testid="button-export-vendors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Vendors
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row - Team Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Team Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Team
                </CardTitle>
                <CardDescription>
                  Manage team members and access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/team">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      View Team Members
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/team")}
                    data-testid="button-invite-team-member"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Team Member
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab("roles")}
                    data-testid="button-manage-permissions"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Permissions
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab("roles")}
                    data-testid="button-role-settings"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Role Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reports Section */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Reports & Analytics</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Property Report Generator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Property Report Generator
                  </CardTitle>
                  <CardDescription>
                    Generate comprehensive reports for any property including all details, tasks, contacts, and notes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="property-select">Select Property</Label>
                    <PropertySelector onPropertyChange={setSelectedProperty} selectedProperty={selectedProperty} />
                  </div>

                  {selectedProperty && (
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="font-medium">{selectedProperty.name || 'Unnamed Property'}</div>
                        <div className="text-sm text-slate-600">{selectedProperty.address || 'No address'}</div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Report Options</h4>
                        
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="include-notes" 
                            checked={includeNotes} 
                            onCheckedChange={setIncludeNotes}
                          />
                          <Label htmlFor="include-notes">Include Property Notes</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="include-tasks" 
                            checked={includeTasks} 
                            onCheckedChange={setIncludeTasks}
                          />
                          <Label htmlFor="include-tasks">Include Tasks & History</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="include-contacts" 
                            checked={includeContacts} 
                            onCheckedChange={setIncludeContacts}
                          />
                          <Label htmlFor="include-contacts">Include Contacts & Owners</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="include-rooms" 
                            checked={includeRooms} 
                            onCheckedChange={setIncludeRooms}
                          />
                          <Label htmlFor="include-rooms">Include Rooms & Supplies</Label>
                        </div>
                      </div>

                      <Button 
                        onClick={() => generatePropertyReport(selectedProperty)}
                        disabled={isGeneratingReport}
                        className="w-full"
                        data-testid="button-generate-property-report"
                      >
                        {isGeneratingReport ? (
                          <>
                            <Download className="w-4 h-4 mr-2 animate-pulse" />
                            Generating Report...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Generate Property Report
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Quick Reports
                  </CardTitle>
                  <CardDescription>
                    Pre-configured reports for common needs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={exportAllPropertiesSummary}
                    data-testid="button-export-properties-summary"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    All Properties Summary
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={exportActiveTasksReport}
                    data-testid="button-export-tasks-report"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Active Tasks Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={exportContactDirectory}
                    data-testid="button-export-contact-directory"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Contact Directory
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={exportBillingSummary}
                    data-testid="button-export-billing-summary"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Billing Summary
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Email & Message Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Email & Message Templates</h3>
            <p className="text-slate-600 mb-6">Configure reusable templates for communication</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Create and manage email templates with merge fields for client communication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Email templates allow you to create reusable messages with personalized merge fields like recipient name, property details, and more.
              </p>
              <Link href="/admin/email-templates">
                <Button data-testid="button-manage-email-templates">
                  <Mail className="w-4 h-4 mr-2" />
                  Manage Email Templates
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Task Templates
              </CardTitle>
              <CardDescription>
                Create reusable task templates with pre-configured settings and checklists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Task templates allow you to save common task configurations, checklists, and workflows for quick reuse.
                When creating a new task, you can select a template to auto-fill all task details.
              </p>
              <TaskTemplatesManager />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Document Templates
              </CardTitle>
              <CardDescription>
                Create reusable community documents to avoid re-uploading the same files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Document templates allow you to upload community documents once and reuse them across multiple communities. 
                Perfect for standard HOA declarations, bylaws, or welcome packets that apply to many properties.
              </p>
              <DocumentTemplatesManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Billing embedded={true} />
        </TabsContent>

        {/* Communities Tab */}
        <TabsContent value="communities" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Communities Management</h3>
              <p className="text-slate-600">Manage HOAs, communities, and property associations</p>
            </div>
            <Button onClick={() => setIsNewCommunityDialogOpen(true)} data-testid="button-add-community">
              <Plus className="w-4 h-4 mr-2" />
              Add New Community
            </Button>
          </div>

          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search communities by name, address, city, or state..."
                  value={communitySearchQuery}
                  onChange={(e) => setCommunitySearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-communities"
                />
              </div>
            </CardContent>
          </Card>

          {/* Communities Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Communities List ({filteredAndSortedCommunities.length} {filteredAndSortedCommunities.length === 1 ? 'community' : 'communities'})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomizeCommunitiesModalOpen(true)}
                data-testid="button-customize-communities-table"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isCommunitiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredAndSortedCommunities.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleCommunityColumns.map((column) => (
                        <TableHead 
                          key={column.id}
                          className="cursor-pointer hover:bg-slate-50" 
                          onClick={() => handleCommunitySort(column.id as CommunitySortField)}
                        >
                          <div className="flex items-center">
                            {column.label}
                            {getCommunitySortIcon(column.id as CommunitySortField)}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedCommunities.map((community: any) => (
                      <TableRow key={community.id} data-testid={`row-community-${community.id}`}>
                        {visibleCommunityColumns.map((column) => (
                          <TableCell key={column.id} className={column.id === 'name' ? 'font-medium' : ''}>
                            {column.id === 'name' && (
                              <Link href={`/communities/${community.id}`}>
                                <span className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" data-testid={`link-community-${community.id}`}>
                                  {community.name}
                                </span>
                              </Link>
                            )}
                            {column.id === 'address1' && community.address1}
                            {column.id === 'city' && community.city}
                            {column.id === 'state' && community.state}
                            {column.id === 'propertyCount' && (community.propertyCount || 0)}
                            {column.id === 'isActive' && (
                              <Badge variant={community.isActive ? 'default' : 'secondary'}>
                                {community.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" data-testid={`button-view-community-${community.id}`}>
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`button-edit-community-${community.id}`}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`button-delete-community-${community.id}`}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h4 className="font-medium text-slate-900 mb-2">
                    {communitySearchQuery ? 'No communities found' : 'No Communities Yet'}
                  </h4>
                  <p className="text-slate-500 mb-4">
                    {communitySearchQuery 
                      ? 'Try adjusting your search criteria' 
                      : 'Create your first community to get started'}
                  </p>
                  {!communitySearchQuery && (
                    <Button onClick={() => setIsNewCommunityDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Community
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h5 className="font-medium text-slate-900">Total Communities</h5>
                <p className="text-2xl font-bold text-blue-600 mt-1">{communities.length}</p>
                <p className="text-xs text-slate-500 mt-1">Active organizations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h5 className="font-medium text-slate-900">Properties Managed</h5>
                <p className="text-2xl font-bold text-green-600 mt-1">{communities.reduce((sum: number, c: any) => sum + (c.propertyCount || 0), 0)}</p>
                <p className="text-xs text-slate-500 mt-1">Across all communities</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h5 className="font-medium text-slate-900">Active HOAs</h5>
                <p className="text-2xl font-bold text-purple-600 mt-1">{communities.filter((c: any) => c.isActive).length}</p>
                <p className="text-xs text-slate-500 mt-1">With management contracts</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customization Settings</CardTitle>
              <CardDescription>
                Configure custom fields and supply categories for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="custom-fields" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="custom-fields" data-testid="tab-custom-fields">
                    Custom Fields
                  </TabsTrigger>
                  <TabsTrigger value="supply-settings" data-testid="tab-supply-settings">
                    Supply Settings
                  </TabsTrigger>
                  <TabsTrigger value="billing-settings" data-testid="tab-billing-settings">
                    Billing Settings
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="custom-fields" className="space-y-6 mt-6">
                  <CustomFieldsSettings />
                </TabsContent>
                
                <TabsContent value="supply-settings" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Supply Categories</h3>
                      <p className="text-sm text-slate-600">
                        Configure custom supply types and units for property inventory management
                      </p>
                    </div>
                    {user?.orgId && <SupplySettingsManager orgId={user.orgId} />}
                  </div>
                </TabsContent>
                
                <TabsContent value="billing-settings" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Default Billing Settings</h3>
                      <p className="text-sm text-slate-600">
                        Configure organization-wide default values for client billing
                      </p>
                    </div>
                    {user?.orgId && <BillingSettingsManager orgId={user.orgId} />}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Team Roles & Permissions</h3>
            <p className="text-slate-600">Define what each role can view or edit</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Staff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>View Properties</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Edit Properties</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>View Financial Info</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Manage Users</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Contacts</CardTitle>
                <CardDescription>Designate main points of contact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mainContact">Main Point of Contact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin1">John Admin</SelectItem>
                      <SelectItem value="manager1">Sarah Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="billingContact">Billing Contact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin1">John Admin</SelectItem>
                      <SelectItem value="manager1">Sarah Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supportContact">Support Contact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin1">John Admin</SelectItem>
                      <SelectItem value="manager1">Sarah Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  Save Contact Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* User Permissions Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Permissions</CardTitle>
              <CardDescription>
                Manage individual user permissions. HR permissions allow users to view and manage employee performance data and notes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orgUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No users found in your organization</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">HR Permissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgUsers.map((orgUser: any) => (
                      <TableRow key={orgUser.id}>
                        <TableCell>{orgUser.firstName} {orgUser.lastName}</TableCell>
                        <TableCell>{orgUser.email}</TableCell>
                        <TableCell>
                          <Badge variant={orgUser.role === 'admin' ? 'default' : 'secondary'}>
                            {orgUser.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={orgUser.hasHrPermissions || false}
                            onCheckedChange={(checked) => {
                              toggleHrPermissionsMutation.mutate({
                                userId: orgUser.id,
                                hasHrPermissions: checked as boolean,
                              });
                            }}
                            data-testid={`hr-permission-checkbox-${orgUser.id}`}
                            disabled={toggleHrPermissionsMutation.isPending}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          {user?.claims?.orgId && <SystemAlertsManagement orgId={user.claims.orgId} />}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Notifications & Alerts</h3>
            <p className="text-slate-600">Manage system-wide alert settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Alert Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Task Deadline Alerts</p>
                    <p className="text-sm text-slate-500">Email notifications for overdue tasks</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Duplicate Warnings</p>
                    <p className="text-sm text-slate-500">Alert when potential duplicates are detected</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Login Failure Alerts</p>
                    <p className="text-sm text-slate-500">Security notifications for failed logins</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Property Access Logs</p>
                    <p className="text-sm text-slate-500">Weekly summary of property visits</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Urgent Alerts</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent-email" defaultChecked />
                      <Label htmlFor="urgent-email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent-sms" />
                      <Label htmlFor="urgent-sms">SMS</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent-app" defaultChecked />
                      <Label htmlFor="urgent-app">In-App</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-base font-medium">Regular Updates</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="regular-email" defaultChecked />
                      <Label htmlFor="regular-email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="regular-app" defaultChecked />
                      <Label htmlFor="regular-app">In-App</Label>
                    </div>
                  </div>
                </div>
                <Button className="w-full">
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tools & Support Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Tools & Support</h3>
            <p className="text-slate-600">Export/import data and access support resources</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Export / Import Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Link href="/admin/notes/search">
                    <Button variant="outline" className="w-full justify-start" data-testid="button-note-search">
                      <Search className="w-4 h-4 mr-2" />
                      Search All Notes
                    </Button>
                  </Link>
                  <p className="text-xs text-slate-500">
                    Find notes across properties, vehicles, rooms, contacts, and more
                  </p>
                  <div className="border-t pt-3 space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      Export All People (CSV)
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Properties (CSV)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Tasks (CSV)
                  </Button>
                  <div className="border-t pt-3 space-y-3">
                    <Link href="/admin/import">
                      <Button variant="outline" className="w-full justify-start" data-testid="button-import-manager">
                        <Upload className="w-4 h-4 mr-2" />
                        Import Manager
                      </Button>
                    </Link>
                    <p className="text-xs text-slate-500">
                      Upload and preview CSV files for data import
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => importMutation.mutate()}
                      disabled={importMutation.isPending}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importMutation.isPending ? 'Importing...' : 'Import Sample Data'}
                    </Button>
                    <p className="text-xs text-slate-500">
                      Import 10 properties, contacts, and tasks from your CSV dataset
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Support & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start"
                    onClick={() => setIsSupportModalOpen(true)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Request a Feature
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help Documentation
                  </Button>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">Quick Tip</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Use the search shortcut (Space) to quickly find properties, people, or tasks anywhere in the app.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      {/* Community Creation Dialog */}
      <Dialog open={isNewCommunityDialogOpen} onOpenChange={setIsNewCommunityDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Add New Community
            </DialogTitle>
            <DialogDescription>
              Create a comprehensive community profile with all management details
            </DialogDescription>
          </DialogHeader>

          <Form {...communityForm}>
            <form onSubmit={communityForm.handleSubmit((data) => createCommunityMutation.mutate(data))} className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Currently only basic community information (Profile tab) is saved to the database. 
                  Extended features like Rules, Schedules, and Financial info will be fully implemented in upcoming updates.
                </p>
              </div>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="rules">Rules</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="financial">Financial</TabsTrigger>
                  <TabsTrigger value="amenities">Amenities</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                {/* Community Profile Tab */}
                <TabsContent value="profile" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={communityForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Community Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Riverside Gardens HOA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={communityForm.control}
                        name="address1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="address2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2</FormLabel>
                            <FormControl>
                              <Input placeholder="Suite 100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={communityForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Jupiter" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="FL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input placeholder="33469" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={communityForm.control}
                        name="gateCodes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gate Code(s)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 1234, 5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="emergencyContactNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={communityForm.control}
                        name="propertyManagerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Manager Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="propertyManagerCompany"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Management Company</FormLabel>
                            <FormControl>
                              <Input placeholder="ABC Property Management" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={communityForm.control}
                      name="hoaMailingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HOA Mailing Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="P.O. Box 123, City, State, ZIP" 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Rules & Access Tab */}
                <TabsContent value="rules" className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800">
                      Rules and access information will be saved in future updates. Feel free to fill out this information for reference.
                    </p>
                  </div>
                  
                  <FormField
                    control={communityForm.control}
                    name="rentalRestrictions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rental Restrictions / Short-Term Rental Policy</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe rental restrictions, short-term rental policies, minimum lease terms..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="petPolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet Policy</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Pet restrictions, breed limitations, pet fees, registration requirements..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="parkingRestrictions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parking Restrictions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Parking rules, assigned spaces, guest parking, commercial vehicle restrictions..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="noiseRestrictions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Noise Restrictions / Quiet Hours</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Quiet hours (e.g. 10 PM - 8 AM), noise ordinances, construction hours..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="accessProcedures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access Procedures for Vendors / Guests</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Gate procedures, guest registration, vendor authorization, delivery instructions..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Schedules Tab */}
                <TabsContent value="schedule" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={communityForm.control}
                      name="trashPickupDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trash & Recycling Pickup Days</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Tuesday, Friday" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={communityForm.control}
                      name="bulkTrashDates"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bulk Trash Pickup Dates</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 1st Wednesday of each month" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={communityForm.control}
                      name="landscapeSchedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landscape Maintenance Schedule</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Every other Wednesday" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={communityForm.control}
                      name="pestControlSchedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pest Control Schedule</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Monthly - 2nd Tuesday" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={communityForm.control}
                    name="hoaMeetingSchedule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HOA Board Meeting Schedule</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 3rd Thursday of each month at 7 PM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Financial Info Tab */}
                <TabsContent value="financial" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={communityForm.control}
                      name="hoaDuesFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HOA Dues Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annually">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={communityForm.control}
                      name="hoaDuesAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount of Dues</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. $150.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={communityForm.control}
                    name="paymentPortalUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Portal URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://payment.hoamanagement.com/riverside" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="paymentInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Payment methods accepted, mailing address for checks, online portal instructions..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="lateFeePolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late Fee Policy</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Late fee amounts, grace periods, enforcement procedures..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="specialAssessments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Assessments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Current or upcoming special assessments, projects, payment schedules..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Amenities & Maintenance Tab */}
                <TabsContent value="amenities" className="space-y-4">
                  <FormField
                    control={communityForm.control}
                    name="ongoingProjects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recent or Ongoing Projects</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Current construction, maintenance projects, upcoming improvements..." 
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Amenities list, access codes, common area maintenance contacts, general information..." 
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Document Management</h4>
                    <p className="text-sm text-blue-700">
                      Select existing document templates to link to this community, or upload new documents after creation.
                    </p>
                  </div>

                  {isTemplatesLoading ? (
                    <div className="text-center text-gray-500 py-8">Loading templates...</div>
                  ) : documentTemplates.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600">
                        No document templates available. You can create templates in the Admin panel under the "Document Templates" section,
                        then link them to communities during creation to avoid re-uploading the same documents.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Available Document Templates</Label>
                      <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                        {documentTemplates.map((template: any) => (
                          <div
                            key={template.id}
                            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedTemplateIds(prev =>
                                prev.includes(template.id)
                                  ? prev.filter(id => id !== template.id)
                                  : [...prev, template.id]
                              );
                            }}
                          >
                            <Checkbox
                              checked={selectedTemplateIds.includes(template.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTemplateIds([...selectedTemplateIds, template.id]);
                                } else {
                                  setSelectedTemplateIds(selectedTemplateIds.filter(id => id !== template.id));
                                }
                              }}
                              className="mr-3"
                              data-testid={`checkbox-template-${template.id}`}
                            />
                            <FileText className="w-5 h-5 text-blue-500 mr-3" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{template.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {template.documentType}
                                </Badge>
                                <p className="text-xs text-gray-500">{template.fileName}</p>
                              </div>
                              {template.description && (
                                <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {selectedTemplateIds.length > 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mt-3">
                          <p className="text-sm text-green-800">
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            {selectedTemplateIds.length} template{selectedTemplateIds.length > 1 ? 's' : ''} selected
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mt-4">
                    <p className="text-xs text-gray-600">
                      <strong>Note:</strong> Additional documents can be uploaded to the community after creation via the Communities page.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNewCommunityDialogOpen(false);
                    communityForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCommunityMutation.isPending}
                >
                  {createCommunityMutation.isPending ? "Creating..." : "Create Community"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Table Customization Modal for Communities */}
      <TableCustomizationModal
        isOpen={isCustomizeCommunitiesModalOpen}
        onClose={() => setIsCustomizeCommunitiesModalOpen(false)}
        columns={communityColumns}
        defaultColumns={defaultCommunityColumns}
        onSave={handleSaveCommunityColumns}
      />
    </main>
  );
}