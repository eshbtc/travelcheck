import Link from 'next/link'

export function FooterLinks() {
  return (
    <footer className="mt-auto border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} TravelCheck. All rights reserved.
            </p>
          </div>
          <nav className="flex gap-6">
            <Link 
              href="/privacy" 
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </Link>
            <a 
              href="mailto:support@travelcheck.xyz" 
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
