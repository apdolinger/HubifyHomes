import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building, MapPin, Users, Plus, Home, Square, DollarSign, Activity, Eye, Edit, ToggleLeft, ToggleRight, Trash2, FileText, Mail, MessageCircle, ChevronUp, ChevronDown, Search, Filter, Crown, Anchor, Package, Calendar, Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import { format } from "date-fns";
import type { Task } from "@shared/schema";
import TableCustomizationModal, { ColumnConfig } from "@/components/TableCustomizationModal";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";

const propertySchema = z.object({
  accountId: z.string().nullable().optional(),
  name: z.string().min(1, "Property name is required"),
  address1: z.string().min(1, "Address line 1 is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2, "State must be 2 characters"),
  zip: z.string().min(5, "ZIP code is required"),
  type: z.enum(["single-family", "condo", "apartment", "house", "commercial", "storage_unit", "boat"]),
  units: z.number().min(1).optional(),
  squareFootage: z.number().min(1).optional(),
  billingType: z.enum(["sqft", "flat_fee"]).optional(),
  status: z.enum(["occupied", "vacant", "under_repair"]).default("occupied"),
  imageUrl: z.string().optional(),
  communityId: z.number().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const bulkTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
  status: z.enum(["pending", "in_progress"]).default("pending"),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
  category: z.string().optional(),
});

type BulkTaskFormData = z.infer<typeof bulkTaskSchema>;

interface BulkTaskFormProps {
  selectedPropertyIds: number[];
  properties: any[];
  users: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

function BulkTaskForm({ selectedPropertyIds, properties, users, onSuccess, onCancel }: BulkTaskFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const form = useForm<BulkTaskFormData>({
    resolver: zodResolver(bulkTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      status: "pending",
      assignedToId: "",
      dueDate: "",
      category: "",
    },
  });

  const { data: templates = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/templates"],
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templateId === "none") {
      form.reset();
      return;
    }

    const template = templates.find((t) => t.id.toString() === templateId);
    if (template) {
      form.setValue("title", template.title || "");
      form.setValue("description", template.description || "");
      form.setValue("priority", (template.priority as "urgent" | "high" | "normal" | "low") || "normal");
      form.setValue("status", (template.status as "pending" | "in_progress") || "pending");
      form.setValue("category", template.category || "");
      if (template.assignedToId) {
        form.setValue("assignedToId", template.assignedToId);
      }
    }
  };

  const createBulkTasksMutation = useMutation({
    mutationFn: async (data: BulkTaskFormData) => {
      return apiRequest("POST", "/api/tasks/bulk", {
        ...data,
        propertyIds: selectedPropertyIds,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      // Call parent's onSuccess first to close modal and clear selections
      onSuccess();
      
      // Then show toast and reset local form state
      toast({
        title: "Tasks Created",
        description: `Successfully created ${selectedPropertyIds.length} task${selectedPropertyIds.length > 1 ? 's' : ''}`,
      });
      
      // Reset form and template selection after a brief delay to avoid state conflicts
      setTimeout(() => {
        form.reset();
        setSelectedTemplateId("");
      }, 0);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tasks",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BulkTaskFormData) => {
    createBulkTasksMutation.mutate(data);
  };

  const selectedPropertiesList = useMemo(() => {
    return properties?.filter((p: any) => selectedPropertyIds.includes(p.id)) || [];
  }, [properties, selectedPropertyIds]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Template Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Task Template</label>
          <Select 
            value={selectedTemplateId} 
            onValueChange={handleTemplateSelect}
          >
            <SelectTrigger data-testid="select-task-template">
              <SelectValue placeholder="Select a template (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No template (blank form)</SelectItem>
              {templates && templates.length > 0 ? (
                templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.title}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="empty" disabled>
                  No templates available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Select a template to pre-fill form fields, or start with a blank form
          </p>
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="e.g., Inspect for hurricane damage"
                  data-testid="input-bulk-task-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Enter task description..."
                  rows={3}
                  data-testid="textarea-bulk-task-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-bulk-task-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-bulk-task-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign To</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === "unassigned" ? "" : value)} 
                  value={field.value || "unassigned"}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-bulk-task-assigned">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field}
                    data-testid="input-bulk-task-due-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-bulk-task-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="administrative">Administrative</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-slate-900 mb-2">
            Selected Properties ({selectedPropertiesList.length})
          </h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedPropertiesList.map((property: any) => (
              <div key={property.id} className="text-sm text-slate-600">
                • {property.name}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-bulk-task"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createBulkTasksMutation.isPending}
            data-testid="button-submit-bulk-task"
          >
            {createBulkTasksMutation.isPending ? "Creating..." : `Create ${selectedPropertyIds.length} Task${selectedPropertyIds.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Properties() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [selectedProperties, setSelectedProperties] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [bulkTaskModalOpen, setBulkTaskModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Default column configuration for properties table
  const defaultColumns: ColumnConfig[] = [
    { id: 'name', label: 'Property Name', visible: true, required: true },
    { id: 'address', label: 'Address', visible: true },
    { id: 'client', label: 'Client', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'assignedStaff', label: 'Assigned Staff', visible: true },
    { id: 'community', label: 'Community', visible: true },
    { id: 'squareFootage', label: 'Sq Ft', visible: false },
    { id: 'billingType', label: 'Billing Type', visible: false },
  ];

  // Load column configuration from localStorage
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('propertyTableColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });

  // Save column configuration to localStorage
  const handleSaveColumns = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    localStorage.setItem('propertyTableColumns', JSON.stringify(newColumns));
  };

  // Get visible columns in order
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible);
  }, [columns]);

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

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties", showInactive],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/properties${showInactive ? '?includeInactive=true' : ''}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  const { data: communities = [] } = useQuery({
    queryKey: ["/api/communities"],
    enabled: isAuthenticated,
  });

  // Fetch custom fields for properties
  const { data: customFields = [] } = useQuery<any[]>({
    queryKey: ["/api/custom-fields", "property"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/custom-fields?entityType=property");
      return response.json();
    },
    enabled: isAuthenticated && isAddModalOpen,
  });

  // Fetch subscription tier to determine if premium property types are available
  const { data: subscriptionInfo } = useQuery<{ tier: string; characterLimit: number }>({
    queryKey: ["/api/alerts/limits"],
    enabled: isAuthenticated,
  });

  // Check if user's tier allows premium property types (Pro, Grow, Enterprise)
  const canUsePremiumTypes = subscriptionInfo && ['pro', 'grow', 'enterprise'].includes(subscriptionInfo.tier.toLowerCase());

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      accountId: "",
      name: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      type: "single-family",
      units: 1,
      status: "occupied",
      imageUrl: "",
      squareFootage: undefined,
      billingType: undefined,
      communityId: undefined,
    },
  });

  // Create property mutation
  const createPropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const response = await apiRequest("POST", "/api/properties", data);
      return response.json();
    },
    onSuccess: (newProperty) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property Added",
        description: `Property "${newProperty.name}" has been added successfully. Redirecting to profile...`,
      });
      setIsAddModalOpen(false);
      form.reset();
      // Redirect to property profile page after creation
      setTimeout(() => {
        setLocation(`/property-profile/${newProperty.id}`);
      }, 1000);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      
      toast({
        title: "Error",
        description: "Failed to add property. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/properties/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property Deleted",
        description: "Property has been permanently deleted.",
      });
      setDeleteModalOpen(false);
      setSelectedProperty(null);
      setDeleteConfirmText("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddProperty = (data: PropertyFormData) => {
    // Validate required custom fields
    const requiredFields = customFields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => {
      const value = customFieldValues[f.fieldKey];
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return !value && value !== false && value !== 0;
    });
    
    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in required custom fields: ${missingFields.map(f => f.fieldName).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    // Convert empty accountId to undefined for creates
    const cleanedData = {
      ...data,
      accountId: data.accountId?.trim() || undefined,
      customFieldValues: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
    };
    createPropertyMutation.mutate(cleanedData);
  };

  const handleDeleteProperty = (property: any) => {
    setSelectedProperty(property);
    setDeleteModalOpen(true);
  };

  const confirmDeleteProperty = () => {
    if (deleteConfirmText === "DELETE" && selectedProperty) {
      deletePropertyMutation.mutate(selectedProperty.id);
    }
  };

  const getPrimaryContact = (propertyId: number) => {
    return (contacts as any[])?.find((contact: any) => 
      contact.propertyId === propertyId && contact.type === "owner"
    );
  };

  const getAssignedStaff = (managerId: string | null) => {
    if (!managerId) return null;
    return (users as any[])?.find((user: any) => user.id === managerId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "default";
      case "vacant":
        return "secondary";
      case "under_repair":
        return "destructive";
      default:
        return "default";
    }
  };

  const getTypeDisplay = (type: string) => {
    switch (type) {
      case "single-family":
        return "Single-Family";
      case "condo":
        return "Condo";
      case "apartment":
        return "Apartment";
      case "house":
        return "House";
      case "commercial":
        return "Commercial";
      case "storage_unit":
        return "Storage Unit";
      case "boat":
        return "Boat";
      default:
        return type;
    }
  };

  const formatFullAddress = (property: any) => {
    if (!property) return "";
    const parts = [
      property.address1,
      property.address2,
      property.city,
      property.state,
      property.zip
    ].filter(Boolean);
    return parts.join(", ");
  };

  // Render cell content based on column type
  const renderCellContent = (columnId: string, property: any) => {
    switch (columnId) {
      case 'name':
        return property.name;
      
      case 'address':
        return formatFullAddress(property);
      
      case 'client': {
        const primaryContact = getPrimaryContact(property.id);
        return primaryContact 
          ? `${primaryContact.firstName || ''} ${primaryContact.lastName || ''}`.trim() || 'N/A'
          : 'N/A';
      }
      
      case 'type':
        return getTypeDisplay(property.type);
      
      case 'status':
        return (
          <Badge variant={getStatusColor(property.status)}>
            {property.status.replace('_', ' ')}
          </Badge>
        );
      
      case 'assignedStaff': {
        const staff = getAssignedStaff(property.managerId);
        if (!staff) return 'Unassigned';
        return (
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {staff.firstName?.[0]}{staff.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span>{staff.firstName} {staff.lastName}</span>
          </div>
        );
      }
      
      case 'squareFootage':
        return property.squareFootage ? `${property.squareFootage.toLocaleString()} sq ft` : 'N/A';
      
      case 'billingType':
        return property.billingType 
          ? property.billingType === 'sqft' ? 'Per Sq Ft' : 'Flat Fee'
          : 'N/A';
      
      case 'community': {
        const community = (communities as any[])?.find((c: any) => c.id === property.communityId);
        return community ? community.name : 'N/A';
      }
      
      default:
        return null;
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const visiblePropertyIds = new Set<number>(filteredAndSortedProperties?.map((p: any) => p.id) || []);
      setSelectedProperties(visiblePropertyIds);
    } else {
      setSelectedProperties(new Set<number>());
    }
  };

  const handleSelectProperty = (propertyId: number, checked: boolean) => {
    const newSelected = new Set(selectedProperties);
    if (checked) {
      newSelected.add(propertyId);
    } else {
      newSelected.delete(propertyId);
      setSelectAll(false);
    }
    setSelectedProperties(newSelected);

    // Update select all state
    if (filteredAndSortedProperties && newSelected.size === filteredAndSortedProperties.length) {
      setSelectAll(true);
    }
  };

  // Reset selection when properties or filters change
  useEffect(() => {
    setSelectedProperties(new Set<number>());
    setSelectAll(false);
  }, [properties, searchTerm, filterType, filterStatus]);

  // Reset to page 1 when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus, showInactive, itemsPerPage]);

  // Reset custom field values when modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      setCustomFieldValues({});
    }
  }, [isAddModalOpen]);

  // Bulk actions
  const handleGenerateReport = () => {
    const selectedPropertyList = properties?.filter((p: any) => selectedProperties.has(p.id));
    if (!selectedPropertyList?.length) return;

    // Create report data
    const reportData = {
      title: `Property Report - ${new Date().toLocaleDateString()}`,
      properties: selectedPropertyList,
      generatedAt: new Date().toISOString(),
      totalProperties: selectedPropertyList.length
    };

    // Generate CSV-style report
    const csvContent = [
      ['Property Name', 'Address', 'Type', 'Status', 'Square Footage', 'Billing Type'].join(','),
      ...selectedPropertyList.map((prop: any) => [
        `"${prop.name}"`,
        `"${formatFullAddress(prop)}"`,
        `"${getTypeDisplay(prop.type)}"`,
        `"${prop.status.replace('_', ' ')}"`,
        prop.squareFootage || 'N/A',
        prop.billingType ? (prop.billingType === 'sqft' ? 'Per Sq Ft' : 'Flat Fee') : 'N/A'
      ].join(','))
    ].join('\n');

    // Download the report
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report Generated",
      description: `Downloaded report for ${selectedPropertyList.length} properties`,
    });
  };

  const handleBulkEmail = () => {
    const selectedPropertyList = properties?.filter((p: any) => selectedProperties.has(p.id));
    if (!selectedPropertyList?.length) return;

    // Get all contacts for selected properties
    const propertyContacts = selectedPropertyList.map((prop: any) => {
      const contact = getPrimaryContact(prop.id);
      return contact ? { property: prop, contact } : null;
    }).filter(Boolean);

    if (propertyContacts.length === 0) {
      toast({
        title: "No Contacts Found",
        description: "Selected properties don't have primary contacts with email addresses",
        variant: "destructive",
      });
      return;
    }

    // Create mailto link with all contacts
    const emailAddresses = propertyContacts
      .map((pc: any) => pc.contact.email)
      .filter(Boolean)
      .join(',');

    const subject = encodeURIComponent(`Important Update Regarding Your Property`);
    const body = encodeURIComponent(`Dear Property Owners,\n\nWe hope this message finds you well. We are reaching out regarding your property/properties:\n\n${propertyContacts.map((pc: any) => `• ${pc.property.name} (${formatFullAddress(pc.property)})`).join('\n')}\n\nBest regards,\nHubify Property Management`);

    window.open(`mailto:${emailAddresses}?subject=${subject}&body=${body}`);

    toast({
      title: "Email Composer Opened",
      description: `Prepared email for ${propertyContacts.length} property contacts`,
    });
  };

  const handleBulkCommunication = () => {
    const selectedPropertyList = properties?.filter((p: any) => selectedProperties.has(p.id));
    if (!selectedPropertyList?.length) return;

    // For now, show a simple message about the communication feature
    toast({
      title: "Communication Feature",
      description: `This would open a communication interface for ${selectedPropertyList.length} properties. Feature coming soon!`,
    });
  };

  // Sorting and filtering logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedProperties = properties?.filter((property: any) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const primaryContact = getPrimaryContact(property.id);
      const clientName = primaryContact 
        ? [primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(' ').toLowerCase()
        : '';
      
      const community = (communities as any[])?.find((c: any) => c.id === property.communityId);
      const communityName = community ? community.name.toLowerCase() : '';
      
      const matchesSearch = 
        property.name.toLowerCase().includes(searchLower) ||
        formatFullAddress(property).toLowerCase().includes(searchLower) ||
        property.type.toLowerCase().includes(searchLower) ||
        property.status.toLowerCase().includes(searchLower) ||
        clientName.includes(searchLower) ||
        communityName.includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType !== "all" && property.type !== filterType) {
      return false;
    }

    // Status filter
    if (filterStatus !== "all" && property.status !== filterStatus) {
      return false;
    }

    return true;
  }).sort((a: any, b: any) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle special cases
    if (sortField === "address") {
      aValue = formatFullAddress(a);
      bValue = formatFullAddress(b);
    }

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Paginate the filtered and sorted properties
  const totalItems = filteredAndSortedProperties?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const effectivePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

  // Update currentPage state if it exceeds valid range
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalItems, itemsPerPage, currentPage, totalPages]);

  const startIndex = (effectivePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProperties = filteredAndSortedProperties?.slice(startIndex, endIndex);

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Properties</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your property portfolio and community information.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-4">
            {/* Show Inactive Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-2"
            >
              {showInactive ? (
                <ToggleRight className="w-4 h-4 text-green-600" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-slate-400" />
              )}
              {showInactive ? "Hide Inactive" : "Show Inactive"}
            </Button>
            
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Property</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddProperty)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property/Community Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter property name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="accountId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account ID</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="External account number (optional)" 
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="address1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 1</FormLabel>
                              <FormControl>
                                <Input placeholder="Street address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="address2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 2</FormLabel>
                              <FormControl>
                                <Input placeholder="Apt, suite, unit #" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="City" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input placeholder="State" maxLength={2} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="zip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP Code</FormLabel>
                              <FormControl>
                                <Input placeholder="ZIP" maxLength={10} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="single-family" data-testid="type-single-family">Single-Family</SelectItem>
                                  <SelectItem value="condo" data-testid="type-condo">Condo</SelectItem>
                                  <SelectItem value="apartment" data-testid="type-apartment">Apartment</SelectItem>
                                  <SelectItem value="house" data-testid="type-house">House</SelectItem>
                                  <SelectItem value="commercial" data-testid="type-commercial">Commercial</SelectItem>
                                  {canUsePremiumTypes && (
                                    <>
                                      <SelectItem value="storage_unit" data-testid="type-storage-unit">
                                        <div className="flex items-center gap-2">
                                          <Package className="w-4 h-4" />
                                          Storage Unit
                                          <Badge variant="secondary" className="ml-2 text-xs">
                                            <Crown className="w-3 h-3 mr-1" />
                                            Premium
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="boat" data-testid="type-boat">
                                        <div className="flex items-center gap-2">
                                          <Anchor className="w-4 h-4" />
                                          Boat
                                          <Badge variant="secondary" className="ml-2 text-xs">
                                            <Crown className="w-3 h-3 mr-1" />
                                            Premium
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    </>
                                  )}
                                  {!canUsePremiumTypes && (
                                    <div className="px-2 py-2 text-xs text-muted-foreground border-t">
                                      <div className="flex items-center gap-1">
                                        <Crown className="w-3 h-3" />
                                        Storage Units & Boats available on Pro+ plans
                                      </div>
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="occupied">Occupied</SelectItem>
                                  <SelectItem value="vacant">Vacant</SelectItem>
                                  <SelectItem value="under_repair">Under Repair</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="squareFootage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Square Footage</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  placeholder="Enter sq ft"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="billingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Billing Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select billing" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="sqft">Per Sq Ft</SelectItem>
                                  <SelectItem value="flat_fee">Flat Fee</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter image URL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Custom Fields */}
                    {customFields.length > 0 && (
                      <CustomFieldsRenderer
                        fields={customFields}
                        values={customFieldValues}
                        onChange={setCustomFieldValues}
                        mode="edit"
                      />
                    )}
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createPropertyMutation.isPending}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {createPropertyMutation.isPending ? "Adding..." : "Add Property"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by name, address, client, type, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-properties"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="single-family">Single-Family</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="storage_unit">Storage Unit</SelectItem>
                <SelectItem value="boat">Boat</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="under_repair">Under Repair</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || filterType !== "all" || filterStatus !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterStatus("all");
                }}
                data-testid="clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedProperties.size > 0 && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedProperties.size} {selectedProperties.size === 1 ? 'property' : 'properties'} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateReport}
                    className="bg-white hover:bg-blue-50"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkEmail}
                    className="bg-white hover:bg-blue-50"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Owners
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white hover:bg-blue-50"
                        data-testid="button-more-actions"
                      >
                        More Actions
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleBulkCommunication}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Send Messages
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setBulkTaskModalOpen(true)}
                        data-testid="menu-item-create-tasks"
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        Create Tasks
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedProperties(new Set<number>());
                  setSelectAll(false);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Properties Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <CardTitle>Properties List</CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-600">
                  {filteredAndSortedProperties?.length || 0} of {properties?.length || 0} properties
                  {selectedProperties.size > 0 && (
                    <span className="ml-2 font-medium">
                      • {selectedProperties.size} selected
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomizeModalOpen(true)}
                  data-testid="customize-property-table-btn"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {propertiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : properties?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      aria-label="Select all properties"
                    />
                  </TableHead>
                  {visibleColumns.map((column) => (
                    <TableHead 
                      key={column.id}
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label} {getSortIcon(column.id)}
                    </TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProperties?.map((property: any) => (
                  <TableRow 
                    key={property.id}
                    className={`cursor-pointer hover:bg-slate-50 ${
                      selectedProperties.has(property.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setLocation(`/property-profile/${property.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedProperties.has(property.id)}
                        onCheckedChange={(checked) => 
                          handleSelectProperty(property.id, checked as boolean)
                        }
                        aria-label={`Select ${property.name}`}
                      />
                    </TableCell>
                    {visibleColumns.map((column) => (
                      <TableCell key={column.id} className={column.id === 'name' ? 'font-medium' : ''}>
                        {renderCellContent(column.id, property)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/property-profile/${property.id}?edit=true`);
                          }}
                          title="Edit Property"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProperty(property);
                          }}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                          title="Delete Property"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Building className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-medium mb-2">No Properties Found</h3>
              <p className="mb-4">Get started by adding your first property.</p>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </div>
          )}
          
          {/* Pagination */}
          {totalItems > 0 && (
            <TablePagination
              currentPage={effectivePage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Bulk Task Creation Modal */}
      <Dialog open={bulkTaskModalOpen} onOpenChange={setBulkTaskModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Tasks for Selected Properties</DialogTitle>
            <p className="text-sm text-slate-600 mt-2">
              Creating tasks for {selectedProperties.size} selected {selectedProperties.size === 1 ? 'property' : 'properties'}
            </p>
          </DialogHeader>
          <BulkTaskForm
            selectedPropertyIds={Array.from(selectedProperties)}
            properties={properties || []}
            users={users as any[] || []}
            onSuccess={() => {
              setBulkTaskModalOpen(false);
              setSelectedProperties(new Set());
              setSelectAll(false);
              queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
            }}
            onCancel={() => setBulkTaskModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Property Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => {
        setDeleteModalOpen(open);
        if (!open) {
          setSelectedProperty(null);
          setDeleteConfirmText("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete <strong>{selectedProperty?.name}</strong>? 
              This action cannot be undone.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-medium">
                Type <code className="bg-yellow-100 px-1 rounded">DELETE</code> to confirm:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedProperty(null);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== "DELETE" || deletePropertyMutation.isPending}
                onClick={confirmDeleteProperty}
              >
                {deletePropertyMutation.isPending ? "Deleting..." : "Delete Property"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Column Customization Modal */}
      <TableCustomizationModal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        columns={columns}
        defaultColumns={defaultColumns}
        onSave={handleSaveColumns}
      />
    </main>
  );
}