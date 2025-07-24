import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function PropertyProfile() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [propertyImage, setPropertyImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  
  // Get property ID from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');
  
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

  const propertyContacts = contacts?.filter((contact: any) => 
    contact.propertyId === parseInt(propertyId || "0")
  );

  const propertyTasks = tasks?.filter((task: any) => 
    task.propertyId === parseInt(propertyId || "0")
  );

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPropertyImage(previewUrl);
      
      // TODO: Upload to server and update property record
      setIsImageUploading(true);
      
      // Simulate upload
      setTimeout(() => {
        setIsImageUploading(false);
        toast({
          title: "Image uploaded",
          description: "Property image has been updated successfully",
        });
      }, 1500);
    }
  };

  const removePropertyImage = () => {
    if (propertyImage) {
      URL.revokeObjectURL(propertyImage);
    }
    setPropertyImage(null);
    setImageFile(null);
    
    toast({
      title: "Image removed",
      description: "Property image has been removed",
    });
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

  if (!propertyId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Property Not Found</h2>
          <p className="text-slate-600 mb-4">The property you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/properties")}>
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  if (propertyLoading) {
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
            onClick={() => setLocation("/properties")}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </div>
        
        {/* Property Image and Name */}
        <div className="flex items-start space-x-6 mb-6">
          {/* Property Image Upload Area */}
          <div className="flex-shrink-0">
            <div className="relative">
              {propertyImage || property?.imageUrl ? (
                <div className="relative group">
                  <img
                    src={propertyImage || property?.imageUrl}
                    alt="Property image"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-slate-200"
                  />
                  {isImageUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={removePropertyImage}
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
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Property Name and Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <h1 className="text-3xl font-bold text-slate-900 mb-2 break-words">
                  {property?.name}
                </h1>
                <p className="text-slate-600 flex items-center mb-3">
                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="break-words">{property?.address}</span>
                </p>
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{getTypeDisplay(property?.type)}</Badge>
                  <Badge variant={getStatusColor(property?.status)}>
                    {property?.status?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              <div className="flex space-x-2 flex-shrink-0">
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Property
                </Button>
                <Button className="bg-primary hover:bg-primary/90">
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
        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Type:</span>
              <span className="font-medium">{getTypeDisplay(property?.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <Badge variant={getStatusColor(property?.status)}>
                {property?.status?.replace('_', ' ')}
              </Badge>
            </div>
            {property?.squareFootage && (
              <div className="flex justify-between">
                <span className="text-slate-500">Square Footage:</span>
                <span className="font-medium flex items-center">
                  <Square className="w-4 h-4 mr-1" />
                  {property.squareFootage.toLocaleString()} sq ft
                </span>
              </div>
            )}
            {property?.billingType && (
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Type:</span>
                <Badge variant="secondary">
                  {property.billingType === 'sqft' ? 'Per Sq Ft' : 'Flat Fee'}
                </Badge>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Added:</span>
              <span className="font-medium">{formatDate(property?.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Owner/Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Primary Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            {propertyContacts?.length > 0 ? (
              <div className="space-y-3">
                {propertyContacts.slice(0, 2).map((contact: any) => (
                  <div key={contact.id} className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {contact.firstName?.[0]}{contact.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                      <p className="text-sm text-slate-500">{contact.type}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600">{contact.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600">{contact.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">No contacts assigned</p>
                <Button size="sm" className="mt-2">
                  Add Contact
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Billing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Billing</span>
              <Switch defaultChecked />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monthly Rate:</span>
              <span className="font-medium">$125.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Payment:</span>
              <span className="font-medium">Dec 15, 2024</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Next Due:</span>
              <span className="font-medium">Jan 15, 2025</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">Tasks & History</TabsTrigger>
          <TabsTrigger value="supplies">Supplies Log</TabsTrigger>
          <TabsTrigger value="community">Community Info</TabsTrigger>
          <TabsTrigger value="notes">Notes & Custom</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckSquare className="w-5 h-5 mr-2" />
                Work & Task History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {propertyTasks?.length > 0 ? (
                <div className="space-y-4">
                  {propertyTasks.map((task: any) => (
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
                  <History className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium mb-2">No Task History</h3>
                  <p className="mb-4">No tasks have been assigned to this property yet.</p>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="supplies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                Supplies Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">LED Bulbs (60W)</p>
                      <p className="text-sm text-slate-500">Last installed: Nov 15, 2024</p>
                    </div>
                  </div>
                  <Badge variant="outline">2 units</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Filter className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">HVAC Filter</p>
                      <p className="text-sm text-slate-500">Last installed: Oct 1, 2024</p>
                    </div>
                  </div>
                  <Badge variant="outline">1 unit</Badge>
                </div>
                
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Supply Record
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="community">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Community Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Building className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-medium mb-2">No Community Assigned</h3>
                <p className="mb-4">This property is not part of any community or HOA.</p>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign to Community
                </Button>
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
                    Property Notes
                  </label>
                  <Textarea
                    placeholder="Add any notes about this property..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Special Instructions
                  </label>
                  <Textarea
                    placeholder="Any special instructions for this property..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                
                <Button className="bg-primary hover:bg-primary/90">
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}