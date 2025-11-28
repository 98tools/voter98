import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  const lastUpdated = 'November 28, 2025';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              Back to Login
            </Link>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Last Updated: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Welcome to {import.meta.env.VITE_APP_TITLE || 'Voter98'}. We are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our voting platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">1. Personal Information</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We collect personal information that you voluntarily provide to us when you:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Register for an account (name, email address, password)</li>
              <li>Participate in polls as a registered user or external participant</li>
              <li>Create or manage polls (name, email, organizational information)</li>
              <li>Contact us for support or inquiries</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">2. Voting Data</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Poll responses and voting choices</li>
              <li>Vote timestamps</li>
              <li>Participant status and voting history</li>
              <li>Vote weights (if applicable)</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">3. Technical Information</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>IP addresses (for security and audit purposes)</li>
              <li>Browser type and version</li>
              <li>Device information and operating system</li>
              <li>User agent strings</li>
              <li>Access tokens and authentication credentials (encrypted)</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">4. Audit and Security Logs</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Token access events (when voting tokens are viewed)</li>
              <li>Token revocation events</li>
              <li>Email sending records</li>
              <li>Administrative actions and changes</li>
              <li>User login and authentication events</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Poll Administration:</strong> To create, manage, and administer polls and voting processes</li>
              <li><strong>Authentication:</strong> To verify user identity and manage access to the platform</li>
              <li><strong>Security:</strong> To detect and prevent fraudulent activities, unauthorized access, and security incidents</li>
              <li><strong>Audit Trail:</strong> To maintain comprehensive audit logs for transparency and accountability</li>
              <li><strong>Communication:</strong> To send voting invitations, reminders, and poll-related notifications</li>
              <li><strong>Analytics:</strong> To analyze voting patterns and improve our platform (anonymized when possible)</li>
              <li><strong>Compliance:</strong> To comply with legal obligations and enforce our terms of service</li>
            </ul>
          </section>

          {/* Voting Token Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Voting Token Security</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Our platform uses unique voting tokens for external participants:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Tokens are randomly generated and unique to each participant</li>
              <li>Token access is logged for security auditing purposes</li>
              <li>Tokens can be revoked and regenerated by poll administrators</li>
              <li>We track when tokens are viewed to detect potential security issues</li>
              <li>Tokens are transmitted securely via encrypted email or secure links</li>
            </ul>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Token viewing events are recorded for security purposes. This helps poll administrators 
                identify potential unauthorized access or token sharing.
              </p>
            </div>
          </section>

          {/* Data Sharing and Disclosure */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Poll Administrators:</strong> Poll creators and managers can view participant information and voting results for their polls</li>
              <li><strong>Auditors:</strong> Designated auditors can access audit logs and security events for polls they are assigned to</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate the platform (email delivery, hosting, etc.)</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, or acquisition</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Active Polls:</strong> Data retained while polls are active or scheduled</li>
              <li><strong>Completed Polls:</strong> Poll results and audit logs retained according to organizational requirements</li>
              <li><strong>User Accounts:</strong> Account data retained until account deletion is requested</li>
              <li><strong>Audit Logs:</strong> Security and audit logs may be retained for extended periods for compliance purposes</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights and Choices</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
              <li><strong>Objection:</strong> Object to certain processing of your information</li>
              <li><strong>Portability:</strong> Request a copy of your information in a portable format</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for processing where consent is the legal basis</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To exercise these rights, please contact your poll administrator or system administrator.
            </p>
          </section>

          {/* Email Communications */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Email Communications</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We may send you emails related to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Voting invitations with access tokens</li>
              <li>Poll reminders and notifications</li>
              <li>Account verification and password resets</li>
              <li>Important security or policy updates</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Poll-related emails are essential for participation and cannot be opted out of while you are a poll participant.
            </p>
          </section>

          {/* Security Measures */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Security Measures</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We implement appropriate technical and organizational security measures to protect your information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure password hashing using industry-standard algorithms</li>
              <li>JWT-based authentication with token expiration</li>
              <li>Role-based access control (RBAC) for administrators</li>
              <li>Comprehensive audit logging for security monitoring</li>
              <li>Regular security assessments and updates</li>
              <li>IP address logging for fraud detection and prevention</li>
            </ul>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies and Tracking</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We use essential cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Maintain your authentication session</li>
              <li>Remember your preferences</li>
              <li>Ensure platform functionality</li>
              <li>Monitor platform performance</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              These cookies are necessary for the platform to function properly. By using our service, you consent to our use of these essential cookies.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Our platform may integrate with third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Email Service Providers:</strong> For sending voting invitations and notifications</li>
              <li><strong>Cloud Hosting:</strong> For application hosting and data storage</li>
              <li><strong>Authentication Services:</strong> For secure user authentication</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              These third parties are contractually bound to protect your information and use it only for the purposes we specify.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our service is not intended for individuals under the age of 13. We do not knowingly collect personal information 
              from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          {/* International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. 
              We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy 
              and applicable data protection laws.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, 
              operational, or regulatory reasons. We will notify you of any material changes by posting the new Privacy Policy 
              on this page and updating the "Last Updated" date. Your continued use of the platform after such changes 
              constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-gray-900 font-medium mb-2">{import.meta.env.VITE_APP_TITLE || 'organization_name'}</p>
              <p className="text-gray-700">Email: {import.meta.env.VITE_ORGANIZATION_EMAIL || 'organization_email'}</p>
              <p className="text-gray-700 mt-4">
                For poll-specific inquiries, please contact the poll administrator or your organization's designated contact.
              </p>
            </div>
          </section>

          {/* Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Legal Compliance</h2>
            <p className="text-gray-700 leading-relaxed">
              This Privacy Policy is designed to comply with applicable data protection laws, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Personal Data Protection Law in Turkiye (KVKK)</li>
              <li>General Data Protection Regulation (GDPR)</li>
              <li>California Consumer Privacy Act (CCPA)</li>
              <li>Other applicable regional and national privacy laws</li>
            </ul>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
