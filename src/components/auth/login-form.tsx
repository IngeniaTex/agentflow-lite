"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/schemas/auth";

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (!result || result.error) {
      setFormError("Credenciales incorrectas. Revisa tu correo y contraseña.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  });

  const fillDemo = (email: string) => {
    setValue("email", email);
    setValue("password", "password123");
    setFormError(null);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@agentflow.test"
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {formError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Entrando…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" /> Iniciar sesión
          </>
        )}
      </Button>

      <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Credenciales demo</p>
        <button
          type="button"
          onClick={() => fillDemo("admin@agentflow.test")}
          className="block w-full rounded px-2 py-1 text-left transition-colors hover:bg-muted"
        >
          <strong className="text-foreground">Admin:</strong> admin@agentflow.test / password123
        </button>
        <button
          type="button"
          onClick={() => fillDemo("operador@agentflow.test")}
          className="block w-full rounded px-2 py-1 text-left transition-colors hover:bg-muted"
        >
          <strong className="text-foreground">Operador:</strong> operador@agentflow.test /
          password123
        </button>
      </div>
    </form>
  );
}
