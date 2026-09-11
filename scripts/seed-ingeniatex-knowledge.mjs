import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KNOWLEDGE = [
  {
    title: "Servicios y precios orientativos",
    type: "PRICING",
    content:
      "IngeniaTex desarrolla aplicaciones web, software a medida, automatizaciones e integraciones, y ofrece consultoría tecnológica. Para esta demostración, los rangos orientativos son: sitio web corporativo desde $18,000 MXN; aplicación web de negocio desde $45,000 MXN; software a medida desde $85,000 MXN; diagnóstico de consultoría desde $6,000 MXN; y mantenimiento mensual desde $8,000 MXN. Son estimaciones preliminares, no precios finales: el alcance, las integraciones y la complejidad se validan en una llamada de descubrimiento antes de emitir una propuesta formal.",
  },
  {
    title: "Desarrollo de aplicaciones web",
    type: "SERVICE",
    content:
      "Creamos aplicaciones web y plataformas accesibles desde navegador, adaptadas a escritorio y móvil. Una app web puede incluir autenticación, panel administrativo, perfiles de usuario, formularios, reportes, pagos, notificaciones y conexión con servicios externos. El rango demo comienza en $45,000 MXN y un MVP suele tomar entre 6 y 10 semanas, sujeto al alcance. También usamos los términos portal web, sistema web, plataforma digital y dashboard para este servicio.",
  },
  {
    title: "Software a medida",
    type: "SERVICE",
    content:
      "Diseñamos sistemas personalizados para digitalizar operaciones que no encajan bien en una herramienta estándar. Algunos ejemplos son CRM internos, control de inventario, seguimiento de órdenes, portales para clientes, gestión documental y flujos de aprobación. El trabajo parte de entender el proceso actual, definir prioridades y construir primero un MVP medible. El rango demo inicia en $85,000 MXN y normalmente requiere de 10 a 16 semanas, dependiendo de módulos e integraciones.",
  },
  {
    title: "Automatización e integraciones",
    type: "SERVICE",
    content:
      "Conectamos herramientas y automatizamos tareas repetitivas mediante APIs, webhooks y flujos programados. Podemos integrar formularios, CRM, correo, mensajería, pasarelas de pago, calendarios, hojas de cálculo y sistemas existentes. Antes de cotizar revisamos si cada plataforma cuenta con API y qué permisos ofrece. Un piloto de automatización se estima desde $20,000 MXN y entre 3 y 6 semanas para fines de esta demo.",
  },
  {
    title: "Consultoría tecnológica",
    type: "SERVICE",
    content:
      "La consultoría tecnológica ayuda a convertir un problema de negocio en un plan de solución. Incluye una sesión de descubrimiento, revisión del proceso actual, identificación de riesgos y una recomendación de arquitectura, prioridades y siguientes pasos. El diagnóstico inicial de demo se estima desde $6,000 MXN. Si el cliente continúa con un proyecto de desarrollo, el equipo puede considerar ese diagnóstico dentro de la propuesta posterior, sujeto a confirmación comercial.",
  },
  {
    title: "Proceso de trabajo",
    type: "FAQ",
    content:
      "El proceso tiene cinco etapas: 1) llamada de descubrimiento para conocer objetivo, usuarios y restricciones; 2) definición de alcance y propuesta; 3) diseño de experiencia y arquitectura; 4) desarrollo por entregas con revisiones periódicas; y 5) pruebas, publicación y acompañamiento. El cliente participa validando prioridades y entregables. Para reducir riesgo recomendamos comenzar con un MVP y ampliar después con datos reales de uso.",
  },
  {
    title: "Tiempos de entrega",
    type: "FAQ",
    content:
      "Los tiempos dependen del alcance y de la velocidad de validación del cliente. Como referencia para demo: un sitio corporativo requiere aproximadamente 3 a 5 semanas; una aplicación web MVP, 6 a 10 semanas; una automatización, 3 a 6 semanas; y un sistema a medida con varios módulos, 10 a 16 semanas. La fecha formal se confirma después del levantamiento y puede cambiar si se agregan funciones o integraciones.",
  },
  {
    title: "Cotización, pagos y cambios de alcance",
    type: "POLICY",
    content:
      "Toda cotización del chat es preliminar. La propuesta formal detalla alcance, entregables, calendario, inversión y supuestos. Para la demo se puede explicar un esquema común de 40% al iniciar, 30% al aprobar el avance intermedio y 30% contra entrega, aunque debe confirmarse con el equipo. Solicitudes fuera del alcance se analizan y cotizan antes de desarrollarse; nunca se incorporan automáticamente sin aprobación.",
  },
  {
    title: "Mantenimiento y soporte",
    type: "SERVICE",
    content:
      "Después del lanzamiento podemos ofrecer mantenimiento correctivo, monitoreo, actualizaciones, respaldo y una bolsa de horas para mejoras. El plan demo parte de $8,000 MXN mensuales y se ajusta por criticidad, infraestructura y tiempo de respuesta requerido. La garantía cubre correcciones de funciones incluidas en el alcance aceptado; funciones nuevas se estiman por separado.",
  },
  {
    title: "Tecnologías y propiedad del proyecto",
    type: "FAQ",
    content:
      "La tecnología se selecciona según el problema, el equipo del cliente y los requisitos de crecimiento. Podemos trabajar con aplicaciones web modernas, APIs, bases de datos relacionales, servicios en la nube e integraciones de terceros. La propuesta formal debe especificar repositorios, accesos, licencias y propiedad del código. No se promete una tecnología concreta desde el chat sin revisar primero el proyecto.",
  },
  {
    title: "Seguridad y datos",
    type: "POLICY",
    content:
      "Los proyectos consideran controles como autenticación, permisos por rol, conexiones cifradas, gestión segura de secretos, respaldos y registro de errores según el alcance. Si se manejan datos personales, financieros o sensibles, se revisan requisitos adicionales antes de diseñar la solución. El chat no debe solicitar contraseñas, llaves de acceso ni información confidencial; esos datos se comparten únicamente por un canal seguro acordado con el equipo.",
  },
  {
    title: "Información necesaria para cotizar",
    type: "FAQ",
    content:
      "Para preparar una propuesta necesitamos saber: qué problema se busca resolver, quién usará la solución, cuáles son las funciones indispensables, si existen sistemas que deban integrarse, el plazo deseado y un rango de presupuesto. También ayuda conocer el proceso actual y compartir ejemplos de referencia. Si aún no está definido, una llamada de descubrimiento permite ordenar las prioridades sin exigir un documento técnico previo.",
  },
  {
    title: "Comunicación y reuniones",
    type: "FAQ",
    content:
      "Durante un proyecto se acuerda un responsable por cada parte y un canal principal de comunicación. Las revisiones pueden realizarse de forma remota y se recomienda una sesión periódica para mostrar avances, resolver bloqueos y validar decisiones. IngeniaTex atiende de lunes a viernes de 9:00 a 18:00, hora de Mérida. Las citas solicitadas por chat quedan pendientes de confirmación.",
  },
  {
    title: "Horarios, ubicación y contacto",
    type: "FAQ",
    content:
      "IngeniaTex se encuentra en Mérida, Yucatán, México, y atiende de lunes a viernes de 9:00 a 18:00. El teléfono registrado es 999 279 8371, el correo es ypz.omar@gmail.com y el sitio es https://ingeniatex.vercel.app/. Las reuniones pueden solicitarse por el chat, pero el horario queda confirmado únicamente cuando el equipo responde.",
  },
];

async function main() {
  const company = await prisma.company.findUnique({ where: { slug: "ingeniatex" } });
  if (!company) throw new Error("No se encontró la empresa con slug ingeniatex.");

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: company.id },
      data: {
        industry: "Ingeniería de software y soluciones tecnológicas",
        description:
          "Empresa de Mérida dedicada al desarrollo de aplicaciones web, software a medida, automatización de procesos, integraciones y consultoría tecnológica para negocios.",
        tone: "profesional, consultivo, claro y cercano",
      },
    });

    const oldPricing = await tx.knowledgeSource.findFirst({
      where: { companyId: company.id, title: "Servicios y precios" },
    });
    if (oldPricing) {
      await tx.knowledgeSource.update({
        where: { id: oldPricing.id },
        data: { title: "Servicios y precios orientativos" },
      });
    }

    const oldLocation = await tx.knowledgeSource.findFirst({
      where: { companyId: company.id, title: "Horarios y ubicación" },
    });
    if (oldLocation) {
      await tx.knowledgeSource.update({
        where: { id: oldLocation.id },
        data: { title: "Horarios, ubicación y contacto" },
      });
    }

    for (const item of KNOWLEDGE) {
      const existing = await tx.knowledgeSource.findFirst({
        where: { companyId: company.id, title: item.title },
      });
      if (existing) {
        await tx.knowledgeSource.update({
          where: { id: existing.id },
          data: { ...item, status: "PUBLISHED" },
        });
      } else {
        await tx.knowledgeSource.create({
          data: { companyId: company.id, ...item, status: "PUBLISHED" },
        });
      }
    }
  }, { maxWait: 20_000, timeout: 90_000 });

  console.log(`IngeniaTex actualizada con ${KNOWLEDGE.length} entradas de conocimiento.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
