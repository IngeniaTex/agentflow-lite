import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

/** Cierre de sesión mediante server action (sin estado en el cliente). */
export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <Button type="submit" variant="outline" size="sm">
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>
    </form>
  );
}
