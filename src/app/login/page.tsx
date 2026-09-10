import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `Iniciar sesión · ${APP_NAME}` };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandLogo size="lg" />
          <p className="text-sm text-muted-foreground">
            Framework modular de agentes IA para PyMEs
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Accede al dashboard de tu negocio.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ¿Quieres ver la experiencia del cliente final?{" "}
          <Link href="/chat" className="inline-flex items-center gap-1 font-medium text-primary">
            <MessageSquare className="h-3.5 w-3.5" /> Abrir el chat público
          </Link>
        </p>
      </div>
    </main>
  );
}
