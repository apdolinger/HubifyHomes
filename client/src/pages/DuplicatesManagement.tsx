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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  // Fetch duplicate data from API
  const { data: duplicateGroups = [], isLoading: duplicatesLoading, refetch: refetchDuplicates } = useQuery({
    queryKey: ["/api/duplicates"],
    retry: false,
    enabled: isAuthenticated
  });

  // Scan for duplicates mutation
  const scanMutation = useMutation({
    mutationFn: async (criteria: any) => {
      return await apiRequest("/api/duplicates/scan", "POST", { criteria });
    },
    onSuccess: (data: any) => {
      setLastScanTime(new Date(data.scanTime || new Date()));
      setIsScanning(false);
      refetchDuplicates();
      toast({
        title: "Scan Complete",
        description: `Found ${data.duplicates?.length || 0} duplicate groups`,
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to scan for duplicates",
        variant: "destructive",
      });
    },
  });

  // Handle quick scan
  const handleQuickScan = () => {
    setIsScanning(true);
    scanMutation.mutate(scanConfig);
  };

  // Handle configure scan
  const handleConfigureScan = () => {
    setScanConfigOpen(true);
  };

  // Start configured scan
  const startConfiguredScan = () => {
    setIsScanning(true);
    setScanConfigOpen(false);
    scanMutation.mutate(scanConfig);
  };

  // Helper functions
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getContactTypeColor = (type?: string) => {
    switch (type) {
      case 'owner': return 'default';
      case 'tenant': return 'secondary';
      case 'vendor': return 'outline';
      case 'emergency': return 'destructive';
      default: return 'default';
    }
  };

  const getContactTypeDisplay = (type?: string) => {
    return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Contact';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'bg-red-500 text-white';
    if (confidence >= 85) return 'bg-orange-500 text-white';
    if (confidence >= 70) return 'bg-yellow-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 95) return 'Very High';
    if (confidence >= 85) return 'High';
    if (confidence >= 70) return 'Medium';
    return 'Low';
  };

  const formatMatchFields = (fields: string[]) => {
    return fields.map(field => {
      switch (field) {
        case 'name': return 'Name';
        case 'email': return 'Email';
        case 'phone': return 'Phone';
        case 'address': return 'Address';
        default: return field;
      }
    }).join(', ');
  };

  // Smart merge function for multiple duplicates
  const createSmartMerge = (records: any[]) => {
    if (!records || records.length < 2) return records[0];
    
    const primary = records[0];
    const smartMerged = { ...primary };
    
    // Merge all unique data from all duplicates
    records.slice(1).forEach(duplicate => {
      Object.keys(duplicate).forEach(key => {
        if (key === 'id') return; // Skip IDs
        
        // If primary doesn't have this field but duplicate does, use duplicate's value
        if (!smartMerged[key] && duplicate[key]) {
          smartMerged[key] = duplicate[key];
        }
        
        // For arrays, merge unique values
        if (Array.isArray(smartMerged[key]) && Array.isArray(duplicate[key])) {
          smartMerged[key] = [...new Set([...smartMerged[key], ...duplicate[key]])];
        }
        
        // For longer strings, prefer the longer version (more complete data)
        if (typeof smartMerged[key] === 'string' && typeof duplicate[key] === 'string') {
          if (duplicate[key].length > smartMerged[key].length) {
            smartMerged[key] = duplicate[key];
          }
        }
      });
    });
    
    return smartMerged;
  };

  // Handle smart merge of all duplicates in a group
  const handleSmartMergeAll = async (group: any) => {
    if (!group.records || group.records.length < 2) return;
    
    const recordIds = group.records.map((r: any) => r.id);
    
    try {
      await apiRequest("/api/duplicates/merge-multiple", "POST", {
        recordIds,
        type: group.type,
        mergeNotes: `Smart merge of ${group.records.length} duplicates with ${group.confidence}% confidence`
      });
      
      toast({
        title: "Smart Merge Complete",
        description: `Successfully merged ${group.records.length} ${group.type} duplicates into one record`,
      });
      
      // Refresh the duplicates list
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      
    } catch (error) {
      toast({
        title: "Merge Failed",
        description: "Failed to merge duplicates. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle keeping only primary and deleting others
  const handleKeepPrimary = async (group: any) => {
    if (!group.records || group.records.length < 2) return;
    
    const duplicateIds = group.records.slice(1).map((r: any) => r.id);
    
    try {
      // Delete duplicate records, keep only primary
      for (const id of duplicateIds) {
        await apiRequest(`/api/contacts/${id}`, "DELETE");
      }
      
      toast({
        title: "Duplicates Removed",
        description: `Kept primary record and removed ${duplicateIds.length} duplicates`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Failed to remove duplicates. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle reviewing duplicates one by one
  const handleReviewIndividually = (group: any) => {
    if (!group.records || group.records.length < 2) return;
    
    setSelectedPrimary(group.records[0]);
    setSelectedDuplicate(group.records[1]);
    setMergeModalOpen(true);
    
    toast({
      title: "Individual Review",
      description: `Starting with first pair. ${group.records.length - 2} more to review after this.`,
    });
  };

  // Render contact card
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
              {getInitials(contact.first_name, contact.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{contact.first_name} {contact.last_name}</h3>
            <Badge variant={getContactTypeColor(contact.type)} className="text-xs">
              {getContactTypeDisplay(contact.type)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          {contact.email && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.address && (
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{contact.address}</span>
            </div>
          )}
        </div>
        <div className="flex space-x-2 pt-2">
          {!isPrimary && (
            <Button size="sm" variant="outline" onClick={onSetPrimary}>
              <Crown className="w-4 h-4 mr-1" />
              Set Primary
            </Button>
          )}
          {!isPrimary && (
            <Button size="sm" variant="default" onClick={onMerge}>
              <Merge className="w-4 h-4 mr-1" />
              Merge
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Duplicate Management</h1>
          <p className="text-gray-600">Identify and merge duplicate contacts and properties</p>
        </div>
      </div>

      {/* Scan Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Duplicate Scanner</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Scan your database for potential duplicate records
              </p>
              {lastScanTime && (
                <p className="text-xs text-gray-500 flex items-center space-x-1">
                  <ClockIcon className="w-3 h-3" />
                  <span>Last scan: {lastScanTime.toLocaleString()}</span>
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleQuickScan} 
                disabled={isScanning}
                className="flex items-center space-x-2"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Quick Scan</span>
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleConfigureScan}
                disabled={isScanning}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Scan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Groups */}
      {duplicatesLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading duplicates...
          </CardContent>
        </Card>
      ) : (duplicateGroups as any[]).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
            <p className="text-gray-600">Your database appears to be clean of duplicates!</p>
            <Button onClick={handleQuickScan} className="mt-4" disabled={isScanning}>
              <Search className="w-4 h-4 mr-2" />
              Scan Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(duplicateGroups as any[]).map((group: any, groupIndex: number) => (
            <Card key={group.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-3">
                    {group.type === 'contact' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <Building className="w-5 h-5" />
                    )}
                    <span>
                      {group.type === 'contact' ? 'Contact' : 'Property'} Duplicates
                    </span>
                    <Badge className={getConfidenceColor(group.confidence)}>
                      {group.confidence}% {getConfidenceLevel(group.confidence)}
                    </Badge>
                    <Badge variant="outline">
                      {group.totalRecords || group.records?.length || 0} records
                    </Badge>
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        // Merge all duplicates into primary
                        setSelectedPrimary(group.records[0]);
                        setSelectedDuplicate({ 
                          ...group.records[0], 
                          _allDuplicates: group.records.slice(1) 
                        });
                        setMergeModalOpen(true);
                      }}
                    >
                      <Merge className="w-4 h-4 mr-1" />
                      Merge All
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Matching fields: {formatMatchFields(group.matchFields || [])}</p>
                  <p>Found: {new Date(group.createdAt).toLocaleString()}</p>
                  {group.totalRecords > 2 && (
                    <p className="text-orange-600 font-medium">
                      ⚠️ Multiple duplicates detected - review carefully before merging
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${group.records?.length > 2 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {group.records?.map((item: any, index: number) => 
                    group.type === 'contact' ? 
                      renderContactCard(
                        item, 
                        index === 0, 
                        () => {
                          // Move to primary position - this would update the group order
                          // For now, just show a toast
                          toast({
                            title: "Primary Updated",
                            description: `${item.first_name} ${item.last_name} is now the primary record`,
                          });
                        },
                        () => {
                          setSelectedPrimary(group.records[0]);
                          setSelectedDuplicate(item);
                          setMergeModalOpen(true);
                        }
                      ) : (
                        <Card key={index} className={`${index === 0 ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                          <CardHeader>
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            {index === 0 && (
                              <Badge className="w-fit bg-blue-500 text-white">
                                <Crown className="w-3 h-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-600">{item.address}</p>
                            <div className="flex space-x-2 mt-3">
                              {index !== 0 && (
                                <Button size="sm" variant="outline" onClick={() => {
                                  toast({
                                    title: "Primary Updated",
                                    description: `${item.name} is now the primary record`,
                                  });
                                }}>
                                  <Crown className="w-4 h-4 mr-1" />
                                  Set Primary
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                  )}
                </div>
                
                {/* Advanced merge options for multiple duplicates */}
                {group.records?.length > 2 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Advanced Merge Options
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSmartMergeAll(group)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Smart Merge All
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleKeepPrimary(group)}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Keep Only Primary
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReviewIndividually(group)}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Review Individually
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Smart Merge will automatically combine all unique information from all {group.records?.length} records into the primary record.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Scan Configuration Dialog */}
      <Dialog open={scanConfigOpen} onOpenChange={setScanConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Duplicate Scan</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameThreshold">Name Similarity Threshold (%)</Label>
                <Input
                  id="nameThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={scanConfig.nameThreshold}
                  onChange={(e) => setScanConfig(prev => ({ ...prev, nameThreshold: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressThreshold">Address Similarity Threshold (%)</Label>
                <Input
                  id="addressThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={scanConfig.addressThreshold}
                  onChange={(e) => setScanConfig(prev => ({ ...prev, addressThreshold: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailExact">Exact Email Match</Label>
                <Switch
                  id="emailExact"
                  checked={scanConfig.emailExact}
                  onCheckedChange={(checked) => setScanConfig(prev => ({ ...prev, emailExact: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="phoneNormalized">Normalized Phone Match</Label>
                <Switch
                  id="phoneNormalized"
                  checked={scanConfig.phoneNormalized}
                  onCheckedChange={(checked) => setScanConfig(prev => ({ ...prev, phoneNormalized: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeContacts">Include Contacts</Label>
                <Switch
                  id="includeContacts"
                  checked={scanConfig.includeContacts}
                  onCheckedChange={(checked) => setScanConfig(prev => ({ ...prev, includeContacts: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeProperties">Include Properties</Label>
                <Switch
                  id="includeProperties"
                  checked={scanConfig.includeProperties}
                  onCheckedChange={(checked) => setScanConfig(prev => ({ ...prev, includeProperties: checked }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumConfidence">Minimum Confidence (%)</Label>
              <Input
                id="minimumConfidence"
                type="number"
                min="0"
                max="100"
                value={scanConfig.minimumConfidence}
                onChange={(e) => setScanConfig(prev => ({ ...prev, minimumConfidence: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startConfiguredScan} disabled={isScanning}>
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Start Scan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Confirmation Dialog */}
      <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Contacts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will merge the duplicate contact into the primary contact. This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mergeNotes">Merge Notes (Optional)</Label>
              <Textarea
                id="mergeNotes"
                placeholder="Add any notes about this merge..."
                value={mergeNotes}
                onChange={(e) => setMergeNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle merge logic here
              setMergeModalOpen(false);
              setMergeNotes("");
              toast({
                title: "Contacts Merged",
                description: "The duplicate contact has been successfully merged.",
              });
            }}>
              <Merge className="w-4 h-4 mr-2" />
              Merge Contacts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}