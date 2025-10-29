import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building, 
  MapPin, 
  Users, 
  Square, 
  DollarSign, 
  Phone, 
  Mail, 
  Edit,
  History,
  Eye,
  Lightbulb,
  Filter,
  Plus,
  Calendar,
  FileText,
  Home,
  ArrowLeft,
  CheckSquare,
  Upload,
  Image as ImageIcon,
  X,
  RefreshCw,
  Archive,
  Trash2,
  MoreVertical,
  User,
  Package,
  Monitor,
  Smartphone,
  Router,
  Thermometer,
  Camera,
  Speaker,
  Car,
  Settings,
  Navigation,
  Key,
  Lock,
  ExternalLink,
  Wrench
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Info, XCircle } from "lucide-react";
import { PropertyReportsModal } from "@/components/PropertyReportsModal";
import { format, parseISO, differenceInDays, isValid } from "date-fns";

// Safe date parsing helper
function safeParseDateString(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // If it's already a Date object, validate it
  if (dateValue instanceof Date) {
    return isValid(dateValue) ? dateValue : null;
  }
  
  // If it's a string, try to parse it and validate
  if (typeof dateValue === 'string') {
    try {
      const parsed = parseISO(dateValue);
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  
  return null;
}

// Cascaded Client Alerts Display Component
function CascadedClientAlertsDisplay({ propertyId }: { propertyId: string }) {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: [`/api/alerts/cascaded/property/${propertyId}`],
    enabled: !!propertyId,
  });

  const severityConfig = {
    info: {
      icon: Info,
      className: "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
      iconClassName: "text-blue-500",
    },
    warning: {
      icon: AlertTriangle,
      className: "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100",
      iconClassName: "text-yellow-500",
    },
    error: {
      icon: AlertCircle,
      className: "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
      iconClassName: "text-orange-500",
    },
    critical: {
      icon: XCircle,
      className: "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
      iconClassName: "text-red-500",
    },
  };

  if (isLoading || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6" data-testid="cascaded-alerts-container">
      {alerts.map((alert: any) => {
        const config = severityConfig[alert.severity as keyof typeof severityConfig];
        const Icon = config.icon;

        return (
          <Alert key={alert.id} className={config.className} data-testid={`cascaded-alert-${alert.id}`}>
            <Icon className={`h-4 w-4 ${config.iconClassName}`} />
            <div className="flex items-start justify-between w-full">
              <div className="flex-1">
                <AlertTitle className="capitalize" data-testid={`cascaded-alert-title-${alert.id}`}>
                  {alert.severity} - Client Alert
                </AlertTitle>
                <AlertDescription data-testid={`cascaded-alert-message-${alert.id}`}>
                  {alert.message}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}

export default function PropertyProfile() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { openTaskModal } = useTaskModal();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [propertyImage, setPropertyImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [propertyImageFile, setPropertyImageFile] = useState<File | null>(null);
  const [propertyImageUrl, setPropertyImageUrl] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const [isNavigationModalOpen, setIsNavigationModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    type: "",
    status: "",
    squareFootage: "",
    bedrooms: "",
    bathrooms: "",
    billingRate: "",
    description: "",
    communityId: "",
    customFieldValues: {} as Record<string, any>
  });
  const [communitySearch, setCommunitySearch] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({
    name: "",
    type: "bedroom",
    description: ""
  });
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomSupplyForm, setRoomSupplyForm] = useState({
    name: "",
    type: "",
    brand: "",
    model: "",
    quantity: 1,
    unit: "",
    location: "",
    purchaseUrl: "",
    lastChanged: "",
    nextReplacement: "",
    notes: ""
  });
  const [roomNoteForm, setRoomNoteForm] = useState({
    title: "",
    content: "",
    category: "general",
    isImportant: false
  });
  const [roomDeviceForm, setRoomDeviceForm] = useState({
    name: "",
    type: "thermostat",
    brand: "",
    model: "",
    serialNumber: "",
    macAddress: "",
    ipAddress: "",
    link: "",
    locationInRoom: "",
    installDate: "",
    lastServiced: "",
    requiresServicing: false,
    serviceInterval: "",
    serviceIntervalUnit: "months",
    nextServiceDue: "",
    notes: "",
    hasWarranty: false,
    warrantyStartDate: "",
    warrantyEndDate: ""
  });
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isDeviceDetailsModalOpen, setIsDeviceDetailsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [isSurfaceModalOpen, setIsSurfaceModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [isFixtureModalOpen, setIsFixtureModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<any>(null);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [vehicleForm, setVehicleForm] = useState({
    make: "",
    model: "",
    year: "",
    vin: "",
    licensePlate: "",
    color: "",
    type: "car",
    description: ""
  });
  const [editVehicleForm, setEditVehicleForm] = useState({
    make: "",
    model: "",
    year: "",
    vin: "",
    licensePlate: "",
    color: "",
    type: "car",
    odometer: "",
    registrationDate: "",
    registrationDueDate: "",
    details: ""
  });
  const [roomSurfaceForm, setRoomSurfaceForm] = useState({
    flooringType: "",
    flooringNotes: "",
    paintColor: "",
    paintCode: "",
    paintBrand: "",
    wallTreatment: "",
    wallTreatmentNotes: "",
    ceilingType: "",
    ceilingHeight: "",
    ceilingNotes: ""
  });
  const [surfaceLinkForm, setSurfaceLinkForm] = useState({
    name: "",
    url: "",
    surfaceCategory: "flooring",
    notes: ""
  });
  const [roomFixtureForm, setRoomFixtureForm] = useState({
    windowCount: 0,
    windowType: "",
    windowTreatments: "",
    doorCount: 0,
    doorTypes: "",
    lockTypes: "",
    lightingType: "",
    lightingNotes: "",
    hasDimmer: false,
    hvacVents: 0,
    hvacFilterSize: "",
    hvacNotes: "",
    plumbingAccess: "",
    plumbingNotes: "",
    electricalOutlets: 0,
    electricalNotes: ""
  });
  const [roomPhotoForm, setRoomPhotoForm] = useState({
    description: "",
    category: "general"
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  // Contact state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    type: "tenant",
    notes: ""
  });
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [isChangePrimaryModalOpen, setIsChangePrimaryModalOpen] = useState(false);
  const [isMoveContactsModalOpen, setIsMoveContactsModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [moveToPropertyId, setMoveToPropertyId] = useState<number | null>(null);
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
  const [isChangeCommunityDialogOpen, setIsChangeCommunityDialogOpen] = useState(false);
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  
  // Community edit dialogs state
  const [isEditOverviewDialogOpen, setIsEditOverviewDialogOpen] = useState(false);
  const [isEditRulesDialogOpen, setIsEditRulesDialogOpen] = useState(false);
  const [isEditScheduleDialogOpen, setIsEditScheduleDialogOpen] = useState(false);
  
  // Access items state
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [editingAccessItem, setEditingAccessItem] = useState<any>(null);
  const [accessItemForm, setAccessItemForm] = useState({
    category: "wifi",
    description: "",
    value: "",
    notes: ""
  });
  
  // Vehicle photos state
  const [isVehiclePhotoModalOpen, setIsVehiclePhotoModalOpen] = useState(false);
  const [vehiclePhotoForm, setVehiclePhotoForm] = useState({
    description: "",
    category: "general"
  });
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string>("");
  
  // Vehicle maintenance state
  const [isVehicleMaintenanceModalOpen, setIsVehicleMaintenanceModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<any>(null);
  const [vehicleMaintenanceForm, setVehicleMaintenanceForm] = useState({
    type: "oil_change",
    description: "",
    serviceDate: "",
    nextDueDate: "",
    cost: "",
    mileage: "",
    vendor: "",
    notes: ""
  });
  
  // Get property ID from URL path parameters
  const params = useParams();
  const propertyId = params.id;
  
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

  // Fetch property data
  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: [`/api/properties/${propertyId}`],
    enabled: isAuthenticated && !!propertyId,
  });

  // Fetch custom fields for properties
  const { data: customFields = [] } = useQuery<any[]>({
    queryKey: ["/api/custom-fields", "property"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/custom-fields?entityType=property");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
  });

  // Fetch organization supply settings
  const { data: supplySettings } = useQuery({
    queryKey: [`/api/organizations/${(user as any)?.orgId}/supply-settings`],
    enabled: isAuthenticated && !!(user as any)?.orgId,
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  // Get property rooms
  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: [`/api/properties/${propertyId}/rooms`],
    enabled: isAuthenticated && !!propertyId,
  });

  // Get room supplies
  const { data: supplies = [], isLoading: suppliesLoading, refetch: refetchSupplies } = useQuery({
    queryKey: [`/api/rooms/${selectedRoom?.id}/supplies`],
    enabled: isAuthenticated && !!selectedRoom?.id,
  });

  // Get room notes
  const { data: notes = [], isLoading: notesLoading, refetch: refetchNotes } = useQuery({
    queryKey: [`/api/room-notes`, selectedRoom?.id],
    enabled: isAuthenticated && !!selectedRoom?.id,
  });

  // Get room devices
  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: [`/api/rooms/${selectedRoom?.id}/devices`],
    enabled: isAuthenticated && !!selectedRoom?.id,
  });

  // Get room surface links
  const { data: surfaceLinks = [], isLoading: surfaceLinksLoading, refetch: refetchSurfaceLinks } = useQuery({
    queryKey: [`/api/rooms/${selectedRoom?.id}/surface-links`],
    enabled: isAuthenticated && !!selectedRoom?.id,
  });

  // Get property vehicles
  const { data: vehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery({
    queryKey: [`/api/properties/${propertyId}/vehicles`],
    enabled: isAuthenticated && !!propertyId,
  });

  // Get vehicle photos
  const { data: vehiclePhotos = [], isLoading: vehiclePhotosLoading, refetch: refetchVehiclePhotos } = useQuery({
    queryKey: [`/api/vehicles`, selectedVehicle?.id, "photos"],
    enabled: isAuthenticated && !!selectedVehicle?.id,
  });

  // Get vehicle maintenance records
  const { data: vehicleMaintenance = [], isLoading: vehicleMaintenanceLoading, refetch: refetchVehicleMaintenance } = useQuery({
    queryKey: [`/api/vehicles/${selectedVehicle?.id}/maintenance`],
    enabled: isAuthenticated && !!selectedVehicle?.id,
  });

  // Get property access items
  const { data: accessItems = [], isLoading: accessItemsLoading, refetch: refetchAccessItems } = useQuery({
    queryKey: [`/api/properties/${propertyId}/access`],
    enabled: isAuthenticated && !!propertyId,
  });

  // Get property contacts
  const { data: propertyContacts = [], isLoading: contactsLoading, refetch: refetchContacts } = useQuery({
    queryKey: [`/api/properties/${propertyId}/contacts`],
    enabled: isAuthenticated && !!propertyId,
  });

  // Get communities
  const { data: communities = [] } = useQuery({
    queryKey: ["/api/communities"],
    enabled: isAuthenticated,
  });

  // Get all properties for move to property modal
  const { data: allProperties = [] } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
  });

  // Populate editForm when property data is available and modal opens
  useEffect(() => {
    if (property && isEditModalOpen) {
      setEditForm({
        name: (property as any).name || "",
        address1: (property as any).address1 || "",
        address2: (property as any).address2 || "",
        city: (property as any).city || "",
        state: (property as any).state || "",
        zip: (property as any).zip || "",
        type: (property as any).type || "",
        status: (property as any).status || "",
        squareFootage: (property as any).squareFootage?.toString() || "",
        bedrooms: (property as any).bedrooms?.toString() || "",
        bathrooms: (property as any).bathrooms?.toString() || "",
        billingRate: (property as any).billingRate?.toString() || "",
        description: (property as any).description || "",
        communityId: (property as any).communityId?.toString() || "",
        customFieldValues: (property as any).customFieldValues || {}
      });
      
      if ((property as any).communityId) {
        const community = communities.find((c: any) => c.id === (property as any).communityId);
        if (community) {
          setCommunitySearch(community.name);
          setSelectedCommunity(community);
        }
      }
    }
  }, [property, isEditModalOpen, communities]);

  // Image upload handlers
  const handleImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const file = fileArray[0];
    
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Only JPG, PNG, GIF, and WEBP images are allowed.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Revoke previous blob URL if exists to prevent memory leaks
    if (propertyImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(propertyImageUrl);
    }
    
    setPropertyImageFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPropertyImageUrl(previewUrl);
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleImageDragLeave = () => {
    setIsDragOver(false);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleImageUpload(e.target.files);
      e.target.value = '';
    }
  };

  const removePropertyImage = () => {
    setPropertyImageFile(null);
    setPropertyImageUrl("");
    if (propertyImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(propertyImageUrl);
    }
  };

  // Cleanup image state when modal closes
  useEffect(() => {
    if (!isEditModalOpen) {
      removePropertyImage();
    }
  }, [isEditModalOpen]);

  // Room mutations
  const createRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      return await apiRequest("POST", "/api/rooms", {
        ...roomData,
        propertyId: parseInt(propertyId)
      });
    },
    onSuccess: () => {
      refetchRooms();
      setIsRoomModalOpen(false);
      setRoomForm({ name: "", type: "bedroom", description: "" });
      toast({
        title: "Room added",
        description: "New room has been added to the property.",
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
        title: "Failed to add room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/rooms/${id}`, data);
    },
    onSuccess: () => {
      refetchRooms();
      setIsRoomModalOpen(false);
      setEditingRoom(null);
      setRoomForm({ name: "", type: "bedroom", description: "" });
      toast({
        title: "Room updated",
        description: "Room details have been updated.",
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
        title: "Failed to update room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      return await apiRequest("DELETE", `/api/rooms/${roomId}`);
    },
    onSuccess: () => {
      refetchRooms();
      toast({
        title: "Room deleted",
        description: "Room has been removed from the property.",
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
        title: "Failed to delete room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Vehicle mutations
  const createVehicleMutation = useMutation({
    mutationFn: async (vehicleData: any) => {
      return await apiRequest("POST", "/api/vehicles", {
        ...vehicleData,
        propertyId: parseInt(propertyId),
        year: vehicleData.year ? parseInt(vehicleData.year) : null,
        details: vehicleData.description // Map description to details field
      });
    },
    onSuccess: () => {
      refetchVehicles();
      setIsVehicleModalOpen(false);
      setVehicleForm({
        make: "",
        model: "",
        year: "",
        vin: "",
        licensePlate: "",
        color: "",
        type: "car",
        description: ""
      });
      toast({
        title: "Vehicle added",
        description: "New vehicle has been registered to the property.",
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
        title: "Failed to add vehicle",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Vehicle update mutation
  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, vehicleData }: { id: number; vehicleData: any }) => {
      return await apiRequest("PATCH", `/api/vehicles/${id}`, {
        ...vehicleData,
        year: vehicleData.year ? parseInt(vehicleData.year) : null,
        odometer: vehicleData.odometer ? parseInt(vehicleData.odometer) : null
      });
    },
    onSuccess: async (updatedVehicle) => {
      // Update the selected vehicle with the new data immediately
      if (selectedVehicle && updatedVehicle.id === selectedVehicle.id) {
        setSelectedVehicle(updatedVehicle);
      }
      // Also refetch to keep the list in sync
      await refetchVehicles();
      setIsEditVehicleModalOpen(false);
      setEditVehicleForm({
        make: "",
        model: "",
        year: "",
        vin: "",
        licensePlate: "",
        color: "",
        type: "car",
        odometer: "",
        registrationDate: "",
        registrationDueDate: "",
        details: ""
      });
      toast({
        title: "Vehicle updated",
        description: "Vehicle details have been updated successfully.",
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
        title: "Failed to update vehicle",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Vehicle photo mutations
  const uploadVehiclePhotoMutation = useMutation({
    mutationFn: async ({ file, photoData }: { file: File; photoData: any }) => {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('vehicleId', selectedVehicle?.id?.toString() || '');
      formData.append('category', photoData.category || 'general');
      formData.append('description', photoData.description || '');

      const response = await fetch('/api/vehicle-photos', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload photo' }));
        throw new Error(errorData.message || 'Failed to upload photo');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsVehiclePhotoModalOpen(false);
      setVehiclePhotoFile(null);
      setVehiclePhotoPreview("");
      setVehiclePhotoForm({
        description: "",
        category: "general"
      });
      if (selectedVehicle?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles", selectedVehicle.id, "photos"] });
      }
      toast({
        title: "Photo uploaded",
        description: "Vehicle photo has been uploaded successfully.",
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
        title: "Failed to upload photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVehiclePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      return await apiRequest("DELETE", `/api/vehicle-photos/${photoId}`);
    },
    onSuccess: () => {
      if (selectedVehicle?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles", selectedVehicle.id, "photos"] });
      }
      toast({
        title: "Photo deleted",
        description: "Vehicle photo has been removed successfully.",
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
        title: "Failed to delete photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Vehicle maintenance mutations
  const createVehicleMaintenanceMutation = useMutation({
    mutationFn: async (maintenanceData: any) => {
      return await apiRequest("POST", "/api/vehicle-maintenance", {
        ...maintenanceData,
        vehicleId: selectedVehicle?.id,
        mileage: maintenanceData.mileage ? parseInt(maintenanceData.mileage) : null,
        cost: maintenanceData.cost || null
      });
    },
    onSuccess: () => {
      setIsVehicleMaintenanceModalOpen(false);
      setEditingMaintenance(null);
      setVehicleMaintenanceForm({
        type: "oil_change",
        description: "",
        serviceDate: "",
        nextDueDate: "",
        cost: "",
        mileage: "",
        vendor: "",
        notes: ""
      });
      if (selectedVehicle?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${selectedVehicle.id}/maintenance`] });
      }
      toast({
        title: "Maintenance added",
        description: "Vehicle maintenance record has been added successfully.",
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
        title: "Failed to add maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVehicleMaintenanceMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/vehicle-maintenance/${id}`, {
        ...data,
        mileage: data.mileage ? parseInt(data.mileage) : null,
        cost: data.cost || null
      });
    },
    onSuccess: () => {
      setIsVehicleMaintenanceModalOpen(false);
      setEditingMaintenance(null);
      setVehicleMaintenanceForm({
        type: "oil_change",
        description: "",
        serviceDate: "",
        nextDueDate: "",
        cost: "",
        mileage: "",
        vendor: "",
        notes: ""
      });
      if (selectedVehicle?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${selectedVehicle.id}/maintenance`] });
      }
      toast({
        title: "Maintenance updated",
        description: "Vehicle maintenance record has been updated successfully.",
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
        title: "Failed to update maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVehicleMaintenanceMutation = useMutation({
    mutationFn: async (maintenanceId: number) => {
      return await apiRequest("DELETE", `/api/vehicle-maintenance/${maintenanceId}`);
    },
    onSuccess: () => {
      if (selectedVehicle?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${selectedVehicle.id}/maintenance`] });
      }
      toast({
        title: "Maintenance deleted",
        description: "Vehicle maintenance record has been removed successfully.",
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
        title: "Failed to delete maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Access item mutations
  const createAccessItemMutation = useMutation({
    mutationFn: async (accessData: any) => {
      return await apiRequest("POST", "/api/property-access", {
        ...accessData,
        propertyId: parseInt(propertyId)
      });
    },
    onSuccess: () => {
      refetchAccessItems();
      setIsAccessModalOpen(false);
      setEditingAccessItem(null);
      setAccessItemForm({
        category: "wifi",
        description: "",
        value: "",
        notes: ""
      });
      toast({
        title: "Access item added",
        description: "New access information has been added to the property.",
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
        title: "Failed to add access item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAccessItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest("PATCH", `/api/property-access/${id}`, data);
    },
    onSuccess: () => {
      refetchAccessItems();
      setIsAccessModalOpen(false);
      setEditingAccessItem(null);
      setAccessItemForm({
        category: "wifi",
        description: "",
        value: "",
        notes: ""
      });
      toast({
        title: "Access item updated",
        description: "Access information has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update access item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccessItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/property-access/${id}`, {});
    },
    onSuccess: () => {
      refetchAccessItems();
      toast({
        title: "Access item deleted",
        description: "Access information has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete access item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Contact mutations
  const createContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      return await apiRequest("POST", "/api/contacts", {
        ...contactData,
        propertyId: propertyId
      });
    },
    onSuccess: () => {
      refetchContacts();
      setIsContactModalOpen(false);
      setContactForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        type: "tenant",
        notes: ""
      });
      toast({
        title: "Contact added",
        description: "New contact has been added to the property.",
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
        title: "Failed to add contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setPrimaryContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      return await apiRequest("PATCH", `/api/properties/${propertyId}/contacts/${contactId}/set-primary`, {});
    },
    onSuccess: () => {
      refetchContacts();
      setIsChangePrimaryModalOpen(false);
      toast({
        title: "Primary contact updated",
        description: "The primary contact for this property has been changed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update primary contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkMoveContactsMutation = useMutation({
    mutationFn: async ({ contactIds, newPropertyId }: { contactIds: number[], newPropertyId: number }) => {
      return await apiRequest("POST", "/api/contact-properties/bulk-move", {
        contactIds,
        oldPropertyId: parseInt(propertyId),
        newPropertyId
      });
    },
    onSuccess: () => {
      // Invalidate the cache to force a fresh fetch
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/contacts`] });
      setSelectedContactIds([]);
      setIsMoveContactsModalOpen(false);
      setMoveToPropertyId(null);
      setPropertySearchQuery("");
      toast({
        title: "Contacts moved",
        description: "Selected contacts have been moved to the new property.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to move contacts",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Property update mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async (propertyData: any) => {
      let uploadedImageUrl = propertyData.imageUrl;
      
      // Upload image if file is selected
      if (propertyImageFile) {
        setIsImageUploading(true);
        
        try {
          const formData = new FormData();
          formData.append('files', propertyImageFile);
          formData.append('directory', 'public/property-images');
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Failed to upload image');
          }
          
          const uploadData = await uploadResponse.json();
          if (uploadData.urls && uploadData.urls.length > 0) {
            uploadedImageUrl = uploadData.urls[0];
          }
        } catch (error) {
          setIsImageUploading(false);
          throw new Error('Failed to upload property image. Please try again.');
        }
        
        setIsImageUploading(false);
      }
      
      // Clean up numeric fields: convert empty strings to undefined/null
      const cleanedData = {
        ...propertyData,
        imageUrl: uploadedImageUrl,
        squareFootage: propertyData.squareFootage === "" || propertyData.squareFootage === null ? undefined : Number(propertyData.squareFootage),
        bedrooms: propertyData.bedrooms === "" || propertyData.bedrooms === null ? undefined : Number(propertyData.bedrooms),
        bathrooms: propertyData.bathrooms === "" || propertyData.bathrooms === null ? undefined : Number(propertyData.bathrooms),
        billingRate: propertyData.billingRate === "" || propertyData.billingRate === null ? undefined : Number(propertyData.billingRate),
        units: propertyData.units === "" || propertyData.units === null ? undefined : Number(propertyData.units),
        communityId: propertyData.communityId === "" || propertyData.communityId === null ? undefined : Number(propertyData.communityId)
      };
      
      return await apiRequest("PATCH", `/api/properties/${propertyId}`, cleanedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setIsEditModalOpen(false);
      removePropertyImage();
      toast({
        title: "Property updated",
        description: "Property information has been updated successfully.",
      });
    },
    onError: (error) => {
      setIsImageUploading(false);
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
        title: "Failed to update property",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update property community mutation
  const updatePropertyCommunityMutation = useMutation({
    mutationFn: async (communityId: number | null) => {
      return await apiRequest("PATCH", `/api/properties/${propertyId}/community`, { communityId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setIsChangeCommunityDialogOpen(false);
      setCommunitySearchQuery("");
      toast({
        title: "Community updated",
        description: "Property community has been updated successfully.",
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
        title: "Failed to update community",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update community details mutation
  const updateCommunityMutation = useMutation({
    mutationFn: async ({ communityId, data }: { communityId: number, data: any }) => {
      return await apiRequest("PATCH", `/api/communities/${communityId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      setIsEditOverviewDialogOpen(false);
      setIsEditRulesDialogOpen(false);
      setIsEditScheduleDialogOpen(false);
      toast({
        title: "Community updated",
        description: "Community details have been updated successfully.",
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
        title: "Failed to update community",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Room supply mutations
  const createSupplyMutation = useMutation({
    mutationFn: async (supplyData: any) => {
      // Convert empty date strings to null for database
      const processedData = {
        ...supplyData,
        roomId: selectedRoom?.id,
        lastChanged: supplyData.lastChanged || null,
        nextReplacement: supplyData.nextReplacement || null
      };
      return await apiRequest("POST", "/api/room-supplies", processedData);
    },
    onSuccess: () => {
      refetchSupplies();
      setIsSupplyModalOpen(false);
      setRoomSupplyForm({
        name: "",
        type: "lightbulb",
        brand: "",
        model: "",
        quantity: 1,
        unit: "piece",
        location: "",
        purchaseUrl: "",
        lastChanged: "",
        nextReplacement: "",
        notes: ""
      });
      toast({
        title: "Supply added",
        description: "Room supply has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add supply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSupplyMutation = useMutation({
    mutationFn: async ({ id, ...supplyData }: any) => {
      // Convert empty date strings to null for database
      const processedData = {
        ...supplyData,
        lastChanged: supplyData.lastChanged || null,
        nextReplacement: supplyData.nextReplacement || null
      };
      return await apiRequest("PATCH", `/api/room-supplies/${id}`, processedData);
    },
    onSuccess: () => {
      refetchSupplies();
      setIsSupplyModalOpen(false);
      setEditingSupply(null);
      toast({
        title: "Supply updated",
        description: "Room supply has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update supply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSupplyMutation = useMutation({
    mutationFn: async (supplyId: number) => {
      return await apiRequest("DELETE", `/api/room-supplies/${supplyId}`);
    },
    onSuccess: () => {
      refetchSupplies();
      toast({
        title: "Supply deleted",
        description: "Room supply has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete supply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Room note mutations
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      return await apiRequest("POST", "/api/room-notes", {
        ...noteData,
        roomId: selectedRoom?.id,
        createdById: "current-user"
      });
    },
    onSuccess: () => {
      refetchNotes();
      setIsNoteModalOpen(false);
      setRoomNoteForm({
        title: "",
        content: "",
        category: "general",
        isImportant: false
      });
      toast({
        title: "Note added",
        description: "Room note has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/room-notes/${id}`, data);
    },
    onSuccess: () => {
      refetchNotes();
      setIsNoteModalOpen(false);
      setEditingNote(null);
      toast({
        title: "Note updated",
        description: "Room note has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return await apiRequest("DELETE", `/api/room-notes/${noteId}`);
    },
    onSuccess: () => {
      refetchNotes();
      toast({
        title: "Note deleted",
        description: "Room note has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Room device mutations
  const createDeviceMutation = useMutation({
    mutationFn: async (deviceData: any) => {
      // Transform data types for backend validation
      const payload = {
        ...deviceData,
        roomId: selectedRoom?.id,
        createdById: "current-user",
        // Convert serviceInterval from string to number if present
        serviceInterval: deviceData.serviceInterval ? parseInt(deviceData.serviceInterval) : null,
      };
      return await apiRequest("POST", "/api/room-devices", payload);
    },
    onSuccess: () => {
      refetchDevices();
      setIsDeviceModalOpen(false);
      setRoomDeviceForm({
        name: "",
        type: "thermostat",
        brand: "",
        model: "",
        serialNumber: "",
        macAddress: "",
        ipAddress: "",
        link: "",
        locationInRoom: "",
        installDate: "",
        lastServiced: "",
        requiresServicing: false,
        serviceInterval: "",
        serviceIntervalUnit: "months",
        nextServiceDue: "",
        notes: "",
        hasWarranty: false,
        warrantyStartDate: "",
        warrantyEndDate: ""
      });
      toast({
        title: "Device added",
        description: "Room device has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDeviceMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      // Transform data types for backend validation
      const payload = {
        ...data,
        // Convert serviceInterval from string to number if present
        serviceInterval: data.serviceInterval ? parseInt(data.serviceInterval) : null,
      };
      return await apiRequest("PATCH", `/api/room-devices/${id}`, payload);
    },
    onSuccess: () => {
      refetchDevices();
      setIsDeviceModalOpen(false);
      setEditingDevice(null);
      toast({
        title: "Device updated",
        description: "Room device has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      return await apiRequest("DELETE", `/api/room-devices/${deviceId}`);
    },
    onSuccess: () => {
      refetchDevices();
      toast({
        title: "Device deleted",
        description: "Room device has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Room surface link mutations
  const createSurfaceLinkMutation = useMutation({
    mutationFn: async (linkData: any) => {
      return await apiRequest("POST", "/api/room-surface-links", {
        ...linkData,
        roomId: selectedRoom?.id,
      });
    },
    onSuccess: () => {
      refetchSurfaceLinks();
      setIsLinkModalOpen(false);
      setSurfaceLinkForm({
        name: "",
        url: "",
        surfaceCategory: "flooring",
        notes: ""
      });
      toast({
        title: "Surface link added",
        description: "Purchasing link has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add link",
        description: error.message || "An error occurred while adding the link.",
        variant: "destructive",
      });
    },
  });

  const updateSurfaceLinkMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/room-surface-links/${id}`, {
        ...data,
        roomId: selectedRoom?.id,
      });
    },
    onSuccess: () => {
      refetchSurfaceLinks();
      setIsLinkModalOpen(false);
      setSelectedLink(null);
      setSurfaceLinkForm({
        name: "",
        url: "",
        surfaceCategory: "flooring",
        notes: ""
      });
      toast({
        title: "Link updated",
        description: "Surface link has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update link",
        description: error.message || "An error occurred while updating the link.",
        variant: "destructive",
      });
    },
  });

  const deleteSurfaceLinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      return await apiRequest("DELETE", `/api/room-surface-links/${linkId}`);
    },
    onSuccess: () => {
      refetchSurfaceLinks();
      toast({
        title: "Link deleted",
        description: "Surface link has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Room surface mutations
  const saveSurfaceMutation = useMutation({
    mutationFn: async (surfaceData: any) => {
      return await apiRequest("POST", "/api/room-surfaces", {
        ...surfaceData,
        roomId: selectedRoom?.id
      });
    },
    onSuccess: () => {
      setIsSurfaceModalOpen(false);
      toast({
        title: "Surface information saved",
        description: "Room surface details have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save surface information",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Room fixture mutations
  const saveFixtureMutation = useMutation({
    mutationFn: async (fixtureData: any) => {
      return await apiRequest("POST", "/api/room-fixtures", {
        ...fixtureData,
        roomId: selectedRoom?.id
      });
    },
    onSuccess: () => {
      setIsFixtureModalOpen(false);
      toast({
        title: "Fixture information saved",
        description: "Room fixture details have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save fixture information",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Room photo mutations
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ file, photoData }: { file: File; photoData: any }) => {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('roomId', selectedRoom?.id?.toString() || '');
      formData.append('category', photoData.category || 'general');
      formData.append('description', photoData.description || '');

      const response = await fetch('/api/room-photos', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload photo');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsPhotoModalOpen(false);
      setPhotoFile(null);
      setRoomPhotoForm({
        description: "",
        category: "general"
      });
      // Refetch photos
      if (selectedRoom?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/rooms", selectedRoom.id, "photos"] });
      }
      toast({
        title: "Photo uploaded",
        description: "Room photo has been uploaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to upload photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      return await apiRequest("DELETE", `/api/room-photos/${photoId}`);
    },
    onSuccess: () => {
      if (selectedRoom?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/rooms", selectedRoom.id, "photos"] });
      }
      toast({
        title: "Photo deleted",
        description: "Room photo has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize edit form when property data is loaded
  useEffect(() => {
    if (property && isEditModalOpen) {
      setEditForm({
        name: (property as any).name || "",
        address1: (property as any).address1 || "",
        address2: (property as any).address2 || "",
        city: (property as any).city || "",
        state: (property as any).state || "",
        zip: (property as any).zip || "",
        type: (property as any).type || "",
        status: (property as any).status || "",
        squareFootage: (property as any).squareFootage || "",
        bedrooms: (property as any).bedrooms || "",
        bathrooms: (property as any).bathrooms || "",
        billingRate: (property as any).billingRate || "",
        description: (property as any).description || "",
        communityId: (property as any).communityId || ""
      });
      
      // Set community search if property has a community
      if ((property as any).communityId) {
        const community = communities.find((c: any) => c.id === (property as any).communityId);
        if (community) {
          setCommunitySearch(community.name);
          setSelectedCommunity(community);
        }
      } else {
        setCommunitySearch("");
        setSelectedCommunity(null);
      }
    }
  }, [property, communities, isEditModalOpen]);

  // Format full address helper
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

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "secondary";
      case "normal":
        return "outline";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "pending":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
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

  // Loading state
  if (isLoading || propertyLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-600" />
          <p className="text-slate-600">Loading property...</p>
        </div>
      </div>
    );
  }

  // Property not found
  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Property Not Found</h1>
          <p className="text-slate-600 mb-4">The property you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/properties")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  // Use the direct property contacts query instead of filtering global contacts

  const propertyTasks = Array.isArray(tasks) ? tasks?.filter((task: any) => 
    task.propertyId === parseInt(propertyId || "0")
  ) : [];

  // Room action handlers
  const handleAddRoom = () => {
    if (!roomForm.name.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a name for the room.",
        variant: "destructive",
      });
      return;
    }

    createRoomMutation.mutate(roomForm);
  };

  const handleEditRoom = (room: any) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      type: room.type,
      description: room.description || ""
    });
    setIsRoomModalOpen(true);
  };

  const handleUpdateRoom = () => {
    if (!roomForm.name.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a name for the room.",
        variant: "destructive",
      });
      return;
    }

    updateRoomMutation.mutate({
      id: editingRoom.id,
      ...roomForm
    });
  };

  const handleDeleteRoom = (roomId: number) => {
    deleteRoomMutation.mutate(roomId);
  };

  // Supply action handlers
  const handleAddSupply = () => {
    if (!roomSupplyForm.name.trim()) {
      toast({
        title: "Supply name required",
        description: "Please enter a name for the supply.",
        variant: "destructive",
      });
      return;
    }

    createSupplyMutation.mutate(roomSupplyForm);
  };

  const handleEditSupply = (supply: any) => {
    setEditingSupply(supply);
    setRoomSupplyForm({
      name: supply.name || "",
      type: supply.type || "lightbulb",
      brand: supply.brand || "",
      model: supply.model || "",
      quantity: supply.quantity || 1,
      unit: supply.unit || "piece",
      location: supply.location || "",
      purchaseUrl: supply.purchaseUrl || "",
      lastChanged: supply.lastChanged ? supply.lastChanged.split('T')[0] : "",
      nextReplacement: supply.nextReplacement ? supply.nextReplacement.split('T')[0] : "",
      notes: supply.notes || ""
    });
    setIsSupplyModalOpen(true);
  };

  const handleUpdateSupply = () => {
    if (!roomSupplyForm.name.trim()) {
      toast({
        title: "Supply name required",
        description: "Please enter a name for the supply.",
        variant: "destructive",
      });
      return;
    }

    updateSupplyMutation.mutate({
      id: editingSupply.id,
      ...roomSupplyForm
    });
  };

  const handleCancelSupplyEdit = () => {
    setIsSupplyModalOpen(false);
    setEditingSupply(null);
    setRoomSupplyForm({
      name: "",
      type: "lightbulb",
      brand: "",
      model: "",
      quantity: 1,
      unit: "piece",
      location: "",
      purchaseUrl: "",
      lastChanged: "",
      nextReplacement: "",
      notes: ""
    });
  };

  const handleDeleteSupply = (supplyId: number) => {
    deleteSupplyMutation.mutate(supplyId);
  };

  // Note action handlers
  const handleAddNote = () => {
    if (!roomNoteForm.title.trim() || !roomNoteForm.content.trim()) {
      toast({
        title: "Title and content required",
        description: "Please enter both a title and content for the note.",
        variant: "destructive",
      });
      return;
    }

    createNoteMutation.mutate(roomNoteForm);
  };

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    setRoomNoteForm({
      title: note.title || "",
      content: note.content || "",
      category: note.category || "general",
      isImportant: note.isImportant || false
    });
    setIsNoteModalOpen(true);
  };

  const handleUpdateNote = () => {
    if (!roomNoteForm.title.trim() || !roomNoteForm.content.trim()) {
      toast({
        title: "Title and content required",
        description: "Please enter both a title and content for the note.",
        variant: "destructive",
      });
      return;
    }

    updateNoteMutation.mutate({
      id: editingNote.id,
      ...roomNoteForm
    });
  };

  const handleCancelNoteEdit = () => {
    setIsNoteModalOpen(false);
    setEditingNote(null);
    setRoomNoteForm({
      title: "",
      content: "",
      category: "general",
      isImportant: false
    });
  };

  const handleDeleteNote = (noteId: number) => {
    deleteNoteMutation.mutate(noteId);
  };

  // Device action handlers
  const handleAddDevice = () => {
    if (!roomDeviceForm.name.trim()) {
      toast({
        title: "Device name required",
        description: "Please enter a name for the device.",
        variant: "destructive",
      });
      return;
    }

    createDeviceMutation.mutate(roomDeviceForm);
  };

  const handleEditDevice = (device: any) => {
    setEditingDevice(device);
    setRoomDeviceForm({
      name: device.name || "",
      type: device.type || "thermostat",
      brand: device.brand || "",
      model: device.model || "",
      serialNumber: device.serialNumber || "",
      macAddress: device.macAddress || "",
      ipAddress: device.ipAddress || "",
      link: device.link || "",
      locationInRoom: device.locationInRoom || "",
      installDate: device.installDate ? device.installDate.split('T')[0] : "",
      lastServiced: device.lastServiced ? device.lastServiced.split('T')[0] : "",
      requiresServicing: device.requiresServicing || false,
      serviceInterval: device.serviceInterval?.toString() || "",
      serviceIntervalUnit: device.serviceIntervalUnit || "months",
      nextServiceDue: device.nextServiceDue ? device.nextServiceDue.split('T')[0] : "",
      notes: device.notes || "",
      hasWarranty: device.hasWarranty || false,
      warrantyStartDate: device.warrantyStartDate ? device.warrantyStartDate.split('T')[0] : "",
      warrantyEndDate: device.warrantyEndDate ? device.warrantyEndDate.split('T')[0] : ""
    });
    setIsDeviceModalOpen(true);
  };

  const handleUpdateDevice = () => {
    if (!roomDeviceForm.name.trim()) {
      toast({
        title: "Device name required",
        description: "Please enter a name for the device.",
        variant: "destructive",
      });
      return;
    }

    updateDeviceMutation.mutate({
      id: editingDevice.id,
      ...roomDeviceForm
    });
  };

  const handleCancelDeviceEdit = () => {
    setIsDeviceModalOpen(false);
    setEditingDevice(null);
    setRoomDeviceForm({
      name: "",
      type: "thermostat",
      brand: "",
      model: "",
      serialNumber: "",
      macAddress: "",
      ipAddress: "",
      link: "",
      locationInRoom: "",
      installDate: "",
      lastServiced: "",
      requiresServicing: false,
      serviceInterval: "",
      serviceIntervalUnit: "months",
      nextServiceDue: "",
      notes: "",
      hasWarranty: false,
      warrantyStartDate: "",
      warrantyEndDate: ""
    });
  };

  const handleDeleteDevice = (deviceId: number) => {
    deleteDeviceMutation.mutate(deviceId);
  };

  const handleViewDevice = (device: any) => {
    setSelectedDevice(device);
    setIsDeviceDetailsModalOpen(true);
  };

  const handleEditFromDetails = () => {
    if (selectedDevice) {
      setIsDeviceDetailsModalOpen(false);
      handleEditDevice(selectedDevice);
    }
  };

  // Surface link handlers
  const handleAddLink = () => {
    setSelectedLink(null);
    setSurfaceLinkForm({
      name: "",
      url: "",
      surfaceCategory: "flooring",
      notes: ""
    });
    setIsLinkModalOpen(true);
  };

  const handleEditLink = (link: any) => {
    setSelectedLink(link);
    setSurfaceLinkForm({
      name: link.name || "",
      url: link.url || "",
      surfaceCategory: link.surfaceCategory || "flooring",
      notes: link.notes || ""
    });
    setIsLinkModalOpen(true);
  };

  const handleDeleteLink = (linkId: number) => {
    if (confirm("Are you sure you want to delete this link?")) {
      deleteSurfaceLinkMutation.mutate(linkId);
    }
  };

  const handleSubmitLink = () => {
    if (selectedLink) {
      updateSurfaceLinkMutation.mutate({
        id: selectedLink.id,
        ...surfaceLinkForm
      });
    } else {
      createSurfaceLinkMutation.mutate(surfaceLinkForm);
    }
  };

  const handleCreateServiceTask = () => {
    if (!selectedDevice || !property) return;

    // Close the device details modal
    setIsDeviceDetailsModalOpen(false);

    // Open the task modal with the property pre-selected
    openTaskModal({
      propertyId: property.id
    });

    toast({
      title: "Task creator opened",
      description: `Create a service task for ${selectedDevice.name}. The property is pre-selected.${selectedDevice.nextServiceDue ? ` Next service due: ${new Date(selectedDevice.nextServiceDue).toLocaleDateString()}` : ''}`,
    });
  };

  const handleCreateMaintenanceTask = (maintenance: any) => {
    if (!selectedVehicle || !property) return;

    const nextDueDate = safeParseDateString(maintenance.nextDueDate);
    
    // Open the task modal with property pre-selected and pre-filled title/description
    openTaskModal({
      propertyId: property.id,
      title: `${maintenance.type.replace('_', ' ')} - ${selectedVehicle.make} ${selectedVehicle.model}`,
      description: `${maintenance.description}${nextDueDate ? `\nNext due: ${format(nextDueDate, 'MMM d, yyyy')}` : ''}${maintenance.vendor ? `\nVendor: ${maintenance.vendor}` : ''}`,
      dueDate: maintenance.nextDueDate || undefined
    });

    toast({
      title: "Task creator opened",
      description: `Create a task for ${maintenance.type.replace('_', ' ')} on ${selectedVehicle.make} ${selectedVehicle.model}.`,
    });
  };

  // Helper function to get device icon
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "thermostat":
        return Thermometer;
      case "smart_tv":
        return Monitor;
      case "security_camera":
        return Camera;
      case "router":
        return Router;
      case "smart_speaker":
        return Speaker;
      case "smart_phone":
        return Smartphone;
      case "tablet":
        return Monitor;
      default:
        return Monitor;
    }
  };

  const handleCancelRoomEdit = () => {
    setIsRoomModalOpen(false);
    setEditingRoom(null);
    setRoomForm({ name: "", type: "bedroom", description: "" });
  };

  // Surface handlers
  const handleSaveSurface = () => {
    saveSurfaceMutation.mutate(roomSurfaceForm);
  };

  // Fixture handlers  
  const handleSaveFixture = () => {
    saveFixtureMutation.mutate(roomFixtureForm);
  };

  // Photo handlers
  const handleUploadPhoto = () => {
    if (!photoFile) {
      toast({
        title: "Photo required",
        description: "Please select a photo to upload.",
        variant: "destructive",
      });
      return;
    }

    uploadPhotoMutation.mutate({
      file: photoFile,
      photoData: roomPhotoForm
    });
  };

  const handleDeletePhoto = (photoId: number) => {
    deletePhotoMutation.mutate(photoId);
  };

  // Vehicle photo handlers
  const handleVehiclePhotoUpload = () => {
    if (!vehiclePhotoFile) {
      toast({
        title: "No file selected",
        description: "Please select a photo to upload.",
        variant: "destructive",
      });
      return;
    }

    uploadVehiclePhotoMutation.mutate({
      file: vehiclePhotoFile,
      photoData: vehiclePhotoForm
    });
  };

  const handleDeleteVehiclePhoto = (photoId: number) => {
    deleteVehiclePhotoMutation.mutate(photoId);
  };

  const handleVehiclePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Only JPG, PNG, GIF, and WEBP images are allowed.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setVehiclePhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setVehiclePhotoPreview(previewUrl);
    }
  };

  // Vehicle maintenance handlers
  const handleAddMaintenance = () => {
    setEditingMaintenance(null);
    setVehicleMaintenanceForm({
      type: "oil_change",
      description: "",
      serviceDate: "",
      nextDueDate: "",
      cost: "",
      mileage: "",
      vendor: "",
      notes: ""
    });
    setIsVehicleMaintenanceModalOpen(true);
  };

  const handleEditMaintenance = (maintenance: any) => {
    setEditingMaintenance(maintenance);
    setVehicleMaintenanceForm({
      type: maintenance.type || "oil_change",
      description: maintenance.description || "",
      serviceDate: maintenance.serviceDate ? maintenance.serviceDate.split('T')[0] : "",
      nextDueDate: maintenance.nextDueDate ? maintenance.nextDueDate.split('T')[0] : "",
      cost: maintenance.cost || "",
      mileage: maintenance.mileage?.toString() || "",
      vendor: maintenance.vendor || "",
      notes: maintenance.notes || ""
    });
    setIsVehicleMaintenanceModalOpen(true);
  };

  const handleSaveMaintenance = () => {
    if (!vehicleMaintenanceForm.description.trim()) {
      toast({
        title: "Description required",
        description: "Please provide a description for this maintenance record.",
        variant: "destructive",
      });
      return;
    }

    if (!vehicleMaintenanceForm.serviceDate) {
      toast({
        title: "Service date required",
        description: "Please select the date of service.",
        variant: "destructive",
      });
      return;
    }

    if (editingMaintenance) {
      updateVehicleMaintenanceMutation.mutate({
        id: editingMaintenance.id,
        ...vehicleMaintenanceForm
      });
    } else {
      createVehicleMaintenanceMutation.mutate(vehicleMaintenanceForm);
    }
  };

  const handleDeleteMaintenance = (maintenanceId: number) => {
    deleteVehicleMaintenanceMutation.mutate(maintenanceId);
  };

  // Vehicle edit handler
  const handleEditVehicle = () => {
    if (!selectedVehicle) return;
    
    // Convert date fields from timestamps to YYYY-MM-DD format for date inputs
    const formatDate = (dateValue: any): string => {
      if (!dateValue) return "";
      const parsed = safeParseDateString(dateValue);
      if (!parsed) return "";
      return format(parsed, 'yyyy-MM-dd');
    };

    setEditVehicleForm({
      make: selectedVehicle.make || "",
      model: selectedVehicle.model || "",
      year: selectedVehicle.year?.toString() || "",
      color: selectedVehicle.color || "",
      licensePlate: selectedVehicle.licensePlate || "",
      vin: selectedVehicle.vin || "",
      type: selectedVehicle.type || "car",
      odometer: selectedVehicle.odometer?.toString() || "",
      registrationDate: formatDate(selectedVehicle.registrationDate),
      registrationDueDate: formatDate(selectedVehicle.registrationDueDate),
      details: selectedVehicle.details || ""
    });
    
    setIsEditVehicleModalOpen(true);
  };

  // Calculate maintenance alerts for a vehicle
  const getMaintenanceAlerts = (vehicleId: number) => {
    if (!Array.isArray(vehicleMaintenance)) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return vehicleMaintenance.filter((m: any) => {
      if (!m.nextDueDate || m.vehicleId !== vehicleId) return false;
      
      const dueDate = safeParseDateString(m.nextDueDate);
      if (!dueDate) return false;
      
      dueDate.setHours(0, 0, 0, 0);
      const daysDiff = differenceInDays(dueDate, today);
      return daysDiff <= 7; // Show if due within 7 days or overdue
    });
  };

  // Calculate registration alerts for a vehicle
  const getRegistrationAlerts = (vehicleId: number) => {
    if (!Array.isArray(vehicles)) return [];
    
    const vehicle = vehicles.find((v: any) => v.id === vehicleId);
    if (!vehicle || !vehicle.registrationDueDate) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = safeParseDateString(vehicle.registrationDueDate);
    if (!dueDate) return [];
    
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = differenceInDays(dueDate, today);
    
    // Return alert if overdue or due within 7 days
    if (diffDays <= 7) {
      return [{
        vehicleId: vehicle.id,
        dueDate: vehicle.registrationDueDate,
        diffDays,
        isOverdue: diffDays < 0
      }];
    }
    
    return [];
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/properties")}
            className="flex items-center text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </div>
        
        {/* Property Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-start space-x-6 mb-6">
            {/* Property Image Upload Area */}
            <div className="flex-shrink-0">
              <div className="relative">
                {propertyImage || (property as any)?.imageUrl ? (
                  <div className="relative group">
                    <img
                      src={propertyImage || (property as any)?.imageUrl}
                      alt="Property image"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-slate-200"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500 text-center px-2">Upload Property Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Status Controls */}
            <div className="flex-shrink-0 flex flex-col space-y-3">
              {/* Active Status Button - Better styling */}
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant={(property as any)?.isActive ? "default" : "secondary"}
                    size="sm"
                    className={`flex items-center space-x-2 min-w-[100px] justify-center ${
                      (property as any)?.isActive 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      (property as any)?.isActive ? 'bg-green-200' : 'bg-slate-500'
                    }`} />
                    <span>{(property as any)?.isActive ? 'Active' : 'Inactive'}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Property</DialogTitle>
                    <DialogDescription>
                      Update property details, specifications, and status.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Edit Modal Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="edit-name">Property Name</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Enter property name (optional)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="edit-address1">Street Address *</Label>
                      <Input
                        id="edit-address1"
                        value={editForm.address1}
                        onChange={(e) => setEditForm({ ...editForm, address1: e.target.value })}
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="edit-address2">Address Line 2</Label>
                      <Input
                        id="edit-address2"
                        value={editForm.address2}
                        onChange={(e) => setEditForm({ ...editForm, address2: e.target.value })}
                        placeholder="Apt, Suite, Unit, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-city">City *</Label>
                      <Input
                        id="edit-city"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-state">State *</Label>
                      <Input
                        id="edit-state"
                        value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-zip">ZIP Code</Label>
                      <Input
                        id="edit-zip"
                        value={editForm.zip}
                        onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                        placeholder="12345"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-type">Property Type</Label>
                      <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single-family">Single Family Home</SelectItem>
                          <SelectItem value="condo">Condo</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-status">Status</Label>
                      <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="vacant">Vacant</SelectItem>
                          <SelectItem value="under_repair">Under Repair</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-sqft">Square Footage</Label>
                      <Input
                        id="edit-sqft"
                        type="number"
                        value={editForm.squareFootage}
                        onChange={(e) => setEditForm({ ...editForm, squareFootage: e.target.value })}
                        placeholder="1200"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-bedrooms">Bedrooms</Label>
                      <Input
                        id="edit-bedrooms"
                        type="number"
                        min="0"
                        value={editForm.bedrooms}
                        onChange={(e) => setEditForm({ ...editForm, bedrooms: e.target.value })}
                        placeholder="3"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                      <Input
                        id="edit-bathrooms"
                        type="number"
                        min="0"
                        step="0.5"
                        value={editForm.bathrooms}
                        onChange={(e) => setEditForm({ ...editForm, bathrooms: e.target.value })}
                        placeholder="2.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-billing">Billing Rate</Label>
                      <Input
                        id="edit-billing"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.billingRate}
                        onChange={(e) => setEditForm({ ...editForm, billingRate: e.target.value })}
                        placeholder="150.00"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="edit-community">Community / HOA</Label>
                      <div className="relative">
                        <Input
                          id="edit-community"
                          value={communitySearch}
                          onChange={(e) => {
                            setCommunitySearch(e.target.value);
                            // Filter communities based on search
                            const filtered = communities.filter((c: any) => 
                              c.name.toLowerCase().includes(e.target.value.toLowerCase())
                            );
                            // If exact match found, select it
                            const exactMatch = filtered.find((c: any) => 
                              c.name.toLowerCase() === e.target.value.toLowerCase()
                            );
                            if (exactMatch) {
                              setSelectedCommunity(exactMatch);
                              setEditForm({ ...editForm, communityId: exactMatch.id.toString() });
                            } else if (e.target.value === "") {
                              setSelectedCommunity(null);
                              setEditForm({ ...editForm, communityId: "" });
                            }
                          }}
                          placeholder="Type community name or leave blank..."
                        />
                        {communitySearch && communities.filter((c: any) => 
                          c.name.toLowerCase().includes(communitySearch.toLowerCase()) &&
                          c.name.toLowerCase() !== communitySearch.toLowerCase()
                        ).length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {communities
                              .filter((c: any) => 
                                c.name.toLowerCase().includes(communitySearch.toLowerCase()) &&
                                c.name.toLowerCase() !== communitySearch.toLowerCase()
                              )
                              .slice(0, 5)
                              .map((community: any) => (
                                <div
                                  key={community.id}
                                  className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                                  onClick={() => {
                                    setCommunitySearch(community.name);
                                    setSelectedCommunity(community);
                                    setEditForm({ ...editForm, communityId: community.id.toString() });
                                  }}
                                >
                                  <div className="font-medium text-slate-900">{community.name}</div>
                                  {community.city && community.state && (
                                    <div className="text-sm text-slate-600">
                                      {community.city}, {community.state}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                        {communitySearch && !communities.some((c: any) => 
                          c.name.toLowerCase().includes(communitySearch.toLowerCase())
                        ) && communitySearch.length > 2 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
                            <div className="px-4 py-3 text-center">
                              <p className="text-slate-600 mb-2">Community "{communitySearch}" not found</p>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  // Navigate to admin page to create new community
                                  window.open('/admin/data-management?create=community&name=' + encodeURIComponent(communitySearch), '_blank');
                                }}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Community
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      {selectedCommunity && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                          <div className="font-medium text-blue-900">Selected: {selectedCommunity.name}</div>
                          {selectedCommunity.city && selectedCommunity.state && (
                            <div className="text-blue-700">
                              {selectedCommunity.city}, {selectedCommunity.state}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Add property description, special notes, or instructions..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!editForm.address1.trim() || !editForm.city.trim() || !editForm.state.trim()) {
                          toast({
                            title: "Missing required fields",
                            description: "Please fill in address, city, and state.",
                            variant: "destructive",
                          });
                          return;
                        }
                        updatePropertyMutation.mutate(editForm);
                      }}
                      disabled={updatePropertyMutation.isPending}
                    >
                      {updatePropertyMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Property Name and Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2 break-words">
                    {(property as any)?.name || formatFullAddress(property) || 'Property Details'}
                  </h1>
                  {(property as any)?.name && (
                    <button 
                      onClick={() => setIsNavigationModalOpen(true)}
                      className="text-slate-600 flex items-center mb-3 hover:text-blue-600 transition-colors cursor-pointer text-left underline-offset-4 hover:underline"
                    >
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="break-words">{formatFullAddress(property)}</span>
                    </button>
                  )}
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{getTypeDisplay((property as any)?.type)}</Badge>
                    <Badge variant={getStatusColor((property as any)?.status)}>
                      {(property as any)?.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex space-x-2 flex-shrink-0">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setEditForm({
                        name: (property as any)?.name || "",
                        address1: (property as any)?.address1 || "",
                        address2: (property as any)?.address2 || "",
                        city: (property as any)?.city || "",
                        state: (property as any)?.state || "",
                        zip: (property as any)?.zip || "",
                        type: (property as any)?.type || "",
                        status: (property as any)?.status || "",
                        squareFootage: (property as any)?.squareFootage?.toString() || "",
                        bedrooms: (property as any)?.bedrooms?.toString() || "",
                        bathrooms: (property as any)?.bathrooms?.toString() || "",
                        billingRate: (property as any)?.billingRate?.toString() || "",
                        description: (property as any)?.description || "",
                        communityId: (property as any)?.communityId?.toString() || ""
                      });
                      
                      // Set the community search field and selected community
                      const currentCommunity = communities.find((c: any) => 
                        c.id.toString() === (property as any)?.communityId?.toString()
                      );
                      if (currentCommunity) {
                        setCommunitySearch(currentCommunity.name);
                        setSelectedCommunity(currentCommunity);
                      } else {
                        setCommunitySearch("");
                        setSelectedCommunity(null);
                      }
                      setIsEditModalOpen(true);
                    }}
                    className="flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Property
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => openTaskModal({ propertyId: parseInt(propertyId) })}
                    className="flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                  
                  {/* Property Actions Sprocket Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsReportsModalOpen(true)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Reports
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cascaded Client Alerts */}
        <CascadedClientAlertsDisplay propertyId={propertyId} />

        {/* Property Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Property Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Type:</span>
                <span className="font-medium">{getTypeDisplay((property as any)?.type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Status:</span>
                <Badge variant={getStatusColor((property as any)?.status)}>
                  {(property as any)?.status?.replace('_', ' ')}
                </Badge>
              </div>
              {(property as any)?.squareFootage && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Square Footage:</span>
                  <span className="font-medium">{(property as any).squareFootage} sq ft</span>
                </div>
              )}
              {(property as any)?.bedrooms && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Bedrooms:</span>
                  <span className="font-medium">{(property as any).bedrooms}</span>
                </div>
              )}
              {(property as any)?.bathrooms && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Bathrooms:</span>
                  <span className="font-medium">{(property as any).bathrooms}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Active Tasks:</span>
                <span className="font-medium">{propertyTasks.filter((task: any) => task.status !== 'completed').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Completed Tasks:</span>
                <span className="font-medium">{propertyTasks.filter((task: any) => task.status === 'completed').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Contacts:</span>
                <span className="font-medium">{Array.isArray(propertyContacts) ? propertyContacts.length : 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Rooms:</span>
                <span className="font-medium">{Array.isArray(rooms) ? rooms.length : 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Billing Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(property as any)?.billingRate && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Monthly Rate:</span>
                  <span className="font-medium">${(property as any).billingRate}/month</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Billing Status:</span>
                <Badge variant="default">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed information */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="contacts">Residents</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
            <TabsTrigger value="custom">Custom Fields</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Property Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {propertyTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No tasks found for this property.</p>
                    <Button
                      variant="outline"
                      onClick={() => openTaskModal({ propertyId: parseInt(propertyId) })}
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {propertyTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                        onClick={() => setLocation(`/task-profile/${task.id}`)}
                        data-testid={`task-item-${task.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-slate-900 truncate">{task.title}</h4>
                              {task.isTemplate && (
                                <Badge variant="secondary" className="shrink-0 bg-indigo-100 text-indigo-700">
                                  Template
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-slate-600 mb-2 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={getTaskPriorityColor(task.priority)} className="capitalize">
                                {task.priority}
                              </Badge>
                              <Badge variant={getTaskStatusColor(task.status)} className="capitalize">
                                {task.status ? String(task.status).replace('_', ' ') : 'pending'}
                              </Badge>
                              {task.dueDate && (
                                <span className="text-xs text-slate-600">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {task.assignedToName && (
                                <span className="text-xs text-slate-600">
                                  Assigned: {task.assignedToName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contact List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Property Clients</CardTitle>
                    <div className="flex items-center gap-2">
                      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Client
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setIsChangePrimaryModalOpen(true)}>
                            Change Primary
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedContactIds.length > 0 && (
                      <Button 
                        onClick={() => setIsMoveContactsModalOpen(true)}
                        className="w-full"
                        variant="outline"
                      >
                        Move {selectedContactIds.length} Client{selectedContactIds.length > 1 ? 's' : ''} to Property
                      </Button>
                    )}
                    {contactsLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-slate-400 mb-2" />
                        <p className="text-slate-600">Loading contacts...</p>
                      </div>
                    ) : Array.isArray(propertyContacts) && propertyContacts.length > 0 ? (
                      <div className="space-y-2">
                        {/* Primary Contact */}
                        {Array.isArray(propertyContacts) && propertyContacts.find((contact: any) => contact.type === 'owner') && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Primary</h4>
                            {(Array.isArray(propertyContacts) ? propertyContacts : [])
                              .filter((contact: any) => contact.type === 'owner')
                              .map((contact: any) => (
                              <div
                                key={contact.id}
                                className={`p-3 rounded-lg border transition-colors ${
                                  selectedContact?.id === contact.id
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-green-200 bg-green-50 hover:border-green-300"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={selectedContactIds.includes(contact.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedContactIds([...selectedContactIds, contact.id]);
                                      } else {
                                        setSelectedContactIds(selectedContactIds.filter(id => id !== contact.id));
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div 
                                    className="flex-1 cursor-pointer flex items-center justify-between"
                                    onClick={() => setLocation(`/person-profile/${contact.id}`)}
                                  >
                                    <div>
                                      <h4 className="font-medium">{contact.firstName} {contact.lastName}</h4>
                                      <p className="text-sm text-slate-600 capitalize">{contact.type}</p>
                                      {contact.phone && (
                                        <p className="text-xs text-slate-500">{contact.phone}</p>
                                      )}
                                    </div>
                                    <User className="w-5 h-5 text-green-600" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Household Members/Tenants */}
                        {Array.isArray(propertyContacts) && propertyContacts.filter((contact: any) => contact.type !== 'owner').length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Household Members & Tenants</h4>
                            {(Array.isArray(propertyContacts) ? propertyContacts : [])
                              .filter((contact: any) => contact.type !== 'owner')
                              .map((contact: any) => (
                              <div
                                key={contact.id}
                                className={`p-3 rounded-lg border transition-colors mb-2 ${
                                  selectedContact?.id === contact.id
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={selectedContactIds.includes(contact.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedContactIds([...selectedContactIds, contact.id]);
                                      } else {
                                        setSelectedContactIds(selectedContactIds.filter(id => id !== contact.id));
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div 
                                    className="flex-1 cursor-pointer flex items-center justify-between"
                                    onClick={() => setLocation(`/person-profile/${contact.id}`)}
                                  >
                                    <div>
                                      <h4 className="font-medium">{contact.firstName} {contact.lastName}</h4>
                                      <p className="text-sm text-slate-600 capitalize">{contact.type}</p>
                                      {contact.email && (
                                        <p className="text-xs text-slate-500">{contact.email}</p>
                                      )}
                                    </div>
                                    <User className="w-5 h-5 text-slate-400" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <User className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                        <p className="text-slate-600">No contacts added yet</p>
                        <p className="text-slate-500 text-sm mt-2">
                          Add property owners, tenants, or household members
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Details */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {selectedContact 
                      ? `${selectedContact.firstName} ${selectedContact.lastName}` 
                      : 'Contact Details'
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedContact ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Type</Label>
                          <p className="text-slate-900 capitalize">{selectedContact.type}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Full Name</Label>
                          <p className="text-slate-900">{selectedContact.firstName} {selectedContact.lastName}</p>
                        </div>
                        {selectedContact.email && (
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Email</Label>
                            <p className="text-slate-900">{selectedContact.email}</p>
                          </div>
                        )}
                        {selectedContact.phone && (
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Phone</Label>
                            <p className="text-slate-900">{selectedContact.phone}</p>
                          </div>
                        )}
                      </div>
                      {selectedContact.notes && (
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Notes</Label>
                          <p className="text-slate-900">{selectedContact.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <User className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Contact</h3>
                      <p className="text-slate-600">Choose a contact from the list to view their details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rooms">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Room List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Property Rooms</CardTitle>
                    <Dialog open={isRoomModalOpen} onOpenChange={setIsRoomModalOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Room
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                        <DialogDescription>
                          {editingRoom 
                            ? 'Update the room details and information.'
                            : 'Add a new room or space to this property for better task organization.'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="room-name">Room Name</Label>
                          <Input
                            id="room-name"
                            value={roomForm.name}
                            onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                            placeholder="e.g. Living Room, Master Bedroom"
                          />
                        </div>

                        <div>
                          <Label htmlFor="room-type">Room Type</Label>
                          <Select 
                            value={roomForm.type}
                            onValueChange={(value) => setRoomForm({ ...roomForm, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bedroom">Bedroom</SelectItem>
                              <SelectItem value="bathroom">Bathroom</SelectItem>
                              <SelectItem value="kitchen">Kitchen</SelectItem>
                              <SelectItem value="living_room">Living Room</SelectItem>
                              <SelectItem value="dining_room">Dining Room</SelectItem>
                              <SelectItem value="office">Office</SelectItem>
                              <SelectItem value="garage">Garage</SelectItem>
                              <SelectItem value="basement">Basement</SelectItem>
                              <SelectItem value="attic">Attic</SelectItem>
                              <SelectItem value="laundry">Laundry Room</SelectItem>
                              <SelectItem value="utility">Utility Room</SelectItem>
                              <SelectItem value="outdoor">Outdoor Space</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="room-description">Description (Optional)</Label>
                          <Textarea
                            id="room-description"
                            value={roomForm.description}
                            onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                            placeholder="Add any additional details about this room..."
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={handleCancelRoomEdit}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={editingRoom ? handleUpdateRoom : handleAddRoom}
                          disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
                        >
                          {createRoomMutation.isPending || updateRoomMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              {editingRoom ? 'Updating...' : 'Adding...'}
                            </>
                          ) : (
                            editingRoom ? 'Update Room' : 'Add Room'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!Array.isArray(rooms) || rooms.length === 0 ? (
                  <div className="text-center py-8">
                    <Home className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No rooms added yet</h3>
                    <p className="text-slate-600 mb-4">Add rooms to better organize tasks by location within the property.</p>
                    <Button onClick={() => setIsRoomModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Room
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(rooms) && rooms.map((room: any) => (
                      <div 
                        key={room.id} 
                        className={`border rounded-lg p-4 transition-all cursor-pointer ${
                          selectedRoom?.id === room.id 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{room.name}</h4>
                            <p className="text-sm text-slate-600 capitalize">{room.type.replace('_', ' ')}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditRoom(room)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Room
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteRoom(room.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Room
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {room.description && (
                          <p className="text-sm text-slate-600">{room.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Room Details Panel */}
            {selectedRoom && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{selectedRoom.name} - Details</CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {selectedRoom.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="supplies" className="w-full">
                    <TabsList className="grid w-full grid-cols-8">
                      <TabsTrigger value="supplies">Supplies</TabsTrigger>
                      <TabsTrigger value="devices">Devices</TabsTrigger>
                      <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
                      <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
                      <TabsTrigger value="links">Links</TabsTrigger>
                      <TabsTrigger value="photos">Photos</TabsTrigger>
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="supplies" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Room Supplies</h4>
                        <Button onClick={() => setIsSupplyModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Supply
                        </Button>
                      </div>

                      {suppliesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      ) : Array.isArray(supplies) && supplies.length > 0 ? (
                        <div className="grid gap-4">
                          {supplies.map((supply: any) => (
                            <Card key={supply.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-slate-900">{supply.name}</h5>
                                  <p className="text-sm text-slate-600 capitalize mb-2">{supply.type}</p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    {supply.brand && (
                                      <div>
                                        <span className="font-medium">Brand:</span> {supply.brand}
                                      </div>
                                    )}
                                    {supply.model && (
                                      <div>
                                        <span className="font-medium">Model:</span> {supply.model}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium">Qty:</span> {supply.quantity} {supply.unit}
                                    </div>
                                    {supply.location && (
                                      <div>
                                        <span className="font-medium">Location:</span> {supply.location}
                                      </div>
                                    )}
                                  </div>
                                  {supply.lastChanged && (
                                    <div className="mt-2 text-sm text-slate-600">
                                      <span className="font-medium">Last Changed:</span> {new Date(supply.lastChanged).toLocaleDateString()}
                                      {supply.nextReplacement && (
                                        <span className="ml-4">
                                          <span className="font-medium">Next:</span> {new Date(supply.nextReplacement).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {supply.notes && (
                                    <p className="mt-2 text-sm text-slate-700 italic">{supply.notes}</p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditSupply(supply)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Supply
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => handleDeleteSupply(supply.id)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Supply
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Package className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 mb-2">No supplies tracked</h3>
                          <p className="text-slate-600 mb-4">Start tracking supplies for this room.</p>
                          <Button onClick={() => setIsSupplyModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Supply
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="devices" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Room Devices</h4>
                        <Button onClick={() => setIsDeviceModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Device
                        </Button>
                      </div>

                      {devicesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      ) : Array.isArray(devices) && devices.length > 0 ? (
                        <div className="grid gap-4">
                          {devices.map((device: any) => {
                            const DeviceIcon = getDeviceIcon(device.type);
                            return (
                              <Card 
                                key={device.id} 
                                className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleViewDevice(device)}
                                data-testid={`device-card-${device.id}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <DeviceIcon className="w-5 h-5 text-slate-600 mt-1" />
                                    <div className="flex-1">
                                      <h5 className="font-medium text-slate-900">{device.name}</h5>
                                      <p className="text-sm text-slate-600 capitalize mb-2">{device.type}</p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                                        {device.brand && (
                                          <div>
                                            <span className="font-medium">Brand:</span> {device.brand}
                                          </div>
                                        )}
                                        {device.model && (
                                          <div>
                                            <span className="font-medium">Model:</span> {device.model}
                                          </div>
                                        )}
                                        {device.serialNumber && (
                                          <div>
                                            <span className="font-medium">Serial:</span> {device.serialNumber}
                                          </div>
                                        )}
                                        {device.macAddress && (
                                          <div>
                                            <span className="font-medium">MAC:</span> {device.macAddress}
                                          </div>
                                        )}
                                        {device.ipAddress && (
                                          <div>
                                            <span className="font-medium">IP:</span> {device.ipAddress}
                                          </div>
                                        )}
                                        {device.locationInRoom && (
                                          <div>
                                            <span className="font-medium">Location:</span> {device.locationInRoom}
                                          </div>
                                        )}
                                      </div>
                                      {device.installDate && (
                                        <div className="mt-2 text-sm text-slate-600">
                                          <span className="font-medium">Installed:</span> {new Date(device.installDate).toLocaleDateString()}
                                          {device.lastServiced && (
                                            <span className="ml-4">
                                              <span className="font-medium">Last Service:</span> {new Date(device.lastServiced).toLocaleDateString()}
                                            </span>
                                          )}
                                          {device.nextServiceDue && (
                                            <span className="ml-4">
                                              <span className="font-medium">Next Service:</span> {new Date(device.nextServiceDue).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {device.hasWarranty && (device.warrantyStartDate || device.warrantyEndDate) && (
                                        <div className="mt-2 text-sm" data-testid={`device-warranty-${device.id}`}>
                                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                                            <span className="font-medium">Warranty:</span>
                                            {device.warrantyStartDate && device.warrantyEndDate ? (
                                              <span className="ml-1">
                                                {new Date(device.warrantyStartDate).toLocaleDateString()} - {new Date(device.warrantyEndDate).toLocaleDateString()}
                                              </span>
                                            ) : device.warrantyStartDate ? (
                                              <span className="ml-1">From {new Date(device.warrantyStartDate).toLocaleDateString()}</span>
                                            ) : device.warrantyEndDate ? (
                                              <span className="ml-1">Until {new Date(device.warrantyEndDate).toLocaleDateString()}</span>
                                            ) : null}
                                          </Badge>
                                        </div>
                                      )}
                                      {device.notes && (
                                        <p className="mt-2 text-sm text-slate-700 italic">{device.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditDevice(device);
                                      }}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Device
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteDevice(device.id);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Device
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Monitor className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 mb-2">No devices tracked</h3>
                          <p className="text-slate-600 mb-4">Start tracking devices for this room.</p>
                          <Button onClick={() => setIsDeviceModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Device
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Room Notes</h4>
                        <Button onClick={() => setIsNoteModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Note
                        </Button>
                      </div>

                      {notesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      ) : Array.isArray(notes) && notes.length > 0 ? (
                        <div className="space-y-4">
                          {notes.map((note: any) => (
                            <Card key={note.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h5 className="font-medium text-slate-900">{note.title}</h5>
                                    {note.isImportant && (
                                      <Badge variant="destructive" className="text-xs">Important</Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {note.category}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-700 mb-3">{note.content}</p>
                                  <div className="text-xs text-slate-500">
                                    Added {new Date(note.createdAt).toLocaleDateString()} by {note.createdById}
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditNote(note)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => handleDeleteNote(note.id)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Note
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 mb-2">No notes added</h3>
                          <p className="text-slate-600 mb-4">Add notes and observations for this room.</p>
                          <Button onClick={() => setIsNoteModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Note
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="surfaces" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Room Surfaces</h4>
                        <Button onClick={() => setIsSurfaceModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Edit Surfaces
                        </Button>
                      </div>

                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto text-slate-400 mb-4 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Home className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Surface Information</h3>
                        <p className="text-slate-600 mb-4">Track flooring, paint, wallpaper, and ceiling details for this room.</p>
                        <Button onClick={() => setIsSurfaceModalOpen(true)} variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Configure Surfaces
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="fixtures" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Room Fixtures</h4>
                        <Button onClick={() => setIsFixtureModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Edit Fixtures
                        </Button>
                      </div>

                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto text-slate-400 mb-4 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Lightbulb className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Fixture Information</h3>
                        <p className="text-slate-600 mb-4">Track windows, doors, lighting, HVAC, plumbing, and electrical fixtures.</p>
                        <Button onClick={() => setIsFixtureModalOpen(true)} variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Configure Fixtures
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="links" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Surface Links</h4>
                        <Button onClick={handleAddLink} data-testid="button-add-link">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Link
                        </Button>
                      </div>

                      {surfaceLinksLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      ) : Array.isArray(surfaceLinks) && surfaceLinks.length > 0 ? (
                        <div className="grid gap-4">
                          {surfaceLinks.map((link: any) => (
                            <Card key={link.id} className="p-4" data-testid={`card-link-${link.id}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h5 className="font-medium text-slate-900">{link.name}</h5>
                                    <Badge variant="secondary" className="text-xs capitalize">
                                      {link.surfaceCategory.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <a 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                                    data-testid={`link-url-${link.id}`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {link.url}
                                  </a>
                                  {link.notes && (
                                    <p className="text-sm text-slate-600">{link.notes}</p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" data-testid={`button-link-menu-${link.id}`}>
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditLink(link)} data-testid={`button-edit-link-${link.id}`}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => handleDeleteLink(link.id)}
                                      data-testid={`button-delete-link-${link.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Link
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <ExternalLink className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 mb-2">No links added</h3>
                          <p className="text-slate-600 mb-4">Add purchasing links for room surfaces like flooring, walls, and fixtures.</p>
                          <Button onClick={handleAddLink} data-testid="button-add-first-link">
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Link
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="photos" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Room Photos</h4>
                        <Button onClick={() => setIsPhotoModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Photo
                        </Button>
                      </div>

                      {false ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      ) : false ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[].map((photo: any) => (
                            <Card key={photo.id} className="overflow-hidden">
                              <div className="aspect-video relative">
                                <img 
                                  src={photo.url || photo.photoUrl} 
                                  alt={photo.description || photo.originalName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f1f5f9'/%3E%3Ctext x='50' y='50' font-family='sans-serif' font-size='14' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                                <Badge 
                                  className="absolute top-2 right-2 text-xs"
                                  variant={photo.category === 'issue' ? 'destructive' : 'secondary'}
                                >
                                  {photo.category}
                                </Badge>
                              </div>
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900 mb-1">
                                      {photo.originalName}
                                    </p>
                                    {photo.description && (
                                      <p className="text-xs text-slate-600 mb-2">{photo.description}</p>
                                    )}
                                    <p className="text-xs text-slate-500">
                                      {new Date(photo.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => handleDeletePhoto(photo.id)}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Photo
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Camera className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 mb-2">No photos uploaded</h3>
                          <p className="text-slate-600 mb-4">Add photos to document the current state of this room.</p>
                          <Button onClick={() => setIsPhotoModalOpen(true)}>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload First Photo
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Maintenance History</h4>
                      </div>

                      <div className="text-center py-8">
                        <History className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No maintenance history</h3>
                        <p className="text-slate-600 mb-4">Completed tasks and maintenance activities for this room will appear here.</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {!selectedRoom && (
              <Card className="lg:col-span-2">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Home className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Select a room</h3>
                    <p className="text-slate-600">Click on a room from the left to view its supplies and notes.</p>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </TabsContent>

          <TabsContent value="vehicles">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vehicle List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Property Vehicles</CardTitle>
                    <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Vehicle
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {vehiclesLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-slate-400 mb-2" />
                        <p className="text-slate-600">Loading vehicles...</p>
                      </div>
                    ) : Array.isArray(vehicles) && vehicles.length > 0 ? (
                      <div className="space-y-2">
                        {vehicles.map((vehicle: any) => {
                          const maintenanceAlerts = getMaintenanceAlerts(vehicle.id);
                          const registrationAlerts = getRegistrationAlerts(vehicle.id);
                          const hasMaintenanceAlerts = maintenanceAlerts.length > 0;
                          const hasRegistrationAlerts = registrationAlerts.length > 0;
                          
                          return (
                            <div
                              key={vehicle.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedVehicle?.id === vehicle.id
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                              onClick={() => setSelectedVehicle(vehicle)}
                              data-testid={`vehicle-item-${vehicle.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</h4>
                                    {hasMaintenanceAlerts && (
                                      <Badge variant="destructive" className="text-xs" data-testid={`vehicle-maintenance-badge-${vehicle.id}`}>
                                        {maintenanceAlerts.length} Maintenance Due
                                      </Badge>
                                    )}
                                    {hasRegistrationAlerts && (
                                      <Badge 
                                        variant={registrationAlerts[0].isOverdue ? "destructive" : "default"}
                                        className={`text-xs ${!registrationAlerts[0].isOverdue ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                                        data-testid={`vehicle-registration-badge-${vehicle.id}`}
                                      >
                                        Registration Due
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600">{vehicle.licensePlate || 'No plate'}</p>
                                  {vehicle.color && (
                                    <p className="text-xs text-slate-500">{vehicle.color}</p>
                                  )}
                                </div>
                                <Car className="w-5 h-5 text-slate-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Car className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                        <p className="text-slate-600">No vehicles registered yet</p>
                        <p className="text-slate-500 text-sm mt-2">
                          Click "Add Vehicle" to register a new vehicle for this property
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Details */}
              {selectedVehicle && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Car className="w-5 h-5 mr-2" />
                        {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEditVehicle}
                        data-testid="button-edit-vehicle"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Vehicle
                      </Button>
                    </div>
                    {selectedVehicle.licensePlate && (
                      <p className="text-sm text-slate-600">License Plate: {selectedVehicle.licensePlate}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* Maintenance Alerts */}
                    {(() => {
                      const alerts = getMaintenanceAlerts(selectedVehicle.id);
                      if (alerts.length > 0) {
                        return (
                          <Alert className="mb-6 border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100" data-testid="vehicle-maintenance-alert">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <AlertTitle data-testid="vehicle-maintenance-alert-title">Maintenance Due</AlertTitle>
                            <AlertDescription data-testid="vehicle-maintenance-alert-description">
                              {alerts.length} maintenance {alerts.length === 1 ? 'item' : 'items'} {alerts.length === 1 ? 'needs' : 'need'} attention.
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      return null;
                    })()}

                    {/* Registration Alerts */}
                    {(() => {
                      const registrationAlerts = getRegistrationAlerts(selectedVehicle.id);
                      if (registrationAlerts.length > 0) {
                        const alert = registrationAlerts[0];
                        const isOverdue = alert.isOverdue;
                        return (
                          <Alert 
                            className={`mb-6 ${isOverdue ? 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100' : 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100'}`}
                            data-testid="vehicle-registration-alert"
                          >
                            <AlertCircle className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                            <AlertTitle data-testid="vehicle-registration-alert-title">
                              Registration {isOverdue ? 'Overdue' : 'Due Soon'}
                            </AlertTitle>
                            <AlertDescription data-testid="vehicle-registration-alert-description">
                              {isOverdue 
                                ? `Vehicle registration is ${Math.abs(alert.diffDays)} day${Math.abs(alert.diffDays) !== 1 ? 's' : ''} overdue.`
                                : `Vehicle registration is due in ${alert.diffDays} day${alert.diffDays !== 1 ? 's' : ''}.`
                              }
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      return null;
                    })()}

                    <Tabs defaultValue="details" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details" data-testid="tab-vehicle-details">Details</TabsTrigger>
                        <TabsTrigger value="photos" data-testid="tab-vehicle-photos">Photos</TabsTrigger>
                        <TabsTrigger value="maintenance" data-testid="tab-vehicle-maintenance">Maintenance</TabsTrigger>
                      </TabsList>

                      <TabsContent value="details" className="space-y-4" data-testid="content-vehicle-details">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedVehicle.vin && (
                            <div>
                              <Label className="text-slate-600">VIN</Label>
                              <p className="font-medium">{selectedVehicle.vin}</p>
                            </div>
                          )}
                          {selectedVehicle.color && (
                            <div>
                              <Label className="text-slate-600">Color</Label>
                              <p className="font-medium">{selectedVehicle.color}</p>
                            </div>
                          )}
                          {selectedVehicle.type && (
                            <div>
                              <Label className="text-slate-600">Type</Label>
                              <p className="font-medium capitalize">{selectedVehicle.type.replace('_', ' ')}</p>
                            </div>
                          )}
                          {selectedVehicle.odometer && (
                            <div data-testid="vehicle-odometer">
                              <Label className="text-slate-600">Current Mileage</Label>
                              <p className="font-medium">{selectedVehicle.odometer.toLocaleString()} mi</p>
                            </div>
                          )}
                          {selectedVehicle.registrationDate && (() => {
                            const regDate = safeParseDateString(selectedVehicle.registrationDate);
                            if (!regDate) return null;
                            return (
                              <div data-testid="vehicle-registration-date">
                                <Label className="text-slate-600">Registration Date</Label>
                                <p className="font-medium">{format(regDate, 'MMM d, yyyy')}</p>
                              </div>
                            );
                          })()}
                          {selectedVehicle.registrationDueDate && (() => {
                            const dueDate = safeParseDateString(selectedVehicle.registrationDueDate);
                            if (!dueDate) return null;
                            const registrationAlerts = getRegistrationAlerts(selectedVehicle.id);
                            const hasAlert = registrationAlerts.length > 0;
                            const isOverdue = hasAlert && registrationAlerts[0].isOverdue;
                            return (
                              <div data-testid="vehicle-registration-due">
                                <Label className="text-slate-600">Registration Due</Label>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{format(dueDate, 'MMM d, yyyy')}</p>
                                  {hasAlert && (
                                    <Badge 
                                      variant={isOverdue ? "destructive" : "default"}
                                      className={`text-xs ${!isOverdue ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                                    >
                                      {isOverdue ? 'Overdue' : 'Due Soon'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          {selectedVehicle.details && (
                            <div className="md:col-span-2">
                              <Label className="text-slate-600">Notes</Label>
                              <p className="font-medium">{selectedVehicle.details}</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="photos" className="space-y-4" data-testid="content-vehicle-photos">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-medium">Vehicle Photos</h4>
                          <Button onClick={() => setIsVehiclePhotoModalOpen(true)} data-testid="button-add-vehicle-photo">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Photo
                          </Button>
                        </div>

                        {vehiclePhotosLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                          </div>
                        ) : Array.isArray(vehiclePhotos) && vehiclePhotos.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="vehicle-photos-grid">
                            {vehiclePhotos.map((photo: any) => (
                              <Card key={photo.id} className="overflow-hidden" data-testid={`vehicle-photo-card-${photo.id}`}>
                                <div className="aspect-video relative">
                                  <img 
                                    src={photo.url || photo.photoUrl} 
                                    alt={photo.description || photo.originalName}
                                    className="w-full h-full object-cover"
                                    data-testid={`vehicle-photo-img-${photo.id}`}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f1f5f9'/%3E%3Ctext x='50' y='50' font-family='sans-serif' font-size='14' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E";
                                    }}
                                  />
                                  <Badge 
                                    className="absolute top-2 right-2 text-xs"
                                    variant={photo.category === 'damage' ? 'destructive' : 'secondary'}
                                    data-testid={`vehicle-photo-badge-${photo.id}`}
                                  >
                                    {photo.category}
                                  </Badge>
                                </div>
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-slate-900 mb-1" data-testid={`vehicle-photo-name-${photo.id}`}>
                                        {photo.originalName}
                                      </p>
                                      {photo.description && (
                                        <p className="text-xs text-slate-600 mb-2" data-testid={`vehicle-photo-desc-${photo.id}`}>{photo.description}</p>
                                      )}
                                      <p className="text-xs text-slate-500">
                                        {new Date(photo.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-vehicle-photo-menu-${photo.id}`}>
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                          className="text-red-600"
                                          onClick={() => handleDeleteVehiclePhoto(photo.id)}
                                          data-testid={`button-delete-vehicle-photo-${photo.id}`}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete Photo
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Camera className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 mb-2">No photos uploaded</h3>
                            <p className="text-slate-600 mb-4">Add photos to document the condition of this vehicle.</p>
                            <Button onClick={() => setIsVehiclePhotoModalOpen(true)} data-testid="button-upload-first-vehicle-photo">
                              <Upload className="w-4 h-4 mr-2" />
                              Upload First Photo
                            </Button>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="maintenance" className="space-y-4" data-testid="content-vehicle-maintenance">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-medium">Maintenance History</h4>
                          <Button onClick={handleAddMaintenance} data-testid="button-add-maintenance">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Maintenance
                          </Button>
                        </div>

                        {vehicleMaintenanceLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                          </div>
                        ) : Array.isArray(vehicleMaintenance) && vehicleMaintenance.length > 0 ? (
                          <div className="space-y-3" data-testid="vehicle-maintenance-list">
                            {vehicleMaintenance.map((maintenance: any) => {
                              const serviceDate = safeParseDateString(maintenance.serviceDate);
                              const nextDueDate = safeParseDateString(maintenance.nextDueDate);
                              
                              const isOverdue = nextDueDate ? differenceInDays(nextDueDate, new Date()) < 0 : false;
                              const isDueSoon = nextDueDate ? (differenceInDays(nextDueDate, new Date()) >= 0 && differenceInDays(nextDueDate, new Date()) <= 7) : false;
                              
                              return (
                                <Card key={maintenance.id} className={isOverdue ? 'border-red-300' : isDueSoon ? 'border-amber-300' : ''} data-testid={`maintenance-card-${maintenance.id}`}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge variant="outline" data-testid={`maintenance-type-${maintenance.id}`}>
                                            {maintenance.type.replace('_', ' ')}
                                          </Badge>
                                          {isOverdue && (
                                            <Badge variant="destructive" data-testid={`maintenance-overdue-${maintenance.id}`}>Overdue</Badge>
                                          )}
                                          {isDueSoon && !isOverdue && (
                                            <Badge className="bg-amber-500" data-testid={`maintenance-due-soon-${maintenance.id}`}>Due Soon</Badge>
                                          )}
                                        </div>
                                        <p className="font-medium mb-2" data-testid={`maintenance-desc-${maintenance.id}`}>{maintenance.description}</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                                          <div>
                                            <span className="font-medium">Service Date:</span> {serviceDate ? format(serviceDate, 'MMM d, yyyy') : 'N/A'}
                                          </div>
                                          {nextDueDate && (
                                            <div data-testid={`maintenance-next-due-${maintenance.id}`}>
                                              <span className="font-medium">Next Due:</span> {format(nextDueDate, 'MMM d, yyyy')}
                                            </div>
                                          )}
                                          {maintenance.mileage && (
                                            <div data-testid={`maintenance-mileage-${maintenance.id}`}>
                                              <span className="font-medium">Mileage:</span> {maintenance.mileage.toLocaleString()} mi
                                            </div>
                                          )}
                                          {maintenance.cost && (
                                            <div data-testid={`maintenance-cost-${maintenance.id}`}>
                                              <span className="font-medium">Cost:</span> ${maintenance.cost}
                                            </div>
                                          )}
                                          {maintenance.vendor && (
                                            <div className="col-span-2" data-testid={`maintenance-vendor-${maintenance.id}`}>
                                              <span className="font-medium">Vendor:</span> {maintenance.vendor}
                                            </div>
                                          )}
                                          {maintenance.notes && (
                                            <div className="col-span-2" data-testid={`maintenance-notes-${maintenance.id}`}>
                                              <span className="font-medium">Notes:</span> {maintenance.notes}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-maintenance-menu-${maintenance.id}`}>
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleCreateMaintenanceTask(maintenance)} data-testid={`button-create-task-maintenance-${maintenance.id}`}>
                                            <Calendar className="w-4 h-4 mr-2" />
                                            Create Task
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleEditMaintenance(maintenance)} data-testid={`button-edit-maintenance-${maintenance.id}`}>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Maintenance
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            className="text-red-600"
                                            onClick={() => handleDeleteMaintenance(maintenance.id)}
                                            data-testid={`button-delete-maintenance-${maintenance.id}`}
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Maintenance
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Wrench className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 mb-2">No maintenance records</h3>
                            <p className="text-slate-600 mb-4">Track oil changes, inspections, repairs, and other service history.</p>
                            <Button onClick={handleAddMaintenance} data-testid="button-add-first-maintenance">
                              <Plus className="w-4 h-4 mr-2" />
                              Add First Record
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {!selectedVehicle && (
                <Card className="lg:col-span-2">
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Car className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Select a vehicle</h3>
                      <p className="text-slate-600">Click on a vehicle from the left to view its maintenance records and details.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="community">
            {(property as any)?.communityId ? (
              (() => {
                const community = communities.find((c: any) => c.id === (property as any).communityId);
                if (!community) return (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Building className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-600">Community details not available</p>
                    </CardContent>
                  </Card>
                );

                return (
                  <div className="space-y-6">
                    {/* Community Header */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center text-2xl">
                            <Building className="w-6 h-6 mr-3" />
                            {community.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setIsChangeCommunityDialogOpen(true)}
                              data-testid="button-change-community"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Change Community
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Navigate to admin page with communities tab and focus on this community
                                window.location.href = `/admin?tab=communities&community=${community.id}`;
                              }}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Manage Community
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">Location</h4>
                            <p className="text-slate-600">
                              {[community.address1, community.address2, community.city, community.state, community.zip]
                                .filter(Boolean)
                                .join(", ") || "Address not available"}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">Management</h4>
                            <div className="space-y-1 text-sm">
                              {community.managerId && (
                                <p><span className="font-medium">Manager ID:</span> {community.managerId}</p>
                              )}
                              {community.hoaPresidentId && (
                                <p><span className="font-medium">HOA President:</span> {community.hoaPresidentId}</p>
                              )}
                              {!community.managerId && !community.hoaPresidentId && (
                                <p className="text-slate-500">Management info not available</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Community Details Tabs */}
                    <Tabs defaultValue="overview" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="rules">Rules</TabsTrigger>
                        <TabsTrigger value="schedule">Schedule</TabsTrigger>
                        <TabsTrigger value="financial">Financial</TabsTrigger>
                        <TabsTrigger value="amenities">Amenities</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Basic Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-medium text-slate-700">Gate Code:</span>
                                <span className="ml-2 text-slate-900">{community.gateCode || "Not set"}</span>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Property Manager:</span>
                                <span className="ml-2 text-slate-900">{community.propertyManagerName || "Not assigned"}</span>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Emergency Contact:</span>
                                <span className="ml-2 text-slate-900">{community.emergencyContact || "Not provided"}</span>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">HOA Mailing Address:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.hoaMailingAddress || "Not provided"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {community.notes ? (
                                <p className="text-slate-700 whitespace-pre-wrap">{community.notes}</p>
                              ) : (
                                <p className="text-slate-500 italic">No additional notes</p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="rules" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Rental & Property Restrictions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-medium text-slate-700">Rental Restrictions:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.rentalRestrictions || "No restrictions specified"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Pet Policy:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.petPolicy || "No pet policy specified"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Parking Rules:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.parkingRules || "No parking rules specified"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Community Guidelines</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-medium text-slate-700">Noise Restrictions:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.noiseRestrictions || "No noise restrictions specified"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Vendor Access:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.vendorAccessProcedures || "No vendor procedures specified"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="schedule" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Maintenance Schedule</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-medium text-slate-700">Trash/Recycling:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.trashRecyclingPickup || "Schedule not available"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Bulk Trash:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.bulkTrash || "Schedule not available"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Landscaping:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.landscapeMaintenance || "Schedule not available"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Community Events</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-medium text-slate-700">Pest Control:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.pestControl || "Schedule not available"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">HOA Meetings:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.hoaMeetings || "Schedule not available"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="financial" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">HOA Dues & Fees</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-medium text-slate-700">HOA Dues Frequency:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.hoaDuesFrequency || "Not specified"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">HOA Dues Amount:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.hoaDuesAmount ? `$${community.hoaDuesAmount}` : "Not specified"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Late Fees:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.lateFees || "Not specified"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Payment Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-medium text-slate-700">Payment Portal:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.paymentPortals || "Not available"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Special Assessments:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.specialAssessments || "None currently"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="amenities" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Current Projects</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-slate-900">
                                {community.ongoingProjects || "No ongoing projects"}
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Common Areas & Maintenance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-medium text-slate-700">Common Area Maintenance:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.commonAreaMaintenance || "Not specified"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">Facilities:</span>
                                <div className="ml-2 text-slate-900 mt-1">
                                  {community.facilityManagement || "No facilities listed"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="documents" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Available Documents</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <p className="text-slate-600 mb-4">Community documents and resources</p>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                  <span className="text-slate-700">HOA Declarations</span>
                                  <span className="text-slate-500 text-sm">Not available</span>
                                </div>
                                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                  <span className="text-slate-700">CC&Rs & Bylaws</span>
                                  <span className="text-slate-500 text-sm">Not available</span>
                                </div>
                                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                  <span className="text-slate-700">Community FAQ</span>
                                  <span className="text-slate-500 text-sm">Not available</span>
                                </div>
                                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                  <span className="text-slate-700">Welcome Packet</span>
                                  <span className="text-slate-500 text-sm">Not available</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Document Upload</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-slate-600 mb-4">Upload community documents for easy access</p>
                              <Button variant="outline" disabled>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Documents
                                <span className="ml-2 text-xs text-slate-500">(Coming Soon)</span>
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                );
              })()
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Building className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No community assigned</h3>
                  <p className="text-slate-600 mb-4">This property is not currently assigned to a community or HOA.</p>
                  <Button 
                    onClick={() => setIsChangeCommunityDialogOpen(true)}
                    data-testid="button-assign-community"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Assign Community
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="access">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    <CardTitle>Property Access</CardTitle>
                  </div>
                  <Button onClick={() => {
                    setEditingAccessItem(null);
                    setAccessItemForm({
                      category: "wifi",
                      description: "",
                      value: "",
                      notes: ""
                    });
                    setIsAccessModalOpen(true);
                  }} data-testid="button-add-access">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Access Info
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {accessItemsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : accessItems.length > 0 ? (
                  <div className="space-y-6">
                    {/* Group by category */}
                    {["wifi", "alarm", "door_code", "garage", "gate", "other"].map((category) => {
                      const categoryItems = accessItems.filter((item: any) => item.category === category);
                      if (categoryItems.length === 0) return null;
                      
                      const categoryConfig = {
                        wifi: { label: "WiFi", icon: Router },
                        alarm: { label: "Alarm", icon: Lock },
                        door_code: { label: "Door Codes", icon: Key },
                        garage: { label: "Garage", icon: Home },
                        gate: { label: "Gate", icon: Navigation },
                        other: { label: "Other", icon: Settings }
                      };
                      
                      const config = categoryConfig[category as keyof typeof categoryConfig];
                      const Icon = config.icon;
                      
                      return (
                        <div key={category} className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 border-b pb-2">
                            <Icon className="w-4 h-4" />
                            {config.label}
                          </div>
                          <div className="grid gap-3">
                            {categoryItems.map((item: any) => (
                              <Card key={item.id} className="bg-slate-50 dark:bg-slate-800/50" data-testid={`access-item-${item.id}`}>
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                      {item.description && (
                                        <div className="font-medium text-slate-900 dark:text-slate-100" data-testid={`access-description-${item.id}`}>
                                          {item.description}
                                        </div>
                                      )}
                                      {item.value && (
                                        <div className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-2 rounded border" data-testid={`access-value-${item.id}`}>
                                          {item.value}
                                        </div>
                                      )}
                                      {item.notes && (
                                        <div className="text-sm text-slate-600 dark:text-slate-400" data-testid={`access-notes-${item.id}`}>
                                          {item.notes}
                                        </div>
                                      )}
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" data-testid={`dropdown-access-${item.id}`}>
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => {
                                          setEditingAccessItem(item);
                                          setAccessItemForm({
                                            category: item.category,
                                            description: item.description || "",
                                            value: item.value || "",
                                            notes: item.notes || ""
                                          });
                                          setIsAccessModalOpen(true);
                                        }} data-testid={`button-edit-access-${item.id}`}>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            if (confirm("Are you sure you want to delete this access information?")) {
                                              deleteAccessItemMutation.mutate(item.id);
                                            }
                                          }}
                                          className="text-red-600 dark:text-red-400"
                                          data-testid={`button-delete-access-${item.id}`}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No access information</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">Start adding access codes and credentials for this property.</p>
                    <Button onClick={() => {
                      setEditingAccessItem(null);
                      setAccessItemForm({
                        category: "wifi",
                        description: "",
                        value: "",
                        notes: ""
                      });
                      setIsAccessModalOpen(true);
                    }} data-testid="button-add-first-access">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Access Info
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom">
            <Card>
              <CardHeader>
                <CardTitle>Custom Fields</CardTitle>
              </CardHeader>
              <CardContent>
                {customFields.length > 0 ? (
                  (property as any)?.customFieldValues && Object.keys((property as any).customFieldValues).length > 0 ? (
                    <CustomFieldsRenderer
                      fields={customFields}
                      values={(property as any).customFieldValues || {}}
                      onChange={() => {}}
                      mode="view"
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-600 dark:text-slate-400 mb-4">No custom field values have been set for this property yet.</p>
                      <Button onClick={() => setIsEditModalOpen(true)} data-testid="button-edit-property-custom-fields">
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Property
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600 dark:text-slate-400 mb-4">No custom fields have been configured for properties. Custom fields can be added in the Admin section.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Property Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Notes and observations for this property will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Supply Modal */}
        <Dialog open={isSupplyModalOpen} onOpenChange={setIsSupplyModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSupply ? 'Edit Supply' : 'Add New Supply'}</DialogTitle>
              <DialogDescription>
                {editingSupply 
                  ? 'Update the supply details and information.'
                  : `Add a new supply item for ${selectedRoom?.name || 'this room'}.`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="supply-name">Supply Name *</Label>
                <Input
                  id="supply-name"
                  value={roomSupplyForm.name}
                  onChange={(e) => setRoomSupplyForm({ ...roomSupplyForm, name: e.target.value })}
                  placeholder="e.g. LED Ceiling Light"
                />
              </div>

              <div>
                <Label htmlFor="supply-type">Type</Label>
                <Select 
                  value={roomSupplyForm.type}
                  onValueChange={(value) => setRoomSupplyForm({ ...roomSupplyForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supply type" />
                  </SelectTrigger>
                  <SelectContent>
                    {((supplySettings as any)?.supplyTypes || []).map((type: string) => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="supply-brand">Brand</Label>
                <Input
                  id="supply-brand"
                  value={roomSupplyForm.brand}
                  onChange={(e) => setRoomSupplyForm({ ...roomSupplyForm, brand: e.target.value })}
                  placeholder="e.g. Philips, GE, Duracell"
                />
              </div>

              <div>
                <Label htmlFor="supply-model">Model</Label>
                <Input
                  id="supply-model"
                  value={roomSupplyForm.model}
                  onChange={(e) => setRoomSupplyForm({ ...roomSupplyForm, model: e.target.value })}
                  placeholder="e.g. 60W Soft White"
                />
              </div>

              <div>
                <Label htmlFor="supply-quantity">Quantity *</Label>
                <Input
                  id="supply-quantity"
                  type="number"
                  min="1"
                  value={roomSupplyForm.quantity}
                  onChange={(e) => setRoomSupplyForm({ ...roomSupplyForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div>
                <Label htmlFor="supply-unit">Unit</Label>
                <Select 
                  value={roomSupplyForm.unit}
                  onValueChange={(value) => setRoomSupplyForm({ ...roomSupplyForm, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {((supplySettings as any)?.supplyUnits || []).map((unit: string) => (
                      <SelectItem key={unit} value={unit} className="capitalize">
                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="supply-location">Location in Room</Label>
                <Input
                  id="supply-location"
                  value={roomSupplyForm.location}
                  onChange={(e) => setRoomSupplyForm({ ...roomSupplyForm, location: e.target.value })}
                  placeholder="e.g. Main ceiling fixture, Under sink"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="supply-purchase-url">Purchase Link</Label>
                <Input
                  id="supply-purchase-url"
                  type="url"
                  value={roomSupplyForm.purchaseUrl}
                  onChange={(e) => setRoomSupplyForm({ ...roomSupplyForm, purchaseUrl: e.target.value })}
                  placeholder="e.g. https://amazon.com/product-link, https://homedepot.com/item"
                />
              </div>

              <div>
                <Label htmlFor="supply-last-changed">Last Changed</Label>
                <Input
                  id="supply-last-changed"
                  type="date"
                  value={roomSupplyForm.lastChanged}
                  onChange={(e) => setRoomSupplyForm({ ...roomSupplyForm, lastChanged: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="supply-next-replacement">Next Replacement Date</Label>
                <Input
                  id="supply-next-replacement"
                  type="date"
                  value={roomSupplyForm.nextReplacement}
                  onChange={(e) => setRoomSupplyForm({ ...roomSupplyForm, nextReplacement: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="supply-notes">Notes</Label>
                <Textarea
                  id="supply-notes"
                  value={roomSupplyForm.notes}
                  onChange={(e) => setRoomSupplyForm({ ...roomSupplyForm, notes: e.target.value })}
                  placeholder="Add any additional notes about this supply item..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancelSupplyEdit}>
                Cancel
              </Button>
              <Button 
                onClick={editingSupply ? handleUpdateSupply : handleAddSupply}
                disabled={createSupplyMutation.isPending || updateSupplyMutation.isPending}
              >
                {createSupplyMutation.isPending || updateSupplyMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {editingSupply ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingSupply ? 'Update Supply' : 'Add Supply'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notes Modal */}
        <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
              <DialogDescription>
                {editingNote 
                  ? 'Update the note details and information.'
                  : `Add a new note for ${selectedRoom?.name || 'this room'}.`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="note-title">Title *</Label>
                <Input
                  id="note-title"
                  value={roomNoteForm.title}
                  onChange={(e) => setRoomNoteForm({ ...roomNoteForm, title: e.target.value })}
                  placeholder="e.g. Paint Color Reference"
                />
              </div>

              <div>
                <Label htmlFor="note-category">Category</Label>
                <Select 
                  value={roomNoteForm.category}
                  onValueChange={(value) => setRoomNoteForm({ ...roomNoteForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="paint">Paint</SelectItem>
                    <SelectItem value="measurements">Measurements</SelectItem>
                    <SelectItem value="warranty">Warranty</SelectItem>
                    <SelectItem value="issues">Issues</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="note-content">Content *</Label>
                <Textarea
                  id="note-content"
                  value={roomNoteForm.content}
                  onChange={(e) => setRoomNoteForm({ ...roomNoteForm, content: e.target.value })}
                  placeholder="Add your note content here..."
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="note-important"
                  checked={roomNoteForm.isImportant}
                  onCheckedChange={(checked: boolean) => setRoomNoteForm({ ...roomNoteForm, isImportant: !!checked })}
                />
                <Label htmlFor="note-important">Mark as important</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancelNoteEdit}>
                Cancel
              </Button>
              <Button 
                onClick={editingNote ? handleUpdateNote : handleAddNote}
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
              >
                {createNoteMutation.isPending || updateNoteMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {editingNote ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingNote ? 'Update Note' : 'Add Note'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Device Modal */}
        <Dialog open={isDeviceModalOpen} onOpenChange={setIsDeviceModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDevice ? 'Edit Device' : 'Add New Device'}</DialogTitle>
              <DialogDescription>
                {editingDevice 
                  ? 'Update device details and information.'
                  : `Add a new device for ${selectedRoom?.name || 'this room'}.`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="device-name">Device Name *</Label>
                <Input
                  id="device-name"
                  value={roomDeviceForm.name}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, name: e.target.value })}
                  placeholder="e.g. Living Room Thermostat"
                />
              </div>

              <div>
                <Label htmlFor="device-type">Device Type</Label>
                <Select 
                  value={roomDeviceForm.type}
                  onValueChange={(value) => setRoomDeviceForm({ ...roomDeviceForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermostat">Thermostat</SelectItem>
                    <SelectItem value="smart_tv">Smart TV</SelectItem>
                    <SelectItem value="security_camera">Security Camera</SelectItem>
                    <SelectItem value="router">Router</SelectItem>
                    <SelectItem value="smart_speaker">Smart Speaker</SelectItem>
                    <SelectItem value="smart_phone">Smart Phone</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="smoke_detector">Smoke Detector</SelectItem>
                    <SelectItem value="doorbell">Smart Doorbell</SelectItem>
                    <SelectItem value="smart_lock">Smart Lock</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="device-brand">Brand</Label>
                <Input
                  id="device-brand"
                  value={roomDeviceForm.brand}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, brand: e.target.value })}
                  placeholder="e.g. Nest, Samsung, Ring"
                />
              </div>

              <div>
                <Label htmlFor="device-model">Model</Label>
                <Input
                  id="device-model"
                  value={roomDeviceForm.model}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, model: e.target.value })}
                  placeholder="e.g. Model number or name"
                />
              </div>

              <div>
                <Label htmlFor="device-serial">Serial Number</Label>
                <Input
                  id="device-serial"
                  value={roomDeviceForm.serialNumber}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, serialNumber: e.target.value })}
                  placeholder="Device serial number"
                />
              </div>

              <div>
                <Label htmlFor="device-mac">MAC Address</Label>
                <Input
                  id="device-mac"
                  value={roomDeviceForm.macAddress}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, macAddress: e.target.value })}
                  placeholder="00:00:00:00:00:00"
                />
              </div>

              <div>
                <Label htmlFor="device-ip">IP Address</Label>
                <Input
                  id="device-ip"
                  value={roomDeviceForm.ipAddress}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, ipAddress: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>

              <div>
                <Label htmlFor="device-link">Link</Label>
                <Input
                  id="device-link"
                  value={roomDeviceForm.link}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, link: e.target.value })}
                  placeholder="Product page, manual URL, etc."
                  data-testid="input-device-link"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="device-location">Location in Room</Label>
                <Input
                  id="device-location"
                  value={roomDeviceForm.locationInRoom}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, locationInRoom: e.target.value })}
                  placeholder="e.g. North wall, ceiling mount"
                />
              </div>

              <div>
                <Label htmlFor="device-install-date">Install Date</Label>
                <Input
                  id="device-install-date"
                  type="date"
                  value={roomDeviceForm.installDate}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, installDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="device-last-serviced">Last Serviced</Label>
                <Input
                  id="device-last-serviced"
                  type="date"
                  value={roomDeviceForm.lastServiced}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, lastServiced: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 flex items-center space-x-2">
                <Checkbox
                  id="device-requires-servicing"
                  checked={roomDeviceForm.requiresServicing}
                  onCheckedChange={(checked) => setRoomDeviceForm({ ...roomDeviceForm, requiresServicing: !!checked })}
                  data-testid="checkbox-requires-servicing"
                />
                <Label htmlFor="device-requires-servicing" className="cursor-pointer">
                  Device requires servicing
                </Label>
              </div>

              {roomDeviceForm.requiresServicing && (
                <>
                  <div>
                    <Label htmlFor="service-interval">Service Interval</Label>
                    <Input
                      id="service-interval"
                      type="number"
                      min="1"
                      value={roomDeviceForm.serviceInterval}
                      onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, serviceInterval: e.target.value })}
                      placeholder="e.g., 6"
                      data-testid="input-service-interval"
                    />
                  </div>

                  <div>
                    <Label htmlFor="service-interval-unit">Service Frequency</Label>
                    <Select 
                      value={roomDeviceForm.serviceIntervalUnit}
                      onValueChange={(value) => setRoomDeviceForm({ ...roomDeviceForm, serviceIntervalUnit: value })}
                    >
                      <SelectTrigger id="service-interval-unit" data-testid="select-service-interval-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="device-next-service">Next Service Due</Label>
                    <Input
                      id="device-next-service"
                      type="date"
                      value={roomDeviceForm.nextServiceDue}
                      onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, nextServiceDue: e.target.value })}
                      data-testid="input-next-service-due"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2 flex items-center space-x-2">
                <Checkbox
                  id="device-has-warranty"
                  checked={roomDeviceForm.hasWarranty}
                  onCheckedChange={(checked) => setRoomDeviceForm({ ...roomDeviceForm, hasWarranty: !!checked })}
                  data-testid="checkbox-has-warranty"
                />
                <Label htmlFor="device-has-warranty" className="cursor-pointer">
                  Device has warranty
                </Label>
              </div>

              {roomDeviceForm.hasWarranty && (
                <>
                  <div>
                    <Label htmlFor="device-warranty-start">Warranty Start Date</Label>
                    <Input
                      id="device-warranty-start"
                      type="date"
                      value={roomDeviceForm.warrantyStartDate}
                      onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, warrantyStartDate: e.target.value })}
                      data-testid="input-warranty-start"
                    />
                  </div>

                  <div>
                    <Label htmlFor="device-warranty-end">Warranty End Date</Label>
                    <Input
                      id="device-warranty-end"
                      type="date"
                      value={roomDeviceForm.warrantyEndDate}
                      onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, warrantyEndDate: e.target.value })}
                      data-testid="input-warranty-end"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <Label htmlFor="device-notes">Notes</Label>
                <Textarea
                  id="device-notes"
                  value={roomDeviceForm.notes}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, notes: e.target.value })}
                  placeholder="Add any additional notes about this device..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancelDeviceEdit}>
                Cancel
              </Button>
              <Button 
                onClick={editingDevice ? handleUpdateDevice : handleAddDevice}
                disabled={createDeviceMutation.isPending || updateDeviceMutation.isPending}
              >
                {createDeviceMutation.isPending || updateDeviceMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {editingDevice ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingDevice ? 'Update Device' : 'Add Device'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Device Details Modal */}
        <Dialog open={isDeviceDetailsModalOpen} onOpenChange={setIsDeviceDetailsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Device Details</DialogTitle>
              <DialogDescription>
                View complete information for {selectedDevice?.name || 'this device'}.
              </DialogDescription>
            </DialogHeader>
            
            {selectedDevice && (
              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600">Device Name</Label>
                      <p className="font-medium">{selectedDevice.name}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Device Type</Label>
                      <p className="font-medium capitalize">{selectedDevice.type?.replace('_', ' ')}</p>
                    </div>
                    {selectedDevice.brand && (
                      <div>
                        <Label className="text-slate-600">Brand</Label>
                        <p className="font-medium">{selectedDevice.brand}</p>
                      </div>
                    )}
                    {selectedDevice.model && (
                      <div>
                        <Label className="text-slate-600">Model</Label>
                        <p className="font-medium">{selectedDevice.model}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Details */}
                {(selectedDevice.serialNumber || selectedDevice.macAddress || selectedDevice.ipAddress || selectedDevice.link) && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Technical Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedDevice.serialNumber && (
                        <div>
                          <Label className="text-slate-600">Serial Number</Label>
                          <p className="font-medium">{selectedDevice.serialNumber}</p>
                        </div>
                      )}
                      {selectedDevice.macAddress && (
                        <div>
                          <Label className="text-slate-600">MAC Address</Label>
                          <p className="font-medium">{selectedDevice.macAddress}</p>
                        </div>
                      )}
                      {selectedDevice.ipAddress && (
                        <div>
                          <Label className="text-slate-600">IP Address</Label>
                          <p className="font-medium">{selectedDevice.ipAddress}</p>
                        </div>
                      )}
                      {selectedDevice.link && (
                        <div>
                          <Label className="text-slate-600">Link</Label>
                          <a 
                            href={selectedDevice.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                            data-testid="device-details-link"
                          >
                            {selectedDevice.link.length > 50 ? selectedDevice.link.substring(0, 50) + '...' : selectedDevice.link}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Location */}
                {selectedDevice.locationInRoom && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Location</h4>
                    <div>
                      <Label className="text-slate-600">Location in Room</Label>
                      <p className="font-medium">{selectedDevice.locationInRoom}</p>
                    </div>
                  </div>
                )}

                {/* Service Information */}
                {(selectedDevice.installDate || selectedDevice.lastServiced || selectedDevice.requiresServicing) && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Service Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedDevice.installDate && (
                        <div>
                          <Label className="text-slate-600">Install Date</Label>
                          <p className="font-medium">{new Date(selectedDevice.installDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {selectedDevice.lastServiced && (
                        <div>
                          <Label className="text-slate-600">Last Serviced</Label>
                          <p className="font-medium">{new Date(selectedDevice.lastServiced).toLocaleDateString()}</p>
                        </div>
                      )}
                      {selectedDevice.requiresServicing && (
                        <>
                          <div>
                            <Label className="text-slate-600">Requires Servicing</Label>
                            <p className="font-medium">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                                Every {selectedDevice.serviceInterval} {selectedDevice.serviceIntervalUnit}
                              </Badge>
                            </p>
                          </div>
                          {selectedDevice.nextServiceDue && (
                            <div>
                              <Label className="text-slate-600">Next Service Due</Label>
                              <p className="font-medium">{new Date(selectedDevice.nextServiceDue).toLocaleDateString()}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Warranty Information */}
                {selectedDevice.hasWarranty && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Warranty Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-600">Warranty Status</Label>
                        <p className="font-medium">
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                            Active Warranty
                          </Badge>
                        </p>
                      </div>
                      {selectedDevice.warrantyStartDate && (
                        <div>
                          <Label className="text-slate-600">Warranty Start</Label>
                          <p className="font-medium">{new Date(selectedDevice.warrantyStartDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {selectedDevice.warrantyEndDate && (
                        <div>
                          <Label className="text-slate-600">Warranty End</Label>
                          <p className="font-medium">{new Date(selectedDevice.warrantyEndDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedDevice.notes && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Notes</h4>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedDevice.notes}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeviceDetailsModalOpen(false)}>
                Close
              </Button>
              {selectedDevice?.requiresServicing && (
                <Button 
                  onClick={handleCreateServiceTask}
                  variant="secondary"
                  data-testid="btn-create-service-task"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Service Task
                </Button>
              )}
              <Button onClick={handleEditFromDetails} data-testid="btn-edit-device-from-details">
                <Edit className="w-4 h-4 mr-2" />
                Edit Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Surface Modal */}
        <Dialog open={isSurfaceModalOpen} onOpenChange={setIsSurfaceModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Configure Room Surfaces</DialogTitle>
              <DialogDescription>
                Update flooring, paint, wall treatment, and ceiling information for {selectedRoom?.name || 'this room'}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="flooring-type">Flooring Type</Label>
                <Select 
                  value={roomSurfaceForm.flooringType}
                  onValueChange={(value) => setRoomSurfaceForm({ ...roomSurfaceForm, flooringType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select flooring type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carpet">Carpet</SelectItem>
                    <SelectItem value="hardwood">Hardwood</SelectItem>
                    <SelectItem value="tile">Tile</SelectItem>
                    <SelectItem value="laminate">Laminate</SelectItem>
                    <SelectItem value="vinyl">Vinyl</SelectItem>
                    <SelectItem value="concrete">Concrete</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="flooring-notes">Flooring Notes</Label>
                <Input
                  id="flooring-notes"
                  value={roomSurfaceForm.flooringNotes}
                  onChange={(e) => setRoomSurfaceForm({ ...roomSurfaceForm, flooringNotes: e.target.value })}
                  placeholder="Brand, condition, special notes"
                />
              </div>

              <div>
                <Label htmlFor="paint-color">Paint Color</Label>
                <Input
                  id="paint-color"
                  value={roomSurfaceForm.paintColor}
                  onChange={(e) => setRoomSurfaceForm({ ...roomSurfaceForm, paintColor: e.target.value })}
                  placeholder="e.g. Beige, Off-white"
                />
              </div>

              <div>
                <Label htmlFor="paint-code">Paint Code</Label>
                <Input
                  id="paint-code"
                  value={roomSurfaceForm.paintCode}
                  onChange={(e) => setRoomSurfaceForm({ ...roomSurfaceForm, paintCode: e.target.value })}
                  placeholder="e.g. SW 7005, BM CC-40"
                />
              </div>

              <div>
                <Label htmlFor="paint-brand">Paint Brand</Label>
                <Input
                  id="paint-brand"
                  value={roomSurfaceForm.paintBrand}
                  onChange={(e) => setRoomSurfaceForm({ ...roomSurfaceForm, paintBrand: e.target.value })}
                  placeholder="e.g. Sherwin-Williams, Benjamin Moore"
                />
              </div>

              <div>
                <Label htmlFor="wall-treatment">Wall Treatment</Label>
                <Select 
                  value={roomSurfaceForm.wallTreatment}
                  onValueChange={(value) => setRoomSurfaceForm({ ...roomSurfaceForm, wallTreatment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select wall treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paint">Paint Only</SelectItem>
                    <SelectItem value="wallpaper">Wallpaper</SelectItem>
                    <SelectItem value="paneling">Wood Paneling</SelectItem>
                    <SelectItem value="tile">Tile</SelectItem>
                    <SelectItem value="stone">Stone/Brick</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="wall-treatment-notes">Wall Treatment Notes</Label>
                <Textarea
                  id="wall-treatment-notes"
                  value={roomSurfaceForm.wallTreatmentNotes}
                  onChange={(e) => setRoomSurfaceForm({ ...roomSurfaceForm, wallTreatmentNotes: e.target.value })}
                  placeholder="Additional details about wall treatments"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="ceiling-type">Ceiling Type</Label>
                <Select 
                  value={roomSurfaceForm.ceilingType}
                  onValueChange={(value) => setRoomSurfaceForm({ ...roomSurfaceForm, ceilingType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ceiling type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Flat</SelectItem>
                    <SelectItem value="tray">Tray Ceiling</SelectItem>
                    <SelectItem value="vaulted">Vaulted</SelectItem>
                    <SelectItem value="coffered">Coffered</SelectItem>
                    <SelectItem value="popcorn">Popcorn/Textured</SelectItem>
                    <SelectItem value="exposed">Exposed Beams</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ceiling-height">Ceiling Height</Label>
                <Input
                  id="ceiling-height"
                  value={roomSurfaceForm.ceilingHeight}
                  onChange={(e) => setRoomSurfaceForm({ ...roomSurfaceForm, ceilingHeight: e.target.value })}
                  placeholder="e.g. 8', 9', 10'"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="ceiling-notes">Ceiling Notes</Label>
                <Textarea
                  id="ceiling-notes"
                  value={roomSurfaceForm.ceilingNotes}
                  onChange={(e) => setRoomSurfaceForm({ ...roomSurfaceForm, ceilingNotes: e.target.value })}
                  placeholder="Additional ceiling details and notes"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSurfaceModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSurface}
                disabled={saveSurfaceMutation.isPending}
              >
                {saveSurfaceMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Surface Information'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fixture Modal */}
        <Dialog open={isFixtureModalOpen} onOpenChange={setIsFixtureModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Configure Room Fixtures</DialogTitle>
              <DialogDescription>
                Update windows, doors, lighting, HVAC, plumbing, and electrical fixtures for {selectedRoom?.name || 'this room'}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
              <div>
                <Label htmlFor="window-count">Window Count</Label>
                <Input
                  id="window-count"
                  type="number"
                  min="0"
                  value={roomFixtureForm.windowCount}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, windowCount: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="window-type">Window Type</Label>
                <Input
                  id="window-type"
                  value={roomFixtureForm.windowType}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, windowType: e.target.value })}
                  placeholder="e.g. Double-hung, Casement"
                />
              </div>

              <div>
                <Label htmlFor="window-treatments">Window Treatments</Label>
                <Input
                  id="window-treatments"
                  value={roomFixtureForm.windowTreatments}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, windowTreatments: e.target.value })}
                  placeholder="e.g. Blinds, Curtains"
                />
              </div>

              <div>
                <Label htmlFor="door-count">Door Count</Label>
                <Input
                  id="door-count"
                  type="number"
                  min="0"
                  value={roomFixtureForm.doorCount}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, doorCount: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="door-types">Door Types</Label>
                <Input
                  id="door-types"
                  value={roomFixtureForm.doorTypes}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, doorTypes: e.target.value })}
                  placeholder="e.g. Interior, Sliding, French"
                />
              </div>

              <div>
                <Label htmlFor="lock-types">Lock Types</Label>
                <Input
                  id="lock-types"
                  value={roomFixtureForm.lockTypes}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, lockTypes: e.target.value })}
                  placeholder="e.g. Deadbolt, Keypad"
                />
              </div>

              <div>
                <Label htmlFor="lighting-type">Lighting Type</Label>
                <Input
                  id="lighting-type"
                  value={roomFixtureForm.lightingType}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, lightingType: e.target.value })}
                  placeholder="e.g. Recessed, Pendant"
                />
              </div>

              <div>
                <Label htmlFor="has-dimmer">Has Dimmer Switch</Label>
                <Checkbox
                  id="has-dimmer"
                  checked={roomFixtureForm.hasDimmer}
                  onCheckedChange={(checked) => setRoomFixtureForm({ ...roomFixtureForm, hasDimmer: checked as boolean })}
                />
              </div>

              <div>
                <Label htmlFor="hvac-vents">HVAC Vents</Label>
                <Input
                  id="hvac-vents"
                  type="number"
                  min="0"
                  value={roomFixtureForm.hvacVents}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, hvacVents: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="hvac-filter-size">HVAC Filter Size</Label>
                <Input
                  id="hvac-filter-size"
                  value={roomFixtureForm.hvacFilterSize}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, hvacFilterSize: e.target.value })}
                  placeholder="e.g. 16x20x1"
                />
              </div>

              <div>
                <Label htmlFor="plumbing-access">Plumbing Access</Label>
                <Input
                  id="plumbing-access"
                  value={roomFixtureForm.plumbingAccess}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, plumbingAccess: e.target.value })}
                  placeholder="e.g. Sink, Toilet, Shower"
                />
              </div>

              <div>
                <Label htmlFor="electrical-outlets">Electrical Outlets</Label>
                <Input
                  id="electrical-outlets"
                  type="number"
                  min="0"
                  value={roomFixtureForm.electricalOutlets}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, electricalOutlets: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="lighting-notes">Lighting Notes</Label>
                <Textarea
                  id="lighting-notes"
                  value={roomFixtureForm.lightingNotes}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, lightingNotes: e.target.value })}
                  placeholder="Additional lighting details"
                  rows={2}
                />
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="hvac-notes">HVAC Notes</Label>
                <Textarea
                  id="hvac-notes"
                  value={roomFixtureForm.hvacNotes}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, hvacNotes: e.target.value })}
                  placeholder="Additional HVAC details"
                  rows={2}
                />
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="plumbing-notes">Plumbing Notes</Label>
                <Textarea
                  id="plumbing-notes"
                  value={roomFixtureForm.plumbingNotes}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, plumbingNotes: e.target.value })}
                  placeholder="Additional plumbing details"
                  rows={2}
                />
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="electrical-notes">Electrical Notes</Label>
                <Textarea
                  id="electrical-notes"
                  value={roomFixtureForm.electricalNotes}
                  onChange={(e) => setRoomFixtureForm({ ...roomFixtureForm, electricalNotes: e.target.value })}
                  placeholder="Additional electrical details"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFixtureModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveFixture}
                disabled={saveFixtureMutation.isPending}
              >
                {saveFixtureMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Fixture Information'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Surface Link Modal */}
        <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{selectedLink ? 'Edit Surface Link' : 'Add Surface Link'}</DialogTitle>
              <DialogDescription>
                {selectedLink 
                  ? 'Update the purchasing link information.'
                  : `Add a purchasing link for surfaces in ${selectedRoom?.name || 'this room'}.`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="link-name">Name *</Label>
                <Input
                  id="link-name"
                  value={surfaceLinkForm.name}
                  onChange={(e) => setSurfaceLinkForm({ ...surfaceLinkForm, name: e.target.value })}
                  placeholder="e.g., Home Depot Oak Flooring"
                  data-testid="input-link-name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="link-url">URL *</Label>
                <Input
                  id="link-url"
                  type="url"
                  value={surfaceLinkForm.url}
                  onChange={(e) => setSurfaceLinkForm({ ...surfaceLinkForm, url: e.target.value })}
                  placeholder="https://example.com/product"
                  data-testid="input-link-url"
                  required
                />
              </div>

              <div>
                <Label htmlFor="link-category">Surface Category *</Label>
                <Select
                  value={surfaceLinkForm.surfaceCategory}
                  onValueChange={(value) => setSurfaceLinkForm({ ...surfaceLinkForm, surfaceCategory: value })}
                >
                  <SelectTrigger id="link-category" data-testid="select-link-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flooring">Flooring</SelectItem>
                    <SelectItem value="wall">Wall</SelectItem>
                    <SelectItem value="ceiling">Ceiling</SelectItem>
                    <SelectItem value="countertop">Countertop</SelectItem>
                    <SelectItem value="trim">Trim</SelectItem>
                    <SelectItem value="tile">Tile</SelectItem>
                    <SelectItem value="cabinet">Cabinet</SelectItem>
                    <SelectItem value="fixture">Fixture</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="link-notes">Notes</Label>
                <Textarea
                  id="link-notes"
                  value={surfaceLinkForm.notes}
                  onChange={(e) => setSurfaceLinkForm({ ...surfaceLinkForm, notes: e.target.value })}
                  placeholder="Additional notes about this link..."
                  rows={3}
                  data-testid="textarea-link-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setSelectedLink(null);
                }}
                data-testid="button-cancel-link"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitLink}
                disabled={!surfaceLinkForm.name || !surfaceLinkForm.url || createSurfaceLinkMutation.isPending || updateSurfaceLinkMutation.isPending}
                data-testid="button-save-link"
              >
                {(createSurfaceLinkMutation.isPending || updateSurfaceLinkMutation.isPending) ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : selectedLink ? (
                  'Update Link'
                ) : (
                  'Add Link'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Photo Modal */}
        <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Room Photo</DialogTitle>
              <DialogDescription>
                Upload a photo for {selectedRoom?.name || 'this room'}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="photo-file">Photo File</Label>
                <Input
                  id="photo-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <Label htmlFor="photo-category">Category</Label>
                <Select 
                  value={roomPhotoForm.category}
                  onValueChange={(value) => setRoomPhotoForm({ ...roomPhotoForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select photo category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="before">Before</SelectItem>
                    <SelectItem value="after">After</SelectItem>
                    <SelectItem value="issue">Issue/Problem</SelectItem>
                    <SelectItem value="completed">Completed Work</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="photo-description">Description</Label>
                <Textarea
                  id="photo-description"
                  value={roomPhotoForm.description}
                  onChange={(e) => setRoomPhotoForm({ ...roomPhotoForm, description: e.target.value })}
                  placeholder="Optional description of what this photo shows"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPhotoModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadPhoto}
                disabled={!photoFile || uploadPhotoMutation.isPending}
              >
                {uploadPhotoMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vehicle Modal */}
        <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
              <DialogDescription>
                {editingVehicle 
                  ? 'Update the vehicle details and information.'
                  : 'Register a new vehicle for this property.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="vehicle-make">Make *</Label>
                <Input
                  id="vehicle-make"
                  data-testid="input-vehicle-make"
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                  placeholder="e.g. Toyota, Honda, Ford"
                />
              </div>

              <div>
                <Label htmlFor="vehicle-model">Model *</Label>
                <Input
                  id="vehicle-model"
                  data-testid="input-vehicle-model"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  placeholder="e.g. Camry, Civic, F-150"
                />
              </div>

              <div>
                <Label htmlFor="vehicle-year">Year</Label>
                <Input
                  id="vehicle-year"
                  data-testid="input-vehicle-year"
                  type="number"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                  placeholder="e.g. 2020"
                />
              </div>

              <div>
                <Label htmlFor="vehicle-color">Color</Label>
                <Input
                  id="vehicle-color"
                  data-testid="input-vehicle-color"
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                  placeholder="e.g. White, Blue, Red"
                />
              </div>

              <div>
                <Label htmlFor="vehicle-license">License Plate</Label>
                <Input
                  id="vehicle-license"
                  data-testid="input-vehicle-license"
                  value={vehicleForm.licensePlate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })}
                  placeholder="e.g. ABC-1234"
                />
              </div>

              <div>
                <Label htmlFor="vehicle-type">Vehicle Type</Label>
                <Select 
                  value={vehicleForm.type}
                  onValueChange={(value) => setVehicleForm({ ...vehicleForm, type: value })}
                >
                  <SelectTrigger data-testid="select-vehicle-type">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="boat">Boat</SelectItem>
                    <SelectItem value="rv">RV</SelectItem>
                    <SelectItem value="trailer">Trailer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="vehicle-vin">VIN</Label>
                <Input
                  id="vehicle-vin"
                  data-testid="input-vehicle-vin"
                  value={vehicleForm.vin}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                  placeholder="17-character Vehicle Identification Number"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="vehicle-description">Description</Label>
                <Textarea
                  id="vehicle-description"
                  data-testid="input-vehicle-description"
                  value={vehicleForm.description}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, description: e.target.value })}
                  placeholder="Additional notes or description about this vehicle"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVehicleModalOpen(false)} data-testid="button-cancel-vehicle">
                Cancel
              </Button>
              <Button 
                data-testid="button-add-vehicle"
                onClick={() => {
                  if (!vehicleForm.make || !vehicleForm.model) {
                    toast({
                      title: "Missing information",
                      description: "Please provide at least the vehicle make and model.",
                      variant: "destructive",
                    });
                    return;
                  }
                  createVehicleMutation.mutate(vehicleForm);
                }}
                disabled={createVehicleMutation.isPending}
              >
                {createVehicleMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vehicle
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vehicle Photo Upload Modal */}
        <Dialog open={isVehiclePhotoModalOpen} onOpenChange={setIsVehiclePhotoModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Vehicle Photo</DialogTitle>
              <DialogDescription>
                Upload a photo for {selectedVehicle?.make} {selectedVehicle?.model || 'this vehicle'}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="vehicle-photo-file">Photo *</Label>
                <Input
                  id="vehicle-photo-file"
                  type="file"
                  accept="image/*"
                  onChange={handleVehiclePhotoFileChange}
                  data-testid="input-vehicle-photo-file"
                />
                {vehiclePhotoPreview && (
                  <div className="mt-2 relative">
                    <img 
                      src={vehiclePhotoPreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-md"
                      data-testid="vehicle-photo-preview"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setVehiclePhotoFile(null);
                        setVehiclePhotoPreview("");
                      }}
                      data-testid="button-remove-vehicle-photo-preview"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle-photo-category">Category</Label>
                <Select 
                  value={vehiclePhotoForm.category}
                  onValueChange={(value) => setVehiclePhotoForm({ ...vehiclePhotoForm, category: value })}
                >
                  <SelectTrigger data-testid="select-vehicle-photo-category">
                    <SelectValue placeholder="Select photo category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="before">Before</SelectItem>
                    <SelectItem value="after">After</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vehicle-photo-description">Description</Label>
                <Textarea
                  id="vehicle-photo-description"
                  value={vehiclePhotoForm.description}
                  onChange={(e) => setVehiclePhotoForm({ ...vehiclePhotoForm, description: e.target.value })}
                  placeholder="Optional description of what this photo shows"
                  rows={3}
                  data-testid="input-vehicle-photo-description"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVehiclePhotoModalOpen(false)} data-testid="button-cancel-vehicle-photo">
                Cancel
              </Button>
              <Button 
                onClick={handleVehiclePhotoUpload}
                disabled={!vehiclePhotoFile || uploadVehiclePhotoMutation.isPending}
                data-testid="button-upload-vehicle-photo"
              >
                {uploadVehiclePhotoMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vehicle Maintenance Modal */}
        <Dialog open={isVehicleMaintenanceModalOpen} onOpenChange={setIsVehicleMaintenanceModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMaintenance ? 'Edit Maintenance Record' : 'Add Maintenance Record'}</DialogTitle>
              <DialogDescription>
                {editingMaintenance 
                  ? 'Update maintenance details and information.'
                  : `Add a maintenance record for ${selectedVehicle?.make} ${selectedVehicle?.model || 'this vehicle'}.`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="maintenance-type">Type *</Label>
                <Select 
                  value={vehicleMaintenanceForm.type}
                  onValueChange={(value) => setVehicleMaintenanceForm({ ...vehicleMaintenanceForm, type: value })}
                >
                  <SelectTrigger data-testid="select-maintenance-type">
                    <SelectValue placeholder="Select maintenance type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oil_change">Oil Change</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maintenance-service-date">Service Date *</Label>
                <Input
                  id="maintenance-service-date"
                  type="date"
                  value={vehicleMaintenanceForm.serviceDate}
                  onChange={(e) => setVehicleMaintenanceForm({ ...vehicleMaintenanceForm, serviceDate: e.target.value })}
                  data-testid="input-maintenance-service-date"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="maintenance-description">Description *</Label>
                <Textarea
                  id="maintenance-description"
                  value={vehicleMaintenanceForm.description}
                  onChange={(e) => setVehicleMaintenanceForm({ ...vehicleMaintenanceForm, description: e.target.value })}
                  placeholder="e.g. Changed engine oil and oil filter"
                  rows={2}
                  data-testid="input-maintenance-description"
                />
              </div>

              <div>
                <Label htmlFor="maintenance-next-due">Next Due Date (Optional)</Label>
                <Input
                  id="maintenance-next-due"
                  type="date"
                  value={vehicleMaintenanceForm.nextDueDate}
                  onChange={(e) => setVehicleMaintenanceForm({ ...vehicleMaintenanceForm, nextDueDate: e.target.value })}
                  data-testid="input-maintenance-next-due"
                />
              </div>

              <div>
                <Label htmlFor="maintenance-cost">Cost</Label>
                <Input
                  id="maintenance-cost"
                  value={vehicleMaintenanceForm.cost}
                  onChange={(e) => setVehicleMaintenanceForm({ ...vehicleMaintenanceForm, cost: e.target.value })}
                  placeholder="e.g. 49.99"
                  data-testid="input-maintenance-cost"
                />
              </div>

              <div>
                <Label htmlFor="maintenance-mileage">Mileage</Label>
                <Input
                  id="maintenance-mileage"
                  type="number"
                  value={vehicleMaintenanceForm.mileage}
                  onChange={(e) => setVehicleMaintenanceForm({ ...vehicleMaintenanceForm, mileage: e.target.value })}
                  placeholder="e.g. 45000"
                  data-testid="input-maintenance-mileage"
                />
              </div>

              <div>
                <Label htmlFor="maintenance-vendor">Vendor/Shop</Label>
                <Input
                  id="maintenance-vendor"
                  value={vehicleMaintenanceForm.vendor}
                  onChange={(e) => setVehicleMaintenanceForm({ ...vehicleMaintenanceForm, vendor: e.target.value })}
                  placeholder="e.g. Jiffy Lube, Toyota Dealership"
                  data-testid="input-maintenance-vendor"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="maintenance-notes">Notes</Label>
                <Textarea
                  id="maintenance-notes"
                  value={vehicleMaintenanceForm.notes}
                  onChange={(e) => setVehicleMaintenanceForm({ ...vehicleMaintenanceForm, notes: e.target.value })}
                  placeholder="Additional notes or observations..."
                  rows={3}
                  data-testid="input-maintenance-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVehicleMaintenanceModalOpen(false)} data-testid="button-cancel-maintenance">
                Cancel
              </Button>
              <Button 
                onClick={handleSaveMaintenance}
                disabled={createVehicleMaintenanceMutation.isPending || updateVehicleMaintenanceMutation.isPending}
                data-testid="button-save-maintenance"
              >
                {(createVehicleMaintenanceMutation.isPending || updateVehicleMaintenanceMutation.isPending) ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {editingMaintenance ? 'Update Maintenance' : 'Add Maintenance'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Vehicle Modal */}
        <Dialog open={isEditVehicleModalOpen} onOpenChange={setIsEditVehicleModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Vehicle Details</DialogTitle>
              <DialogDescription>
                Update the vehicle information and details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="edit-vehicle-make">Make *</Label>
                <Input
                  id="edit-vehicle-make"
                  data-testid="input-edit-vehicle-make"
                  value={editVehicleForm.make}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, make: e.target.value })}
                  placeholder="e.g. Toyota, Honda, Ford"
                />
              </div>

              <div>
                <Label htmlFor="edit-vehicle-model">Model *</Label>
                <Input
                  id="edit-vehicle-model"
                  data-testid="input-edit-vehicle-model"
                  value={editVehicleForm.model}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, model: e.target.value })}
                  placeholder="e.g. Camry, Civic, F-150"
                />
              </div>

              <div>
                <Label htmlFor="edit-vehicle-year">Year</Label>
                <Input
                  id="edit-vehicle-year"
                  data-testid="input-edit-vehicle-year"
                  type="number"
                  value={editVehicleForm.year}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, year: e.target.value })}
                  placeholder="e.g. 2020"
                />
              </div>

              <div>
                <Label htmlFor="edit-vehicle-color">Color</Label>
                <Input
                  id="edit-vehicle-color"
                  data-testid="input-edit-vehicle-color"
                  value={editVehicleForm.color}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, color: e.target.value })}
                  placeholder="e.g. White, Blue, Red"
                />
              </div>

              <div>
                <Label htmlFor="edit-vehicle-license">License Plate</Label>
                <Input
                  id="edit-vehicle-license"
                  data-testid="input-edit-vehicle-license"
                  value={editVehicleForm.licensePlate}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, licensePlate: e.target.value })}
                  placeholder="e.g. ABC-1234"
                />
              </div>

              <div>
                <Label htmlFor="edit-vehicle-type">Vehicle Type</Label>
                <Select 
                  value={editVehicleForm.type}
                  onValueChange={(value) => setEditVehicleForm({ ...editVehicleForm, type: value })}
                >
                  <SelectTrigger data-testid="select-edit-vehicle-type">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="boat">Boat</SelectItem>
                    <SelectItem value="rv">RV</SelectItem>
                    <SelectItem value="trailer">Trailer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-vehicle-vin">VIN</Label>
                <Input
                  id="edit-vehicle-vin"
                  data-testid="input-edit-vehicle-vin"
                  value={editVehicleForm.vin}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, vin: e.target.value })}
                  placeholder="17-character Vehicle Identification Number"
                />
              </div>

              <div>
                <Label htmlFor="edit-vehicle-odometer">Current Mileage/Hours</Label>
                <Input
                  id="edit-vehicle-odometer"
                  data-testid="input-edit-vehicle-odometer"
                  type="number"
                  value={editVehicleForm.odometer}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, odometer: e.target.value })}
                  placeholder="e.g. 45000"
                />
              </div>

              <div>
                <Label htmlFor="edit-vehicle-registration-date">Registration Date</Label>
                <Input
                  id="edit-vehicle-registration-date"
                  data-testid="input-edit-vehicle-registration-date"
                  type="date"
                  value={editVehicleForm.registrationDate}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, registrationDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-vehicle-registration-due">Registration Due Date</Label>
                <Input
                  id="edit-vehicle-registration-due"
                  data-testid="input-edit-vehicle-registration-due"
                  type="date"
                  value={editVehicleForm.registrationDueDate}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, registrationDueDate: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-vehicle-details">Details/Notes</Label>
                <Textarea
                  id="edit-vehicle-details"
                  data-testid="input-edit-vehicle-details"
                  value={editVehicleForm.details}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, details: e.target.value })}
                  placeholder="Additional notes or information about this vehicle"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsEditVehicleModalOpen(false)} 
                data-testid="button-cancel-edit-vehicle"
              >
                Cancel
              </Button>
              <Button 
                data-testid="button-save-edit-vehicle"
                onClick={() => {
                  if (!editVehicleForm.make || !editVehicleForm.model) {
                    toast({
                      title: "Missing information",
                      description: "Please provide at least the vehicle make and model.",
                      variant: "destructive",
                    });
                    return;
                  }
                  updateVehicleMutation.mutate({ 
                    id: selectedVehicle.id, 
                    vehicleData: editVehicleForm 
                  });
                }}
                disabled={updateVehicleMutation.isPending}
              >
                {updateVehicleMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Access Item Modal */}
        <Dialog open={isAccessModalOpen} onOpenChange={setIsAccessModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAccessItem ? 'Edit Access Information' : 'Add Access Information'}</DialogTitle>
              <DialogDescription>
                {editingAccessItem 
                  ? 'Update access codes and credentials for this property.'
                  : 'Add access codes and credentials for this property.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="access-category">Category *</Label>
                <Select 
                  value={accessItemForm.category}
                  onValueChange={(value) => setAccessItemForm({ ...accessItemForm, category: value })}
                >
                  <SelectTrigger data-testid="select-access-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wifi">WiFi</SelectItem>
                    <SelectItem value="alarm">Alarm</SelectItem>
                    <SelectItem value="door_code">Door Code</SelectItem>
                    <SelectItem value="garage">Garage</SelectItem>
                    <SelectItem value="gate">Gate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="access-description">Description</Label>
                <Input
                  id="access-description"
                  value={accessItemForm.description}
                  onChange={(e) => setAccessItemForm({ ...accessItemForm, description: e.target.value })}
                  placeholder="e.g. Main entrance, Guest WiFi, Master bedroom"
                  data-testid="input-access-description"
                />
              </div>

              <div>
                <Label htmlFor="access-value">Code/Value *</Label>
                <Input
                  id="access-value"
                  value={accessItemForm.value}
                  onChange={(e) => setAccessItemForm({ ...accessItemForm, value: e.target.value })}
                  placeholder="Enter access code, password, or credentials"
                  data-testid="input-access-value"
                />
              </div>

              <div>
                <Label htmlFor="access-notes">Notes</Label>
                <Textarea
                  id="access-notes"
                  value={accessItemForm.notes}
                  onChange={(e) => setAccessItemForm({ ...accessItemForm, notes: e.target.value })}
                  placeholder="Additional information about this access item"
                  rows={3}
                  data-testid="textarea-access-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAccessModalOpen(false)} data-testid="button-cancel-access">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!accessItemForm.value) {
                    toast({
                      title: "Missing information",
                      description: "Please provide the access code or value.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (editingAccessItem) {
                    updateAccessItemMutation.mutate({
                      id: editingAccessItem.id,
                      data: accessItemForm
                    });
                  } else {
                    createAccessItemMutation.mutate(accessItemForm);
                  }
                }}
                disabled={createAccessItemMutation.isPending || updateAccessItemMutation.isPending}
                data-testid="button-save-access"
              >
                {(createAccessItemMutation.isPending || updateAccessItemMutation.isPending) ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {editingAccessItem ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    {editingAccessItem ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingAccessItem ? 'Update' : 'Add'} Access Info
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Property Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription>
                Update property information and details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-name">Property Name *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Enter property name"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="edit-address1">Address Line 1 *</Label>
                  <Input
                    id="edit-address1"
                    value={editForm.address1}
                    onChange={(e) => setEditForm({ ...editForm, address1: e.target.value })}
                    placeholder="Street address"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="edit-address2">Address Line 2</Label>
                  <Input
                    id="edit-address2"
                    value={editForm.address2}
                    onChange={(e) => setEditForm({ ...editForm, address2: e.target.value })}
                    placeholder="Apt, suite, unit, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="edit-city">City *</Label>
                  <Input
                    id="edit-city"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="City"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-state">State *</Label>
                  <Input
                    id="edit-state"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    placeholder="State"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-zip">ZIP Code *</Label>
                  <Input
                    id="edit-zip"
                    value={editForm.zip}
                    onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                    placeholder="ZIP code"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-type">Property Type</Label>
                  <Select 
                    value={editForm.type}
                    onValueChange={(value) => setEditForm({ ...editForm, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="single-family">Single-Family</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="under_repair">Under Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-sqft">Square Footage</Label>
                  <Input
                    id="edit-sqft"
                    type="number"
                    value={editForm.squareFootage}
                    onChange={(e) => setEditForm({ ...editForm, squareFootage: e.target.value })}
                    placeholder="Square footage"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-bedrooms">Bedrooms</Label>
                  <Input
                    id="edit-bedrooms"
                    type="number"
                    value={editForm.bedrooms}
                    onChange={(e) => setEditForm({ ...editForm, bedrooms: e.target.value })}
                    placeholder="Number of bedrooms"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                  <Input
                    id="edit-bathrooms"
                    type="number"
                    step="0.5"
                    value={editForm.bathrooms}
                    onChange={(e) => setEditForm({ ...editForm, bathrooms: e.target.value })}
                    placeholder="Number of bathrooms"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-billing">Monthly Rate</Label>
                  <Input
                    id="edit-billing"
                    type="number"
                    step="0.01"
                    value={editForm.billingRate}
                    onChange={(e) => setEditForm({ ...editForm, billingRate: e.target.value })}
                    placeholder="Monthly billing rate"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="edit-community">Community / HOA</Label>
                  <div className="relative">
                    <Input
                      id="edit-community"
                      value={communitySearch}
                      onChange={(e) => {
                        setCommunitySearch(e.target.value);
                        // Filter communities based on search
                        const filtered = communities.filter((c: any) => 
                          c.name.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        // If exact match found, select it
                        const exactMatch = filtered.find((c: any) => 
                          c.name.toLowerCase() === e.target.value.toLowerCase()
                        );
                        if (exactMatch) {
                          setSelectedCommunity(exactMatch);
                          setEditForm({ ...editForm, communityId: exactMatch.id.toString() });
                        } else if (e.target.value === "") {
                          setSelectedCommunity(null);
                          setEditForm({ ...editForm, communityId: "" });
                        }
                      }}
                      placeholder="Type community name or leave blank..."
                    />
                    {communitySearch && communities.filter((c: any) => 
                      c.name.toLowerCase().includes(communitySearch.toLowerCase()) &&
                      c.name.toLowerCase() !== communitySearch.toLowerCase()
                    ).length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {communities
                          .filter((c: any) => 
                            c.name.toLowerCase().includes(communitySearch.toLowerCase()) &&
                            c.name.toLowerCase() !== communitySearch.toLowerCase()
                          )
                          .slice(0, 5)
                          .map((community: any) => (
                            <div
                              key={community.id}
                              className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                              onClick={() => {
                                setCommunitySearch(community.name);
                                setSelectedCommunity(community);
                                setEditForm({ ...editForm, communityId: community.id.toString() });
                              }}
                            >
                              <div className="font-medium text-slate-900">{community.name}</div>
                              {community.city && community.state && (
                                <div className="text-sm text-slate-600">
                                  {community.city}, {community.state}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                    {communitySearch && !communities.some((c: any) => 
                      c.name.toLowerCase().includes(communitySearch.toLowerCase())
                    ) && communitySearch.length > 2 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
                        <div className="px-4 py-3 text-center">
                          <p className="text-slate-600 mb-2">Community "{communitySearch}" not found</p>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              // Navigate to admin page to create new community
                              window.open('/admin/data-management?create=community&name=' + encodeURIComponent(communitySearch), '_blank');
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Community
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedCommunity && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <div className="font-medium text-blue-900">Selected: {selectedCommunity.name}</div>
                      {selectedCommunity.city && selectedCommunity.state && (
                        <div className="text-blue-700">
                          {selectedCommunity.city}, {selectedCommunity.state}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Property description or notes"
                    rows={3}
                  />
                </div>

                {/* Property Image Upload */}
                <div className="col-span-2">
                  <Label>Property Image (Optional)</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      isDragOver
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                    onDragOver={handleImageDragOver}
                    onDragLeave={handleImageDragLeave}
                    onDrop={handleImageDrop}
                  >
                    {isImageUploading ? (
                      <div className="flex flex-col items-center py-4">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                        <p className="text-sm text-slate-600">Uploading image...</p>
                      </div>
                    ) : propertyImageUrl ? (
                      <div className="relative">
                        <img
                          src={propertyImageUrl}
                          alt="Property preview"
                          className="max-h-48 mx-auto rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="mt-2"
                          onClick={removePropertyImage}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Image
                        </Button>
                      </div>
                    ) : (property as any)?.imageUrl ? (
                      <div className="relative">
                        <img
                          src={(property as any).imageUrl}
                          alt="Current property image"
                          className="max-h-48 mx-auto rounded-lg"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          Current image - upload a new one to replace
                        </p>
                        <label className="mt-2 inline-block">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            disabled={isImageUploading}
                            asChild
                          >
                            <span className="cursor-pointer">
                              <Upload className="w-4 h-4 mr-2" />
                              Replace Image
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleImageInputChange}
                            className="hidden"
                            disabled={isImageUploading}
                          />
                        </label>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 mb-1">
                          Drag and drop an image here, or click to browse
                        </p>
                        <p className="text-xs text-slate-500 mb-3">
                          JPG, PNG, GIF, or WEBP - Max 10MB
                        </p>
                        <label>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            disabled={isImageUploading}
                            asChild
                          >
                            <span className="cursor-pointer">
                              <Upload className="w-4 h-4 mr-2" />
                              Choose Image
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleImageInputChange}
                            className="hidden"
                            disabled={isImageUploading}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="col-span-2">
                    <CustomFieldsRenderer
                      fields={customFields}
                      values={editForm.customFieldValues}
                      onChange={(values) => setEditForm({ ...editForm, customFieldValues: values })}
                      mode="edit"
                    />
                  </div>
                )}
              </div>
            </div>
            </div>

            <DialogFooter className="flex-shrink-0">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!editForm.name || !editForm.address1 || !editForm.city || !editForm.state || !editForm.zip) {
                    toast({
                      title: "Missing required fields",
                      description: "Please fill in all required fields (name, address, city, state, ZIP).",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  const updateData = {
                    ...editForm,
                    squareFootage: editForm.squareFootage ? parseInt(editForm.squareFootage) : null,
                    bedrooms: editForm.bedrooms ? parseInt(editForm.bedrooms) : null,
                    bathrooms: editForm.bathrooms ? parseFloat(editForm.bathrooms) : null,
                    billingRate: editForm.billingRate ? parseFloat(editForm.billingRate) : null,
                  };
                  
                  updatePropertyMutation.mutate(updateData);
                }}
                disabled={updatePropertyMutation.isPending}
              >
                {updatePropertyMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Property
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contact Modal */}
        <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              <DialogDescription>
                {editingContact 
                  ? 'Update the client details and information.'
                  : 'Add a new property owner, tenant, or household member.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-firstName">First Name *</Label>
                  <Input
                    id="contact-firstName"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <Label htmlFor="contact-lastName">Last Name *</Label>
                  <Input
                    id="contact-lastName"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contact-type">Client Type</Label>
                <Select 
                  value={contactForm.type}
                  onValueChange={(value) => setContactForm({ ...contactForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Property Owner</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="vendor">Vendor/Contractor</SelectItem>
                    <SelectItem value="emergency_contact">Emergency Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <Label htmlFor="contact-notes">Notes</Label>
                <Textarea
                  id="contact-notes"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  placeholder="Additional notes or details about this client"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsContactModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!contactForm.firstName || !contactForm.lastName) {
                    toast({
                      title: "Missing information",
                      description: "Please provide at least the first and last name.",
                      variant: "destructive",
                    });
                    return;
                  }
                  createContactMutation.mutate(contactForm);
                }}
                disabled={createContactMutation.isPending}
              >
                {createContactMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Primary Contact Modal */}
        <Dialog open={isChangePrimaryModalOpen} onOpenChange={setIsChangePrimaryModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change Primary Contact</DialogTitle>
              <DialogDescription>
                Select which contact should be designated as the primary contact for this property.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-2 py-4">
              {Array.isArray(propertyContacts) && propertyContacts.length > 0 ? (
                propertyContacts.map((contact: any) => (
                  <div
                    key={contact.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      contact.type === 'owner'
                        ? "border-green-200 bg-green-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setPrimaryContactMutation.mutate(contact.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{contact.firstName} {contact.lastName}</h4>
                        <p className="text-sm text-slate-600 capitalize">{contact.type}</p>
                      </div>
                      {contact.type === 'owner' && (
                        <Badge variant="default">Current Primary</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-600 py-4">No contacts available</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChangePrimaryModalOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Move Contacts to Property Modal */}
        <Dialog open={isMoveContactsModalOpen} onOpenChange={setIsMoveContactsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Move Clients to Property</DialogTitle>
              <DialogDescription>
                Move {selectedContactIds.length} selected client{selectedContactIds.length > 1 ? 's' : ''} to another property.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Select Destination Property</Label>
                <div className="mt-2">
                  <Input
                    placeholder="Search properties..."
                    value={propertySearchQuery}
                    onChange={(e) => setPropertySearchQuery(e.target.value)}
                    className="mb-2"
                  />
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    {Array.isArray(allProperties) && allProperties.length > 0 ? (
                      allProperties
                        .filter((prop: any) => {
                          // Exclude current property and filter by search
                          if (prop.id === parseInt(propertyId)) return false;
                          if (!propertySearchQuery) return true;
                          return prop.name?.toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
                                 prop.address1?.toLowerCase().includes(propertySearchQuery.toLowerCase());
                        })
                        .map((prop: any) => (
                          <div
                            key={prop.id}
                            className={`p-3 border-b cursor-pointer transition-colors ${
                              moveToPropertyId === prop.id
                                ? "bg-blue-50 border-blue-200"
                                : "hover:bg-slate-50"
                            }`}
                            onClick={() => setMoveToPropertyId(prop.id)}
                          >
                            <h4 className="font-medium">{prop.name}</h4>
                            <p className="text-sm text-slate-600">{prop.address1}</p>
                          </div>
                        ))
                    ) : (
                      <p className="text-center text-slate-600 py-4">No other properties available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsMoveContactsModalOpen(false);
                setMoveToPropertyId(null);
                setPropertySearchQuery("");
              }}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!moveToPropertyId) {
                    toast({
                      title: "No property selected",
                      description: "Please select a destination property.",
                      variant: "destructive",
                    });
                    return;
                  }
                  bulkMoveContactsMutation.mutate({
                    contactIds: selectedContactIds,
                    newPropertyId: moveToPropertyId
                  });
                }}
                disabled={bulkMoveContactsMutation.isPending || !moveToPropertyId}
              >
                {bulkMoveContactsMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Moving...
                  </>
                ) : (
                  `Move ${selectedContactIds.length} Client${selectedContactIds.length > 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Navigation Modal */}
        <Dialog open={isNavigationModalOpen} onOpenChange={setIsNavigationModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Navigation className="w-5 h-5 mr-2" />
                Get Directions
              </DialogTitle>
              <DialogDescription>
                Choose your preferred navigation app to get directions to {formatFullAddress(property)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  const address = formatFullAddress(property);
                  if (address) {
                    const encodedAddress = encodeURIComponent(address);
                    window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
                  }
                  setIsNavigationModalOpen(false);
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">G</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Google Maps</div>
                    <div className="text-sm text-gray-500">Open in Google Maps</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  const address = formatFullAddress(property);
                  if (address) {
                    const encodedAddress = encodeURIComponent(address);
                    window.open(`https://waze.com/ul?q=${encodedAddress}`, '_blank');
                  }
                  setIsNavigationModalOpen(false);
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <span className="text-cyan-600 font-semibold text-sm">W</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Waze</div>
                    <div className="text-sm text-gray-500">Open in Waze app</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  const address = formatFullAddress(property);
                  if (address) {
                    const encodedAddress = encodeURIComponent(address);
                    window.open(`maps://maps.apple.com/?q=${encodedAddress}`, '_blank');
                  }
                  setIsNavigationModalOpen(false);
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-sm">🍎</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Apple Maps</div>
                    <div className="text-sm text-gray-500">Open in Apple Maps</div>
                  </div>
                </div>
              </Button>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsNavigationModalOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Community Dialog */}
        <Dialog open={isChangeCommunityDialogOpen} onOpenChange={setIsChangeCommunityDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change Community</DialogTitle>
              <DialogDescription>
                Search for a community to associate with this property
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="community-search">Search Communities</Label>
                <Input
                  id="community-search"
                  placeholder="Type to search communities..."
                  value={communitySearchQuery}
                  onChange={(e) => setCommunitySearchQuery(e.target.value)}
                  data-testid="input-community-search"
                  autoFocus
                />
              </div>

              <div className="border rounded-lg max-h-80 overflow-y-auto">
                {(() => {
                  const filteredCommunities = (communities as any[]).filter((c) => {
                    const searchLower = communitySearchQuery.toLowerCase();
                    const nameMatch = c.name?.toLowerCase().includes(searchLower);
                    const addressMatch = [c.address1, c.city, c.state, c.zip]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase()
                      .includes(searchLower);
                    return nameMatch || addressMatch;
                  });

                  if (filteredCommunities.length === 0) {
                    return (
                      <div className="p-8 text-center">
                        <Building className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                        <p className="text-slate-500 mb-4">
                          {communitySearchQuery ? "No communities found" : "No communities available"}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsChangeCommunityDialogOpen(false);
                            setCommunitySearchQuery("");
                            window.location.href = "/admin?tab=communities";
                          }}
                          data-testid="button-add-new-community"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Community
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y">
                      {filteredCommunities.map((community: any) => (
                        <button
                          key={community.id}
                          onClick={() => {
                            updatePropertyCommunityMutation.mutate(community.id);
                          }}
                          disabled={updatePropertyCommunityMutation.isPending}
                          className="w-full p-3 text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
                          data-testid={`button-select-community-${community.id}`}
                        >
                          <div className="font-medium text-slate-900">{community.name}</div>
                          <div className="text-sm text-slate-600">
                            {[community.address1, community.city, community.state, community.zip]
                              .filter(Boolean)
                              .join(", ") || "No address"}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {(property as any)?.communityId && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    updatePropertyCommunityMutation.mutate(null);
                  }}
                  disabled={updatePropertyCommunityMutation.isPending}
                  data-testid="button-remove-community"
                >
                  Remove Community Association
                </Button>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsChangeCommunityDialogOpen(false);
                  setCommunitySearchQuery("");
                }}
                data-testid="button-cancel-community-change"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Property Reports Modal */}
        <PropertyReportsModal 
          isOpen={isReportsModalOpen}
          onClose={() => setIsReportsModalOpen(false)}
          propertyId={propertyId}
          propertyName={(property as any)?.name || (property as any)?.address1 || 'Property'}
        />
      </div>
    </div>
  );
}