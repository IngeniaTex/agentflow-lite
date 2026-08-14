import type { NextAuthConfig } from "next-auth";

/**
 * Configuración compartida y compatible con el Edge Runtime (middleware).
 *
 * Aquí NO se importa Prisma ni bcrypt: el provider de credenciales vive en
 * `src/lib/auth.ts`, que solo se ejecuta en Node.js.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    /** Guarda los datos del usuario en el JWT al iniciar sesión. */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    /** Expone id, companyId y role en `session.user`. */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
