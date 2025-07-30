import { useState, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  User, 
  Edit, 
  Save, 
  X,
  Clock,
  AlertTriangle,
  CheckSquare,
  FileText as Template,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
  assignedToId?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  notes?: string;
  sortOrder: number;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  items: Array<{
    text: string;
    priority: string;
    dueOffsetDays?: number; // Days offset from parent task due date
  }>;
}

interface EnhancedChecklistProps {
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
  users: Array<{ id: string; firstName: string; lastName: string; profileImageUrl?: string }>;
  taskDueDate?: Date;
}

function SortableChecklistItem({ 
  item, 
  onUpdate, 
  onDelete, 
  users 
}: { 
  item: ChecklistItem; 
  onUpdate: (item: ChecklistItem) => void; 
  onDelete: (id: string) => void;
  users: Array<{ id: string; firstName: string; lastName: string; profileImageUrl?: string }>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(item);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assignedUser = users.find(u => u.id === item.assignedToId);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'normal': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(item);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start space-x-3 p-3 border rounded-lg bg-white",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <Checkbox
        checked={item.completed}
        onCheckedChange={(checked) => onUpdate({ ...item, completed: !!checked })}
        className="mt-1"
      />

      <div className="flex-1 space-y-2">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editData.text}
              onChange={(e) => setEditData({ ...editData, text: e.target.value })}
              placeholder="Checklist item description..."
              className="min-h-[60px]"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Priority */}
              <div>
                <Label className="text-xs text-slate-600">Priority</Label>
                <Select value={editData.priority} onValueChange={(value) => setEditData({ ...editData, priority: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <Label className="text-xs text-slate-600">Due Date</Label>
                <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editData.dueDate ? format(editData.dueDate, "MMM dd, yyyy") : "No due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editData.dueDate}
                      onSelect={(date) => {
                        setEditData({ ...editData, dueDate: date });
                        setIsDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Assignee */}
              <div>
                <Label className="text-xs text-slate-600">Assigned To</Label>
                <Popover open={isAssigneeOpen} onOpenChange={setIsAssigneeOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {editData.assignedToId ? (
                        <div className="flex items-center">
                          {assignedUser && (
                            <>
                              <Avatar className="w-5 h-5 mr-2">
                                <AvatarImage src={assignedUser.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {assignedUser.firstName?.[0]}{assignedUser.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              {assignedUser.firstName} {assignedUser.lastName}
                            </>
                          )}
                        </div>
                      ) : (
                        "Select assignee..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search team members..." />
                      <CommandEmpty>No team member found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setEditData({ ...editData, assignedToId: undefined });
                            setIsAssigneeOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", !editData.assignedToId ? "opacity-100" : "opacity-0")} />
                          Unassigned
                        </CommandItem>
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => {
                              setEditData({ ...editData, assignedToId: user.id });
                              setIsAssigneeOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", editData.assignedToId === user.id ? "opacity-100" : "opacity-0")} />
                            <Avatar className="w-5 h-5 mr-2">
                              <AvatarImage src={user.profileImageUrl} />
                              <AvatarFallback className="text-xs">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            {user.firstName} {user.lastName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs text-slate-600">Notes</Label>
              <Textarea
                value={editData.notes || ''}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="min-h-[40px]"
              />
            </div>

            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className={cn("text-sm", item.completed && "line-through text-slate-500")}>
              {item.text}
            </div>
            
            <div className="flex items-center flex-wrap gap-2">
              <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                {item.priority}
              </Badge>
              
              {item.dueDate && (
                <Badge variant="outline" className="text-xs">
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {format(item.dueDate, "MMM dd")}
                </Badge>
              )}
              
              {assignedUser && (
                <Badge variant="outline" className="text-xs">
                  <Avatar className="w-3 h-3 mr-1">
                    <AvatarImage src={assignedUser.profileImageUrl} />
                    <AvatarFallback className="text-xs">
                      {assignedUser.firstName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {assignedUser.firstName}
                </Badge>
              )}
            </div>

            {item.notes && (
              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                {item.notes}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex space-x-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Edit className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-3 h-3 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

export default function EnhancedChecklist({ items, onItemsChange, users, taskDueDate }: EnhancedChecklistProps) {
  const [newItemText, setNewItemText] = useState("");
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load checklist templates (in a real app, this would come from the API)
  useEffect(() => {
    // Mock templates for now - these would come from admin-managed templates
    setTemplates([
      {
        id: "1",
        name: "Property Inspection Checklist",
        description: "Standard property inspection items",
        category: "inspection",
        items: [
          { text: "Check exterior condition and landscaping", priority: "normal" },
          { text: "Inspect HVAC system operation", priority: "high" },
          { text: "Test smoke and carbon monoxide detectors", priority: "urgent" },
          { text: "Check plumbing fixtures and water pressure", priority: "normal" },
          { text: "Inspect electrical outlets and switches", priority: "normal" },
          { text: "Document any maintenance needs", priority: "normal" }
        ]
      },
      {
        id: "2", 
        name: "Maintenance Review",
        description: "Routine maintenance checklist",
        category: "maintenance",
        items: [
          { text: "Replace air filters", priority: "high" },
          { text: "Check and clean gutters", priority: "normal" },
          { text: "Test security system", priority: "high" },
          { text: "Update maintenance logs", priority: "normal" }
        ]
      }
    ]);
  }, []);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        sortOrder: index
      }));
      
      onItemsChange(newItems);
    }
  };

  const addNewItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newItemText,
      completed: false,
      priority: 'normal',
      sortOrder: items.length,
    };

    onItemsChange([...items, newItem]);
    setNewItemText("");
  };

  const updateItem = (updatedItem: ChecklistItem) => {
    const newItems = items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    );
    onItemsChange(newItems);
  };

  const deleteItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    onItemsChange(newItems);
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const newItems = template.items.map((templateItem, index) => {
      let dueDate: Date | undefined;
      if (templateItem.dueOffsetDays && taskDueDate) {
        dueDate = new Date(taskDueDate);
        dueDate.setDate(dueDate.getDate() + templateItem.dueOffsetDays);
      }

      return {
        id: `template-item-${Date.now()}-${index}`,
        text: templateItem.text,
        completed: false,
        priority: templateItem.priority as 'urgent' | 'high' | 'normal' | 'low',
        sortOrder: items.length + index,
        dueDate
      };
    });

    onItemsChange([...items, ...newItems]);
    setIsTemplateDialogOpen(false);
    setSelectedTemplate("");
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold">Checklist / Subtasks</h3>
          {totalCount > 0 && (
            <Badge variant="outline">
              {completedCount}/{totalCount} completed
            </Badge>
          )}
        </div>
        
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Template className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply Checklist Template</DialogTitle>
              <DialogDescription>
                Choose a pre-configured checklist template to add to this task.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-slate-600">{template.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplate && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-2">Template Preview:</h4>
                    <div className="space-y-2">
                      {templates.find(t => t.id === selectedTemplate)?.items.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <CheckSquare className="w-4 h-4 text-slate-400" />
                          <span>{item.text}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => applyTemplate(selectedTemplate)}
                disabled={!selectedTemplate}
              >
                Apply Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Checklist items */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <SortableChecklistItem
                  key={item.id}
                  item={item}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  users={users}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add new item */}
      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add new checklist item..."
            onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
          />
        </div>
        <Button onClick={addNewItem} disabled={!newItemText.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}