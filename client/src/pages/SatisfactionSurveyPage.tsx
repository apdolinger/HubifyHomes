import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-10 h-10 transition-colors ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "Very dissatisfied",
  2: "Dissatisfied",
  3: "Neutral",
  4: "Satisfied",
  5: "Very satisfied",
};

export default function SatisfactionSurveyPage() {
  const { token } = useParams<{ token: string }>();
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [improvementText, setImprovementText] = useState("");
  const [testimonialPermission, setTestimonialPermission] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/public/r/satisfaction/${token}`],
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest("POST", `/api/public/r/satisfaction/${token}`, body),
    onSuccess: (res: any) => {
      setResult(res);
      setSubmitted(true);
    },
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
          <p className="text-gray-500">This survey link has expired or is no longer valid.</p>
        </div>
      </div>
    );
  }

  if (data.alreadyCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Submitted</h1>
          <p className="text-gray-500">We already have your feedback. Thank you!</p>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    if (result.nextStep === "review") {
      const platforms = [
        { name: "Google", url: result.googleReviewUrl, color: "bg-red-500 hover:bg-red-600" },
        { name: "Facebook", url: result.facebookReviewUrl, color: "bg-blue-600 hover:bg-blue-700" },
        { name: "Yelp", url: result.yelpReviewUrl, color: "bg-red-600 hover:bg-red-700" },
        { name: result.customReviewPlatformName || "Review Us", url: result.customReviewUrl, color: "bg-teal-600 hover:bg-teal-700" },
      ].filter((p) => p.url);

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-lg w-full p-8 text-center">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
            <p className="text-gray-500 mb-6">
              We're so glad you had a great experience, {result.clientName}. Would you mind sharing it publicly? It only takes a minute!
            </p>
            {platforms.length > 0 && (
              <div className="space-y-3 mb-6">
                {platforms.map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full py-3 px-6 rounded-lg text-white font-semibold transition-colors ${p.color}`}
                  >
                    Leave a Review on {p.name}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
            <a
              href={`/r/review/${result.reviewToken}`}
              className="text-sm text-teal-600 hover:underline"
            >
              Go to review page →
            </a>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You for Your Feedback</h1>
          <p className="text-gray-500">
            We appreciate you sharing your experience. Your feedback helps us improve, and we'll be in touch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{data.orgName}</h1>
            <p className="text-gray-500 text-lg">How are we doing, {data.clientName}?</p>
          </div>

          <div className="mb-6">
            <Label className="text-base font-semibold text-gray-700 block mb-3">
              Overall, how satisfied are you with our service?
            </Label>
            <div className="flex flex-col items-center gap-2">
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <span className="text-sm text-gray-500">{RATING_LABELS[rating]}</span>
              )}
            </div>
          </div>

          {rating > 0 && (
            <>
              <div className="mb-4">
                <Label htmlFor="feedback" className="text-sm font-medium text-gray-700 block mb-1">
                  What went well? <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="feedback"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share what you enjoyed about working with us…"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="mb-5">
                <Label htmlFor="improvement" className="text-sm font-medium text-gray-700 block mb-1">
                  What could be better? <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="improvement"
                  value={improvementText}
                  onChange={(e) => setImprovementText(e.target.value)}
                  placeholder="Any suggestions for how we can improve…"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {data.testimonialCollectionEnabled && feedbackText.trim() && (
                <div className="flex items-start gap-3 mb-6 p-3 bg-teal-50 rounded-lg">
                  <input
                    id="testimonialPermission"
                    type="checkbox"
                    checked={testimonialPermission}
                    onChange={(e) => setTestimonialPermission(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <Label htmlFor="testimonialPermission" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                    You may use my comments as a testimonial on your website or marketing materials.
                  </Label>
                </div>
              )}

              <Button
                onClick={() =>
                  submitMutation.mutate({ rating, feedbackText, improvementText, testimonialPermission })
                }
                disabled={submitMutation.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 text-base font-semibold"
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                ) : (
                  "Submit Feedback"
                )}
              </Button>

              {submitMutation.isError && (
                <p className="mt-3 text-sm text-red-500 text-center">
                  Something went wrong. Please try again.
                </p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your feedback is private and shared only with {data.orgName}.
        </p>
      </div>
    </div>
  );
}
