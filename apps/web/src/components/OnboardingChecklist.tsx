import React from "react";
import { Link } from "react-router-dom";
import {
  CheckCircleIcon,
  LockClosedIcon,
  UserGroupIcon,
  KeyIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

export interface SetupStatus {
  hasSecrets: boolean;
  hasSuccessors: boolean;
  hasKeyShares: boolean;
  hasInactivityConfig: boolean;
}

interface OnboardingChecklistProps {
  status: SetupStatus;
  onDismiss: () => void;
}

const steps = [
  {
    key: "hasSecrets" as const,
    title: "Add your first secret",
    description: "Store a password, document, or note in your encrypted vault.",
    href: "/vault",
    cta: "Go to Vault",
    icon: LockClosedIcon,
  },
  {
    key: "hasSuccessors" as const,
    title: "Designate a successor",
    description:
      "Add at least one trusted person who will receive your vault data.",
    href: "/successors",
    cta: "Add Successor",
    icon: UserGroupIcon,
  },
  {
    key: "hasKeyShares" as const,
    title: "Generate key shares",
    description:
      "Split your encryption key among successors using Shamir's Secret Sharing.",
    href: "/successors",
    cta: "Generate Shares",
    icon: KeyIcon,
  },
  {
    key: "hasInactivityConfig" as const,
    title: "Configure your Dead Man's Switch",
    description:
      "Set your check-in interval and grace period in inactivity settings.",
    href: "/settings",
    cta: "Open Settings",
    icon: ClockIcon,
  },
];

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  status,
  onDismiss,
}) => {
  const completedCount = steps.filter((step) => status[step.key]).length;
  const allComplete = completedCount === steps.length;

  if (allComplete) {
    return null;
  }

  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Set up your legacy plan
          </h3>
          <p className="text-blue-100 text-sm mt-1">
            Complete these steps to fully protect your digital legacy.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-blue-200 hover:text-white transition-colors p-1 -mr-1 -mt-1"
          aria-label="Dismiss checklist"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">
            {completedCount} of {steps.length} complete
          </span>
          <span className="text-gray-500">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-gray-100 px-6">
        {steps.map((step) => {
          const done = status[step.key];
          return (
            <li key={step.key} className="flex items-start gap-4 py-4">
              <div className="mt-0.5 flex-shrink-0">
                {done ? (
                  <CheckCircleSolidIcon className="w-6 h-6 text-green-500" />
                ) : (
                  <CheckCircleIcon className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${done ? "text-gray-400 line-through" : "text-gray-900"}`}
                >
                  {step.title}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {step.description}
                </p>
              </div>
              {!done && (
                <Link
                  to={step.href}
                  className="flex-shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap"
                >
                  {step.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default OnboardingChecklist;
