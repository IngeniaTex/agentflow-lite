import { notFound } from "next/navigation";

import { ChatScreen } from "@/components/chat/chat-screen";
import { resolvePublicCompany } from "@/lib/tenant";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const company = await resolvePublicCompany({ slug }).catch(() => null);
  return { title: company ? `Chat · ${company.name}` : "Chat no disponible" };
}

/** Chat público de una empresa concreta: /chat/<slug>. */
export default async function CompanyChatPage({ params }: Props) {
  const { slug } = await params;
  const company = await resolvePublicCompany({ slug }).catch(() => null);

  if (!company) notFound();

  return <ChatScreen company={company} />;
}
