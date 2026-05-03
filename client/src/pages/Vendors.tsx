import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link as RouterLink } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building, 
  Plus, 
  Mail, 
  Phone, 
  Edit,
  Trash2,
  Search,
  AlertCircle,
  Settings,
  Download
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { prefStorage } from "@/lib/cookieConsent";
import { isUnauthorizedError } from "@/lib/authUtils";
import TableCustomizationModal, { ColumnConfig } from "@/components/TableCustomizationModal";

const vendorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  type: z.literal("vendor"),
  vendorCategory: z.enum(["organization", "individual"], { required_error: "Category is required" }),
  vendorType: z.string().min(1, "Type is required"),
  vendorTypeOther: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.vendorType === "Other" && !data.vendorTypeOther) {
    return false;
  }
  return true;
}, {
  message: "Please specify the vendor type",
  path: ["vendorTypeOther"],
});

type VendorFormData = z.infer<typeof vendorSchema>;

export default function Vendors() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  // Default column configuration for vendors table
  const defaultColumns: ColumnConfig[] = [
    { id: 'name', label: 'Name', visible: true, required: true },
    { id: 'category', label: 'Category', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'email', label: 'Email', visible: true },
    { id: 'phone', label: 'Phone', visible: true },
    { id: 'actions', label: 'Actions', visible: true, required: true },
  ];

  // Merge saved columns with defaults to ensure new columns appear while preserving order
  const mergeColumns = (saved: ColumnConfig[], defaults: ColumnConfig[]): ColumnConfig[] => {
    const defaultsMap = new Map(defaults.map(col => [col.id, col]));
    const savedIds = new Set(saved.map(col => col.id));
    
    // Start with saved columns, updating their properties from defaults
    const mergedColumns = saved.map(savedCol => {
      const defaultCol = defaultsMap.get(savedCol.id);
      if (defaultCol) {
        // Preserve saved visibility unless it's a required column
        return {
          ...defaultCol,
          visible: defaultCol.required ? true : savedCol.visible,
        };
      }
      // Keep saved column even if not in defaults (backwards compatibility)
      return savedCol;
    });
    
    // Append any new columns from defaults that aren't in saved
    defaults.forEach(defaultCol => {
      if (!savedIds.has(defaultCol.id)) {
        mergedColumns.push(defaultCol);
      }
    });
    
    return mergedColumns;
  };

  // Load column configuration from localStorage with window guard
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window === 'undefined') return defaultColumns;
    
    try {
      const saved = prefStorage.getItem('vendorsTableColumns');
      if (saved) {
        const parsedColumns = JSON.parse(saved);
        return mergeColumns(parsedColumns, defaultColumns);
      }
    } catch (error) {
      console.warn('Failed to load vendors table columns from localStorage:', error);
    }
    return defaultColumns;
  });

  // Save column configuration to localStorage
  const handleSaveColumns = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    if (typeof window !== 'undefined') {
      try {
        prefStorage.setItem('vendorsTableColumns', JSON.stringify(newColumns));
      } catch (error) {
        console.warn('Failed to save vendors table columns to localStorage:', error);
      }
    }
  };

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

  // Fetch all contacts and filter for vendors
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/contacts");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Filter to only show vendors
  const vendors = contacts?.filter((c: any) => c.type === "vendor") || [];

  // Add vendor form
  const addForm = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      type: "vendor",
      vendorCategory: "organization",
      vendorType: "",
      vendorTypeOther: "",
      notes: "",
    },
  });

  // Edit vendor form
  const editForm = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      type: "vendor",
      vendorCategory: "organization",
      vendorType: "",
      vendorTypeOther: "",
      notes: "",
    },
  });

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      const response = await apiRequest("POST", "/api/contacts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Vendor Added",
        description: "Vendor has been added successfully.",
      });
      setIsAddModalOpen(false);
      addForm.reset();
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
        description: "Failed to add vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: VendorFormData }) => {
      const response = await apiRequest("PATCH", `/api/contacts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Vendor Updated",
        description: "Vendor has been updated successfully.",
      });
      setIsEditModalOpen(false);
      setSelectedVendor(null);
      editForm.reset();
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
        description: "Failed to update vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/contacts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Vendor Deleted",
        description: "Vendor has been deleted successfully.",
      });
      setDeleteModalOpen(false);
      setVendorToDelete(null);
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
        description: "Failed to delete vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddVendor = (data: VendorFormData) => {
    createVendorMutation.mutate(data);
  };

  const handleEditVendor = (vendor: any) => {
    setSelectedVendor(vendor);
    editForm.reset({
      firstName: vendor.firstName,
      lastName: vendor.lastName,
      email: vendor.email || "",
      phone: vendor.phone || "",
      type: "vendor",
      vendorCategory: vendor.vendorCategory || "organization",
      vendorType: vendor.vendorType || "",
      vendorTypeOther: vendor.vendorTypeOther || "",
      notes: vendor.notes || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateVendor = (data: VendorFormData) => {
    if (selectedVendor) {
      updateVendorMutation.mutate({ id: selectedVendor.id, data });
    }
  };

  const handleDeleteVendor = (vendor: any) => {
    setVendorToDelete(vendor);
    setDeleteModalOpen(true);
  };

  const confirmDeleteVendor = () => {
    if (deleteConfirmText === "DELETE" && vendorToDelete) {
      deleteVendorMutation.mutate(vendorToDelete.id);
    }
  };

  const handleExportCSV = () => {
    if (!vendors || vendors.length === 0) {
      toast({
        title: "No Data",
        description: "There are no vendors to export.",
        variant: "destructive",
      });
      return;
    }

    // Generate CSV content
    let csvContent = "First Name,Last Name,Category,Type,Email,Phone,Notes\n";
    filteredVendors.forEach((vendor: any) => {
      const vendorType = vendor.vendorType === 'Other' && vendor.vendorTypeOther 
        ? vendor.vendorTypeOther 
        : vendor.vendorType || 'N/A';
      const category = vendor.vendorCategory === 'organization' ? 'Organization' : 'Individual';
      csvContent += `"${vendor.firstName || ''}","${vendor.lastName || ''}","${category}","${vendorType}","${vendor.email || ''}","${vendor.phone || ''}","${(vendor.notes || '').replace(/"/g, '""')}"\n`;
    });

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vendors_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredVendors.length} vendor${filteredVendors.length !== 1 ? 's' : ''} to CSV.`,
    });
  };

  // Filter vendors by search query
  const filteredVendors = vendors.filter((vendor: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      vendor.firstName.toLowerCase().includes(query) ||
      vendor.lastName.toLowerCase().includes(query) ||
      vendor.email?.toLowerCase().includes(query) ||
      vendor.phone?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage service providers and vendor contacts
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <Button 
              variant="outline"
              onClick={handleExportCSV}
              data-testid="button-export-vendors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              data-testid="button-add-vendor"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Total Vendors
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {vendors.length}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search vendors by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-vendors"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vendors</CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">
                {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomizeModalOpen(true)}
                data-testid="customize-vendors-table-btn"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {contactsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-600">Loading vendors...</p>
            </div>
          ) : filteredVendors.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.filter(col => col.visible).map(col => (
                      <TableHead 
                        key={col.id} 
                        className={col.id === 'actions' ? 'text-right' : ''}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor: any) => (
                    <TableRow key={vendor.id} data-testid={`vendor-row-${vendor.id}`}>
                      {columns.filter(col => col.visible).map(col => {
                        switch (col.id) {
                          case 'name':
                            return (
                              <TableCell key={col.id} className="font-medium">
                                <RouterLink href={`/admin/vendors/${vendor.id}`}>
                                  <span className="text-blue-600 hover:underline cursor-pointer">
                                    {vendor.firstName} {vendor.lastName}
                                  </span>
                                </RouterLink>
                              </TableCell>
                            );
                          case 'email':
                            return (
                              <TableCell key={col.id}>
                                {vendor.email ? (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">
                                      {vendor.email}
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">No email</span>
                                )}
                              </TableCell>
                            );
                          case 'phone':
                            return (
                              <TableCell key={col.id}>
                                {vendor.phone ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline">
                                      {vendor.phone}
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">No phone</span>
                                )}
                              </TableCell>
                            );
                          case 'category':
                            return (
                              <TableCell key={col.id}>
                                {vendor.vendorCategory ? (
                                  <Badge variant="secondary">
                                    {vendor.vendorCategory === 'organization' ? 'Organization' : 'Individual'}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </TableCell>
                            );
                          case 'type':
                            return (
                              <TableCell key={col.id}>
                                {vendor.vendorType ? (
                                  <Badge variant="outline">
                                    {vendor.vendorType === 'Other' && vendor.vendorTypeOther 
                                      ? vendor.vendorTypeOther 
                                      : vendor.vendorType}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </TableCell>
                            );
                          case 'actions':
                            return (
                              <TableCell key={col.id} className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditVendor(vendor)}
                                    data-testid={`button-edit-vendor-${vendor.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteVendor(vendor)}
                                    data-testid={`button-delete-vendor-${vendor.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            );
                          default:
                            return null;
                        }
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {searchQuery ? "No vendors found" : "No vendors yet"}
              </h3>
              <p className="text-slate-600 mb-4">
                {searchQuery 
                  ? "Try adjusting your search terms" 
                  : "Add your first vendor to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vendor
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vendor Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddVendor)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="vendorCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vendor-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="organization">Organization</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="vendorType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vendor-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HVAC">HVAC</SelectItem>
                        <SelectItem value="Electrician">Electrician</SelectItem>
                        <SelectItem value="Security">Security</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {addForm.watch("vendorType") === "Other" && (
                <FormField
                  control={addForm.control}
                  name="vendorTypeOther"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specify Type *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Landscaping, Plumbing" data-testid="input-vendor-type-other" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={addForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-vendor">
                  Add Vendor
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateVendor)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="vendorCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-vendor-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="organization">Organization</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="vendorType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-vendor-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HVAC">HVAC</SelectItem>
                        <SelectItem value="Electrician">Electrician</SelectItem>
                        <SelectItem value="Security">Security</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {editForm.watch("vendorType") === "Other" && (
                <FormField
                  control={editForm.control}
                  name="vendorTypeOther"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specify Type *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Landscaping, Plumbing" data-testid="input-edit-vendor-type-other" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="input-edit-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-update-vendor">
                  Update Vendor
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  This action cannot be undone
                </p>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently delete the vendor:{" "}
                  <strong>
                    {vendorToDelete?.firstName} {vendorToDelete?.lastName}
                  </strong>
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Type DELETE to confirm
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="mt-1"
                data-testid="input-delete-confirm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteConfirmText("");
                setVendorToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteVendor}
              disabled={deleteConfirmText !== "DELETE"}
              data-testid="button-confirm-delete"
            >
              Delete Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Customization Modal */}
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
