import React from "react";

const Spinner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`animate-spin rounded-full h-8 w-8 border-4 border-blue-400 border-t-transparent ${className}`}
    role="status"
    aria-label="Loading"
  />
);

export default Spinner;
