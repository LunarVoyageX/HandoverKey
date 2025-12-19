import React from "react";
import Spinner from "./Spinner";

type LoadingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`relative flex items-center justify-center ${props.className}`}
    >
      {loading && <Spinner className="absolute left-4 h-5 w-5 text-white" />}
      <span className={loading ? "opacity-0" : "opacity-100"}>{children}</span>
    </button>
  );
};

export default LoadingButton;
