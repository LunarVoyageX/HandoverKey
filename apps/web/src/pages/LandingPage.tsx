import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheckIcon,
  ClockIcon,
  KeyIcon,
  UserGroupIcon,
  LockClosedIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                HandoverKey
              </span>
            </div>
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

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-6xl font-bold text-gray-900 tracking-tight mb-6"
            >
              Secure your digital legacy with a{" "}
              <span className="text-blue-600">Dead Man's Switch</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-600 mb-10 leading-relaxed"
            >
              Ensure your critical data, passwords, and documents are securely
              transferred to your trusted successors if something happens to
              you. Zero-knowledge encryption guarantees only you and your
              successors have access.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link
                to="/register"
                className="btn btn-primary text-lg px-8 py-3 shadow-apple-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                Start Your Legacy Plan
              </Link>
              <Link
                to="/how-it-works"
                className="btn btn-secondary text-lg px-8 py-3"
              >
                How it Works
              </Link>
            </motion.div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why choose HandoverKey?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We combine military-grade security with an intuitive interface to
              make legacy planning simple and safe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ClockIcon className="w-8 h-8 text-blue-600" />}
              title="Dead Man's Switch"
              description="Set a check-in interval. If you fail to verify your safety, your pre-configured handover process begins automatically."
            />
            <FeatureCard
              icon={<LockClosedIcon className="w-8 h-8 text-blue-600" />}
              title="Zero-Knowledge Encryption"
              description="Your data is encrypted on your device before it reaches our servers. We cannot read your data, even if we wanted to."
            />
            <FeatureCard
              icon={<UserGroupIcon className="w-8 h-8 text-blue-600" />}
              title="Trusted Successors"
              description="Designate specific people to receive specific parts of your vault. They only get access when the switch triggers."
            />
            <FeatureCard
              icon={<KeyIcon className="w-8 h-8 text-blue-600" />}
              title="Shamir's Secret Sharing"
              description="Split your encryption keys among multiple successors so no single person can access your data prematurely."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-8 h-8 text-blue-600" />}
              title="Audit Trails"
              description="Every action is logged. You get notified of any access attempts, ensuring complete transparency and security."
            />
            <FeatureCard
              icon={<DocumentTextIcon className="w-8 h-8 text-blue-600" />}
              title="Secure Vault"
              description="Store passwords, documents, crypto keys, and personal notes in your encrypted digital vault."
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to secure your digital future?
          </h2>
          <p className="text-gray-400 mb-10 max-w-2xl mx-auto text-lg">
            Join thousands of users who trust HandoverKey to protect their
            legacy. It takes less than 2 minutes to set up.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-lg text-blue-600 bg-white hover:bg-gray-50 transition-all transform hover:-translate-y-1"
          >
            Create Free Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
            <span className="ml-2 text-gray-500 font-medium">
              HandoverKey &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex space-x-6">
            <Link to="/privacy" className="text-gray-400 hover:text-gray-600">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-gray-400 hover:text-gray-600">
              Terms of Service
            </Link>
            <Link to="/contact" className="text-gray-400 hover:text-gray-600">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-apple transition-all"
    >
      <div className="bg-white w-14 h-14 rounded-xl flex items-center justify-center shadow-sm mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
  );
}
