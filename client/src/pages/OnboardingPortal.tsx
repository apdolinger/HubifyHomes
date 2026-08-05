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
  FileText, ChevronDown, Scale, Shield, Building2, Globe,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const AGREEMENT_VERSION = "v1.1";
const TERMS_VERSION = "v1.2";
const PRIVACY_VERSION = "v1.2";

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
  publicSetupUrl?: string | null;
  provisioningFailed?: boolean;
  workspaceSlug?: string | null;
  accountPasswordSet?: boolean;
}

// ── Form schema ───────────────────────────────────────────────────────────────

const agreementSchema = z.object({
  agreeToBetaAgreement: z.literal(true, {
    errorMap: () => ({ message: "You must review and accept the Hubify Homes Founding Member Agreement" }),
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
  { n: 2, label: "Workspace" },
  { n: 3, label: "Account" },
  { n: 4, label: "Payment" },
  { n: 5, label: "Setup" },
  { n: 6, label: "Welcome" },
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
          If you have questions please email{" "}
          <a href="mailto:contact@hubifyhomes.com" className="text-teal-600 hover:underline">
            contact@hubifyhomes.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Legal document content ────────────────────────────────────────────────────

function BetaAgreementContent({ company }: { company?: string }) {
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-5">
      <p className="text-xs text-slate-400">Version {AGREEMENT_VERSION} · Effective June 2, 2026</p>
      <p>
        This Hubify Homes Inc. Founding Member Agreement ("<strong>Agreement</strong>") is entered into between{" "}
        <strong>Hubify Homes Inc.</strong> ("<strong>Hubify</strong>," "we," "us") and the organization identified
        during onboarding ("<strong>Founding Member</strong>" or "you"), and governs your participation in the
        Hubify Homes Founding Member Program.
      </p>

      <div>
        <p className="font-semibold text-slate-900 mb-1">1. Founding Member Access</p>
        <p className="mb-2">Subject to the terms of this Agreement, Hubify grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Hubify platform ("Platform") solely for your internal business purposes.</p>
        <p>Access is provided on an invitation-only basis and may be suspended, restricted, or revoked in accordance with this Agreement.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">2. Founding Member Pricing &amp; Lifetime Lock</p>
        <p className="mb-2">In consideration of your early adoption and participation in the Founding Member Program, Hubify may offer a discounted monthly subscription rate ("Founding Member Price") as specified during onboarding.</p>
        <p className="mb-2">The Founding Member Price is reserved exclusively for approved Founding Members and remains available only while Participant maintains a continuous active subscription account in good standing.</p>
        <p className="mb-1">Good standing requires:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li>Timely payment of all fees and charges</li>
          <li>Compliance with this Agreement</li>
          <li>Compliance with the Terms of Service and Privacy Policy</li>
          <li>Compliance with all applicable Platform policies</li>
          <li>No chargebacks, payment disputes, fraud, abuse, or misuse of the Platform</li>
        </ul>
        <p className="mb-1">The Founding Member Price shall immediately terminate upon:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li>Cancellation of service</li>
          <li>Voluntary account closure</li>
          <li>Suspension of service</li>
          <li>Termination for cause</li>
          <li>Non-payment</li>
          <li>Chargebacks or payment disputes</li>
          <li>Any lapse in active subscription status</li>
        </ul>
        <p className="mb-2">If Participant's subscription ceases for any reason, Participant shall not be entitled to reinstatement of the Founding Member Price upon reactivation or creation of a new account.</p>
        <p>A one-time platform initialization fee may apply as disclosed during onboarding. Initialization fees become non-refundable once platform provisioning begins. Monthly subscription fees are billed in advance. Participant may cancel at any time, with cancellation becoming effective at the conclusion of the current billing cycle.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">3. Nature of the Platform</p>
        <p className="mb-2">Participant acknowledges that the Platform is an evolving product and may contain bugs, defects, interruptions, security vulnerabilities, incomplete functionality, or other errors.</p>
        <p className="mb-1">Hubify makes no guarantees regarding:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li>Platform availability</li>
          <li>Uptime</li>
          <li>Feature completeness</li>
          <li>Performance</li>
          <li>Data durability</li>
          <li>Future feature availability</li>
        </ul>
        <p className="mb-2">Participant understands that functionality may be modified, removed, delayed, or discontinued at any time during the Founding Member early-access period.</p>
        <p>Hubify will use commercially reasonable efforts to maintain service continuity and provide notice of planned maintenance when practical.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">4. Feedback &amp; Improvements</p>
        <p className="mb-2">Participant agrees to provide reasonable feedback regarding use of the Platform, including bug reports, feature requests, usability observations, operational recommendations, and related comments ("Feedback").</p>
        <p>Participant grants Hubify a perpetual, irrevocable, worldwide, royalty-free, transferable license to use, modify, commercialize, incorporate, distribute, and otherwise exploit any Feedback without restriction or compensation.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">5. Confidentiality</p>
        <p className="mb-2">The Platform, its functionality, features, pricing, documentation, roadmaps, unreleased functionality, screenshots, performance information, and all non-public information disclosed by Hubify constitute Confidential Information.</p>
        <p className="mb-2">Participant agrees not to disclose, publish, distribute, reproduce, or share Confidential Information with any third party without Hubify's prior written consent.</p>
        <p className="mb-1">Participant shall not publicly publish:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li>Screenshots of the Platform</li>
          <li>Performance benchmarks</li>
          <li>Security findings</li>
          <li>Unreleased features</li>
          <li>Product roadmaps</li>
          <li>Internal workflows</li>
        </ul>
        <p>without Hubify's prior written consent. These confidentiality obligations survive termination of this Agreement for two (2) years.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">6. Data &amp; Privacy</p>
        <p className="mb-2">Hubify will process Participant data in accordance with its Privacy Policy.</p>
        <p className="mb-2">Participant represents and warrants that it has obtained all rights, permissions, notices, and consents necessary to upload, store, process, and transmit data through the Platform.</p>
        <p className="mb-2">Participant retains ownership of all data submitted to the Platform. Participant grants Hubify a limited license to access, host, process, store, transmit, and display such data solely as necessary to provide, support, maintain, secure, improve, and operate the Platform.</p>
        <p className="mb-2">Hubify may use aggregated, anonymized, and de-identified information derived from Platform usage for analytics, benchmarking, service improvements, research, product development, and related business purposes, provided such information does not identify Participant, its customers, homeowners, vendors, or specific properties.</p>
        <p className="mb-2">Hubify will not sell Participant's identifiable data to third parties.</p>
        <p>Participant acknowledges that Hubify does not guarantee against data loss, corruption, deletion, or unavailability during the Founding Member early-access period and remains solely responsible for maintaining independent backups of critical business information.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">7. Acceptable Use</p>
        <p className="mb-1">Participant agrees to use the Platform only for lawful business purposes and in compliance with all applicable laws and regulations. Participant shall not:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Reverse engineer the Platform</li>
          <li>Attempt unauthorized access</li>
          <li>Circumvent security controls</li>
          <li>Interfere with Platform operations</li>
          <li>Upload malicious software</li>
          <li>Use the Platform for unlawful purposes</li>
          <li>Access or attempt to access other customer data</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">8. Intellectual Property</p>
        <p>Hubify and its licensors retain all right, title, and interest in and to the Platform, including all software, source code, designs, documentation, trademarks, service marks, branding, workflows, inventions, improvements, and related intellectual property. No ownership rights are transferred to Participant under this Agreement.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">9. Property Management Disclaimer</p>
        <p className="mb-2">Participant acknowledges that the Platform is an administrative software tool intended to assist with property management, home watch, estate management, and related operational activities.</p>
        <p className="mb-1">The Platform does not provide:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li>Legal advice</li>
          <li>Accounting advice</li>
          <li>Regulatory compliance advice</li>
          <li>Inspection services</li>
          <li>Emergency response services</li>
          <li>Property management services</li>
          <li>Professional advisory services</li>
        </ul>
        <p>Participant remains solely responsible for all inspections, communications, decisions, services, customer interactions, emergency responses, compliance obligations, and business operations conducted through or in connection with the Platform.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">10. Disclaimer of Warranties</p>
        <p className="font-semibold mb-2">THE PLATFORM IS PROVIDED "AS IS," "AS AVAILABLE," AND WITH ALL FAULTS.</p>
        <p className="font-semibold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, HUBIFY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, RELIABILITY, SECURITY, AND AVAILABILITY.</p>
        <p className="font-semibold">HUBIFY DOES NOT WARRANT THAT THE PLATFORM WILL BE ERROR-FREE, UNINTERRUPTED, SECURE, OR FREE FROM DATA LOSS.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">11. Limitation of Liability</p>
        <p className="font-semibold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, HUBIFY'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT OR THE PLATFORM SHALL NOT EXCEED THE TOTAL FEES PAID BY PARTICIPANT TO HUBIFY DURING THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</p>
        <p className="font-semibold">IN NO EVENT SHALL HUBIFY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, PUNITIVE, OR LOST-PROFIT DAMAGES.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">12. Indemnification</p>
        <p className="mb-1">Participant agrees to defend, indemnify, and hold harmless Hubify Homes Inc., its officers, directors, employees, contractors, affiliates, successors, and assigns from and against any claims, damages, losses, liabilities, judgments, penalties, costs, and expenses, including reasonable attorneys' fees, arising from:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Participant's use of the Platform</li>
          <li>Participant's violation of this Agreement</li>
          <li>Participant's violation of applicable law</li>
          <li>Data uploaded by Participant</li>
          <li>Services provided by Participant to its customers</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">13. Suspension &amp; Termination</p>
        <p className="mb-2">Either party may terminate this Agreement upon thirty (30) days' written notice.</p>
        <p className="mb-1">Hubify may immediately suspend, restrict, or terminate access upon:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li>Non-payment</li>
          <li>Material breach</li>
          <li>Security concerns</li>
          <li>Fraudulent activity</li>
          <li>Abuse of the Platform</li>
          <li>Legal or regulatory concerns</li>
          <li>Compliance risks</li>
          <li>Reputational risks</li>
        </ul>
        <p className="mb-2">Hubify further reserves the right to suspend or terminate service if continued service would cause Hubify to violate any applicable law, regulation, governmental requirement, court order, compliance obligation, or regulatory framework.</p>
        <p>Where reasonably practicable, Hubify will provide notice and an opportunity to export data. Participant may request a data export within thirty (30) days following termination.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">14. Force Majeure</p>
        <p>Hubify shall not be liable for any delay, interruption, or failure resulting from causes beyond its reasonable control, including natural disasters, hurricanes, acts of God, internet outages, cyberattacks, labor disputes, governmental actions, utility failures, cloud provider failures, payment processor failures, or failures of third-party services.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">15. Dispute Resolution</p>
        <p className="mb-2">This Agreement shall be governed by the laws of the State of Florida without regard to conflict-of-law principles.</p>
        <p className="mb-2">Any dispute arising from or relating to this Agreement shall be resolved exclusively through binding arbitration administered by the American Arbitration Association.</p>
        <p>Participant agrees that all disputes shall be brought solely in an individual capacity and not as a plaintiff or class member in any purported class action, representative action, collective action, or consolidated proceeding.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">16. Entire Agreement</p>
        <p className="mb-2">This Agreement, together with the Hubify Terms of Service and Privacy Policy, constitutes the entire agreement between the parties concerning the Founding Member Program and supersedes all prior discussions, understandings, or agreements relating to the subject matter herein.</p>
        <p>By selecting "I Agree" during onboarding, Participant acknowledges that it has read, understood, and agrees to be bound by this Agreement.</p>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-1 text-xs text-slate-400">
        <p><strong className="text-slate-600">Hubify Homes Inc.</strong> · <a href="mailto:contact@hubifyhomes.com" className="text-teal-600 hover:underline">contact@hubifyhomes.com</a></p>
        <p>Agreement Version: {AGREEMENT_VERSION}</p>
        {company && <p>Participant Organization: {company}</p>}
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-5">
      <p className="text-xs text-slate-400">Version {TERMS_VERSION} · Effective June 2, 2026</p>
      <p>
        These Terms of Service ("<strong>Terms</strong>") constitute a legally binding agreement between you and <strong>Hubify Homes Inc.</strong> ("Hubify", "we", "us", or "our"). By accessing or using our services, you agree to be bound by these Terms. If you do not agree, you may not use the Service.
      </p>

      <div>
        <p className="font-semibold text-slate-900 mb-1">1. Acceptance of Terms</p>
        <p className="mb-2">By creating an account, accessing, or using the Hubify platform, you agree to comply with and be legally bound by these Terms, our Privacy Policy, and all applicable laws.</p>
        <p>If you use the Service on behalf of an organization, you represent and warrant that you have authority to bind that organization to these Terms.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">2. Eligibility &amp; Account Registration</p>
        <p className="mb-2">You must be at least eighteen (18) years old to use the Service.</p>
        <p className="mb-1">You agree to:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Provide accurate, current, and complete registration information</li>
          <li>Maintain and promptly update account information</li>
          <li>Maintain the confidentiality of login credentials</li>
          <li>Accept responsibility for all activity occurring under your account</li>
          <li>Immediately notify Hubify of any unauthorized access or security breach</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">3. Description of Service</p>
        <p className="mb-2">Hubify Homes Inc. provides cloud-based software tools designed to support home watch companies, estate management companies, property service providers, and related businesses.</p>
        <p className="mb-1">Features may include:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li>Property management</li>
          <li>Client management</li>
          <li>Team management</li>
          <li>Scheduling and calendar tools</li>
          <li>Task management</li>
          <li>Reporting</li>
          <li>Invoicing</li>
          <li>Communication tools</li>
          <li>Workflow automation</li>
          <li>Artificial intelligence and automation features</li>
        </ul>
        <p>Hubify reserves the right to modify, improve, suspend, limit, or discontinue any feature or portion of the Service at any time.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">4. Subscription &amp; Payment Terms</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Subscriptions <strong>automatically renew</strong> unless cancelled before the next billing date</li>
          <li>Payments are processed through Stripe or other authorized payment providers</li>
          <li>By providing payment information, you authorize recurring charges</li>
          <li>All fees are non-refundable except where required by law</li>
          <li>Failed, disputed, reversed, or chargeback payments may result in immediate suspension or termination</li>
          <li>You are responsible for all taxes associated with your use of the Service</li>
          <li>Pricing changes will be communicated at least thirty (30) days in advance</li>
          <li>Founding Member pricing is governed separately by any applicable Founding Member Agreement</li>
          <li>Subscription cancellations take effect at the conclusion of the current billing period and do not generate prorated refunds</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">5. License Grant &amp; Restrictions</p>
        <p className="mb-2">Subject to your compliance with these Terms, Hubify grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for your internal business purposes.</p>
        <p className="mb-1">You may not:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Copy, modify, or create derivative works</li>
          <li>Reverse engineer, decompile, or disassemble the Service</li>
          <li>Resell, sublicense, rent, lease, or distribute access</li>
          <li>Use the Service to build a competing product</li>
          <li>Access the Service through unauthorized automated means</li>
          <li>Attempt to circumvent security or access controls</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">6. Acceptable Use</p>
        <p className="mb-1">You agree to use the Service only in compliance with applicable law. Prohibited conduct includes:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-2">
          <li>Violating laws or regulations</li>
          <li>Infringing intellectual property rights</li>
          <li>Uploading malicious code</li>
          <li>Harassing, threatening, or abusing others</li>
          <li>Collecting personal information without authorization</li>
          <li>Fraudulent or deceptive conduct</li>
          <li>Attempting unauthorized access to data or systems</li>
        </ul>
        <p className="font-semibold">Violation may result in suspension, termination, legal action, or all three.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">7. Intellectual Property</p>
        <p className="mb-2">The Service, software, documentation, branding, trademarks, workflows, designs, and related intellectual property are owned by Hubify Homes Inc. or its licensors.</p>
        <p className="mb-2">You retain ownership of your uploaded content and business data. You grant Hubify a limited license to host, process, store, transmit, display, and use your data solely as necessary to provide, maintain, support, secure, improve, and operate the Service.</p>
        <p>Any feedback, suggestions, recommendations, or ideas submitted to Hubify may be used without restriction, attribution, or compensation.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">8. Privacy &amp; Data Protection</p>
        <p className="mb-2">Our Privacy Policy governs our collection, use, disclosure, and protection of personal information. By using the Service, you consent to the practices described in the Privacy Policy.</p>
        <p className="font-semibold mb-1">8A. Aggregated &amp; De-Identified Data</p>
        <p className="mb-1">Hubify may use aggregated, anonymized, and de-identified information derived from use of the Service for analytics, benchmarking, service improvements, product development, research, operational insights, and industry reporting.</p>
        <p>Hubify will not sell identifiable customer data or identifiable personal information to third parties without authorization.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">9. Service Availability</p>
        <p>Hubify strives to maintain reliable service but does not guarantee uninterrupted availability. Scheduled maintenance may occur periodically. Although Hubify performs backups and operational safeguards, you remain responsible for maintaining independent backups of critical business information.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">10. Disclaimer of Warranties</p>
        <p className="font-semibold mb-2">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, HUBIFY DISCLAIMS ALL WARRANTIES, EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, SECURITY, AND AVAILABILITY.</p>
        <p className="font-semibold mb-1">10A. Professional Services Disclaimer</p>
        <p className="mb-1">Hubify provides software tools only. Hubify does not provide home watch, property management, estate management, inspection, emergency response, legal, accounting, compliance, or professional consulting services.</p>
        <p className="mb-1">Users remain solely responsible for all business operations, inspections, communications, emergency responses, client services, legal compliance obligations, and decisions made using the Service.</p>
        <p className="font-semibold mb-1">10B. Artificial Intelligence Disclaimer</p>
        <p>Certain features may utilize artificial intelligence, machine learning, automation, predictive technologies, or third-party AI systems. AI-generated outputs may contain inaccuracies, omissions, errors, or outdated information. Users are solely responsible for reviewing, validating, and verifying all AI-generated outputs before relying on them for operational, financial, legal, compliance, client-facing, or business decisions.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">11. Limitation of Liability</p>
        <p className="font-semibold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, HUBIFY SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, LOST REVENUE, OR BUSINESS INTERRUPTION.</p>
        <p className="font-semibold mb-2">HUBIFY'S TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED THE GREATER OF: THE TOTAL FEES PAID DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM; OR ONE HUNDRED DOLLARS ($100).</p>
        <p>Nothing in these Terms limits liability to the extent such limitation is prohibited by applicable law.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">12. Indemnification</p>
        <p className="mb-1">You agree to defend, indemnify, and hold harmless Hubify Homes Inc., its affiliates, subsidiaries, owners, officers, directors, employees, contractors, successors, and assigns from any claims, damages, liabilities, costs, losses, penalties, and expenses (including reasonable attorneys' fees) arising from:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Your use of the Service</li>
          <li>Your violation of these Terms or applicable law</li>
          <li>Your uploaded content</li>
          <li>Services you provide to your customers</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">13. Dispute Resolution</p>
        <p className="mb-2">These Terms are governed by the laws of the State of Florida. Except where prohibited by law, disputes shall be resolved through binding arbitration administered by the American Arbitration Association.</p>
        <p className="mb-2">The following are excluded from mandatory arbitration: small claims matters, intellectual property disputes, and requests for injunctive relief.</p>
        <p className="font-semibold">You waive participation in any class action, collective action, representative action, or consolidated proceeding.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">14. Termination</p>
        <p className="mb-2">You may terminate your account at any time. Hubify may suspend, restrict, or terminate access immediately for non-payment, fraud, abuse, security concerns, violation of these Terms, chargebacks or payment disputes, or legal or regulatory requirements.</p>
        <p>Upon termination, users will have thirty (30) days to export available data before deletion.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">15. Force Majeure</p>
        <p>Hubify shall not be liable for delays, interruptions, outages, failures, or inability to perform resulting from events beyond its reasonable control, including acts of God, natural disasters, utility failures, internet outages, cyberattacks, labor disputes, government actions, cloud provider failures, payment processor failures, or third-party service outages.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">16. Modifications to Terms</p>
        <p>Hubify may modify these Terms from time to time. Material changes will be communicated through email, in-product notification, or other reasonable means at least fourteen (14) days before becoming effective. Continued use after the effective date constitutes acceptance of the revised Terms.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">17. General Provisions</p>
        <p>These Terms, together with the Privacy Policy and any applicable Founding Member Agreement, constitute the entire agreement between the parties. If any provision is determined unenforceable, the remaining provisions remain in full force and effect.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">18. Contact</p>
        <p>Questions regarding these Terms may be directed to: <a href="mailto:contact@hubifyhomes.com" className="text-teal-600 hover:underline">contact@hubifyhomes.com</a></p>
      </div>

      <div className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Hubify Homes Inc. · Terms of Service {TERMS_VERSION} · Effective June 2, 2026
      </div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-5">
      <p className="text-xs text-slate-400">Version {PRIVACY_VERSION} · Effective June 2, 2026</p>
      <p>
        Hubify Homes Inc. ("Hubify," "we," "us," or "our") respects your privacy and is committed to protecting the information entrusted to us. This Privacy Policy explains how we collect, use, disclose, store, and protect information when you access or use the Hubify platform, website, applications, and related services (collectively, the "Services").
      </p>

      <div>
        <p className="font-semibold text-slate-900 mb-1">1. Information We Collect</p>
        <p className="mb-1"><strong>Information You Provide</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-3 mb-3">
          <li>Name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Company name</li>
          <li>Business address</li>
          <li>Account information</li>
          <li>Property information</li>
          <li>Client information</li>
          <li>Vendor information</li>
          <li>Communications with Hubify</li>
          <li>Support requests</li>
          <li>Documents and files uploaded to the Services</li>
        </ul>
        <p className="mb-1"><strong>Payment Information</strong></p>
        <p className="mb-3">Payment information is processed by third-party payment processors such as Stripe. Hubify does not store complete payment card information.</p>
        <p className="mb-1"><strong>Information Collected Automatically</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>IP address</li>
          <li>Browser type</li>
          <li>Device information</li>
          <li>Operating system</li>
          <li>Usage information</li>
          <li>Authentication activity</li>
          <li>Log files</li>
          <li>Cookie and session information</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">2. How We Use Information</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Provide and operate the Services</li>
          <li>Create and manage accounts</li>
          <li>Process subscriptions and payments</li>
          <li>Provide customer support</li>
          <li>Secure and maintain the platform</li>
          <li>Detect and prevent fraud, abuse, and security incidents</li>
          <li>Improve existing features and develop new features</li>
          <li>Communicate service-related information</li>
          <li>Comply with legal obligations</li>
          <li>Enforce our agreements and policies</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">3. Aggregated and De-Identified Information</p>
        <p className="mb-1">Hubify may create aggregated, anonymized, or de-identified information derived from use of the Services. Such information may be used for analytics, benchmarking, product development, research, service improvements, industry insights, and operational reporting.</p>
        <p className="font-semibold">Hubify will not sell identifiable customer data or identifiable personal information to third parties.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">4. How We Share Information</p>
        <p className="mb-1">We may share information with service providers that assist in operating the Services, including providers of hosting and cloud infrastructure, payment processing, email delivery, authentication, customer support, analytics, and artificial intelligence and automation services.</p>
        <p className="mb-1">We may also disclose information:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>When required by law</li>
          <li>To comply with legal process</li>
          <li>To protect rights, safety, or security</li>
          <li>To investigate fraud or misuse</li>
          <li>In connection with a merger, acquisition, financing, or sale of assets</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">5. Artificial Intelligence Features</p>
        <p className="mb-1">Certain features may utilize artificial intelligence, automation, machine learning, or third-party AI providers. Information submitted to AI-powered features may be processed by third-party providers solely for the purpose of delivering requested functionality and operating the Services.</p>
        <p>Users are responsible for determining whether information submitted to AI features is appropriate for their business requirements.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">6. Data Retention</p>
        <p className="mb-1">We retain information for as long as reasonably necessary to provide the Services, comply with legal obligations, resolve disputes, enforce agreements, and maintain business records.</p>
        <ul className="list-disc list-inside space-y-0.5 ml-3">
          <li>Account information is retained while accounts remain active</li>
          <li>Billing and tax records may be retained as required by law</li>
          <li>Security and audit logs may be retained for operational and security purposes</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">7. Data Security</p>
        <p className="mb-1">Hubify uses commercially reasonable administrative, technical, and organizational safeguards designed to protect information. Security measures may include encryption in transit, encryption at rest, access controls, authentication controls, and monitoring and logging.</p>
        <p>No method of transmission or storage is completely secure, and Hubify cannot guarantee absolute security.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">8. Cookies and Similar Technologies</p>
        <p className="mb-2">Hubify may use cookies and similar technologies to authenticate users, maintain sessions, remember preferences, analyze usage patterns, and improve Services. You may control cookie settings through your browser, although disabling certain cookies may affect functionality.</p>
        <button
          type="button"
          onClick={openCookiePreferences}
          className="inline-flex items-center gap-1.5 text-xs text-teal-700 border border-teal-300 hover:bg-teal-50 px-3 py-1.5 rounded-md font-medium transition-colors"
        >
          Manage cookie preferences
        </button>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">9. Your Privacy Choices</p>
        <p className="mb-1">Subject to applicable law, you may have rights to access personal information, correct inaccurate information, request deletion of information, request a copy of information, and object to certain processing activities.</p>
        <p>Requests may be submitted to: <a href="mailto:privacy@hubifyhomes.com" className="text-teal-600 hover:underline">privacy@hubifyhomes.com</a>. Hubify may take reasonable steps to verify identity before processing requests.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">10. International Data Transfers</p>
        <p>Information may be processed and stored in the United States and other jurisdictions where Hubify or its service providers operate. By using the Services, you acknowledge that information may be transferred and processed in these jurisdictions as permitted by applicable law.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">11. Children's Privacy</p>
        <p>The Services are intended for business users and individuals eighteen (18) years of age or older. Hubify does not knowingly collect personal information from children.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">12. Changes to This Privacy Policy</p>
        <p>Hubify may update this Privacy Policy from time to time. Material changes will be communicated through reasonable means, which may include email notifications or notices within the Services. Continued use of the Services after an updated Privacy Policy becomes effective constitutes acceptance of the revised policy.</p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">13. Contact Information</p>
        <p className="mb-1">Questions regarding this Privacy Policy or privacy-related requests may be directed to:</p>
        <p className="mb-0.5"><a href="mailto:contact@hubifyhomes.com" className="text-teal-600 hover:underline">contact@hubifyhomes.com</a></p>
        <p className="mb-0.5 font-medium">Hubify Homes Inc.</p>
        <p>Jupiter, Florida, USA</p>
      </div>

      <div className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Hubify Homes Inc. · Privacy Policy {PRIVACY_VERSION} · Effective June 2, 2026
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
          tosVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
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
      {/* Founding Member Agreement modal */}
      <LegalDocModal
        open={betaModalOpen}
        onOpenChange={setBetaModalOpen}
        title="Hubify Homes Founding Member Agreement"
        subtitle={`Version ${AGREEMENT_VERSION} — Read the full agreement before accepting`}
        icon={<FileText className="w-4 h-4 text-teal-600" />}
        confirmLabel={`I have read, understand, and agree to the Hubify Homes Founding Member Agreement (${AGREEMENT_VERSION}).`}
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
        <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">Your Founding Membership</p>
        <table className="w-full border-collapse">
          <tbody>
            <Row label="Contact Name" value={displayName} />
            <Row label="Email" value={data.email ?? "—"} />
            {data.phone && <Row label="Phone" value={data.phone} />}
            <Row label="Company Name" value={data.company ?? "—"} />
            {data.estimatedHomes != null && <Row label="Properties Managed" value={data.estimatedHomes.toLocaleString()} />}
            {data.teamSize != null && <Row label="Staff Users Expected" value={data.teamSize.toLocaleString()} />}
            <Row label="Portfolio Tier" value={data.portfolioTier ?? "—"} />
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
        <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">Founding Member Pricing</p>
        <table className="w-full border-collapse">
          <tbody>
            {data.originalMonthlyPrice != null && (
              <Row label="List Price" value={
                <span className="line-through text-slate-400">{fmt(data.originalMonthlyPrice)}/mo</span>
              } />
            )}
            {data.discountPercentage != null && (
              <Row label="Founding Member Discount" value={
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
          <span>Your founding member pricing is <strong>locked in for life</strong> — as long as your subscription remains in good standing, your rate will never increase.</span>
        </div>
      </div>

      {/* Agreement form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <p className="font-semibold text-slate-900">Sign Your Founding Member Agreement</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => acceptMutation.mutate(v))} className="space-y-5">
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <DocRow
                accepted={betaAccepted}
                label="Hubify Homes Founding Member Agreement"
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

  const isFree = totalDueToday === 0;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Failed to create payment session.");
      return body as { checkoutUrl: string } | { free: true };
    },
    onSuccess: (result) => {
      if ("free" in result && result.free) {
        // $0 total — no Stripe redirect needed; go straight to payment=success
        const url = new URL(window.location.href);
        url.searchParams.set("payment", "success");
        window.location.href = url.toString();
      } else if ("checkoutUrl" in result) {
        window.location.href = result.checkoutUrl;
      }
    },
    onError: (err: any) => {
      toast({ title: "Payment setup failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-indigo-600 px-6 py-5">
        <p className="text-white font-semibold text-lg">Payment Setup</p>
        <p className="text-teal-100 text-sm mt-0.5">{isFree ? "No payment required — 100% founding discount applied" : "Secure checkout via Stripe"}</p>
      </div>

      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Order Summary</p>
        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Hubify Homes — {data.portfolioTier ?? "Standard"} Plan
              </p>
              <p className="text-xs text-slate-500">
                {data.discountPercentage ?? 0}% founding discount · locked for life
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
          {isFree ? (
            <>Your <strong className="text-slate-700">100% founding discount</strong> covers your entire subscription — no card required today.
            Your discount is locked in for the lifetime of your subscription.</>
          ) : (
            <>After today, you'll be billed <strong className="text-slate-700">{fmt(data.discountedMonthlyPrice)}/month</strong>.
            Your founding member discount of <strong className="text-slate-700">{data.discountPercentage ?? 0}%</strong> is locked in for the lifetime
            of your subscription. You may cancel at any time.</>
          )}
        </div>

        <Button
          className="w-full bg-teal-600 hover:bg-teal-700 text-white text-base py-5 font-semibold"
          onClick={() => checkoutMutation.mutate()}
          disabled={checkoutMutation.isPending}
        >
          {checkoutMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isFree ? "Activating your account…" : "Redirecting to Stripe…"}</>
          ) : isFree ? (
            <><CheckCircle className="w-4 h-4 mr-2" />Activate My Account <ArrowRight className="w-4 h-4 ml-1" /></>
          ) : (
            <><CreditCard className="w-4 h-4 mr-2" />Continue to Secure Payment <ArrowRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>

        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-400">
          <Lock className="w-3 h-3" />
          <span>{isFree ? "No payment information required" : "Secured by Stripe · 256-bit SSL encryption"}</span>
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

// ── Workspace ready screen ──────────────────────────────────────────────────────

// ── Slug picker step ────────────────────────────────────────────────────────

function SlugPicker({
  token,
  initialSlug,
  onConfirmed,
}: {
  token: string;
  initialSlug: string;
  onConfirmed: (slug: string) => void;
}) {
  const { toast } = useToast();
  const [slug, setSlug] = useState(initialSlug);
  const [checkResult, setCheckResult] = useState<{ available: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 63);
  }

  async function runCheck(clean: string) {
    if (!clean || clean.length < 3) return;
    setChecking(true);
    try {
      const url = `/api/public/onboarding/check-slug?slug=${encodeURIComponent(clean)}&token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      const body = await res.json();
      setCheckResult(body);
    } catch {
      setCheckResult({ available: false, reason: "Could not check availability" });
    } finally {
      setChecking(false);
    }
  }

  // Run the check immediately on mount so the initial pre-filled slug is validated
  // without requiring the user to type anything first.
  useEffect(() => {
    if (initialSlug && initialSlug.length >= 3) {
      runCheck(initialSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(val: string) {
    const clean = slugify(val);
    setSlug(clean);
    setCheckResult(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!clean || clean.length < 3) return;
    debounceRef.current = setTimeout(() => runCheck(clean), 500);
  }

  const saveMutation = useMutation({
    mutationFn: async (chosenSlug: string) => {
      const res = await fetch(`/api/public/onboarding/${token}/save-slug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: chosenSlug }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not save workspace name");
      }
      return res.json() as Promise<{ ok: boolean; slug: string }>;
    },
    onSuccess: (data) => onConfirmed(data.slug),
    onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
  });

  const canSubmit = slug.length >= 3 && checkResult?.available === true && !saveMutation.isPending;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Choose Your Workspace Name</h2>
          <p className="text-slate-500 text-sm">This sets up your unique workspace link.</p>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Workspace identifier</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={slug}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="my-company"
            maxLength={63}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
          />
          {checking && <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />}
          {!checking && checkResult?.available === true && <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />}
          {!checking && checkResult?.available === false && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
        </div>

        {/* Live URL preview — shown whenever the slug is long enough */}
        {slug.length >= 3 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span>Your workspace URL:</span>
            <span className="font-mono text-teal-700 font-medium">{slug}.hubifyhomesonline.com</span>
          </div>
        )}

        {slug.length > 0 && slug.length < 3 && (
          <p className="text-xs text-amber-600 mt-1.5">Must be at least 3 characters</p>
        )}
        {checkResult?.available === false && (
          <p className="text-xs text-red-600 mt-1.5">{checkResult.reason}</p>
        )}
        {checkResult?.available === true && (
          <p className="text-xs text-teal-600 mt-1.5">✓ This name is available</p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          Only lowercase letters, numbers, and hyphens. Min 3 characters.
        </p>
      </div>

      <button
        onClick={() => saveMutation.mutate(slug)}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
      >
        {saveMutation.isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
        ) : (
          <>Confirm Workspace Name <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );
}

function WorkspaceReady({ setupUrl, email, slug, accountPasswordSet }: { setupUrl: string; email?: string; slug?: string | null; accountPasswordSet?: boolean }) {
  const workspaceUrl = slug
    ? `https://${slug}.hubifyhomesonline.com`
    : `${window.location.origin}/staff/login`;
  const loginUrl = slug
    ? `https://${slug}.hubifyhomesonline.com/staff/login`
    : `${window.location.origin}/staff/login`;

  // Three cases:
  // 1. Password set in-wizard → setupUrl is /staff/login, accountPasswordSet=true
  // 2. Existing account (e.g. duplicate email) → setupUrl is /staff/login, accountPasswordSet=false
  // 3. New account via email → setupUrl is /setup-account/:token
  const isDirectLogin = setupUrl.includes("/staff/login");

  const heading = isDirectLogin ? "Your Workspace Is Ready!" : "One Last Step";
  const subtitle = isDirectLogin && accountPasswordSet
    ? "Your account and organization are fully set up. Log in with the email and password you just created."
    : isDirectLogin
    ? "Your Hubify organization is set up. Log in with your email and password."
    : `Your Hubify organization is set up. Click below to set your password and start using Hubify.${email ? ` We've also sent a link to ${email}.` : ""}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-9 h-9 text-teal-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">{heading}</h2>
      <p className="text-slate-600 text-sm leading-relaxed mb-4">{subtitle}</p>
      {slug && (
        <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 mb-5 text-sm text-slate-600">
          <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="text-slate-500 text-xs">Your workspace URL:</span>
          <a
            href={workspaceUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-teal-700 hover:text-teal-900 hover:underline font-medium"
          >
            {workspaceUrl}
          </a>
        </div>
      )}
      <a
        href={isDirectLogin ? loginUrl : setupUrl}
        className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-7 py-3 rounded-lg transition-colors mb-6"
      >
        {isDirectLogin ? "Go to Your Workspace" : "Set Your Password"} <ArrowRight className="w-4 h-4" />
      </a>
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-left">
        <p className="text-slate-700 text-sm font-semibold mb-2">What's next</p>
        <ol className="text-slate-600 text-sm space-y-1 list-decimal list-inside">
          <li>{isDirectLogin ? "Log in with your email and password" : "Set your password using the button above"}</li>
          <li>Complete your company profile in Settings</li>
          <li>Add your first property and invite your team</li>
        </ol>
      </div>
    </div>
  );
}

// ── Account setup step (collect name + password before payment) ───────────────

const accountSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type AccountForm = z.infer<typeof accountSchema>;

function AccountSetupStep({
  data,
  token,
  onAccountSet,
}: {
  data: OnboardingDetails;
  token: string;
  onAccountSet: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      password: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: AccountForm) => {
      const res = await fetch(`/api/public/onboarding/${token}/save-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to save account details.");
      }
      return res.json();
    },
    onSuccess: () => { onAccountSet(); },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Create Your Login</h2>
          <p className="text-slate-500 text-sm">You'll use these to access your workspace.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 mb-5 text-sm text-slate-600">
        <ShieldCheck className="w-4 h-4 text-teal-500 shrink-0" />
        <span>Signing in as <strong>{data.email}</strong></span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 text-sm font-medium">First name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 text-sm font-medium">Last name</FormLabel>
                  <FormControl>
                    <Input placeholder="Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 text-sm font-medium">Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Min. 8 characters" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 text-sm font-medium">Confirm password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Re-enter your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              : <>Continue to Payment <ArrowRight className="w-4 h-4 ml-2" /></>
            }
          </Button>
        </form>
      </Form>
    </div>
  );
}

// ── Setting up screen (payment done, provisioning in progress) ──────────────────

function SettingUp() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Setting Up Your Workspace…</h2>
      <p className="text-slate-600 text-sm leading-relaxed mb-6">
        Payment confirmed! We're creating your organization now. This usually takes just a few seconds.
      </p>
      <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 text-left">
        <p className="text-teal-800 text-sm font-semibold mb-1">Almost there</p>
        <ul className="text-teal-700 text-sm space-y-1 list-disc list-inside">
          <li>Creating your organization</li>
          <li>Setting up your admin account</li>
          <li>Sending your workspace link via email</li>
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

// ── Verifying payment / provisioning screen ──────────────────────────────────

function VerifyingPayment({
  token,
  onWorkspaceReady,
}: {
  token: string;
  onWorkspaceReady: (setupUrl: string) => void;
}) {
  // Track how long we've been polling — after 3 min show a "taking too long" message
  const startedAt = useRef(Date.now());
  const [timedOut, setTimedOut] = useState(false);

  const { data, isError } = useQuery<OnboardingDetails>({
    queryKey: ["/api/public/onboarding", token, "verify"],
    queryFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}`);
      if (!res.ok) throw new Error("Failed to verify");
      return res.json();
    },
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.stage === "converted" || d?.stage === "provisioning_failed" || d?.provisioningFailed) return false;
      // Stop polling after 3 minutes — will be showing the timeout message by then
      if (Date.now() - startedAt.current > 3 * 60 * 1000) return false;
      return 3000;
    },
    retry: 5,
  });

  // Kick off a 3-minute timeout timer
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 3 * 60 * 1000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (data?.stage === "converted") {
      // Advance to Welcome step — use setup URL if available, otherwise direct to login
      onWorkspaceReady(data.publicSetupUrl || `${window.location.origin}/staff/login`);
    }
  }, [data, onWorkspaceReady]);

  const isStuck = data?.provisioningFailed || data?.stage === "provisioning_failed" || timedOut;

  if (isError) return (
    <div className="text-center py-10 text-slate-500 text-sm">
      <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
      Could not verify payment status. Please refresh the page or contact support.
    </div>
  );

  if (isStuck) return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-7 h-7 text-teal-500" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">Your platform is being prepared</h2>
      <p className="text-slate-600 text-sm leading-relaxed mb-2">
        Your payment was received and your workspace is on its way. This occasionally takes a few extra minutes.
      </p>
      <p className="text-slate-600 text-sm leading-relaxed mb-5">
        <strong>You will receive an email with your login link as soon as it's ready</strong> — you don't need to stay on this page.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
      >
        <RefreshCw className="w-4 h-4" /> Check again
      </button>
    </div>
  );

  const isProvisioning = data?.paymentStatus === "paid" || data?.stage === "platform_initializing";

  return (
    <div className="text-center py-10">
      {isProvisioning ? (
        <>
          <Building2 className="w-8 h-8 text-teal-600 mx-auto mb-3" />
          <p className="text-slate-700 text-sm font-medium">Setting up your workspace…</p>
          <p className="text-slate-400 text-xs mt-1">Your platform will be prepared momentarily — you'll receive an email with your login link when it's ready.</p>
        </>
      ) : (
        <>
          <RefreshCw className="w-7 h-7 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">Verifying your payment…</p>
          <p className="text-slate-400 text-xs mt-1">This usually takes just a moment.</p>
        </>
      )}
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
  const [workspaceSetupUrl, setWorkspaceSetupUrl] = useState<string | null>(null);
  const [localSlugConfirmed, setLocalSlugConfirmed] = useState(false);
  const [localAccountSet, setLocalAccountSet] = useState(false);

  const { data, isLoading, error } = useQuery<OnboardingDetails, { status: number; message: string }>({
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

  // Sync workspace URL from server data when it arrives (handles page reload after payment)
  useEffect(() => {
    if (data?.stage === "converted" && data?.publicSetupUrl && !workspaceSetupUrl) {
      setWorkspaceSetupUrl(data.publicSetupUrl);
    }
  }, [data, workspaceSetupUrl]);

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
  const slugConfirmed = localSlugConfirmed || !!data.workspaceSlug || data.paymentStatus === "paid" || data.stage === "platform_initializing" || data.stage === "converted";
  const accountSet = localAccountSet || !!data.accountPasswordSet || data.paymentStatus === "paid" || data.stage === "platform_initializing" || data.stage === "converted";
  const paymentPaid = data.paymentStatus === "paid" || data.stage === "platform_initializing" || data.stage === "converted";
  const workspaceReady = data.stage === "converted" || !!workspaceSetupUrl;
  const activeSetupUrl = workspaceSetupUrl ?? data.publicSetupUrl ?? null;
  const activeSlug = data.workspaceSlug ?? null;

  const currentStep = workspaceReady ? 6 : paymentPaid ? 5 : accountSet ? 4 : slugConfirmed ? 3 : agreementSigned ? 2 : 1;

  // Derive a default slug from company name for pre-filling the picker
  const defaultSlug = (data.company || data.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "my-company";

  // When Stripe redirects back with ?payment=success, show polling screen
  if (paymentParam === "success" && !workspaceReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-16 w-auto mx-auto mb-6" />
            <StepIndicator current={5} />
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Setting Up Your Workspace</h1>
            <p className="text-slate-500 text-sm">Payment received. Hang tight while we get everything ready.</p>
          </div>
          <VerifyingPayment
            token={token!}
            onWorkspaceReady={(url) => setWorkspaceSetupUrl(url)}
          />
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
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Founding Member Agreement</h1>
              <p className="text-slate-500 text-sm">Review your membership details and sign your Founding Member Agreement to continue.</p>
            </>
          )}
          {agreementSigned && !slugConfirmed && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Choose Your Workspace Name</h1>
              <p className="text-slate-500 text-sm">Pick the identifier for your Hubify workspace before completing payment.</p>
            </>
          )}
          {slugConfirmed && !accountSet && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Create Your Login</h1>
              <p className="text-slate-500 text-sm">Set your name and password — you'll use these to access your workspace.</p>
            </>
          )}
          {accountSet && !paymentPaid && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Complete Your Payment</h1>
              <p className="text-slate-500 text-sm">Your agreement is signed. Complete payment to activate your platform.</p>
            </>
          )}
          {paymentPaid && !workspaceReady && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Setting Up Your Workspace</h1>
              <p className="text-slate-500 text-sm">Payment received. Your workspace is being prepared.</p>
            </>
          )}
          {workspaceReady && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Your Workspace Is Ready!</h1>
              <p className="text-slate-500 text-sm">Your Hubify organization has been set up successfully.</p>
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

        {agreementSigned && !slugConfirmed && (
          <>
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Step 1 complete — agreement signed
                {(data.agreementSignerName || signerNameLocal) && ` by ${data.agreementSignerName ?? signerNameLocal}`}.
              </span>
            </div>
            <SlugPicker
              token={token!}
              initialSlug={data.workspaceSlug || defaultSlug}
              onConfirmed={() => setLocalSlugConfirmed(true)}
            />
          </>
        )}

        {slugConfirmed && !accountSet && (
          <>
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Steps 1 &amp; 2 complete — agreement signed and workspace name chosen.</span>
            </div>
            <AccountSetupStep
              data={data}
              token={token!}
              onAccountSet={() => setLocalAccountSet(true)}
            />
          </>
        )}

        {accountSet && !paymentPaid && (
          <>
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Steps 1–3 complete — agreement signed, workspace named, and login created.</span>
            </div>
            <PaymentStep data={data} token={token!} />
          </>
        )}

        {paymentPaid && !workspaceReady && <SettingUp />}

        {workspaceReady && activeSetupUrl && (
          <WorkspaceReady setupUrl={activeSetupUrl} email={data.email} slug={activeSlug} accountPasswordSet={data.accountPasswordSet} />
        )}

        {workspaceReady && !activeSetupUrl && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Workspace Ready</h2>
            {(() => {
              const fallbackLogin = activeSlug
                ? `https://${activeSlug}.hubifyhomesonline.com/staff/login`
                : `${window.location.origin}/staff/login`;
              return (
                <>
                  <p className="text-slate-600 text-sm mb-6">
                    {data.accountPasswordSet
                      ? <>Your account is all set. <a href={fallbackLogin} className="text-teal-600 hover:underline font-medium">Log in</a> with the email and password you created.</>
                      : <>Check your email for the setup link, or{" "}<a href={fallbackLogin} className="text-teal-600 hover:underline">sign in directly</a> if you've already set your password.</>
                    }
                  </p>
                  <a href={fallbackLogin} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors">
                    Go to Your Workspace <ArrowRight className="w-4 h-4" />
                  </a>
                </>
              );
            })()}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          If you have questions please email{" "}
          <a href="mailto:contact@hubifyhomes.com" className="text-teal-600 hover:underline">
            contact@hubifyhomes.com
          </a>
        </p>
      </div>
    </div>
  );
}
