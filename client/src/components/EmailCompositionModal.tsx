import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Code2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { OrgEmailTemplate } from "@shared/schema";

interface EmailCompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  recipientName: string;
  recipientContactId?: string;
}

const MERGE_FIELDS = [
  { label: "First Name", value: "{{firstName}}" },
  { label: "Last Name", value: "{{lastName}}" },
  { label: "Full Name", value: "{{fullName}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Phone", value: "{{phone}}" },
  { label: "Property Name", value: "{{propertyName}}" },
  { label: "Organization Name", value: "{{organizationName}}" },
];

export function EmailCompositionModal({
  isOpen,
  onClose,
  recipientEmail,
  recipientName,
  recipientContactId,
}: EmailCompositionModalProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState("");

  // Fetch email templates
  const { data: templates, isLoading: templatesLoading } = useQuery<OrgEmailTemplate[]>({
    queryKey: ["/api/email-templates"],
    enabled: isOpen,
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: {
      recipientEmail: string;
      recipientName: string;
      recipientContactId?: string;
      subject: string;
      body: string;
      templateId?: number;
      scheduledFor?: string;
      mergeFieldData?: Record<string, any>;
    }) => {
      return apiRequest("POST", "/api/send-email-advanced", data);
    },
    onSuccess: () => {
      toast({
        title: isScheduled ? "Email Scheduled" : "Email Sent",
        description: isScheduled
          ? "Your email has been scheduled successfully."
          : "Your email has been sent successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "An error occurred while sending the email.",
        variant: "destructive",
      });
    },
  });

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (!templateId) {
      return;
    }

    const template = templates?.find((t) => t.id.toString() === templateId);
    if (template) {
      setSubject(template.subject);
      setMessage(template.body || "");
    }
  };

  // Insert merge field at cursor position
  const insertMergeField = (field: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessage((prev) => prev + field);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = before + field + after;
    setMessage(newText);

    // Set cursor position after the inserted field
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + field.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Handle send/schedule
  const handleSubmit = () => {
    // Validation
    if (!subject.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide an email subject.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide an email message.",
        variant: "destructive",
      });
      return;
    }

    if (isScheduled) {
      if (!scheduledDate) {
        toast({
          title: "Validation Error",
          description: "Please select a date for scheduling.",
          variant: "destructive",
        });
        return;
      }

      if (!scheduledTime) {
        toast({
          title: "Validation Error",
          description: "Please select a time for scheduling.",
          variant: "destructive",
        });
        return;
      }
    }

    // Prepare scheduled datetime
    let scheduledFor: string | undefined = undefined;
    if (isScheduled && scheduledDate && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(":");
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      scheduledFor = scheduledDateTime.toISOString();
    }

    // Send email
    sendEmailMutation.mutate({
      recipientEmail,
      recipientName,
      recipientContactId,
      subject,
      body: message,
      templateId: selectedTemplateId ? parseInt(selectedTemplateId) : undefined,
      scheduledFor,
      mergeFieldData: {
        firstName: recipientName.split(" ")[0] || "",
        lastName: recipientName.split(" ").slice(1).join(" ") || "",
        fullName: recipientName,
        email: recipientEmail,
      },
    });
  };

  // Handle close and reset
  const handleClose = () => {
    setSubject("");
    setMessage("");
    setSelectedTemplateId("");
    setIsScheduled(false);
    setScheduledDate(undefined);
    setScheduledTime("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            Send an email to {recipientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipient */}
          <div>
            <Label htmlFor="recipient">To</Label>
            <Input
              id="recipient"
              value={recipientEmail}
              disabled
              className="bg-slate-50"
              data-testid="input-email-recipient"
            />
          </div>

          {/* Template Selector */}
          <div>
            <Label htmlFor="template">Email Template (Optional)</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={handleTemplateSelect}
              disabled={templatesLoading}
            >
              <SelectTrigger id="template" data-testid="select-email-template">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Blank Email)</SelectItem>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              data-testid="input-email-subject"
            />
          </div>

          {/* Merge Field Toolbar */}
          <div>
            <Label className="mb-2 block">Insert Merge Fields</Label>
            <div className="flex flex-wrap gap-2">
              {MERGE_FIELDS.map((field) => (
                <Button
                  key={field.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertMergeField(field.value)}
                  data-testid={`button-merge-field-${field.value.replace(/[{}]/g, "")}`}
                >
                  <Code2 className="w-3 h-3 mr-1" />
                  {field.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              ref={textareaRef}
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Compose your message..."
              rows={10}
              className="font-mono text-sm"
              data-testid="textarea-email-message"
            />
          </div>

          {/* Schedule Toggle */}
          <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg">
            <Switch
              id="schedule-toggle"
              checked={isScheduled}
              onCheckedChange={setIsScheduled}
              data-testid="switch-schedule-email"
            />
            <Label htmlFor="schedule-toggle" className="cursor-pointer">
              Schedule for later
            </Label>
          </div>

          {/* Scheduling Inputs */}
          {isScheduled && (
            <div className="space-y-3 pl-4 border-l-2 border-blue-200">
              <div>
                <Label htmlFor="scheduled-date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="scheduled-date"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      data-testid="calendar-scheduled-date"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="scheduled-time">Time</Label>
                <Input
                  id="scheduled-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  data-testid="input-scheduled-time"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={sendEmailMutation.isPending}
            data-testid="button-cancel-email"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={sendEmailMutation.isPending}
            data-testid="button-send-email"
          >
            {sendEmailMutation.isPending
              ? "Sending..."
              : isScheduled
              ? "Schedule Email"
              : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
