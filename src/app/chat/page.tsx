import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { ChatScreen } from "@/components/chat/chat-screen";
import { APP_NAME } from "@/lib/constants";
import { resolvePublicCompany } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const metadata = { title: `Chat demo · ${APP_NAME}` };

/**
 * Chat público sin slug: resuelve por dominio y, si no hay coincidencia,
 * cae en la empresa por defecto (NEXT_PUBLIC_DEMO_COMPANY_ID).
 */
export default async function ChatPage() {
  const company = await resolvePublicCompany({
    host: (await headers()).get("host"),
  }).catch(() => null);

  if (!company) notFound();

  return <ChatScreen company={company} />;
}
