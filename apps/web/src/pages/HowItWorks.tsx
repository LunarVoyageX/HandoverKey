import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheckIcon,
  UserPlusIcon,
  ClockIcon,
  BellAlertIcon,
  KeyIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
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

      <div className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-gray-900 mb-4"
            >
              How HandoverKey Works
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600"
            >
              A simple, secure, and automated process to ensure your digital
              legacy reaches the right people when the time comes.
            </motion.p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2" />

            <div className="space-y-12 md:space-y-24">
              <Step
                number={1}
                title="Create Your Secure Vault"
                description="Sign up and store your critical information—passwords, documents, crypto keys, and personal notes. Everything is encrypted client-side with your master password. We never see your raw data."
                icon={<ShieldCheckIcon className="w-8 h-8 text-white" />}
                align="left"
              />
              <Step
                number={2}
                title="Designate Successors"
                description="Choose who should receive access to your vault. You can assign different items to different people (e.g., financial info to your spouse, technical info to a colleague)."
                icon={<UserPlusIcon className="w-8 h-8 text-white" />}
                align="right"
              />
              <Step
                number={3}
                title="Set the Dead Man's Switch"
                description="Configure your inactivity timer (e.g., 30 days). This is the maximum amount of time you can go without checking in before the handover process begins."
                icon={<ClockIcon className="w-8 h-8 text-white" />}
                align="left"
              />
              <Step
                number={4}
                title="Regular Check-ins"
                description="We'll send you reminders via email or SMS before your timer expires. Simply logging in or clicking a link in the email resets the timer, confirming you are safe."
                icon={<ArrowPathIcon className="w-8 h-8 text-white" />}
                align="right"
              />
              <Step
                number={5}
                title="Warning Phase"
                description="If you miss a check-in, we enter a 'Warning Phase'. We will try to contact you aggressively for a grace period (e.g., 48 hours) to prevent false alarms."
                icon={<BellAlertIcon className="w-8 h-8 text-white" />}
                align="left"
              />
              <Step
                number={6}
                title="Secure Handover"
                description="If the grace period passes without a response, the system decrypts the access keys (using Shamir's Secret Sharing if configured) and securely sends the relevant information to your designated successors."
                icon={<KeyIcon className="w-8 h-8 text-white" />}
                align="right"
              />
            </div>
          </div>

          <div className="mt-24 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Start protecting your legacy today
            </h2>
            <Link
              to="/register"
              className="btn btn-primary text-lg px-8 py-3 shadow-lg hover:shadow-xl"
            >
              Create Free Account
            </Link>
          </div>
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

function Step({
  number,
  title,
  description,
  icon,
  align,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  align: "left" | "right";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className={`relative flex items-center ${
        align === "right" ? "md:flex-row-reverse" : ""
      }`}
    >
      {/* Content */}
      <div className="flex-1 md:w-1/2 p-6">
        <div
          className={`bg-white p-8 rounded-2xl shadow-apple border border-gray-100 ${
            align === "right" ? "md:text-right" : ""
          }`}
        >
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-bold text-xl mb-4 md:hidden`}
          >
            {number}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
          <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Center Icon (Desktop) */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-16 h-16 bg-blue-600 rounded-full border-4 border-white shadow-lg items-center justify-center z-10">
        {icon}
      </div>

      {/* Spacer for the other side */}
      <div className="hidden md:block flex-1 md:w-1/2" />
    </motion.div>
  );
}
