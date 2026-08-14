import { Building2 } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/lib/labels";
import { initials } from "@/lib/utils";

interface DashboardHeaderProps {
  name: string;
  role: string;
  companyName: string;
  email?: string | null;
}

export function DashboardHeader({ name, role, companyName, email }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/80 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
          {initials(name)}
        </span>
        <div className="leading-tight">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {name}
            <Badge status={role}>{roleLabels[role] ?? role}</Badge>
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" /> {companyName}
            {email ? ` · ${email}` : ""}
          </p>
        </div>
      </div>

      <SignOutButton />
    </header>
  );
}
