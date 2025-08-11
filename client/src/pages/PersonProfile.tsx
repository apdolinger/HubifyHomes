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
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  MoreVertical
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

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
  const [selectedProperties, setSelectedProperties] = useState<any[]>([]);
  
  // Multiple properties navigation state
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0);
  
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
    queryKey: ["/api/contacts", personId],
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
  
  // Debug logging
  console.log('Contact Properties Data:', contactProperties);
  console.log('Linked Properties:', linkedProperties);

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
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Avatar className="h-20 w-20">
                <AvatarImage src={(person as any)?.profileImageUrl} alt={`${(person as any)?.firstName} ${(person as any)?.lastName}`} />
                <AvatarFallback className="text-lg">
                  {getInitials((person as any)?.firstName, (person as any)?.lastName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {(person as any)?.firstName} {(person as any)?.lastName}
              </h1>
              <div className="flex items-center space-x-3 mt-2">
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
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Person
            </Button>
            <Button onClick={openTaskModal} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
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
                  <Plus className="w-4 h-4 mr-1" />
                  Add Property
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
                        {linkedProperties[currentPropertyIndex].isPrimary && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{linkedProperties[currentPropertyIndex].property?.name}</p>
                          {linkedProperties[currentPropertyIndex].isPrimary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 flex items-center">
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
                          onClick={() => setCurrentPropertyIndex(Math.max(0, currentPropertyIndex - 1))}
                          disabled={currentPropertyIndex === 0}
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
                          onClick={() => setCurrentPropertyIndex(Math.min(linkedProperties.length - 1, currentPropertyIndex + 1))}
                          disabled={currentPropertyIndex === linkedProperties.length - 1}
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
                  <Link className="w-4 h-4 mr-1" />
                  Link Property
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
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Link Properties to Contact</DialogTitle>
            <DialogDescription>
              Search and select one or more properties to link to {(person as any)?.firstName} {(person as any)?.lastName}. Click properties to select/deselect them.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="property-search">Search Properties</Label>
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

            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
              {filteredProperties.length > 0 ? (
                filteredProperties.map((property: any) => {
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
                  <p>No properties found</p>
                  {propertySearchTerm && (
                    <p className="text-sm">Try adjusting your search terms</p>
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
                  Linking...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Link Properties ({selectedProperties.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}