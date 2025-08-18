import { useEffect, useState } from "react";
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
import { Building, MapPin, Users, Plus, Home, Square, DollarSign, Activity, Eye, Edit, ToggleLeft, ToggleRight, Trash2, FileText, Mail, MessageCircle, ChevronUp, ChevronDown, Search, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address1: z.string().min(1, "Address line 1 is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2, "State must be 2 characters"),
  zip: z.string().min(5, "ZIP code is required"),
  type: z.enum(["single-family", "condo", "apartment", "house", "commercial"]),
  units: z.number().min(1).optional(),
  squareFootage: z.number().min(1).optional(),
  billingType: z.enum(["sqft", "flat_fee"]).optional(),
  status: z.enum(["occupied", "vacant", "under_repair"]).default("occupied"),
  imageUrl: z.string().optional(),
  communityId: z.number().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

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

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties", showInactive],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/properties${showInactive ? '?includeInactive=true' : ''}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
  });

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
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
        setLocation(`/property-profile?id=${newProperty.id}`);
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
    createPropertyMutation.mutate(data);
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
      const matchesSearch = 
        property.name.toLowerCase().includes(searchLower) ||
        formatFullAddress(property).toLowerCase().includes(searchLower) ||
        property.type.toLowerCase().includes(searchLower) ||
        property.status.toLowerCase().includes(searchLower);
      
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
                                  <SelectItem value="single-family">Single-Family</SelectItem>
                                  <SelectItem value="condo">Condo</SelectItem>
                                  <SelectItem value="apartment">Apartment</SelectItem>
                                  <SelectItem value="house">House</SelectItem>
                                  <SelectItem value="commercial">Commercial</SelectItem>
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
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
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
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        More Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleBulkCommunication}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Send Messages
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toast({
                          title: "Bulk Tasks Feature",
                          description: "Create tasks for selected properties - coming soon!",
                        });
                      }}>
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Properties List</CardTitle>
            <div className="text-sm text-slate-600">
              {filteredAndSortedProperties?.length || 0} of {properties?.length || 0} properties
              {selectedProperties.size > 0 && (
                <span className="ml-2 font-medium">
                  • {selectedProperties.size} selected
                </span>
              )}
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
                  <TableHead>Image</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50 select-none"
                    onClick={() => handleSort("name")}
                  >
                    Property/Community Name {getSortIcon("name")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50 select-none"
                    onClick={() => handleSort("address")}
                  >
                    Address {getSortIcon("address")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50 select-none"
                    onClick={() => handleSort("type")}
                  >
                    Type {getSortIcon("type")}
                  </TableHead>
                  <TableHead>Primary Contact</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50 select-none"
                    onClick={() => handleSort("squareFootage")}
                  >
                    Square Footage {getSortIcon("squareFootage")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50 select-none"
                    onClick={() => handleSort("billingType")}
                  >
                    Billing Type {getSortIcon("billingType")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50 select-none"
                    onClick={() => handleSort("status")}
                  >
                    Status {getSortIcon("status")}
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProperties?.map((property: any) => {
                  const primaryContact = getPrimaryContact(property.id);
                  return (
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
                      <TableCell>
                        {property.imageUrl ? (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={property.imageUrl} alt={property.name} />
                            <AvatarFallback>
                              <Building className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <Building className="h-5 w-5 text-slate-500" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{property.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{formatFullAddress(property)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{getTypeDisplay(property.type)}</Badge>
                          {!property.isActive && (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">Inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {primaryContact ? (
                          <div className="text-sm">
                            <div 
                              className="font-medium text-primary hover:text-primary/80 cursor-pointer underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/person-profile/${primaryContact.id}`);
                              }}
                            >
                              {primaryContact.firstName} {primaryContact.lastName}
                            </div>
                            <div className="text-slate-600">{primaryContact.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">No contact</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {property.squareFootage ? (
                          <span className="flex items-center">
                            <Square className="h-4 w-4 mr-1" />
                            {property.squareFootage.toLocaleString()} sq ft
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {property.billingType ? (
                          <Badge variant="secondary">
                            {property.billingType === 'sqft' ? 'Per Sq Ft' : 'Flat Fee'}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(property.status)}>
                          {property.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
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
                  );
                })}
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
        </CardContent>
      </Card>

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
    </main>
  );
}