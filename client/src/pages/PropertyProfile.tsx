import { useEffect, useState } from "react";
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
  Car
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function PropertyProfile() {
  const { isAuthenticated, isLoading } = useAuth();
  const { openTaskModal } = useTaskModal();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [propertyImage, setPropertyImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
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
    description: ""
  });
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
    type: "lightbulb",
    brand: "",
    model: "",
    quantity: 1,
    unit: "piece",
    location: "",
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
    locationInRoom: "",
    installDate: "",
    lastServiced: "",
    nextServiceDue: "",
    notes: ""
  });
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isSurfaceModalOpen, setIsSurfaceModalOpen] = useState(false);
  const [isFixtureModalOpen, setIsFixtureModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<any>(null);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
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

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
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
    queryKey: [`/api/room-supplies`, selectedRoom?.id],
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

  // Get property vehicles
  const { data: vehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery({
    queryKey: [`/api/properties/${propertyId}/vehicles`],
    enabled: isAuthenticated && !!propertyId,
  });

  // Get property contacts
  const { data: propertyContacts = [], isLoading: contactsLoading, refetch: refetchContacts } = useQuery({
    queryKey: [`/api/properties/${propertyId}/contacts`],
    enabled: isAuthenticated && !!propertyId,
  });

  // Room mutations
  const createRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      return await apiRequest("POST", "/api/rooms", {
        ...roomData,
        propertyId: parseInt(propertyId || "0")
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
        propertyId: parseInt(propertyId || "0")
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

  // Contact mutations
  const createContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      return await apiRequest("POST", "/api/contacts", {
        ...contactData,
        propertyId: parseInt(propertyId || "0")
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

  // Room supply mutations
  const createSupplyMutation = useMutation({
    mutationFn: async (supplyData: any) => {
      return await apiRequest("POST", "/api/room-supplies", {
        ...supplyData,
        roomId: selectedRoom?.id
      });
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
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/room-supplies/${id}`, data);
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
      return await apiRequest("POST", "/api/room-devices", {
        ...deviceData,
        roomId: selectedRoom?.id,
        createdById: "current-user"
      });
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
        locationInRoom: "",
        installDate: "",
        lastServiced: "",
        nextServiceDue: "",
        notes: ""
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
      return await apiRequest("PATCH", `/api/room-devices/${id}`, data);
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
      locationInRoom: device.locationInRoom || "",
      installDate: device.installDate ? device.installDate.split('T')[0] : "",
      lastServiced: device.lastServiced ? device.lastServiced.split('T')[0] : "",
      nextServiceDue: device.nextServiceDue ? device.nextServiceDue.split('T')[0] : "",
      notes: device.notes || ""
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
      locationInRoom: "",
      installDate: "",
      lastServiced: "",
      nextServiceDue: "",
      notes: ""
    });
  };

  const handleDeleteDevice = (deviceId: number) => {
    deleteDeviceMutation.mutate(deviceId);
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

            {/* Location and Status Controls */}
            <div className="flex-shrink-0 flex flex-col space-y-3">
              {/* Location Display - Show actual address */}
              <div className="flex items-start space-x-2 text-slate-600 max-w-xs">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-slate-900 leading-tight">
                    {formatFullAddress(property) || 'No address provided'}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">Property Location</div>
                </div>
              </div>
              
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
                  <div className="space-y-6 py-4">
                    <div>
                      <Label htmlFor="edit-name">Property Name</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Enter property name"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline">
                      Cancel
                    </Button>
                    <Button>
                      Save Changes
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
                    {(property as any)?.name}
                  </h1>
                  <p className="text-slate-600 flex items-center mb-3">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="break-words">{formatFullAddress(property)}</span>
                  </p>
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
                    onClick={() => openTaskModal()}
                    className="flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                <span className="font-medium">{propertyContacts.length}</span>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Property Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Tasks for this property will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contact List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Property Contacts</CardTitle>
                    <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Contact
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {contactsLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-slate-400 mb-2" />
                        <p className="text-slate-600">Loading contacts...</p>
                      </div>
                    ) : propertyContacts && propertyContacts.length > 0 ? (
                      <div className="space-y-2">
                        {/* Primary Contact */}
                        {propertyContacts.find((contact: any) => contact.type === 'owner') && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Primary Contact</h4>
                            {propertyContacts
                              .filter((contact: any) => contact.type === 'owner')
                              .map((contact: any) => (
                              <div
                                key={contact.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                  selectedContact?.id === contact.id
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-green-200 bg-green-50 hover:border-green-300"
                                }`}
                                onClick={() => setSelectedContact(contact)}
                              >
                                <div className="flex items-center justify-between">
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
                            ))}
                          </div>
                        )}

                        {/* Household Members/Tenants */}
                        {propertyContacts.filter((contact: any) => contact.type !== 'owner').length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Household Members & Tenants</h4>
                            {propertyContacts
                              .filter((contact: any) => contact.type !== 'owner')
                              .map((contact: any) => (
                              <div
                                key={contact.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors mb-2 ${
                                  selectedContact?.id === contact.id
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                                onClick={() => setSelectedContact(contact)}
                              >
                                <div className="flex items-center justify-between">
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
                    <TabsList className="grid w-full grid-cols-7">
                      <TabsTrigger value="supplies">Supplies</TabsTrigger>
                      <TabsTrigger value="devices">Devices</TabsTrigger>
                      <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
                      <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
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
                              <Card key={device.id} className="p-4">
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
                                      {device.notes && (
                                        <p className="mt-2 text-sm text-slate-700 italic">{device.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEditDevice(device)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Device
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => handleDeleteDevice(device.id)}
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

                    <TabsContent value="photos" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Room Photos</h4>
                        <Button onClick={() => setIsPhotoModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Photo
                        </Button>
                      </div>

                      {photosLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      ) : Array.isArray(photos) && photos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {photos.map((photo: any) => (
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
                    ) : vehicles && vehicles.length > 0 ? (
                      <div className="space-y-2">
                        {vehicles.map((vehicle: any) => (
                          <div
                            key={vehicle.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedVehicle?.id === vehicle.id
                                ? "border-blue-200 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                            onClick={() => setSelectedVehicle(vehicle)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</h4>
                                <p className="text-sm text-slate-600">{vehicle.licensePlate || 'No plate'}</p>
                                {vehicle.color && (
                                  <p className="text-xs text-slate-500">{vehicle.color}</p>
                                )}
                              </div>
                              <Car className="w-5 h-5 text-slate-400" />
                            </div>
                          </div>
                        ))}
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

              {/* Vehicle Details Placeholder */}
              <Card className="lg:col-span-2">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Car className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Select a vehicle</h3>
                    <p className="text-slate-600">Click on a vehicle from the left to view its maintenance records and details.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                    <SelectItem value="lightbulb">Lightbulb</SelectItem>
                    <SelectItem value="filter">Filter</SelectItem>
                    <SelectItem value="paint">Paint</SelectItem>
                    <SelectItem value="battery">Battery</SelectItem>
                    <SelectItem value="cleaning">Cleaning Supply</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="gallon">Gallon</SelectItem>
                    <SelectItem value="quart">Quart</SelectItem>
                    <SelectItem value="liter">Liter</SelectItem>
                    <SelectItem value="bottle">Bottle</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                    <SelectItem value="roll">Roll</SelectItem>
                    <SelectItem value="tube">Tube</SelectItem>
                    <SelectItem value="bag">Bag</SelectItem>
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

              <div>
                <Label htmlFor="device-next-service">Next Service Due</Label>
                <Input
                  id="device-next-service"
                  type="date"
                  value={roomDeviceForm.nextServiceDue}
                  onChange={(e) => setRoomDeviceForm({ ...roomDeviceForm, nextServiceDue: e.target.value })}
                />
              </div>

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
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                  placeholder="e.g. Toyota, Honda, Ford"
                />
              </div>

              <div>
                <Label htmlFor="vehicle-model">Model *</Label>
                <Input
                  id="vehicle-model"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  placeholder="e.g. Camry, Civic, F-150"
                />
              </div>

              <div>
                <Label htmlFor="vehicle-year">Year</Label>
                <Input
                  id="vehicle-year"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                  placeholder="e.g. 2020"
                />
              </div>

              <div>
                <Label htmlFor="vehicle-color">Color</Label>
                <Input
                  id="vehicle-color"
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                  placeholder="e.g. White, Blue, Red"
                />
              </div>

              <div>
                <Label htmlFor="vehicle-license">License Plate</Label>
                <Input
                  id="vehicle-license"
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
                  <SelectTrigger>
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
                  value={vehicleForm.vin}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                  placeholder="17-character Vehicle Identification Number"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="vehicle-description">Description</Label>
                <Textarea
                  id="vehicle-description"
                  value={vehicleForm.description}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, description: e.target.value })}
                  placeholder="Additional notes or description about this vehicle"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVehicleModalOpen(false)}>
                Cancel
              </Button>
              <Button 
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

        {/* Contact Modal */}
        <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
              <DialogDescription>
                {editingContact 
                  ? 'Update the contact details and information.'
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
                <Label htmlFor="contact-type">Contact Type</Label>
                <Select 
                  value={contactForm.type}
                  onValueChange={(value) => setContactForm({ ...contactForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact type" />
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
                  placeholder="Additional notes or details about this contact"
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
                    Add Contact
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}