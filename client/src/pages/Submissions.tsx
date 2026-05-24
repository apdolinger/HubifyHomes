import { SubmissionFormContent } from "@/components/SubmissionModal";
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from "@/lib/brand";

export default function Submissions() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-50 flex flex-col">
      <header className="py-5 px-6 flex justify-center border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <a href="/">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-10 object-contain" />
        </a>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Get Started with Hubify</h1>
            <p className="mt-2 text-slate-500 text-base max-w-lg mx-auto">
              Tell us about your property management business and we'll find the right plan for you.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <SubmissionFormContent />
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-white/60">
        &copy; {new Date().getFullYear()} Hubify Homes. All rights reserved.
        {" · "}
        <a href="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</a>
        {" · "}
        <a href="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</a>
      </footer>
    </div>
  );
}
