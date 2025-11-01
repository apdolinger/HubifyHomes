import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Mail, MessageSquare, Users, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OrgEmailTemplate } from "@shared/schema";

interface TeamCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  memberCount: number;
}

const MERGE_FIELDS = [
  { label: "First Name", value: "{{firstName}}" },
  { label: "Last Name", value: "{{lastName}}" },
  { label: "Full Name", value: "{{fullName}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Team Name", value: "{{teamName}}" },
  { label: "Organization Name", value: "{{organizationName}}" },
];

export function TeamCommunicationModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  memberCount,
}: TeamCommunicationModalProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [communicationType, setCommunicationType] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Fetch email templates
  const { data: templates, isLoading: templatesLoading } = useQuery<OrgEmailTemplate[]>({
    queryKey: ["/api/email-templates"],
    enabled: isOpen && communicationType === "email",
  });

  // Fetch team members to show recipient preview
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery<any[]>({
    queryKey: [`/api/teams/${teamId}/members`],
    enabled: isOpen && !!teamId,
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: {
      teamId: string;
      subject: string;
      body: string;
      templateId?: number;
    }) => {
      return apiRequest("POST", "/api/teams/send-email", data);
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: `Successfully sent email to ${memberCount} team member${memberCount !== 1 ? 's' : ''}.`,
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

  // Send SMS mutation (placeholder)
  const sendSMSMutation = useMutation({
    mutationFn: async (data: {
      teamId: string;
      message: string;
    }) => {
      return apiRequest("POST", "/api/teams/send-sms", data);
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: `Successfully sent SMS to ${memberCount} team member${memberCount !== 1 ? 's' : ''}.`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send SMS",
        description: error.message || "An error occurred while sending the SMS.",
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

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + field.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Handle send
  const handleSubmit = () => {
    if (communicationType === "email") {
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

      sendEmailMutation.mutate({
        teamId,
        subject,
        body: message,
        templateId: selectedTemplateId ? parseInt(selectedTemplateId) : undefined,
      });
    } else {
      if (!message.trim()) {
        toast({
          title: "Validation Error",
          description: "Please provide an SMS message.",
          variant: "destructive",
        });
        return;
      }

      sendSMSMutation.mutate({
        teamId,
        message,
      });
    }
  };

  // Handle close and reset
  const handleClose = () => {
    setSubject("");
    setMessage("");
    setSelectedTemplateId("");
    setCommunicationType("email");
    onClose();
  };

  const isPending = sendEmailMutation.isPending || sendSMSMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Communicate with {teamName}
          </DialogTitle>
          <DialogDescription>
            Send a message to all {memberCount} team member{memberCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={communicationType} onValueChange={(v) => setCommunicationType(v as "email" | "sms")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" data-testid="tab-email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" data-testid="tab-sms">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4 mt-4">
            {/* Recipients Preview */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <Label className="text-xs text-slate-600 mb-2 block">Recipients</Label>
              <div className="flex flex-wrap gap-2">
                {membersLoading ? (
                  <span className="text-sm text-slate-500">Loading team members...</span>
                ) : teamMembers.length === 0 ? (
                  <span className="text-sm text-slate-500">No team members</span>
                ) : (
                  teamMembers.slice(0, 10).map((member: any) => (
                    <Badge key={member.userId} variant="secondary" className="text-xs">
                      {member.firstName} {member.lastName}
                    </Badge>
                  ))
                )}
                {teamMembers.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{teamMembers.length - 10} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <Label htmlFor="template">Email Template (Optional)</Label>
              <Select
                value={selectedTemplateId || undefined}
                onValueChange={handleTemplateSelect}
                disabled={templatesLoading}
              >
                <SelectTrigger id="template" data-testid="select-email-template">
                  <SelectValue placeholder="Select a template or start blank..." />
                </SelectTrigger>
                <SelectContent>
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
          </TabsContent>

          {/* SMS Tab */}
          <TabsContent value="sms" className="space-y-4 mt-4">
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                SMS messaging requires phone numbers to be configured for team members. Currently, the users table doesn't include phone numbers. This feature will be available once phone number support is added.
              </AlertDescription>
            </Alert>

            {/* Recipients Preview */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <Label className="text-xs text-slate-600 mb-2 block">Recipients</Label>
              <div className="flex flex-wrap gap-2">
                {membersLoading ? (
                  <span className="text-sm text-slate-500">Loading team members...</span>
                ) : teamMembers.length === 0 ? (
                  <span className="text-sm text-slate-500">No team members</span>
                ) : (
                  teamMembers.slice(0, 10).map((member: any) => (
                    <Badge key={member.userId} variant="secondary" className="text-xs">
                      {member.firstName} {member.lastName}
                      {member.phone && <span className="ml-1">📱</span>}
                    </Badge>
                  ))
                )}
                {teamMembers.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{teamMembers.length - 10} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Compose your SMS message (160 characters recommended)..."
                rows={5}
                maxLength={320}
                data-testid="textarea-sms-message"
              />
              <p className="text-xs text-slate-500 mt-1">
                {message.length}/320 characters
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || (communicationType === "sms" && teamMembers.every((m: any) => !m.phone))}
            data-testid="button-send"
          >
            {isPending
              ? "Sending..."
              : communicationType === "email"
              ? "Send Email to Team"
              : "Send SMS to Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
