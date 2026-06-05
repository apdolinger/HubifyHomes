import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, CheckCircle, XCircle, MinusCircle, Loader2,
  Camera, ChevronDown, ChevronRight, ClipboardCheck,
  AlertTriangle, FileText, Save, Send, Eye,
} from "lucide-react";
import { format } from "date-fns";

type FieldType = "pass_fail" | "yes_no" | "text_input" | "number_input" | "photo_required" | "before_after";

interface ChecklistItem {
  id: string;
  text: string;
  fieldType?: FieldType;
  required?: boolean;
  category?: string;
  notes?: string;
  requiresRecommendation?: boolean;
  result?: string;
  resultNote?: string;
  photoUrls?: string[];
  beforePhotoUrls?: string[];
  afterPhotoUrls?: string[];
  recommendation?: string;
  textAnswer?: string;
  numberAnswer?: string;
}

function ResultPill({ result }: { result?: string | null }) {
  if (!result) return <Badge variant="outline" className="text-slate-400 text-xs">Not answered</Badge>;
  if (result === "pass") return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Pass</Badge>;
  if (result === "fail") return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Fail</Badge>;
  if (result === "na") return <Badge className="bg-slate-100 text-slate-500 text-xs">N/A</Badge>;
  if (result === "yes") return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Yes</Badge>;
  if (result === "no") return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">No</Badge>;
  return <Badge variant="outline" className="text-xs">{result}</Badge>;
}

function PassFailButtons({ value, onChange, disabled }: { value?: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {["pass", "fail", "na"].map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === opt ? "" : opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            value === opt
              ? opt === "pass" ? "bg-green-600 text-white border-green-600"
              : opt === "fail" ? "bg-red-600 text-white border-red-600"
              : "bg-slate-600 text-white border-slate-600"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {opt === "pass" ? "✓ Pass" : opt === "fail" ? "✗ Fail" : "— N/A"}
        </button>
      ))}
    </div>
  );
}

function YesNoButtons({ value, onChange, disabled }: { value?: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5">
      {["yes", "no", "na"].map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === opt ? "" : opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            value === opt
              ? opt === "yes" ? "bg-green-600 text-white border-green-600"
              : opt === "no" ? "bg-red-600 text-white border-red-600"
              : "bg-slate-600 text-white border-slate-600"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {opt === "yes" ? "Yes" : opt === "no" ? "No" : "N/A"}
        </button>
      ))}
    </div>
  );
}

function PhotoUploadButton({ label, onUpload, uploading }: { label: string; onUpload: (file: File) => void; uploading?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onUpload(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-xs h-8"
        disabled={uploading}
        onClick={() => ref.current?.click()}
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Camera className="w-3.5 h-3.5 mr-1" />}
        {label}
      </Button>
    </>
  );
}

function PhotoThumbs({ urls }: { urls?: string[] }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="flex gap-1.5 flex-wrap mt-1.5">
      {urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt="" className="w-14 h-14 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
        </a>
      ))}
    </div>
  );
}

export default function VisitCompletion() {
  const { taskId } = useParams<{ taskId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [localItems, setLocalItems] = useState<Record<string, Partial<ChecklistItem>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [visitNotes, setVisitNotes] = useState("");
  const [visitRecommendations, setVisitRecommendations] = useState("");

  const { data, isLoading, error } = useQuery<{ task: any; checklistItems: ChecklistItem[]; summary: any; visitReport?: any }>({
    queryKey: [`/api/tasks/${taskId}/inspection-report`],
    enabled: !!taskId,
  });

  const saveItemMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiRequest("PATCH", `/api/task-checklist-items/${id}`, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/inspection-report`] }),
    onError: () => toast({ title: "Failed to save item", variant: "destructive" }),
  });

  const saveVisitReportMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest("POST", `/api/tasks/${taskId}/visit-report`, body),
    onSuccess: async (res: any) => {
      const vr = await res.json();
      qc.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/inspection-report`] });
      toast({ title: vr.status === "published" ? "Report published to portal" : "Visit report saved" });
    },
    onError: () => toast({ title: "Failed to save visit report", variant: "destructive" }),
  });

  const getItem = (id: string): ChecklistItem | undefined => {
    const base = data?.checklistItems.find((i) => i.id === id);
    if (!base) return undefined;
    return { ...base, ...localItems[id] };
  };

  const updateLocal = (id: string, patch: Partial<ChecklistItem>) => {
    setLocalItems((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const commitItem = async (id: string) => {
    const local = localItems[id];
    if (!local || Object.keys(local).length === 0) return;
    setSavingIds((prev) => new Set(prev).add(id));
    try {
      await saveItemMutation.mutateAsync({ id, updates: local });
      setLocalItems((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } finally {
      setSavingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const uploadPhoto = async (itemId: string, file: File, kind: "regular" | "before" | "after") => {
    setUploadingIds((prev) => new Set(prev).add(`${itemId}_${kind}`));
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/task-checklist-items/${itemId}/photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      // photoUrl comes from the upload endpoint; also track in before/after arrays if specified
      const photoUrl: string = json.photoUrl;
      if (kind === "before") {
        const item = getItem(itemId);
        const existing = item?.beforePhotoUrls || [];
        await saveItemMutation.mutateAsync({ id: itemId, updates: { beforePhotoUrls: [...existing, photoUrl] } });
      } else if (kind === "after") {
        const item = getItem(itemId);
        const existing = item?.afterPhotoUrls || [];
        await saveItemMutation.mutateAsync({ id: itemId, updates: { afterPhotoUrls: [...existing, photoUrl] } });
      }
      // For "regular" kind the upload endpoint already updated photoUrls; just invalidate
    } catch {
      toast({ title: "Photo upload failed", variant: "destructive" });
    } finally {
      setUploadingIds((prev) => { const n = new Set(prev); n.delete(`${itemId}_${kind}`); return n; });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Task not found</h2>
        <Button variant="outline" onClick={() => setLocation("/tasks")}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Tasks
        </Button>
      </div>
    );
  }

  const { task, checklistItems, summary, visitReport } = data;
  const totalItems = checklistItems.length;
  const answeredCount = checklistItems.filter((i) => {
    const merged = { ...i, ...localItems[i.id] };
    const ft = (merged.fieldType || "pass_fail") as FieldType;
    if (ft === "text_input") return !!merged.textAnswer;
    if (ft === "number_input") return merged.numberAnswer !== undefined && merged.numberAnswer !== "";
    return !!merged.result;
  }).length;
  const progressPct = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  // Group by section/category
  const sections: Record<string, ChecklistItem[]> = {};
  checklistItems.forEach((item) => {
    const sec = item.category || "General";
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(item);
  });

  const toggleSection = (s: string) => {
    setCollapsedSections((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation(`/task-profile/${taskId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-teal-600" />
              <h1 className="text-xl font-bold text-gray-900">Complete Visit</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{task?.title}</p>
          </div>
        </div>
        <a href={`/inspection-report/${taskId}`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="shrink-0">
            <Eye className="w-4 h-4 mr-1.5" />View Report
          </Button>
        </a>
      </div>

      {/* Progress */}
      <Card className="border border-gray-100">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Completion Progress</span>
            <span className="text-sm font-bold text-teal-700">{answeredCount}/{totalItems}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex gap-3 mt-2 flex-wrap">
            <span className="text-xs text-green-600 font-medium">✓ {summary?.passCount || 0} Pass</span>
            <span className="text-xs text-red-500 font-medium">✗ {summary?.failCount || 0} Fail</span>
            <span className="text-xs text-slate-400">— {summary?.naCount || 0} N/A</span>
            {summary?.pendingCount > 0 && <span className="text-xs text-amber-500">◦ {summary.pendingCount} Pending</span>}
          </div>
        </CardContent>
      </Card>

      {/* Checklist sections */}
      {Object.entries(sections).map(([section, items]) => {
        const collapsed = collapsedSections.has(section);
        const sectionAnswered = items.filter((i) => {
          const merged = { ...i, ...localItems[i.id] };
          const ft = (merged.fieldType || "pass_fail") as FieldType;
          if (ft === "text_input") return !!merged.textAnswer;
          if (ft === "number_input") return merged.numberAnswer !== undefined && merged.numberAnswer !== "";
          return !!merged.result;
        }).length;

        return (
          <Card key={section} className="border border-gray-100 overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-gray-50/80"
              onClick={() => toggleSection(section)}
            >
              <div className="flex items-center gap-2">
                {collapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                <span className="font-semibold text-gray-800">{section}</span>
                <span className="text-xs text-gray-400">{sectionAnswered}/{items.length}</span>
              </div>
              {sectionAnswered === items.length && items.length > 0 && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>

            {!collapsed && (
              <div className="divide-y divide-gray-50 px-1">
                {items.map((rawItem) => {
                  const item: ChecklistItem = { ...rawItem, ...localItems[rawItem.id] };
                  const ft = (item.fieldType || "pass_fail") as FieldType;
                  const isSaving = savingIds.has(item.id);
                  const isPhotoUploading = (kind: string) => uploadingIds.has(`${item.id}_${kind}`);

                  return (
                    <div key={item.id} className="px-3 py-4 space-y-3">
                      {/* Item header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-gray-800">{item.text}</p>
                            {item.required && <span className="text-xs text-red-500">*</span>}
                          </div>
                          {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ResultPill result={item.result} />
                          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />}
                        </div>
                      </div>

                      {/* Response input */}
                      {(ft === "pass_fail") && (
                        <PassFailButtons
                          value={item.result}
                          onChange={(v) => {
                            updateLocal(item.id, { result: v });
                            saveItemMutation.mutate({ id: item.id, updates: { result: v || null } });
                          }}
                        />
                      )}

                      {ft === "yes_no" && (
                        <YesNoButtons
                          value={item.result}
                          onChange={(v) => {
                            updateLocal(item.id, { result: v });
                            saveItemMutation.mutate({ id: item.id, updates: { result: v || null } });
                          }}
                        />
                      )}

                      {ft === "text_input" && (
                        <Textarea
                          value={item.textAnswer || ""}
                          onChange={(e) => updateLocal(item.id, { textAnswer: e.target.value })}
                          onBlur={() => commitItem(item.id)}
                          placeholder="Enter your answer..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                      )}

                      {ft === "number_input" && (
                        <Input
                          type="number"
                          value={item.numberAnswer || ""}
                          onChange={(e) => updateLocal(item.id, { numberAnswer: e.target.value })}
                          onBlur={() => commitItem(item.id)}
                          placeholder="Enter value..."
                          className="w-40 text-sm"
                        />
                      )}

                      {ft === "photo_required" && (
                        <div className="space-y-1.5">
                          <PhotoUploadButton
                            label="Take / Upload Photo"
                            onUpload={(f) => uploadPhoto(item.id, f, "regular")}
                            uploading={isPhotoUploading("regular")}
                          />
                          <PhotoThumbs urls={item.photoUrls} />
                        </div>
                      )}

                      {ft === "before_after" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1 font-medium">Before</p>
                            <PhotoUploadButton
                              label="Before Photo"
                              onUpload={(f) => uploadPhoto(item.id, f, "before")}
                              uploading={isPhotoUploading("before")}
                            />
                            <PhotoThumbs urls={item.beforePhotoUrls} />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1 font-medium">After</p>
                            <PhotoUploadButton
                              label="After Photo"
                              onUpload={(f) => uploadPhoto(item.id, f, "after")}
                              uploading={isPhotoUploading("after")}
                            />
                            <PhotoThumbs urls={item.afterPhotoUrls} />
                          </div>
                        </div>
                      )}

                      {/* Note for pass/fail/yes_no items */}
                      {(ft === "pass_fail" || ft === "yes_no") && (
                        <div className="space-y-1">
                          {(item.result === "fail" || item.result === "no" || item.resultNote) && (
                            <Textarea
                              value={item.resultNote || ""}
                              onChange={(e) => updateLocal(item.id, { resultNote: e.target.value })}
                              onBlur={() => commitItem(item.id)}
                              placeholder="Add note about this finding..."
                              rows={2}
                              className="resize-none text-xs"
                            />
                          )}
                          {(item.result !== "fail" && item.result !== "no" && !item.resultNote) && (
                            <button
                              type="button"
                              className="text-xs text-gray-400 hover:text-gray-600"
                              onClick={() => updateLocal(item.id, { resultNote: " " })}
                            >
                              + Add note
                            </button>
                          )}
                        </div>
                      )}

                      {/* Recommendation */}
                      {(item.result === "fail" || item.result === "no" || (item as any).requiresRecommendation || item.recommendation) && (
                        <div>
                          <Label className="text-xs font-medium text-amber-700 mb-1 block">Recommendation</Label>
                          <Textarea
                            value={item.recommendation || ""}
                            onChange={(e) => updateLocal(item.id, { recommendation: e.target.value })}
                            onBlur={() => commitItem(item.id)}
                            placeholder="Recommended action or repair..."
                            rows={2}
                            className="resize-none text-xs border-amber-200 focus-visible:ring-amber-400"
                          />
                        </div>
                      )}

                      {/* Photo evidence for pass_fail/yes_no items with fail result */}
                      {(ft === "pass_fail" || ft === "yes_no") && (item.result === "fail" || item.result === "no") && (
                        <div className="space-y-1">
                          <PhotoUploadButton
                            label="Add Photo Evidence"
                            onUpload={(f) => uploadPhoto(item.id, f, "regular")}
                            uploading={isPhotoUploading("regular")}
                          />
                          <PhotoThumbs urls={item.photoUrls} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {/* Visit-level notes & recommendations */}
      <Card className="border border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            Visit Notes & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm">Overall Notes</Label>
            <Textarea
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="General observations about this property visit..."
              rows={3}
              className="resize-none"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm text-amber-700">Recommendations</Label>
            <Textarea
              value={visitRecommendations}
              onChange={(e) => setVisitRecommendations(e.target.value)}
              placeholder="Items needing attention, repairs, or follow-up..."
              rows={3}
              className="resize-none border-amber-200 focus-visible:ring-amber-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              saveVisitReportMutation.mutate({
                notes: visitNotes,
                recommendations: visitRecommendations,
                status: "draft",
              })
            }
            disabled={saveVisitReportMutation.isPending}
          >
            {saveVisitReportMutation.isPending
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              saveVisitReportMutation.mutate({
                notes: visitNotes,
                recommendations: visitRecommendations,
                status: "completed",
              })
            }
            disabled={saveVisitReportMutation.isPending}
            className="text-green-700 border-green-300 hover:bg-green-50"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Complete
          </Button>
        </div>
        <Button
          onClick={() =>
            saveVisitReportMutation.mutate({
              notes: visitNotes,
              recommendations: visitRecommendations,
              status: "published",
              publishedToPortal: true,
            })
          }
          disabled={saveVisitReportMutation.isPending}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Send className="w-4 h-4 mr-2" />
          Complete & Publish to Portal
        </Button>
      </div>
    </div>
  );
}
