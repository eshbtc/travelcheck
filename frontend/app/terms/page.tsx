import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - TravelCheck',
  description: 'TravelCheck terms of service - Terms and conditions for using our travel tracking application',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using TravelCheck (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). 
              If you disagree with any part of these terms, you do not have permission to access the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              TravelCheck is a travel history tracking application that helps users:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Track and organize travel history</li>
              <li>Import travel information from email accounts</li>
              <li>Generate travel reports and analytics</li>
              <li>Manage travel documents and visa requirements</li>
              <li>Calculate days spent in different countries</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-semibold text-gray-700 mb-3">3.1 Account Creation</h3>
            <p className="text-gray-600 mb-4">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information</li>
              <li>Keep your password secure and confidential</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">3.2 Account Termination</h3>
            <p className="text-gray-600 mb-4">
              You may delete your account at any time. We reserve the right to suspend or terminate accounts that 
              violate these Terms or engage in fraudulent or illegal activities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Upload viruses or malicious code</li>
              <li>Collect or harvest user information without permission</li>
              <li>Use the Service to send spam or unsolicited messages</li>
              <li>Impersonate another person or entity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Intellectual Property Rights</h2>
            
            <h3 className="text-xl font-semibold text-gray-700 mb-3">5.1 Our Rights</h3>
            <p className="text-gray-600 mb-4">
              The Service and its original content, features, and functionality are owned by TravelCheck and are 
              protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">5.2 Your Rights</h3>
            <p className="text-gray-600 mb-4">
              You retain ownership of any content you upload to the Service. By uploading content, you grant us a 
              worldwide, non-exclusive, royalty-free license to use, store, and process your content solely to 
              provide the Service to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">
              Our Service integrates with third-party services (such as Gmail and Office 365). Your use of these 
              integrations is subject to the terms and privacy policies of those services. We are not responsible 
              for the practices of third-party services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Privacy and Data Protection</h2>
            <p className="text-gray-600 mb-4">
              Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to 
              the collection and use of information as detailed in our Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Disclaimers and Limitations</h2>
            
            <h3 className="text-xl font-semibold text-gray-700 mb-3">8.1 Service Availability</h3>
            <p className="text-gray-600 mb-4">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. We do not guarantee 
              that the Service will be uninterrupted, secure, or error-free.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">8.2 Travel Information Accuracy</h3>
            <p className="text-gray-600 mb-4">
              While we strive to provide accurate travel tracking and analysis, we are not responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Inaccuracies in imported email data</li>
              <li>Changes in visa or immigration requirements</li>
              <li>Decisions made based on Service-generated reports</li>
              <li>Compliance with specific country immigration laws</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Users should verify all travel information with official sources and relevant authorities.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">8.3 Limitation of Liability</h3>
            <p className="text-gray-600 mb-4">
              To the maximum extent permitted by law, TravelCheck shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages resulting from your use or inability to use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Indemnification</h2>
            <p className="text-gray-600 mb-4">
              You agree to indemnify and hold harmless TravelCheck, its affiliates, and their respective officers, 
              directors, employees, and agents from any claims, damages, or expenses arising from your use of the 
              Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Modifications to Service and Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify or discontinue the Service at any time without notice. We may also 
              revise these Terms at our discretion. Continued use of the Service after changes constitutes 
              acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Governing Law and Dispute Resolution</h2>
            <p className="text-gray-600 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the United States, 
              without regard to its conflict of law provisions. Any disputes shall be resolved through binding 
              arbitration in accordance with the rules of the American Arbitration Association.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">12. Severability</h2>
            <p className="text-gray-600 mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be 
              limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in 
              full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">13. Contact Information</h2>
            <p className="text-gray-600 mb-4">
              For questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-gray-600">
                Email: legal@travelcheck.xyz<br />
                Website: https://travelcheck.xyz
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">14. Entire Agreement</h2>
            <p className="text-gray-600 mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and 
              TravelCheck regarding the use of the Service and supersede any prior agreements.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
