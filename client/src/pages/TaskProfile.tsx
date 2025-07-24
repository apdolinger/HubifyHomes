import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  BookOpen
} from "lucide-react";

export default function TaskProfile() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [match, params] = useRoute("/task-profile");
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
    propertyId: ""
  });
  const [checklist, setChecklist] = useState<Array<{id: string, text: string, completed: boolean}>>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [attachments, setAttachments] = useState<Array<{id: string, name: string, size: string, type: string}>>([]);
  const [quickLinks, setQuickLinks] = useState<Array<{id: string, label: string, url: string}>>([]);
  const [newQuickLink, setNewQuickLink] = useState({label: "", url: ""});
  const [comments, setComments] = useState<Array<{id: string, text: string, author: string, timestamp: string}>>([]);
  const [newComment, setNewComment] = useState("");

  // Get task ID from URL params or localStorage
  const taskId = new URLSearchParams(window.location.search).get('id') || localStorage.getItem('selectedTaskId');

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
    queryKey: ["/api/tasks", taskId],
    enabled: isAuthenticated && !!taskId,
  });

  // Fetch task comments/notes
  const { data: fetchedComments } = useQuery({
    queryKey: ["/api/tasks", taskId, "comments"],
    enabled: isAuthenticated && !!taskId,
  });

  // Fetch task history
  const { data: history } = useQuery({
    queryKey: ["/api/tasks", taskId, "history"],
    enabled: isAuthenticated && !!taskId,
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: any) => {
      return await apiRequest(`/api/tasks/${taskId}`, "PATCH", updatedTask);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      // Task updated successfully
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (task && !isEditModalOpen) {
      setEditForm({
        title: (task as any).title || "",
        description: (task as any).description || "",
        priority: (task as any).priority || "",
        status: (task as any).status || "",
        dueDate: (task as any).dueDate || "",
        assignedTo: (task as any).assignedTo || "",
        timeEstimate: (task as any).timeEstimate || "",
        category: (task as any).category || "",
        isRecurring: (task as any).isRecurring || false,
        recurrenceFrequency: (task as any).recurrenceFrequency || "",
        propertyId: (task as any).propertyId || ""
      });
      
      // Initialize checklist, attachments, etc. from task data
      setChecklist((task as any).checklist || []);
      setAttachments((task as any).attachments || []);
      setQuickLinks((task as any).quickLinks || []);
      setComments((task as any).comments || []);
    }
  }, [task, isEditModalOpen]);

  const handleSave = () => {
    const updateData = {
      ...editForm,
      checklist,
      attachments,
      quickLinks,
      comments
    };
    updateTaskMutation.mutate(updateData);
    setIsEditModalOpen(false);
  };

  const handleCancel = () => {
    setIsEditModalOpen(false);
    if (task) {
      setEditForm({
        title: (task as any).title || "",
        description: (task as any).description || "",
        priority: (task as any).priority || "",
        status: (task as any).status || "",
        dueDate: (task as any).dueDate || "",
        assignedTo: (task as any).assignedTo || "",
        timeEstimate: (task as any).timeEstimate || "",
        category: (task as any).category || "",
        isRecurring: (task as any).isRecurring || false,
        recurrenceFrequency: (task as any).recurrenceFrequency || "",
        propertyId: (task as any).propertyId || ""
      });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateTaskMutation.mutate({ status: newStatus });
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem = {
        id: Date.now().toString(),
        text: newChecklistItem.trim(),
        completed: false
      };
      setChecklist([...checklist, newItem]);
      setNewChecklistItem("");
    }
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/tasks")}
            className="flex items-center text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
          <div className="flex items-center space-x-2">
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                  <DialogDescription>
                    Update task details, checklist items, and other information.
                  </DialogDescription>
                </DialogHeader>
                
                {/* Edit Modal Content */}
                <div className="space-y-6 py-4">
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

                  <div className="grid grid-cols-3 gap-4">
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
                    <div>
                      <Label htmlFor="edit-time-estimate">Time Estimate</Label>
                      <Input
                        id="edit-time-estimate"
                        value={editForm.timeEstimate}
                        onChange={(e) => setEditForm({ ...editForm, timeEstimate: e.target.value })}
                        placeholder="e.g., 45 minutes"
                      />
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
                          <SelectItem value="user1">John Smith</SelectItem>
                          <SelectItem value="user2">Sarah Johnson</SelectItem>
                          <SelectItem value="user3">Mike Wilson</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-property">Property</Label>
                      <Select 
                        value={editForm.propertyId}
                        onValueChange={(value) => setEditForm({ ...editForm, propertyId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Main Office Building</SelectItem>
                          <SelectItem value="2">Residential Complex A</SelectItem>
                          <SelectItem value="3">Commercial Plaza</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

                  {/* Conflict Warning */}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Schedule Conflict</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      This task overlaps with another task assigned to the same person or property. 
                      Supervisor override may be required.
                    </p>
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

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">{(task as any).title}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <Select
                value={(task as any).status || 'pending'}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-auto">
                  <Badge variant={getStatusColor((task as any).status || 'pending')} className="capitalize">
                    {(task as any).status ? (task as any).status.replace('_', ' ') : 'pending'}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant={getPriorityColor((task as any).priority || 'normal')} className="capitalize">
                {(task as any).priority || 'normal'} Priority
              </Badge>
              <div className="flex items-center text-slate-500">
                <Calendar className="w-4 h-4 mr-1" />
                Due: {formatDate((task as any).dueDate)}
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
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {(task as any).description || "No description provided."}
                  </p>
                </CardContent>
              </Card>

              {/* Checklist / Subtasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckSquare className="w-5 h-5 mr-2" />
                    Checklist / Subtasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => toggleChecklistItem(item.id)}
                        />
                        <span className={`flex-1 ${item.completed ? 'line-through text-slate-500' : ''}`}>
                          {item.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChecklistItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex items-center space-x-2 mt-4">
                      <Input
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        placeholder="Add new checklist item..."
                        onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                      />
                      <Button onClick={addChecklistItem} disabled={!newChecklistItem.trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
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
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
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
                    
                    <Button variant="outline" className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files
                    </Button>
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
                        <p className="text-slate-700">{(task as any).property.address}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-500">Type</Label>
                          <p className="text-slate-700 capitalize">{(task as any).property.type}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-500">Units</Label>
                          <p className="text-slate-700">{(task as any).property.units || 1}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-500">Status</Label>
                          <Badge variant="outline" className="capitalize">
                            {(task as any).property.status}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-500">Square Footage</Label>
                          <p className="text-slate-700">
                            {(task as any).property.squareFootage ? 
                              `${(task as any).property.squareFootage.toLocaleString()} sq ft` : 
                              'Not specified'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Details</CardTitle>
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
    </main>
  );
}