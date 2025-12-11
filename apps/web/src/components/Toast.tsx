import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={clsx(
        "flex items-center w-full max-w-sm p-4 mb-4 text-gray-500 bg-white rounded-lg shadow-lg dark:text-gray-400 dark:bg-gray-800 border-l-4",
        {
          "border-green-500": type === "success",
          "border-red-500": type === "error",
          "border-blue-500": type === "info",
        },
      )}
      role="alert"
    >
      <div
        className={clsx(
          "inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg",
          {
            "text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200":
              type === "success",
            "text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200":
              type === "error",
            "text-blue-500 bg-blue-100 dark:bg-blue-800 dark:text-blue-200":
              type === "info",
          },
        )}
      >
        {type === "success" && <CheckCircleIcon className="w-5 h-5" />}
        {type === "error" && <XCircleIcon className="w-5 h-5" />}
        {type === "info" && <InformationCircleIcon className="w-5 h-5" />}
      </div>
      <div className="ml-3 text-sm font-normal">{message}</div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
        onClick={() => onClose(id)}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <XMarkIcon className="w-5 h-5" />
      </button>
    </motion.div>
  );
};

export default Toast;
