import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Send, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prefillEmail?: string;
  prefillContactId?: number;
  prefillPropertyIds?: string[];
  contactFirstName?: string;
}

export default function InviteToPortalModal({
  isOpen,
  onClose,
  prefillEmail = "",
  prefillContactId,
  prefillPropertyIds = [],
  contactFirstName,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState(prefillEmail);
  const [role, setRole] = useState<"resident" | "owner">("resident");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(prefillPropertyIds);
  const [duplicateInvitation, setDuplicateInvitation] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  // Sync prefill values whenever the modal opens (props may arrive after mount)
  useEffect(() => {
    if (isOpen) {
      setEmail(prefillEmail);
      setSelectedPropertyIds(prefillPropertyIds);
      setRole("resident");
      setDuplicateInvitation(null);
      setSuccess(false);
    }
  }, [isOpen, prefillEmail, prefillPropertyIds.join(",")]);

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
    enabled: isOpen,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest("POST", "/api/portal/invitations", body);
      if (!res.ok) {
        const data = await res.json();
        const err: any = new Error(data.message || "Failed to send invitation");
        err.status = res.status;
        err.invitation = data.invitation;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/invitations"] });
      toast({ title: "Invitation sent!", description: `Portal invite emailed to ${email}` });
      setTimeout(() => {
        handleClose();
      }, 2000);
    },
    onError: (err: any) => {
      if (err.status === 409 && err.invitation) {
        setDuplicateInvitation(err.invitation);
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/portal/invitations/${id}/resend`, {});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to resend");
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/invitations"] });
      toast({ title: "Invitation resent!", description: `New invite email sent to ${email}` });
      setTimeout(() => {
        handleClose();
      }, 2000);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setEmail(prefillEmail);
    setRole("resident");
    setSelectedPropertyIds(prefillPropertyIds);
    setDuplicateInvitation(null);
    setSuccess(false);
    onClose();
  };

  const toggleProperty = (id: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (!email) {
      toast({ title: "Email required", description: "Please enter the client's email address.", variant: "destructive" });
      return;
    }
    sendMutation.mutate({
      email,
      role,
      propertyIds: selectedPropertyIds,
      contactId: prefillContactId,
    });
  };

  const greeting = contactFirstName ? `Inviting ${contactFirstName}` : "Invite to Portal";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-teal-600" />
            {greeting}
          </DialogTitle>
          <DialogDescription>
            Send a branded email invitation so your client can create a portal account and access their property information.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="w-12 h-12 text-teal-500" />
            <p className="text-lg font-semibold text-slate-800">Invitation sent!</p>
            <p className="text-sm text-slate-500">The client will receive an email with a registration link.</p>
          </div>
        ) : duplicateInvitation ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Active invitation already exists</p>
                <p className="text-sm text-amber-700 mt-1">
                  An invitation for <strong>{email}</strong> was sent on{" "}
                  {duplicateInvitation.sentAt
                    ? new Date(duplicateInvitation.sentAt).toLocaleDateString()
                    : new Date(duplicateInvitation.createdAt).toLocaleDateString()}
                  {" "}and expires on{" "}
                  {new Date(duplicateInvitation.expiresAt).toLocaleDateString()}.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">Would you like to resend the invitation? This will reset the 7-day expiry window.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDuplicateInvitation(null)}>Back</Button>
              <Button
                onClick={() => resendMutation.mutate(duplicateInvitation.id)}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Resend Invitation
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                readOnly={!!prefillEmail}
                className={prefillEmail ? "bg-slate-50 text-slate-700" : ""}
                data-testid="invite-email-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger id="invite-role" data-testid="invite-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Client / Resident</SelectItem>
                  <SelectItem value="owner">Property Owner</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">This determines how the client is labeled in the portal.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Properties to Grant Access</Label>
              {(properties as any[]).length === 0 ? (
                <p className="text-sm text-slate-500 italic">No properties found.</p>
              ) : (
                <div className="max-h-44 overflow-y-auto border rounded-md divide-y">
                  {(properties as any[]).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                      <Checkbox
                        id={`prop-${p.id}`}
                        checked={selectedPropertyIds.includes(String(p.id))}
                        onCheckedChange={() => toggleProperty(String(p.id))}
                        data-testid={`invite-prop-${p.id}`}
                      />
                      <label htmlFor={`prop-${p.id}`} className="text-sm cursor-pointer flex-1">
                        {p.name}
                        {p.address1 && (
                          <span className="text-xs text-slate-500 ml-1">· {p.address1}</span>
                        )}
                      </label>
                      {selectedPropertyIds.includes(String(p.id)) && (
                        <Badge variant="secondary" className="text-xs shrink-0">Selected</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Client will see data for selected properties in their portal.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleSend}
                disabled={sendMutation.isPending || !email}
                data-testid="send-invitation-btn"
              >
                {sendMutation.isPending
                  ? <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  : <Send className="w-4 h-4 mr-2" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
