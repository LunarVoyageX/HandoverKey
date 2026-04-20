import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldCheckIcon,
  ClockIcon,
  KeyIcon,
  UserGroupIcon,
  LockClosedIcon,
  DocumentTextIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const faqItems = [
  {
    question: "What exactly is a Dead Man's Switch?",
    answer:
      "A Dead Man's Switch is a safety mechanism that activates when you stop responding. You set a check-in interval (e.g., every 30 days). If you fail to check in within that window, HandoverKey assumes something has happened and begins the handover process to your designated successors. Simply logging in or clicking a link in a reminder email resets the timer.",
  },
  {
    question: "Can HandoverKey staff read my data?",
    answer:
      "No. HandoverKey uses zero-knowledge encryption — your data is encrypted on your device using a key derived from your master password before it ever leaves your browser. Our servers only store ciphertext. We never see your password or your decrypted data, and we have no way to recover it. If you lose your master password, your data is unrecoverable.",
  },
  {
    question: "What happens if I forget to check in?",
    answer:
      "First, we'll send you multiple reminders via email as your timer approaches expiration. If you still don't check in, HandoverKey enters a Warning Phase (a grace period, typically 48 hours) where we attempt to reach you more aggressively. Only after this grace period passes without any response does the handover to your successors actually begin. You can cancel the handover at any time during the grace period by simply logging in.",
  },
  {
    question: "What is Shamir's Secret Sharing and why does it matter?",
    answer:
      "Shamir's Secret Sharing is a cryptographic technique that splits your encryption key into multiple shares distributed among your successors. You can configure it so that a minimum number of successors (e.g., 3 out of 5) must combine their shares to reconstruct the key. This means no single successor can access your data alone — they must cooperate, preventing premature or unauthorized access.",
  },
  {
    question: "Can I give different secrets to different successors?",
    answer:
      "Yes. You can assign specific vault entries to specific successors. For example, your spouse might receive financial credentials while a business partner receives company-related secrets. You can also restrict successors to only see the entries explicitly assigned to them.",
  },
  {
    question: "Do my successors need a HandoverKey account?",
    answer:
      "No. Successors are identified by their email address and verified through a one-time email link. When a handover triggers, they receive their key share and a secure access link. They combine the required shares in their browser to decrypt the data — no account, no installation, everything happens in the browser.",
  },
  {
    question: "What can I store in my vault?",
    answer:
      "You can store passwords, API keys, cryptocurrency seed phrases, personal notes, legal documents, and files. Everything is organized by category and tags, and you can search, export, and import your vault data at any time. All data is encrypted client-side before storage.",
  },
  {
    question: "What happens if HandoverKey shuts down?",
    answer:
      "HandoverKey is open source, so you can always self-host it. Additionally, the Export feature lets you download your entire encrypted vault as a JSON file at any time. Your encryption keys and data are never locked into our platform. We recommend keeping regular exports as a backup.",
  },
  {
    question: "Can I pause the Dead Man's Switch temporarily?",
    answer:
      "Yes. If you're going on vacation or know you'll be unavailable, you can pause your inactivity monitoring from your Settings page. While paused, missing a check-in won't trigger any handover process. You can resume monitoring whenever you're ready.",
  },
  {
    question:
      "How is this different from just sharing my passwords with someone?",
    answer:
      "Sharing passwords directly means someone else has access to your accounts right now, which is a security risk. HandoverKey ensures your successors only gain access after the Dead Man's Switch triggers — not before. Combined with Shamir's Secret Sharing, even the successors can't access your data prematurely since no individual holds enough key material alone.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-x-2">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Handover<span className="text-blue-600">Key</span>
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
                className="btn btn-primary text-lg px-8 py-3"
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

      {/* FAQ Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about securing your digital legacy
              with HandoverKey.
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600">
              Still have questions?{" "}
              <Link
                to="/contact"
                className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
              >
                Get in touch
              </Link>{" "}
              or read our detailed{" "}
              <Link
                to="/how-it-works"
                className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
              >
                How it Works
              </Link>{" "}
              guide.
            </p>
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
            className="btn btn-primary text-lg px-8 py-4 font-bold"
          >
            Create Free Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0 gap-x-2">
            <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
            <span className="text-gray-500 font-medium tracking-tight">
              Handover<span className="text-gray-400">Key</span> &copy;{" "}
              {new Date().getFullYear()}
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

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg font-semibold text-gray-900 pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDownIcon className="w-5 h-5 text-gray-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 text-gray-600 leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
