/**
 * Seed de Aiwork.
 *
 * Crea la empresa demo "Clínica Médica Horizonte", dos usuarios de prueba
 * (ADMIN y OPERATOR), el catálogo de 4 agentes base y datos operativos
 * de ejemplo para poder navegar el dashboard desde el primer minuto.
 *
 * Ejecutar con: npm run prisma:seed
 */
import { randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_COMPANY_ID = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? "demo-company-001";
// Debe coincidir con `publicDemoCompanySlug` de src/lib/constants.ts: es la URL
// del chat público de la empresa demo (/chat/clinica-medica-horizonte).
const DEMO_COMPANY_SLUG = "clinica-medica-horizonte";
const ADMIN_ID = "user-admin-demo";
const OPERATOR_ID = "user-operator-demo";
/**
 * Contraseña de los usuarios demo. Sin `SEED_PASSWORD` se genera una al azar y
 * se imprime al final: así el seed nunca deja una contraseña conocida en un
 * despliegue público.
 *
 *   SEED_PASSWORD='la-que-quieras' npm run prisma:seed
 */
const DEMO_PASSWORD =
  process.env.SEED_PASSWORD?.trim() || randomBytes(18).toString("base64url").slice(0, 24);
const PASSWORD_GENERADA = !process.env.SEED_PASSWORD?.trim();

const days = (n: number) => {
  const date = new Date();
  date.setDate(date.getDate() + n);
  return date;
};

const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);

const AGENTS = [
  {
    id: "agent-recepcionista",
    slug: "recepcionista-ia",
    name: "Recepcionista IA",
    department: "Atención al cliente",
    description:
      "Atiende clientes, responde preguntas frecuentes y captura datos de prospectos.",
    defaultPrompt:
      "Eres la recepcionista virtual del negocio. Atiende con calidez, responde preguntas frecuentes y captura nombre, teléfono, correo y servicio de interés. Responde en español, breve y sin inventar información.",
    basePrice: 499,
  },
  {
    id: "agent-citas",
    slug: "agente-de-citas",
    name: "Agente de Citas",
    department: "Operaciones",
    description:
      "Crea solicitudes de cita, confirma disponibilidad y genera tareas relacionadas.",
    defaultPrompt:
      "Eres el agente de citas. Registra solicitudes de cita con servicio y fecha tentativa, aclara que quedan como SOLICITADAS hasta que el equipo confirme y pide los datos de contacto.",
    basePrice: 699,
  },
  {
    id: "agent-cotizaciones",
    slug: "agente-de-cotizaciones",
    name: "Agente de Cotizaciones",
    department: "Ventas",
    description: "Genera cotizaciones simples o preliminares con base en los servicios configurados.",
    defaultPrompt:
      "Eres el agente de cotizaciones. Genera cotizaciones preliminares usando los precios de la base de conocimiento, indica siempre que están sujetas a valoración e invita a agendar.",
    basePrice: 699,
  },
  {
    id: "agent-seguimiento",
    slug: "agente-de-seguimiento",
    name: "Agente de Seguimiento",
    department: "Retención",
    description: "Detecta prospectos pendientes, sugiere mensajes y crea tareas de seguimiento.",
    defaultPrompt:
      "Eres el agente de seguimiento. Detecta prospectos sin actividad reciente, propone un siguiente paso concreto y redacta mensajes de seguimiento cordiales.",
    basePrice: 499,
  },
];

const KNOWLEDGE = [
  {
    title: "Consulta de medicina general",
    type: "PRICING" as const,
    content:
      "La consulta de medicina general tiene un costo de $800 MXN e incluye valoración clínica, revisión de signos vitales y recomendaciones de tratamiento. Duración aproximada: 45 minutos.",
  },
  {
    title: "Chequeo médico preventivo",
    type: "PRICING" as const,
    content:
      "El chequeo médico preventivo cuesta $3500 MXN e incluye consulta, revisión de signos vitales, estudios básicos de laboratorio y seguimiento de resultados.",
  },
  {
    title: "Certificado médico",
    type: "PRICING" as const,
    content: "La expedición de certificado médico cuesta $900 MXN e incluye valoración general y revisión de antecedentes clínicos.",
  },
  {
    title: "Control de diabetes e hipertensión",
    type: "SERVICE" as const,
    content:
      "El programa anual de control de diabetes e hipertensión cuesta desde $15000 MXN, con planes de pago a 12 meses. Incluye valoración inicial sin costo.",
  },
  {
    title: "Horarios y ubicación",
    type: "FAQ" as const,
    content:
      "Atendemos de lunes a viernes de 9:00 a 19:00 y sábados de 9:00 a 14:00, en Av. Reforma 123, Col. Centro. Contamos con estacionamiento.",
  },
  {
    title: "Valoración inicial",
    type: "FAQ" as const,
    content:
      "La primera valoración es sin costo e incluye revisión de signos vitales, antecedentes y plan de atención estimado.",
  },
  {
    title: "Política de cancelación",
    type: "POLICY" as const,
    content:
      "Las citas pueden reagendarse sin costo avisando con al menos 4 horas de anticipación.",
  },
];

async function main() {
  console.log("🌱 Sembrando datos demo de Aiwork...");

  // Limpieza previa para que el seed sea repetible.
  await prisma.metricEvent.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
  await prisma.message.deleteMany({
    where: { conversation: { companyId: DEMO_COMPANY_ID } },
  });
  await prisma.conversation.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
  await prisma.task.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
  await prisma.appointment.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
  await prisma.quote.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
  await prisma.customer.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
  await prisma.knowledgeSource.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });

  // ---------------------------------------------------------------- Empresa
  const company = await prisma.company.upsert({
    where: { id: DEMO_COMPANY_ID },
    update: {
      name: "Clínica Médica Horizonte",
      slug: DEMO_COMPANY_SLUG,
      industry: "Salud y medicina general",
      description:
        "Clínica médica familiar con 3 consultorios, enfocada en medicina general, prevención y control de enfermedades crónicas.",
      phone: "+52 55 1234 5678",
      email: "contacto@clinicahorizonte.test",
      website: "https://clinicahorizonte.test",
      address: "Av. Reforma 123, Col. Centro, CDMX",
      businessHours: "Lunes a viernes de 9:00 a 19:00, sábados de 9:00 a 14:00",
      tone: "profesional, cálido y cercano",
    },
    create: {
      id: DEMO_COMPANY_ID,
      name: "Clínica Médica Horizonte",
      slug: DEMO_COMPANY_SLUG,
      industry: "Salud y medicina general",
      description:
        "Clínica médica familiar con 3 consultorios, enfocada en medicina general, prevención y control de enfermedades crónicas.",
      phone: "+52 55 1234 5678",
      email: "contacto@clinicahorizonte.test",
      website: "https://clinicahorizonte.test",
      address: "Av. Reforma 123, Col. Centro, CDMX",
      businessHours: "Lunes a viernes de 9:00 a 19:00, sábados de 9:00 a 14:00",
      tone: "profesional, cálido y cercano",
    },
  });

  // ---------------------------------------------------------------- Usuarios
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@agentflow.test" },
    update: { passwordHash, companyId: company.id, role: "ADMIN", status: "ACTIVE" },
    create: {
      id: ADMIN_ID,
      companyId: company.id,
      name: "Admin Demo",
      email: "admin@agentflow.test",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: "operador@agentflow.test" },
    update: { passwordHash, companyId: company.id, role: "OPERATOR", status: "ACTIVE" },
    create: {
      id: OPERATOR_ID,
      companyId: company.id,
      name: "Operador Demo",
      email: "operador@agentflow.test",
      passwordHash,
      role: "OPERATOR",
      status: "ACTIVE",
    },
  });

  // ----------------------------------------------------------------- Agentes
  for (const agent of AGENTS) {
    await prisma.agent.upsert({
      where: { slug: agent.slug },
      update: {
        name: agent.name,
        department: agent.department,
        description: agent.description,
        defaultPrompt: agent.defaultPrompt,
        basePrice: agent.basePrice,
        status: "ACTIVE",
      },
      create: { ...agent, status: "ACTIVE" },
    });

    await prisma.companyAgent.upsert({
      where: { companyId_agentId: { companyId: company.id, agentId: agent.id } },
      update: { isActive: true },
      create: {
        companyId: company.id,
        agentId: agent.id,
        isActive: true,
        monthlyLimit: 1000,
        configuration: {
          canal: "web_chat",
          idioma: "es-MX",
          escalarAHumano: true,
        },
      },
    });
  }

  // ------------------------------------------------------ Base de conocimiento
  for (const item of KNOWLEDGE) {
    await prisma.knowledgeSource.create({
      data: { companyId: company.id, status: "PUBLISHED", ...item },
    });
  }

  // ---------------------------------------------------------------- Clientes
  const [ana, carlos, maria, jorge, lucia] = await Promise.all([
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: "Ana Ramírez",
        phone: "+52 55 8765 4321",
        email: "ana.ramirez@example.com",
        serviceInterest: "Consulta de medicina general",
        source: "WEB_CHAT",
        status: "APPOINTMENT_REQUESTED",
        notes: "Prefiere citas por la tarde.",
        lastContactAt: hoursAgo(3),
        nextActionAt: days(2),
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: "Carlos Méndez",
        phone: "+52 55 2233 4455",
        email: "carlos.mendez@example.com",
        serviceInterest: "Control de diabetes e hipertensión",
        source: "WEB_CHAT",
        status: "QUOTE_SENT",
        notes: "Pidió plan de pagos a 12 meses.",
        lastContactAt: hoursAgo(28),
        nextActionAt: days(1),
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: "María López",
        phone: "+52 55 9988 7766",
        email: "maria.lopez@example.com",
        serviceInterest: "Chequeo médico preventivo",
        source: "WHATSAPP",
        status: "FOLLOW_UP",
        notes: "No contestó la última llamada.",
        lastContactAt: hoursAgo(72),
        nextActionAt: days(1),
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: "Jorge Salas",
        phone: "+52 55 4455 6677",
        email: "jorge.salas@example.com",
        serviceInterest: "Certificado médico",
        source: "WEB_CHAT",
        status: "NEW",
        notes: "Prospecto capturado por la Recepcionista IA.",
        lastContactAt: hoursAgo(5),
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: "Lucía Fernández",
        phone: "+52 55 1122 3344",
        email: "lucia.fernandez@example.com",
        serviceInterest: "Consulta de medicina general",
        source: "REFERRAL",
        status: "CONVERTED",
        notes: "Paciente recurrente, acude cada 6 meses.",
        lastContactAt: hoursAgo(120),
      },
    }),
  ]);

  // ------------------------------------------------------------------- Citas
  await prisma.appointment.createMany({
    data: [
      {
        companyId: company.id,
        customerId: ana.id,
        service: "Consulta de medicina general",
        requestedDate: days(2),
        status: "REQUESTED",
        notes: "Solicitada desde el chat web.",
      },
      {
        companyId: company.id,
        customerId: lucia.id,
        service: "Consulta de medicina general",
        requestedDate: days(4),
        confirmedDate: days(4),
        status: "CONFIRMED",
        notes: "Confirmada por teléfono.",
      },
      {
        companyId: company.id,
        customerId: jorge.id,
        service: "Valoración inicial",
        requestedDate: days(1),
        status: "REQUESTED",
        notes: "Cliente pidió horario de la tarde.",
      },
    ],
  });

  // ------------------------------------------------------------ Cotizaciones
  await prisma.quote.createMany({
    data: [
      {
        companyId: company.id,
        customerId: carlos.id,
        service: "Control de diabetes e hipertensión",
        description: "Programa anual de control con consultas y seguimiento clínico.",
        amount: 15000,
        currency: "MXN",
        status: "SENT",
        notes: "Incluye valoración inicial sin costo.",
      },
      {
        companyId: company.id,
        customerId: maria.id,
        service: "Chequeo médico preventivo",
        description: "Consulta, estudios básicos de laboratorio y seguimiento de resultados.",
        amount: 3500,
        currency: "MXN",
        status: "DRAFT",
        notes: "Generada por el Agente de Cotizaciones.",
      },
      {
        companyId: company.id,
        customerId: ana.id,
        service: "Consulta de medicina general",
        description: "Valoración clínica y revisión de signos vitales.",
        amount: 800,
        currency: "MXN",
        status: "APPROVED",
        notes: "Aprobada por la clienta en el chat.",
      },
    ],
  });

  // ------------------------------------------------------------------ Tareas
  await prisma.task.createMany({
    data: [
      {
        companyId: company.id,
        customerId: ana.id,
        agentId: "agent-citas",
        title: "Confirmar cita de medicina general",
        description: "Llamar a Ana Ramírez para confirmar disponibilidad.",
        dueDate: days(1),
        priority: "HIGH",
        status: "PENDING",
      },
      {
        companyId: company.id,
        customerId: carlos.id,
        agentId: "agent-cotizaciones",
        title: "Dar seguimiento a programa de control médico",
        description: "Confirmar si Carlos requiere plan de pagos.",
        dueDate: days(2),
        priority: "MEDIUM",
        status: "IN_PROGRESS",
      },
      {
        companyId: company.id,
        customerId: maria.id,
        agentId: "agent-seguimiento",
        title: "Reintentar contacto con María López",
        description: "Enviar mensaje de seguimiento por WhatsApp.",
        dueDate: days(-1),
        priority: "HIGH",
        status: "OVERDUE",
      },
      {
        companyId: company.id,
        customerId: jorge.id,
        agentId: "agent-recepcionista",
        title: "Completar datos de contacto de Jorge Salas",
        description: "Falta confirmar correo electrónico.",
        dueDate: days(3),
        priority: "LOW",
        status: "PENDING",
      },
      {
        companyId: company.id,
        customerId: lucia.id,
        agentId: "agent-citas",
        title: "Enviar recordatorio de cita",
        description: "Recordatorio 24 horas antes de la cita confirmada.",
        dueDate: days(3),
        priority: "MEDIUM",
        status: "COMPLETED",
      },
    ],
  });

  // ---------------------------------------------------------- Conversaciones
  const conversation1 = await prisma.conversation.create({
    data: {
      companyId: company.id,
      customerId: ana.id,
      agentId: "agent-citas",
      channel: "WEB_CHAT",
      status: "HANDLED_BY_AI",
      summary: "Ana solicitó una consulta de medicina general para el viernes por la tarde.",
      createdAt: hoursAgo(3),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation1.id,
        sender: "CUSTOMER",
        content: "Hola, quiero agendar una consulta de medicina general para el viernes.",
        createdAt: hoursAgo(3),
      },
      {
        conversationId: conversation1.id,
        sender: "AGENT",
        content:
          "¡Hola! Con gusto registro tu solicitud de consulta de medicina general para el viernes. La dejo como solicitada; el equipo confirmará la disponibilidad. ¿Me compartes tu nombre y teléfono?",
        createdAt: hoursAgo(3),
        metadata: { agentSlug: "agente-de-citas", intent: "APPOINTMENT", source: "mock" },
      },
      {
        conversationId: conversation1.id,
        sender: "CUSTOMER",
        content: "Soy Ana Ramírez, mi teléfono es 55 8765 4321.",
        createdAt: hoursAgo(3),
      },
    ],
  });

  const conversation2 = await prisma.conversation.create({
    data: {
      companyId: company.id,
      customerId: carlos.id,
      agentId: "agent-cotizaciones",
      channel: "WEB_CHAT",
      status: "HANDLED_BY_AI",
      summary: "Carlos pidió información del programa de control de diabetes e hipertensión con plan de pagos.",
      createdAt: hoursAgo(28),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation2.id,
        sender: "CUSTOMER",
        content: "¿Cuánto cuesta el programa de control de diabetes e hipertensión?",
        createdAt: hoursAgo(28),
      },
      {
        conversationId: conversation2.id,
        sender: "AGENT",
        content:
          "El programa anual de control de diabetes e hipertensión parte de $15,000 MXN e incluye valoración inicial sin costo. Es una cotización preliminar sujeta a valoración médica.",
        createdAt: hoursAgo(28),
        metadata: { agentSlug: "agente-de-cotizaciones", intent: "QUOTE", source: "mock" },
      },
    ],
  });

  const conversation3 = await prisma.conversation.create({
    data: {
      companyId: company.id,
      customerId: maria.id,
      agentId: "agent-seguimiento",
      channel: "WHATSAPP",
      status: "NEEDS_HUMAN",
      summary: "María no ha respondido al seguimiento de su chequeo médico preventivo.",
      createdAt: hoursAgo(72),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation3.id,
        sender: "AGENT",
        content:
          "Hola María, te escribimos de Clínica Médica Horizonte para dar seguimiento a tu interés en un chequeo médico preventivo. ¿Te ayudamos a agendar esta semana?",
        createdAt: hoursAgo(72),
        metadata: { agentSlug: "agente-de-seguimiento", intent: "FOLLOW_UP", source: "mock" },
      },
      {
        conversationId: conversation3.id,
        sender: "SYSTEM",
        content: "Sin respuesta del cliente después de 72 horas.",
        createdAt: hoursAgo(2),
      },
    ],
  });

  // ---------------------------------------------------------------- Métricas
  const metricEvents: {
    companyId: string;
    type:
      | "CONVERSATION_STARTED"
      | "MESSAGE_RECEIVED"
      | "AI_RESPONSE"
      | "LEAD_CREATED"
      | "APPOINTMENT_REQUESTED"
      | "APPOINTMENT_CONFIRMED"
      | "QUOTE_CREATED"
      | "QUOTE_SENT"
      | "TASK_CREATED"
      | "TASK_COMPLETED"
      | "FOLLOW_UP_CREATED";
    createdAt: Date;
  }[] = [];

  // Actividad de los últimos 7 días
  for (let day = 6; day >= 0; day--) {
    const date = days(-day);
    const conversations = 2 + ((day * 3) % 4);
    for (let i = 0; i < conversations; i++) {
      metricEvents.push({ companyId: company.id, type: "CONVERSATION_STARTED", createdAt: date });
      metricEvents.push({ companyId: company.id, type: "AI_RESPONSE", createdAt: date });
      metricEvents.push({ companyId: company.id, type: "MESSAGE_RECEIVED", createdAt: date });
    }
    if (day % 2 === 0) {
      metricEvents.push({ companyId: company.id, type: "LEAD_CREATED", createdAt: date });
      metricEvents.push({ companyId: company.id, type: "APPOINTMENT_REQUESTED", createdAt: date });
    }
    if (day % 3 === 0) {
      metricEvents.push({ companyId: company.id, type: "QUOTE_CREATED", createdAt: date });
      metricEvents.push({ companyId: company.id, type: "TASK_CREATED", createdAt: date });
    }
    if (day === 1 || day === 4) {
      metricEvents.push({ companyId: company.id, type: "APPOINTMENT_CONFIRMED", createdAt: date });
      metricEvents.push({ companyId: company.id, type: "TASK_COMPLETED", createdAt: date });
    }
  }

  await prisma.metricEvent.createMany({ data: metricEvents });

  console.log("✅ Seed completado");
  console.table([
    { recurso: "Empresa", valor: company.name },
    { recurso: "Admin", valor: admin.email },
    { recurso: "Operador", valor: operator.email },
    { recurso: "Agentes", valor: AGENTS.length },
    { recurso: "Clientes", valor: 5 },
    { recurso: "Conversaciones", valor: 3 },
    { recurso: "Citas", valor: 3 },
    { recurso: "Cotizaciones", valor: 3 },
    { recurso: "Tareas", valor: 5 },
    { recurso: "Eventos de métrica", valor: metricEvents.length },
  ]);

  if (PASSWORD_GENERADA) {
    console.log(
      `\n🔑 Contraseña de ambos usuarios: ${DEMO_PASSWORD}\n` +
        "   No vuelve a mostrarse. Para fijarla tú: SEED_PASSWORD='…' npm run prisma:seed\n",
    );
  }
}

main()
  .catch((error) => {
    console.error("❌ Error en el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
