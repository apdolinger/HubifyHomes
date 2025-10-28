import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import AdminForms from "./AdminForms";
import SupportModal from "@/components/SupportModal";
import Billing from "./Billing";
import { CustomFieldsSettings } from "./Account";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Settings, 
  Shield,
  Mail,
  FileText,
  Sliders,
  Bell,
  Download,
  Upload,
  HelpCircle,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Save,
  Copy,
  CheckCircle,
  Home,
  Database,
  Building,
  MapPin,
  User,
  Phone,
  Eye,
  DollarSign,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  X as XIcon
} from "lucide-react";

// Supply Settings Manager Component
function SupplySettingsManager({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [newType, setNewType] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: [`/api/organizations/${orgId}/supply-settings`],
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { supplyTypes?: string[]; supplyUnits?: string[] }) => {
      return apiRequest("PATCH", `/api/organizations/${orgId}/supply-settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/supply-settings`] });
      toast({
        title: "Settings updated",
        description: "Supply categories have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddType = () => {
    if (!newType.trim()) return;
    const currentTypes = settings?.supplyTypes || [];
    if (currentTypes.includes(newType.trim().toLowerCase())) {
      toast({
        title: "Duplicate type",
        description: "This supply type already exists.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      supplyTypes: [...currentTypes, newType.trim().toLowerCase()],
    });
    setNewType("");
  };

  const handleRemoveType = (type: string) => {
    const currentTypes = settings?.supplyTypes || [];
    updateMutation.mutate({
      supplyTypes: currentTypes.filter(t => t !== type),
    });
  };

  const handleAddUnit = () => {
    if (!newUnit.trim()) return;
    const currentUnits = settings?.supplyUnits || [];
    if (currentUnits.includes(newUnit.trim().toLowerCase())) {
      toast({
        title: "Duplicate unit",
        description: "This supply unit already exists.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      supplyUnits: [...currentUnits, newUnit.trim().toLowerCase()],
    });
    setNewUnit("");
  };

  const handleRemoveUnit = (unit: string) => {
    const currentUnits = settings?.supplyUnits || [];
    updateMutation.mutate({
      supplyUnits: currentUnits.filter(u => u !== unit),
    });
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Supply Types Section */}
      <div>
        <h4 className="font-medium mb-3">Supply Types</h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {(settings?.supplyTypes || []).map((type: string) => (
            <Badge
              key={type}
              variant="secondary"
              className="pl-3 pr-1 py-1 capitalize"
            >
              {type}
              <button
                onClick={() => handleRemoveType(type)}
                className="ml-2 hover:bg-slate-300 rounded p-0.5"
                data-testid={`button-remove-type-${type}`}
              >
                <XIcon className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add new supply type..."
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddType();
              }
            }}
            className="max-w-xs"
            data-testid="input-new-supply-type"
          />
          <Button
            onClick={handleAddType}
            disabled={!newType.trim() || updateMutation.isPending}
            data-testid="button-add-supply-type"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Type
          </Button>
        </div>
      </div>

      {/* Supply Units Section */}
      <div className="pt-4 border-t">
        <h4 className="font-medium mb-3">Supply Units</h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {(settings?.supplyUnits || []).map((unit: string) => (
            <Badge
              key={unit}
              variant="secondary"
              className="pl-3 pr-1 py-1 capitalize"
            >
              {unit}
              <button
                onClick={() => handleRemoveUnit(unit)}
                className="ml-2 hover:bg-slate-300 rounded p-0.5"
                data-testid={`button-remove-unit-${unit}`}
              >
                <XIcon className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add new supply unit..."
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUnit();
              }
            }}
            className="max-w-xs"
            data-testid="input-new-supply-unit"
          />
          <Button
            onClick={handleAddUnit}
            disabled={!newUnit.trim() || updateMutation.isPending}
            data-testid="button-add-supply-unit"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Check URL query parameters for initial tab
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'forms';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isNewCommunityDialogOpen, setIsNewCommunityDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeContacts, setIncludeContacts] = useState(true);
  const [includeRooms, setIncludeRooms] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const queryClient = useQueryClient();

  // Fetch properties for the property selector
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
    staleTime: 30000,
  });

  // Property report generation function
  const generatePropertyReport = async (property: any) => {
    if (!property) return;
    
    setIsGeneratingReport(true);
    
    try {
      // Fetch comprehensive property data
      const responses = await Promise.all([
        fetch(`/api/properties/${property.id}`).then(r => r.json()),
        includeNotes ? fetch(`/api/properties/${property.id}/notes`).then(r => r.json()) : Promise.resolve([]),
        includeTasks ? fetch(`/api/tasks?propertyId=${property.id}`).then(r => r.json()) : Promise.resolve([]),
        includeContacts ? fetch(`/api/properties/${property.id}/contacts`).then(r => r.json()) : Promise.resolve([]),
        includeRooms ? fetch(`/api/properties/${property.id}/rooms`).then(r => r.json()) : Promise.resolve([]),
      ]);

      const [propertyDetails, notes, tasks, contacts, rooms] = responses;

      // Generate CSV content
      const csvContent = generatePropertyReportCSV({
        property: propertyDetails,
        notes: includeNotes ? notes : [],
        tasks: includeTasks ? tasks : [],
        contacts: includeContacts ? contacts : [],
        rooms: includeRooms ? rooms : [],
      });

      // Download the report
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Property_Report_${property.name || 'Property'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Report Generated",
        description: `Comprehensive report for ${property.name || 'Property'} has been downloaded.`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate property report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Generate CSV content for property report
  const generatePropertyReportCSV = (data: any) => {
    const { property, notes, tasks, contacts, rooms } = data;
    
    let csvContent = `Property Comprehensive Report\n`;
    csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    // Property Details
    csvContent += `PROPERTY INFORMATION\n`;
    csvContent += `Name,${property.name || 'N/A'}\n`;
    csvContent += `Address,"${property.address || 'N/A'}"\n`;
    csvContent += `Type,${property.type || 'N/A'}\n`;
    csvContent += `Status,${property.status || 'N/A'}\n`;
    csvContent += `Square Footage,${property.squareFootage || 'N/A'}\n`;
    csvContent += `Bedrooms,${property.bedrooms || 'N/A'}\n`;
    csvContent += `Bathrooms,${property.bathrooms || 'N/A'}\n`;
    csvContent += `Year Built,${property.yearBuilt || 'N/A'}\n`;
    csvContent += `Lot Size,${property.lotSize || 'N/A'}\n`;
    csvContent += `HOA Fee,${property.hoaFee || 'N/A'}\n`;
    csvContent += `Property Tax,${property.propertyTax || 'N/A'}\n`;
    csvContent += `Manager,${property.manager || 'N/A'}\n\n`;

    // Contacts
    if (includeContacts && contacts.length > 0) {
      csvContent += `CONTACTS\n`;
      csvContent += `Name,Type,Email,Phone,Address\n`;
      contacts.forEach((contact: any) => {
        csvContent += `"${contact.firstName} ${contact.lastName}",${contact.type || 'N/A'},${contact.email || 'N/A'},${contact.phone || 'N/A'},"${contact.address || 'N/A'}"\n`;
      });
      csvContent += `\n`;
    }

    // Tasks
    if (includeTasks && tasks.length > 0) {
      csvContent += `TASKS\n`;
      csvContent += `Title,Description,Status,Priority,Due Date,Assigned To\n`;
      tasks.forEach((task: any) => {
        csvContent += `"${task.title}","${task.description || 'N/A'}",${task.status || 'N/A'},${task.priority || 'N/A'},${task.dueDate || 'N/A'},${task.assignedTo || 'N/A'}\n`;
      });
      csvContent += `\n`;
    }

    // Rooms
    if (includeRooms && rooms.length > 0) {
      csvContent += `ROOMS\n`;
      csvContent += `Room Name,Type,Notes\n`;
      rooms.forEach((room: any) => {
        csvContent += `"${room.name}",${room.type || 'N/A'},"${room.notes || 'N/A'}"\n`;
      });
      csvContent += `\n`;
    }

    // Notes
    if (includeNotes && notes.length > 0) {
      csvContent += `PROPERTY NOTES\n`;
      csvContent += `Date,Category,Content,Author\n`;
      notes.forEach((note: any) => {
        csvContent += `${note.createdAt || 'N/A'},${note.category || 'General'},"${note.content || 'N/A'}",${note.author || 'N/A'}\n`;
      });
    }

    return csvContent;
  };

  // PropertySelector component
  const PropertySelector = ({ onPropertyChange }: { onPropertyChange: (property: any) => void }) => {
    return (
      <Select onValueChange={(value) => {
        const property = properties.find(p => p.id.toString() === value);
        onPropertyChange(property);
      }}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a property..." />
        </SelectTrigger>
        <SelectContent>
          {properties.map((property: any) => (
            <SelectItem key={property.id} value={property.id.toString()}>
              <div className="flex flex-col">
                <span className="font-medium">{property.name || 'Unnamed Property'}</span>
                <span className="text-sm text-slate-500">{property.address || 'No address'}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  // Handle URL parameters to set initial tab and community focus
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const communityId = urlParams.get('community');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    // If a community ID is specified and we're on communities tab, we could scroll to it
    // For now, just focus on the communities tab
    if (communityId && tab === 'communities') {
      setActiveTab('communities');
    }
  }, []);

  // Community form schema
  const communitySchema = z.object({
    // Basic Info
    name: z.string().min(1, "Community name is required"),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    notes: z.string().optional(),
    
    // Community Profile
    gateCodes: z.string().optional(),
    propertyManagerName: z.string().optional(),
    propertyManagerCompany: z.string().optional(),
    emergencyContactNumber: z.string().optional(),
    hoaMailingAddress: z.string().optional(),
    
    // Rules & Access
    rentalRestrictions: z.string().optional(),
    petPolicy: z.string().optional(),
    parkingRestrictions: z.string().optional(),
    noiseRestrictions: z.string().optional(),
    accessProcedures: z.string().optional(),
    
    // Schedules
    trashPickupDays: z.string().optional(),
    bulkTrashDates: z.string().optional(),
    landscapeSchedule: z.string().optional(),
    pestControlSchedule: z.string().optional(),
    hoaMeetingSchedule: z.string().optional(),
    
    // Financial Info
    hoaDuesFrequency: z.string().optional(),
    hoaDuesAmount: z.string().optional(),
    paymentInstructions: z.string().optional(),
    paymentPortalUrl: z.string().optional(),
    lateFeePolicy: z.string().optional(),
    specialAssessments: z.string().optional(),
    
    // Amenities & Maintenance
    ongoingProjects: z.string().optional(),
  });

  const communityForm = useForm({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      // Basic Info
      name: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      notes: "",
      
      // Community Profile
      gateCodes: "",
      propertyManagerName: "",
      propertyManagerCompany: "",
      emergencyContactNumber: "",
      hoaMailingAddress: "",
      
      // Rules & Access
      rentalRestrictions: "",
      petPolicy: "",
      parkingRestrictions: "",
      noiseRestrictions: "",
      accessProcedures: "",
      
      // Schedules
      trashPickupDays: "",
      bulkTrashDates: "",
      landscapeSchedule: "",
      pestControlSchedule: "",
      hoaMeetingSchedule: "",
      
      // Financial Info
      hoaDuesFrequency: "",
      hoaDuesAmount: "",
      paymentInstructions: "",
      paymentPortalUrl: "",
      lateFeePolicy: "",
      specialAssessments: "",
      
      // Amenities & Maintenance
      ongoingProjects: "",
    },
  });

  // Fetch communities
  const { data: communities = [], isLoading: isCommunitiesLoading } = useQuery({
    queryKey: ["/api/communities"],
  });

  // Create community mutation  
  const createCommunityMutation = useMutation({
    mutationFn: async (communityData: any) => {
      const response = await apiRequest("POST", "/api/communities", communityData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      setIsNewCommunityDialogOpen(false);
      communityForm.reset();
      toast({
        title: "Community Created",
        description: "The community has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create community",
        variant: "destructive",
      });
    },
  });

  // Sample CSV data from user's provided file
  const csvData = [
    {
      fullName: "Bruce Wayne",
      propertyName: "Wayne Manor",
      streetAddress: "1313 Mockingbird Ln.",
      city: "Gotham City",
      county: "Bristol County",
      state: "NJ",
      zipCode: "00001",
      phoneNumber: "(807) 536-1076",
      email: "bruce.wayne@example.com",
      tasks: "Replace roof tiles; Inspect security cameras"
    },
    {
      fullName: "Tony Stark",
      propertyName: "Stark Lake House",
      streetAddress: "10880 Malibu Point",
      city: "Malibu",
      county: "Ventura County",
      state: "CA",
      zipCode: "90265",
      phoneNumber: "(625) 667-8476",
      email: "tony.stark@example.com",
      tasks: "Calibrate solar panels; Reset water system"
    },
    {
      fullName: "Bilbo Baggins",
      propertyName: "Bag End",
      streetAddress: "111 Bag End, Bagshot Row",
      city: "Hobbiton, The Shire",
      county: "Shire County",
      state: "ME",
      zipCode: "24791",
      phoneNumber: "(397) 259-9198",
      email: "bilbo.baggins@example.com",
      tasks: "Chimney sweep; Pantry pest control"
    },
    {
      fullName: "Jay Gatsby",
      propertyName: "Gatsby Estate",
      streetAddress: "1 Gatsby Lane",
      city: "West Egg",
      county: "Nassau County",
      state: "NY",
      zipCode: "11560",
      phoneNumber: "(734) 348-9487",
      email: "jay.gatsby@example.com",
      tasks: "Clean pool; Repair ballroom lights"
    },
    {
      fullName: "Elsa Arendelle",
      propertyName: "Ice Castle",
      streetAddress: "1 Ice Palace Rd",
      city: "North Mountain",
      county: "Northern Peaks County",
      state: "AK",
      zipCode: "99686",
      phoneNumber: "(918) 766-7895",
      email: "elsa.arendelle@example.com",
      tasks: "De-ice entry; Inspect HVAC"
    },
    {
      fullName: "Clark Kent",
      propertyName: "Smallville Farmhouse",
      streetAddress: "100 Farmhouse Way",
      city: "Smallville",
      county: "Republic County",
      state: "KS",
      zipCode: "67524",
      phoneNumber: "(884) 945-4765",
      email: "clark.kent@example.com",
      tasks: "Repair barn door; Reset perimeter alert"
    },
    {
      fullName: "Sherlock Holmes",
      propertyName: "221B Baker Street",
      streetAddress: "221B Baker Street",
      city: "London",
      county: "Greater London",
      state: "UK",
      zipCode: "NW1 6XE",
      phoneNumber: "(366) 722-1185",
      email: "sherlock.holmes@example.com",
      tasks: "Check gas line; Fix loose window latch"
    },
    {
      fullName: "Lara Croft",
      propertyName: "Croft Manor",
      streetAddress: "1 Croft Manor",
      city: "Surrey",
      county: "Surrey County",
      state: "UK",
      zipCode: "GU1 1AA",
      phoneNumber: "(743) 571-6460",
      email: "lara.croft@example.com",
      tasks: "Fix surveillance system; Schedule garden trim"
    },
    {
      fullName: "Doc Brown",
      propertyName: "Hill Valley Garage",
      streetAddress: "1640 Riverside Drive",
      city: "Hill Valley",
      county: "Sierra County",
      state: "CA",
      zipCode: "95420",
      phoneNumber: "(380) 547-9627",
      email: "doc.brown@example.com",
      tasks: "Clean flux capacitor bay; Inspect storm damage"
    },
    {
      fullName: "Willy Wonka",
      propertyName: "Chocolate Factory Guest House",
      streetAddress: "10 Candy Cane Lane",
      city: "Candy Town",
      county: "Sweet County",
      state: "PA",
      zipCode: "15001",
      phoneNumber: "(720) 511-5742",
      email: "willy.wonka@example.com",
      tasks: "Sanitize chocolate river filter; Inspect candy wall"
    }
  ];

  const importMutation = useMutation({
    mutationFn: async () => {
      const importResults = {
        properties: 0,
        contacts: 0,
        tasks: 0
      };

      for (const record of csvData) {
        // Split full name
        const nameParts = record.fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        // Create property
        const property = await apiRequest('/api/properties', {
          method: 'POST',
          body: JSON.stringify({
            name: record.propertyName,
            type: "house",
            address1: record.streetAddress,
            address2: "",
            city: record.city,
            state: record.state,
            zipCode: record.zipCode,
            status: "active",
            units: 1,
            squareFootage: 2500,
            yearBuilt: 1980,
            isActive: true
          })
        });
        importResults.properties++;

        // Create contact
        const contact = await apiRequest('/api/contacts', {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName,
            email: record.email,
            phone: record.phoneNumber,
            type: "owner",
            propertyId: property.id,
            isActive: true
          })
        });
        importResults.contacts++;

        // Create tasks
        const taskList = record.tasks.split(';').map(task => task.trim());
        for (const taskTitle of taskList) {
          if (taskTitle) {
            await apiRequest('/api/tasks', {
              method: 'POST',
              body: JSON.stringify({
                title: taskTitle,
                description: `Task for ${record.propertyName}`,
                priority: "normal",
                status: "pending",
                propertyId: property.id,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              })
            });
            importResults.tasks++;
          }
        }
      }

      return importResults;
    },
    onSuccess: (results) => {
      toast({
        title: "Import Successful!",
        description: `Imported ${results.properties} properties, ${results.contacts} contacts, and ${results.tasks} tasks from your CSV data.`,
      });
      
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import sample data. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Redirect if not admin or manager
  useEffect(() => {
    if (!isLoading && isAuthenticated && (user as any)?.role !== 'admin' && (user as any)?.role !== 'manager') {
      toast({
        title: "Access Denied",
        description: "You need admin or manager permissions to access this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, user, toast]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'manager')) {
    return null;
  }

  // Mock data for templates
  const emailTemplates = [
    { id: 1, name: "New Client Welcome", subject: "Welcome to Nestive Property Management", type: "client", lastModified: "2 days ago" },
    { id: 2, name: "Team Member Invitation", subject: "Join Our Property Management Team", type: "team", lastModified: "1 week ago" },
    { id: 3, name: "Property Report Summary", subject: "Monthly Property Report - {PropertyAddress}", type: "report", lastModified: "3 days ago" },
    { id: 4, name: "Task Notification", subject: "New Task Assigned: {TaskTitle}", type: "task", lastModified: "5 days ago" },
    { id: 5, name: "Payment Reminder", subject: "Payment Due for {PropertyAddress}", type: "billing", lastModified: "1 day ago" },
  ];

  const taskTemplates = [
    { id: 1, name: "New Property Onboarding", tasks: 8, category: "onboarding", lastUsed: "Yesterday" },
    { id: 2, name: "Pool Inspection Checklist", tasks: 12, category: "inspection", lastUsed: "3 days ago" },
    { id: 3, name: "Emergency Visit Protocol", tasks: 6, category: "emergency", lastUsed: "1 week ago" },
    { id: 4, name: "Vendor Visit Tasks", tasks: 5, category: "vendor", lastUsed: "2 days ago" },
  ];

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-slate-600 mt-2">
            Manage templates, settings, and system configuration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {(user as any)?.role === 'admin' && (
            <Link href="/super-admin">
              <Button className="bg-red-600 hover:bg-red-700">
                <Shield className="w-4 h-4 mr-2" />
                Account
              </Button>
            </Link>
          )}
          <Badge variant="secondary" className="px-3 py-1">
            <Shield className="w-4 h-4 mr-1" />
            {(user as any)?.role === 'admin' ? 'Admin' : 'Manager'} Access
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Management
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="communities" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Communities
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="customization" className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Customization
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Tools & Support
          </TabsTrigger>
        </TabsList>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-6">
          <AdminForms />
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Properties Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Properties
                </CardTitle>
                <CardDescription>
                  Manage property records and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/properties">
                    <Button variant="outline" className="w-full justify-start">
                      <Home className="w-4 h-4 mr-2" />
                      View All Properties
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Property
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Import
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Communities Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Communities
                </CardTitle>
                <CardDescription>
                  Manage HOAs, communities, and associations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab("communities")}
                  >
                    <Building className="w-4 h-4 mr-2" />
                    View All Communities
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab("communities")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Community
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Import
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* People Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Clients
                </CardTitle>
                <CardDescription>
                  Manage tenants, owners, and contacts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/people">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      View All Clients
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Client
                  </Button>
                  <Link href="/duplicates">
                    <Button variant="outline" className="w-full justify-start">
                      <Copy className="w-4 h-4 mr-2" />
                      Manage Duplicates
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Clients
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Vendors Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Vendors
                </CardTitle>
                <CardDescription>
                  Manage service providers and vendors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/admin/vendors">
                    <Button variant="outline" className="w-full justify-start" data-testid="button-view-vendors">
                      <Building className="w-4 h-4 mr-2" />
                      View All Vendors
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Vendor
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Vendors
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row - Team Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Team Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Team
                </CardTitle>
                <CardDescription>
                  Manage team members and access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link href="/team">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      View Team Members
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Team Member
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Permissions
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Role Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Home className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">16</p>
                    <p className="text-gray-600">Total Properties</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">42</p>
                    <p className="text-gray-600">Total Contacts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-gray-600">Team Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Copy className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-gray-600">Potential Duplicates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Comprehensive Reports</h3>
              <p className="text-slate-600">Generate detailed reports for properties and data analysis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Property Report Generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Property Report Generator
                </CardTitle>
                <CardDescription>
                  Generate comprehensive reports for any property including all details, tasks, contacts, and notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="property-select">Select Property</Label>
                  <PropertySelector onPropertyChange={setSelectedProperty} />
                </div>

                {selectedProperty && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="font-medium">{selectedProperty.name || 'Unnamed Property'}</div>
                      <div className="text-sm text-slate-600">{selectedProperty.address || 'No address'}</div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Report Options</h4>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="include-notes" 
                          checked={includeNotes} 
                          onCheckedChange={setIncludeNotes}
                        />
                        <Label htmlFor="include-notes">Include Property Notes</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="include-tasks" 
                          checked={includeTasks} 
                          onCheckedChange={setIncludeTasks}
                        />
                        <Label htmlFor="include-tasks">Include Tasks & History</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="include-contacts" 
                          checked={includeContacts} 
                          onCheckedChange={setIncludeContacts}
                        />
                        <Label htmlFor="include-contacts">Include Contacts & Owners</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="include-rooms" 
                          checked={includeRooms} 
                          onCheckedChange={setIncludeRooms}
                        />
                        <Label htmlFor="include-rooms">Include Rooms & Supplies</Label>
                      </div>
                    </div>

                    <Button 
                      onClick={() => generatePropertyReport(selectedProperty)}
                      disabled={isGeneratingReport}
                      className="w-full"
                    >
                      {isGeneratingReport ? (
                        <>
                          <Download className="w-4 h-4 mr-2 animate-pulse" />
                          Generating Report...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Generate Property Report
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Quick Reports
                </CardTitle>
                <CardDescription>
                  Pre-configured reports for common needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  All Properties Summary
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Active Tasks Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Contact Directory
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Billing Summary
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email & Message Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Email & Message Templates</h3>
              <p className="text-slate-600">Configure reusable templates for communication</p>
            </div>
            <Dialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Email Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable template with smart tags like ClientName, PropertyAddress
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input id="templateName" placeholder="e.g., New Client Welcome" />
                  </div>
                  <div>
                    <Label htmlFor="templateType">Template Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client Communication</SelectItem>
                        <SelectItem value="team">Team Communication</SelectItem>
                        <SelectItem value="report">Reports</SelectItem>
                        <SelectItem value="task">Task Notifications</SelectItem>
                        <SelectItem value="billing">Billing & Payments</SelectItem>
                        <SelectItem value="emergency">Emergency Alerts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input id="subject" placeholder="Use ClientName, PropertyAddress, TaskTitle etc." />
                  </div>
                  <div>
                    <Label htmlFor="body">Message Body</Label>
                    <Textarea id="body" rows={6} placeholder="Dear ClientName, Welcome to our property management services..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewTemplateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    setIsNewTemplateDialogOpen(false);
                    toast({
                      title: "Template Created",
                      description: "Email template has been saved successfully.",
                    });
                  }}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Email Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-slate-500">{template.subject}</p>
                        <p className="text-xs text-slate-400">Modified {template.lastModified}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Task Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {taskTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-slate-500">{template.tasks} tasks • {template.category}</p>
                        <p className="text-xs text-slate-400">Last used {template.lastUsed}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Billing embedded={true} />
        </TabsContent>

        {/* Communities Tab */}
        <TabsContent value="communities" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Communities Management</h3>
              <p className="text-slate-600">Manage HOAs, communities, and property associations</p>
            </div>
            <Button onClick={() => setIsNewCommunityDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Community
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Communities List */}
                {isCommunitiesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse p-4 border rounded-lg">
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 mb-1"></div>
                        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {communities.map((community: any) => (
                      <div key={community.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-start space-x-4">
                            <div className="flex-1">
                              <h4 className="font-medium">{community.name}</h4>
                              {(community.address1 || community.city) && (
                                <p className="text-sm text-slate-500 flex items-center mt-1">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {[community.address1, community.city, community.state, community.zip]
                                    .filter(Boolean)
                                    .join(', ')}
                                </p>
                              )}
                              {community.notes && (
                                <p className="text-xs text-slate-400 mt-1">{community.notes}</p>
                              )}
                            </div>
                            <div className="text-right text-sm text-slate-500">
                              <p>{community.propertyCount || 0} Properties</p>
                              <p>{community.isActive ? 'Active' : 'Inactive'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {communities.length === 0 && (
                      <div className="text-center py-8">
                        <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h4 className="font-medium text-slate-900 mb-2">No Communities Yet</h4>
                        <p className="text-slate-500 mb-4">Create your first community to get started</p>
                        <Button onClick={() => setIsNewCommunityDialogOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Community
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t pt-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h5 className="font-medium text-slate-900">Total Communities</h5>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{communities.length}</p>
                      <p className="text-xs text-slate-500 mt-1">Active organizations</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h5 className="font-medium text-slate-900">Properties Managed</h5>
                      <p className="text-2xl font-bold text-green-600 mt-1">{communities.reduce((sum, c) => sum + (c.propertyCount || 0), 0)}</p>
                      <p className="text-xs text-slate-500 mt-1">Across all communities</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h5 className="font-medium text-slate-900">Active HOAs</h5>
                      <p className="text-2xl font-bold text-purple-600 mt-1">{communities.filter(c => c.isActive).length}</p>
                      <p className="text-xs text-slate-500 mt-1">With management contracts</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customization Settings</CardTitle>
              <CardDescription>
                Configure custom fields and supply categories for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="custom-fields" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="custom-fields" data-testid="tab-custom-fields">
                    Custom Fields
                  </TabsTrigger>
                  <TabsTrigger value="supply-settings" data-testid="tab-supply-settings">
                    Supply Settings
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="custom-fields" className="space-y-6 mt-6">
                  <CustomFieldsSettings />
                </TabsContent>
                
                <TabsContent value="supply-settings" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Supply Categories</h3>
                      <p className="text-sm text-slate-600">
                        Configure custom supply types and units for property inventory management
                      </p>
                    </div>
                    {user?.orgId && <SupplySettingsManager orgId={user.orgId} />}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Team Roles & Permissions</h3>
            <p className="text-slate-600">Define what each role can view or edit</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Staff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>View Properties</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Edit Properties</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>View Financial Info</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Manage Users</TableCell>
                      <TableCell><CheckCircle className="w-4 h-4 text-green-600" /></TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                      <TableCell className="text-slate-400">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Contacts</CardTitle>
                <CardDescription>Designate main points of contact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mainContact">Main Point of Contact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin1">John Admin</SelectItem>
                      <SelectItem value="manager1">Sarah Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="billingContact">Billing Contact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin1">John Admin</SelectItem>
                      <SelectItem value="manager1">Sarah Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supportContact">Support Contact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin1">John Admin</SelectItem>
                      <SelectItem value="manager1">Sarah Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  Save Contact Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Notifications & Alerts</h3>
            <p className="text-slate-600">Manage system-wide alert settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Alert Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Task Deadline Alerts</p>
                    <p className="text-sm text-slate-500">Email notifications for overdue tasks</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Duplicate Warnings</p>
                    <p className="text-sm text-slate-500">Alert when potential duplicates are detected</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Login Failure Alerts</p>
                    <p className="text-sm text-slate-500">Security notifications for failed logins</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Property Access Logs</p>
                    <p className="text-sm text-slate-500">Weekly summary of property visits</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Urgent Alerts</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent-email" defaultChecked />
                      <Label htmlFor="urgent-email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent-sms" />
                      <Label htmlFor="urgent-sms">SMS</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent-app" defaultChecked />
                      <Label htmlFor="urgent-app">In-App</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-base font-medium">Regular Updates</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="regular-email" defaultChecked />
                      <Label htmlFor="regular-email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="regular-app" defaultChecked />
                      <Label htmlFor="regular-app">In-App</Label>
                    </div>
                  </div>
                </div>
                <Button className="w-full">
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tools & Support Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Tools & Support</h3>
            <p className="text-slate-600">Export/import data and access support resources</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Export / Import Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All People (CSV)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Properties (CSV)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Tasks (CSV)
                  </Button>
                  <div className="border-t pt-3 space-y-3">
                    <Link href="/admin/import">
                      <Button variant="outline" className="w-full justify-start" data-testid="button-import-manager">
                        <Upload className="w-4 h-4 mr-2" />
                        Import Manager
                      </Button>
                    </Link>
                    <p className="text-xs text-slate-500">
                      Upload and preview CSV files for data import
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => importMutation.mutate()}
                      disabled={importMutation.isPending}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importMutation.isPending ? 'Importing...' : 'Import Sample Data'}
                    </Button>
                    <p className="text-xs text-slate-500">
                      Import 10 properties, contacts, and tasks from your CSV dataset
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Support & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start"
                    onClick={() => setIsSupportModalOpen(true)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Request a Feature
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help Documentation
                  </Button>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">Quick Tip</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Use the search shortcut (Space) to quickly find properties, people, or tasks anywhere in the app.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      {/* Community Creation Dialog */}
      <Dialog open={isNewCommunityDialogOpen} onOpenChange={setIsNewCommunityDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Add New Community
            </DialogTitle>
            <DialogDescription>
              Create a comprehensive community profile with all management details
            </DialogDescription>
          </DialogHeader>

          <Form {...communityForm}>
            <form onSubmit={communityForm.handleSubmit((data) => createCommunityMutation.mutate(data))} className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Currently only basic community information (Profile tab) is saved to the database. 
                  Extended features like Rules, Schedules, and Financial info will be fully implemented in upcoming updates.
                </p>
              </div>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="profile">🏘️ Profile</TabsTrigger>
                  <TabsTrigger value="rules">🧾 Rules</TabsTrigger>
                  <TabsTrigger value="schedule">📅 Schedule</TabsTrigger>
                  <TabsTrigger value="financial">💵 Financial</TabsTrigger>
                  <TabsTrigger value="amenities">🛠️ Amenities</TabsTrigger>
                  <TabsTrigger value="documents">📝 Documents</TabsTrigger>
                </TabsList>

                {/* Community Profile Tab */}
                <TabsContent value="profile" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={communityForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Community Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Riverside Gardens HOA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={communityForm.control}
                        name="address1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="address2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2</FormLabel>
                            <FormControl>
                              <Input placeholder="Suite 100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={communityForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Jupiter" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="FL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input placeholder="33469" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={communityForm.control}
                        name="gateCodes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gate Code(s)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 1234, 5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="emergencyContactNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={communityForm.control}
                        name="propertyManagerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Manager Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="propertyManagerCompany"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Management Company</FormLabel>
                            <FormControl>
                              <Input placeholder="ABC Property Management" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={communityForm.control}
                      name="hoaMailingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HOA Mailing Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="P.O. Box 123, City, State, ZIP" 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Rules & Access Tab */}
                <TabsContent value="rules" className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800">
                      Rules and access information will be saved in future updates. Feel free to fill out this information for reference.
                    </p>
                  </div>
                  
                  <FormField
                    control={communityForm.control}
                    name="rentalRestrictions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rental Restrictions / Short-Term Rental Policy</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe rental restrictions, short-term rental policies, minimum lease terms..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="petPolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet Policy</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Pet restrictions, breed limitations, pet fees, registration requirements..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="parkingRestrictions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parking Restrictions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Parking rules, assigned spaces, guest parking, commercial vehicle restrictions..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="noiseRestrictions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Noise Restrictions / Quiet Hours</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Quiet hours (e.g. 10 PM - 8 AM), noise ordinances, construction hours..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="accessProcedures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access Procedures for Vendors / Guests</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Gate procedures, guest registration, vendor authorization, delivery instructions..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Schedules Tab */}
                <TabsContent value="schedule" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={communityForm.control}
                      name="trashPickupDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trash & Recycling Pickup Days</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Tuesday, Friday" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={communityForm.control}
                      name="bulkTrashDates"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bulk Trash Pickup Dates</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 1st Wednesday of each month" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={communityForm.control}
                      name="landscapeSchedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landscape Maintenance Schedule</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Every other Wednesday" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={communityForm.control}
                      name="pestControlSchedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pest Control Schedule</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Monthly - 2nd Tuesday" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={communityForm.control}
                    name="hoaMeetingSchedule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HOA Board Meeting Schedule</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 3rd Thursday of each month at 7 PM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Financial Info Tab */}
                <TabsContent value="financial" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={communityForm.control}
                      name="hoaDuesFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HOA Dues Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annually">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={communityForm.control}
                      name="hoaDuesAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount of Dues</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. $150.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={communityForm.control}
                    name="paymentPortalUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Portal URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://payment.hoamanagement.com/riverside" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="paymentInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Payment methods accepted, mailing address for checks, online portal instructions..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="lateFeePolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late Fee Policy</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Late fee amounts, grace periods, enforcement procedures..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="specialAssessments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Assessments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Current or upcoming special assessments, projects, payment schedules..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Amenities & Maintenance Tab */}
                <TabsContent value="amenities" className="space-y-4">
                  <FormField
                    control={communityForm.control}
                    name="ongoingProjects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recent or Ongoing Projects</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Current construction, maintenance projects, upcoming improvements..." 
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Amenities list, access codes, common area maintenance contacts, general information..." 
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Document Management</h4>
                    <p className="text-sm text-blue-700">
                      Document upload functionality will be available after creating the community. 
                      You'll be able to upload HOA declarations, bylaws, FAQ sheets, and welcome packets.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center p-3 border border-gray-200 rounded">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-sm">HOA Declaration & Bylaws</p>
                        <p className="text-xs text-gray-500">Upload after community creation</p>
                      </div>
                    </div>

                    <div className="flex items-center p-3 border border-gray-200 rounded">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-sm">Community FAQ Sheet</p>
                        <p className="text-xs text-gray-500">Upload after community creation</p>
                      </div>
                    </div>

                    <div className="flex items-center p-3 border border-gray-200 rounded">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-sm">Welcome Packet</p>
                        <p className="text-xs text-gray-500">Upload after community creation</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNewCommunityDialogOpen(false);
                    communityForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCommunityMutation.isPending}
                >
                  {createCommunityMutation.isPending ? "Creating..." : "Create Community"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </main>
  );
}