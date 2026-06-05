import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Star, Copy, CheckCircle, BookOpen, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const SOURCE_LABELS: Record<string, string> = {
  private_feedback: "Survey",
  review_page: "Review Page",
  manual: "Manual",
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

export default function TestimonialsLibrary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterApproved, setFilterApproved] = useState<"all" | "approved" | "pending">("all");

  const { data: testimonials = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reviews/testimonials"],
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      apiRequest("PATCH", `/api/reviews/testimonials/${id}`, { approvedForMarketing: approved }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reviews/testimonials"] });
    },
    onError: () => toast({ title: "Failed to update testimonial", variant: "destructive" }),
  });

  const copyToClipboard = async (text: string, id: string, name: string) => {
    try {
      await navigator.clipboard.writeText(`"${text}" — ${name}`);
      setCopiedId(id);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const filtered = testimonials.filter((t: any) => {
    if (filterApproved === "approved") return t.approvedForMarketing;
    if (filterApproved === "pending") return !t.approvedForMarketing;
    return true;
  });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation("/admin/reviews")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Testimonials Library</h1>
            <p className="text-sm text-gray-500">{testimonials.length} testimonial{testimonials.length !== 1 ? "s" : ""} collected</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["/api/reviews/testimonials"] })}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(["all", "approved", "pending"] as const).map((f) => (
          <Button
            key={f}
            variant={filterApproved === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterApproved(f)}
            className={filterApproved === f ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}
          >
            {f === "all" ? "All" : f === "approved" ? "Approved for marketing" : "Pending approval"}
            <span className="ml-1.5 text-xs opacity-70">
              {f === "all"
                ? testimonials.length
                : f === "approved"
                ? testimonials.filter((t: any) => t.approvedForMarketing).length
                : testimonials.filter((t: any) => !t.approvedForMarketing).length}
            </span>
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="border border-gray-100">
          <CardContent className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No testimonials yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Testimonials are collected from clients who give you high ratings and grant permission.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((t: any) => (
            <Card key={t.id} className={`border ${t.approvedForMarketing ? "border-green-200 bg-green-50/30" : "border-gray-100"}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <StarDisplay rating={t.rating} />
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.clientDisplayName || t.contactName || "Client"} ·{" "}
                      {t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {SOURCE_LABELS[t.source] || t.source}
                    </Badge>
                    {t.approvedForMarketing && (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                  </div>
                </div>

                <blockquote className="text-gray-700 text-sm leading-relaxed italic mb-4 line-clamp-5">
                  "{t.text}"
                </blockquote>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Approved for marketing</span>
                    <Switch
                      checked={!!t.approvedForMarketing}
                      onCheckedChange={(v) => approveMutation.mutate({ id: t.id, approved: v })}
                      disabled={approveMutation.isPending}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => copyToClipboard(t.text, t.id, t.clientDisplayName || t.contactName || "Client")}
                  >
                    {copiedId === t.id ? (
                      <><CheckCircle className="w-3.5 h-3.5 mr-1 text-green-500" />Copied</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
