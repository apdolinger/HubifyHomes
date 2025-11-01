import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function FormEdit() {
  const [, params] = useRoute("/admin/forms/:id");
  const formId = params?.id;

  const { data: forms, isLoading } = useQuery({
    queryKey: ["/api/forms"],
  });

  const form = forms?.find((f: any) => f.id === parseInt(formId || "0"));

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
          <p className="text-slate-600 mt-2">{form.formTitle || form.form_title}</p>
        </div>
        <Link href="/admin/forms">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forms
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Form Title</label>
            <p className="text-gray-900">{form.formTitle || form.form_title}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Slug</label>
            <p className="text-gray-900">{form.slug}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Contexts</label>
            <p className="text-gray-900">{form.contexts?.join(', ') || 'None'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Created</label>
            <p className="text-gray-900">{new Date(form.createdAt).toLocaleDateString()}</p>
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
