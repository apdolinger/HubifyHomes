import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Clock, Building, Camera,
  Loader2, ImageIcon, AlertCircle
} from "lucide-react";
import { format, isPast } from "date-fns";

type ChecklistResult = "pass" | "fail" | "na";

function StatusButton({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 rounded-xl border-2 font-semibold text-base transition-all ${
        active ? color : "border-slate-200 bg-white text-slate-400"
      }`}
    >
      {label}
    </button>
  );
}

function ChecklistItemRow({
  item,
  onResultChange,
}: {
  item: any;
  onResultChange: (id: number, result: ChecklistResult | null) => void;
}) {
  const resultButtons: { label: string; value: ChecklistResult; color: string }[] = [
    { label: "Pass", value: "pass", color: "border-green-400 bg-green-50 text-green-700" },
    { label: "Fail", value: "fail", color: "border-red-400 bg-red-50 text-red-700" },
    { label: "N/A", value: "na", color: "border-slate-400 bg-slate-100 text-slate-600" },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <p className="text-sm font-medium text-slate-900 leading-snug">{item.text}</p>
      <div className="flex gap-2">
        {resultButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => onResultChange(item.id, item.result === btn.value ? null : btn.value)}
            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
              item.result === btn.value ? btn.color : "border-slate-200 bg-white text-slate-400"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FieldTaskDetail() {
  const [, params] = useRoute("/field/task/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const taskId = params?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState("");
  const [notesInitialized, setNotesInitialized] = useState(false);
  const [notesChanged, setNotesChanged] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; filename: string }[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const { data: task, isLoading } = useQuery<any>({
    queryKey: ["/api/tasks", taskId],
    queryFn: () => fetch(`/api/tasks/${taskId}`).then(r => r.json()),
    enabled: !!taskId,
  });

  useEffect(() => {
    if (task && !notesInitialized) {
      setNotes(task.notes || "");
      setUploadedPhotos(task.attachments || []);
      setNotesInitialized(true);
    }
  }, [task, notesInitialized]);

  const { data: checklistItems = [], isLoading: checklistLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks", taskId, "checklist"],
    queryFn: () => fetch(`/api/tasks/${taskId}/checklist-items`).then(r => r.json()),
    enabled: !!taskId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => apiRequest("PATCH", `/api/tasks/${taskId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks?showArchived=false"] });
      toast({ title: "Status updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update status.", variant: "destructive" }),
  });

  const saveNotesMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/tasks/${taskId}`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      setNotesChanged(false);
      toast({ title: "Notes saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save notes.", variant: "destructive" }),
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: async ({ id, result }: { id: number; result: ChecklistResult | null }) =>
      apiRequest("PATCH", `/api/task-checklist-items/${id}`, { result }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "checklist"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to update checklist item.", variant: "destructive" }),
  });

  const handleResultChange = useCallback((id: number, result: ChecklistResult | null) => {
    updateChecklistItemMutation.mutate({ id, result });
  }, [updateChecklistItemMutation]);

  const handlePhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreviewPhoto(localUrl);
    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Upload failed");
      const { urls } = await response.json();
      const uploadedUrl = urls[0];

      const newPhotos = [...uploadedPhotos, { url: uploadedUrl, filename: file.name }];
      setUploadedPhotos(newPhotos);

      await apiRequest("PATCH", `/api/tasks/${taskId}`, { attachments: newPhotos });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      toast({ title: "Photo uploaded", description: "Photo has been added to this task." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload photo.", variant: "destructive" });
      setPreviewPhoto(null);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadedPhotos, taskId, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-4 text-center py-16 text-slate-500">
        Task not found.
      </div>
    );
  }

  const statusOptions = [
    { value: "pending", label: "Open", color: "border-slate-400 bg-slate-100 text-slate-700" },
    { value: "in_progress", label: "In Progress", color: "border-blue-400 bg-blue-50 text-blue-700" },
    { value: "completed", label: "Done", color: "border-green-400 bg-green-50 text-green-700" },
  ];

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "completed";
  const checklist = Array.isArray(checklistItems) ? checklistItems : [];
  const reviewedCount = checklist.filter((i: any) => i.result === "pass" || i.result === "fail" || i.result === "na").length;
  const totalCount = checklist.length;

  return (
    <div className="p-4 space-y-5 pb-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/field")}
        className="flex items-center gap-1 text-blue-600 font-medium text-sm pt-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      {/* Task header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h1 className="text-lg font-bold text-slate-900 leading-snug">{task.title}</h1>

        {task.property && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building className="w-4 h-4 flex-shrink-0 text-slate-400" />
            <span>
              {task.property.name}
              {task.property.address1 && ` — ${task.property.address1}`}
            </span>
          </div>
        )}

        {task.dueDate && (
          <div className={`flex items-center gap-2 text-sm ${isOverdue ? "text-red-600" : "text-slate-600"}`}>
            {isOverdue ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4 text-slate-400" />}
            <span>{isOverdue ? "Overdue — " : "Due "}{format(new Date(task.dueDate), "MMM d, yyyy h:mm a")}</span>
          </div>
        )}

        {task.description && (
          <p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>
        )}
      </div>

      {/* Status toggle */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Status</h2>
        <div className="flex gap-2">
          {statusOptions.map((opt) => (
            <StatusButton
              key={opt.value}
              label={opt.label}
              active={task.status === opt.value}
              color={opt.color}
              onClick={() => {
                if (task.status !== opt.value) {
                  updateStatusMutation.mutate(opt.value);
                }
              }}
            />
          ))}
        </div>
        {updateStatusMutation.isPending && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      {/* Checklist */}
      {totalCount > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Checklist
            </h2>
            <span className="text-xs text-slate-500">{reviewedCount}/{totalCount} reviewed</span>
          </div>

          {checklistLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {checklist.map((item: any) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  onResultChange={handleResultChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Notes</h2>
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesChanged(true);
          }}
          placeholder="Add notes about this task..."
          className="min-h-[100px] text-sm resize-none"
        />
        {notesChanged && (
          <Button
            size="sm"
            onClick={() => saveNotesMutation.mutate()}
            disabled={saveNotesMutation.isPending}
            className="w-full"
          >
            {saveNotesMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              "Save Notes"
            )}
          </Button>
        )}
      </div>

      {/* Photo upload */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Photos</h2>

        {/* Existing photos */}
        {uploadedPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {uploadedPhotos.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Preview of photo being uploaded */}
        {isUploadingPhoto && previewPhoto && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border-2 border-blue-300 border-dashed">
            <img src={previewPhoto} alt="Uploading..." className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Uploading...</span>
              </div>
            </div>
          </div>
        )}

        {/* Camera button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoCapture}
        />
        <Button
          variant="outline"
          className="w-full h-14 text-base font-medium border-dashed border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingPhoto}
        >
          <Camera className="w-5 h-5 mr-2" />
          {isUploadingPhoto ? "Uploading..." : "Take or Upload Photo"}
        </Button>

        {uploadedPhotos.length === 0 && !isUploadingPhoto && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
            <ImageIcon className="w-4 h-4" />
            <span>No photos yet</span>
          </div>
        )}
      </div>
    </div>
  );
}
