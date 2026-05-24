import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubmissionForm } from "@/components/SubmissionForm";

export { SubmissionForm as SubmissionFormContent } from "@/components/SubmissionForm";

interface SubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SubmissionModal({ open, onOpenChange }: SubmissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Get Started with Hubify
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Tell us about your business and we'll help find the right plan for you.
          </p>
        </DialogHeader>
        <SubmissionForm compact onSuccess={() => setTimeout(() => onOpenChange(false), 3000)} />
      </DialogContent>
    </Dialog>
  );
}
