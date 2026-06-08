import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubmissionForm } from "@/components/SubmissionForm";
import type { SubmissionIntent } from "@/components/SubmissionForm";

export { SubmissionForm as SubmissionFormContent } from "@/components/SubmissionForm";
export type { SubmissionIntent } from "@/components/SubmissionForm";

interface SubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIntent?: SubmissionIntent;
}

function modalMeta(intent?: SubmissionIntent): { title: string; description: string } {
  switch (intent) {
    case "need_demo":
      return {
        title: "Request a Personalized Demo",
        description: "Tell us about your business and we'll set up a live walkthrough of Hubify tailored to your workflow.",
      };
    case "beta_application":
      return {
        title: "Become a Founding Member",
        description: "Join our Founding Member program and lock in your discount for the lifetime of your subscription.",
      };
    case "contact":
      return {
        title: "Get in Touch",
        description: "We'll get back to you within one business day.",
      };
    case "pricing_starter":
      return {
        title: "Get Started — Starter Portfolio",
        description: "Perfect for 1–10 homes. Tell us about your business and we'll get your Starter plan set up.",
      };
    case "pricing_growth":
      return {
        title: "Get Started — Growth Portfolio",
        description: "Designed for 11–25 homes. Tell us about your business and we'll get your Growth plan set up.",
      };
    case "pricing_professional":
      return {
        title: "Get Started — Professional Portfolio",
        description: "Built for 26–50 homes. Tell us about your business and we'll get your Professional plan set up.",
      };
    default:
      return {
        title: "Get Started with Hubify",
        description: "Tell us about your business and we'll help find the right plan for you.",
      };
  }
}

export default function SubmissionModal({ open, onOpenChange, initialIntent }: SubmissionModalProps) {
  const { title, description } = modalMeta(initialIntent);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">{title}</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
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
