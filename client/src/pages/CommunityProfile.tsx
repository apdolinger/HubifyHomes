import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Building, 
  MapPin, 
  ArrowLeft,
  FileText,
  Home,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCommunitySchema, type InsertCommunity } from "@shared/schema";

export default function CommunityProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: community, isLoading } = useQuery({
    queryKey: [`/api/communities/${id}`],
    enabled: !!id,
  });

  const { data: properties = [] } = useQuery({
    queryKey: [`/api/communities/${id}/properties`],
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: [`/api/communities/${id}/documents`],
    enabled: !!id,
  });

  const form = useForm<InsertCommunity>({
    resolver: zodResolver(insertCommunitySchema),
    defaultValues: {
      name: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      imageUrl: "",
      managerId: null,
      hoaPresidentId: null,
      isActive: true,
      notes: "",
      gateCode: "",
      propertyManagerName: "",
      emergencyContact: "",
      hoaMailingAddress: "",
      rentalRestrictions: "",
      petPolicy: "",
      parkingRules: "",
      noiseRestrictions: "",
      vendorAccessProcedures: "",
      trashRecyclingPickup: "",
      bulkTrash: "",
      landscapeMaintenance: "",
      communityEvents: "",
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InsertCommunity) => {
      return apiRequest("PATCH", `/api/communities/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/communities/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      toast({
        title: "Success",
        description: "Community updated successfully",
      });
      setIsEditModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update community",
        variant: "destructive",
      });
    },
  });

  // Populate form when editing
  const handleEdit = () => {
    if (community) {
      form.reset({
        name: community.name || "",
        address1: community.address1 || "",
        address2: community.address2 || "",
        city: community.city || "",
        state: community.state || "",
        zip: community.zip || "",
        imageUrl: community.imageUrl || "",
        managerId: community.managerId || null,
        hoaPresidentId: community.hoaPresidentId || null,
        isActive: community.isActive ?? true,
        notes: community.notes || "",
        gateCode: community.gateCode || "",
        propertyManagerName: community.propertyManagerName || "",
        emergencyContact: community.emergencyContact || "",
        hoaMailingAddress: community.hoaMailingAddress || "",
        rentalRestrictions: community.rentalRestrictions || "",
        petPolicy: community.petPolicy || "",
        parkingRules: community.parkingRules || "",
        noiseRestrictions: community.noiseRestrictions || "",
        vendorAccessProcedures: community.vendorAccessProcedures || "",
        trashRecyclingPickup: community.trashRecyclingPickup || "",
        bulkTrash: community.bulkTrash || "",
        landscapeMaintenance: community.landscapeMaintenance || "",
        communityEvents: community.communityEvents || "",
      });
      setIsEditModalOpen(true);
    }
  };

  const onSubmit = (data: InsertCommunity) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Community Not Found</h3>
              <p className="text-slate-500 mb-4">The community you're looking for doesn't exist.</p>
              <Link href="/admin">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="button-back-to-admin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-community-name">{community.name}</h1>
              <p className="text-slate-600">Community Profile</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEdit} data-testid="button-edit-community">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" data-testid="button-delete-community">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <div className="mt-2">
                    <Badge variant={community.isActive ? 'default' : 'secondary'} data-testid="badge-status">
                      {community.isActive ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                      ) : (
                        <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Properties</p>
                  <p className="text-2xl font-bold mt-1" data-testid="text-property-count">
                    {community.propertyCount || properties.length || 0}
                  </p>
                </div>
                <Home className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Documents</p>
                  <p className="text-2xl font-bold mt-1" data-testid="text-document-count">
                    {documents.length}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Type</p>
                  <p className="text-sm font-medium mt-1">
                    {community.communityType || 'HOA'}
                  </p>
                </div>
                <Building className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            <TabsTrigger value="properties" data-testid="tab-properties">Properties</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Community Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Address */}
                {(community.address1 || community.city) && (
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Address</Label>
                    <div className="flex items-start mt-2">
                      <MapPin className="w-4 h-4 text-slate-400 mr-2 mt-1" />
                      <div data-testid="text-address">
                        {community.address1 && <p>{community.address1}</p>}
                        {community.address2 && <p>{community.address2}</p>}
                        <p>
                          {[community.city, community.state, community.zip]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {community.notes && (
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Notes</Label>
                    <p className="mt-2 text-sm" data-testid="text-notes">{community.notes}</p>
                  </div>
                )}

                {/* Management Company */}
                {community.managementCompany && (
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Management Company</Label>
                    <p className="mt-2 text-sm" data-testid="text-management-company">
                      {community.managementCompany}
                    </p>
                  </div>
                )}

                {/* HOA Contact */}
                {community.hoaContactName && (
                  <div>
                    <Label className="text-sm font-medium text-slate-600">HOA Contact</Label>
                    <p className="mt-2 text-sm" data-testid="text-hoa-contact">
                      {community.hoaContactName}
                      {community.hoaContactPhone && ` - ${community.hoaContactPhone}`}
                      {community.hoaContactEmail && ` - ${community.hoaContactEmail}`}
                    </p>
                  </div>
                )}

                {/* Website */}
                {community.websiteUrl && (
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Website</Label>
                    <p className="mt-2 text-sm">
                      <a 
                        href={community.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        data-testid="link-website"
                      >
                        {community.websiteUrl}
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Information Cards */}
            {community.amenities && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-amenities">
                    {community.amenities}
                  </p>
                </CardContent>
              </Card>
            )}

            {community.rules && (
              <Card>
                <CardHeader>
                  <CardTitle>Rules & Regulations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-rules">
                    {community.rules}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Community Properties</CardTitle>
                <CardDescription>
                  Properties belonging to this community
                </CardDescription>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-8">
                    <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No properties found in this community</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {properties.map((property: any) => (
                      <Link key={property.id} href={`/properties/${property.id}`}>
                        <div className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer" data-testid={`property-${property.id}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{property.name}</h4>
                              {property.address1 && (
                                <p className="text-sm text-slate-500 mt-1">
                                  {property.address1}, {property.city}
                                </p>
                              )}
                            </div>
                            <Badge variant={property.isActive ? 'default' : 'secondary'}>
                              {property.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Community Documents</CardTitle>
                <CardDescription>
                  HOA declarations, bylaws, and other documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No documents uploaded for this community</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="p-4 border rounded-lg" data-testid={`document-${doc.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-blue-500 mr-3" />
                            <div>
                              <h4 className="font-medium">{doc.name}</h4>
                              <p className="text-sm text-slate-500">{doc.documentType}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Community Contacts</CardTitle>
                <CardDescription>
                  Key contacts for this community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {community.hoaContactName && (
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">HOA Contact</h4>
                      <p className="text-sm text-slate-600 mt-1">{community.hoaContactName}</p>
                      {community.hoaContactPhone && (
                        <p className="text-sm text-slate-500 mt-1">{community.hoaContactPhone}</p>
                      )}
                      {community.hoaContactEmail && (
                        <p className="text-sm text-slate-500">{community.hoaContactEmail}</p>
                      )}
                    </div>
                  )}

                  {community.managementCompany && (
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Management Company</h4>
                      <p className="text-sm text-slate-600 mt-1">{community.managementCompany}</p>
                      {community.propertyManagerName && (
                        <p className="text-sm text-slate-500 mt-1">
                          Manager: {community.propertyManagerName}
                        </p>
                      )}
                      {community.propertyManagerPhone && (
                        <p className="text-sm text-slate-500">{community.propertyManagerPhone}</p>
                      )}
                    </div>
                  )}

                  {!community.hoaContactName && !community.managementCompany && (
                    <div className="text-center py-8">
                      <p className="text-slate-500">No contact information available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Community Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Community</DialogTitle>
            <DialogDescription>
              Update community information, rules, and schedules
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="rules">Rules</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Community Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-community-name" />
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
                            <Input {...field} value={field.value || ""} />
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
                            <Input {...field} value={field.value || ""} />
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
                            <Input {...field} value={field.value || ""} />
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
                            <Input {...field} value={field.value || ""} />
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
                            <Input {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <p className="text-sm text-slate-500">
                            Is this community currently active?
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="gateCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gate Code</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertyManagerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Manager Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hoaMailingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HOA Mailing Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Rules Tab */}
                <TabsContent value="rules" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rentalRestrictions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rental Restrictions</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="petPolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet Policy</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parkingRules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parking Rules</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="noiseRestrictions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Noise Restrictions</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vendorAccessProcedures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Access Procedures</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Schedule Tab */}
                <TabsContent value="schedule" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="trashRecyclingPickup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trash & Recycling Pickup</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., Monday/Thursday" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bulkTrash"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bulk Trash Pickup</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., First Monday of month" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="landscapeMaintenance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Landscape Maintenance</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., Tuesdays" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="communityEvents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Community Events</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={4} placeholder="List upcoming community events..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-community"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium ${className}`}>{children}</label>;
}
