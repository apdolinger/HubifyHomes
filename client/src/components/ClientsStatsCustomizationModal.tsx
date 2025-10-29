import { useState, useEffect, DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical, UserCheck } from "lucide-react";

export interface StatsWidget {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
}

interface ClientsStatsCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widgets: StatsWidget[]) => void;
  currentWidgets: StatsWidget[];
  defaultWidgets: StatsWidget[];
}

export default function ClientsStatsCustomizationModal({
  isOpen,
  onClose,
  onSave,
  currentWidgets,
  defaultWidgets
}: ClientsStatsCustomizationModalProps) {
  const [widgets, setWidgets] = useState<StatsWidget[]>(currentWidgets);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

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
    
    newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, draggedWidget);
    
    const updatedWidgets = newWidgets.map((widget, index) => ({
      ...widget,
      order: index + 1
    }));
    
    setWidgets(updatedWidgets);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    setDragOverItem(id);
  };

  const handleDragEnd = () => {
    if (draggedItem && dragOverItem && draggedItem !== dragOverItem) {
      moveWidget(draggedItem, dragOverItem);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleSave = () => {
    onSave(widgets);
    onClose();
  };

  const handleReset = () => {
    setWidgets([...defaultWidgets]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Stats Widgets</DialogTitle>
          <DialogDescription>
            Drag to reorder or toggle widgets on/off to customize your view
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            {widgets.map((widget) => (
              <Card
                key={widget.id}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.id)}
                onDragOver={(e) => handleDragOver(e, widget.id)}
                onDragEnd={handleDragEnd}
                className={`cursor-move transition-all ${
                  draggedItem === widget.id ? "opacity-50" : ""
                } ${dragOverItem === widget.id ? "border-primary" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <GripVertical className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    
                    <UserCheck className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900">{widget.name}</div>
                      <div className="text-sm text-slate-500 truncate">{widget.description}</div>
                    </div>
                    
                    <Switch
                      checked={widget.enabled}
                      onCheckedChange={() => toggleWidget(widget.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={handleReset}
              data-testid="button-reset-widgets"
            >
              Reset to Default
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-widgets"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                data-testid="button-save-widgets"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
