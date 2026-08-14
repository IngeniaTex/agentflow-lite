import * as React from "react";

import { cn } from "@/lib/utils";
import { toneFor } from "@/lib/labels";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Estado del dominio (CustomerStatus, TaskStatus, etc.) para elegir el color. */
  status?: string;
}

export function Badge({ className, status, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        status ? toneFor(status) : "bg-slate-50 text-slate-700 ring-slate-600/20",
        className,
      )}
      {...props}
    />
  );
}
