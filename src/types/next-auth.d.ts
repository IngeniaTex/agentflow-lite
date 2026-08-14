import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string;
      companyName: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    companyId: string;
    companyName: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    companyId: string;
    companyName: string;
    role: UserRole;
  }
}

// Auth.js v5 resuelve el JWT desde @auth/core
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    companyId: string;
    companyName: string;
    role: UserRole;
  }
}

export {};
