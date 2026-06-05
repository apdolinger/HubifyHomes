import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Trash2, Save, GripVertical, ChevronDown, ChevronRight,
  Loader2, CheckSquare, AlignLeft, Hash, Camera, Image, ToggleLeft, Eye
} from "lucide-react";

type FieldType = "pass_fail" | "yes_no" | "text_input" | "number_input" | "photo_required" | "before_after";

interface TemplateItem {
  id: string;
  text: string;
  fieldType: FieldType;
  required: boolean;
  category: string; // section/category name
  requiresRecommendation: boolean;
  notes: string;
  sortOrder: number;
}

const FIELD_TYPE_CONFIG: Record<FieldType, { label: string; icon: any; color: string }> = {
  pass_fail: { label: "Pass / Fail", icon: CheckSquare, color: "text-green-600" },
  yes_no: { label: "Yes / No", icon: ToggleLeft, color: "text-blue-600" },
  text_input: { label: "Text Entry", icon: AlignLeft, color: "text-purple-600" },
  number_input: { label: "Number Entry", icon: Hash, color: "text-orange-600" },
  photo_required: { label: "Photo Required", icon: Camera, color: "text-pink-600" },
  before_after: { label: "Before & After Photos", icon: Image, color: "text-teal-600" },
};

const CATEGORIES = ["inspection", "home_watch", "maintenance", "cleaning", "security", "seasonal", "departure", "arrival", "other"];
const CATEGORY_LABELS: Record<string, string> = {
  inspection: "Inspection", home_watch: "Home Watch Visit", maintenance: "Maintenance",
  cleaning: "Cleaning", security: "Security Check", seasonal: "Seasonal Service",
  departure: "Departure Service", arrival: "Arrival / Welcome Home", other: "Other",
};

function newItemId() { return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function FieldTypeIcon({ type }: { type: FieldType }) {
  const cfg = FIELD_TYPE_CONFIG[type] || FIELD_TYPE_CONFIG.pass_fail;
  const Icon = cfg.icon;
  return <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />;
}

export default function InspectionTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("inspection");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [sections, setSections] = useState<string[]>(["General"]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [addToSection, setAddToSection] = useState("General");
  const [newItemText, setNewItemText] = useState("");
  const [newItemFieldType, setNewItemFieldType] = useState<FieldType>("pass_fail");
  const [newItemRequired, setNewItemRequired] = useState(true);
  const [newItemRecomm, setNewItemRecomm] = useState(false);
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { data: template, isLoading } = useQuery<any>({
    queryKey: ["/api/checklist-templates", id],
    queryFn: async () => {
      const res = await fetch(`/api/checklist-templates`);
      const all = await res.json();
      return all.find((t: any) => t.id === id) || null;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setCategory(template.category || "inspection");
      setDescription(template.description || "");
      setIsActive(template.isActive !== false);
      const rawItems: TemplateItem[] = (template.items || []).map((it: any, idx: number) => ({
        id: it.id || newItemId(),
        text: it.text || "",
        fieldType: (it.fieldType as FieldType) || "pass_fail",
        required: it.required !== false,
        category: it.category || "General",
        requiresRecommendation: it.requiresRecommendation || false,
        notes: it.notes || "",
        sortOrder: it.sortOrder ?? idx,
      }));
      setItems(rawItems);
      const uniqueSections = Array.from(new Set(rawItems.map((i) => i.category || "General")));
      setSections(uniqueSections.length > 0 ? uniqueSections : ["General"]);
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/checklist-templates/${id}`, {
        name: name.trim(),
        category,
        description: description.trim() || null,
        isActive,
        items: items.map((it, idx) => ({ ...it, sortOrder: idx })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      toast({ title: "Template saved" });
      setIsDirty(false);
    },
    onError: () => toast({ title: "Failed to save template", variant: "destructive" }),
  });

  const markDirty = () => setIsDirty(true);

  const addItem = () => {
    if (!newItemText.trim()) return;
    const sectionItems = items.filter((i) => i.category === addToSection);
    const newItem: TemplateItem = {
      id: newItemId(),
      text: newItemText.trim(),
      fieldType: newItemFieldType,
      required: newItemRequired,
      category: addToSection,
      requiresRecommendation: newItemRecomm,
      notes: "",
      sortOrder: sectionItems.length,
    };
    setItems((prev) => [...prev, newItem]);
    setNewItemText("");
    setNewItemFieldType("pass_fail");
    setNewItemRequired(true);
    setNewItemRecomm(false);
    setShowAddItemDialog(false);
    markDirty();
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    markDirty();
  };

  const updateItem = (itemId: string, patch: Partial<TemplateItem>) => {
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, ...patch } : i));
    markDirty();
  };

  const addSection = () => {
    const trimmed = newSectionName.trim();
    if (!trimmed || sections.includes(trimmed)) return;
    setSections((prev) => [...prev, trimmed]);
    setNewSectionName("");
    setShowAddSectionDialog(false);
    markDirty();
  };

  const removeSection = (sec: string) => {
    if (sections.length <= 1) { toast({ title: "Cannot remove the last section", variant: "destructive" }); return; }
    // Move items from this section to the first remaining section
    const remaining = sections.filter((s) => s !== sec);
    setItems((prev) => prev.map((i) => i.category === sec ? { ...i, category: remaining[0] } : i));
    setSections(remaining);
    markDirty();
  };

  const toggleSection = (sec: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sec)) next.delete(sec); else next.add(sec);
      return next;
    });
  };

  const totalItems = items.length;
  const requiredCount = items.filter((i) => i.required).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Template not found</h2>
        <Button variant="outline" onClick={() => setLocation("/admin/inspection-templates")}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation("/admin/inspection-templates")}>
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{name || "Untitled Template"}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{totalItems} items · {requiredCount} required · {sections.length} section{sections.length !== 1 ? "s" : ""}</p>
          </div>
          {isDirty && <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Unsaved changes</Badge>}
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save</>}
        </Button>
      </div>

      {/* Template Settings */}
      <Card className="mb-6 border border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">Template Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} placeholder="Template name" />
            </div>
            <div>
              <Label className="mb-1.5 block">Category</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); markDirty(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); markDirty(); }}
              placeholder="Optional description"
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={(v) => { setIsActive(v); markDirty(); }} id="active" />
            <Label htmlFor="active" className="cursor-pointer text-sm">Active (visible when applying to tasks)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Sections & Items */}
      <div className="space-y-4">
        {sections.map((sec) => {
          const sectionItems = items.filter((i) => i.category === sec).sort((a, b) => a.sortOrder - b.sortOrder);
          const collapsed = collapsedSections.has(sec);
          return (
            <Card key={sec} className="border border-gray-100">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50/70 rounded-t-lg select-none"
                onClick={() => toggleSection(sec)}
              >
                <div className="flex items-center gap-2">
                  {collapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  <span className="font-semibold text-gray-800">{sec}</span>
                  <Badge variant="outline" className="text-xs">{sectionItems.length}</Badge>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-teal-600 hover:text-teal-700"
                    onClick={() => { setAddToSection(sec); setShowAddItemDialog(true); }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />Add Item
                  </Button>
                  {sections.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-red-400 hover:text-red-500"
                      onClick={() => removeSection(sec)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {!collapsed && (
                <CardContent className="pt-0 pb-3">
                  {sectionItems.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-lg">
                      <p className="text-xs text-gray-400">No items in this section.</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 text-teal-600 text-xs"
                        onClick={() => { setAddToSection(sec); setShowAddItemDialog(true); }}
                      >
                        <Plus className="w-3 h-3 mr-1" />Add first item
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {sectionItems.map((item) => (
                        <div key={item.id} className="flex items-start gap-2.5 py-2.5 group">
                          <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm text-gray-800 font-medium">{item.text}</span>
                              {item.required && (
                                <span className="text-xs text-red-500 font-medium">Required</span>
                              )}
                              {item.requiresRecommendation && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">Rec. required</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <FieldTypeIcon type={item.fieldType} />
                              <span className="text-xs text-gray-400">{FIELD_TYPE_CONFIG[item.fieldType]?.label || item.fieldType}</span>
                            </div>
                            {item.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingItem(item)}
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-500"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddSectionDialog(true)}
          className="text-gray-600"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add Section
        </Button>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Checklist Item — {addToSection}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Item Text <span className="text-red-500">*</span></Label>
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="e.g. Check all exterior doors are locked"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Response Type</Label>
              <Select value={newItemFieldType} onValueChange={(v) => setNewItemFieldType(v as FieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map((ft) => {
                    const cfg = FIELD_TYPE_CONFIG[ft];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={ft} value={ft}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={newItemRequired} onCheckedChange={setNewItemRequired} id="req" />
                <Label htmlFor="req" className="cursor-pointer text-sm">Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newItemRecomm} onCheckedChange={setNewItemRecomm} id="recomm" />
                <Label htmlFor="recomm" className="cursor-pointer text-sm text-amber-700">Recommendation required</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>Cancel</Button>
            <Button
              onClick={addItem}
              disabled={!newItemText.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={showAddSectionDialog} onOpenChange={setShowAddSectionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-1.5 block">Section Name</Label>
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g. Exterior, Kitchen, HVAC..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addSection()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSectionDialog(false)}>Cancel</Button>
            <Button
              onClick={addSection}
              disabled={!newSectionName.trim() || sections.includes(newSectionName.trim())}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="mb-1.5 block">Item Text</Label>
                <Input
                  value={editingItem.text}
                  onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Response Type</Label>
                <Select
                  value={editingItem.fieldType}
                  onValueChange={(v) => setEditingItem({ ...editingItem, fieldType: v as FieldType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map((ft) => {
                      const cfg = FIELD_TYPE_CONFIG[ft];
                      return <SelectItem key={ft} value={ft}>{cfg.label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Section</Label>
                <Select
                  value={editingItem.category}
                  onValueChange={(v) => setEditingItem({ ...editingItem, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Staff Notes / Instructions</Label>
                <Textarea
                  value={editingItem.notes}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  placeholder="Instructions or context for staff completing this item"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingItem.required}
                    onCheckedChange={(v) => setEditingItem({ ...editingItem, required: v })}
                    id="edit-req"
                  />
                  <Label htmlFor="edit-req" className="cursor-pointer text-sm">Required</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingItem.requiresRecommendation}
                    onCheckedChange={(v) => setEditingItem({ ...editingItem, requiresRecommendation: v })}
                    id="edit-recomm"
                  />
                  <Label htmlFor="edit-recomm" className="cursor-pointer text-sm text-amber-700">Rec. required</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (editingItem) {
                    updateItem(editingItem.id, editingItem);
                    setEditingItem(null);
                  }
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
