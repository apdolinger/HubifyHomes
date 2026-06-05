import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, MessageSquare, AlertTriangle, Send, Settings, BookOpen, RefreshCw, MoreVertical, Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Sent", variant: "secondary" },
  opened: { label: "Opened", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  review_requested: { label: "Review Requested", variant: "default" },
  low_rating_followup_needed: { label: "Needs Follow-up", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
};

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-400 text-sm">—</span>;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-0.5">{rating}/5</span>
    </div>
  );
}

export default function ReviewDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: metrics, isLoading: metricsLoading } = useQuery<any>({
    queryKey: ["/api/reviews/metrics"],
  });

  const { data: surveys = [], isLoading: surveysLoading } = useQuery<any[]>({
    queryKey: ["/api/reviews/sentiment"],
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/reviews/settings"],
  });

  const remindMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/reviews/requests/${id}/remind`, {}),
    onSuccess: () => {
      toast({ title: "Reminder sent" });
      qc.invalidateQueries({ queryKey: ["/api/reviews/requests"] });
    },
    onError: () => toast({ title: "Failed to send reminder", variant: "destructive" }),
  });

  const metricCards = [
    {
      label: "Avg Rating",
      value: metrics?.avgRating ? `${metrics.avgRating}★` : "—",
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      sub: "From completed surveys",
    },
    {
      label: "Surveys Sent",
      value: metrics?.totalSurveySent ?? 0,
      icon: <Send className="w-5 h-5 text-teal-600" />,
      sub: `${metrics?.totalCompleted ?? 0} completed`,
    },
    {
      label: "Review Requests",
      value: metrics?.totalReviewRequested ?? 0,
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      sub: "Triggered by positive ratings",
    },
    {
      label: "Testimonials",
      value: metrics?.totalTestimonials ?? 0,
      icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
      sub: "Collected",
    },
    {
      label: "Low-Rating Alerts",
      value: metrics?.totalLowRatingAlerts ?? 0,
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      sub: "Active internal alerts",
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Sentiment & Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {settings?.enabled ? "Review automation is enabled" : "Review automation is disabled — configure in Settings"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/admin/reviews/testimonials")}>
            <BookOpen className="w-4 h-4 mr-1.5" />
            Testimonials
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/admin/reviews/settings")}>
            <Settings className="w-4 h-4 mr-1.5" />
            Settings
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {metricCards.map((m) => (
          <Card key={m.label} className="border border-gray-100">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">{m.icon}<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{m.label}</span></div>
              <div className="text-2xl font-bold text-gray-900 mb-0.5">{metricsLoading ? "…" : m.value}</div>
              <p className="text-xs text-gray-400">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Surveys table */}
      <Card className="border border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Satisfaction Surveys</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["/api/reviews/sentiment"] })}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {surveysLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : surveys.length === 0 ? (
            <div className="p-8 text-center">
              <Send className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No surveys sent yet.</p>
              <p className="text-gray-400 text-xs mt-1">Visit a client profile to send a satisfaction check.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Date", "Client", "Rating", "Status", "Feedback", "Actions"].map((h) => (
                      <th key={h} className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {surveys.map((s: any) => {
                    const badge = STATUS_BADGES[s.status] || { label: s.status, variant: "secondary" as const };
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {s.sentAt ? format(new Date(s.sentAt), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{s.contactName}</td>
                        <td className="py-3 px-4"><StarDisplay rating={s.rating} /></td>
                        <td className="py-3 px-4">
                          <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <span className="text-gray-500 truncate block text-xs">{s.feedbackText || "—"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {s.status === "review_requested" && (
                                <DropdownMenuItem onClick={() => setLocation("/admin/reviews/requests")}>
                                  <Bell className="w-4 h-4 mr-2" />View Review Request
                                </DropdownMenuItem>
                              )}
                              {s.status === "low_rating_followup_needed" && (
                                <DropdownMenuItem className="text-red-600">
                                  <AlertTriangle className="w-4 h-4 mr-2" />Follow Up
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
