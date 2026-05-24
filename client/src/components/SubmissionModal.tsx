import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubmissionForm } from "@/components/SubmissionForm";

export { SubmissionForm as SubmissionFormContent } from "@/components/SubmissionForm";

interface SubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIntent?: "need_demo";
}

export default function SubmissionModal({ open, onOpenChange, initialIntent }: SubmissionModalProps) {
  const isDemo = initialIntent === "need_demo";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isDemo ? "Request a Personalized Demo" : "Get Started with Hubify"}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {isDemo
              ? "Tell us about your business and we'll set up a live walkthrough of Hubify tailored to your workflow."
              : "Tell us about your business and we'll help find the right plan for you."}
          </p>
        </DialogHeader>
        <SubmissionForm
          compact
          initialIntent={initialIntent}
          onSuccess={() => setTimeout(() => onOpenChange(false), 3000)}
        />
      </DialogContent>
    </Dialog>
  );
}
