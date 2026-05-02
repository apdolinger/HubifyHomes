import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  ArrowLeft,
  ClipboardCheck,
  Home,
  Calendar,
  User,
  Printer,
  AlertTriangle,
  Mail,
  Download,
} from "lucide-react";
import { format } from "date-fns";

function ResultBadge({ result }: { result?: string | null }) {
  if (!result) return <Badge variant="outline" className="text-slate-500">Pending</Badge>;
  if (result === "pass") return <Badge className="bg-green-100 text-green-800 border-green-300">Pass</Badge>;
  if (result === "fail") return <Badge className="bg-red-100 text-red-800 border-red-300">Fail</Badge>;
  if (result === "na") return <Badge className="bg-slate-100 text-slate-600">N/A</Badge>;
  return <Badge variant="outline">{result}</Badge>;
}

function ResultIcon({ result }: { result?: string | null }) {
  if (!result) return <Clock className="w-5 h-5 text-slate-400" />;
  if (result === "pass") return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (result === "fail") return <XCircle className="w-5 h-5 text-red-500" />;
  if (result === "na") return <MinusCircle className="w-5 h-5 text-slate-400" />;
  return <Clock className="w-5 h-5 text-slate-400" />;
}

export default function InspectionReport() {
  const params = useParams<{ taskId: string }>();
  const taskId = params.taskId;
  const { toast } = useToast();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailOverride, setEmailOverride] = useState("");
  const [attachPdfToEmail, setAttachPdfToEmail] = useState(false);

  const { data, isLoading, error } = useQuery<{
    task: any;
    checklistItems: any[];
    summary: { passCount: number; failCount: number; naCount: number; pendingCount: number };
  }>({
    queryKey: [`/api/tasks/${taskId}/inspection-report`],
    enabled: !!taskId,
  });

  const emailMutation = useMutation({
    mutationFn: async (emailAddress?: string) => {
      const body: any = { attachPdf: attachPdfToEmail };
      if (emailAddress) body.email = emailAddress;
      return apiRequest("POST", `/api/tasks/${taskId}/inspection-report/email`, body);
    },
    onSuccess: async (response: any) => {
      const json = await response.json();
      const desc = json.pdfAttached ? `Sent to ${json.sentTo} with PDF attached` : `Sent to ${json.sentTo}`;
      toast({ title: "Report emailed", description: desc });
      setIsEmailDialogOpen(false);
      setEmailOverride("");
      setAttachPdfToEmail(false);
    },
    onError: (e: any) => {
      toast({ title: "Failed to send email", description: e.message || "Please try again", variant: "destructive" });
    },
  });

  const handleEmailSend = () => {
    emailMutation.mutate(emailOverride || undefined);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-40 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Report Not Found</h2>
        <p className="text-slate-500 mb-4">This inspection report could not be loaded.</p>
        <Link href="/tasks">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </Link>
      </div>
    );
  }

  const { task, checklistItems, summary } = data;
  const totalItems = checklistItems.length;
  const overallScore = totalItems > 0
    ? Math.round(((summary.passCount + summary.naCount) / totalItems) * 100)
    : null;

  const failItems = checklistItems.filter((i) => i.result === "fail");
  const passItems = checklistItems.filter((i) => i.result === "pass");
  const pendingItems = checklistItems.filter((i) => !i.result);

  const scoreColor = overallScore === null
    ? "text-slate-500"
    : overallScore >= 80
    ? "text-green-600"
    : overallScore >= 60
    ? "text-yellow-600"
    : "text-red-600";

  const clientEmail = task?.contact?.email || "";
  const clientName = task?.contact
    ? `${task.contact.firstName || ""} ${task.contact.lastName || ""}`.trim()
    : "";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href={`/task-profile/${taskId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Task
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">Inspection Report</h1>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              Generated {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" onClick={() => setIsEmailDialogOpen(true)}>
            <Mail className="w-4 h-4 mr-2" />
            Email Report to Client
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="default" asChild>
            <a href={`/api/tasks/${taskId}/inspection-report/pdf`} download>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Task Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{task.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {task.property && (
              <div className="flex items-center gap-2 text-slate-600">
                <Home className="w-4 h-4 text-slate-400" />
                <span>{task.property?.address1 || task.propertyId || "—"}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{format(new Date(task.dueDate), "MMMM d, yyyy")}</span>
              </div>
            )}
            {task.assignedUser && (
              <div className="flex items-center gap-2 text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span>{`${task.assignedUser.firstName || ""} ${task.assignedUser.lastName || ""}`.trim() || "—"}</span>
              </div>
            )}
          </div>
          {task.description && (
            <p className="mt-3 text-sm text-slate-600">{task.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-4 text-center">
            <p className={`text-3xl font-bold ${scoreColor}`}>
              {overallScore !== null ? `${overallScore}%` : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Overall Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.passCount}</p>
            <p className="text-xs text-slate-500 mt-1">Passed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.failCount}</p>
            <p className="text-xs text-slate-500 mt-1">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-slate-500">{summary.naCount}</p>
            <p className="text-xs text-slate-500 mt-1">N/A</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{summary.pendingCount}</p>
            <p className="text-xs text-slate-500 mt-1">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Failed Items (highlighted) */}
      {failItems.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              Failed Items ({failItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failItems.map((item: any) => (
                <div key={item.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-slate-900">{item.text}</p>
                        {(() => {
                          const photoCount = [
                            ...(Array.isArray(item.photoUrls) ? item.photoUrls : []),
                            ...(item.photoUrl && !(item.photoUrls || []).includes(item.photoUrl) ? [item.photoUrl] : []),
                          ].length;
                          return photoCount > 0 ? (
                            <Badge className="h-5 px-1.5 text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                              {photoCount} {photoCount === 1 ? "photo" : "photos"}
                            </Badge>
                          ) : null;
                        })()}
                      </div>
                      {item.resultNote && (
                        <p className="text-sm text-slate-600 mt-1">{item.resultNote}</p>
                      )}
                      {(() => {
                        const allPhotos: string[] = [
                          ...(Array.isArray(item.photoUrls) ? item.photoUrls : []),
                          ...(item.photoUrl && !(item.photoUrls || []).includes(item.photoUrl) ? [item.photoUrl] : []),
                        ];
                        if (allPhotos.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {allPhotos.map((url: string, idx: number) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={url}
                                  alt={`Photo ${idx + 1}`}
                                  className="h-24 w-32 object-cover rounded border border-red-200 cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        );
                      })()}
                      {item.required && (
                        <Badge variant="outline" className="mt-1 text-xs text-red-600 border-red-300">Required</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Checklist Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Full Checklist ({totalItems} items)</CardTitle>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No checklist items recorded for this inspection.</p>
          ) : (() => {
            const grouped: Record<string, any[]> = {};
            checklistItems.forEach((item: any) => {
              const cat = item.category?.trim() || "General";
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(item);
            });
            return (
              <div className="space-y-6">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{category}</span>
                      <span className="text-xs text-slate-400">({items.length} item{items.length !== 1 ? "s" : ""})</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <div className="space-y-1">
                      {items.map((item: any, index: number) => (
                        <div key={item.id}>
                          <div className="flex items-start gap-3 py-3">
                            <ResultIcon result={item.result} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-slate-900">{item.text}</span>
                                {item.required && (
                                  <Badge variant="outline" className="text-xs">Required</Badge>
                                )}
                                <ResultBadge result={item.result} />
                                {(() => {
                                  const photoCount = [
                                    ...(Array.isArray(item.photoUrls) ? item.photoUrls : []),
                                    ...(item.photoUrl && !(item.photoUrls || []).includes(item.photoUrl) ? [item.photoUrl] : []),
                                  ].length;
                                  return photoCount > 0 ? (
                                    <Badge className="h-5 px-1.5 text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                                      {photoCount} {photoCount === 1 ? "photo" : "photos"}
                                    </Badge>
                                  ) : null;
                                })()}
                              </div>
                              {item.resultNote && (
                                <p className="text-sm text-slate-500 mt-0.5">{item.resultNote}</p>
                              )}
                              {(() => {
                                const allPhotos: string[] = [
                                  ...(Array.isArray(item.photoUrls) ? item.photoUrls : []),
                                  ...(item.photoUrl && !(item.photoUrls || []).includes(item.photoUrl) ? [item.photoUrl] : []),
                                ];
                                if (allPhotos.length === 0) return null;
                                return (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {allPhotos.map((url: string, idx: number) => (
                                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                        <img
                                          src={url}
                                          alt={`Photo ${idx + 1}`}
                                          className="h-16 w-24 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          {index < items.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Pending Items */}
      {pendingItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-sm font-medium">
                {pendingItems.length} item{pendingItems.length !== 1 ? "s" : ""} still pending review
              </p>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              This inspection is not yet complete. Go back to the task to record results.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="print:hidden pb-8" />

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Email Report to Client</DialogTitle>
            <DialogDescription>
              Send the inspection report link to the property's associated client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {clientEmail && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="text-slate-500">Client on file:</p>
                <p className="font-medium">{clientName || clientEmail}</p>
                <p className="text-slate-600">{clientEmail}</p>
              </div>
            )}
            <div className="space-y-1">
              <Label>{clientEmail ? "Or send to a different email address" : "Recipient email address"}</Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={emailOverride}
                onChange={(e) => setEmailOverride(e.target.value)}
              />
              {!clientEmail && !emailOverride && (
                <p className="text-xs text-amber-600">No client email found on this task. Enter an address above.</p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="attach-pdf"
                checked={attachPdfToEmail}
                onCheckedChange={(checked) => setAttachPdfToEmail(checked === true)}
              />
              <Label htmlFor="attach-pdf" className="cursor-pointer text-sm font-normal">
                Attach PDF report to email
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEmailDialogOpen(false); setEmailOverride(""); setAttachPdfToEmail(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleEmailSend}
              disabled={emailMutation.isPending || (!clientEmail && !emailOverride)}
            >
              <Mail className="w-4 h-4 mr-2" />
              {emailMutation.isPending ? "Sending..." : "Send Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
