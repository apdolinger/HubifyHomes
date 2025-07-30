import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GripVertical, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Building,
  MessageSquare,
  Clock,
  Calendar,
  HelpCircle,
  UserX
} from "lucide-react";

interface Widget {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  order: number;
  category: 'stats' | 'content' | 'communication';
}

interface DashboardCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widgets: Widget[]) => void;
  currentWidgets: Widget[];
}

export default function DashboardCustomizationModal({
  isOpen,
  onClose,
  onSave,
  currentWidgets
}: DashboardCustomizationModalProps) {
  const [widgets, setWidgets] = useState<Widget[]>(currentWidgets);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragImageRef = useRef<HTMLDivElement>(null);

  // Update widgets when modal opens or currentWidgets change
  useEffect(() => {
    if (isOpen) {
      setWidgets(currentWidgets);
    }
  }, [isOpen, currentWidgets]);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === id ? { ...widget, enabled: !widget.enabled } : widget
    ));
  };

  const moveWidget = (draggedId: string, targetId: string) => {
    const draggedIndex = widgets.findIndex(w => w.id === draggedId);
    const targetIndex = widgets.findIndex(w => w.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newWidgets = [...widgets];
    const draggedWidget = newWidgets[draggedIndex];
    
    // Remove dragged item
    newWidgets.splice(draggedIndex, 1);
    
    // Insert at new position
    newWidgets.splice(targetIndex, 0, draggedWidget);
    
    // Update order values
    const updatedWidgets = newWidgets.map((widget, index) => ({
      ...widget,
      order: index + 1
    }));
    
    setWidgets(updatedWidgets);
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedItem(widgetId);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    
    // Create a custom drag image that shows the widget being dragged
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    
    // Create a clone for the drag image
    const clone = dragElement.cloneNode(true) as HTMLElement;
    clone.style.width = `${rect.width}px`;
    clone.style.transform = 'rotate(2deg)';
    clone.style.opacity = '0.9';
    clone.style.borderRadius = '8px';
    clone.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    clone.style.backgroundColor = '#ffffff';
    clone.style.position = 'absolute';
    clone.style.top = '-1000px';
    clone.style.left = '-1000px';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';
    
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, rect.width / 2, rect.height / 2);
    
    // Clean up the clone after drag starts
    setTimeout(() => {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent, widgetId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (widgetId && widgetId !== draggedItem) {
      setDragOverItem(widgetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetId) {
      moveWidget(draggedItem, targetId);
    }
    setDraggedItem(null);
    setDragOverItem(null);
    setIsDragging(false);
  };



  // Get widget icon based on ID
  const getWidgetIcon = (id: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      "urgent-tasks": <AlertTriangle className="w-4 h-4" />,
      "stats-overview": <Building className="w-4 h-4" />,
      "team-chat": <MessageSquare className="w-4 h-4" />,
      "recent-activity": <Clock className="w-4 h-4" />,
      "calendar": <Calendar className="w-4 h-4" />,
      "support": <HelpCircle className="w-4 h-4" />,
      "duplicates": <UserX className="w-4 h-4" />
    };
    return iconMap[id] || <Building className="w-4 h-4" />;
  };

  const handleReset = () => {
    // Reset to default configuration
    const defaultWidgets: Widget[] = [
      {
        id: "urgent-tasks",
        name: "Urgent Tasks",
        description: "View and manage high-priority tasks",
        icon: getWidgetIcon("urgent-tasks"),
        enabled: true,
        order: 1,
        category: "content"
      },
      {
        id: "stats-overview",
        name: "Statistics Overview",
        description: "Key metrics at a glance",
        icon: getWidgetIcon("stats-overview"),
        enabled: true,
        order: 2,
        category: "stats"
      },
      {
        id: "team-chat",
        name: "Team Chat",
        description: "Quick team communication",
        icon: getWidgetIcon("team-chat"),
        enabled: true,
        order: 3,
        category: "communication"
      },
      {
        id: "recent-activity",
        name: "Recent Activity",
        description: "Latest system activity and updates",
        icon: getWidgetIcon("recent-activity"),
        enabled: true,
        order: 4,
        category: "content"
      },
      {
        id: "calendar",
        name: "Calendar",
        description: "Upcoming events and deadlines",
        icon: getWidgetIcon("calendar"),
        enabled: false,
        order: 5,
        category: "content"
      },
      {
        id: "support",
        name: "Support",
        description: "Help, training, and tips",
        icon: getWidgetIcon("support"),
        enabled: false,
        order: 6,
        category: "content"
      },
      {
        id: "duplicates",
        name: "Duplicates",
        description: "Flagged duplicate people or properties",
        icon: getWidgetIcon("duplicates"),
        enabled: false,
        order: 7,
        category: "content"
      }
    ];
    setWidgets(defaultWidgets);
  };

  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);
  const disabledWidgets = widgets.filter(w => !w.enabled).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Enabled Widgets */}
          <div>
            <h3 className="text-lg font-medium mb-3">Active Widgets</h3>
            <p className="text-sm text-slate-600 mb-4">
              Drag to reorder widgets. The order here determines their layout on the dashboard.
            </p>
            <div className="space-y-2">
              {enabledWidgets.map((widget, index) => {
                const isBeingDragged = draggedItem === widget.id;
                const isDraggedOver = dragOverItem === widget.id;
                
                return (
                  <Card
                    key={widget.id}
                    className={`
                      cursor-move transition-all duration-200 ease-in-out
                      ${isBeingDragged 
                        ? 'opacity-50 scale-105 rotate-1 shadow-lg' 
                        : 'hover:shadow-md opacity-100 scale-100 rotate-0'
                      }
                      ${isDraggedOver && !isBeingDragged
                        ? 'border-2 border-blue-400 border-dashed bg-blue-50' 
                        : 'border border-slate-200'
                      }
                    `}
                    draggable
                    onDragStart={(e) => handleDragStart(e, widget.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, widget.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, widget.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <GripVertical className={`w-4 h-4 transition-colors ${
                            isBeingDragged ? 'text-blue-500' : 'text-slate-400'
                          }`} />
                          <div className="flex items-center space-x-2">
                            {widget.icon}
                            <div>
                              <div className="font-medium">{widget.name}</div>
                              <div className="text-sm text-slate-600">{widget.description}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={isDraggedOver ? "default" : "outline"}>
                            #{index + 1}
                          </Badge>
                          <Switch
                            checked={widget.enabled}
                            onCheckedChange={() => toggleWidget(widget.id)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Disabled Widgets */}
          {disabledWidgets.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Available Widgets</h3>
              <p className="text-sm text-slate-600 mb-4">
                Enable these widgets to add them to your dashboard.
              </p>
              <div className="space-y-2">
                {disabledWidgets.map((widget) => (
                  <Card key={widget.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4" /> {/* Spacer for alignment */}
                          <div className="flex items-center space-x-2">
                            {widget.icon}
                            <div>
                              <div className="font-medium">{widget.name}</div>
                              <div className="text-sm text-slate-600">{widget.description}</div>
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Drag Status */}
          {isDragging && draggedItem && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">
                  Moving "{widgets.find(w => w.id === draggedItem)?.name}" widget...
                </span>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Tips:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Drag widgets by their grip handle to reorder them</li>
              <li>• Drop zones will highlight when you drag over them</li>
              <li>• Use the switches to enable or disable widgets</li>
              <li>• Disabled widgets won't appear on your dashboard</li>
              <li>• You can always reset to default settings</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => {
              onSave([...widgets]); // Pass a copy to ensure state update
              onClose();
            }}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}