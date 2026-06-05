import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReviewSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/reviews/settings"],
  });

  const { register, handleSubmit, setValue, watch, reset } = useForm<any>({ defaultValues: {} });
  const enabled = watch("enabled");
  const lowRatingAlert = watch("lowRatingAlertEnabled");
  const testimonialEnabled = watch("testimonialCollectionEnabled");

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/reviews/settings", data),
    onSuccess: () => {
      toast({ title: "Settings saved" });
      qc.invalidateQueries({ queryKey: ["/api/reviews/settings"] });
    },
    onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
  });

  const onSubmit = (data: any) => {
    const cleaned = {
      ...data,
      satisfactionThreshold: Number(data.satisfactionThreshold),
      maxReminders: Number(data.maxReminders),
      followUpDays: [data.followUpDay1, data.followUpDay2, data.followUpDay3]
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0),
    };
    saveMutation.mutate(cleaned);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const followUpDays: number[] = settings?.followUpDays || [3, 7, 14];

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => setLocation("/admin/reviews")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Automation Settings</h1>
          <p className="text-sm text-gray-500">Configure how and when satisfaction surveys and review requests are sent.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Enable / Disable */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enable Review Automation</CardTitle>
            <CardDescription>When enabled, admins can manually send satisfaction surveys to clients. Reminders run automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                checked={!!enabled}
                onCheckedChange={(v) => setValue("enabled", v)}
                id="enabled"
              />
              <Label htmlFor="enabled" className="cursor-pointer">
                {enabled ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating Threshold</CardTitle>
            <CardDescription>Ratings at or above this threshold trigger a review request. Ratings below trigger an internal follow-up only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-[180px]">
              <Label className="mb-1.5 block">Minimum rating to request a review</Label>
              <Select
                defaultValue={String(settings?.satisfactionThreshold ?? 4)}
                onValueChange={(v) => setValue("satisfactionThreshold", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {Array(n).fill("★").join("")} ({n} stars+)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-xs">
              <div>
                <Label className="mb-1 block text-xs">Day 1 reminder</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  defaultValue={followUpDays[0] || 3}
                  {...register("followUpDay1")}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Day 2 reminder</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  defaultValue={followUpDays[1] || 7}
                  {...register("followUpDay2")}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Day 3 reminder</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  defaultValue={followUpDays[2] || 14}
                  {...register("followUpDay3")}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">Days after sending the review request to send follow-up reminders.</p>

            <div className="max-w-[120px]">
              <Label className="mb-1.5 block">Max reminders</Label>
              <Input type="number" min="0" max="10" defaultValue={settings?.maxReminders ?? 3} {...register("maxReminders")} />
            </div>
          </CardContent>
        </Card>

        {/* Review URLs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Platform Links</CardTitle>
            <CardDescription>Add your public review page URLs. Only configured platforms will appear for clients.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Google Review URL", field: "googleReviewUrl", placeholder: "https://g.page/r/..." },
              { label: "Facebook Review URL", field: "facebookReviewUrl", placeholder: "https://www.facebook.com/your-page/reviews/" },
              { label: "Yelp Review URL", field: "yelpReviewUrl", placeholder: "https://www.yelp.com/writeareview/..." },
              { label: "Custom Review URL", field: "customReviewUrl", placeholder: "https://..." },
              { label: "Custom Platform Name", field: "customReviewPlatformName", placeholder: "HomeAdvisor, Angi, etc." },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <Label className="mb-1.5 block">{label}</Label>
                <Input defaultValue={settings?.[field] || ""} placeholder={placeholder} {...register(field)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Low rating */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low-Rating Behavior</CardTitle>
            <CardDescription>What happens when a client submits a rating below your threshold.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={!!lowRatingAlert}
                onCheckedChange={(v) => setValue("lowRatingAlertEnabled", v)}
                id="lowRatingAlert"
              />
              <Label htmlFor="lowRatingAlert" className="cursor-pointer">Create an internal alert for admins/supervisors</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={!!watch("lowRatingCreateTask")}
                onCheckedChange={(v) => setValue("lowRatingCreateTask", v)}
                id="lowRatingTask"
              />
              <Label htmlFor="lowRatingTask" className="cursor-pointer">Auto-create a follow-up task</Label>
            </div>
          </CardContent>
        </Card>

        {/* Testimonials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testimonial Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={!!testimonialEnabled}
                onCheckedChange={(v) => setValue("testimonialCollectionEnabled", v)}
                id="testimonialEnabled"
              />
              <Label htmlFor="testimonialEnabled" className="cursor-pointer">Allow clients to submit testimonials</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={!!watch("requireTestimonialApproval")}
                onCheckedChange={(v) => setValue("requireTestimonialApproval", v)}
                id="requireApproval"
              />
              <Label htmlFor="requireApproval" className="cursor-pointer">Require admin approval before marking testimonials for marketing use</Label>
            </div>
          </CardContent>
        </Card>

        {/* Email templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Templates</CardTitle>
            <CardDescription>Customize the emails sent to clients. Leave blank to use the default template. Supports {"{{clientName}}"} and {"{{orgName}}"} placeholders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-1.5 block font-medium">Satisfaction Survey Email</Label>
              <Input
                className="mb-2"
                placeholder="How are we doing? Share your feedback"
                defaultValue={settings?.satisfactionEmailSubject || ""}
                {...register("satisfactionEmailSubject")}
              />
              <Textarea
                rows={5}
                placeholder="Hi {{clientName}}, we'd love to hear your thoughts…"
                defaultValue={settings?.satisfactionEmailBody || ""}
                {...register("satisfactionEmailBody")}
                className="resize-none"
              />
            </div>
            <div>
              <Label className="mb-1.5 block font-medium">Review Request Email</Label>
              <Input
                className="mb-2"
                placeholder="Thank you! Would you share your experience?"
                defaultValue={settings?.reviewEmailSubject || ""}
                {...register("reviewEmailSubject")}
              />
              <Textarea
                rows={5}
                placeholder="Hi {{clientName}}, we'd be grateful if you could share your experience…"
                defaultValue={settings?.reviewEmailBody || ""}
                {...register("reviewEmailBody")}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button type="submit" disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700 text-white px-8">
            {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
          </Button>
        </div>
      </form>
    </main>
  );
}
