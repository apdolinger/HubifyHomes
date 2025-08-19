import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useTaskModal } from "@/contexts/TaskModalContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Edit,
  ArrowLeft,
  Plus,
  Calendar,
  FileText,
  Clock,
  CheckSquare,
  Settings,
  UserCheck,
  DollarSign,
  Search,
  RefreshCw,
  Link,
  ChevronLeft,
  ChevronRight,
  Star,
  MoreVertical,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

// Form schema for editing contact
const editContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  type: z.enum(["tenant", "owner", "vendor", "emergency_contact"]),
  propertyId: z.number().optional(),
  notes: z.string().optional(),
});

// Form schema for creating new property
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

type EditContactFormData = z.infer<typeof editContactSchema>;
type PropertyFormData = z.infer<typeof propertySchema>;

export default function PersonProfile() {
  const { isAuthenticated, isLoading } = useAuth();
  const { openTaskModal } = useTaskModal();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const params = useParams();
  
  // Get person ID from URL path params
  const personId = params.id;
  
  // Link property modal state
  const [isLinkPropertyModalOpen, setIsLinkPropertyModalOpen] = useState(false);
  const [propertySearchTerm, setPropertySearchTerm] = useState("");
  
  // New property modal state
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<any[]>([]);
  
  // Multiple properties navigation state
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit form
  const editForm = useForm<EditContactFormData>({
    resolver: zodResolver(editContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      type: "tenant",
      propertyId: undefined,
      notes: "",
    },
  });

  // New property form
  const newPropertyForm = useForm<PropertyFormData>({
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

  const { data: person, isLoading: personLoading } = useQuery({
    queryKey: [`/api/contacts/${personId}`],
    enabled: isAuthenticated && !!personId,
  });

  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  // Get contact properties using the new endpoint
  const { data: contactProperties } = useQuery({
    queryKey: [`/api/contacts/${personId}/properties`],
    enabled: isAuthenticated && !!personId,
  });

  const linkedProperties = (contactProperties as any[]) || [];



  const relatedTasks = (tasks as any[] || []).filter((task: any) => 
    task.propertyId === (person as any)?.propertyId
  );

  // Link multiple properties mutation
  const linkPropertyMutation = useMutation({
    mutationFn: async (properties: { propertyId: number; isPrimary?: boolean }[]) => {
      // Link each property sequentially
      for (const property of properties) {
        await apiRequest("POST", `/api/contacts/${personId}/properties`, property);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${personId}/properties`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setIsLinkPropertyModalOpen(false);
      setSelectedProperties([]);
      setPropertySearchTerm("");
      toast({
        title: "Properties linked",
        description: "Contact has been successfully linked to the selected properties.",
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
        title: "Failed to link property",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlink property mutation
  const unlinkPropertyMutation = useMutation({
    mutationFn: async (contactPropertyId: number) => {
      await apiRequest("DELETE", `/api/contacts/${personId}/properties/${contactPropertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${personId}/properties`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      // Adjust current property index if needed
      if (currentPropertyIndex >= linkedProperties.length - 1) {
        setCurrentPropertyIndex(Math.max(0, linkedProperties.length - 2));
      }
      toast({
        title: "Property unlinked",
        description: "Contact has been successfully unlinked from the property.",
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
        description: "Failed to unlink property. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Set primary property mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("PATCH", `/api/contacts/${personId}/properties/${propertyId}/primary`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${personId}/properties`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Primary property updated",
        description: "The selected property is now set as primary.",
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
        description: "Failed to set primary property. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/contacts/${personId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact Deleted",
        description: "Contact has been deleted successfully.",
      });
      setLocation("/people");
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

  // Create property mutation
  const createPropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const response = await apiRequest("POST", "/api/properties", data);
      return response.json();
    },
    onSuccess: (newProperty) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property Created",
        description: `Property "${newProperty.name}" has been created successfully.`,
      });
      setIsNewPropertyModalOpen(false);
      newPropertyForm.reset();
      // Refresh the property queries to include the new property
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${personId}/properties`] });
    },
    onError: async (error) => {
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
      
      // Try to get more detailed error information
      let errorMessage = "Failed to create property. Please try again.";
      try {
        if (error instanceof Response) {
          const errorData = await error.json();
          if (errorData.errors && errorData.errors.length > 0) {
            errorMessage = errorData.errors.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        }
      } catch {
        // Use default error message
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleDeleteContact = () => {
    if (deleteConfirmText === "DELETE") {
      deleteContactMutation.mutate();
      setDeleteModalOpen(false);
      setDeleteConfirmText("");
    }
  };

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: EditContactFormData) => {
      await apiRequest("PATCH", `/api/contacts/${personId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${personId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setIsEditModalOpen(false);
      editForm.reset();
      toast({
        title: "Contact Updated",
        description: "Contact has been updated successfully.",
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
        description: "Failed to update contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditContact = () => {
    if (person) {
      editForm.reset({
        firstName: (person as any).firstName || "",
        lastName: (person as any).lastName || "",
        email: (person as any).email || "",
        phone: (person as any).phone || "",
        type: (person as any).type || "tenant",
        propertyId: (person as any).propertyId || undefined,
        notes: (person as any).notes || "",
      });
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateContact = (data: EditContactFormData) => {
    updateContactMutation.mutate(data);
  };

  // Filter properties for search and exclude already linked properties
  const alreadyLinkedPropertyIds = linkedProperties.map((lp: any) => lp.property?.id);
  const filteredProperties = (properties as any[] || []).filter((property: any) => {
    // Exclude already linked properties
    if (alreadyLinkedPropertyIds.includes(property.id)) return false;
    
    if (!propertySearchTerm) return true;
    const searchLower = propertySearchTerm.toLowerCase();
    return (
      property.name?.toLowerCase().includes(searchLower) ||
      property.address1?.toLowerCase().includes(searchLower) ||
      property.city?.toLowerCase().includes(searchLower) ||
      property.state?.toLowerCase().includes(searchLower)
    );
  });

  // Handle property selection/deselection
  const togglePropertySelection = (property: any) => {
    setSelectedProperties(prev => {
      const isSelected = prev.some(p => p.id === property.id);
      if (isSelected) {
        return prev.filter(p => p.id !== property.id);
      } else {
        return [...prev, property];
      }
    });
  };

  const getContactTypeDisplay = (type: string) => {
    switch (type) {
      case "tenant":
        return "Tenant";
      case "owner":
        return "Owner";
      case "vendor":
        return "Vendor";
      case "emergency_contact":
        return "Emergency Contact";
      default:
        return type;
    }
  };

  const getContactTypeColor = (type: string) => {
    switch (type) {
      case "owner":
        return "default";
      case "tenant":
        return "secondary";
      case "vendor":
        return "outline";
      case "emergency_contact":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
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

  if (!personId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Person Not Found</h2>
          <p className="text-slate-600 mb-4">The person you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/people")}>
            Back to People
          </Button>
        </div>
      </div>
    );
  }

  if (personLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/people")}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to People
          </Button>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-6">
            {/* Photo Section */}
            <div className="flex-shrink-0">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={(person as any)?.profileImageUrl} alt={`${(person as any)?.firstName} ${(person as any)?.lastName}`} />
                  <AvatarFallback className="text-xl font-semibold">
                    {getInitials((person as any)?.firstName, (person as any)?.lastName)}
                  </AvatarFallback>
                </Avatar>
                {/* Edit photo button overlay */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white border shadow-sm hover:bg-gray-50"
                >
                  <Edit className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {/* Name and Basic Info Section */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">
                  {(person as any)?.firstName} {(person as any)?.lastName}
                </h1>
                <Button size="sm" variant="ghost" className="text-slate-500 hover:text-slate-700" onClick={handleEditContact}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-4 flex-wrap">
                <Badge variant={getContactTypeColor((person as any)?.type)}>
                  {getContactTypeDisplay((person as any)?.type)}
                </Badge>
                {(person as any)?.email && (
                  <div className="flex items-center text-slate-600">
                    <Mail className="w-4 h-4 mr-1" />
                    {(person as any)?.email}
                  </div>
                )}
                {(person as any)?.phone && (
                  <div className="flex items-center text-slate-600">
                    <Phone className="w-4 h-4 mr-1" />
                    {(person as any)?.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 lg:mt-0 flex space-x-2">
            <Button variant="outline" onClick={handleEditContact}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Person
            </Button>
            <Button onClick={openTaskModal} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
            <Button 
              variant="outline" 
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Person
            </Button>
          </div>
        </div>
      </div>

      {/* Person Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="w-5 h-5 mr-2" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Type:</span>
              <Badge variant={getContactTypeColor((person as any)?.type)}>
                {getContactTypeDisplay((person as any)?.type)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email:</span>
              <span className="font-medium">{(person as any)?.email || 'Not provided'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone:</span>
              <span className="font-medium">{(person as any)?.phone || 'Not provided'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Added:</span>
              <span className="font-medium">{formatDate((person as any)?.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Interaction:</span>
              <span className="font-medium">2 days ago</span>
            </div>
          </CardContent>
        </Card>

        {/* Linked Properties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Linked Properties
                {linkedProperties?.length > 0 && (
                  <span className="ml-2 text-sm text-slate-500">({linkedProperties.length})</span>
                )}
              </CardTitle>
              {linkedProperties?.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsLinkPropertyModalOpen(true)}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Manage Properties
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {linkedProperties?.length > 0 ? (
              <div className="space-y-3">
                {/* Current Property Display */}
                {linkedProperties[currentPropertyIndex] && (
                  <div className="relative">
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Building className="w-5 h-5 text-slate-400" />
                        <button
                          onClick={() => setPrimaryMutation.mutate(linkedProperties[currentPropertyIndex].property?.id)}
                          disabled={setPrimaryMutation.isPending}
                          className={`transition-colors ${
                            linkedProperties[currentPropertyIndex].isPrimary
                              ? "text-yellow-500"
                              : "text-slate-300 hover:text-yellow-400"
                          }`}
                          title={linkedProperties[currentPropertyIndex].isPrimary ? "Primary property" : "Set as primary"}
                        >
                          <Star className={`w-4 h-4 ${linkedProperties[currentPropertyIndex].isPrimary ? "fill-current" : ""}`} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{linkedProperties[currentPropertyIndex].property?.name}</p>
                          {linkedProperties[currentPropertyIndex].isPrimary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        <p 
                          className="text-sm text-slate-500 flex items-center hover:text-primary cursor-pointer transition-colors"
                          onClick={() => setLocation(`/property-profile/${linkedProperties[currentPropertyIndex].property?.id}`)}
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          {[
                            linkedProperties[currentPropertyIndex].property?.address1,
                            linkedProperties[currentPropertyIndex].property?.address2,
                            linkedProperties[currentPropertyIndex].property?.city,
                            linkedProperties[currentPropertyIndex].property?.state,
                            linkedProperties[currentPropertyIndex].property?.zip
                          ].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/property-profile/${linkedProperties[currentPropertyIndex].property?.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>

                    {/* Navigation Controls for Multiple Properties */}
                    {linkedProperties.length > 1 && (
                      <div className="flex items-center justify-between mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCurrentPropertyIndex(currentPropertyIndex === 0 ? linkedProperties.length - 1 : currentPropertyIndex - 1)}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {linkedProperties.map((_: any, index: number) => (
                            <button
                              key={index}
                              onClick={() => setCurrentPropertyIndex(index)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === currentPropertyIndex 
                                  ? 'bg-blue-500' 
                                  : 'bg-slate-300 hover:bg-slate-400'
                              }`}
                            />
                          ))}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCurrentPropertyIndex(currentPropertyIndex === linkedProperties.length - 1 ? 0 : currentPropertyIndex + 1)}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500">
                <Building className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">No linked properties</p>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setIsLinkPropertyModalOpen(true)}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Manage Properties
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Properties:</span>
              <span className="font-medium">{linkedProperties?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Related Tasks:</span>
              <span className="font-medium">{relatedTasks?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Preferred Vendor:</span>
              <span className="font-medium">{(person as any)?.type === 'vendor' ? 'Yes' : 'No'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="billing">Billing Info</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckSquare className="w-5 h-5 mr-2" />
                Related Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatedTasks?.length > 0 ? (
                <div className="space-y-4">
                  {relatedTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500' : 
                          task.status === 'in_progress' ? 'bg-yellow-500' : 'bg-slate-400'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-slate-500">{task.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-600">
                            {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline">{task.priority}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CheckSquare className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium mb-2">No Related Tasks</h3>
                  <p className="mb-4">No tasks are currently assigned to this person's properties.</p>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Payment Method</p>
                    <p className="text-sm text-slate-500">Credit Card ending in 4242</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Update
                  </Button>
                </div>
                
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Billing Address</p>
                    <p className="text-sm text-slate-500">Same as property address</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </div>
                
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Monthly Charges</p>
                    <p className="text-sm text-slate-500">$125.00/month</p>
                  </div>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Notes & Custom Fields
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    General Notes
                  </label>
                  <Textarea
                    placeholder="Add any notes about this person..."
                    rows={4}
                    className="resize-none"
                    defaultValue={(person as any)?.notes || ""}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Preferred Communication Method
                  </label>
                  <select className="w-full p-2 border border-slate-300 rounded-md">
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="text">Text</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    placeholder="Emergency contact information"
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
                
                <Button className="bg-primary hover:bg-primary/90">
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Property inspection completed</p>
                    <p className="text-xs text-slate-500">2 days ago</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Payment received</p>
                    <p className="text-xs text-slate-500">1 week ago</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Contact information updated</p>
                    <p className="text-xs text-slate-500">2 weeks ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Link Property Modal */}
      <Dialog open={isLinkPropertyModalOpen} onOpenChange={setIsLinkPropertyModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage Properties for {(person as any)?.firstName} {(person as any)?.lastName}</DialogTitle>
            <DialogDescription>
              Add or remove property associations for this contact.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 overflow-y-auto max-h-[60vh]">
            {/* Current Linked Properties Section */}
            {linkedProperties?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Linked Properties ({linkedProperties.length})</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                  {linkedProperties.map((linkedProperty: any) => (
                    <div key={linkedProperty.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4 text-slate-400" />
                          <button
                            onClick={() => setPrimaryMutation.mutate(linkedProperty.property?.id)}
                            disabled={setPrimaryMutation.isPending}
                            className={`transition-colors ${
                              linkedProperty.isPrimary
                                ? "text-yellow-500"
                                : "text-slate-300 hover:text-yellow-400"
                            }`}
                            title={linkedProperty.isPrimary ? "Primary property" : "Set as primary"}
                          >
                            <Star className={`w-4 h-4 ${linkedProperty.isPrimary ? "fill-current" : ""}`} />
                          </button>
                        </div>
                        <div>
                          <p className="font-medium">{linkedProperty.property?.name}</p>
                          <p className="text-sm text-slate-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {[
                              linkedProperty.property?.address1,
                              linkedProperty.property?.address2,
                              linkedProperty.property?.city,
                              linkedProperty.property?.state,
                              linkedProperty.property?.zip
                            ].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {linkedProperty.isPrimary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => unlinkPropertyMutation.mutate(linkedProperty.id)}
                          disabled={unlinkPropertyMutation.isPending}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Properties Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Add New Properties</h3>
              </div>
              <div>
                <Label htmlFor="property-search">Search Available Properties</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="property-search"
                    value={propertySearchTerm}
                    onChange={(e) => setPropertySearchTerm(e.target.value)}
                    placeholder="Search by property name, address, city..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
              {filteredProperties.filter((property: any) => 
                !linkedProperties.some((linked: any) => linked.property?.id === property.id)
              ).length > 0 ? (
                filteredProperties.filter((property: any) => 
                  !linkedProperties.some((linked: any) => linked.property?.id === property.id)
                ).map((property: any) => {
                  const isSelected = selectedProperties.some(p => p.id === property.id);
                  return (
                    <div
                      key={property.id}
                      onClick={() => togglePropertySelection(property)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{property.name}</p>
                          <p className="text-sm text-slate-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {[
                              property.address1,
                              property.address2,
                              property.city,
                              property.state,
                              property.zip
                            ].filter(Boolean).join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {property.type?.replace('_', ' ') || 'Property'}
                          </Badge>
                          {isSelected && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <CheckSquare className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Building className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p>
                    {filteredProperties.length === 0 
                      ? "No properties found" 
                      : "All matching properties are already linked"
                    }
                  </p>
                  {propertySearchTerm && filteredProperties.length === 0 && (
                    <div className="mt-4">
                      <p className="text-sm mb-3">Try adjusting your search terms or create a new property</p>
                      <Button
                        onClick={() => {
                          setIsNewPropertyModalOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Property
                      </Button>
                    </div>
                  )}
                  {!propertySearchTerm && filteredProperties.length === 0 && (
                    <div className="mt-4">
                      <Button
                        onClick={() => {
                          setIsNewPropertyModalOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Property
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedProperties.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Selected Properties ({selectedProperties.length}):
                </p>
                <div className="space-y-1 mt-2">
                  {selectedProperties.map((property: any) => (
                    <div key={property.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700">{property.name}</p>
                        <p className="text-xs text-blue-600 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {[
                            property.address1,
                            property.address2,
                            property.city,
                            property.state,
                            property.zip
                          ].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePropertySelection(property);
                        }}
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsLinkPropertyModalOpen(false);
              setSelectedProperties([]);
              setPropertySearchTerm("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedProperties.length > 0) {
                  const propertiesToLink = selectedProperties.map((property, index) => ({
                    propertyId: property.id,
                    isPrimary: linkedProperties.length === 0 && index === 0 // Make first property primary if no existing properties
                  }));
                  linkPropertyMutation.mutate(propertiesToLink);
                }
              }}
              disabled={selectedProperties.length === 0 || linkPropertyMutation.isPending}
            >
              {linkPropertyMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Properties ({selectedProperties.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete {(person as any)?.firstName} {(person as any)?.lastName} and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-confirm">
              Type <strong>DELETE</strong> to confirm:
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContact}
              disabled={deleteConfirmText !== "DELETE" || deleteContactMutation.isPending}
            >
              {deleteContactMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Contact
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Property Modal */}
      <Dialog open={isNewPropertyModalOpen} onOpenChange={setIsNewPropertyModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Property</DialogTitle>
            <DialogDescription>
              Add a new property to your portfolio. It will be automatically linked to this person.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newPropertyForm}>
            <form onSubmit={newPropertyForm.handleSubmit((data) => createPropertyMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={newPropertyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Sunset Villa" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newPropertyForm.control}
                  name="address1"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main Street" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newPropertyForm.control}
                  name="address2"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apt 4B" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newPropertyForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Miami" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newPropertyForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="FL" maxLength={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newPropertyForm.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="33101" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newPropertyForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single-family">Single Family</SelectItem>
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
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNewPropertyModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPropertyMutation.isPending}>
                  {createPropertyMutation.isPending ? "Creating..." : "Create Property"}
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
    </main>
  );
}