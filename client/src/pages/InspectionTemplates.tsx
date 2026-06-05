import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, ClipboardList, Edit, Trash2, Eye, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["inspection", "home_watch", "maintenance", "cleaning", "security", "seasonal", "departure", "arrival", "other"];
const CATEGORY_LABELS: Record<string, string> = {
  inspection: "Inspection",
  home_watch: "Home Watch Visit",
  maintenance: "Maintenance",
  cleaning: "Cleaning",
  security: "Security Check",
  seasonal: "Seasonal Service",
  departure: "Departure Service",
  arrival: "Arrival / Welcome Home",
  other: "Other",
};

export default function InspectionTemplates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("inspection");
  const [newDescription, setNewDescription] = useState("");

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/checklist-templates"],
  });

  const inspectionTemplates = templates.filter(
    (t: any) => ["inspection", "home_watch", "maintenance", "cleaning", "security", "seasonal", "departure", "arrival", "other"].includes(t.category)
  );

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/checklist-templates", data),
    onSuccess: async (res: any) => {
      const created = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      toast({ title: "Template created" });
      setShowCreateDialog(false);
      setNewName("");
      setNewCategory("inspection");
      setNewDescription("");
      setLocation(`/admin/inspection-templates/${created.id}`);
    },
    onError: () => toast({ title: "Failed to create template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/checklist-templates/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: () => toast({ title: "Failed to delete template", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/checklist-templates/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/checklist-templates"] }),
    onError: () => toast({ title: "Failed to update template", variant: "destructive" }),
  });

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspection Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build reusable checklists for home watch visits, inspections, and services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["/api/checklist-templates"] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="animate-pulse">
              <CardContent className="pt-6 pb-5">
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : inspectionTemplates.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-600 font-medium mb-1">No templates yet</h3>
            <p className="text-gray-400 text-sm mb-4">Create your first inspection template to standardize your visit checklists.</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inspectionTemplates.map((t: any) => {
            const itemCount = Array.isArray(t.items) ? t.items.length : 0;
            return (
              <Card key={t.id} className={`border ${t.isActive ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-70"}`}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[t.category] || t.category}
                        </Badge>
                        <span className="text-xs text-gray-400">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <Switch
                      checked={!!t.isActive}
                      onCheckedChange={(v) => toggleActiveMutation.mutate({ id: t.id, isActive: v })}
                      className="ml-2 flex-shrink-0"
                    />
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setLocation(`/admin/inspection-templates/${t.id}`)}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Delete "${t.name}"? This cannot be undone.`)) {
                          deleteMutation.mutate(t.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Inspection Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Template Name <span className="text-red-500">*</span></Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Standard Home Watch Checklist"
                autoFocus
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Category <span className="text-red-500">*</span></Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description of this template..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ name: newName.trim(), category: newCategory, description: newDescription || null, items: [] })}
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {createMutation.isPending ? "Creating…" : "Create & Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
