import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? "demo-company-001";

const replacements = [
  ["Limpieza dental", "Consulta de medicina general"],
  ["Blanqueamiento dental", "Chequeo médico preventivo"],
  ["Resina o empaste", "Certificado médico"],
  ["Ortodoncia", "Control de diabetes e hipertensión"],
];

async function main() {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error(`No se encontró la empresa demo ${companyId}.`);

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: companyId },
      data: {
        name: "Clínica Médica Horizonte",
        slug: "clinica-medica-horizonte",
        industry: "Salud y medicina general",
        description:
          "Clínica médica familiar con 3 consultorios, enfocada en medicina general, prevención y control de enfermedades crónicas.",
        email: "contacto@clinicahorizonte.test",
        website: "https://clinicahorizonte.test",
      },
    });

    for (const [from, to] of replacements) {
      await tx.customer.updateMany({ where: { companyId, serviceInterest: from }, data: { serviceInterest: to } });
      await tx.appointment.updateMany({ where: { companyId, service: from }, data: { service: to } });
      await tx.quote.updateMany({ where: { companyId, service: from }, data: { service: to } });
    }

    const knowledge = [
      ["Limpieza dental", "Consulta de medicina general", "La consulta de medicina general tiene un costo de $800 MXN e incluye valoración clínica, revisión de signos vitales y recomendaciones de tratamiento. Duración aproximada: 45 minutos."],
      ["Blanqueamiento dental", "Chequeo médico preventivo", "El chequeo médico preventivo cuesta $3500 MXN e incluye consulta, revisión de signos vitales, estudios básicos de laboratorio y seguimiento de resultados."],
      ["Resina o empaste", "Certificado médico", "La expedición de certificado médico cuesta $900 MXN e incluye valoración general y revisión de antecedentes clínicos."],
      ["Ortodoncia", "Control de diabetes e hipertensión", "El programa anual de control de diabetes e hipertensión cuesta desde $15000 MXN, con planes de pago a 12 meses. Incluye valoración inicial sin costo."],
    ];
    for (const [oldTitle, title, content] of knowledge) {
      await tx.knowledgeSource.updateMany({ where: { companyId, title: oldTitle }, data: { title, content } });
    }
    await tx.knowledgeSource.updateMany({
      where: { companyId, title: "Valoración inicial" },
      data: { content: "La primera valoración es sin costo e incluye revisión de signos vitales, antecedentes y plan de atención estimado." },
    });

    await tx.quote.updateMany({ where: { companyId, service: "Control de diabetes e hipertensión" }, data: { description: "Programa anual de control con consultas y seguimiento clínico." } });
    await tx.quote.updateMany({ where: { companyId, service: "Chequeo médico preventivo" }, data: { description: "Consulta, estudios básicos de laboratorio y seguimiento de resultados." } });
    await tx.quote.updateMany({ where: { companyId, service: "Consulta de medicina general" }, data: { description: "Valoración clínica y revisión de signos vitales." } });
    await tx.task.updateMany({ where: { companyId, title: "Confirmar cita de limpieza dental" }, data: { title: "Confirmar cita de medicina general" } });
    await tx.task.updateMany({ where: { companyId, title: "Dar seguimiento a cotización de ortodoncia" }, data: { title: "Dar seguimiento a programa de control médico" } });

    const conversations = await tx.conversation.findMany({ where: { companyId }, select: { id: true, summary: true } });
    for (const conversation of conversations) {
      let summary = conversation.summary;
      if (summary) {
        summary = summary
          .replaceAll("cita de limpieza dental", "consulta de medicina general")
          .replaceAll("cotización de ortodoncia", "información del programa de control de diabetes e hipertensión")
          .replaceAll("seguimiento de blanqueamiento", "seguimiento de su chequeo médico preventivo");
        await tx.conversation.update({ where: { id: conversation.id }, data: { summary } });
      }
    }

    const messages = await tx.message.findMany({
      where: { conversation: { companyId } },
      select: { id: true, content: true },
    });
    for (const message of messages) {
      const content = message.content
        .replaceAll("Clínica Dental Sonrisa", "Clínica Médica Horizonte")
        .replaceAll("limpieza dental", "consulta de medicina general")
        .replaceAll("blanqueamiento dental", "chequeo médico preventivo")
        .replaceAll("tratamiento de ortodoncia con brackets metálicos", "programa anual de control de diabetes e hipertensión")
        .replaceAll("tratamiento de ortodoncia", "programa de control de diabetes e hipertensión");
      if (content !== message.content) await tx.message.update({ where: { id: message.id }, data: { content } });
    }
  }, { maxWait: 20_000, timeout: 60_000 });

  console.log(`Empresa ${companyId} actualizada a Clínica Médica Horizonte.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
