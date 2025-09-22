import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  UserCheck, 
  Plus, 
  Mail, 
  Phone, 
  Building, 
  Edit,
  Trash2,
  Search,
  ToggleLeft,
  ToggleRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  MoreHorizontal
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const contactSchema = z.object({
  accountId: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  type: z.enum(["tenant", "owner", "vendor", "emergency_contact"]),
  propertyId: z.number().optional(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function People() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [sortField, setSortField] = useState<string>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

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

  // Fetch contacts
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts", showInactive],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/contacts${showInactive ? '?includeInactive=true' : ''}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch properties for dropdown
  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
  });

  // Add contact form
  const addForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      accountId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      type: "tenant",
      notes: "",
    },
  });

  // Edit contact form
  const editForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      accountId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      type: "tenant",
      notes: "",
    },
  });

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiRequest("POST", "/api/contacts", data);
      return response.json();
    },
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact Added",
        description: "Contact has been added successfully. Redirecting to profile...",
      });
      setIsAddModalOpen(false);
      addForm.reset();
      // Redirect to contact profile page after creation
      setTimeout(() => {
        setLocation(`/person-profile/${newContact.id}`);
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
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ContactFormData }) => {
      const response = await apiRequest("PATCH", `/api/contacts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact Updated",
        description: "Contact has been updated successfully.",
      });
      setIsEditModalOpen(false);
      setSelectedContact(null);
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
        description: "Failed to update contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/contacts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact Deleted",
        description: "Contact has been deleted successfully.",
      });
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
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddContact = (data: ContactFormData) => {
    createContactMutation.mutate(data);
  };

  const handleEditContact = (contact: any) => {
    setSelectedContact(contact);
    editForm.reset({
      accountId: contact.accountId || "",
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || "",
      phone: contact.phone || "",
      type: contact.type,
      propertyId: contact.propertyId,
      notes: contact.notes || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateContact = (data: ContactFormData) => {
    if (selectedContact) {
      updateContactMutation.mutate({ id: selectedContact.id, data });
    }
  };

  const handleDeleteContact = (contact: any) => {
    setContactToDelete(contact);
    setDeleteModalOpen(true);
  };

  const confirmDeleteContact = () => {
    if (deleteConfirmText === "DELETE" && contactToDelete) {
      deleteContactMutation.mutate(contactToDelete.id);
    }
  };

  const getTypeColor = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "tenant":
        return "default";
      case "owner": 
        return "secondary";
      case "vendor":
        return "outline";
      case "emergency_contact":
        return "destructive";
      default:
        return "default";
    }
  };

  const getPropertyName = (propertyId: number | null) => {
    if (!propertyId || !properties) return "No property";
    const property = (properties as any[]).find((p: any) => p.id === propertyId);
    return property?.name || "Unknown property";
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Selection handlers
  const toggleContactSelection = (contactId: number) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
    setSelectAll(newSelected.size === groupedContacts?.length);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedContacts(new Set());
      setSelectAll(false);
    } else {
      const allContactIds = new Set(groupedContacts?.map((group: any) => group.id) || []);
      setSelectedContacts(allContactIds);
      setSelectAll(true);
    }
  };

  const clearSelection = () => {
    setSelectedContacts(new Set());
    setSelectAll(false);
  };

  // Bulk contact export
  const handleBulkExport = () => {
    if (selectedContacts.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select contacts to export.",
        variant: "destructive",
      });
      return;
    }

    const selectedContactsData = groupedContacts?.filter((group: any) => 
      selectedContacts.has(group.id)
    ) || [];

    // Generate CSV content
    let csvContent = "Name,Type,Email,Phone,Properties,Status\n";
    selectedContactsData.forEach((group: any) => {
      const propertiesText = group.properties.length > 0 
        ? group.properties.map((p: any) => p.propertyName + (p.isPrimary ? ' (Primary)' : '')).join('; ')
        : 'N/A';
      csvContent += `"${group.firstName} ${group.lastName}",${group.type || 'N/A'},"${group.email || 'N/A'}","${group.phone || 'N/A'}","${propertiesText}",${group.isActive ? 'Active' : 'Inactive'}\n`;
    });

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Contacts_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `${selectedContacts.size} contacts exported successfully.`,
    });
  };

  // Bulk email contacts
  const handleBulkEmail = () => {
    if (selectedContacts.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select contacts to email.",
        variant: "destructive",
      });
      return;
    }

    const selectedContactsData = groupedContacts?.filter((group: any) => 
      selectedContacts.has(group.id) && group.email
    ) || [];

    if (selectedContactsData.length === 0) {
      toast({
        title: "No Email Addresses",
        description: "None of the selected contacts have email addresses.",
        variant: "destructive",
      });
      return;
    }

    const emailList = selectedContactsData.map((group: any) => group.email).join(',');
    const subject = encodeURIComponent('Message from Property Management Team');
    const body = encodeURIComponent(`Dear Property Contacts,\n\nWe hope this message finds you well.\n\nBest regards,\nProperty Management Team`);
    
    window.open(`mailto:${emailList}?subject=${subject}&body=${body}`, '_blank');
    
    toast({
      title: "Email Client Opened",
      description: `Email addresses for ${selectedContactsData.length} contacts loaded.`,
    });
  };

  const filteredAndSortedContacts = contacts
    ?.filter((contact: any) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          contact.firstName.toLowerCase().includes(query) ||
          contact.lastName.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.type.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // Type filter
      if (typeFilter !== "all" && contact.type !== typeFilter) {
        return false;
      }

      // Property filter
      if (propertyFilter !== "all" && contact.propertyId?.toString() !== propertyFilter) {
        return false;
      }

      return true;
    })
    ?.sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle special cases
      if (sortField === "name") {
        aValue = `${a.firstName} ${a.lastName}`;
        bValue = `${b.firstName} ${b.lastName}`;
      } else if (sortField === "property") {
        aValue = getPropertyName(a.propertyId);
        bValue = getPropertyName(b.propertyId);
      }

      // Convert to string for comparison
      aValue = aValue?.toString().toLowerCase() || "";
      bValue = bValue?.toString().toLowerCase() || "";

      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

  // Group contacts by person (firstName + lastName + email combination)
  const groupedContacts = React.useMemo(() => {
    if (!filteredAndSortedContacts) return [];

    const contactGroups = new Map();

    filteredAndSortedContacts.forEach((contact: any) => {
      const personKey = `${contact.firstName}_${contact.lastName}_${contact.email || ''}`;
      
      if (!contactGroups.has(personKey)) {
        contactGroups.set(personKey, {
          id: contact.id, // Use first contact's ID as the group ID
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          type: contact.type,
          isActive: contact.isActive,
          properties: [],
          contactIds: [] // Track all contact IDs in this group for selection
        });
      }
      
      const group = contactGroups.get(personKey);
      group.contactIds.push(contact.id);
      
      // Add properties from the contact's properties array
      if (contact.properties && contact.properties.length > 0) {
        contact.properties.forEach((property: any) => {
          // Check if property already exists in the group
          const existingPropertyIndex = group.properties.findIndex(
            (prop: any) => prop.propertyId === property.propertyId
          );
          
          if (existingPropertyIndex === -1) {
            group.properties.push({
              propertyId: property.propertyId,
              propertyName: property.propertyName,
              isPrimary: property.isPrimary
            });
          }
        });
      }
    });

    // Convert map to array and sort by name
    const groupsArray = Array.from(contactGroups.values());
    
    // Sort properties within each group (primary first)
    groupsArray.forEach(group => {
      group.properties.sort((a: any, b: any) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.propertyName.localeCompare(b.propertyName);
      });
    });

    return groupsArray;
  }, [filteredAndSortedContacts]);

  const getContactStats = () => {
    if (!contacts) return { total: 0, tenants: 0, owners: 0, vendors: 0 };
    
    return {
      total: contacts.length,
      tenants: contacts.filter((c: any) => c.type === "tenant").length,
      owners: contacts.filter((c: any) => c.type === "owner").length,
      vendors: contacts.filter((c: any) => c.type === "vendor").length,
    };
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

  const stats = getContactStats();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">People</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage contacts, tenants, owners, and vendors
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
            
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Total Contacts
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {stats.total}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Tenants
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {stats.tenants}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Owners
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {stats.owners}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="ml-4">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Vendors
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {stats.vendors}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search contacts by name, email, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="min-w-[140px]">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="owner">Owners</SelectItem>
                    <SelectItem value="tenant">Tenants</SelectItem>
                    <SelectItem value="vendor">Vendors</SelectItem>
                    <SelectItem value="emergency_contact">Emergency Contacts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[160px]">
                <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {(properties as any[])?.map((property: any) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(searchQuery || typeFilter !== "all" || propertyFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("all");
                    setPropertyFilter("all");
                  }}
                  className="whitespace-nowrap"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contacts</CardTitle>
            <div className="text-sm text-slate-600">
              {groupedContacts?.length || 0} people ({filteredAndSortedContacts?.length || 0} contacts)
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contactsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : groupedContacts?.length > 0 ? (
            <div className="rounded-md border">
              {/* Bulk Actions Toolbar */}
              {selectedContacts.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedContacts.size} contact{selectedContacts.size === 1 ? '' : 's'} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkExport}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkEmail}
                        className="flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Email Contacts
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all contacts"
                      />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Name</span>
                        {getSortIcon("name")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("accountId")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Account ID</span>
                        {getSortIcon("accountId")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Type</span>
                        {getSortIcon("type")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Email</span>
                        {getSortIcon("email")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("phone")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Phone</span>
                        {getSortIcon("phone")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("property")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Properties</span>
                        {getSortIcon("property")}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedContacts.map((group: any) => (
                    <TableRow 
                      key={group.id}
                      className={`hover:bg-slate-50 ${selectedContacts.has(group.id) ? 'bg-blue-50' : ''}`}
                    >
                      <TableCell
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleContactSelection(group.id);
                        }}
                      >
                        <Checkbox
                          checked={selectedContacts.has(group.id)}
                          onCheckedChange={() => toggleContactSelection(group.id)}
                        />
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setLocation(`/person-profile/${group.id}`)}
                      >
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="font-medium text-slate-900">
                              {group.firstName} {group.lastName}
                            </div>
                            {!group.isActive && (
                              <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200 text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setLocation(`/person-profile/${group.id}`)}
                      >
                        <div className="text-sm text-slate-600">
                          {group.accountId || <span className="text-slate-400 italic">No account ID</span>}
                        </div>
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setLocation(`/person-profile/${group.id}`)}
                      >
                        <Badge variant={getTypeColor(group.type)}>
                          {group.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setLocation(`/person-profile/${group.id}`)}
                      >
                        {group.email ? (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{group.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setLocation(`/person-profile/${group.id}`)}
                      >
                        {group.phone ? (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{group.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4 text-slate-400" />
                          <div className="space-y-1">
                            {group.properties.length > 0 ? (
                              group.properties.map((property: any, index: number) => (
                                <div key={property.propertyId} className="flex items-center space-x-1">
                                  <span 
                                    className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLocation(`/property-profile/${property.propertyId}`);
                                    }}
                                  >
                                    {property.propertyName}
                                  </span>
                                  {property.isPrimary && (
                                    <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                      Primary
                                    </Badge>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-slate-400">No properties</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditContact(group);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {searchQuery || typeFilter !== "all" || propertyFilter !== "all" 
                  ? "No contacts found" 
                  : "No contacts yet"}
              </h3>
              <p className="text-slate-600 mb-4">
                {searchQuery || typeFilter !== "all" || propertyFilter !== "all"
                  ? "Try adjusting your search terms or filters"
                  : "Add your first contact to get started"}
              </p>
              {!(searchQuery || typeFilter !== "all" || propertyFilter !== "all") && (
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Contact Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddContact)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={addForm.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account ID</FormLabel>
                    <FormControl>
                      <Input placeholder="External account number (optional)" {...field} />
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
                      <Input {...field} type="email" />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tenant">Tenant</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="emergency_contact">Emergency Contact</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(properties as any[])?.map((property: any) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={addForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createContactMutation.isPending}>
                  {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateContact)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account ID</FormLabel>
                    <FormControl>
                      <Input placeholder="External account number (optional)" {...field} />
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
                      <Input {...field} type="email" />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tenant">Tenant</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="emergency_contact">Emergency Contact</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(properties as any[])?.map((property: any) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateContactMutation.isPending}>
                  {updateContactMutation.isPending ? "Updating..." : "Update Contact"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => {
        setDeleteModalOpen(open);
        if (!open) {
          setContactToDelete(null);
          setDeleteConfirmText("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete <strong>{contactToDelete?.firstName} {contactToDelete?.lastName}</strong>? 
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
                  setContactToDelete(null);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== "DELETE" || deleteContactMutation.isPending}
                onClick={confirmDeleteContact}
              >
                {deleteContactMutation.isPending ? "Deleting..." : "Delete Contact"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
