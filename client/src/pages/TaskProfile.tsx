import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import EnhancedChecklist from "@/components/EnhancedChecklist";
import { formatRecurrenceRule } from "@/lib/rruleUtils";
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
  Repeat
} from "lucide-react";

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
    billingAmount: ""
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
  const [photoAttachments, setPhotoAttachments] = useState<Array<{url: string, filename: string}>>([]);
  const [isDragOverPhotos, setIsDragOverPhotos] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [quickLinks, setQuickLinks] = useState<Array<{id: string, label: string, url: string}>>([]);
  const [newQuickLink, setNewQuickLink] = useState({label: "", url: ""});
  const [comments, setComments] = useState<Array<{id: string, text: string, author: string, timestamp: string}>>([]);
  const [newComment, setNewComment] = useState("");
  const [taskImage, setTaskImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [propertySearchValue, setPropertySearchValue] = useState("");
  const [contactSearchOpen, setContactSearchOpen] = useState(false);
  const [contactSearchValue, setContactSearchValue] = useState("");
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

  // Task templates
  const taskTemplates = {
    "weekly-inspection": {
      title: "Weekly Property Inspection",
      category: "inspection",
      priority: "normal",
      description: "Conduct thorough weekly inspection of property including:\n• Check exterior condition\n• Inspect HVAC systems\n• Test smoke and carbon monoxide detectors\n• Review security systems\n• Document any maintenance needs",
      timeEstimate: "2 hours",
      checklist: [
        { id: "1", text: "Inspect exterior walls and roof", completed: false },
        { id: "2", text: "Check HVAC filter and operation", completed: false },
        { id: "3", text: "Test smoke detectors", completed: false },
        { id: "4", text: "Check security system functionality", completed: false },
        { id: "5", text: "Document findings in report", completed: false }
      ]
    },
    "monthly-maintenance": {
      title: "Monthly Maintenance Review",
      category: "maintenance",
      priority: "high",
      description: "Comprehensive monthly maintenance tasks:\n• Deep clean common areas\n• Service mechanical equipment\n• Update maintenance logs\n• Plan upcoming repairs\n• Review vendor contracts",
      timeEstimate: "4 hours",
      checklist: [
        { id: "1", text: "Deep clean all common areas", completed: false },
        { id: "2", text: "Service HVAC equipment", completed: false },
        { id: "3", text: "Update maintenance logs", completed: false },
        { id: "4", text: "Review and plan repairs", completed: false },
        { id: "5", text: "Check vendor contract status", completed: false }
      ]
    },
    "quarterly-review": {
      title: "Quarterly Property Review",
      category: "administrative",
      priority: "high", 
      description: "Comprehensive quarterly assessment:\n• Financial review and budgeting\n• Tenant satisfaction survey\n• Maintenance planning for next quarter\n• Insurance and compliance review\n• Strategic planning updates",
      timeEstimate: "6 hours",
      checklist: [
        { id: "1", text: "Review quarterly financials", completed: false },
        { id: "2", text: "Conduct tenant satisfaction survey", completed: false },
        { id: "3", text: "Plan maintenance for next quarter", completed: false },
        { id: "4", text: "Review insurance compliance", completed: false },
        { id: "5", text: "Update strategic plans", completed: false }
      ]
    },
    "emergency-repair": {
      title: "Emergency Repair Response",
      category: "repair",
      priority: "urgent",
      description: "Immediate response to emergency repair situation:\n• Assess damage and safety risks\n• Contact emergency services if needed\n• Implement temporary solutions\n• Coordinate with vendors\n• Document incident thoroughly",
      timeEstimate: "Varies",
      checklist: [
        { id: "1", text: "Assess safety and damage", completed: false },
        { id: "2", text: "Contact emergency services if needed", completed: false },
        { id: "3", text: "Implement temporary fixes", completed: false },
        { id: "4", text: "Contact repair vendors", completed: false },
        { id: "5", text: "Document incident and costs", completed: false }
      ]
    },
    "cleaning-checklist": {
      title: "Deep Cleaning Service",
      category: "cleaning",
      priority: "normal",
      description: "Comprehensive cleaning service including:\n• All interior surfaces and fixtures\n• Window cleaning inside and out\n• Floor deep cleaning and maintenance\n• Sanitization of high-touch areas\n• Restocking of supplies",
      timeEstimate: "3 hours",
      checklist: [
        { id: "1", text: "Clean all interior surfaces", completed: false },
        { id: "2", text: "Clean windows inside and out", completed: false },
        { id: "3", text: "Deep clean and maintain floors", completed: false },
        { id: "4", text: "Sanitize high-touch areas", completed: false },
        { id: "5", text: "Restock cleaning supplies", completed: false }
      ]
    },
    "hvac-maintenance": {
      title: "HVAC System Maintenance",
      category: "maintenance",
      priority: "high",
      description: "Regular HVAC system maintenance:\n• Replace air filters\n• Clean and inspect ductwork\n• Check thermostat calibration\n• Inspect and clean outdoor units\n• Test system efficiency",
      timeEstimate: "2.5 hours",
      checklist: [
        { id: "1", text: "Replace all air filters", completed: false },
        { id: "2", text: "Clean and inspect ductwork", completed: false },
        { id: "3", text: "Calibrate thermostats", completed: false },
        { id: "4", text: "Clean outdoor units", completed: false },
        { id: "5", text: "Test system efficiency", completed: false }
      ]
    },
    "landscaping": {
      title: "Landscaping Maintenance",
      category: "maintenance",
      priority: "normal",
      description: "Seasonal landscaping maintenance:\n• Lawn mowing and edging\n• Pruning shrubs and trees\n• Weed control and fertilization\n• Irrigation system check\n• Seasonal plantings",
      timeEstimate: "4 hours",
      checklist: [
        { id: "1", text: "Mow and edge all lawn areas", completed: false },
        { id: "2", text: "Prune shrubs and trees", completed: false },
        { id: "3", text: "Apply weed control and fertilizer", completed: false },
        { id: "4", text: "Check irrigation system", completed: false },
        { id: "5", text: "Install seasonal plantings", completed: false }
      ]
    },
    "security-check": {
      title: "Security System Check",
      category: "inspection",
      priority: "high",
      description: "Comprehensive security system review:\n• Test all security cameras\n• Check door and window sensors\n• Verify alarm system functionality\n• Update access codes if needed\n• Review security logs",
      timeEstimate: "1.5 hours",
      checklist: [
        { id: "1", text: "Test all security cameras", completed: false },
        { id: "2", text: "Check door and window sensors", completed: false },
        { id: "3", text: "Test alarm system", completed: false },
        { id: "4", text: "Update access codes", completed: false },
        { id: "5", text: "Review security logs", completed: false }
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
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: isAuthenticated && !!taskId,
  });

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

  // Fetch rooms for the property associated with this task
  const { data: rooms } = useQuery({
    queryKey: ["/api/rooms/property", (task as any)?.propertyId],
    enabled: isAuthenticated && !!(task as any)?.propertyId,
  });

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
        roomId: (task as any).roomId?.toString() || "none"
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
      setComments((task as any).comments || []);
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
      billedSeparately: editForm.billedSeparately,
      billingAmount: editForm.billingAmount,
      attachments: photoAttachments,
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
    
    const template = taskTemplates[templateId as keyof typeof taskTemplates];
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
      const comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        author: "Current User", // TODO: Use actual user data when available
        timestamp: new Date().toISOString()
      };
      setComments([...comments, comment]);
      setNewComment("");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setTaskImage(previewUrl);
      
      // TODO: Upload to server
      setIsImageUploading(true);
      
      // Simulate upload
      setTimeout(() => {
        setIsImageUploading(false);
        toast({
          title: "Image uploaded",
          description: "Task image has been updated successfully",
        });
      }, 1500);
    }
  };

  const removeTaskImage = () => {
    if (taskImage) {
      URL.revokeObjectURL(taskImage);
    }
    setTaskImage(null);
    setImageFile(null);
    
    toast({
      title: "Image removed",
      description: "Task image has been removed",
    });
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
      const uploadedPhotos: Array<{url: string, filename: string}> = [];

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
            filename: file.name
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
        description: "Contact created and assigned successfully",
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
        description: "Failed to create contact",
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-4">
        {/* Back to Tasks Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/tasks")}
            className="flex items-center text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </div>

        {/* Task Image, Name, and Associations */}
        <div className="flex items-start space-x-6 mb-6">
          {/* Task Image Upload Area */}
          <div className="flex-shrink-0">
            <div className="relative">
              {taskImage ? (
                <div className="relative group">
                  <img
                    src={taskImage}
                    alt="Task image"
                    className="w-24 h-24 object-cover rounded-lg border-2 border-slate-200"
                  />
                  {isImageUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={removeTaskImage}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-500 text-center px-1">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Task Name and Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900 break-words">
                    {(task as any).title}
                  </h1>
                  {(task as any).isTemplate && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium shrink-0" title="Recurring task template">
                      Template
                    </span>
                  )}
                  {(task as any).templateTaskId && !(task as any).isTemplate && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium shrink-0" title="Instance of recurring task">
                      Instance
                    </span>
                  )}
                </div>
                {(task as any).isTemplate && (task as any).recurrenceRule && (
                  <div className="text-sm text-slate-500 mb-2 flex items-center gap-1">
                    <Repeat className="w-4 h-4" />
                    {formatRecurrenceRule((task as any).recurrenceRule)}
                  </div>
                )}
                <div className="flex items-center space-x-4 text-sm text-slate-600 mb-4">
                  <div className="flex items-center space-x-1">
                    <Badge variant={getPriorityColor((task as any).priority)} className="capitalize">
                      {(task as any).priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge variant={getStatusColor((task as any).status)} className="capitalize">
                      {(task as any).status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  {(task as any).dueDate && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due {formatDate((task as any).dueDate)}</span>
                    </div>
                  )}
                </div>

                {/* Property and Contact Associations */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Property Association */}
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Associated Property
                    </Label>
                    <Popover open={propertySearchOpen} onOpenChange={setPropertySearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={propertySearchOpen}
                          className="w-full justify-between"
                        >
                          {(task as any).property?.id ? (
                            <div className="flex items-center space-x-2">
                              <Building className="w-4 h-4 text-slate-500" />
                              <span>{(task as any).property.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">Search property...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
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

                  {/* Room/Space Association */}
                  {(task as any).room && (
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">
                        Room/Space
                      </Label>
                      <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                        <span className="text-lg">
                          {(task as any).room.type === "bedroom" ? "🛏️" : 
                           (task as any).room.type === "bathroom" ? "🚿" : 
                           (task as any).room.type === "kitchen" ? "🍳" : 
                           (task as any).room.type === "living_room" ? "🛋️" : 
                           (task as any).room.type === "office" ? "💼" : 
                           (task as any).room.type === "storage" ? "📦" : 
                           (task as any).room.type === "outdoor" ? "🌿" : "🏠"}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">{(task as any).room.name}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {(task as any).room.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Association */}
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Related Contact
                    </Label>
                    <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={contactSearchOpen}
                          className="w-full justify-between"
                        >
                          {(task as any).contact?.id ? (
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-slate-500" />
                              <span>{(task as any).contact.firstName} {(task as any).contact.lastName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">Search contact...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search contacts..." 
                            value={contactSearchValue}
                            onValueChange={setContactSearchValue}
                          />
                          <CommandEmpty>
                            <div className="p-4 text-center">
                              <p className="text-sm text-slate-500 mb-3">No contacts found</p>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setContactSearchOpen(false);
                                  setIsNewContactModalOpen(true);
                                  // Pre-fill with search value if it looks like a name
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
                                Create new contact
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
                              No contact
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
                      Assigned To
                    </Label>
                    <Select
                      value={(task as any).assignedToId?.toString() || "none"}
                      onValueChange={handleUserAssignment}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select team member">
                          {(task as any).assignedUser ? (
                            <div className="flex items-center space-x-2">
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
                          <div className="flex items-center space-x-2">
                            <X className="w-4 h-4 text-slate-400" />
                            <span>Unassigned</span>
                          </div>
                        </SelectItem>
                        {Array.isArray(users) && users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-slate-500" />
                              <span>{user.firstName} {user.lastName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Edit Task Button */}
              <div className="flex-shrink-0">
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                  <DialogTrigger asChild>
                    <Button>
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
                              <SelectItem value="weekly-inspection">Weekly Inspection</SelectItem>
                              <SelectItem value="monthly-maintenance">Monthly Maintenance</SelectItem>
                              <SelectItem value="quarterly-review">Quarterly Review</SelectItem>
                              <SelectItem value="emergency-repair">Emergency Repair</SelectItem>
                              <SelectItem value="cleaning-checklist">Cleaning Checklist</SelectItem>
                              <SelectItem value="hvac-maintenance">HVAC Maintenance</SelectItem>
                              <SelectItem value="landscaping">Landscaping Tasks</SelectItem>
                              <SelectItem value="security-check">Security Check</SelectItem>
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
                      <Label htmlFor="edit-assigned-to">Assigned To</Label>
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
                      <Select 
                        value={editForm.propertyId}
                        onValueChange={(value) => {
                          setEditForm({ ...editForm, propertyId: value, roomId: "none" });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(properties) && properties.map((property: any) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="edit-tags">Tags (Optional)</Label>
                      <Input
                        id="edit-tags"
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
                    {/* Upload Area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragOverPhotos
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                      onDragOver={handlePhotoDragOver}
                      onDragLeave={handlePhotoDragLeave}
                      onDrop={handlePhotoDrop}
                    >
                      {isPhotoUploading ? (
                        <div className="flex flex-col items-center py-4">
                          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                          <p className="text-sm text-slate-600">Uploading photos...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-600 mb-2">
                            Drag and drop photos here, or click to browse
                          </p>
                          <p className="text-xs text-slate-500 mb-3">
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
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
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

                    {photoAttachments.length === 0 && !isPhotoUploading && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No photos attached yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Property and Owner Information - moved up below description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Attachments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
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
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-slate-500">{file.size}</p>
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
                      <div className="text-center py-8 text-slate-500">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p>No attachments yet</p>
                        <p className="text-sm">Upload files to share documents, photos, or other materials</p>
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
                  <CardTitle className="flex items-center">
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
                            <p className="font-medium">{link.label}</p>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" 
                               className="text-sm text-blue-500 hover:text-blue-700 underline">
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
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Input
                        value={newQuickLink.label}
                        onChange={(e) => setNewQuickLink({ ...newQuickLink, label: e.target.value })}
                        placeholder="Link label..."
                      />
                      <Input
                        value={newQuickLink.url}
                        onChange={(e) => setNewQuickLink({ ...newQuickLink, url: e.target.value })}
                        placeholder="URL..."
                      />
                    </div>
                    <Button 
                      onClick={addQuickLink} 
                      disabled={!newQuickLink.label.trim() || !newQuickLink.url.trim()}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Quick Link
                    </Button>
                  </div>
                </CardContent>
              </Card>


            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Priority</Label>
                    <p className="font-medium capitalize">{(task as any).priority || 'normal'}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Status</Label>
                    <p className="font-medium capitalize">{(task as any).status ? (task as any).status.replace('_', ' ') : 'pending'}</p>
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

                  <div>
                    <Label className="text-sm font-medium text-slate-500">Assigned To</Label>
                    <div className="flex items-center mt-1">
                      <Avatar className="w-8 h-8 mr-3">
                        <AvatarImage src={(task as any).assignedUser?.profileImageUrl} />
                        <AvatarFallback>
                          {(task as any).assignedUser?.firstName?.[0]}{(task as any).assignedUser?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {(task as any).assignedUser ? 
                            `${(task as any).assignedUser.firstName} ${(task as any).assignedUser.lastName}` : 
                            "Unassigned"
                          }
                        </p>
                        {(task as any).assignedUser?.email && (
                          <p className="text-sm text-slate-500">{(task as any).assignedUser.email}</p>
                        )}
                      </div>
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
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {comment.author ? comment.author.split(' ').map(n => n[0]).join('') : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{comment.author || 'Unknown User'}</span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(comment.timestamp).toLocaleDateString()} at {new Date(comment.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{comment.text}</p>
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
            <h3 className="text-lg font-semibold text-slate-900">Danger Zone</h3>
            <p className="text-sm text-slate-600 mt-1">
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

      {/* New Contact Modal */}
      <Dialog open={isNewContactModalOpen} onOpenChange={setIsNewContactModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
            <DialogDescription>
              Add a new contact and assign it to this task
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
              <Label htmlFor="contact-type">Contact Type</Label>
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
              {createContactMutation.isPending ? "Creating..." : "Create Contact"}
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
    </main>
  );
}