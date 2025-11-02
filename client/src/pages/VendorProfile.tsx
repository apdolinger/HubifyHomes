import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link as RouterLink } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User,
  Mail,
  Phone,
  Building,
  Edit,
  ArrowLeft,
  FileText,
  CheckSquare,
  Wrench
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const editVendorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
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

export default function VendorProfile() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ["/api/contacts", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/contacts/${id}`);
      return response.json();
    },
    enabled: !!id && isAuthenticated,
  });

  const { data: properties } = useQuery({
    queryKey: ["/api/contact-properties", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/contact-properties?contactId=${id}`);
      return response.json();
    },
    enabled: !!id && isAuthenticated,
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/tasks");
      return response.json();
    },
    enabled: !!id && isAuthenticated,
  });

  const editForm = useForm({
    resolver: zodResolver(editVendorSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      vendorCategory: "organization" as const,
      vendorType: "",
      vendorTypeOther: "",
      notes: "",
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editVendorSchema>) => {
      const response = await apiRequest("PATCH", `/api/contacts/${id}`, { ...data, type: "vendor" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Vendor Updated",
        description: "Vendor information has been updated successfully.",
      });
      setIsEditModalOpen(false);
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

  const handleEditClick = () => {
    if (vendor) {
      editForm.reset({
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email || "",
        phone: vendor.phone || "",
        vendorCategory: vendor.vendorCategory || "organization",
        vendorType: vendor.vendorType || "",
        vendorTypeOther: vendor.vendorTypeOther || "",
        notes: vendor.notes || "",
      });
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateVendor = (data: z.infer<typeof editVendorSchema>) => {
    updateVendorMutation.mutate(data);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || vendorLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vendor || vendor.type !== "vendor") {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Vendor Not Found</h3>
            <p className="text-slate-600 mb-4">The vendor you're looking for doesn't exist.</p>
            <RouterLink href="/admin/vendors">
              <Button>Back to Vendors</Button>
            </RouterLink>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vendorTasks = tasks?.filter((task: any) => 
    task.assignedToIds?.includes(parseInt(id || "0"))
  ) || [];

  const vendorTypeDisplay = vendor.vendorType === "Other" && vendor.vendorTypeOther
    ? vendor.vendorTypeOther
    : vendor.vendorType;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <RouterLink href="/admin/vendors">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vendors
          </Button>
        </RouterLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                      {vendor.firstName?.[0]}{vendor.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl mb-2">
                      {vendor.firstName} {vendor.lastName}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {vendor.vendorCategory === 'organization' ? 'Organization' : 'Individual'}
                      </Badge>
                      {vendorTypeDisplay && (
                        <Badge variant="outline">{vendorTypeDisplay}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={handleEditClick} size="sm" variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {vendor.email && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Email</p>
                        <a href={`mailto:${vendor.email}`} className="text-sm font-medium text-blue-600 hover:underline">
                          {vendor.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Phone</p>
                        <a href={`tel:${vendor.phone}`} className="text-sm font-medium text-green-600 hover:underline">
                          {vendor.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {vendor.notes && (
                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 mb-1">Notes</p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{vendor.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <Tabs defaultValue="properties" className="w-full">
              <CardHeader className="pb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="properties" className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Properties ({properties?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Tasks ({vendorTasks.length})
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="properties" className="mt-0">
                  {properties && properties.length > 0 ? (
                    <div className="space-y-2">
                      {properties.map((prop: any) => (
                        <RouterLink key={prop.property.id} href={`/admin/properties/${prop.property.id}`}>
                          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-3">
                              <Building className="w-5 h-5 text-slate-400" />
                              <div>
                                <p className="font-medium">{prop.property.name}</p>
                                {prop.property.address && (
                                  <p className="text-sm text-slate-600">{prop.property.address}</p>
                                )}
                              </div>
                            </div>
                            {prop.relationship && (
                              <Badge variant="outline">{prop.relationship}</Badge>
                            )}
                          </div>
                        </RouterLink>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 text-sm">No properties linked yet</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="tasks" className="mt-0">
                  {vendorTasks.length > 0 ? (
                    <div className="space-y-2">
                      {vendorTasks.map((task: any) => (
                        <RouterLink key={task.id} href={`/admin/tasks`}>
                          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-3">
                              <CheckSquare className="w-5 h-5 text-slate-400" />
                              <div>
                                <p className="font-medium">{task.title}</p>
                                {task.dueDate && (
                                  <p className="text-sm text-slate-600">
                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                              {task.status}
                            </Badge>
                          </div>
                        </RouterLink>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 text-sm">No tasks assigned yet</p>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Category</p>
                <p className="font-medium">
                  {vendor.vendorCategory === 'organization' ? 'Organization' : 'Individual'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Type</p>
                <p className="font-medium">{vendorTypeDisplay || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Contact</p>
                <div className="space-y-1">
                  {vendor.email && (
                    <p className="text-sm">{vendor.email}</p>
                  )}
                  {vendor.phone && (
                    <p className="text-sm">{vendor.phone}</p>
                  )}
                  {!vendor.email && !vendor.phone && (
                    <p className="text-sm text-slate-400">No contact info</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
              <FormField
                control={editForm.control}
                name="vendorCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                        <SelectTrigger>
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
                        <Input {...field} placeholder="e.g., Landscaping, Plumbing" />
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
                <Button type="submit">
                  Update Vendor
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
