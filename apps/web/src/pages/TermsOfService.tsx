import { Link } from "react-router-dom";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                HandoverKey
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Terms of Service
        </h1>
        <div className="prose prose-blue max-w-none bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-600 mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-600 mb-4">
            By accessing and using HandoverKey, you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            2. Description of Service
          </h2>
          <p className="text-gray-600 mb-4">
            HandoverKey provides a digital legacy service that includes a "Dead Man's Switch" mechanism. We store encrypted data and release it to designated successors upon the failure of the account holder to check in within a specified timeframe.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            3. User Responsibilities
          </h2>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>You are responsible for maintaining the confidentiality of your master password. We cannot recover it for you.</li>
            <li>You are responsible for ensuring your contact information and that of your successors is up to date.</li>
            <li>You agree not to use the service for any illegal purposes.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            4. Limitation of Liability
          </h2>
          <p className="text-gray-600 mb-4">
            HandoverKey is provided "as is". We are not liable for any damages arising from the use or inability to use the service, including but not limited to data loss or failure to deliver data to successors.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            5. Termination
          </h2>
          <p className="text-gray-600 mb-4">
            We reserve the right to terminate your access to the service without cause or notice, which may result in the forfeiture and destruction of all information associated with your account.
          </p>
        </div>
      </div>
    </div>
  );
}
