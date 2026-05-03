import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import type { TaskChecklistItem } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import EnhancedChecklist from "@/components/EnhancedChecklist";
import { PhotoAnnotationEditor } from "@/components/PhotoAnnotationEditor";
import { formatRecurrenceRule } from "@/lib/rruleUtils";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  CheckSquare,
  CheckCircle,
  AlertCircle,
  FileText,
  MessageSquare,
  Edit,
  Save,
  X,
  MapPin,
  Phone,
  Mail,
  Tag,
  History,
  Paperclip,
  Link,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Timer,
  Users,
  Target,
  BookOpen,
  Check,
  ChevronsUpDown,
  Repeat,
  Archive,
  Settings,
  AlertTriangle,
  Info,
  XCircle,
  Star,
  Wrench,
  ClipboardCheck,
  MinusCircle,
  ExternalLink,
  ChevronDown,
  Camera,
  Pencil
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Cascaded Client Alerts Display Component
function CascadedClientAlertsDisplay({ taskId }: { taskId: string }) {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: [`/api/alerts/cascaded/task/${taskId}`],
    enabled: !!taskId,
  });

  const severityConfig = {
    info: {
      icon: Info,
      className: "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
      iconClassName: "text-blue-500",
    },
    warning: {
      icon: AlertTriangle,
      className: "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100",
      iconClassName: "text-yellow-500",
    },
    error: {
      icon: AlertCircle,
      className: "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
      iconClassName: "text-orange-500",
    },
    critical: {
      icon: XCircle,
      className: "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
      iconClassName: "text-red-500",
    },
  };

  if (isLoading || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6" data-testid="cascaded-alerts-container">
      {alerts.map((alert: any) => {
        const config = severityConfig[alert.severity as keyof typeof severityConfig];
        const Icon = config.icon;

        return (
          <Alert key={alert.id} className={config.className} data-testid={`cascaded-alert-${alert.id}`}>
            <Icon className={`h-4 w-4 ${config.iconClassName}`} />
            <div className="flex items-start justify-between w-full">
              <div className="flex-1">
                <AlertTitle className="capitalize" data-testid={`cascaded-alert-title-${alert.id}`}>
                  {alert.severity} - Client Alert
                </AlertTitle>
                <AlertDescription data-testid={`cascaded-alert-message-${alert.id}`}>
                  {alert.message}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}

// Vendor Information Card Component
function VendorInformationCard({ task, onUpdate }: { task: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);
  const [vendorSearchValue, setVendorSearchValue] = useState("");
  const [editForm, setEditForm] = useState({
    vendorId: task.vendorId || "",
    vendorNotes: task.vendorNotes || "",
    vendorSatisfactionRating: task.vendorSatisfactionRating || null,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/contacts'],
    select: (data: any[]) => data.filter((c: any) => c.type === 'vendor'),
  });

  const { data: propertyVendors = [] } = useQuery({
    queryKey: [`/api/properties/${task.propertyId}/vendors`],
    enabled: !!task.propertyId,
  });

  const sortedVendors = useMemo(() => {
    if (!Array.isArray(vendors) || !Array.isArray(propertyVendors)) return vendors;
    const preferredVendorIds = new Set((propertyVendors as any[]).map((pv: any) => pv.vendorId));
    const preferred = vendors.filter((v: any) => preferredVendorIds.has(v.id));
    const others = vendors.filter((v: any) => !preferredVendorIds.has(v.id));
    return [...preferred, ...others];
  }, [vendors, propertyVendors]);

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest('PATCH', `/api/tasks/${task.id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Vendor information updated",
        description: "Changes saved successfully",
      });
      setIsEditing(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vendor information",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateTaskMutation.mutate({
      vendorId: editForm.vendorId || null,
      vendorNotes: editForm.vendorNotes,
      vendorSatisfactionRating: editForm.vendorSatisfactionRating,
    });
  };

  const handleCancel = () => {
    setEditForm({
      vendorId: task.vendorId || "",
      vendorNotes: task.vendorNotes || "",
      vendorSatisfactionRating: task.vendorSatisfactionRating || null,
    });
    setIsEditing(false);
  };

  const renderStars = (rating: number | null, isEditable: boolean = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => isEditable && setEditForm({ ...editForm, vendorSatisfactionRating: star })}
            className={`${isEditable ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
            disabled={!isEditable}
            data-testid={`star-${star}`}
          >
            <Star
              className={`w-5 h-5 ${
                rating && star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-slate-300'
              }`}
            />
          </button>
        ))}
        {rating && <span className="ml-2 text-sm text-slate-600">({rating}/5)</span>}
      </div>
    );
  };

  return (
    <Card data-testid="vendor-information-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Wrench className="w-5 h-5 mr-2" />
            Vendor Information
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              data-testid="button-edit-vendor"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="vendor-select">Select Vendor</Label>
              <Popover open={vendorSearchOpen} onOpenChange={setVendorSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={vendorSearchOpen}
                    className="w-full justify-between h-auto min-h-[40px]"
                    data-testid="button-select-vendor-card"
                  >
                    {editForm.vendorId ? (
                      <div className="flex items-center gap-2 text-left">
                        {(() => {
                          const selectedVendor = sortedVendors.find((v: any) => v.id.toString() === editForm.vendorId);
                          if (!selectedVendor) return <span className="text-slate-500">Select vendor...</span>;
                          const isPreferred = (propertyVendors as any[]).some((pv: any) => pv.vendorId === selectedVendor.id);
                          return (
                            <>
                              {isPreferred ? (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                              ) : (
                                <Wrench className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                              <div className="flex flex-col items-start">
                                <span className="truncate font-medium">
                                  {selectedVendor.firstName} {selectedVendor.lastName}
                                  {isPreferred && <span className="text-xs text-yellow-600 ml-1">(Preferred)</span>}
                                </span>
                                {selectedVendor.vendorType && (
                                  <span className="text-xs text-slate-500">{selectedVendor.vendorType}</span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-slate-500">Select vendor...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search vendors..." 
                      value={vendorSearchValue}
                      onValueChange={setVendorSearchValue}
                    />
                    <CommandEmpty>No vendors found</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          setEditForm({ ...editForm, vendorId: "" });
                          setVendorSearchOpen(false);
                        }}
                      >
                        <X className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="text-slate-600">No vendor</span>
                      </CommandItem>
                      {sortedVendors.map((vendor: any) => {
                        const isPreferred = (propertyVendors as any[]).some((pv: any) => pv.vendorId === vendor.id);
                        const vendorName = `${vendor.firstName} ${vendor.lastName}`;
                        return (
                          <CommandItem
                            key={vendor.id}
                            value={`${vendorName} ${vendor.vendorType || ''}`}
                            onSelect={() => {
                              setEditForm({ ...editForm, vendorId: vendor.id.toString() });
                              setVendorSearchOpen(false);
                            }}
                          >
                            {isPreferred ? (
                              <Star className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <Wrench className="w-4 h-4 mr-2 text-slate-500" />
                            )}
                            <div className="flex flex-col">
                              <div className="font-medium flex items-center gap-1">
                                {vendorName}
                                {isPreferred && <span className="text-xs text-yellow-600">(Preferred)</span>}
                              </div>
                              {vendor.vendorType && <div className="text-xs text-slate-500">{vendor.vendorType}</div>}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="vendor-notes">Vendor Notes</Label>
              <Textarea
                id="vendor-notes"
                placeholder="Add notes about vendor work, estimates, or details..."
                value={editForm.vendorNotes}
                onChange={(e) => setEditForm({ ...editForm, vendorNotes: e.target.value })}
                rows={4}
                data-testid="textarea-vendor-notes"
              />
            </div>

            <div>
              <Label>Vendor Satisfaction Rating</Label>
              <div className="mt-2">
                {renderStars(editForm.vendorSatisfactionRating, true)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Rate the vendor's work quality and professionalism</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={updateTaskMutation.isPending}
                data-testid="button-save-vendor"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateTaskMutation.isPending}
                data-testid="button-cancel-vendor"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {task.vendor ? (
              <>
                <div>
                  <Label className="text-sm font-medium text-slate-500">Vendor</Label>
                  <Button
                    variant="link"
                    className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                    onClick={() => navigate(`/person-profile/${task.vendor.id}`)}
                    data-testid="link-task-vendor"
                  >
                    {task.vendor.firstName} {task.vendor.lastName}
                  </Button>
                </div>
                {task.vendor.vendorType && (
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Type</Label>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {task.vendor.vendorType}
                    </Badge>
                  </div>
                )}
                {task.vendor.email && (
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Email</Label>
                    <p className="text-slate-700 text-sm">
                      <a href={`mailto:${task.vendor.email}`} className="text-blue-600 hover:text-blue-800">
                        {task.vendor.email}
                      </a>
                    </p>
                  </div>
                )}
                {task.vendor.phone && (
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Phone</Label>
                    <p className="text-slate-700 text-sm">
                      <a href={`tel:${task.vendor.phone}`} className="text-blue-600 hover:text-blue-800">
                        {task.vendor.phone}
                      </a>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500 italic">No vendor assigned yet</div>
            )}

            {task.vendorNotes && (
              <div>
                <Label className="text-sm font-medium text-slate-500">Notes</Label>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">{task.vendorNotes}</p>
              </div>
            )}

            {task.vendorSatisfactionRating && (
              <div>
                <Label className="text-sm font-medium text-slate-500">Satisfaction Rating</Label>
                <div className="mt-1">
                  {renderStars(task.vendorSatisfactionRating, false)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TaskProfile() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [match, params] = useRoute("/task-profile/:id");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "",
    status: "",
    dueDate: "",
    assignedTo: "",
    timeEstimate: "",
    category: "",
    isRecurring: false,
    recurrenceFrequency: "",
    propertyId: "",
    billedSeparately: false,
    billingAmount: "",
    roomId: "none",
    clientId: "",
    vendorId: "",
    vendorNeeded: false,
    tags: "",
    customFieldValues: {} as Record<string, any>
  });
  const [checklistItems, setChecklistItems] = useState<Array<{
    id: string;
    text: string;
    completed: boolean;
    dueDate?: Date;
    assignedToId?: string;
    priority: 'urgent' | 'high' | 'normal' | 'low';
    notes?: string;
    sortOrder: number;
  }>>([]);
  const [attachments, setAttachments] = useState<Array<{id: string, name: string, size: string, type: string}>>([]);
  const [photoAttachments, setPhotoAttachments] = useState<Array<{url: string, filename: string, category?: 'before' | 'after' | null}>>([]);
  const [isDragOverPhotos, setIsDragOverPhotos] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [beforeAfterMode, setBeforeAfterMode] = useState(false);
  const [quickLinks, setQuickLinks] = useState<Array<{id: string, label: string, url: string}>>([]);
  const [newQuickLink, setNewQuickLink] = useState({label: "", url: ""});
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [conflictData, setConflictData] = useState<any>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [propertySearchValue, setPropertySearchValue] = useState("");
  const [contactSearchOpen, setContactSearchOpen] = useState(false);
  const [contactSearchValue, setContactSearchValue] = useState("");
  const [clientSearchOpenEditModal, setClientSearchOpenEditModal] = useState(false);
  const [clientSearchValueEditModal, setClientSearchValueEditModal] = useState("");
  const [vendorSearchOpenEditModal, setVendorSearchOpenEditModal] = useState(false);
  const [vendorSearchValueEditModal, setVendorSearchValueEditModal] = useState("");
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [newPropertyForm, setNewPropertyForm] = useState({
    name: "",
    address1: "",
    city: "",
    state: "",
    zip: "",
    type: "residential",
  });
  const [newContactForm, setNewContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    type: "owner",
  });
  const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);
  const [pendingTaskUpdate, setPendingTaskUpdate] = useState<any>(null);
  const [billingSubmissionAmount, setBillingSubmissionAmount] = useState("");
  const [isTemplateConfirmOpen, setIsTemplateConfirmOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [propertyComboboxOpen, setPropertyComboboxOpen] = useState(false);
  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false);
  const [newInspectionItemText, setNewInspectionItemText] = useState("");
  const [newInspectionItemCategory, setNewInspectionItemCategory] = useState("");
  const [editingNoteItemId, setEditingNoteItemId] = useState<number | null>(null);
  const [noteInputValue, setNoteInputValue] = useState("");
  const [uploadingPhotoItemId, setUploadingPhotoItemId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoTargetItemId, setPhotoTargetItemId] = useState<string | null>(null);
  const [annotatingPhoto, setAnnotatingPhoto] = useState<
    | { url: string; source: "task"; index: number }
    | { url: string; source: "checklist"; itemId: string; currentUrls: string[]; currentThumbnailUrls: string[] }
    | null
  >(null);

  // Task templates
  const taskTemplates = {
    "open-property": {
      title: "Open Property Checklist",
      category: "inspection",
      priority: "normal",
      description: "Prepare a property for owner arrival or occupancy",
      timeEstimate: "0 days 2 hours 0 minutes",
      checklist: [
        { id: "1", text: "Unlock gates and entry doors", completed: false },
        { id: "2", text: "Remove security devices (covers, locks, barriers)", completed: false },
        { id: "3", text: "Turn on exterior lighting and landscape systems", completed: false },
        { id: "4", text: "Inspect driveway, paths, and pool area for debris", completed: false },
        { id: "5", text: "Turn on main water supply", completed: false },
        { id: "6", text: "Turn on water heater and confirm power source", completed: false },
        { id: "7", text: "Turn on electricity breakers (note any tripped circuits)", completed: false },
        { id: "8", text: "Turn on HVAC and set thermostat to owner preference", completed: false },
        { id: "9", text: "Open blinds/curtains for natural light", completed: false },
        { id: "10", text: "Test all lights, ceiling fans, and switches", completed: false },
        { id: "11", text: "Check refrigerator, freezer, and appliances", completed: false },
        { id: "12", text: "Run faucets/toilets briefly to flush standing water", completed: false },
        { id: "13", text: "Test smoke and CO detectors", completed: false },
        { id: "14", text: "Inspect fire extinguishers and expiration dates", completed: false },
        { id: "15", text: "Ensure security alarm system is functional", completed: false },
        { id: "16", text: "Place welcome note or owner supplies", completed: false },
        { id: "17", text: "Report any issues or needed repairs", completed: false },
        { id: "18", text: "Lock up and confirm alarm re-armed upon exit", completed: false }
      ]
    },
    "close-property": {
      title: "Close Property Checklist",
      category: "inspection",
      priority: "normal",
      description: "Secure and prepare property for vacancy",
      timeEstimate: "0 days 2 hours 0 minutes",
      checklist: [
        { id: "1", text: "Turn off main water supply", completed: false },
        { id: "2", text: "Drain water lines if required", completed: false },
        { id: "3", text: "Set water heater to vacation/off mode", completed: false },
        { id: "4", text: "Adjust HVAC to energy-efficient temperature", completed: false },
        { id: "5", text: "Unplug non-essential appliances", completed: false },
        { id: "6", text: "Close blinds/curtains as directed", completed: false },
        { id: "7", text: "Empty refrigerator/freezer if long-term vacancy", completed: false },
        { id: "8", text: "Confirm all doors/windows locked", completed: false },
        { id: "9", text: "Remove perishable items and trash", completed: false },
        { id: "10", text: "Store outdoor furniture, cushions, umbrellas", completed: false },
        { id: "11", text: "Turn off irrigation if instructed", completed: false },
        { id: "12", text: "Secure gates and garage doors", completed: false },
        { id: "13", text: "Cover or secure pool and spa", completed: false },
        { id: "14", text: "Arm alarm and confirm monitoring status", completed: false },
        { id: "15", text: "Leave key and access instructions securely stored", completed: false },
        { id: "16", text: "Take final photos of each room and exterior", completed: false },
        { id: "17", text: "Log readings for electricity, water, or gas", completed: false },
        { id: "18", text: "Submit closing report", completed: false }
      ]
    },
    "property-inspection": {
      title: "Property Inspection Checklist",
      category: "inspection",
      priority: "normal",
      description: "Routine check for maintenance, security, and system health",
      timeEstimate: "0 days 1 hours 30 minutes",
      checklist: [
        { id: "1", text: "Inspect roof, gutters, and downspouts", completed: false },
        { id: "2", text: "Check for storm damage or debris", completed: false },
        { id: "3", text: "Examine pool/spa condition", completed: false },
        { id: "4", text: "Look for pests, rodents, or animal activity", completed: false },
        { id: "5", text: "Check for leaks, mold, or water stains", completed: false },
        { id: "6", text: "Test all lights and ceiling fans", completed: false },
        { id: "7", text: "Ensure HVAC functioning properly", completed: false },
        { id: "8", text: "Flush toilets and run faucets to prevent stagnation", completed: false },
        { id: "9", text: "Verify windows/doors are locked and sealed", completed: false },
        { id: "10", text: "Run dishwasher, washing machine (short cycle) monthly", completed: false },
        { id: "11", text: "Confirm refrigerator/freezer temperature", completed: false },
        { id: "12", text: "Check smoke/CO detectors and batteries", completed: false },
        { id: "13", text: "Test security system or cameras", completed: false },
        { id: "14", text: "Take time-stamped photos of key areas", completed: false },
        { id: "15", text: "Note maintenance needs or issues", completed: false },
        { id: "16", text: "Send report to client with recommendations", completed: false }
      ]
    },
    "storm-preparation": {
      title: "Storm Preparation Checklist",
      category: "maintenance",
      priority: "urgent",
      description: "Ready the property for hurricanes or severe weather",
      timeEstimate: "0 days 3 hours 0 minutes",
      checklist: [
        { id: "1", text: "Bring in outdoor furniture, planters, décor", completed: false },
        { id: "2", text: "Secure loose items (grill, hoses, etc.)", completed: false },
        { id: "3", text: "Lower or secure hurricane shutters", completed: false },
        { id: "4", text: "Check generator fuel and operation", completed: false },
        { id: "5", text: "Unplug electronics and sensitive devices", completed: false },
        { id: "6", text: "Move valuables and paperwork to safe location", completed: false },
        { id: "7", text: "Close interior doors to reduce pressure shifts", completed: false },
        { id: "8", text: "Turn off main water supply if necessary", completed: false },
        { id: "9", text: "Set HVAC to safe level", completed: false },
        { id: "10", text: "Backup alarm system power (if available)", completed: false },
        { id: "11", text: "Document pre-storm condition with photos", completed: false },
        { id: "12", text: "Notify client when prep is complete", completed: false }
      ]
    },
    "post-storm-inspection": {
      title: "Post-Storm Inspection Checklist",
      category: "inspection",
      priority: "high",
      description: "Evaluate and document condition after severe weather",
      timeEstimate: "0 days 2 hours 0 minutes",
      checklist: [
        { id: "1", text: "Inspect roof, siding, and gutters for damage", completed: false },
        { id: "2", text: "Check pool and yard for debris", completed: false },
        { id: "3", text: "Verify windows, shutters, and doors for impact damage", completed: false },
        { id: "4", text: "Confirm fencing and gates intact", completed: false },
        { id: "5", text: "Check for leaks, water intrusion, or dampness", completed: false },
        { id: "6", text: "Inspect ceilings and floors for stains or swelling", completed: false },
        { id: "7", text: "Confirm power restored and systems operational", completed: false },
        { id: "8", text: "Take photos before cleanup", completed: false },
        { id: "9", text: "Record any damage or insurance-related details", completed: false },
        { id: "10", text: "Send client report with next steps", completed: false }
      ]
    },
    "maintenance-followup": {
      title: "Maintenance Follow-Up Checklist",
      category: "maintenance",
      priority: "normal",
      description: "Manage ongoing or recurring service tasks",
      timeEstimate: "0 days 1 hours 0 minutes",
      checklist: [
        { id: "1", text: "Confirm date/time with vendor", completed: false },
        { id: "2", text: "Verify access details and lockbox codes", completed: false },
        { id: "3", text: "Notify client if they requested updates", completed: false },
        { id: "4", text: "Meet vendor if required", completed: false },
        { id: "5", text: "Observe completion of work", completed: false },
        { id: "6", text: "Confirm cleanup and restore access", completed: false },
        { id: "7", text: "Take photos of completed work", completed: false },
        { id: "8", text: "Collect and file invoices", completed: false },
        { id: "9", text: "Mark maintenance log as complete", completed: false }
      ]
    }
  };

  // Get task ID from route params
  const taskId = params?.id;

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

  // Fetch task details
  const { data: task, isLoading: taskLoading, refetch } = useQuery({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: isAuthenticated && !!taskId,
  });

  // Track if form has been initialized for current modal session
  const formInitialized = useRef(false);

  // Reset initialization flag when modal closes
  useEffect(() => {
    if (!isEditModalOpen) {
      formInitialized.current = false;
    }
  }, [isEditModalOpen]);

  // Populate editForm when modal opens - only populate once per session to avoid overwriting user edits
  useEffect(() => {
    if (isEditModalOpen && taskId && task && !formInitialized.current) {
      // Populate form from task data
      setEditForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "",
        status: task.status || "",
        dueDate: task.dueDate || "",
        assignedTo: task.assignedTo?.toString() || "",
        timeEstimate: task.timeEstimate || "",
        category: task.category || "",
        isRecurring: task.isRecurring || false,
        recurrenceFrequency: task.recurrenceFrequency || "",
        propertyId: task.propertyId?.toString() || "",
        billedSeparately: task.billedSeparately || false,
        billingAmount: task.billingAmount?.toString() || "",
        roomId: task.roomId?.toString() || "none",
        clientId: task.clientId || "",
        vendorId: task.vendorId?.toString() || "",
        vendorNeeded: task.vendorNeeded || false,
        tags: task.tags || "",
        customFieldValues: task.customFieldValues || {}
      });

      // Mark as initialized
      formInitialized.current = true;

      // Refetch task data in background to ensure cache is fresh for next time
      // This updates the cache but does NOT repopulate the form to avoid overwriting user edits
      queryClient.refetchQueries({ queryKey: [`/api/tasks/${taskId}`] });
    }
  }, [isEditModalOpen, taskId, task, queryClient]);

  // Fetch task comments/notes
  const { data: fetchedComments } = useQuery({
    queryKey: [`/api/tasks/${taskId}/comments`],
    enabled: isAuthenticated && !!taskId,
  });

  // Fetch task history
  const { data: history } = useQuery({
    queryKey: [`/api/tasks/${taskId}/history`],
    enabled: isAuthenticated && !!taskId,
  });

  // Fetch properties for association
  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
  });

  // Fetch users for task assignment
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  // Fetch contacts for property association
  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
  });

  // Fetch vendors for task assignment
  const vendors = (contacts as any[])?.filter((c: any) => c.type === 'vendor') || [];

  // Fetch rooms for the property associated with this task
  const { data: rooms } = useQuery({
    queryKey: ["/api/rooms/property", (task as any)?.propertyId],
    enabled: isAuthenticated && !!(task as any)?.propertyId,
  });

  // Fetch property vendors for the property associated with this task (for sorting in vendor dropdown)
  const { data: propertyVendors = [] } = useQuery({
    queryKey: [`/api/properties/${editForm.propertyId}/vendors`],
    enabled: isAuthenticated && !!editForm.propertyId,
  });

  // Create a sorted vendors list with preferred vendors (property vendors) first
  const sortedVendors = useMemo(() => {
    if (!vendors || vendors.length === 0) return [];
    
    const preferredVendorIds = new Set((propertyVendors as any[]).map((pv: any) => pv.vendorId));
    const preferred = vendors.filter((v: any) => preferredVendorIds.has(v.id));
    const others = vendors.filter((v: any) => !preferredVendorIds.has(v.id));
    
    return [...preferred, ...others];
  }, [vendors, propertyVendors]);

  // Fetch contact details if task has contactId (to get accountId)
  const taskContactId = (task as any)?.contactId;
  const { data: taskContact } = useQuery({
    queryKey: [`/api/contacts/${taskContactId}`],
    enabled: isAuthenticated && !!taskContactId,
  });

  // Get linkedClientId from either task.clientId (direct) or contact.accountId (via contact)
  const directClientId = (task as any)?.clientId;
  const contactAccountId = (taskContact as any)?.accountId;
  const linkedClientId = directClientId || contactAccountId;
  
  // Fetch client details for billing check (if task has a linked client)
  const { data: linkedClient } = useQuery({
    queryKey: [`/api/clients/${linkedClientId}`],
    enabled: isAuthenticated && !!linkedClientId,
  });

  // Fetch custom fields for tasks
  const { data: customFields = [] } = useQuery<any[]>({
    queryKey: ["/api/custom-fields", "task"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/custom-fields?entityType=task");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Inspection checklist items (DB-stored, with pass/fail results)
  const { data: inspectionItems = [], refetch: refetchInspectionItems } = useQuery<any[]>({
    queryKey: [`/api/tasks/${taskId}/checklist-items`],
    enabled: isAuthenticated && !!(task as any)?.id,
  });

  const { data: checklistTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/checklist-templates"],
    enabled: isAuthenticated,
  });
  const inspectionTemplates = (checklistTemplates as any[]).filter((t: any) => t.category === "inspection");

  const updateInspectionItemMutation = useMutation({
    mutationFn: async ({ id, result, resultNote }: { id: number; result?: string; resultNote?: string }) =>
      apiRequest("PATCH", `/api/task-checklist-items/${id}`, { result, resultNote }),
    onSuccess: () => refetchInspectionItems(),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const uploadChecklistItemPhoto = async (itemId: string, file: File) => {
    setUploadingPhotoItemId(itemId);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const response = await fetch(`/api/task-checklist-items/${itemId}/photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      refetchInspectionItems();
    } catch (e: any) {
      toast({ title: "Photo upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingPhotoItemId(null);
      setPhotoTargetItemId(null);
    }
  };

  const removeChecklistItemPhoto = async (itemId: string, photoUrl: string) => {
    try {
      const response = await fetch(`/api/task-checklist-items/${itemId}/photo`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Remove failed");
      refetchInspectionItems();
    } catch (e: any) {
      toast({ title: "Failed to remove photo", description: e.message, variant: "destructive" });
    }
  };

  const handleAnnotationSave = useCallback(async (annotatedUrl: string) => {
    if (!annotatingPhoto) return;
    if (annotatingPhoto.source === "task") {
      const updatedAttachments = photoAttachments.map((p, i) =>
        i === annotatingPhoto.index ? { ...p, url: annotatedUrl } : p
      );
      const previousAttachments = photoAttachments;
      setPhotoAttachments(updatedAttachments);
      try {
        await apiRequest("PATCH", `/api/tasks/${taskId}`, { attachments: updatedAttachments });
        queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      } catch (e: any) {
        setPhotoAttachments(previousAttachments);
        toast({ title: "Failed to save annotation", description: e.message, variant: "destructive" });
      }
    } else if (annotatingPhoto.source === "checklist") {
      const replacedIndex = annotatingPhoto.currentUrls.indexOf(annotatingPhoto.url);
      const newUrls = annotatingPhoto.currentUrls.map((u) =>
        u === annotatingPhoto.url ? annotatedUrl : u
      );
      // Clear the thumbnail at the replaced index so stale imagery is not shown
      const newThumbnailUrls = annotatingPhoto.currentThumbnailUrls.map((t, i) =>
        i === replacedIndex ? "" : t
      );
      try {
        await apiRequest("PATCH", `/api/task-checklist-items/${annotatingPhoto.itemId}`, {
          photoUrls: newUrls,
          thumbnailUrls: newThumbnailUrls,
        });
        refetchInspectionItems();
      } catch (e: any) {
        toast({ title: "Failed to save annotation", description: e.message, variant: "destructive" });
      }
    }
    setAnnotatingPhoto(null);
  }, [annotatingPhoto, photoAttachments, taskId, queryClient, refetchInspectionItems]);

  const addInspectionItemMutation = useMutation({
    mutationFn: async ({ text, category }: { text: string; category?: string }) =>
      apiRequest("POST", `/api/tasks/${taskId}/checklist-items`, { text, required: false, category: category || undefined }),
    onSuccess: () => {
      refetchInspectionItems();
      setNewInspectionItemText("");
      setNewInspectionItemCategory("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteInspectionItemMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/task-checklist-items/${id}`, {}),
    onSuccess: () => refetchInspectionItems(),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) =>
      apiRequest("POST", `/api/tasks/${taskId}/apply-checklist-template`, { templateId }),
    onSuccess: () => {
      refetchInspectionItems();
      setIsApplyTemplateOpen(false);
      toast({ title: "Template Applied", description: "Inspection checklist loaded from template." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Failed to apply template", variant: "destructive" }),
  });

  // Archive/Unarchive task mutation
  const archiveTaskMutation = useMutation({
    mutationFn: async (action: 'archive' | 'unarchive') => {
      const endpoint = action === 'unarchive' 
        ? `/api/tasks/${taskId}/unarchive` 
        : `/api/tasks/${taskId}/archive`;
      return await apiRequest("PATCH", endpoint);
    },
    onMutate: async (action) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/tasks/${taskId}`] });
      
      // Snapshot the previous value
      const previousTask = queryClient.getQueryData([`/api/tasks/${taskId}`]);
      
      // Optimistically update the cache
      queryClient.setQueryData([`/api/tasks/${taskId}`], (old: any) => ({
        ...old,
        isArchived: action === 'archive'
      }));
      
      return { previousTask };
    },
    onError: (err, action, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData([`/api/tasks/${taskId}`], context.previousTask);
      }
      toast({
        title: "Error",
        description: `Failed to ${action} task`,
        variant: "destructive",
      });
    },
    onSuccess: (data, action) => {
      // Update cache with server response
      queryClient.setQueryData([`/api/tasks/${taskId}`], data);
      
      // Invalidate all task list queries
      queryClient.invalidateQueries({ 
        predicate: ({ queryKey }) => queryKey.some((segment) => 
          typeof segment === 'string' && segment.startsWith('/api/tasks')
        )
      });
      
      toast({
        title: `Task ${action === 'archive' ? 'Archived' : 'Unarchived'}`,
        description: `Task has been ${action}d successfully`,
      });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: any) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, updatedTask);
    },
    onSuccess: async () => {
      // Refetch the task to get updated data immediately
      await queryClient.refetchQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      // Invalidate dashboard queries to update statistics
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/urgent-tasks'] });
      
      // Close the edit modal if it's open
      setIsEditModalOpen(false);
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      // Task updated successfully
    },
    onError: (error: any) => {
      console.error("Task update error:", error);
      const errorCode = error?.code || 'UNKNOWN_ERROR';
      toast({
        title: "Error",
        description: `Failed to update task (${errorCode}): ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/urgent-tasks'] });
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      
      // Navigate back to tasks list
      navigate("/tasks");
    },
    onError: (error: any) => {
      console.error("Task delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  // Comment mutations
  const createCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest("POST", `/api/tasks/${taskId}/comments`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, text }: { commentId: number; text: string }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}/comments/${commentId}`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      setEditingCommentId(null);
      setEditingCommentText("");
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}/comments/${commentId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  // Billing submission mutation
  const createBillingSubmissionMutation = useMutation({
    mutationFn: async (data: { clientId: string; amountCents: number; description: string }) => {
      return await apiRequest("POST", "/api/billing-submissions", {
        clientId: data.clientId,
        sourceType: "task",
        sourceId: taskId,
        amountCents: data.amountCents,
        description: data.description,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-submissions"] });
      toast({
        title: "Success",
        description: "Task submitted for billing review",
      });
      setIsBillingDialogOpen(false);
      setBillingSubmissionAmount("");
    },
    onError: (error: any) => {
      console.error("Billing submission error:", error);
      toast({
        title: "Error",
        description: "Failed to submit for billing",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTask = () => {
    if (deleteConfirmText === "DELETE") {
      deleteTaskMutation.mutate();
      setIsDeleteModalOpen(false);
      setDeleteConfirmText("");
    } else {
      toast({
        title: "Invalid confirmation",
        description: "Please type DELETE in all capitals to confirm",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (task) {
      // Format due date for datetime-local input
      const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      // Convert existing time estimate to duration format if needed
      let timeEstimate = (task as any).timeEstimate || '';
      if (timeEstimate && !timeEstimate.includes('days') && !timeEstimate.includes('hours') && !timeEstimate.includes('minutes')) {
        // Convert old format like "45 minutes" to new format
        if (timeEstimate.includes('minute')) {
          const minutes = timeEstimate.match(/\d+/)?.[0] || '0';
          timeEstimate = `0 days 0 hours ${minutes} minutes`;
        } else if (timeEstimate.includes('hour')) {
          const hours = timeEstimate.match(/\d+/)?.[0] || '0';
          timeEstimate = `0 days ${hours} hours 0 minutes`;
        } else {
          timeEstimate = '0 days 0 hours 0 minutes';
        }
      } else if (!timeEstimate) {
        timeEstimate = '0 days 0 hours 0 minutes';
      }

      setEditForm({
        title: (task as any).title || "",
        description: (task as any).description || "",
        priority: (task as any).priority || "normal",
        status: (task as any).status || "pending",
        dueDate: formatDateForInput((task as any).dueDate) || "",
        assignedTo: (task as any).assignedToId || "",
        timeEstimate: timeEstimate,
        category: (task as any).category || "",
        isRecurring: (task as any).isRecurring || false,
        recurrenceFrequency: (task as any).recurrenceFrequency || "",
        propertyId: (task as any).propertyId?.toString() || "",
        billedSeparately: (task as any).billedSeparately || false,
        billingAmount: (task as any).billingAmount || "",
        roomId: (task as any).roomId?.toString() || "none",
        clientId: (task as any).contactId?.toString() || "",
        vendorId: (task as any).vendorId?.toString() || "",
        tags: (task as any).tags || "",
        customFieldValues: (task as any).customFieldValues || {}
      });
      
      // Initialize checklist items from task data
      const taskChecklist = (task as any).checklist || [];
      setChecklistItems(taskChecklist.map((item: any, index: number) => ({
        id: item.id || `item-${index}`,
        text: item.text,
        completed: item.completed || false,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        assignedToId: item.assignedToId,
        priority: item.priority || 'normal',
        notes: item.notes,
        sortOrder: index
      })));
      setAttachments((task as any).attachments || []);
      setPhotoAttachments((task as any).attachments || []);
      setQuickLinks((task as any).quickLinks || []);
    }
  }, [task]);

  const handleSave = async () => {
    // Transform form data to match API expectations
    const updateData = {
      title: editForm.title,
      description: editForm.description,
      priority: editForm.priority,
      status: editForm.status,
      dueDate: editForm.dueDate || null, // Send raw datetime-local string
      assignedToId: editForm.assignedTo || null,
      timeEstimate: editForm.timeEstimate,
      category: editForm.category,
      isRecurring: editForm.isRecurring,
      recurrenceFrequency: editForm.recurrenceFrequency,
      propertyId: editForm.propertyId ? parseInt(editForm.propertyId) : null,
      roomId: editForm.roomId && editForm.roomId !== "none" ? parseInt(editForm.roomId) : null,
      contactId: editForm.clientId ? parseInt(editForm.clientId) : null,
      vendorId: editForm.vendorId ? parseInt(editForm.vendorId) : null,
      vendorNeeded: editForm.vendorNeeded,
      billedSeparately: editForm.billedSeparately,
      billingAmount: editForm.billingAmount,
      attachments: photoAttachments,
      tags: editForm.tags,
      customFieldValues: Object.keys(editForm.customFieldValues).length > 0 ? editForm.customFieldValues : undefined,
    };

    // Check for conflicts before saving
    if (editForm.assignedTo && editForm.dueDate) {
      try {
        const conflicts = await checkForConflicts(editForm.assignedTo, editForm.dueDate, editForm.timeEstimate, (task as any)?.id);
        if (conflicts && Array.isArray(conflicts) && conflicts.length > 0) {
          setConflictData({ conflicts, updateData });
          setIsConflictModalOpen(true);
          return; // Don't save yet - let user resolve conflicts
        }
      } catch (error) {
        console.log("Conflict check failed, proceeding with save");
      }
    }

    // Check if status is changing to "completed" and task is billable
    const oldStatus = (task as any)?.status;
    const newStatus = editForm.status;
    const isBeingCompleted = oldStatus !== 'completed' && newStatus === 'completed';
    const client = linkedClient as any;
    const hasBillingEnabled = client?.billingEnabled;
    const hasTaskBilling = client?.billingTypes?.taskBased; // billingTypes is an object with boolean properties
    const isBillable = editForm.billedSeparately || (hasBillingEnabled && hasTaskBilling);

    console.log('[Billing Dialog Debug]', {
      oldStatus,
      newStatus,
      isBeingCompleted,
      linkedClientId,
      clientData: client,
      hasBillingEnabled,
      hasTaskBilling,
      billedSeparately: editForm.billedSeparately,
      isBillable,
      shouldShowDialog: isBeingCompleted && linkedClientId && isBillable
    });

    // If task is being completed and is billable, show billing dialog
    if (isBeingCompleted && linkedClientId && isBillable) {
      console.log('[Billing Dialog] Showing billing dialog');
      setPendingTaskUpdate(updateData);
      setIsBillingDialogOpen(true);
      // Pre-fill amount if task has a billingAmount
      if (editForm.billingAmount) {
        setBillingSubmissionAmount(editForm.billingAmount);
      }
      return; // Don't save yet - let user decide on billing
    }

    console.log("Sending update data:", updateData);
    updateTaskMutation.mutate(updateData);
  };

  const checkForConflicts = async (assignedUserId: string, dueDate: string, timeEstimate: string, currentTaskId?: number) => {
    try {
      const response = await apiRequest('POST', '/api/tasks/check-conflicts', {
        assignedUserId,
        dueDate,
        timeEstimate,
        excludeTaskId: currentTaskId
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const handleConflictResolution = (forceUpdate: boolean) => {
    if (forceUpdate && conflictData) {
      // User chose to proceed despite conflicts
      console.log("Forcing update despite conflicts:", conflictData.updateData);
      updateTaskMutation.mutate(conflictData.updateData);
      setIsConflictModalOpen(false);
      setConflictData(null);
    } else {
      // User chose to go back and edit
      setIsConflictModalOpen(false);
      setConflictData(null);
    }
  };

  const handleCancel = () => {
    setIsEditModalOpen(false);
    // Form will be reset by useEffect when modal reopens
  };

  const handleSubmitForBilling = () => {
    const amount = parseFloat(billingSubmissionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid billing amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Create billing submission
    createBillingSubmissionMutation.mutate({
      clientId: linkedClientId,
      amountCents: Math.round(amount * 100),
      description: `Completed Task: ${editForm.title}`,
    });

    // Also update the task status to completed
    if (pendingTaskUpdate) {
      updateTaskMutation.mutate(pendingTaskUpdate);
      setPendingTaskUpdate(null);
    }
  };

  const handleCompleteWithoutBilling = () => {
    // Just update the task without creating billing submission
    if (pendingTaskUpdate) {
      updateTaskMutation.mutate(pendingTaskUpdate);
      setPendingTaskUpdate(null);
    }
    setIsBillingDialogOpen(false);
    setBillingSubmissionAmount("");
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === "none") return;
    
    // Show confirmation dialog before applying template
    setPendingTemplateId(templateId);
    setIsTemplateConfirmOpen(true);
  };

  const applyTemplate = () => {
    if (!pendingTemplateId) return;
    
    const template = taskTemplates[pendingTemplateId as keyof typeof taskTemplates];
    if (template) {
      setEditForm({
        ...editForm,
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        timeEstimate: template.timeEstimate
      });
      setChecklistItems(template.checklist.map((item, index) => ({
        id: item.id,
        text: item.text,
        completed: item.completed,
        priority: 'normal',
        sortOrder: index
      })));
      toast({
        title: "Template Applied",
        description: `${template.title} template has been applied to the task.`,
      });
    }
    
    // Close dialog and reset
    setIsTemplateConfirmOpen(false);
    setPendingTemplateId(null);
  };

  const cancelTemplateApplication = () => {
    setIsTemplateConfirmOpen(false);
    setPendingTemplateId(null);
  };

  const handleStatusChange = (newStatus: string) => {
    updateTaskMutation.mutate({ status: newStatus }, {
      onSuccess: () => {
        // Invalidate dashboard queries when status changes
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/urgent-tasks'] });
      }
    });
  };



  const addQuickLink = () => {
    if (newQuickLink.label.trim() && newQuickLink.url.trim()) {
      const newLink = {
        id: Date.now().toString(),
        ...newQuickLink
      };
      setQuickLinks([...quickLinks, newLink]);
      setNewQuickLink({label: "", url: ""});
    }
  };

  const removeQuickLink = (id: string) => {
    setQuickLinks(quickLinks.filter(link => link.id !== id));
  };

  const addComment = () => {
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment.trim());
    }
  };

  const startEditComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const saveEditComment = () => {
    if (editingCommentId && editingCommentText.trim()) {
      updateCommentMutation.mutate({ 
        commentId: editingCommentId, 
        text: editingCommentText.trim() 
      });
    }
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsFileUploading(true);
      
      // Process each file
      Array.from(files).forEach((file) => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 10MB limit`,
            variant: "destructive",
          });
          return;
        }

        // Add file to attachments list with a unique ID
        const newAttachment = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type,
        };

        setAttachments(prev => [...prev, newAttachment]);
      });

      setIsFileUploading(false);
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) added successfully`,
      });

      // Clear the input
      event.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(file => file.id !== id));
    toast({
      title: "File removed",
      description: "Attachment has been removed",
    });
  };

  // Photo attachment handlers
  const handlePhotoUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Allow image files only
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        return false;
      }
      
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    setIsPhotoUploading(true);

    try {
      const uploadedPhotos: Array<{url: string, filename: string, category?: 'before' | 'after' | null}> = [];

      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('directory', '.private/task-attachments');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const uploadData = await uploadResponse.json();
        if (uploadData.urls && uploadData.urls.length > 0) {
          uploadedPhotos.push({
            url: uploadData.urls[0],
            filename: file.name,
            category: null
          });
        }
      }

      if (uploadedPhotos.length > 0) {
        setPhotoAttachments(prev => [...prev, ...uploadedPhotos]);
        toast({
          title: "Photos Uploaded",
          description: `${uploadedPhotos.length} photo(s) uploaded successfully.`,
        });
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPhotos(true);
  };

  const handlePhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPhotos(false);
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPhotos(false);

    if (e.dataTransfer.files) {
      handlePhotoUpload(e.dataTransfer.files);
    }
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handlePhotoUpload(e.target.files);
      e.target.value = ''; // Clear input
    }
  };

  const removePhotoAttachment = (index: number) => {
    setPhotoAttachments(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Photo Removed",
      description: "Attachment has been removed",
    });
  };

  const updatePhotoCategory = (index: number, category: 'before' | 'after' | null) => {
    setPhotoAttachments(prev => prev.map((photo, i) => 
      i === index ? { ...photo, category } : photo
    ));
  };

  // Create property mutation
  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData: any) => {
      const response = await apiRequest("POST", "/api/properties", propertyData);
      const newProperty = await response.json();
      // Immediately assign the property to the task
      await apiRequest("PATCH", `/api/tasks/${taskId}`, { propertyId: newProperty.id });
      return newProperty;
    },
    onSuccess: async (newProperty) => {
      // Refetch the task to get the updated property
      await queryClient.refetchQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Property created and assigned successfully",
      });
      setIsNewPropertyModalOpen(false);
      setPropertySearchOpen(false);
      setPropertySearchValue("");
      setNewPropertyForm({
        name: "",
        address1: "",
        city: "",
        state: "",
        zip: "",
        type: "residential",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create property",
        variant: "destructive",
      });
    },
  });

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      const response = await apiRequest("POST", "/api/contacts", contactData);
      const newContact = await response.json();
      // Immediately assign the contact to the task
      await apiRequest("PATCH", `/api/tasks/${taskId}`, { contactId: newContact.id });
      return newContact;
    },
    onSuccess: async (newContact) => {
      // Refetch the task to get the updated contact
      await queryClient.refetchQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Client created and assigned successfully",
      });
      setIsNewContactModalOpen(false);
      setContactSearchOpen(false);
      setContactSearchValue("");
      setNewContactForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        type: "owner",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const handleCreateProperty = () => {
    if (!newPropertyForm.name || !newPropertyForm.address1 || !newPropertyForm.city || !newPropertyForm.state || !newPropertyForm.zip) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createPropertyMutation.mutate(newPropertyForm);
  };

  const handleCreateContact = () => {
    if (!newContactForm.firstName || !newContactForm.lastName) {
      toast({
        title: "Validation Error",
        description: "Please provide first and last name",
        variant: "destructive",
      });
      return;
    }
    createContactMutation.mutate(newContactForm);
  };

  const handlePropertyAssociation = (propertyId: string) => {
    const updatedTask = { propertyId: propertyId === "none" ? null : parseInt(propertyId) };
    updateTaskMutation.mutate(updatedTask);
  };

  const handleUserAssignment = (userId: string) => {
    const updatedTask = { assignedToId: userId === "none" ? null : userId };
    updateTaskMutation.mutate(updatedTask);
  };

  const handleContactAssociation = (contactId: string) => {
    const updatedTask = { contactId: contactId === "none" ? null : parseInt(contactId) };
    updateTaskMutation.mutate(updatedTask);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "secondary";
      case "normal":
        return "outline";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading || taskLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Task Not Found</h2>
          <p className="text-slate-600 mb-4">The task you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate("/tasks")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Simplified Header */}
      <div className="mb-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/tasks")}
            className="text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </div>

        {/* Task Header */}
        <div className="flex items-start gap-6">
          {/* Task Title and Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-slate-900 truncate">
                    {(task as any).title}
                  </h1>
                  {(task as any).isTemplate && (
                    <Badge variant="secondary" className="shrink-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                      Template
                    </Badge>
                  )}
                  {(task as any).templateTaskId && !(task as any).isTemplate && (
                    <Badge variant="secondary" className="shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Instance
                    </Badge>
                  )}
                </div>
                
                {(task as any).isTemplate && (task as any).recurrenceRule && (
                  <div className="text-sm text-slate-600 mb-3 flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    <span>{formatRecurrenceRule((task as any).recurrenceRule)}</span>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={getPriorityColor((task as any).priority)} className="capitalize">
                    {(task as any).priority}
                  </Badge>
                  <Badge variant={getStatusColor((task as any).status)} className="capitalize">
                    {(task as any).status ? String((task as any).status).replace('_', ' ') : 'pending'}
                  </Badge>
                  {(task as any).dueDate && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>Due {formatDate((task as any).dueDate)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex-shrink-0 flex gap-2">
                {/* Complete Task Button */}
                {(task as any).status !== 'completed' && (
                  <Button
                    variant="default"
                    onClick={async () => {
                      // Mark task as completed
                      const updateData = {
                        status: 'completed',
                        completedAt: new Date().toISOString()
                      };
                      
                      // Check if task is billable (has contact and property)
                      const isBillable = !!(task as any).contactId && !!(task as any).propertyId;
                      
                      if (isBillable) {
                        // Store update for later and navigate to billing submission
                        setPendingTaskUpdate(updateData);
                        setIsSubmissionModalOpen(true);
                      } else {
                        // Just update the task
                        updateTaskMutation.mutate(updateData);
                        toast({
                          title: "Task Completed",
                          description: "Task has been marked as completed",
                        });
                      }
                    }}
                    data-testid="button-complete-task"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Task
                  </Button>
                )}
                
                {/* Archive/Unarchive Button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    const action = (task as any).isArchived ? 'unarchive' : 'archive';
                    archiveTaskMutation.mutate(action);
                  }}
                  disabled={archiveTaskMutation.isPending}
                  data-testid={(task as any).isArchived ? "button-unarchive-task" : "button-archive-task"}
                >
                  {archiveTaskMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4 mr-2" />
                  )}
                  {(task as any).isArchived ? "Unarchive Task" : "Archive Task"}
                </Button>
                
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-edit-task">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
                    <DialogHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <DialogTitle>Edit Task</DialogTitle>
                          <DialogDescription>
                            Update task details, checklist items, and other information.
                          </DialogDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="task-template" className="text-sm font-medium">Template:</Label>
                          <Select onValueChange={handleTemplateSelect}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Template</SelectItem>
                              <SelectItem value="open-property">Open Property Checklist</SelectItem>
                              <SelectItem value="close-property">Close Property Checklist</SelectItem>
                              <SelectItem value="property-inspection">Property Inspection Checklist</SelectItem>
                              <SelectItem value="storm-preparation">Storm Preparation Checklist</SelectItem>
                              <SelectItem value="post-storm-inspection">Post-Storm Inspection Checklist</SelectItem>
                              <SelectItem value="maintenance-followup">Maintenance Follow-Up Checklist</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DialogHeader>
                    
                    {/* Edit Modal Content */}
                    <div className="space-y-6 py-4 min-h-[600px]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-title">Task Name</Label>
                      <Input
                        id="edit-title"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Enter task name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-category">Category</Label>
                      <Select 
                        value={editForm.category}
                        onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="administrative">Administrative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-priority">Priority</Label>
                      <Select 
                        value={editForm.priority}
                        onValueChange={(value) => setEditForm({ ...editForm, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-status">Status</Label>
                      <Select 
                        value={editForm.status}
                        onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-due-date">Due Date</Label>
                      <Input
                        id="edit-due-date"
                        type="datetime-local"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-assigned-to">Team/Staff</Label>
                      <Select 
                        value={editForm.assignedTo}
                        onValueChange={(value) => setEditForm({ ...editForm, assignedTo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(users) && users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-time-estimate">Time Estimate</Label>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Input
                            type="number"
                            min="0"
                            max="30"
                            className="w-16"
                            placeholder="0"
                            value={editForm.timeEstimate.split(' ')[0] || ''}
                            onChange={(e) => {
                              const days = e.target.value || '0';
                              const currentParts = editForm.timeEstimate.split(' ');
                              const hours = currentParts[2] || '0';
                              const minutes = currentParts[4] || '0';
                              setEditForm({ ...editForm, timeEstimate: `${days} days ${hours} hours ${minutes} minutes` });
                            }}
                          />
                          <span className="text-sm text-slate-600">days</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            className="w-16"
                            placeholder="0"
                            value={editForm.timeEstimate.split(' ')[2] || ''}
                            onChange={(e) => {
                              const hours = e.target.value || '0';
                              const currentParts = editForm.timeEstimate.split(' ');
                              const days = currentParts[0] || '0';
                              const minutes = currentParts[4] || '0';
                              setEditForm({ ...editForm, timeEstimate: `${days} days ${hours} hours ${minutes} minutes` });
                            }}
                          />
                          <span className="text-sm text-slate-600">hrs</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            className="w-16"
                            placeholder="0"
                            value={editForm.timeEstimate.split(' ')[4] || ''}
                            onChange={(e) => {
                              const minutes = e.target.value || '0';
                              const currentParts = editForm.timeEstimate.split(' ');
                              const days = currentParts[0] || '0';
                              const hours = currentParts[2] || '0';
                              setEditForm({ ...editForm, timeEstimate: `${days} days ${hours} hours ${minutes} minutes` });
                            }}
                          />
                          <span className="text-sm text-slate-600">mins</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="edit-billing">Billing</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={editForm.billedSeparately}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, billedSeparately: checked })}
                          />
                          <Label className="text-sm">Billed separately</Label>
                        </div>
                        {editForm.billedSeparately && (
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-slate-600">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24"
                              placeholder="0.00"
                              value={editForm.billingAmount}
                              onChange={(e) => setEditForm({ ...editForm, billingAmount: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-property">Property</Label>
                      <Popover open={propertyComboboxOpen} onOpenChange={setPropertyComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={propertyComboboxOpen}
                            className="w-full justify-between"
                            data-testid="button-select-property"
                          >
                            {editForm.propertyId && Array.isArray(properties)
                              ? properties.find((p: any) => p.id.toString() === editForm.propertyId)?.name
                              : "Select property..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search properties..."
                              value={propertySearchValue}
                              onValueChange={setPropertySearchValue}
                            />
                            <CommandEmpty>No property found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-auto">
                              {Array.isArray(properties) && properties
                                .filter((property: any) => 
                                  !propertySearchValue || 
                                  property.name.toLowerCase().includes(propertySearchValue.toLowerCase()) ||
                                  (property.address1 && property.address1.toLowerCase().includes(propertySearchValue.toLowerCase())) ||
                                  (property.city && property.city.toLowerCase().includes(propertySearchValue.toLowerCase()))
                                )
                                .map((property: any) => (
                                  <CommandItem
                                    key={property.id}
                                    value={property.id.toString()}
                                    onSelect={() => {
                                      setEditForm({ ...editForm, propertyId: property.id.toString(), roomId: "none" });
                                      setPropertyComboboxOpen(false);
                                      setPropertySearchValue("");
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        editForm.propertyId === property.id.toString()
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{property.name}</span>
                                      {property.address1 && (
                                        <span className="text-xs text-muted-foreground">
                                          {property.address1}{property.city ? `, ${property.city}` : ''}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="edit-room">Room/Space</Label>
                      <Select 
                        value={editForm.roomId}
                        onValueChange={(value) => setEditForm({ ...editForm, roomId: value })}
                        disabled={!editForm.propertyId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={editForm.propertyId ? "Select room" : "Select property first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center space-x-2">
                              <X className="w-4 h-4 text-slate-400" />
                              <span>No specific room</span>
                            </div>
                          </SelectItem>
                          {Array.isArray(rooms) && rooms.map((room: any) => (
                            <SelectItem key={room.id} value={room.id.toString()}>
                              <div className="flex items-center space-x-2">
                                <span>{room.type === "bedroom" ? "🛏️" : room.type === "bathroom" ? "🚿" : room.type === "kitchen" ? "🍳" : room.type === "living_room" ? "🛋️" : room.type === "office" ? "💼" : room.type === "storage" ? "📦" : room.type === "outdoor" ? "🌿" : "🏠"}</span>
                                <span>{room.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="vendor-needed"
                        checked={editForm.vendorNeeded}
                        onCheckedChange={(checked) => {
                          setEditForm({ ...editForm, vendorNeeded: !!checked });
                        }}
                        data-testid="checkbox-vendor-needed"
                      />
                      <Label htmlFor="vendor-needed" className="cursor-pointer">Vendor Needed</Label>
                    </div>
                    {editForm.vendorNeeded && (
                      <div>
                        <Label htmlFor="edit-vendor">Select Vendor</Label>
                        <Popover open={vendorSearchOpenEditModal} onOpenChange={setVendorSearchOpenEditModal}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={vendorSearchOpenEditModal}
                              className="w-full justify-between h-auto min-h-[40px]"
                              data-testid="button-select-vendor-edit"
                            >
                              {editForm.vendorId && editForm.vendorId !== "none" ? (
                                <div className="flex items-center gap-2 text-left">
                                  {(() => {
                                    const selectedVendor = sortedVendors.find((v: any) => v.id.toString() === editForm.vendorId);
                                    if (!selectedVendor) return <span className="text-slate-500">Select vendor...</span>;
                                    const isPreferred = (propertyVendors as any[]).some((pv: any) => pv.vendorId === selectedVendor.id);
                                    return (
                                      <>
                                        {isPreferred ? (
                                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                                        ) : (
                                          <Wrench className="w-4 h-4 text-slate-500 shrink-0" />
                                        )}
                                        <div className="flex flex-col items-start">
                                          <span className="truncate font-medium">
                                            {selectedVendor.firstName} {selectedVendor.lastName}
                                            {isPreferred && <span className="text-xs text-yellow-600 dark:text-yellow-500 ml-1">(Preferred)</span>}
                                          </span>
                                          {selectedVendor.vendorType && (
                                            <span className="text-xs text-slate-500">{selectedVendor.vendorType}</span>
                                          )}
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <span className="text-slate-500">Select vendor...</span>
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[320px] p-0">
                            <Command>
                              <CommandInput 
                                placeholder="Search vendors..." 
                                value={vendorSearchValueEditModal}
                                onValueChange={setVendorSearchValueEditModal}
                              />
                              <CommandEmpty>No vendors found</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-y-auto">
                                <CommandItem
                                  value="none"
                                  onSelect={() => {
                                    setEditForm({ ...editForm, vendorId: "" });
                                    setVendorSearchOpenEditModal(false);
                                  }}
                                >
                                  <X className="w-4 h-4 mr-2 text-slate-400" />
                                  <span className="text-slate-600">No vendor</span>
                                </CommandItem>
                                {sortedVendors.map((vendor: any) => {
                                  const isPreferred = (propertyVendors as any[]).some((pv: any) => pv.vendorId === vendor.id);
                                  const vendorName = `${vendor.firstName} ${vendor.lastName}`;
                                  return (
                                    <CommandItem
                                      key={vendor.id}
                                      value={`${vendorName} ${vendor.vendorType || ''}`}
                                      onSelect={() => {
                                        setEditForm({ ...editForm, vendorId: vendor.id.toString() });
                                        setVendorSearchOpenEditModal(false);
                                      }}
                                    >
                                      {isPreferred ? (
                                        <Star className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" />
                                      ) : (
                                        <Wrench className="w-4 h-4 mr-2 text-slate-500" />
                                      )}
                                      <div className="flex flex-col">
                                        <div className="font-medium flex items-center gap-1">
                                          {vendorName}
                                          {isPreferred && <span className="text-xs text-yellow-600 dark:text-yellow-500">(Preferred)</span>}
                                        </div>
                                        {vendor.vendorType && <div className="text-xs text-slate-500">{vendor.vendorType}</div>}
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-client">Client</Label>
                      <Popover open={clientSearchOpenEditModal} onOpenChange={setClientSearchOpenEditModal}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={clientSearchOpenEditModal}
                            className="w-full justify-between h-auto min-h-[40px]"
                            data-testid="button-select-client-edit"
                          >
                            {editForm.clientId && contacts ? (
                              <div className="flex items-center gap-2 text-left">
                                <User className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="truncate">
                                  {(() => {
                                    const selectedContact = (contacts as any[]).find((c: any) => c.id.toString() === editForm.clientId);
                                    return selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : "Select client...";
                                  })()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Select client...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Search clients..." 
                              value={clientSearchValueEditModal}
                              onValueChange={setClientSearchValueEditModal}
                            />
                            <CommandEmpty>
                              <div className="p-4 text-center">
                                <p className="text-sm text-slate-500 mb-3">No clients found</p>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setClientSearchOpenEditModal(false);
                                    setIsNewContactModalOpen(true);
                                    const nameParts = clientSearchValueEditModal.trim().split(' ');
                                    if (nameParts.length >= 2) {
                                      setNewContactForm(prev => ({ 
                                        ...prev, 
                                        firstName: nameParts[0], 
                                        lastName: nameParts.slice(1).join(' ')
                                      }));
                                    }
                                  }}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add "{clientSearchValueEditModal}"
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  setEditForm({ ...editForm, clientId: "" });
                                  setClientSearchOpenEditModal(false);
                                }}
                              >
                                <X className="w-4 h-4 mr-2 text-slate-400" />
                                <span className="text-slate-600">No client</span>
                              </CommandItem>
                              {contacts && Array.isArray(contacts) && (contacts as any[]).map((contact: any) => (
                                <CommandItem
                                  key={contact.id}
                                  value={`${contact.firstName} ${contact.lastName} ${contact.email}`}
                                  onSelect={() => {
                                    setEditForm({ ...editForm, clientId: contact.id.toString() });
                                    setClientSearchOpenEditModal(false);
                                  }}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-slate-500" />
                                      <div>
                                        <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                                        {contact.email && <div className="text-xs text-slate-500">{contact.email}</div>}
                                      </div>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-tags">Tags (Optional)</Label>
                      <Input
                        id="edit-tags"
                        data-testid="input-tags"
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        placeholder="maintenance, urgent, inspection"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Enter detailed task description"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editForm.isRecurring}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, isRecurring: checked })}
                      />
                      <Label>Recurring Task</Label>
                    </div>
                    {editForm.isRecurring && (
                      <Select 
                        value={editForm.recurrenceFrequency}
                        onValueChange={(value) => setEditForm({ ...editForm, recurrenceFrequency: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Custom Fields */}
                  {customFields.length > 0 && (
                    <CustomFieldsRenderer
                      fields={customFields}
                      values={editForm.customFieldValues}
                      onChange={(values) => setEditForm({ ...editForm, customFieldValues: values })}
                      mode="edit"
                    />
                  )}

                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={updateTaskMutation.isPending}>
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cascaded Client Alerts */}
      <CascadedClientAlertsDisplay taskId={taskId} />

      {/* Task Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="notes">Notes & Comments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {(task as any).description ? (
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {(task as any).description}
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">
                      No description provided.
                    </p>
                  )}
                  
                  {/* Tags Display */}
                  {(task as any).tags && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-2" data-testid="tags-display">
                        {(task as any).tags.split(',').map((tag: string, index: number) => (
                          tag.trim() && (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              data-testid={`tag-${tag.trim()}`}
                            >
                              {tag.trim()}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Photos/Attachments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Paperclip className="w-5 h-5 mr-2" />
                    Photos & Attachments
                  </CardTitle>
                  <CardDescription>
                    Upload photos and documents related to this task
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Before/After Mode Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="before-after-mode" className="text-sm font-medium cursor-pointer">
                          Before/After Photo Mode
                        </Label>
                        <p className="text-xs text-slate-500">
                          Categorize photos for side-by-side comparison
                        </p>
                      </div>
                      <Switch
                        id="before-after-mode"
                        checked={beforeAfterMode}
                        onCheckedChange={setBeforeAfterMode}
                        data-testid="switch-before-after-mode"
                      />
                    </div>

                    {/* Upload Area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                        isDragOverPhotos
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                      onDragOver={handlePhotoDragOver}
                      onDragLeave={handlePhotoDragLeave}
                      onDrop={handlePhotoDrop}
                    >
                      {isPhotoUploading ? (
                        <div className="flex flex-col items-center py-2">
                          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mb-1" />
                          <p className="text-sm text-slate-600">Uploading photos...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                          <p className="text-sm text-slate-600 mb-1">
                            Drag and drop photos here, or click to browse
                          </p>
                          <p className="text-xs text-slate-500 mb-2">
                            Images only, max 10MB per file
                          </p>
                          <label>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              disabled={isPhotoUploading}
                              data-testid="button-upload-photo"
                              asChild
                            >
                              <span className="cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                Choose Photos
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handlePhotoInputChange}
                              className="hidden"
                              disabled={isPhotoUploading}
                              data-testid="input-photo-upload"
                            />
                          </label>
                        </>
                      )}
                    </div>

                    {/* Display Uploaded Photos */}
                    {photoAttachments.length > 0 && (
                      <>
                        {beforeAfterMode ? (
                          /* Before/After Comparison View */
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Before Photos Column */}
                              <div>
                                <h3 className="font-medium text-sm text-slate-700 mb-3 flex items-center">
                                  <span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                                  Before Photos ({photoAttachments.filter(p => p.category === 'before').length})
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                  {photoAttachments.filter(p => p.category === 'before').map((attachment, index) => (
                                    <div
                                      key={index}
                                      className="relative group aspect-square rounded-lg overflow-hidden border-2 border-amber-200"
                                      data-testid={`photo-before-${index}`}
                                    >
                                      <img
                                        src={attachment.url}
                                        alt={attachment.filename}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Annotate photo"
                                          onClick={() => setAnnotatingPhoto({ url: attachment.url, source: "task", index: photoAttachments.indexOf(attachment) })}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => removePhotoAttachment(photoAttachments.indexOf(attachment))}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* After Photos Column */}
                              <div>
                                <h3 className="font-medium text-sm text-slate-700 mb-3 flex items-center">
                                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                                  After Photos ({photoAttachments.filter(p => p.category === 'after').length})
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                  {photoAttachments.filter(p => p.category === 'after').map((attachment, index) => (
                                    <div
                                      key={index}
                                      className="relative group aspect-square rounded-lg overflow-hidden border-2 border-green-200"
                                      data-testid={`photo-after-${index}`}
                                    >
                                      <img
                                        src={attachment.url}
                                        alt={attachment.filename}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Annotate photo"
                                          onClick={() => setAnnotatingPhoto({ url: attachment.url, source: "task", index: photoAttachments.indexOf(attachment) })}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => removePhotoAttachment(photoAttachments.indexOf(attachment))}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Uncategorized Photos */}
                            {photoAttachments.filter(p => !p.category || p.category === null).length > 0 && (
                              <div>
                                <h3 className="font-medium text-sm text-slate-700 mb-3">
                                  Uncategorized ({photoAttachments.filter(p => !p.category || p.category === null).length}) - Assign as Before or After
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                  {photoAttachments.map((attachment, index) => (
                                    (!attachment.category || attachment.category === null) && (
                                      <div
                                        key={index}
                                        className="relative rounded-lg overflow-hidden border border-slate-300"
                                        data-testid={`photo-uncategorized-${index}`}
                                      >
                                        <div className="aspect-square">
                                          <img
                                            src={attachment.url}
                                            alt={attachment.filename}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="p-2 bg-white border-t border-slate-200">
                                          <div className="flex gap-1">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 text-xs border-amber-300 hover:bg-amber-50"
                                              onClick={() => updatePhotoCategory(index, 'before')}
                                              data-testid={`button-mark-before-${index}`}
                                            >
                                              Before
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 text-xs border-green-300 hover:bg-green-50"
                                              onClick={() => updatePhotoCategory(index, 'after')}
                                              data-testid={`button-mark-after-${index}`}
                                            >
                                              After
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="px-2"
                                              title="Annotate photo"
                                              onClick={() => setAnnotatingPhoto({ url: attachment.url, source: "task", index })}
                                              data-testid={`button-annotate-uncategorized-${index}`}
                                            >
                                              <Pencil className="w-3 h-3 text-blue-500" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="px-2"
                                              onClick={() => removePhotoAttachment(index)}
                                              data-testid={`button-remove-uncategorized-${index}`}
                                            >
                                              <Trash2 className="w-3 h-3 text-red-500" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Standard Grid View */
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {photoAttachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-slate-300 transition-colors"
                                data-testid={`photo-attachment-${index}`}
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.filename}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Annotate photo"
                                    onClick={() => setAnnotatingPhoto({ url: attachment.url, source: "task", index })}
                                    data-testid={`button-annotate-photo-${index}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removePhotoAttachment(index)}
                                    data-testid={`button-remove-photo-${index}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 px-2 py-1">
                                  <p className="text-xs text-white truncate" title={attachment.filename}>
                                    {attachment.filename}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {photoAttachments.length === 0 && !isPhotoUploading && (
                      <p className="text-sm text-slate-500 text-center py-2">
                        No photos attached yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Property, Owner, and Vendor Information - moved up below description */}
              <div className={`grid gap-6 ${
                ((task as any).property ? 1 : 0) + ((task as any).contact ? 1 : 0) + ((task as any).vendor ? 1 : 0) > 1 
                  ? 'grid-cols-1 md:grid-cols-2' 
                  : 'grid-cols-1'
              }`}>
                {(task as any).property && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Building className="w-5 h-5 mr-2" />
                        Property Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-slate-500">Property</Label>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                            onClick={() => navigate(`/property-profile?id=${(task as any).property.id}`)}
                            data-testid="link-task-property"
                          >
                            {(task as any).property.name}
                          </Button>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-500">Address</Label>
                          <p className="text-slate-700 text-sm">
                            {(task as any).property ? [
                              (task as any).property.address1,
                              (task as any).property.address2,
                              (task as any).property.city,
                              (task as any).property.state,
                              (task as any).property.zip
                            ].filter(Boolean).join(", ") : "No address"}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-slate-500">Type</Label>
                            <p className="text-slate-700 text-sm capitalize">{(task as any).property.type}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-500">Status</Label>
                            <Badge variant="outline" className="capitalize text-xs">
                              {(task as any).property.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(task as any).contact && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        Owner Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-slate-500">Name</Label>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                            onClick={() => navigate(`/person-profile?id=${(task as any).contact.id}`)}
                            data-testid="link-task-owner"
                          >
                            {(task as any).contact.firstName} {(task as any).contact.lastName}
                          </Button>
                        </div>
                        {(task as any).contact.email && (
                          <div>
                            <Label className="text-sm font-medium text-slate-500">Email</Label>
                            <p className="text-slate-700 text-sm">
                              <a href={`mailto:${(task as any).contact.email}`} className="text-blue-600 hover:text-blue-800">
                                {(task as any).contact.email}
                              </a>
                            </p>
                          </div>
                        )}
                        {(task as any).contact.phone && (
                          <div>
                            <Label className="text-sm font-medium text-slate-500">Phone</Label>
                            <p className="text-slate-700 text-sm">
                              <a href={`tel:${(task as any).contact.phone}`} className="text-blue-600 hover:text-blue-800">
                                {(task as any).contact.phone}
                              </a>
                            </p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-slate-500">Type</Label>
                          <Badge variant="secondary" className="capitalize text-xs">
                            {(task as any).contact.type}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(task as any).vendorNeeded && <VendorInformationCard task={task as any} onUpdate={refetch} />}
              </div>

              {/* Enhanced Checklist / Subtasks */}
              <Card>
                <CardContent className="pt-6">
                  <EnhancedChecklist
                    items={checklistItems}
                    onItemsChange={setChecklistItems}
                    users={users as Array<{ id: string; firstName: string; lastName: string; profileImageUrl?: string }> || []}
                    taskDueDate={(task as any)?.dueDate ? new Date((task as any).dueDate) : undefined}
                  />
                </CardContent>
              </Card>

              {/* Inspection Checklist — only shown for inspection-category tasks */}
              {(task as any).category === "inspection" && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardCheck className="w-5 h-5 text-blue-600" />
                        Inspection Checklist
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {inspectionTemplates.length > 0 && (
                          <Popover open={isApplyTemplateOpen} onOpenChange={setIsApplyTemplateOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Apply Template
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2" align="end">
                              <p className="text-xs text-slate-500 px-2 pb-2 font-medium">Inspection Templates</p>
                              {inspectionTemplates.map((tpl: any) => (
                                <button
                                  key={tpl.id}
                                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-100 transition-colors"
                                  onClick={() => applyTemplateMutation.mutate(tpl.id)}
                                  disabled={applyTemplateMutation.isPending}
                                >
                                  {tpl.name}
                                  <span className="text-xs text-slate-400 ml-1">({(tpl.items || []).length} items)</span>
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        )}
                        <a href={`/inspection-report/${taskId}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Report
                          </Button>
                        </a>
                      </div>
                    </div>
                    {inspectionItems.length > 0 && (() => {
                      const passCount = inspectionItems.filter((i: any) => i.result === "pass").length;
                      const failCount = inspectionItems.filter((i: any) => i.result === "fail").length;
                      const total = inspectionItems.length;
                      return (
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />{passCount} Pass
                          </span>
                          <span className="flex items-center gap-1 text-red-500">
                            <XCircle className="w-3 h-3" />{failCount} Fail
                          </span>
                          <span className="text-slate-400">{total - passCount - failCount} Pending</span>
                        </div>
                      );
                    })()}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {inspectionItems.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 border border-dashed rounded-lg">
                        <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No checklist items. Apply a template or add items below.</p>
                      </div>
                    ) : (
                      <>
                      {/* Hidden file input for photo upload */}
                      <input
                        type="file"
                        accept="image/*"
                        ref={photoInputRef}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && photoTargetItemId) {
                            uploadChecklistItemPhoto(photoTargetItemId, file);
                          }
                          if (photoInputRef.current) photoInputRef.current.value = "";
                        }}
                      />
                      <div className="space-y-4">
                        {(() => {
                          const grouped: Record<string, any[]> = {};
                          (inspectionItems as any[]).forEach((item: any) => {
                            const cat = item.category?.trim() || "General";
                            if (!grouped[cat]) grouped[cat] = [];
                            grouped[cat].push(item);
                          });
                          return Object.entries(grouped).map(([category, items]) => (
                            <div key={category}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{category}</span>
                                <span className="text-xs text-slate-400">({items.length} item{items.length !== 1 ? "s" : ""})</span>
                                <div className="flex-1 h-px bg-slate-200" />
                              </div>
                              <div className="space-y-2">
                                {items.map((item: any) => (
                          <div key={item.id} className={`p-2 rounded-lg border ${item.result === "fail" ? "border-red-200 bg-red-50" : item.result === "pass" ? "border-green-200 bg-green-50" : "border-slate-200"}`}>
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900">{item.text}</p>
                                {item.required && <span className="text-xs text-slate-400">Required</span>}
                                {item.resultNote && editingNoteItemId !== item.id && (
                                  <p className="text-xs text-slate-600 mt-0.5 italic">{item.resultNote}</p>
                                )}
                                {(() => {
                                  const allPhotos: string[] = [
                                    ...(Array.isArray(item.photoUrls) ? item.photoUrls : []),
                                    ...(item.photoUrl && !(item.photoUrls || []).includes(item.photoUrl) ? [item.photoUrl] : []),
                                  ];
                                  const allThumbnails: string[] = Array.isArray(item.thumbnailUrls) ? item.thumbnailUrls : [];
                                  if (allPhotos.length === 0) return null;
                                  return (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {allPhotos.map((url: string, idx: number) => (
                                        <div key={idx} className="relative group">
                                          <a href={url} target="_blank" rel="noopener noreferrer">
                                            <img
                                              src={allThumbnails[idx] || url}
                                              alt={`Photo ${idx + 1}`}
                                              className="h-16 w-24 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                            />
                                          </a>
                                          <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              className="bg-blue-600/90 text-white rounded px-1 py-0.5 flex items-center gap-0.5 text-xs"
                                              title="Annotate photo"
                                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAnnotatingPhoto({ url, source: "checklist", itemId: String(item.id), currentUrls: allPhotos, currentThumbnailUrls: allThumbnails }); }}
                                            >
                                              <Pencil className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              className="bg-black/70 text-white rounded px-1 py-0.5 flex items-center gap-0.5 text-xs"
                                              title="Remove photo"
                                              onClick={(e) => { e.stopPropagation(); removeChecklistItemPhoto(item.id, url); }}
                                            >
                                              ×
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant={item.result === "pass" ? "default" : "outline"}
                                  className={`h-7 px-2 text-xs ${item.result === "pass" ? "bg-green-600 hover:bg-green-700" : ""}`}
                                  onClick={() => updateInspectionItemMutation.mutate({ id: item.id, result: item.result === "pass" ? "" : "pass" })}
                                  disabled={updateInspectionItemMutation.isPending}
                                >
                                  <CheckCircle className="w-3 h-3 mr-0.5" />Pass
                                </Button>
                                <Button
                                  size="sm"
                                  variant={item.result === "fail" ? "destructive" : "outline"}
                                  className="h-7 px-2 text-xs"
                                  onClick={() => updateInspectionItemMutation.mutate({ id: item.id, result: item.result === "fail" ? "" : "fail" })}
                                  disabled={updateInspectionItemMutation.isPending}
                                >
                                  <XCircle className="w-3 h-3 mr-0.5" />Fail
                                </Button>
                                <Button
                                  size="sm"
                                  variant={item.result === "na" ? "secondary" : "outline"}
                                  className="h-7 px-2 text-xs"
                                  onClick={() => updateInspectionItemMutation.mutate({ id: item.id, result: item.result === "na" ? "" : "na" })}
                                  disabled={updateInspectionItemMutation.isPending}
                                >
                                  <MinusCircle className="w-3 h-3 mr-0.5" />N/A
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-blue-500"
                                  title={item.resultNote ? "Edit note" : "Add note"}
                                  onClick={() => {
                                    if (editingNoteItemId === item.id) {
                                      setEditingNoteItemId(null);
                                      setNoteInputValue("");
                                    } else {
                                      setEditingNoteItemId(item.id);
                                      setNoteInputValue(item.resultNote || "");
                                    }
                                  }}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={`h-7 w-7 p-0 hover:text-blue-500 ${(item.photoUrls?.length > 0 || item.photoUrl) ? "text-blue-400" : "text-slate-400"}`}
                                  title={(item.photoUrls?.length > 0 || item.photoUrl) ? "Add another photo" : "Attach photo"}
                                  disabled={uploadingPhotoItemId === item.id}
                                  onClick={() => {
                                    setPhotoTargetItemId(item.id);
                                    photoInputRef.current?.click();
                                  }}
                                >
                                  {uploadingPhotoItemId === item.id
                                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                                    : <Camera className="w-3 h-3" />
                                  }
                                </Button>
                                {(() => {
                                  const photoCount = [
                                    ...(Array.isArray(item.photoUrls) ? item.photoUrls : []),
                                    ...(item.photoUrl && !(item.photoUrls || []).includes(item.photoUrl) ? [item.photoUrl] : []),
                                  ].length;
                                  return photoCount > 0 ? (
                                    <Badge
                                      className="h-5 px-1.5 text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 pointer-events-none"
                                      title={`${photoCount} ${photoCount === 1 ? "photo" : "photos"}`}
                                      aria-label={`${photoCount} ${photoCount === 1 ? "photo" : "photos"}`}
                                    >
                                      {photoCount}
                                    </Badge>
                                  ) : null;
                                })()}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                                  onClick={() => deleteInspectionItemMutation.mutate(item.id)}
                                  disabled={deleteInspectionItemMutation.isPending}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {editingNoteItemId === item.id && (
                              <div className="flex gap-2 mt-2">
                                <Input
                                  value={noteInputValue}
                                  onChange={(e) => setNoteInputValue(e.target.value)}
                                  placeholder="Add a note..."
                                  className="text-xs h-7"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateInspectionItemMutation.mutate({ id: item.id, resultNote: noteInputValue });
                                      setEditingNoteItemId(null);
                                      setNoteInputValue("");
                                    } else if (e.key === "Escape") {
                                      setEditingNoteItemId(null);
                                      setNoteInputValue("");
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => {
                                    updateInspectionItemMutation.mutate({ id: item.id, resultNote: noteInputValue });
                                    setEditingNoteItemId(null);
                                    setNoteInputValue("");
                                  }}
                                >
                                  Save
                                </Button>
                              </div>
                            )}
                          </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                      </>
                    )}
                    {/* Add item */}
                    {(() => {
                      const existingCategories = Array.from(
                        new Set(
                          (inspectionItems as TaskChecklistItem[])
                            .map((i) => i.category?.trim())
                            .filter((c): c is string => !!c)
                        )
                      );
                      const handleAdd = () => {
                        if (!newInspectionItemText.trim()) return;
                        addInspectionItemMutation.mutate({
                          text: newInspectionItemText.trim(),
                          category: newInspectionItemCategory.trim() || undefined,
                        });
                      };
                      return (
                        <div className="flex gap-2 pt-2">
                          <Input
                            placeholder="Add checklist item..."
                            value={newInspectionItemText}
                            onChange={(e) => setNewInspectionItemText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newInspectionItemText.trim()) {
                                e.preventDefault();
                                handleAdd();
                              }
                            }}
                            className="text-sm flex-1"
                          />
                          <input
                            list="inspection-category-suggestions"
                            placeholder="Category…"
                            value={newInspectionItemCategory}
                            onChange={(e) => setNewInspectionItemCategory(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newInspectionItemText.trim()) {
                                e.preventDefault();
                                handleAdd();
                              }
                            }}
                            className="w-32 h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                          <datalist id="inspection-category-suggestions">
                            {existingCategories.map((cat) => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleAdd}
                            disabled={addInspectionItemMutation.isPending || !newInspectionItemText.trim()}
                          >
                            <Plus className="w-3 h-3 mr-1" />Add
                          </Button>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Attachments and Quick Links side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attachments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <Paperclip className="w-5 h-5 mr-2" />
                      Attachments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {attachments.length > 0 ? (
                        attachments.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-slate-500" />
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-slate-500">{file.size}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700"
                                onClick={() => removeAttachment(file.id)}
                                data-testid={`button-remove-attachment-${file.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-3 text-slate-500">
                          <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                          <p className="text-sm">No attachments yet</p>
                          <p className="text-xs text-slate-400">Upload files to share documents</p>
                        </div>
                      )}
                      
                      <label className="w-full">
                        <Button 
                          variant="outline" 
                          className="w-full cursor-pointer"
                          disabled={isFileUploading}
                          asChild
                        >
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            {isFileUploading ? "Uploading..." : "Upload Files"}
                          </span>
                        </Button>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          accept="*/*"
                          data-testid="input-file-upload"
                        />
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <Link className="w-5 h-5 mr-2" />
                      Quick Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {quickLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Link className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="font-medium text-sm">{link.label}</p>
                              <a href={link.url} target="_blank" rel="noopener noreferrer" 
                                 className="text-xs text-blue-500 hover:text-blue-700 underline">
                                {link.url}
                              </a>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuickLink(link.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <div className="grid grid-cols-1 gap-2 mt-4">
                        <Input
                          value={newQuickLink.label}
                          onChange={(e) => setNewQuickLink({ ...newQuickLink, label: e.target.value })}
                          placeholder="Link label..."
                          className="text-sm"
                        />
                        <Input
                          value={newQuickLink.url}
                          onChange={(e) => setNewQuickLink({ ...newQuickLink, url: e.target.value })}
                          placeholder="URL..."
                          className="text-sm"
                        />
                      </div>
                      <Button 
                        onClick={addQuickLink} 
                        disabled={!newQuickLink.label.trim() || !newQuickLink.url.trim()}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>


            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Task Associations Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Associations</CardTitle>
                  <CardDescription>Link this task to property, client, and team member</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Property Association */}
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Property
                    </Label>
                    <Popover open={propertySearchOpen} onOpenChange={setPropertySearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={propertySearchOpen}
                          className="w-full justify-between h-auto min-h-[40px]"
                        >
                          {(task as any).property?.id ? (
                            <div className="flex items-center gap-2 text-left">
                              <Building className="w-4 h-4 text-slate-500 shrink-0" />
                              <span className="truncate">{(task as any).property.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">Select property...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search properties..." 
                            value={propertySearchValue}
                            onValueChange={setPropertySearchValue}
                          />
                          <CommandEmpty>
                            <div className="p-4 text-center">
                              <p className="text-sm text-slate-500 mb-3">No properties found</p>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setPropertySearchOpen(false);
                                  setIsNewPropertyModalOpen(true);
                                  setNewPropertyForm(prev => ({ ...prev, name: propertySearchValue }));
                                }}
                                className="w-full"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create new property
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                handlePropertyAssociation("none");
                                setPropertySearchOpen(false);
                                setPropertySearchValue("");
                              }}
                            >
                              <X className="mr-2 h-4 w-4 text-slate-400" />
                              No property
                            </CommandItem>
                            {Array.isArray(properties) && properties.map((property: any) => (
                              <CommandItem
                                key={property.id}
                                value={`${property.name} ${property.address1} ${property.city}`}
                                onSelect={() => {
                                  handlePropertyAssociation(property.id.toString());
                                  setPropertySearchOpen(false);
                                  setPropertySearchValue("");
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    (task as any).propertyId === property.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <Building className="mr-2 h-4 w-4 text-slate-500" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{property.name}</span>
                                  <span className="text-xs text-slate-500">{property.address1}, {property.city}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Client Association */}
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Client
                    </Label>
                    <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={contactSearchOpen}
                          className="w-full justify-between h-auto min-h-[40px]"
                        >
                          {(task as any).contact?.id ? (
                            <div className="flex items-center gap-2 text-left">
                              <User className="w-4 h-4 text-slate-500 shrink-0" />
                              <span className="truncate">{(task as any).contact.firstName} {(task as any).contact.lastName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">Select client...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search clients..." 
                            value={contactSearchValue}
                            onValueChange={setContactSearchValue}
                          />
                          <CommandEmpty>
                            <div className="p-4 text-center">
                              <p className="text-sm text-slate-500 mb-3">No clients found</p>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setContactSearchOpen(false);
                                  setIsNewContactModalOpen(true);
                                  const nameParts = contactSearchValue.trim().split(' ');
                                  if (nameParts.length >= 2) {
                                    setNewContactForm(prev => ({ 
                                      ...prev, 
                                      firstName: nameParts[0], 
                                      lastName: nameParts.slice(1).join(' ')
                                    }));
                                  } else if (nameParts.length === 1) {
                                    setNewContactForm(prev => ({ ...prev, firstName: nameParts[0] }));
                                  }
                                }}
                                className="w-full"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create new client
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                handleContactAssociation("none");
                                setContactSearchOpen(false);
                                setContactSearchValue("");
                              }}
                            >
                              <X className="mr-2 h-4 w-4 text-slate-400" />
                              No client
                            </CommandItem>
                            {Array.isArray(contacts) && contacts.map((contact: any) => (
                              <CommandItem
                                key={contact.id}
                                value={`${contact.firstName} ${contact.lastName} ${contact.email || ''}`}
                                onSelect={() => {
                                  handleContactAssociation(contact.id.toString());
                                  setContactSearchOpen(false);
                                  setContactSearchValue("");
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    (task as any).contactId === contact.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <User className="mr-2 h-4 w-4 text-slate-500" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{contact.firstName} {contact.lastName}</span>
                                  <span className="text-xs text-slate-500 capitalize">{contact.type}{contact.email ? ` • ${contact.email}` : ''}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Team Assignment */}
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Team/Staff
                    </Label>
                    <Select
                      value={(task as any).assignedToId?.toString() || "none"}
                      onValueChange={handleUserAssignment}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select team member">
                          {(task as any).assignedUser ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-500" />
                              <span>{(task as any).assignedUser.firstName} {(task as any).assignedUser.lastName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">Unassigned</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <div className="flex items-center gap-2">
                            <X className="w-4 h-4 text-slate-400" />
                            <span>Unassigned</span>
                          </div>
                        </SelectItem>
                        {Array.isArray(users) && users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-500" />
                              <span>{user.firstName} {user.lastName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Task Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Task Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Priority</Label>
                    <p className="font-medium capitalize">{(task as any).priority || 'normal'}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Status</Label>
                    <p className="font-medium capitalize">{(task as any).status ? String((task as any).status).replace('_', ' ') : 'pending'}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Due Date</Label>
                    <p className="font-medium">{formatDate((task as any).dueDate)}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Time Estimate</Label>
                    <p className="font-medium">{(task as any).timeEstimate || "Not specified"}</p>
                  </div>

                  {(task as any).billedSeparately && (
                    <div>
                      <Label className="text-sm font-medium text-slate-500">Billing</Label>
                      <p className="font-medium">${(task as any).billingAmount || "0.00"}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Category</Label>
                    <p className="font-medium capitalize">{(task as any).category || "General"}</p>
                  </div>

                  {/* Custom Fields */}
                  {customFields.length > 0 && (task as any).customFieldValues && (
                    <div className="col-span-2">
                      <CustomFieldsRenderer
                        fields={customFields}
                        values={(task as any).customFieldValues || {}}
                        onChange={() => {}}
                        mode="view"
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Recurring</Label>
                    <div className="flex items-center space-x-2">
                      <Switch checked={(task as any).isRecurring || false} disabled />
                      <span className="text-sm">
                        {(task as any).isRecurring ? 
                          `Yes - ${(task as any).recurrenceFrequency || 'Not specified'}` : 
                          'No'
                        }
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Created</Label>
                    <p className="font-medium">{formatDate((task as any).createdAt)}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Last Updated</Label>
                    <p className="font-medium">{formatDate((task as any).updatedAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Notes & Comments Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Notes & Comments
              </CardTitle>
              <CardDescription>
                Task-related discussions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add Comment Form */}
                <div className="border rounded-lg p-4">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment or note about this task..."
                    className="mb-3"
                    rows={3}
                  />
                  <Button onClick={addComment} disabled={!newComment.trim()}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add Comment
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {fetchedComments && fetchedComments.length > 0 ? (
                    fetchedComments.map((comment: any) => (
                      <div key={comment.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {comment.userName ? comment.userName.split(' ').map((n: string) => n[0]).join('') : comment.userFirstName?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">
                              {comment.userName || `${comment.userFirstName || ''} ${comment.userLastName || ''}`.trim() || 'Unknown User'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-500">
                              {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString()}
                              {comment.updatedAt && comment.updatedAt !== comment.createdAt && " (edited)"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditComment(comment)}
                              data-testid={`button-edit-comment-${comment.id}`}
                              className="h-6 w-6 p-0"
                            >
                              <Settings className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                              data-testid={`button-delete-comment-${comment.id}`}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2 mt-2">
                            <Textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              placeholder="Edit your comment..."
                              className="min-h-[80px]"
                              data-testid={`textarea-edit-comment-${comment.id}`}
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={saveEditComment}
                                disabled={!editingCommentText.trim() || updateCommentMutation.isPending}
                                data-testid={`button-save-edit-comment-${comment.id}`}
                              >
                                <Save className="w-3 h-3 mr-1" />
                                {updateCommentMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditComment}
                                disabled={updateCommentMutation.isPending}
                                data-testid={`button-cancel-edit-comment-${comment.id}`}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-700 whitespace-pre-wrap">{comment.text}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p>No comments yet</p>
                      <p className="text-sm">Add the first comment to start the discussion</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2" />
                Task History
              </CardTitle>
              <CardDescription>
                Track all changes and updates to this task
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <p className="text-center text-slate-500 py-8">
                    No history available. Activity logs will appear here once changes are made.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Task Section */}
      <div className="mt-8 pt-8 border-t">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">
              Permanently delete this task and all associated data
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteModalOpen(true)}
            data-testid="button-delete-task"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Task
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
        setIsDeleteModalOpen(open);
        if (!open) setDeleteConfirmText("");
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Delete Task</span>
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the task and all associated data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> You are about to delete "{(task as any)?.title}"
              </p>
            </div>

            <div>
              <Label htmlFor="delete-confirm" className="text-sm font-medium">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE in all capitals"
                className="mt-2"
                data-testid="input-delete-confirm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmText("");
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTask}
              disabled={deleteConfirmText !== "DELETE" || deleteTaskMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteTaskMutation.isPending ? "Deleting..." : "Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing Submission Dialog */}
      <Dialog open={isBillingDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsBillingDialogOpen(false);
          setBillingSubmissionAmount("");
          setPendingTaskUpdate(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-green-600">
              <CheckSquare className="w-5 h-5" />
              <span>Task Completed - Submit for Billing?</span>
            </DialogTitle>
            <DialogDescription>
              This task is marked as billable. Would you like to submit it for billing review?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Task:</strong> {editForm.title}
              </p>
              {linkedClient && (
                <p className="text-sm text-blue-900 mt-1">
                  <strong>Client:</strong> {(linkedClient as any).firstName} {(linkedClient as any).lastName}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="billing-amount" className="text-sm font-medium">
                Billing Amount (USD) *
              </Label>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-lg text-slate-600">$</span>
                <Input
                  id="billing-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={billingSubmissionAmount}
                  onChange={(e) => setBillingSubmissionAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-billing-amount"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enter the amount to bill for this completed task
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCompleteWithoutBilling}
              data-testid="button-complete-without-billing"
            >
              Complete Without Billing
            </Button>
            <Button
              onClick={handleSubmitForBilling}
              disabled={createBillingSubmissionMutation.isPending || !billingSubmissionAmount}
              data-testid="button-submit-for-billing"
            >
              {createBillingSubmissionMutation.isPending ? "Submitting..." : "Submit for Billing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Property Modal */}
      <Dialog open={isNewPropertyModalOpen} onOpenChange={setIsNewPropertyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Property</DialogTitle>
            <DialogDescription>
              Add a new property and assign it to this task
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="property-name">Property Name *</Label>
              <Input
                id="property-name"
                value={newPropertyForm.name}
                onChange={(e) => setNewPropertyForm({ ...newPropertyForm, name: e.target.value })}
                placeholder="e.g. 123 Main St"
                data-testid="input-property-name"
              />
            </div>

            <div>
              <Label htmlFor="property-address">Street Address *</Label>
              <Input
                id="property-address"
                value={newPropertyForm.address1}
                onChange={(e) => setNewPropertyForm({ ...newPropertyForm, address1: e.target.value })}
                placeholder="Street address"
                data-testid="input-property-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property-city">City *</Label>
                <Input
                  id="property-city"
                  value={newPropertyForm.city}
                  onChange={(e) => setNewPropertyForm({ ...newPropertyForm, city: e.target.value })}
                  placeholder="City"
                  data-testid="input-property-city"
                />
              </div>
              <div>
                <Label htmlFor="property-state">State *</Label>
                <Input
                  id="property-state"
                  value={newPropertyForm.state}
                  onChange={(e) => setNewPropertyForm({ ...newPropertyForm, state: e.target.value })}
                  placeholder="State"
                  data-testid="input-property-state"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="property-zip">ZIP Code *</Label>
              <Input
                id="property-zip"
                value={newPropertyForm.zip}
                onChange={(e) => setNewPropertyForm({ ...newPropertyForm, zip: e.target.value })}
                placeholder="ZIP code"
                data-testid="input-property-zip"
              />
            </div>

            <div>
              <Label htmlFor="property-type">Property Type</Label>
              <Select 
                value={newPropertyForm.type}
                onValueChange={(value) => setNewPropertyForm({ ...newPropertyForm, type: value })}
              >
                <SelectTrigger id="property-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewPropertyModalOpen(false);
                setNewPropertyForm({
                  name: "",
                  address1: "",
                  city: "",
                  state: "",
                  zip: "",
                  type: "residential",
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProperty}
              disabled={createPropertyMutation.isPending}
              data-testid="button-create-property"
            >
              {createPropertyMutation.isPending ? "Creating..." : "Create Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Client Modal */}
      <Dialog open={isNewContactModalOpen} onOpenChange={setIsNewContactModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client and assign it to this task
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-first-name">First Name *</Label>
                <Input
                  id="contact-first-name"
                  value={newContactForm.firstName}
                  onChange={(e) => setNewContactForm({ ...newContactForm, firstName: e.target.value })}
                  placeholder="First name"
                  data-testid="input-contact-first-name"
                />
              </div>
              <div>
                <Label htmlFor="contact-last-name">Last Name *</Label>
                <Input
                  id="contact-last-name"
                  value={newContactForm.lastName}
                  onChange={(e) => setNewContactForm({ ...newContactForm, lastName: e.target.value })}
                  placeholder="Last name"
                  data-testid="input-contact-last-name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={newContactForm.email}
                onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="input-contact-email"
              />
            </div>

            <div>
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={newContactForm.phone}
                onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                placeholder="(555) 123-4567"
                data-testid="input-contact-phone"
              />
            </div>

            <div>
              <Label htmlFor="contact-type">Client Type</Label>
              <Select 
                value={newContactForm.type}
                onValueChange={(value) => setNewContactForm({ ...newContactForm, type: value })}
              >
                <SelectTrigger id="contact-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="emergency_contact">Emergency Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewContactModalOpen(false);
                setNewContactForm({
                  firstName: "",
                  lastName: "",
                  email: "",
                  phone: "",
                  type: "owner",
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateContact}
              disabled={createContactMutation.isPending}
              data-testid="button-create-contact"
            >
              {createContactMutation.isPending ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Modal */}
      <Dialog open={isConflictModalOpen} onOpenChange={setIsConflictModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span>Schedule Conflict</span>
            </DialogTitle>
            <DialogDescription>
              This task conflicts with existing assignments. Review the conflicts below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {conflictData?.conflicts?.map((conflict: any, index: number) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-sm text-yellow-800">
                  {conflict.title}
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  {conflict.assignedToName} • {formatDate(conflict.dueDate)}
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  {conflict.property ? `Property: ${conflict.property}` : ''}
                  {conflict.timeEstimate ? ` • Duration: ${conflict.timeEstimate}` : ''}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => handleConflictResolution(false)}>
              Back to Edit
            </Button>
            <Button onClick={() => handleConflictResolution(true)}>
              Confirm Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Confirmation Dialog */}
      <Dialog open={isTemplateConfirmOpen} onOpenChange={setIsTemplateConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <span>Apply Template?</span>
            </DialogTitle>
            <DialogDescription>
              Applying this template will replace existing data in some fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-medium text-sm text-amber-900 mb-2">
                The following fields will be overridden:
              </h4>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Task title</li>
                <li>Description</li>
                <li>Category</li>
                <li>Priority</li>
                <li>Time estimate</li>
                <li>Checklist items (completely replaced)</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-sm text-blue-900 mb-2">
                The following fields will be preserved:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Status</li>
                <li>Due date</li>
                <li>Team/Staff assignment</li>
                <li>Property and Client</li>
                <li>Tags and other fields</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelTemplateApplication}
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              onClick={applyTemplate}
              data-testid="button-apply-template"
            >
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {annotatingPhoto && (
        <PhotoAnnotationEditor
          imageUrl={annotatingPhoto.url}
          open={!!annotatingPhoto}
          onClose={() => setAnnotatingPhoto(null)}
          onSave={handleAnnotationSave}
        />
      )}
    </main>
  );
}