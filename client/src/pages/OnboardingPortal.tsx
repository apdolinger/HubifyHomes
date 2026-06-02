import { useState, useEffect, useRef } from "react";
import { useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { openCookiePreferences } from "@/lib/cookieConsent";
import {
  CheckCircle, Clock, AlertTriangle, Loader2, Lock,
  ShieldCheck, CreditCard, ArrowRight, RefreshCw, XCircle,
  FileText, ChevronDown, Scale, Shield,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const AGREEMENT_VERSION = "v1.0";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingDetails {
  alreadySigned: boolean;
  agreementSignedAt?: string;
  agreementSignerName?: string;
  stage?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  estimatedHomes?: number;
  teamSize?: number;
  portfolioTier?: string;
  originalMonthlyPrice?: number;
  discountPercentage?: number;
  discountedMonthlyPrice?: number;
  setupFee?: number;
  betaCohortNumber?: number;
  agreementStatus?: string;
  paymentStatus?: string | null;
  paymentCompletedAt?: string | null;
}

// ── Form schema ───────────────────────────────────────────────────────────────

const agreementSchema = z.object({
  agreeToBetaAgreement: z.literal(true, {
    errorMap: () => ({ message: "You must review and accept the Hubify Homes Beta Agreement" }),
  }),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must review and accept the Terms of Service" }),
  }),
  agreeToPrivacy: z.literal(true, {
    errorMap: () => ({ message: "You must review and accept the Privacy Policy" }),
  }),
  signerName: z.string().min(1, "Authorized signer name is required"),
  organizationName: z.string().min(1, "Organization name is required"),
});
type AgreementForm = z.infer<typeof agreementSchema>;

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Agreement" },
  { n: 2, label: "Payment Setup" },
  { n: 3, label: "Initialization" },
  { n: 4, label: "Welcome" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 select-none">
      {STEPS.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                step.n < current
                  ? "bg-teal-600 border-teal-600 text-white"
                  : step.n === current
                  ? "bg-white border-teal-600 text-teal-700"
                  : "bg-white border-slate-200 text-slate-400"
              }`}
            >
              {step.n < current ? <CheckCircle className="w-4 h-4" /> : step.n}
            </div>
            <span
              className={`mt-1 text-xs font-medium ${
                step.n === current ? "text-teal-700" : step.n < current ? "text-teal-600" : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-12 h-0.5 mb-5 mx-1 ${step.n < current ? "bg-teal-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Table row helper ──────────────────────────────────────────────────────────

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-4 text-slate-500 text-sm align-top w-52">{label}</td>
      <td className={`py-2.5 text-sm font-medium ${accent ? "text-teal-700" : "text-slate-800"} align-top`}>{value}</td>
    </tr>
  );
}

function fmt(n?: number | null) {
  return n != null ? `$${n.toFixed(2)}` : "—";
}

// ── Error states ──────────────────────────────────────────────────────────────

function TokenError({ status, message }: { status: number; message: string }) {
  const icon =
    status === 410 ? <Clock className="w-10 h-10 text-amber-400" /> :
    <AlertTriangle className="w-10 h-10 text-red-400" />;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-10 text-center">
        <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-16 w-auto mx-auto mb-8" />
        <div className="flex justify-center mb-4">{icon}</div>
        <h1 className="text-xl font-bold text-slate-900 mb-3">
          {status === 410 ? "Link Expired" : "Invalid Link"}
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        <p className="mt-4 text-slate-500 text-xs">
          Need help?{" "}
          <a href="mailto:hello@hubifyhomesonline.com" className="text-teal-600 hover:underline">
            hello@hubifyhomesonline.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Legal document content ────────────────────────────────────────────────────

function BetaAgreementContent({ company }: { company?: string }) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-5">
      <p className="text-xs text-slate-400">Version {AGREEMENT_VERSION} · Effective {today}</p>
      <p>
        This Hubify Homes Beta Participation Agreement ("<strong>Agreement</strong>") is entered into between
        Hubify Homes ("<strong>Hubify</strong>") and the organization identified during onboarding
        ("<strong>Beta Participant</strong>"), and governs your participation in the Hubify Homes closed beta program.
      </p>
      <div>
        <p className="font-semibold text-slate-900 mb-1">1. Beta Program Access</p>
        <p>Subject to the terms of this Agreement, Hubify grants you a limited, non-exclusive, non-transferable license to access and use the Hubify platform solely for internal business purposes during the Beta Period. Access is provided on an invitation-only basis and may be revoked at any time in accordance with Section 9.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">2. Beta Pricing &amp; Lifetime Lock</p>
        <p>In consideration of your early adoption and feedback, Hubify extends a discounted monthly subscription rate ("<strong>Beta Price</strong>") as set forth in your approval notice. This Beta Price is locked in for the lifetime of your subscription, meaning Hubify will not increase your monthly rate above the Beta Price so long as your subscription remains in continuous good standing.</p>
        <p className="mt-2">A one-time platform initialization fee may apply as detailed in your onboarding portal. This fee is non-refundable after platform provisioning begins. Monthly subscription fees are billed in advance. You may cancel at any time; cancellations take effect at the end of the current billing cycle.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">3. Beta Nature of the Platform</p>
        <p>You acknowledge that the Platform is in an early-access beta state and may contain errors, bugs, or incomplete features. Hubify makes no guarantee of uptime, data durability, or feature availability during the Beta Period. We will make commercially reasonable efforts to maintain service continuity and notify you of planned maintenance windows.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">4. Feedback &amp; Improvements</p>
        <p>You agree to provide Hubify with reasonable feedback regarding your use of the Platform. You grant Hubify a perpetual, irrevocable, royalty-free license to use, incorporate, and commercialize any Feedback without restriction or compensation to you.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">5. Confidentiality</p>
        <p>The Platform, its features, pricing structure, and any non-public information disclosed to you constitute Confidential Information of Hubify. You agree not to disclose or share Confidential Information with third parties without prior written consent. This obligation survives termination for two (2) years.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">6. Data &amp; Privacy</p>
        <p>Hubify will handle your data in accordance with its Privacy Policy. You retain ownership of all data you input into the Platform; Hubify receives a limited license to process that data solely to provide the service.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">7. Acceptable Use</p>
        <p>You agree to use the Platform only for lawful property management purposes and in compliance with all applicable laws. You will not attempt to reverse engineer, circumvent security controls, or use the Platform in any manner that could harm Hubify or other users.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">8. Disclaimer of Warranties</p>
        <p>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" DURING THE BETA PERIOD. HUBIFY EXPRESSLY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">9. Limitation of Liability</p>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HUBIFY'S AGGREGATE LIABILITY SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU IN THE THREE (3) MONTHS PRECEDING THE CLAIM. IN NO EVENT SHALL HUBIFY BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">10. Termination</p>
        <p>Either party may terminate this Agreement with thirty (30) days' written notice. Hubify may terminate immediately upon material breach. Upon termination, your access will be suspended and you may request a data export within 30 days.</p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">11. General</p>
        <p>This Agreement is governed by the laws of the State of Florida. Disputes shall be resolved by binding arbitration per the American Arbitration Association rules. This Agreement, together with the Terms of Service and Privacy Policy, constitutes the entire agreement between the parties.</p>
      </div>
      <div className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Agreement {AGREEMENT_VERSION} · Hubify Homes · hello@hubifyhomesonline.com
        {company && ` · Participant: ${company}`}
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-5">
      <p className="text-xs text-slate-400">Last Updated: May 17, 2026</p>
      <p>
        These Terms of Service ("<strong>Terms</strong>") constitute a legally binding agreement between you and Hubify. By accessing or using our services, you agree to be bound by these Terms. If you do not agree, you may not use the Service.
      </p>

      <div>
        <p className="font-semibold text-slate-900 mb-1">1. Acceptance of Terms</p>
        <p>By creating an account, accessing, or using the Hubify platform, you agree to comply with and be legally bound by these Terms, our Privacy Policy, and all applicable laws. If you use the Service on behalf of an organization, you represent that you have authority to bind that organization.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">2. Eligibility &amp; Account Registration</p>
        <p className="mb-2"><strong>Age:</strong> You must be at least 18 years of age to use our Service.</p>
        <p className="mb-1"><strong>Account creation requires you to:</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Provide accurate, current, and complete information during registration</li>
          <li>Maintain the security of your password and credentials</li>
          <li>Accept responsibility for all activities under your account</li>
          <li>Notify us immediately of any unauthorized access</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">3. Description of Service</p>
        <p>Hubify provides a cloud-based property management platform for home watch and estate management companies, including property/client management, task organization, team collaboration, invoicing, calendar/scheduling, and reporting. We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">4. Subscription &amp; Payment Terms</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li>Subscription fees are billed in advance on a monthly or annual basis</li>
          <li>Payments are processed securely through Stripe</li>
          <li>All fees are non-refundable unless required by law or stated otherwise</li>
          <li>Failed payments may result in service suspension or termination</li>
          <li>You are responsible for all applicable taxes</li>
          <li>Price changes will be communicated with 30 days advance notice</li>
        </ul>
        <p>You may cancel your subscription at any time; cancellations take effect at the end of the current billing period.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">5. License Grant &amp; Restrictions</p>
        <p className="mb-2">Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your internal business purposes.</p>
        <p className="mb-1"><strong>You agree NOT to:</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Copy, modify, or create derivative works of the Service</li>
          <li>Reverse engineer, decompile, or disassemble the Service</li>
          <li>Rent, lease, sell, or sublicense access to the Service</li>
          <li>Use the Service to develop a competing product</li>
          <li>Access the Service through automated means without permission</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">6. Acceptable Use Policy</p>
        <p className="mb-1">You agree to use the Service only for lawful purposes. Prohibited activities include:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Violating any applicable law or regulation</li>
          <li>Infringing intellectual property rights of others</li>
          <li>Transmitting harmful code (viruses, malware)</li>
          <li>Harassing, threatening, or abusing other users</li>
          <li>Collecting personal information without consent</li>
          <li>Using the Service for fraudulent or illegal activities</li>
        </ul>
        <p className="mt-2 font-semibold">Violation may result in immediate termination of your account and legal action.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">7. Intellectual Property</p>
        <p className="mb-2">The Service and all content are owned by Hubify and protected by copyright, trademark, and other IP laws. You retain ownership of all data and content you upload ("User Content") and grant us a limited license to process it solely to provide the Service.</p>
        <p>Feedback you provide becomes our property; we may use it without compensation or attribution.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">8. Privacy &amp; Data Protection</p>
        <p>Our collection, use, and protection of your personal information is governed by our Privacy Policy, incorporated into these Terms by reference. By using the Service, you consent to our privacy practices.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">9. Service Level &amp; Availability</p>
        <p>We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance when possible. We perform regular automated backups but you are responsible for maintaining independent backups of critical data.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">10. Disclaimers &amp; Limitations of Liability</p>
        <p className="font-semibold mb-2">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.</p>
        <p className="font-semibold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, HUBIFY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS OR BUSINESS INTERRUPTION.</p>
        <p>Our total liability for any claims shall not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">11. Indemnification</p>
        <p>You agree to indemnify and hold harmless Hubify and its officers, directors, and employees from any claims, damages, and expenses arising from your use or misuse of the Service, your violation of these Terms, or your User Content.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">12. Dispute Resolution</p>
        <p className="mb-2">These Terms are governed by the laws of the State of Florida. Disputes shall be resolved through binding arbitration per the American Arbitration Association rules, except for small claims under $10,000, IP disputes, and injunctive relief requests.</p>
        <p className="font-semibold">You waive the right to participate in class actions or representative actions.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">13. Modifications to Terms</p>
        <p>We may modify these Terms at any time. Material changes will be communicated via email and/or prominent notice on the Service. Continued use after changes constitutes acceptance.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">14. Termination</p>
        <p>You may terminate your account at any time. We may suspend or terminate your account immediately for violation of these Terms, non-payment, fraudulent activity, or legal requirements. Upon termination, you will have 30 days to export your data.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">15. General Provisions</p>
        <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and Hubify. If any provision is found unenforceable, the remaining provisions remain in full effect. Contact: <a href="mailto:legal@hubify.com" className="text-teal-600 hover:underline">legal@hubify.com</a></p>
      </div>

      <div className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Terms of Service · Last Updated May 17, 2026 · Hubify Homes
      </div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-5">
      <p className="text-xs text-slate-400">Last Updated: May 17, 2026</p>
      <p>This Privacy Policy describes how Hubify collects, uses, and protects your personal information in compliance with US and Canadian privacy laws (CCPA/CPRA, GDPR, PIPEDA).</p>

      <div>
        <p className="font-semibold text-slate-900 mb-1">1. Information We Collect</p>
        <p className="mb-1"><strong>Information you provide directly:</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li><strong>Account Information:</strong> Name, email, phone, company name, business address</li>
          <li><strong>Payment Information:</strong> Credit card details and billing address (processed through Stripe)</li>
          <li><strong>Property &amp; Client Data:</strong> Information about properties, clients, tasks, and contacts you manage</li>
          <li><strong>Communications:</strong> Messages and support requests you send to us</li>
        </ul>
        <p className="mb-1"><strong>Information collected automatically:</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li><strong>Usage Data:</strong> Pages viewed, features used, time spent</li>
          <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
          <li><strong>Cookies &amp; Tracking:</strong> Session cookies, analytics cookies, preference cookies</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">2. How We Use Your Information</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li><strong>Service Delivery:</strong> Provide, maintain, and improve our property management platform</li>
          <li><strong>Account Management:</strong> Create and manage your account, process subscriptions</li>
          <li><strong>Payment Processing:</strong> Process payments, prevent fraud, issue invoices</li>
          <li><strong>Customer Support:</strong> Respond to inquiries and troubleshoot issues</li>
          <li><strong>Communication:</strong> Send service updates, security alerts, administrative messages</li>
          <li><strong>Security:</strong> Detect fraud, prevent abuse, enforce terms of service</li>
          <li><strong>Legal Compliance:</strong> Meet regulatory requirements and respond to legal requests</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">3. How We Share Your Information</p>
        <p className="mb-1"><strong>Service providers we work with:</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li><strong>Cloud Hosting:</strong> Replit, Google Cloud Platform</li>
          <li><strong>Payment Processing:</strong> Stripe</li>
          <li><strong>Email Services:</strong> Resend (transactional and marketing emails)</li>
          <li><strong>Authentication:</strong> Replit Auth, Google OAuth</li>
          <li><strong>Object Storage:</strong> Google Cloud Storage</li>
        </ul>
        <p className="font-semibold">We do not sell your personal information to third parties for monetary consideration.</p>
        <p className="mt-2">We may disclose information when required by law, legal process, or to protect rights and safety.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">4. Data Retention</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li><strong>Active Accounts:</strong> Retained while active and for 3 years after closure</li>
          <li><strong>Payment Records:</strong> 7 years for tax and accounting purposes</li>
          <li><strong>Security Logs:</strong> 1 year for audit and fraud prevention</li>
        </ul>
        <p className="mt-2">You may request earlier deletion subject to legal and contractual obligations.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">5. Your Privacy Rights</p>
        <p className="mb-2">Depending on your location, you have rights under CCPA/CPRA (California), GDPR (EU), and PIPEDA (Canada), including rights to: access your data, request deletion, correct inaccuracies, withdraw consent, and file complaints with regulators.</p>
        <p>To exercise your rights: <a href="mailto:privacy@hubify.com" className="text-teal-600 hover:underline">privacy@hubify.com</a>. We will respond within 30–45 days as required by applicable law.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">6. Data Security</p>
        <p>We implement industry-standard security including TLS/SSL encryption in transit, AES-256 encryption at rest, role-based access controls, multi-factor authentication for admin accounts, and 24/7 security monitoring. While we take reasonable precautions, no system is completely secure.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">7. Cookies &amp; Tracking Technologies</p>
        <p className="mb-2">We use Essential Cookies (required for authentication and core functionality), Preference Cookies (remember your settings), and Analytics Cookies (understand usage patterns — aggregated data only). We do not use cookies for advertising or cross-site tracking.</p>
        <p className="mb-3">You can manage Preference and Analytics cookies at any time:</p>
        <button
          type="button"
          onClick={openCookiePreferences}
          className="inline-flex items-center gap-1.5 text-xs text-teal-700 border border-teal-300 hover:bg-teal-50 px-3 py-1.5 rounded-md font-medium transition-colors"
        >
          Manage cookie preferences
        </button>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">8. International Data Transfers</p>
        <p>Your information may be transferred to and processed in the United States or other countries where our service providers operate. We ensure adequate protection through Standard Contractual Clauses and compliance with cross-border data transfer requirements.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">9. Children's Privacy</p>
        <p>Our services are not directed to individuals under 18 years of age. We do not knowingly collect personal information from children.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">10. Changes to This Policy</p>
        <p>We may update this Privacy Policy periodically. Material changes will be communicated via email and prominent notice on our platform. Continued use constitutes acceptance.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">11. Contact Us</p>
        <p>Privacy Officer: <a href="mailto:privacy@hubify.com" className="text-teal-600 hover:underline">privacy@hubify.com</a> — We respond within 30–45 days.</p>
      </div>

      <div className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Privacy Policy · Last Updated May 17, 2026 · Hubify Homes · Compliant with CCPA/CPRA, GDPR, PIPEDA
      </div>
    </div>
  );
}

// ── Reusable legal document modal ─────────────────────────────────────────────

function LegalDocModal({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  confirmLabel,
  children,
  onAccept,
  scrolledToBottom,
  onScroll,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  confirmLabel: string;
  children: React.ReactNode;
  onAccept: () => void;
  scrolledToBottom: boolean;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: 0 });
      }, 50);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            {icon}
            {title}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-6 py-5 min-h-0"
        >
          {children}
        </div>

        {!scrolledToBottom && (
          <div className="shrink-0 flex items-center justify-center gap-1.5 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            Scroll to the bottom to continue
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-slate-200 shrink-0 flex-col gap-3 sm:flex-col">
          <label
            className={`flex items-start gap-3 cursor-pointer select-none ${!scrolledToBottom ? "opacity-40 pointer-events-none" : ""}`}
          >
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={!scrolledToBottom}
              className="mt-0.5 shrink-0"
            />
            <span className="text-sm text-slate-700 leading-snug">{confirmLabel}</span>
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={!scrolledToBottom || !confirmed}
              onClick={onAccept}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Accept
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Step 1: Agreement form ─────────────────────────────────────────────────────

function AgreementStep({ data, token, onSigned }: {
  data: OnboardingDetails;
  token: string;
  onSigned: (name: string) => void;
}) {
  const { toast } = useToast();

  // Beta Agreement modal state
  const [betaModalOpen, setBetaModalOpen] = useState(false);
  const [betaViewedAt, setBetaViewedAt] = useState<string | null>(null);
  const [betaScrolledAt, setBetaScrolledAt] = useState<string | null>(null);
  const [betaScrolledToBottom, setBetaScrolledToBottom] = useState(false);
  const [betaAccepted, setBetaAccepted] = useState(false);

  // Terms of Service modal state
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsScrolledToBottom, setTermsScrolledToBottom] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Privacy Policy modal state
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [privacyScrolledToBottom, setPrivacyScrolledToBottom] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const form = useForm<AgreementForm>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      signerName: "",
      organizationName: data.company ?? "",
      agreeToBetaAgreement: undefined as any,
      agreeToTerms: undefined as any,
      agreeToPrivacy: undefined as any,
    },
  });

  // ── Scroll handlers (each tracks its own bottom state) ────────────────────

  const makeScrollHandler = (
    setScrolled: (v: boolean) => void,
    setScrolledAt: ((v: string | null) => void) | null,
    currentScrolledAt: string | null | undefined,
  ) => (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    if (nearBottom) {
      setScrolled(true);
      if (setScrolledAt && !currentScrolledAt) {
        setScrolledAt(new Date().toISOString());
      }
    }
  };

  const handleBetaScroll = makeScrollHandler(setBetaScrolledToBottom, setBetaScrolledAt, betaScrolledAt);
  const handleTermsScroll = makeScrollHandler(setTermsScrolledToBottom, null, null);
  const handlePrivacyScroll = makeScrollHandler(setPrivacyScrolledToBottom, null, null);

  // ── Open handlers (record viewedAt) ──────────────────────────────────────

  const openBetaModal = () => {
    setBetaModalOpen(true);
    if (!betaViewedAt) setBetaViewedAt(new Date().toISOString());
  };

  // ── Accept handlers ───────────────────────────────────────────────────────

  const handleAcceptBeta = () => {
    setBetaAccepted(true);
    setBetaModalOpen(false);
    form.setValue("agreeToBetaAgreement", true, { shouldValidate: true });
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setTermsModalOpen(false);
    form.setValue("agreeToTerms", true, { shouldValidate: true });
  };

  const handleAcceptPrivacy = () => {
    setPrivacyAccepted(true);
    setPrivacyModalOpen(false);
    form.setValue("agreeToPrivacy", true, { shouldValidate: true });
  };

  // ── Mutation ──────────────────────────────────────────────────────────────

  const acceptMutation = useMutation({
    mutationFn: async (values: AgreementForm) => {
      const res = await fetch(`/api/public/onboarding/${token}/accept-agreement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          agreementVersion: AGREEMENT_VERSION,
          agreementViewedAt: betaViewedAt,
          agreementScrolledAt: betaScrolledAt,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Failed to submit agreement.");
      return body;
    },
    onSuccess: (_data, values) => onSigned(values.signerName),
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const displayName = data.firstName && data.lastName
    ? `${data.firstName} ${data.lastName}`
    : data.name ?? "—";

  // ── Helper for accepted doc rows ──────────────────────────────────────────

  const DocRow = ({
    accepted,
    label,
    onOpen,
    formField,
  }: {
    accepted: boolean;
    label: React.ReactNode;
    onOpen: () => void;
    formField: "agreeToBetaAgreement" | "agreeToTerms" | "agreeToPrivacy";
  }) => (
    <FormField control={form.control} name={formField} render={() => (
      <FormItem>
        <div className="flex items-start gap-3">
          {accepted ? (
            <CheckCircle className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" />
          ) : (
            <div className="w-4 h-4 mt-0.5 rounded border-2 border-slate-300 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {accepted ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-teal-700 font-medium">{label} — accepted</span>
                <button
                  type="button"
                  onClick={onOpen}
                  className="text-xs text-teal-600 hover:underline underline-offset-2"
                >
                  (review again)
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-700 mb-2 leading-snug">
                  I have read and agree to the <strong className="text-slate-900">{label}</strong>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-teal-300 text-teal-700 hover:bg-teal-50 text-xs font-medium"
                  onClick={onOpen}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Read &amp; Accept
                </Button>
              </div>
            )}
            <FormMessage />
          </div>
        </div>
        <input type="hidden" name={formField} />
      </FormItem>
    )} />
  );

  return (
    <>
      {/* Beta Agreement modal */}
      <LegalDocModal
        open={betaModalOpen}
        onOpenChange={setBetaModalOpen}
        title="Hubify Homes Beta Participation Agreement"
        subtitle={`Version ${AGREEMENT_VERSION} — Read the full agreement before accepting`}
        icon={<FileText className="w-4 h-4 text-teal-600" />}
        confirmLabel={`I have read, understand, and agree to the Hubify Homes Beta Participation Agreement (${AGREEMENT_VERSION}).`}
        onAccept={handleAcceptBeta}
        scrolledToBottom={betaScrolledToBottom}
        onScroll={handleBetaScroll}
      >
        <BetaAgreementContent company={data.company} />
      </LegalDocModal>

      {/* Terms of Service modal */}
      <LegalDocModal
        open={termsModalOpen}
        onOpenChange={setTermsModalOpen}
        title="Terms of Service"
        subtitle="Last Updated: May 17, 2026 — Read the full terms before accepting"
        icon={<Scale className="w-4 h-4 text-teal-600" />}
        confirmLabel="I have read, understand, and agree to the Hubify Terms of Service."
        onAccept={handleAcceptTerms}
        scrolledToBottom={termsScrolledToBottom}
        onScroll={handleTermsScroll}
      >
        <TermsContent />
      </LegalDocModal>

      {/* Privacy Policy modal */}
      <LegalDocModal
        open={privacyModalOpen}
        onOpenChange={setPrivacyModalOpen}
        title="Privacy Policy"
        subtitle="Last Updated: May 17, 2026 — Read the full policy before accepting"
        icon={<Shield className="w-4 h-4 text-teal-600" />}
        confirmLabel="I have read, understand, and agree to the Hubify Privacy Policy."
        onAccept={handleAcceptPrivacy}
        scrolledToBottom={privacyScrolledToBottom}
        onScroll={handlePrivacyScroll}
      >
        <PrivacyContent />
      </LegalDocModal>

      {/* Membership details card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">Your Beta Membership</p>
        <table className="w-full border-collapse">
          <tbody>
            <Row label="Contact Name" value={displayName} />
            <Row label="Email" value={data.email ?? "—"} />
            {data.phone && <Row label="Phone" value={data.phone} />}
            <Row label="Company Name" value={data.company ?? "—"} />
            {data.estimatedHomes != null && <Row label="Properties Managed" value={data.estimatedHomes.toLocaleString()} />}
            {data.teamSize != null && <Row label="Staff Users Expected" value={data.teamSize.toLocaleString()} />}
            <Row label="Portfolio Tier" value={data.portfolioTier ?? "—"} />
            <Row label="Beta Cohort" value={data.betaCohortNumber != null ? `Member #${data.betaCohortNumber}` : "—"} />
            <Row label="Agreement Status" value={
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                <Clock className="w-3 h-3" />
                Pending Signature
              </span>
            } />
          </tbody>
        </table>
      </div>

      {/* Pricing card */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">Beta Pricing</p>
        <table className="w-full border-collapse">
          <tbody>
            {data.originalMonthlyPrice != null && (
              <Row label="List Price" value={
                <span className="line-through text-slate-400">{fmt(data.originalMonthlyPrice)}/mo</span>
              } />
            )}
            {data.discountPercentage != null && (
              <Row label="Beta Discount" value={
                <span className="text-teal-700 font-semibold">{data.discountPercentage}% off — locked for life</span>
              } accent />
            )}
            {data.discountedMonthlyPrice != null && (
              <Row label="Your Monthly Price" value={
                <span className="text-2xl font-bold text-slate-900">
                  {fmt(data.discountedMonthlyPrice)}<span className="text-sm font-normal text-slate-500">/mo</span>
                </span>
              } />
            )}
            {data.setupFee != null && data.setupFee > 0 && (
              <Row label="Database Init Fee" value={`${fmt(data.setupFee)} one-time`} />
            )}
          </tbody>
        </table>
        <div className="mt-4 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Your beta pricing is <strong>locked in for life</strong> — as long as your subscription remains in good standing, your rate will never increase.</span>
        </div>
      </div>

      {/* Agreement form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <p className="font-semibold text-slate-900">Sign Your Beta Agreement</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => acceptMutation.mutate(v))} className="space-y-5">
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <DocRow
                accepted={betaAccepted}
                label="Hubify Homes Beta Agreement"
                onOpen={openBetaModal}
                formField="agreeToBetaAgreement"
              />
              <div className="border-t border-slate-200" />
              <DocRow
                accepted={termsAccepted}
                label="Terms of Service"
                onOpen={() => setTermsModalOpen(true)}
                formField="agreeToTerms"
              />
              <div className="border-t border-slate-200" />
              <DocRow
                accepted={privacyAccepted}
                label="Privacy Policy"
                onOpen={() => setPrivacyModalOpen(true)}
                formField="agreeToPrivacy"
              />
            </div>

            <FormField control={form.control} name="signerName" render={({ field }) => (
              <FormItem>
                <FormLabel>Authorized Signer Name</FormLabel>
                <FormControl><Input placeholder="Full legal name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="organizationName" render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl><Input placeholder={data.company ?? "Your company name"} {...field} /></FormControl>
                <p className="text-xs text-slate-500 mt-1">
                  Must match your approved company name: <strong>{data.company}</strong>
                </p>
                <FormMessage />
              </FormItem>
            )} />

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white text-base py-5 font-semibold"
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" />Accept &amp; Continue</>
              )}
            </Button>

            <p className="text-center text-xs text-slate-400">
              By clicking "Accept &amp; Continue" you are electronically signing this agreement.
              Your IP address, browser information, and document review timestamps will be recorded for legal purposes.
            </p>
          </form>
        </Form>
      </div>
    </>
  );
}

// ── Step 2: Payment setup ─────────────────────────────────────────────────────

function PaymentStep({ data, token }: { data: OnboardingDetails; token: string }) {
  const { toast } = useToast();
  const totalDueToday = (data.setupFee ?? 0) + (data.discountedMonthlyPrice ?? 0);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Failed to create payment session.");
      return body as { checkoutUrl: string };
    },
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (err: any) => {
      toast({ title: "Payment setup failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-indigo-600 px-6 py-5">
        <p className="text-white font-semibold text-lg">Payment Setup</p>
        <p className="text-teal-100 text-sm mt-0.5">Secure checkout via Stripe</p>
      </div>

      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Order Summary</p>
        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Hubify Homes Beta — {data.portfolioTier ?? "Standard"} Plan
              </p>
              <p className="text-xs text-slate-500">
                {data.discountPercentage ?? 0}% founding discount · Beta Cohort #{data.betaCohortNumber ?? "?"}
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-800 shrink-0 ml-4">
              {fmt(data.discountedMonthlyPrice)}<span className="text-xs text-slate-400 font-normal">/mo</span>
            </span>
          </div>

          {(data.setupFee ?? 0) > 0 && (
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-800">Platform Initialization Fee</p>
                <p className="text-xs text-slate-500">One-time database setup</p>
              </div>
              <span className="text-sm font-semibold text-slate-800 shrink-0 ml-4">{fmt(data.setupFee)}</span>
            </div>
          )}

          <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">Total Due Today</p>
              <p className="text-xs text-slate-500">First month + setup fee</p>
            </div>
            <span className="text-xl font-bold text-teal-700">{fmt(totalDueToday)}</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 text-xs text-slate-500 leading-relaxed">
          After today, you'll be billed <strong className="text-slate-700">{fmt(data.discountedMonthlyPrice)}/month</strong>.
          Your beta discount of <strong className="text-slate-700">{data.discountPercentage ?? 0}%</strong> is locked in for the lifetime
          of your subscription. You may cancel at any time.
        </div>

        <Button
          className="w-full bg-teal-600 hover:bg-teal-700 text-white text-base py-5 font-semibold"
          onClick={() => checkoutMutation.mutate()}
          disabled={checkoutMutation.isPending}
        >
          {checkoutMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Stripe…</>
          ) : (
            <><CreditCard className="w-4 h-4 mr-2" />Continue to Secure Payment <ArrowRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>

        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-400">
          <Lock className="w-3 h-3" />
          <span>Secured by Stripe · 256-bit SSL encryption</span>
        </div>
      </div>
    </div>
  );
}

// ── Locked Step 2 placeholder ──────────────────────────────────────────────────

function PaymentStepLocked() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 opacity-60 select-none">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-slate-400" />
        <p className="font-semibold text-slate-500">Payment Setup</p>
      </div>
      <p className="text-slate-400 text-sm">Complete Step 1 to unlock payment setup.</p>
    </div>
  );
}

// ── Payment success / processing screen ────────────────────────────────────────

function PaymentSuccess({ data }: { data: OnboardingDetails }) {
  const isPaid = data.paymentStatus === "paid" || data.stage === "platform_initializing";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-9 h-9 text-teal-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {isPaid ? "Payment Received!" : "Payment Processing…"}
      </h2>
      <p className="text-slate-600 text-sm leading-relaxed mb-6">
        {isPaid
          ? "Your payment was successful. Your platform setup is now starting — you'll receive an email when it's ready."
          : "Your payment is being processed. This usually takes just a moment. You'll receive a confirmation email shortly."}
      </p>
      <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 text-left">
        <p className="text-teal-800 text-sm font-semibold mb-1">What happens next</p>
        <ul className="text-teal-700 text-sm space-y-1 list-disc list-inside">
          <li>Our team initializes your Hubify platform</li>
          <li>You'll receive login credentials via email</li>
          <li>Onboarding call scheduled within 2 business days</li>
        </ul>
      </div>
    </div>
  );
}

// ── Payment cancelled banner ────────────────────────────────────────────────────

function PaymentCancelledBanner() {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
      <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
      <span>Your payment was cancelled and nothing was charged. You can try again when you're ready.</span>
    </div>
  );
}

// ── Verifying payment screen ─────────────────────────────────────────────────

function VerifyingPayment({ token, onVerified }: { token: string; onVerified: () => void }) {
  const { data, isError } = useQuery<OnboardingDetails>({
    queryKey: ["/api/public/onboarding", token, "verify"],
    queryFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}`);
      if (!res.ok) throw new Error("Failed to verify");
      return res.json();
    },
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.paymentStatus === "paid" || d?.stage === "platform_initializing") return false;
      return 2000;
    },
    retry: 5,
  });

  useEffect(() => {
    if (data?.paymentStatus === "paid" || data?.stage === "platform_initializing") {
      onVerified();
    }
  }, [data, onVerified]);

  if (isError) return (
    <div className="text-center py-10 text-slate-500 text-sm">
      <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
      Could not verify payment status. Please refresh the page or contact support.
    </div>
  );

  return (
    <div className="text-center py-10">
      <RefreshCw className="w-7 h-7 animate-spin text-teal-600 mx-auto mb-3" />
      <p className="text-slate-600 text-sm font-medium">Verifying your payment…</p>
      <p className="text-slate-400 text-xs mt-1">This usually takes just a moment.</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPortal() {
  const { token } = useParams<{ token: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const paymentParam = params.get("payment");

  const [localSigned, setLocalSigned] = useState(false);
  const [signerNameLocal, setSignerNameLocal] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<OnboardingDetails, { status: number; message: string }>({
    queryKey: ["/api/public/onboarding", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to load." }));
        const err: any = new Error(body.message ?? "Failed to load.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    retry: false,
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-16 w-auto mx-auto mb-8" />
          <Loader2 className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
          <p className="mt-3 text-slate-500 text-sm">Loading your onboarding details…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const err = error as any;
    return <TokenError status={err?.status ?? 500} message={err?.message ?? "Failed to load."} />;
  }

  const agreementSigned = data.alreadySigned || localSigned;
  const paymentPaid = data.paymentStatus === "paid" || data.stage === "platform_initializing" || paymentVerified;
  const currentStep = paymentPaid ? 3 : agreementSigned ? 2 : 1;

  if (paymentParam === "success" && !paymentPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-16 w-auto mx-auto mb-6" />
            <StepIndicator current={3} />
          </div>
          <VerifyingPayment token={token!} onVerified={() => {
            setPaymentVerified(true);
            refetch();
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-16 w-auto mx-auto mb-6" />
          <StepIndicator current={currentStep} />
          {!agreementSigned && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Beta Agreement Review</h1>
              <p className="text-slate-500 text-sm">Review your membership details and sign your Beta Agreement to continue.</p>
            </>
          )}
          {agreementSigned && !paymentPaid && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Complete Your Payment</h1>
              <p className="text-slate-500 text-sm">Your agreement is signed. Complete payment to activate your platform.</p>
            </>
          )}
          {paymentPaid && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Platform Initializing</h1>
              <p className="text-slate-500 text-sm">Payment received. Your platform is being set up.</p>
            </>
          )}
        </div>

        {paymentParam === "cancelled" && !paymentPaid && <PaymentCancelledBanner />}

        {!agreementSigned && (
          <AgreementStep
            data={data}
            token={token!}
            onSigned={(name) => {
              setSignerNameLocal(name);
              setLocalSigned(true);
            }}
          />
        )}

        {agreementSigned && !paymentPaid && (
          <>
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Step 1 complete — agreement signed
                {(data.agreementSignerName || signerNameLocal) && ` by ${data.agreementSignerName ?? signerNameLocal}`}.
              </span>
            </div>
            <PaymentStep data={data} token={token!} />
          </>
        )}

        {paymentPaid && <PaymentSuccess data={data} />}

        <p className="text-center text-xs text-slate-400 mt-6">
          Questions?{" "}
          <a href="mailto:hello@hubifyhomesonline.com" className="text-teal-600 hover:underline">
            hello@hubifyhomesonline.com
          </a>
        </p>
      </div>
    </div>
  );
}
