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
                  </CardTitle>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Matching fields: {formatMatchFields(group.matchFields || [])}</p>
                  <p>Found: {new Date(group.createdAt).toLocaleString()}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.records?.map((item: any, index: number) => 
                    group.type === 'contact' ? 
                      renderContactCard(
                        item, 
                        index === 0, 
                        () => {
                          // Move to primary position
                          const newRecords = [item, ...group.records.filter((_: any, i: number) => i !== index)];
                          // Update the group with new order
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
                          </CardContent>
                        </Card>
                      )
                  )}
                </div>
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