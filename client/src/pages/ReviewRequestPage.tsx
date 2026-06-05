import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Loader2, ExternalLink, Star } from "lucide-react";

export default function ReviewRequestPage() {
  const { token } = useParams<{ token: string }>();
  const [testimonialText, setTestimonialText] = useState("");
  const [testimonialPermission, setTestimonialPermission] = useState(false);
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [optedOut, setOptedOut] = useState(false);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/public/r/review/${token}`],
    retry: false,
  });

  const testimonialMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest("POST", `/api/public/r/review/${token}/testimonial`, body),
    onSuccess: () => setTestimonialSubmitted(true),
  });

  const alreadyReviewedMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/public/r/review/${token}/already-reviewed`, {}),
    onSuccess: () => setAlreadyReviewed(true),
  });

  const optOutMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/public/r/review/${token}/opt-out`, {}),
    onSuccess: () => setOptedOut(true),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Not Valid</h1>
          <p className="text-gray-500">This review link is not valid or has expired.</p>
        </div>
      </div>
    );
  }

  if (data.status === "opted_out" || optedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Unsubscribed</h1>
          <p className="text-gray-500">You won't receive any more review requests. Thank you!</p>
        </div>
      </div>
    );
  }

  if (data.alreadyReviewed || alreadyReviewed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanks for Reviewing!</h1>
          <p className="text-gray-500">
            We appreciate you taking the time to share your experience. It means a lot to our team!
          </p>
        </div>
      </div>
    );
  }

  const platforms = [
    { name: "Google", url: data.googleReviewUrl, bg: "bg-white border-2 border-gray-200 hover:border-red-400 text-gray-800", icon: "🔍" },
    { name: "Facebook", url: data.facebookReviewUrl, bg: "bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-800", icon: "👍" },
    { name: "Yelp", url: data.yelpReviewUrl, bg: "bg-white border-2 border-gray-200 hover:border-red-500 text-gray-800", icon: "⭐" },
    { name: data.customReviewPlatformName || "Review Us", url: data.customReviewUrl, bg: "bg-white border-2 border-gray-200 hover:border-teal-500 text-gray-800", icon: "📝" },
  ].filter((p) => p.url);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="flex justify-center mb-3">
            {[1,2,3,4,5].map(s => <Star key={s} className="w-6 h-6 fill-yellow-400 text-yellow-400" />)}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{data.orgName}</h1>
          <p className="text-gray-500">
            Hi {data.clientName}, thank you for your kind feedback!
          </p>
          <p className="text-gray-500 mt-1 text-sm">
            Would you take a moment to share your experience online? It helps others find us.
          </p>
        </div>

        {/* Platform buttons */}
        {platforms.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Choose a platform to leave your review:</h2>
            <div className="space-y-3">
              {platforms.map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium transition-colors ${p.bg}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{p.icon}</span>
                    Leave a review on {p.name}
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Testimonial section */}
        {data.testimonialCollectionEnabled && !data.testimonialSubmitted && !testimonialSubmitted && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Share a testimonial</h2>
            <p className="text-sm text-gray-500 mb-4">
              We may feature your kind words on our website with your permission.
            </p>
            {testimonialSubmitted ? (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="w-5 h-5" />
                Testimonial submitted — thank you!
              </div>
            ) : (
              <>
                <Textarea
                  value={testimonialText}
                  onChange={(e) => setTestimonialText(e.target.value)}
                  placeholder="What would you like others to know about working with us?"
                  rows={4}
                  className="resize-none mb-3"
                />
                <div className="flex items-start gap-2 mb-4">
                  <input
                    id="permission"
                    type="checkbox"
                    checked={testimonialPermission}
                    onChange={(e) => setTestimonialPermission(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <Label htmlFor="permission" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                    I grant permission to use this testimonial in marketing materials.
                  </Label>
                </div>
                <Button
                  onClick={() => testimonialMutation.mutate({ text: testimonialText, permission: testimonialPermission })}
                  disabled={!testimonialText.trim() || testimonialMutation.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {testimonialMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Testimonial
                </Button>
              </>
            )}
          </div>
        )}
        {(data.testimonialSubmitted || testimonialSubmitted) && (
          <div className="bg-green-50 rounded-2xl border border-green-200 p-4 flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Your testimonial has been submitted. Thank you!</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="text-center space-y-3 pb-6">
          {!alreadyReviewed && !data.alreadyReviewed && (
            <button
              onClick={() => alreadyReviewedMutation.mutate()}
              disabled={alreadyReviewedMutation.isPending}
              className="text-sm text-teal-600 hover:underline block w-full"
            >
              {alreadyReviewedMutation.isPending ? "Updating…" : "I already left a review — stop sending reminders"}
            </button>
          )}
          <button
            onClick={() => optOutMutation.mutate()}
            disabled={optOutMutation.isPending}
            className="text-xs text-gray-400 hover:text-gray-500 hover:underline block w-full"
          >
            {optOutMutation.isPending ? "Opting out…" : "Unsubscribe from review requests"}
          </button>
        </div>
      </div>
    </div>
  );
}
