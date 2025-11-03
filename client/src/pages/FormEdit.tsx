import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function FormEdit() {
  const [, params] = useRoute("/admin/forms/:id");
  const formId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: forms, isLoading } = useQuery({
    queryKey: ["/api/forms"],
  });

  const form = forms?.find((f: any) => f.id === parseInt(formId || "0"));
  
  const [formTitle, setFormTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [embedEnabled, setEmbedEnabled] = useState(false);
  const [isFormDataLoaded, setIsFormDataLoaded] = useState(false);
  
  // Update local state when form data loads
  useEffect(() => {
    if (form) {
      setFormTitle(form.formTitle || "");
      setSlug(form.slug || "");
      setDescription(form.description || "");
      setIsActive(form.isActive ?? true);
      setEmbedEnabled(form.embedEnabled ?? false);
      setIsFormDataLoaded(true);
    }
  }, [form]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/forms/${formId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Form Updated",
        description: "The form has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update form",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!isFormDataLoaded || !formTitle || !slug) {
      toast({
        title: "Error",
        description: "Form title and slug are required",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({
      formTitle,
      slug,
      description,
      isActive,
      embedEnabled,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-2">Form Not Found</h2>
            <p className="text-gray-600 mb-4">The form you're looking for doesn't exist.</p>
            <Link href="/admin/forms">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Forms
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Edit Form</h1>
          <p className="text-slate-600 mt-2 flex items-center gap-2">
            {form?.formTitle || form?.form_title}
            {isActive ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-700">Inactive</Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending || !isFormDataLoaded} data-testid="button-save-form">
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Link href="/admin">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="formTitle">Form Title</Label>
            <Input
              id="formTitle"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Enter form title"
              data-testid="input-form-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="form-url-slug"
              data-testid="input-form-slug"
            />
            <p className="text-sm text-gray-500">
              Public URL: {window.location.origin}/forms/{slug}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Internal)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal notes about this form"
              rows={3}
              data-testid="input-form-description"
            />
          </div>

          <div className="flex items-center justify-between py-3 border-t">
            <div>
              <Label htmlFor="isActive" className="text-base font-medium">Form Status</Label>
              <p className="text-sm text-gray-500">Enable or disable this form</p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid="switch-form-active"
            />
          </div>

          <div className="flex items-center justify-between py-3 border-t">
            <div>
              <Label htmlFor="embedEnabled" className="text-base font-medium">Embedding</Label>
              <p className="text-sm text-gray-500">Allow this form to be embedded in websites</p>
            </div>
            <Switch
              id="embedEnabled"
              checked={embedEnabled}
              onCheckedChange={setEmbedEnabled}
              data-testid="switch-form-embed"
            />
          </div>

          <div className="pt-3 border-t">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700">Contexts</Label>
              <p className="text-gray-900">{form?.contexts?.join(', ') || 'None'}</p>
            </div>
          </div>

          <div className="pt-3 border-t">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700">Created</Label>
              <p className="text-gray-900">{form?.createdAt ? new Date(form.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {form.fields && form.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Form Fields ({form.fields.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {form.fields.map((field: any, index: number) => (
                <div key={field.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <h3 className="font-medium">{field.label}</h3>
                        {field.required && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        Type: <span className="font-medium">{field.type}</span>
                      </div>
                      {field.options && field.options.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          Options: {field.options.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Public Form Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm">
              {window.location.origin}/forms/{form.slug}
            </code>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/forms/${form.slug}`);
              }}
            >
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
