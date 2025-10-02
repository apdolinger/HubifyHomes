import { Card, CardContent } from "@/components/ui/card";
import { Shield, Mail, Lock, Users, FileText, AlertCircle } from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdated = "October 2, 2025";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-600 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center mb-4">
            <Shield className="w-8 h-8 text-white mr-3" />
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          </div>
          <p className="text-blue-100">
            Last Updated: {lastUpdated}
          </p>
          <p className="text-blue-100 mt-2">
            This Privacy Policy describes how Hubify collects, uses, and protects your personal information in compliance with US and Canadian privacy laws.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start mb-4">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">Your Privacy Rights</h3>
                <p className="text-sm text-slate-600">
                  Depending on your location, you have specific rights under CCPA/CPRA (California), GDPR (European Union), and PIPEDA (Canada). These include rights to access, delete, correct, and opt-out of certain data uses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-blue-600" />
              1. Information We Collect
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1.1 Personal Information You Provide</h3>
                <p className="text-slate-700 mb-2">We collect information you provide directly:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li><strong>Account Information:</strong> Name, email address, phone number, company name, business address</li>
                  <li><strong>Payment Information:</strong> Credit card details, billing address (processed securely through Stripe)</li>
                  <li><strong>Profile Data:</strong> Job title, preferences, profile photo</li>
                  <li><strong>Communications:</strong> Messages, support requests, feedback you send to us</li>
                  <li><strong>Property & Client Data:</strong> Information about properties, clients, tasks, and contacts you manage in the platform</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">1.2 Information Collected Automatically</h3>
                <p className="text-slate-700 mb-2">When you use our services, we automatically collect:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li><strong>Usage Data:</strong> Pages viewed, features used, time spent, click patterns</li>
                  <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                  <li><strong>Location Data:</strong> General geographic location based on IP address</li>
                  <li><strong>Cookies & Tracking:</strong> Session cookies, analytics cookies, preference cookies</li>
                  <li><strong>Log Data:</strong> Access times, error logs, performance metrics</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">1.3 Information from Third Parties</h3>
                <p className="text-slate-700 mb-2">We may receive information from:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>Authentication providers (Replit Auth, Google)</li>
                  <li>Payment processors (Stripe)</li>
                  <li>Analytics providers (usage statistics, not personally identifiable)</li>
                  <li>Data enrichment services for business contact verification</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Lock className="w-6 h-6 mr-2 text-blue-600" />
              2. How We Use Your Information
            </h2>
            
            <p className="text-slate-700 mb-3">We use collected information for specific business and commercial purposes:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li><strong>Service Delivery:</strong> Provide, maintain, and improve our property management platform</li>
              <li><strong>Account Management:</strong> Create and manage your account, authenticate users, process subscriptions</li>
              <li><strong>Payment Processing:</strong> Process payments, prevent fraud, issue invoices</li>
              <li><strong>Customer Support:</strong> Respond to inquiries, troubleshoot issues, provide technical assistance</li>
              <li><strong>Communication:</strong> Send service updates, security alerts, administrative messages</li>
              <li><strong>Marketing:</strong> Send promotional emails (with opt-out option), product announcements, newsletters</li>
              <li><strong>Analytics & Improvement:</strong> Analyze usage patterns, conduct research, develop new features</li>
              <li><strong>Security:</strong> Detect fraud, prevent abuse, enforce terms of service, comply with legal obligations</li>
              <li><strong>Legal Compliance:</strong> Meet regulatory requirements, respond to legal requests, protect rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              3. How We Share Your Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">3.1 Service Providers & Vendors</h3>
                <p className="text-slate-700 mb-2">We share data with trusted third parties who assist our operations:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li><strong>Cloud Hosting:</strong> Replit, Google Cloud Platform (data storage and infrastructure)</li>
                  <li><strong>Payment Processing:</strong> Stripe (credit card processing, subscription billing)</li>
                  <li><strong>Email Services:</strong> SendGrid (transactional and marketing emails)</li>
                  <li><strong>Authentication:</strong> Replit Auth, Google OAuth (identity verification)</li>
                  <li><strong>Analytics:</strong> Aggregated usage analytics (no personally identifiable information shared)</li>
                  <li><strong>Object Storage:</strong> Google Cloud Storage (file uploads, documents, images)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.2 Business Transfers</h3>
                <p className="text-slate-700">
                  In the event of a merger, acquisition, reorganization, or sale of assets, your information may be transferred to the acquiring entity. You will be notified of any such change.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.3 Legal Requirements</h3>
                <p className="text-slate-700">
                  We may disclose information when required by law, legal process, or to protect rights, safety, and security. This includes compliance with subpoenas, court orders, and law enforcement requests.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.4 With Your Consent</h3>
                <p className="text-slate-700">
                  We may share information for purposes not described in this policy with your explicit consent.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.5 No Selling of Personal Data</h3>
                <p className="text-slate-700 font-semibold">
                  We do not sell your personal information to third parties for monetary consideration.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Data Retention</h2>
            <p className="text-slate-700 mb-3">We retain personal information for specific periods:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li><strong>Active Accounts:</strong> Data retained while your account is active and for 3 years after account closure for legal compliance</li>
              <li><strong>Payment Records:</strong> 7 years for tax and accounting purposes</li>
              <li><strong>Support Communications:</strong> 3 years after resolution</li>
              <li><strong>Security Logs:</strong> 1 year for audit and fraud prevention</li>
              <li><strong>Marketing Data:</strong> Until opt-out or 2 years of inactivity</li>
              <li><strong>Legal Hold:</strong> Indefinitely if subject to legal proceedings</li>
            </ul>
            <p className="text-slate-700 mt-3">
              You may request earlier deletion of your data subject to legal and contractual obligations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Your Privacy Rights</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">5.1 Rights Under CCPA/CPRA (California Residents)</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li><strong>Right to Know:</strong> Request disclosure of personal information collected, sources, purposes, and third-party recipients</li>
                  <li><strong>Right to Delete:</strong> Request deletion of your personal information (subject to exceptions)</li>
                  <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information</li>
                  <li><strong>Right to Opt-Out:</strong> Opt-out of sale/sharing of personal information (we don't sell data)</li>
                  <li><strong>Right to Limit:</strong> Limit use and disclosure of sensitive personal information</li>
                  <li><strong>Right to Non-Discrimination:</strong> Equal service and pricing regardless of privacy rights exercise</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.2 Rights Under GDPR (EU Residents)</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li><strong>Right to Access:</strong> Obtain confirmation and copy of personal data</li>
                  <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                  <li><strong>Right to Erasure:</strong> Request deletion ("right to be forgotten")</li>
                  <li><strong>Right to Restrict Processing:</strong> Limit how we process your data</li>
                  <li><strong>Right to Data Portability:</strong> Receive data in structured, machine-readable format</li>
                  <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
                  <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
                  <li><strong>Right to Lodge Complaint:</strong> File complaint with supervisory authority</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.3 Rights Under PIPEDA (Canadian Residents)</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li><strong>Right to Access:</strong> Request access to your personal information</li>
                  <li><strong>Right to Correction:</strong> Challenge accuracy and request corrections</li>
                  <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for non-essential processing</li>
                  <li><strong>Right to File Complaint:</strong> Complain to Privacy Commissioner of Canada</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.4 How to Exercise Your Rights</h3>
                <p className="text-slate-700 mb-2">Submit requests via:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li><strong>Email:</strong> privacy@hubify.com</li>
                  <li><strong>Web Form:</strong> Available in your account settings</li>
                  <li><strong>Mail:</strong> Hubify Privacy Officer, [Business Address]</li>
                </ul>
                <p className="text-slate-700 mt-2">
                  We will respond within 45 days (CCPA), 30 days (GDPR), or as required by applicable law.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data Security</h2>
            <p className="text-slate-700 mb-3">We implement industry-standard security measures:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li><strong>Encryption:</strong> TLS/SSL encryption for data in transit; AES-256 encryption for data at rest</li>
              <li><strong>Access Controls:</strong> Role-based access, multi-factor authentication for admin accounts</li>
              <li><strong>Security Monitoring:</strong> 24/7 monitoring, intrusion detection, regular security audits</li>
              <li><strong>Employee Training:</strong> Regular security and privacy training for all staff</li>
              <li><strong>Vendor Security:</strong> All third-party vendors undergo security assessments</li>
              <li><strong>Incident Response:</strong> Documented breach notification procedures compliant with applicable laws</li>
            </ul>
            <p className="text-slate-700 mt-3">
              While we take reasonable precautions, no system is completely secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Cookies & Tracking Technologies</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2">7.1 Types of Cookies We Use</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li><strong>Essential Cookies:</strong> Required for authentication, security, and core functionality</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                  <li><strong>Analytics Cookies:</strong> Understand usage patterns (aggregated data only)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">7.2 Your Cookie Choices</h3>
                <p className="text-slate-700">
                  You can control cookies through your browser settings. Disabling essential cookies may affect platform functionality. We do not use cookies for advertising or cross-site tracking.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. International Data Transfers</h2>
            <p className="text-slate-700">
              Your information may be transferred to and processed in the United States or other countries where our service providers operate. We ensure adequate protection through:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4 mt-2">
              <li>Standard Contractual Clauses (SCCs) for EU data transfers</li>
              <li>Adequacy decisions recognized by applicable privacy regulators</li>
              <li>Compliance with cross-border data transfer requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
            <p className="text-slate-700">
              Our services are not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If we become aware of such collection, we will delete the information promptly. Parents or guardians who believe we have collected information from a child should contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-slate-700">
              We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or other factors. Material changes will be communicated via:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4 mt-2">
              <li>Email notification to registered users</li>
              <li>Prominent notice on our platform</li>
              <li>Updated "Last Modified" date at the top of this policy</li>
            </ul>
            <p className="text-slate-700 mt-2">
              Your continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Mail className="w-6 h-6 mr-2 text-blue-600" />
              11. Contact Us
            </h2>
            <div className="bg-slate-100 p-6 rounded-lg">
              <p className="text-slate-700 mb-3">
                For privacy-related questions, concerns, or to exercise your rights:
              </p>
              <div className="space-y-2 text-slate-700">
                <p><strong>Privacy Officer:</strong> Hubify Privacy Team</p>
                <p><strong>Email:</strong> privacy@hubify.com</p>
                <p><strong>Mail:</strong> Hubify Privacy Officer<br />
                [Business Address]<br />
                [City, State ZIP]</p>
                <p><strong>Response Time:</strong> We respond to privacy requests within 30-45 days</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Regulatory Contacts</h2>
            <div className="space-y-3 text-slate-700">
              <div>
                <p className="font-semibold">California Privacy Protection Agency (CPPA)</p>
                <p className="text-sm">Website: https://cppa.ca.gov/</p>
              </div>
              <div>
                <p className="font-semibold">Privacy Commissioner of Canada</p>
                <p className="text-sm">Website: https://www.priv.gc.ca/</p>
              </div>
              <div>
                <p className="font-semibold">EU Data Protection Authorities</p>
                <p className="text-sm">Website: https://edpb.europa.eu/</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-slate-600">
            <strong>Effective Date:</strong> {lastUpdated}
          </p>
          <p className="text-sm text-slate-600 mt-2">
            This Privacy Policy is compliant with CCPA/CPRA (California), GDPR (European Union), PIPEDA (Canada), and other applicable data protection regulations.
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
