import { useState, useEffect } from "react";
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
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetId) {
      moveWidget(draggedItem, targetId);
    }
    setDraggedItem(null);
  };



  const handleReset = () => {
    // Reset to default configuration
    const defaultWidgets: Widget[] = [
      {
        id: "urgent-tasks",
        name: "Urgent Tasks",
        description: "View and manage high-priority tasks",
        icon: <AlertTriangle className="w-4 h-4" />,
        enabled: true,
        order: 1,
        category: "content"
      },
      {
        id: "stats-overview",
        name: "Statistics Overview",
        description: "Key metrics at a glance",
        icon: <Building className="w-4 h-4" />,
        enabled: true,
        order: 2,
        category: "stats"
      },
      {
        id: "team-chat",
        name: "Team Chat",
        description: "Quick team communication",
        icon: <MessageSquare className="w-4 h-4" />,
        enabled: true,
        order: 3,
        category: "communication"
      },
      {
        id: "recent-activity",
        name: "Recent Activity",
        description: "Latest system activity and updates",
        icon: <Clock className="w-4 h-4" />,
        enabled: true,
        order: 4,
        category: "content"
      },
      {
        id: "calendar",
        name: "Calendar",
        description: "Upcoming events and deadlines",
        icon: <Calendar className="w-4 h-4" />,
        enabled: false,
        order: 5,
        category: "content"
      },
      {
        id: "support",
        name: "Support",
        description: "Help, training, and tips",
        icon: <HelpCircle className="w-4 h-4" />,
        enabled: false,
        order: 6,
        category: "content"
      },
      {
        id: "duplicates",
        name: "Duplicates",
        description: "Flagged duplicate people or properties",
        icon: <UserX className="w-4 h-4" />,
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
              {enabledWidgets.map((widget, index) => (
                <Card
                  key={widget.id}
                  className="cursor-move hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => handleDragStart(e, widget.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, widget.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <GripVertical className="w-4 h-4 text-slate-400" />
                        <div className="flex items-center space-x-2">
                          {widget.icon}
                          <div>
                            <div className="font-medium">{widget.name}</div>
                            <div className="text-sm text-slate-600">{widget.description}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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

          {/* Tips */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Tips:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Drag widgets in the "Active Widgets" section to reorder them</li>
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