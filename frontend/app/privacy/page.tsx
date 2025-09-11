import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - TravelCheck',
  description: 'TravelCheck privacy policy - How we collect, use, and protect your data',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Welcome to TravelCheck (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your personal information 
              and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our travel history tracking application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-700 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Account information (name, email address)</li>
              <li>Travel documents you upload (passports, visas, boarding passes)</li>
              <li>Travel history and booking information</li>
              <li>Contact preferences and communication history</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">2.2 Information from Third-Party Services</h3>
            <p className="text-gray-600 mb-4">
              When you connect your email accounts (Gmail or Office 365), we access:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Travel-related emails (flight bookings, hotel reservations)</li>
              <li>Email metadata necessary to identify travel information</li>
              <li>Labels and folders (only to organize travel-related content)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">2.3 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Usage data and analytics</li>
              <li>Device information and browser type</li>
              <li>IP address and general location data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Provide and maintain our travel tracking services</li>
              <li>Process and organize your travel history</li>
              <li>Generate travel reports and analytics</li>
              <li>Send service-related notifications</li>
              <li>Improve our services and develop new features</li>
              <li>Comply with legal obligations</li>
              <li>Protect against fraudulent or illegal activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal information by employees</li>
              <li>Secure cloud infrastructure (Google Firebase)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 mb-4">
              We do not sell, trade, or rent your personal information. We may share your information only in the following situations:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations or court orders</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>With service providers who assist in operating our application (under strict confidentiality agreements)</li>
              <li>In connection with a merger, acquisition, or sale of assets (with notice to users)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Access and download your personal information</li>
              <li>Correct or update your information</li>
              <li>Delete your account and associated data</li>
              <li>Disconnect third-party integrations at any time</li>
              <li>Opt-out of non-essential communications</li>
              <li>Request data portability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your information for as long as your account is active or as needed to provide services. 
              You may delete your account at any time, and we will remove your personal information within 30 days, 
              except where retention is required for legal compliance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">
              Our application integrates with third-party services (Google, Microsoft) to provide email synchronization. 
              These services have their own privacy policies, and we encourage you to review them:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li><a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
              <li><a href="https://privacy.microsoft.com/privacystatement" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Microsoft Privacy Statement</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-gray-600 mb-4">
              Our services are not intended for individuals under the age of 18. We do not knowingly collect 
              personal information from children under 18. If you become aware that a child has provided us with 
              personal information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. International Data Transfers</h2>
            <p className="text-gray-600 mb-4">
              Your information may be transferred to and processed in countries other than your own. We ensure 
              appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">12. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-gray-600">
                Email: privacy@travelcheck.xyz<br />
                Website: https://travelcheck.xyz
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
