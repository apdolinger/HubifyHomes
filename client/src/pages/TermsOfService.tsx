import { Card, CardContent } from "@/components/ui/card";
import { FileText, Scale, Shield, AlertTriangle, Users, Ban } from "lucide-react";

export default function TermsOfService() {
  const lastUpdated = "October 2, 2025";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-600 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center mb-4">
            <Scale className="w-8 h-8 text-white mr-3" />
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          </div>
          <p className="text-blue-100">
            Last Updated: {lastUpdated}
          </p>
          <p className="text-blue-100 mt-2">
            Please read these Terms of Service carefully before using Hubify. By accessing or using our services, you agree to be bound by these terms.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">Binding Agreement</h3>
                <p className="text-sm text-slate-600">
                  These Terms of Service constitute a legally binding agreement between you and Hubify. If you do not agree to these terms, you may not access or use our services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-3">
              By creating an account, accessing, or using the Hubify platform ("Service"), you agree to comply with and be legally bound by these Terms of Service ("Terms"), our Privacy Policy, and all applicable laws and regulations.
            </p>
            <p className="text-slate-700">
              If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              2. Eligibility & Account Registration
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">2.1 Age Requirement</h3>
                <p className="text-slate-700">
                  You must be at least 18 years of age (or the age of majority in your jurisdiction) to use our Service. By agreeing to these Terms, you represent that you meet this age requirement.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.2 Account Creation</h3>
                <p className="text-slate-700 mb-2">To use Hubify, you must:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Maintain the security of your password and account credentials</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access or security breach</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.3 Account Termination</h3>
                <p className="text-slate-700">
                  You may terminate your account at any time through your account settings. We reserve the right to suspend or terminate accounts that violate these Terms without prior notice.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Description of Service</h2>
            <p className="text-slate-700 mb-3">
              Hubify provides a cloud-based property management platform designed for home watch and HOA companies, offering features including:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>Property and client management</li>
              <li>Task organization and assignment</li>
              <li>Team collaboration tools</li>
              <li>Contact management and communication</li>
              <li>Calendar and scheduling</li>
              <li>Custom forms and submissions</li>
              <li>Reporting and analytics</li>
              <li>Invoice management</li>
            </ul>
            <p className="text-slate-700 mt-3">
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Subscription & Payment Terms</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">4.1 Subscription Plans</h3>
                <p className="text-slate-700">
                  Hubify offers various subscription plans with different features and pricing. Current pricing is available on our website and may be changed with 30 days advance notice.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4.2 Billing & Payment</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                  <li>Payments are processed securely through Stripe</li>
                  <li>You authorize us to charge your payment method for all fees owed</li>
                  <li>All fees are non-refundable unless required by law or stated otherwise</li>
                  <li>Failed payments may result in service suspension or termination</li>
                  <li>You are responsible for all taxes associated with your subscription</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4.3 Free Trial</h3>
                <p className="text-slate-700">
                  We may offer a free trial period for new accounts. At the end of the trial, your subscription will automatically convert to a paid plan unless you cancel before the trial ends.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4.4 Cancellation & Refunds</h3>
                <p className="text-slate-700">
                  You may cancel your subscription at any time. Cancellations take effect at the end of the current billing period. No refunds are provided for partial subscription periods except as required by law.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4.5 Price Changes</h3>
                <p className="text-slate-700">
                  We reserve the right to modify subscription prices with 30 days advance notice. Price changes will take effect at your next renewal date.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              5. License Grant & Restrictions
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">5.1 Limited License</h3>
                <p className="text-slate-700">
                  Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your internal business purposes.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.2 Restrictions</h3>
                <p className="text-slate-700 mb-2">You agree NOT to:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>Copy, modify, or create derivative works of the Service</li>
                  <li>Reverse engineer, decompile, or disassemble the Service</li>
                  <li>Rent, lease, sell, or sublicense access to the Service</li>
                  <li>Remove or alter any proprietary notices or labels</li>
                  <li>Use the Service to develop a competing product</li>
                  <li>Access the Service through automated means (bots, scrapers) without permission</li>
                  <li>Attempt to gain unauthorized access to any systems or networks</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Ban className="w-6 h-6 mr-2 text-red-600" />
              6. Acceptable Use Policy
            </h2>
            
            <p className="text-slate-700 mb-3">You agree to use the Service only for lawful purposes. Prohibited activities include:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>Violating any local, state, national, or international law</li>
              <li>Infringing intellectual property rights of others</li>
              <li>Transmitting harmful code (viruses, malware, trojans)</li>
              <li>Harassing, threatening, or abusing other users</li>
              <li>Spamming or sending unsolicited communications</li>
              <li>Collecting personal information without consent</li>
              <li>Interfering with or disrupting the Service or servers</li>
              <li>Using the Service for fraudulent or illegal activities</li>
              <li>Impersonating others or providing false information</li>
              <li>Accessing accounts or data without authorization</li>
            </ul>
            <p className="text-slate-700 mt-3 font-semibold">
              Violation of this policy may result in immediate termination of your account and legal action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Intellectual Property</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">7.1 Hubify Property</h3>
                <p className="text-slate-700">
                  The Service, including all software, design, text, graphics, logos, and other content, is owned by Hubify and protected by copyright, trademark, and other intellectual property laws. All rights not expressly granted are reserved.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">7.2 User Content</h3>
                <p className="text-slate-700 mb-2">
                  You retain ownership of all data, content, and materials you upload or create using the Service ("User Content"). By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to:
                </p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>Store, process, and display your User Content to provide the Service</li>
                  <li>Create backups and ensure data redundancy</li>
                  <li>Perform technical operations necessary for the Service</li>
                </ul>
                <p className="text-slate-700 mt-2">
                  This license terminates when you delete your content or account, except for backup copies retained for disaster recovery.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">7.3 Feedback</h3>
                <p className="text-slate-700">
                  Any feedback, suggestions, or ideas you provide about the Service become our property, and we may use them without compensation or attribution.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">7.4 DMCA Compliance</h3>
                <p className="text-slate-700">
                  We respect intellectual property rights. If you believe content on our platform infringes your copyright, contact us at dmca@hubify.com with:
                </p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4 mt-2">
                  <li>Identification of the copyrighted work</li>
                  <li>Identification of the infringing material</li>
                  <li>Your contact information</li>
                  <li>A statement of good faith belief</li>
                  <li>A statement of accuracy under penalty of perjury</li>
                  <li>Your physical or electronic signature</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Privacy & Data Protection</h2>
            <p className="text-slate-700">
              Our collection, use, and protection of your personal information is governed by our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>, which is incorporated into these Terms by reference. By using the Service, you consent to our privacy practices as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Service Level & Availability</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">9.1 Uptime</h3>
                <p className="text-slate-700">
                  We strive to maintain 99.9% uptime for the Service, but we do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance when possible.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">9.2 Support</h3>
                <p className="text-slate-700">
                  Technical support is provided via email during business hours. Response times vary by subscription plan and issue severity.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">9.3 Data Backup</h3>
                <p className="text-slate-700">
                  We perform regular automated backups of all customer data. However, you are responsible for maintaining independent backups of critical data.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-amber-600" />
              10. Disclaimers & Limitations of Liability
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">10.1 "AS IS" Service</h3>
                <p className="text-slate-700 font-semibold mb-2">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                </p>
                <p className="text-slate-700">
                  We disclaim all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be error-free, secure, or uninterrupted.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">10.2 Limitation of Liability</h3>
                <p className="text-slate-700 font-semibold mb-2">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, HUBIFY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION.
                </p>
                <p className="text-slate-700 mt-2">
                  Our total liability for any claims arising from these Terms or the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">10.3 Exceptions</h3>
                <p className="text-slate-700">
                  Some jurisdictions do not allow limitation of implied warranties or liability for incidental damages. In such jurisdictions, our liability is limited to the maximum extent permitted by law.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Indemnification</h2>
            <p className="text-slate-700">
              You agree to indemnify, defend, and hold harmless Hubify, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorney fees) arising from:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4 mt-2">
              <li>Your use or misuse of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your User Content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Dispute Resolution</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">12.1 Governing Law</h3>
                <p className="text-slate-700">
                  These Terms shall be governed by and construed in accordance with the laws of [Your State/Province], without regard to conflict of law principles.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">12.2 Arbitration Agreement</h3>
                <p className="text-slate-700 mb-2">
                  Any dispute arising from these Terms or the Service shall be resolved through binding arbitration rather than in court, except:
                </p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>Small claims court actions (claims under $10,000)</li>
                  <li>Intellectual property disputes</li>
                  <li>Injunctive or equitable relief requests</li>
                </ul>
                <p className="text-slate-700 mt-2">
                  Arbitration will be conducted by a neutral arbitrator in accordance with the American Arbitration Association (AAA) rules. The arbitrator's decision is final and binding.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">12.3 Class Action Waiver</h3>
                <p className="text-slate-700 font-semibold">
                  You agree that disputes will be resolved on an individual basis. You waive the right to participate in class actions, class arbitrations, or representative actions.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">12.4 Informal Resolution</h3>
                <p className="text-slate-700">
                  Before filing arbitration, you agree to first contact us at legal@hubify.com to attempt an informal resolution. We will work in good faith to resolve disputes amicably.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Modifications to Terms</h2>
            <p className="text-slate-700">
              We reserve the right to modify these Terms at any time. Material changes will be communicated via:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4 mt-2">
              <li>Email notification to your registered email address</li>
              <li>Prominent notice on the Service</li>
              <li>Updated "Last Modified" date at the top of these Terms</li>
            </ul>
            <p className="text-slate-700 mt-3">
              Your continued use of the Service after changes constitutes acceptance of the modified Terms. If you do not agree to changes, you must discontinue use and terminate your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Termination</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">14.1 Termination by You</h3>
                <p className="text-slate-700">
                  You may terminate your account at any time through account settings or by contacting support. Termination takes effect at the end of your current billing period.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">14.2 Termination by Us</h3>
                <p className="text-slate-700 mb-2">
                  We may suspend or terminate your account immediately if:
                </p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>You violate these Terms or our Acceptable Use Policy</li>
                  <li>Your payment fails or account becomes delinquent</li>
                  <li>You engage in fraudulent or illegal activity</li>
                  <li>We are required by law to terminate service</li>
                  <li>We discontinue the Service (with 30 days notice)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">14.3 Effect of Termination</h3>
                <p className="text-slate-700">
                  Upon termination:
                </p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4 mt-2">
                  <li>Your access to the Service will immediately cease</li>
                  <li>You will have 30 days to export your data</li>
                  <li>We may delete your data after the 30-day period</li>
                  <li>You remain liable for all fees incurred before termination</li>
                  <li>Provisions that by nature should survive will survive termination</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">15. General Provisions</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">15.1 Entire Agreement</h3>
                <p className="text-slate-700">
                  These Terms, together with our Privacy Policy, constitute the entire agreement between you and Hubify regarding the Service.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">15.2 Severability</h3>
                <p className="text-slate-700">
                  If any provision of these Terms is found unenforceable, the remaining provisions will remain in full effect.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">15.3 Waiver</h3>
                <p className="text-slate-700">
                  Our failure to enforce any right or provision does not constitute a waiver of that right or provision.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">15.4 Assignment</h3>
                <p className="text-slate-700">
                  You may not assign these Terms without our written consent. We may assign our rights and obligations without restriction.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">15.5 Force Majeure</h3>
                <p className="text-slate-700">
                  We are not liable for delays or failures caused by events beyond our reasonable control, including natural disasters, war, terrorism, riots, labor disputes, or Internet service provider failures.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">15.6 Export Compliance</h3>
                <p className="text-slate-700">
                  You agree to comply with all applicable export and import laws and regulations. You may not use the Service in violation of U.S. or Canadian export laws.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-blue-600" />
              16. Contact Information
            </h2>
            <div className="bg-slate-100 p-6 rounded-lg">
              <p className="text-slate-700 mb-3">
                For questions about these Terms or the Service, contact us:
              </p>
              <div className="space-y-2 text-slate-700">
                <p><strong>Hubify Legal Team</strong></p>
                <p><strong>Email:</strong> legal@hubify.com</p>
                <p><strong>Support:</strong> support@hubify.com</p>
                <p><strong>DMCA Notices:</strong> dmca@hubify.com</p>
                <p><strong>Mail:</strong> Hubify Legal Department<br />
                [Business Address]<br />
                [City, State ZIP]</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-slate-600">
            <strong>Effective Date:</strong> {lastUpdated}
          </p>
          <p className="text-sm text-slate-600 mt-2">
            These Terms of Service are compliant with applicable laws in the United States and Canada. By using Hubify, you acknowledge that you have read, understood, and agree to be bound by these Terms.
          </p>
        </div>
      </div>

      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-slate-600">
          <p>© 2025 Hubify. All rights reserved.</p>
          <p className="mt-2">
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            {' · '}
            <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
