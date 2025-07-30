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
  User
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
    queryKey: ["/api/properties", propertyId],
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

  // Room mutations
  const createRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      return await apiRequest("/api/rooms", "POST", {
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
      return await apiRequest(`/api/rooms/${id}`, "PATCH", data);
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
      return await apiRequest(`/api/rooms/${roomId}`, "DELETE");
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

  const propertyContacts = Array.isArray(contacts) ? contacts?.filter((contact: any) => 
    contact.propertyId === parseInt(propertyId || "0")
  ) : [];

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

  const handleCancelRoomEdit = () => {
    setIsRoomModalOpen(false);
    setEditingRoom(null);
    setRoomForm({ name: "", type: "bedroom", description: "" });
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
              {/* Location Display */}
              <div className="flex items-center space-x-2 text-slate-600">
                <MapPin className="w-5 h-5" />
                <div className="text-sm">
                  <div className="font-medium">{formatFullAddress(property)}</div>
                  <div className="text-slate-500">Property Location</div>
                </div>
              </div>
              
              {/* Active Status Button */}
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant={(property as any)?.isActive ? "default" : "outline"}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <div className={`w-2 h-2 rounded-full ${(property as any)?.isActive ? 'bg-white' : 'bg-green-500'}`} />
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
                <span className="font-medium">{rooms.length}</span>
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
            <TabsTrigger value="supplies">Supplies</TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle>Property Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Contacts for this property will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Property Rooms</CardTitle>
                  <Dialog open={isRoomModalOpen} onOpenChange={setIsRoomModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
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
                {rooms.length === 0 ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room: any) => (
                      <div key={room.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-slate-900">{room.name}</h4>
                            <p className="text-sm text-slate-600 capitalize">{room.type.replace('_', ' ')}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
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
          </TabsContent>

          <TabsContent value="supplies">
            <Card>
              <CardHeader>
                <CardTitle>Supplies Log</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Supply usage and inventory for this property will be displayed here.</p>
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
      </div>
    </div>
  );
}