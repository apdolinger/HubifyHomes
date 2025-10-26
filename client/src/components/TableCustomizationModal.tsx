import { useState, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Cannot be hidden
}

interface TableCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  defaultColumns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => void;
  // Archive settings props
  completedRetentionDays?: number;
  cancelledRetentionDays?: number;
  onSaveArchiveSettings?: (completed: number, cancelled: number) => void;
  isSavingArchiveSettings?: boolean;
}

function SortableColumn({ column, onToggle }: { column: ColumnConfig; onToggle: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center space-x-3 p-3 border rounded-lg bg-white",
        isDragging && "opacity-50 border-primary"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-slate-400" />
      </div>
      <Checkbox
        id={column.id}
        checked={column.visible}
        onCheckedChange={() => !column.required && onToggle(column.id)}
        disabled={column.required}
        data-testid={`column-toggle-${column.id}`}
      />
      <Label
        htmlFor={column.id}
        className={cn(
          "flex-1 cursor-pointer",
          column.required && "text-slate-500"
        )}
      >
        {column.label}
        {column.required && <span className="ml-2 text-xs text-slate-400">(Required)</span>}
      </Label>
    </div>
  );
}

export default function TableCustomizationModal({
  isOpen,
  onClose,
  columns,
  defaultColumns,
  onSave,
  completedRetentionDays = 60,
  cancelledRetentionDays = 60,
  onSaveArchiveSettings,
  isSavingArchiveSettings = false,
}: TableCustomizationModalProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [localCompletedRetention, setLocalCompletedRetention] = useState(completedRetentionDays);
  const [localCancelledRetention, setLocalCancelledRetention] = useState(cancelledRetentionDays);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      setLocalColumns(columns);
      setLocalCompletedRetention(completedRetentionDays);
      setLocalCancelledRetention(cancelledRetentionDays);
    }
  }, [isOpen, columns, completedRetentionDays, cancelledRetentionDays]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggle = (id: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.id === id ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const handleReset = () => {
    // Reset to default columns (both order and visibility)
    const resetColumns = defaultColumns.map((col) => ({
      ...col,
      visible: true,
    }));
    setLocalColumns(resetColumns);
  };

  const handleSaveArchiveSettings = () => {
    if (onSaveArchiveSettings) {
      onSaveArchiveSettings(localCompletedRetention, localCancelledRetention);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Table Settings</DialogTitle>
          <DialogDescription>
            Customize table columns and archive settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="columns" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="archive">Archive Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="columns" className="space-y-4">
            <div className="space-y-2 max-h-96 overflow-y-auto py-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localColumns.map((col) => col.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localColumns.map((column) => (
                    <SortableColumn
                      key={column.id}
                      column={column}
                      onToggle={handleToggle}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="outline" onClick={handleReset} data-testid="reset-columns-btn">
                Reset to Default
              </Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} data-testid="save-columns-btn">
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="archive" className="space-y-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="completed-retention">Archive completed tasks after (days)</Label>
                <Input
                  id="completed-retention"
                  type="number"
                  min="0"
                  value={localCompletedRetention}
                  onChange={(e) => setLocalCompletedRetention(parseInt(e.target.value) || 0)}
                  data-testid="input-completed-retention"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancelled-retention">Archive cancelled tasks after (days)</Label>
                <Input
                  id="cancelled-retention"
                  type="number"
                  min="0"
                  value={localCancelledRetention}
                  onChange={(e) => setLocalCancelledRetention(parseInt(e.target.value) || 0)}
                  data-testid="input-cancelled-retention"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Archived tasks are hidden by default but can be viewed by toggling "Show Archived Tasks".
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isSavingArchiveSettings}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveArchiveSettings} 
                data-testid="button-save-retention"
                disabled={isSavingArchiveSettings}
              >
                {isSavingArchiveSettings ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
