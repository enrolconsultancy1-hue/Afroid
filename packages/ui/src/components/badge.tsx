import * as React from "react";
import { cn } from "../index";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "neutral", children, ...props }, ref) => {
    const variantStyles = {
      success: "bg-green-500/10 text-green-500 border-green-500/20",
      warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      danger: "bg-red-500/10 text-red-500 border-red-500/20",
      info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      neutral: "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-surface-200 dark:border-surface-700",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";
