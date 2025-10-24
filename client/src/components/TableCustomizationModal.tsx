import { useState, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
}: TableCustomizationModalProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      setLocalColumns(columns);
    }
  }, [isOpen, columns]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Table</DialogTitle>
          <DialogDescription>
            Toggle column visibility and drag to reorder columns
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
