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
  History,
  ExternalLink,
  Trash2,
  Archive
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import { format } from "date-fns";

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
  
  const [cleanupDaysOld, setCleanupDaysOld] = useState(90);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [cleanupType, setCleanupType] = useState<'ignored' | 'history' | 'all'>('ignored');

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
      return await apiRequest("POST", "/api/duplicates/scan", { criteria });
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
  const handleIgnoreDuplicate = async () => {
    try {
      if (!selectedDuplicateGroup) return;
      
      const recordIds = selectedDuplicateGroup.records.map((record: any) => record.id);
      
      await apiRequest("POST", "/api/duplicates/ignore", {
        recordType: selectedDuplicateGroup.type,
        recordIds: recordIds,
        reason: "User manually ignored this duplicate group",
        mergeNotes
      });
      
      toast({
        title: "Duplicate Ignored",
        description: "This duplicate will not appear in future scans",
      });
      
      setMergeScreenOpen(false);
      setMergeNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates/history"] });
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
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
      await apiRequest("POST", "/api/duplicates/merge-multiple", {
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

  // Handle cleanup of duplicate history
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/duplicates/cleanup", {
        type: cleanupType,
        daysOld: cleanupDaysOld
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Cleanup Complete",
        description: `Successfully deleted ${data.deletedCount} records older than ${cleanupDaysOld} days`,
      });
      setCleanupConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates/history"] });
    },
    onError: () => {
      toast({
        title: "Cleanup Failed",
        description: "Failed to clean up duplicate history. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCleanup = () => {
    cleanupMutation.mutate();
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
              onClick={() => setLocation("/")}
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
              data-testid="button-configure-scan"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure Scan
            </Button>
            <Button
              onClick={handleQuickScan}
              disabled={isScanning}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-quick-scan"
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="people" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>People Duplicates</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center space-x-2">
              <Building className="w-4 h-4" />
              <span>Property Duplicates</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Archive className="w-4 h-4" />
              <span>History & Cleanup</span>
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

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Archive className="w-5 h-5" />
                  <span>Cleanup Duplicate History</span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Remove old duplicate records and history to keep your database clean. Cleaning up duplicate record history reduces the overall storage needed, reducing your operating costs. This action cannot be undone.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-2">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Trash2 className="w-8 h-8 text-orange-500" />
                        <Badge variant="secondary">Ignored</Badge>
                      </div>
                      <h3 className="font-semibold mb-2">Ignored Duplicates</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Clean up duplicate groups you've previously ignored
                      </p>
                      <Button
                        onClick={() => {
                          setCleanupType('ignored');
                          setCleanupConfirmOpen(true);
                        }}
                        variant="outline"
                        className="w-full"
                        data-testid="btn-cleanup-ignored"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clean Up Ignored
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <History className="w-8 h-8 text-blue-500" />
                        <Badge variant="secondary">History</Badge>
                      </div>
                      <h3 className="font-semibold mb-2">Action History</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Remove old merge and ignore action records
                      </p>
                      <Button
                        onClick={() => {
                          setCleanupType('history');
                          setCleanupConfirmOpen(true);
                        }}
                        variant="outline"
                        className="w-full"
                        data-testid="btn-cleanup-history"
                      >
                        <History className="w-4 h-4 mr-2" />
                        Clean Up History
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-red-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        <Badge variant="destructive">All</Badge>
                      </div>
                      <h3 className="font-semibold mb-2">Complete Cleanup</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Remove both ignored duplicates and history
                      </p>
                      <Button
                        onClick={() => {
                          setCleanupType('all');
                          setCleanupConfirmOpen(true);
                        }}
                        variant="destructive"
                        className="w-full"
                        data-testid="btn-cleanup-all"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clean Up All
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="border-t pt-6">
                  <Label htmlFor="cleanupDays" className="text-base font-semibold mb-2 block">
                    Age Filter
                  </Label>
                  <p className="text-sm text-gray-600 mb-4">
                    Only delete records older than the specified number of days
                  </p>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="cleanupDays"
                      type="number"
                      min="1"
                      max="365"
                      value={cleanupDaysOld}
                      onChange={(e) => setCleanupDaysOld(parseInt(e.target.value) || 90)}
                      className="w-32"
                      data-testid="input-cleanup-days"
                    />
                    <span className="text-sm text-gray-600">days old or older</span>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900">Important Notes</h4>
                      <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                        <li>This action cannot be undone</li>
                        <li>Only records older than {cleanupDaysOld} days will be deleted</li>
                        <li>Active duplicate groups will not be affected</li>
                        <li>Only administrators can perform cleanup</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            ) : !duplicateHistory || (duplicateHistory as any[]).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No duplicate actions recorded yet.</p>
                <p className="text-sm mt-1">Merge or ignore actions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(duplicateHistory as any[]).map((entry: any) => (
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
                    {entry.notes && (
                      <div className="mt-2 text-sm text-gray-700 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                        <strong>Notes:</strong> {entry.notes}
                      </div>
                    )}
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
                  {selectedPrimary && (
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      data-testid="btn-view-primary-profile"
                    >
                      <a 
                        href={selectedDuplicateGroup?.type === 'contact' 
                          ? `/person-profile/${selectedPrimary.id}` 
                          : `/property-profile/${selectedPrimary.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Profile
                      </a>
                    </Button>
                  )}
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
                          {selectedPrimary.createdAt && (
                            <div className="flex items-center space-x-2 pt-2 border-t mt-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">
                                Created: {format(new Date(selectedPrimary.createdAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedDuplicateGroup?.type === 'property' && selectedPrimary ? (
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg">{selectedPrimary.name}</h4>
                          <Badge className="mt-1">
                            {selectedPrimary.type || 'Property'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <div>
                              <div>{selectedPrimary.address1}</div>
                              {selectedPrimary.address2 && <div>{selectedPrimary.address2}</div>}
                              <div>{selectedPrimary.city}, {selectedPrimary.state} {selectedPrimary.zip}</div>
                            </div>
                          </div>
                          
                          {selectedPrimary.accountId && (
                            <div className="flex items-center space-x-2">
                              <Building className="w-4 h-4 text-gray-500" />
                              <span>Account ID: {selectedPrimary.accountId}</span>
                            </div>
                          )}
                          
                          {selectedPrimary.status && (
                            <div className="flex items-center space-x-2">
                              <Badge variant={selectedPrimary.status === 'occupied' ? 'default' : 'secondary'}>
                                Status: {selectedPrimary.status}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="text-gray-600">
                            Units: {selectedPrimary.units ?? 1}
                          </div>
                          
                          <div className="text-gray-600">
                            Square Footage: {selectedPrimary.squareFootage?.toLocaleString() ?? 'N/A'} {selectedPrimary.squareFootage ? 'sq ft' : ''}
                          </div>
                          
                          {selectedPrimary.createdAt && (
                            <div className="flex items-center space-x-2 pt-2 border-t mt-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">
                                Created: {format(new Date(selectedPrimary.createdAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">No property details available</div>
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
                  <div className="flex items-center gap-2">
                    {selectedDuplicate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        data-testid="btn-view-duplicate-profile"
                      >
                        <a 
                          href={selectedDuplicateGroup?.type === 'contact' 
                            ? `/person-profile/${selectedDuplicate.id}` 
                            : `/property-profile/${selectedDuplicate.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Profile
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSwapPrimary}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Swap Primary
                    </Button>
                  </div>
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
                          {selectedDuplicate.createdAt && (
                            <div className="flex items-center space-x-2 pt-2 border-t mt-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">
                                Created: {format(new Date(selectedDuplicate.createdAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedDuplicateGroup?.type === 'property' && selectedDuplicate ? (
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg">{selectedDuplicate.name}</h4>
                          <Badge className="mt-1">
                            {selectedDuplicate.type || 'Property'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <div>
                              <div>{selectedDuplicate.address1}</div>
                              {selectedDuplicate.address2 && <div>{selectedDuplicate.address2}</div>}
                              <div>{selectedDuplicate.city}, {selectedDuplicate.state} {selectedDuplicate.zip}</div>
                            </div>
                          </div>
                          
                          {selectedDuplicate.accountId && (
                            <div className="flex items-center space-x-2">
                              <Building className="w-4 h-4 text-gray-500" />
                              <span>Account ID: {selectedDuplicate.accountId}</span>
                            </div>
                          )}
                          
                          {selectedDuplicate.status && (
                            <div className="flex items-center space-x-2">
                              <Badge variant={selectedDuplicate.status === 'occupied' ? 'default' : 'secondary'}>
                                Status: {selectedDuplicate.status}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="text-gray-600">
                            Units: {selectedDuplicate.units ?? 1}
                          </div>
                          
                          <div className="text-gray-600">
                            Square Footage: {selectedDuplicate.squareFootage?.toLocaleString() ?? 'N/A'} {selectedDuplicate.squareFootage ? 'sq ft' : ''}
                          </div>
                          
                          {selectedDuplicate.createdAt && (
                            <div className="flex items-center space-x-2 pt-2 border-t mt-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">
                                Created: {format(new Date(selectedDuplicate.createdAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">No property details available</div>
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
                onClick={handleIgnoreDuplicate}
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

      {/* Cleanup Confirmation Dialog */}
      <Dialog open={cleanupConfirmOpen} onOpenChange={setCleanupConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Confirm Cleanup</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">
                {cleanupType === 'ignored' && `You are about to delete all ignored duplicate records older than ${cleanupDaysOld} days.`}
                {cleanupType === 'history' && `You are about to delete all duplicate action history older than ${cleanupDaysOld} days.`}
                {cleanupType === 'all' && `You are about to delete all ignored duplicates AND history records older than ${cleanupDaysOld} days.`}
              </p>
              <p className="text-sm text-red-900 mt-2 font-semibold">
                This action cannot be undone.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to proceed?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCleanupConfirmOpen(false)}
              disabled={cleanupMutation.isPending}
              data-testid="btn-cancel-cleanup"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleanupMutation.isPending}
              data-testid="btn-confirm-cleanup"
            >
              {cleanupMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirm Cleanup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}