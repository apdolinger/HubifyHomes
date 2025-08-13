import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TrendingUp,
  Eye,
  RotateCcw,
  History
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

export default function DuplicatesManagement() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<any>(null);
  const [mergeScreenOpen, setMergeScreenOpen] = useState(false);
  const [selectedPrimary, setSelectedPrimary] = useState<any>(null);
  const [selectedDuplicate, setSelectedDuplicate] = useState<any>(null);
  const [mergeNotes, setMergeNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [scanConfigOpen, setScanConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("people");
  
  const [scanConfig, setScanConfig] = useState({
    nameThreshold: 85,
    emailExact: false,
    phoneNormalized: true,
    addressThreshold: 80,
    minimumConfidence: 70,
    includeContacts: true,
    includeProperties: false
  });

  // Check authentication
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

  // Fetch duplicates
  const { data: duplicateGroups, isLoading: duplicatesLoading, error: duplicatesError } = useQuery({
    queryKey: ["/api/duplicates"],
    retry: false,
    enabled: isAuthenticated
  });

  // Fetch duplicate history
  const { data: duplicateHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/duplicates/history"],
    retry: false,
    enabled: isAuthenticated
  });

  // Scan for duplicates mutation
  const scanMutation = useMutation({
    mutationFn: async (criteria: any) => {
      return await apiRequest("/api/duplicates/scan", "POST", { criteria });
    },
    onSuccess: () => {
      setIsScanning(false);
      setLastScanTime(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      toast({
        title: "Scan Complete",
        description: "Duplicate scan completed successfully",
      });
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

  const handleQuickScan = () => {
    setIsScanning(true);
    scanMutation.mutate(scanConfig);
  };

  const startConfiguredScan = () => {
    setIsScanning(true);
    setScanConfigOpen(false);
    scanMutation.mutate(scanConfig);
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

  // Handle selecting a duplicate group for merging
  const handleSelectDuplicate = (group: any) => {
    setSelectedDuplicateGroup(group);
    setSelectedPrimary(group.records[0]);
    setSelectedDuplicate(group.records[1]);
    setMergeScreenOpen(true);
  };

  // Handle ignoring a duplicate
  const handleIgnoreDuplicate = async (groupId: number) => {
    try {
      const recordIds = selectedDuplicateGroup.records.map((record: any) => record.id);
      
      await apiRequest("/api/duplicates/ignore", "POST", {
        recordType: selectedDuplicateGroup.type,
        recordIds: recordIds,
        reason: "User manually ignored this duplicate group"
      });
      
      toast({
        title: "Duplicate Ignored",
        description: "This duplicate will not appear in future scans",
      });
      
      setMergeScreenOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
    } catch (error) {
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
        description: "Failed to ignore duplicate",
        variant: "destructive",
      });
    }
  };

  // Handle swapping primary in merge screen
  const handleSwapPrimary = () => {
    const temp = selectedPrimary;
    setSelectedPrimary(selectedDuplicate);
    setSelectedDuplicate(temp);
  };

  // Handle merging duplicates
  const handleMerge = async () => {
    try {
      await apiRequest("/api/duplicates/merge-multiple", "POST", {
        recordIds: [selectedPrimary.id, selectedDuplicate.id],
        type: selectedDuplicateGroup.type,
        mergeNotes
      });
      
      toast({
        title: "Merge Complete",
        description: "Duplicates merged successfully",
      });
      
      setMergeScreenOpen(false);
      setMergeNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      
    } catch (error) {
      toast({
        title: "Merge Failed",
        description: "Failed to merge duplicates. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'owner': return 'bg-blue-100 text-blue-800';
      case 'tenant': return 'bg-green-100 text-green-800';
      case 'vendor': return 'bg-purple-100 text-purple-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/dashboard")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Duplicate Management</h1>
              <p className="text-gray-600 mt-1">Find and merge duplicate contacts and properties</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {lastScanTime && (
              <div className="text-sm text-gray-500 flex items-center">
                <ClockIcon className="w-4 h-4 mr-1" />
                Last scan: {lastScanTime.toLocaleString()}
              </div>
            )}
            <Button
              onClick={() => setScanConfigOpen(true)}
              variant="outline"
              disabled={isScanning}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure Scan
            </Button>
            <Button
              onClick={handleQuickScan}
              disabled={isScanning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Quick Scan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Duplicates with Tabs */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="people" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>People Duplicates</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center space-x-2">
              <Building className="w-4 h-4" />
              <span>Property Duplicates</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="space-y-4">
            {duplicatesLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading people duplicates...
                </CardContent>
              </Card>
            ) : (duplicateGroups as any[])?.filter(g => g.type === 'contact')?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No People Duplicates Found</h3>
                  <p className="text-gray-600">No duplicate contacts were found in your database.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Contact Duplicates ({(duplicateGroups as any[])?.filter(g => g.type === 'contact')?.length || 0})</span>
                    <Badge variant="outline" className="text-sm">
                      Click a row to review and merge
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(duplicateGroups as any[])?.filter(g => g.type === 'contact')?.map((group: any, index: number) => (
                      <div
                        key={group.id || index}
                        onClick={() => handleSelectDuplicate(group)}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Users className="w-5 h-5 text-blue-600" />
                              <Badge className={getConfidenceColor(group.confidence)}>
                                {group.confidence}% {getConfidenceLevel(group.confidence)}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Matching: {group.matchFields?.join(', ') || 'Name'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">
                              {group.records?.length || 0} records
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectDuplicate(group);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 text-sm text-gray-600">
                          {group.records?.slice(0, 2).map((record: any, idx: number) => (
                            <span key={idx} className="mr-3">
                              ({record.email || record.phone}) → {record.first_name} {record.last_name}
                              {idx < Math.min(1, (group.records?.length || 1) - 1) && ' | '}
                            </span>
                          ))}
                          {(group.records?.length || 0) > 2 && ` +${(group.records?.length || 0) - 2} more`}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="properties" className="space-y-4">
            {duplicatesLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading property duplicates...
                </CardContent>
              </Card>
            ) : (duplicateGroups as any[])?.filter(g => g.type === 'property')?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Property Duplicates Found</h3>
                  <p className="text-gray-600">No duplicate properties were found in your database.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Property Duplicates ({(duplicateGroups as any[])?.filter(g => g.type === 'property')?.length || 0})</span>
                    <Badge variant="outline" className="text-sm">
                      Click a row to review and merge
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(duplicateGroups as any[])?.filter(g => g.type === 'property')?.map((group: any, index: number) => (
                      <div
                        key={group.id || index}
                        onClick={() => handleSelectDuplicate(group)}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Building className="w-5 h-5 text-green-600" />
                              <Badge className={getConfidenceColor(group.confidence)}>
                                {group.confidence}% {getConfidenceLevel(group.confidence)}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Matching: {group.matchFields?.join(', ') || 'Name'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">
                              {group.records?.length || 0} records
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectDuplicate(group);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 text-sm text-gray-600">
                          {group.records?.slice(0, 2).map((record: any, idx: number) => (
                            <span key={idx} className="mr-3">
                              {record.name || record.address}
                              {idx < Math.min(1, (group.records?.length || 1) - 1) && ' → '}
                            </span>
                          ))}
                          {(group.records?.length || 0) > 2 && ` +${(group.records?.length || 0) - 2} more`}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Duplicate History Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>Duplicate Action History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Loading history...
              </div>
            ) : !duplicateHistory || duplicateHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No duplicate actions recorded yet.</p>
                <p className="text-sm mt-1">Merge or ignore actions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {duplicateHistory.map((entry: any) => (
                  <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant={entry.action === 'merge' ? 'default' : 'secondary'}>
                          {entry.action === 'merge' ? (
                            <>
                              <Merge className="w-3 h-3 mr-1" />
                              Merged
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              Ignored
                            </>
                          )}
                        </Badge>
                        <span className="font-medium">
                          {entry.recordType === 'contact' ? 'Contact' : 'Property'} Duplicates
                        </span>
                        <span className="text-sm text-gray-500">
                          {entry.recordIds?.length || 0} records involved
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(entry.performedAt).toLocaleDateString()} by {entry.performedByName || 'Unknown'}
                      </div>
                    </div>
                    {entry.details?.reason && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Reason:</strong> {entry.details.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>



      {/* Merge Screen Dialog */}
      <Dialog open={mergeScreenOpen} onOpenChange={setMergeScreenOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <Merge className="w-5 h-5" />
              <span>Merge {selectedDuplicateGroup?.type === 'contact' ? 'Contacts' : 'Properties'}</span>
              <Badge className={getConfidenceColor(selectedDuplicateGroup?.confidence || 0)}>
                {selectedDuplicateGroup?.confidence}% {getConfidenceLevel(selectedDuplicateGroup?.confidence || 0)}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Primary vs Duplicate Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Record */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Crown className="w-5 h-5 text-blue-600 mr-2" />
                    Primary Record
                  </h3>
                </div>
                
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    {selectedDuplicateGroup?.type === 'contact' && selectedPrimary ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                              {getInitials(selectedPrimary.first_name, selectedPrimary.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{selectedPrimary.first_name} {selectedPrimary.last_name}</h4>
                            <Badge className={getContactTypeColor(selectedPrimary.type)}>
                              {selectedPrimary.type || 'Contact'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {selectedPrimary.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span>{selectedPrimary.email}</span>
                            </div>
                          )}
                          {selectedPrimary.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span>{selectedPrimary.phone}</span>
                            </div>
                          )}
                          {selectedPrimary.address && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span>{selectedPrimary.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>Property details would go here</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Duplicate Record */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <UserX className="w-5 h-5 text-orange-600 mr-2" />
                    Duplicate Record
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSwapPrimary}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Swap Primary
                  </Button>
                </div>
                
                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    {selectedDuplicateGroup?.type === 'contact' && selectedDuplicate ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                              {getInitials(selectedDuplicate.first_name, selectedDuplicate.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{selectedDuplicate.first_name} {selectedDuplicate.last_name}</h4>
                            <Badge className={getContactTypeColor(selectedDuplicate.type)}>
                              {selectedDuplicate.type || 'Contact'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {selectedDuplicate.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span>{selectedDuplicate.email}</span>
                            </div>
                          )}
                          {selectedDuplicate.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span>{selectedDuplicate.phone}</span>
                            </div>
                          )}
                          {selectedDuplicate.address && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span>{selectedDuplicate.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>Property details would go here</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Merge Notes */}
            <div className="space-y-2">
              <Label htmlFor="mergeNotes">Merge Notes (Optional)</Label>
              <Textarea
                id="mergeNotes"
                placeholder="Add any notes about this merge..."
                value={mergeNotes}
                onChange={(e) => setMergeNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => handleIgnoreDuplicate(selectedDuplicateGroup?.id)}
              >
                <X className="w-4 h-4 mr-1" />
                Ignore Duplicate
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setMergeScreenOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMerge}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Merge className="w-4 h-4 mr-1" />
                Merge Records
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}