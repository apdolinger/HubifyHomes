import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpModalProps) {
  const shortcuts = [
    { key: "S", description: "Quick Search" },
    { key: "T", description: "Add Task" },
    { key: "?", description: "Open Support" },
    { key: "ESC", description: "Close Modal" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{shortcut.description}</span>
              <kbd className="kbd">{shortcut.key}</kbd>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-slate-50 rounded-md">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-slate-600 mt-0.5" />
            <p className="text-xs text-slate-600">
              Keyboard shortcuts are disabled when typing in form fields.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
