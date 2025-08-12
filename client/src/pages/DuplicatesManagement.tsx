import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Users, 
  Building, 
  UserX, 
  ArrowRight, 
  Crown, 
  Merge,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  X,
  AlertTriangle,
  RefreshCw,
  Search,
  Clock as ClockIcon,
  Settings,
  TrendingUp
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

export default function DuplicatesManagement() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedPrimary, setSelectedPrimary] = useState<any>(null);
  const [selectedDuplicate, setSelectedDuplicate] = useState<any>(null);
  const [mergeNotes, setMergeNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [scanConfigOpen, setScanConfigOpen] = useState(false);
  const [scanConfig, setScanConfig] = useState({
    nameThreshold: 85,
    emailExact: true,
    phoneNormalized: true,
    addressThreshold: 80,
    includeContacts: true,
    includeProperties: true,
    minimumConfidence: 70
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

  // Mock duplicate data - in real app this would come from the API
  const duplicateGroups = [
    {
      id: 1,
      type: "contact",
      duplicates: [
        {
          id: 14,
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@email.com",
          phone: "(555) 123-4567",
          type: "tenant",
          createdAt: "2024-01-15",
          properties: ["123 Main St"]
        },
        {
          id: 15,
          firstName: "John",
          lastName: "Smith",
          email: "j.smith@gmail.com",
          phone: "(555) 123-4567",
          type: "tenant",
          createdAt: "2024-02-20",
          properties: ["123 Main Street"]
        }
      ],
      matchFields: ["name", "phone"],
      confidence: 95
    },
    {
      id: 2,
      type: "contact",
      duplicates: [
        {
          id: 16,
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@company.com",
          phone: "(555) 987-6543",
          type: "owner",
          createdAt: "2023-12-10",
          properties: ["456 Oak Ave"]
        },
        {
          id: 17,
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.j@email.com",
          phone: "(555) 987-6543",
          type: "owner",
          createdAt: "2024-01-08",
          properties: ["456 Oak Avenue"]
        }
      ],
      matchFields: ["name", "phone"],
      confidence: 92
    },
    {
      id: 3,
      type: "property",
      duplicates: [
        {
          id: 21,
          name: "Oak Street Apartment",
          address1: "456 Oak Street",
          address2: "Apt 2B",
          city: "Springfield",
          state: "IL",
          zip: "62701",
          createdAt: "2024-01-05",
          contacts: ["Sarah Johnson", "Mike Wilson"]
        },
        {
          id: 22,
          name: "Oak St Apt Complex",
          address1: "456 Oak St",
          address2: "Unit 2B",
          city: "Springfield",
          state: "IL",
          zip: "62701",
          createdAt: "2024-02-15",
          contacts: ["Sarah J.", "Michael Wilson"]
        }
      ],
      matchFields: ["address", "zip"],
      confidence: 88
    }
  ];

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getContactTypeColor = (type: string) => {
    switch (type) {
      case "owner": return "default";
      case "tenant": return "secondary";
      case "vendor": return "outline";
      case "emergency_contact": return "destructive";
      default: return "secondary";
    }
  };

  const getContactTypeDisplay = (type: string) => {
    switch (type) {
      case "emergency_contact": return "Emergency Contact";
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return "bg-red-100 text-red-800 border-red-200";
    if (confidence >= 85) return "bg-orange-100 text-orange-800 border-orange-200";
    if (confidence >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 95) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (confidence >= 85) return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    if (confidence >= 70) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-gray-600" />;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 95) return "Very High";
    if (confidence >= 85) return "High";
    if (confidence >= 70) return "Medium";
    return "Low";
  };

  const handleMergeContacts = (primary: any, duplicate: any) => {
    setSelectedPrimary(primary);
    setSelectedDuplicate(duplicate);
    setMergeModalOpen(true);
  };

  const createMergedData = (primary: any, duplicate: any) => {
    // Smart merge logic: primary takes precedence, but fill in missing fields from duplicate
    const merged = { ...primary };
    
    // Fill in missing or empty fields from duplicate
    Object.keys(duplicate).forEach(key => {
      if (key === 'id' || key === 'createdAt') return; // Don't override these
      
      const primaryValue = primary[key];
      const duplicateValue = duplicate[key];
      
      // If primary field is empty/null/undefined and duplicate has a value, use duplicate's value
      if ((!primaryValue || primaryValue === '') && duplicateValue && duplicateValue !== '') {
        merged[key] = duplicateValue;
      }
      
      // Special handling for arrays (like properties)
      if (Array.isArray(primaryValue) && Array.isArray(duplicateValue)) {
        // Combine arrays and remove duplicates
        const combined = [...primaryValue, ...duplicateValue];
        merged[key] = [...new Set(combined)];
      }
    });
    
    return merged;
  };

  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPrimary || !selectedDuplicate) return;
      
      // Create the merged data
      const mergedData = createMergedData(selectedPrimary, selectedDuplicate);
      
      // In real app, this would call the API to:
      // 1. Update the primary record with merged data
      // 2. Transfer any relationships/dependencies from duplicate to primary
      // 3. Delete the duplicate record
      // 4. Log the merge operation for audit trail
      
      await apiRequest("PATCH", `/api/contacts/${selectedPrimary.id}`, {
        ...mergedData,
        mergeNotes,
        mergedFromId: selectedDuplicate.id,
        mergedAt: new Date().toISOString()
      });
      
      await apiRequest("DELETE", `/api/contacts/${selectedDuplicate.id}`);
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
    },
    onSuccess: () => {
      const filledFields = [];
      
      // Check what fields were filled from duplicate
      Object.keys(selectedDuplicate).forEach(key => {
        if (key === 'id' || key === 'createdAt') return;
        
        const primaryValue = selectedPrimary[key];
        const duplicateValue = selectedDuplicate[key];
        
        if ((!primaryValue || primaryValue === '') && duplicateValue && duplicateValue !== '') {
          filledFields.push(key);
        }
      });
      
      toast({
        title: "Merge Successful",
        description: filledFields.length > 0 
          ? `Merged successfully. Filled ${filledFields.length} missing fields from duplicate.`
          : "Duplicates have been merged successfully.",
      });
      
      setMergeModalOpen(false);
      setSelectedPrimary(null);
      setSelectedDuplicate(null);
      setMergeNotes("");
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
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
        title: "Merge Failed",
        description: "Failed to merge duplicates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getFieldsToMerge = () => {
    if (!selectedPrimary || !selectedDuplicate) return [];
    
    const fieldsToFill = [];
    Object.keys(selectedDuplicate).forEach(key => {
      if (key === 'id' || key === 'createdAt') return;
      
      const primaryValue = selectedPrimary[key];
      const duplicateValue = selectedDuplicate[key];
      
      if ((!primaryValue || primaryValue === '') && duplicateValue && duplicateValue !== '') {
        fieldsToFill.push({
          field: key,
          value: duplicateValue,
          displayName: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
        });
      }
    });
    
    return fieldsToFill;
  };

  const handleConfirmMerge = () => {
    mergeMutation.mutate();
  };

  // Duplicate scanning mutation
  const scanForDuplicatesMutation = useMutation({
    mutationFn: async () => {
      setIsScanning(true);
      
      // In real app, this would call the API to scan for duplicates with configurable criteria
      // The API would compare records based on:
      // - Name similarity (phonetic matching, fuzzy string matching)
      // - Email addresses (exact and domain matching)
      // - Phone numbers (normalized comparison)
      // - Address similarity (normalized addresses, zip codes)
      // - Custom business rules
      
      await apiRequest("POST", "/api/duplicates/scan", {
        criteria: scanConfig
      });
      
      // Simulate scanning time
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
    onSuccess: () => {
      setIsScanning(false);
      setLastScanTime(new Date());
      toast({
        title: "Scan Complete",
        description: "Duplicate scan completed. New duplicates have been identified.",
      });
      // Refresh duplicates data
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
    },
    onError: (error) => {
      setIsScanning(false);
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
        title: "Scan Failed",
        description: "Failed to scan for duplicates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleScanForDuplicates = () => {
    scanForDuplicatesMutation.mutate();
  };

  const handleQuickScan = () => {
    setScanConfig({
      nameThreshold: 85,
      emailExact: true,
      phoneNormalized: true,
      addressThreshold: 80,
      includeContacts: true,
      includeProperties: true,
      minimumConfidence: 70
    });
    scanForDuplicatesMutation.mutate();
  };

  const handleConfiguredScan = () => {
    setScanConfigOpen(true);
  };

  const renderContactCard = (contact: any, isPrimary: boolean, onSetPrimary: () => void, onMerge: () => void) => (
    <Card className={`relative ${isPrimary ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'} transition-all`}>
      {isPrimary && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-blue-500 text-white">
            <Crown className="w-3 h-3 mr-1" />
            Primary
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-sm font-semibold">
              {getInitials(contact.firstName, contact.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{contact.firstName} {contact.lastName}</h3>
            <Badge variant={getContactTypeColor(contact.type)} className="text-xs">
              {getContactTypeDisplay(contact.type)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          {contact.email && (
            <div className="flex items-center text-slate-600">
              <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center text-slate-600">
              <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{contact.phone}</span>
            </div>
          )}
          <div className="flex items-center text-slate-600">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Created {contact.createdAt}</span>
          </div>
          {contact.properties && contact.properties.length > 0 && (
            <div className="flex items-start text-slate-600">
              <Building className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                {contact.properties.map((prop: string, idx: number) => (
                  <div key={idx} className="text-xs">{prop}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 pt-2">
          {!isPrimary && (
            <Button size="sm" variant="outline" onClick={onSetPrimary} className="flex-1">
              <Crown className="w-3 h-3 mr-1" />
              Set Primary
            </Button>
          )}
          <Button 
            size="sm" 
            className="flex-1 bg-blue-600 hover:bg-blue-700" 
            onClick={onMerge}
            disabled={!isPrimary}
          >
            <Merge className="w-3 h-3 mr-1" />
            Merge Into
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPropertyCard = (property: any, isPrimary: boolean, onSetPrimary: () => void, onMerge: () => void) => (
    <Card className={`relative ${isPrimary ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'} transition-all`}>
      {isPrimary && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-blue-500 text-white">
            <Crown className="w-3 h-3 mr-1" />
            Primary
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
            <Building className="w-6 h-6 text-slate-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{property.name}</h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-start text-slate-600">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <div>{property.address1}</div>
              {property.address2 && <div>{property.address2}</div>}
              <div>{property.city}, {property.state} {property.zip}</div>
            </div>
          </div>
          <div className="flex items-center text-slate-600">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Created {property.createdAt}</span>
          </div>
          {property.contacts && property.contacts.length > 0 && (
            <div className="flex items-start text-slate-600">
              <Users className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                {property.contacts.map((contact: string, idx: number) => (
                  <div key={idx} className="text-xs">{contact}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 pt-2">
          {!isPrimary && (
            <Button size="sm" variant="outline" onClick={onSetPrimary} className="flex-1">
              <Crown className="w-3 h-3 mr-1" />
              Set Primary
            </Button>
          )}
          <Button 
            size="sm" 
            className="flex-1 bg-blue-600 hover:bg-blue-700" 
            onClick={onMerge}
            disabled={!isPrimary}
          >
            <Merge className="w-3 h-3 mr-1" />
            Merge Into
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center">
              <UserX className="w-8 h-8 mr-3" />
              Duplicates Management
            </h1>
            <p className="text-slate-600 mt-2">
              Review and merge duplicate contacts and properties
            </p>
            {lastScanTime && (
              <div className="flex items-center text-sm text-slate-500 mt-1">
                <ClockIcon className="w-3 h-3 mr-1" />
                Last scan: {lastScanTime.toLocaleString()}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{duplicateGroups.length}</div>
              <div className="text-sm text-slate-600">Duplicate Groups</div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleQuickScan}
                disabled={isScanning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Quick Scan
                  </>
                )}
              </Button>
              <Button 
                onClick={handleConfiguredScan}
                disabled={isScanning}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Scan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicates List */}
      <div className="space-y-8">
        {duplicateGroups.map((group, groupIndex) => {
          const [primaryIndex, setPrimaryIndex] = useState(0);
          
          return (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {group.type === 'contact' ? (
                        <Users className="w-5 h-5 text-slate-600" />
                      ) : (
                        <Building className="w-5 h-5 text-slate-600" />
                      )}
                      <h2 className="text-xl font-semibold">
                        Duplicate {group.type === 'contact' ? 'Contacts' : 'Properties'} #{group.id}
                      </h2>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getConfidenceColor(group.confidence)} border`}>
                        {getConfidenceIcon(group.confidence)}
                        <span className="ml-1">{group.confidence}% - {getConfidenceLabel(group.confidence)}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Search className="w-4 h-4" />
                      <span>Matched on: <strong>{group.matchFields.join(", ")}</strong></span>
                    </div>
                    {group.confidence >= 90 && (
                      <div className="flex items-center space-x-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Action Required</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {group.duplicates.map((item, index) => (
                    <div key={item.id}>
                      {group.type === 'contact' ? (
                        renderContactCard(
                          item,
                          index === primaryIndex,
                          () => setPrimaryIndex(index),
                          () => handleMergeContacts(
                            group.duplicates[primaryIndex], 
                            index === primaryIndex ? group.duplicates[1 - primaryIndex] : item
                          )
                        )
                      ) : (
                        renderPropertyCard(
                          item,
                          index === primaryIndex,
                          () => setPrimaryIndex(index),
                          () => {
                            // Handle property merge
                            toast({
                              title: "Property Merge",
                              description: "Property merge functionality coming soon.",
                            });
                          }
                        )
                      )}
                    </div>
                  ))}
                </div>
                
                {group.duplicates.length === 2 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex items-center space-x-2 text-slate-500">
                      <ArrowRight className="w-4 h-4" />
                      <span className="text-sm">Choose primary record and merge duplicate into it</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Merge Confirmation Modal */}
      <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Merge className="w-5 h-5 mr-2" />
              Confirm Merge
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Primary Record (Will Keep)</span>
              </div>
              <div className="text-sm text-blue-800">
                {selectedPrimary && `${selectedPrimary.firstName} ${selectedPrimary.lastName}`}
                {selectedPrimary?.email && ` - ${selectedPrimary.email}`}
              </div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg border">
              <div className="flex items-center space-x-2 mb-2">
                <X className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900">Duplicate Record (Will Delete)</span>
              </div>
              <div className="text-sm text-red-800">
                {selectedDuplicate && `${selectedDuplicate.firstName} ${selectedDuplicate.lastName}`}
                {selectedDuplicate?.email && ` - ${selectedDuplicate.email}`}
              </div>
            </div>

            {/* Show fields that will be filled from duplicate */}
            {getFieldsToMerge().length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Merge className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    Missing Data to be Filled ({getFieldsToMerge().length} fields)
                  </span>
                </div>
                <div className="space-y-2">
                  {getFieldsToMerge().map((field, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-green-700 font-medium">{field.displayName}:</span>
                      <span className="text-green-800 bg-green-100 px-2 py-1 rounded text-xs">
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-green-600">
                  These empty fields in the primary record will be filled with data from the duplicate.
                </div>
              </div>
            )}

            {getFieldsToMerge().length === 0 && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="text-sm text-gray-600 text-center">
                  No missing data to merge - primary record is complete.
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Merge Notes (Optional)
              </label>
              <Textarea
                value={mergeNotes}
                onChange={(e) => setMergeNotes(e.target.value)}
                placeholder="Add any notes about this merge operation..."
                rows={3}
              />
            </div>
            
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action cannot be undone. The duplicate record will be permanently deleted and all associated data will be transferred to the primary record.
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmMerge} 
              disabled={mergeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {mergeMutation.isPending ? "Merging..." : "Confirm Merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan Configuration Modal */}
      <Dialog open={scanConfigOpen} onOpenChange={setScanConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configure Duplicate Scan
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Matching Criteria</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Name Similarity Threshold</label>
                    <div className="flex items-center space-x-3 mt-1">
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={scanConfig.nameThreshold}
                        onChange={(e) => setScanConfig(prev => ({ ...prev, nameThreshold: parseInt(e.target.value) }))}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{scanConfig.nameThreshold}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700">Address Similarity Threshold</label>
                    <div className="flex items-center space-x-3 mt-1">
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={scanConfig.addressThreshold}
                        onChange={(e) => setScanConfig(prev => ({ ...prev, addressThreshold: parseInt(e.target.value) }))}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{scanConfig.addressThreshold}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700">Minimum Overall Confidence</label>
                    <div className="flex items-center space-x-3 mt-1">
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={scanConfig.minimumConfidence}
                        onChange={(e) => setScanConfig(prev => ({ ...prev, minimumConfidence: parseInt(e.target.value) }))}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{scanConfig.minimumConfidence}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Options</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="emailExact"
                      checked={scanConfig.emailExact}
                      onChange={(e) => setScanConfig(prev => ({ ...prev, emailExact: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="emailExact" className="text-sm text-slate-700">Exact email matching</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="phoneNormalized"
                      checked={scanConfig.phoneNormalized}
                      onChange={(e) => setScanConfig(prev => ({ ...prev, phoneNormalized: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="phoneNormalized" className="text-sm text-slate-700">Normalized phone matching</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeContacts"
                      checked={scanConfig.includeContacts}
                      onChange={(e) => setScanConfig(prev => ({ ...prev, includeContacts: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="includeContacts" className="text-sm text-slate-700">Scan contacts</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeProperties"
                      checked={scanConfig.includeProperties}
                      onChange={(e) => setScanConfig(prev => ({ ...prev, includeProperties: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="includeProperties" className="text-sm text-slate-700">Scan properties</label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Scan Preview</span>
              </div>
              <div className="text-sm text-blue-800">
                This scan will look for {scanConfig.includeContacts && scanConfig.includeProperties ? 'contacts and properties' : 
                scanConfig.includeContacts ? 'contacts' : scanConfig.includeProperties ? 'properties' : 'nothing'} with 
                at least {scanConfig.minimumConfidence}% confidence level.
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setScanConfigOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setScanConfigOpen(false);
                scanForDuplicatesMutation.mutate();
              }}
              disabled={isScanning || (!scanConfig.includeContacts && !scanConfig.includeProperties)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Search className="w-4 h-4 mr-2" />
              Start Scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}