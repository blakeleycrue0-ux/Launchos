import type { AvailablePath } from '@/domain/types';

export const saasPath: AvailablePath = {
  id: 'apps-saas',
  status: 'available',
  name: 'Apps & SaaS',
  tagline: 'Valida un problema, construye lo mínimo y consigue usuarios',
  category: 'software',
  description:
    'Construye una aplicación o un SaaS empezando por el problema, no por el código: valida con personas reales, lanza un MVP pequeño y consigue tus primeros usuarios de pago.',
  contentVersion: 1,
  idealFor: [
    'Personas con un problema concreto que resolver',
    'Quien quiere un negocio escalable a largo plazo',
    'Perfiles técnicos o dispuestos a usar herramientas no-code o IA',
  ],
  questions: [
    {
      key: 'build_skill',
      label: '¿Cómo vas a construir el producto?',
      options: [
        { value: 'no_code', label: 'Sin programar', description: 'Herramientas no-code y constructores con IA.' },
        { value: 'some_code', label: 'Programo un poco', description: 'Puedo seguir tutoriales y apoyarme en IA.' },
        { value: 'developer', label: 'Soy desarrollador', description: 'Puedo construir el producto completo.' },
      ],
    },
    {
      key: 'idea',
      label: '¿Tienes ya una idea?',
      options: [
        { value: 'none', label: 'Todavía no', description: 'Necesito encontrar un problema que resolver.' },
        { value: 'has_idea', label: 'Sí, tengo una idea', description: 'Quiero validarla antes de construir.' },
      ],
    },
  ],
  metrics: [
    { key: 'interviews', label: 'Entrevistas realizadas', unit: 'count', kind: 'flow', help: 'Conversaciones de validación con usuarios potenciales.' },
    { key: 'waitlist', label: 'Lista de espera', unit: 'count', kind: 'snapshot', help: 'Personas apuntadas hoy.' },
    { key: 'active_users', label: 'Usuarios activos', unit: 'count', kind: 'snapshot', help: 'Usuarios que han usado el producto en los últimos 30 días.' },
    { key: 'mrr', label: 'MRR', unit: 'currency', kind: 'snapshot', help: 'Ingresos recurrentes mensuales hoy.' },
  ],
  phases: [
    {
      key: 'problem',
      title: 'Problema',
      description: 'Encuentra un problema real por el que alguien pagaría.',
      tasks: [
        {
          key: 'saas-find-problem',
          title: 'Encuentra un problema que valga la pena',
          summary: 'Parte de problemas que conoces o que observas en comunidades.',
          estimatedMinutes: 180,
          when: { answers: { idea: ['none'] } },
          steps: [
            'Haz una lista de 20 tareas repetitivas o frustrantes de tu trabajo, tus aficiones o tu entorno.',
            'Busca en Reddit, foros y reseñas de software quejas recurrentes sobre herramientas existentes (filtra por "I wish", "alternative to", "frustrating").',
            'Puntúa cada problema de 1 a 5 en: frecuencia, dolor, disposición a pagar y facilidad para llegar a esas personas.',
            'Elige los 3 con mejor puntuación.',
          ],
          doneWhen: 'Tienes 3 problemas priorizados con su puntuación.',
          tools: [
            { name: 'Reddit', url: 'https://www.reddit.com/', purpose: 'Quejas y necesidades reales', pricing: 'free' },
            { name: 'G2', url: 'https://www.g2.com/', purpose: 'Reseñas negativas de software existente', pricing: 'free' },
          ],
          prompts: [
            {
              title: 'Explorar problemas',
              body: 'Trabajo en / me interesa [sector]. Enumera 20 problemas recurrentes de personas o pequeñas empresas de este sector que hoy se resuelven con hojas de cálculo, procesos manuales o herramientas caras. Para cada uno indica quién lo sufre, con qué frecuencia y cómo lo resuelven hoy.',
            },
          ],
        },
        {
          key: 'saas-problem-statement',
          title: 'Define el problema y el cliente',
          summary: 'Una frase clara evita construir para todo el mundo.',
          estimatedMinutes: 45,
          autoCompleteWhen: { stage: ['earning'] },
          steps: [
            'Completa: "[Tipo de cliente] tiene problemas para [tarea] porque [causa], y hoy lo resuelve con [alternativa]".',
            'Describe a tu cliente ideal: rol, tamaño de empresa si aplica, dónde se informa y qué usa hoy.',
            'Escribe qué tendría que ser verdad para que pagase por una solución.',
          ],
          doneWhen: 'Tienes una frase de problema y una descripción del cliente ideal.',
        },
        {
          key: 'saas-interviews',
          title: 'Habla con 10 clientes potenciales',
          summary: 'Pregunta por su pasado, no por tu idea.',
          estimatedMinutes: 360,
          autoCompleteWhen: { stage: ['earning'] },
          steps: [
            'Lee el resumen del método "The Mom Test": preguntas sobre hechos pasados, no opiniones sobre el futuro.',
            'Prepara 5 preguntas: cuándo fue la última vez que tuvo el problema, qué hizo, cuánto le costó, qué ha probado y qué no le gustó.',
            'Contacta con personas de tu cliente ideal en LinkedIn, comunidades o tu red.',
            'Haz 10 conversaciones de 15–20 minutos y anota frases literales.',
            'Registra el número de entrevistas en las métricas de LaunchOS.',
          ],
          doneWhen: '10 conversaciones realizadas y notas con frases literales.',
          prompts: [
            {
              title: 'Guion de entrevista',
              body: 'Prepara un guion de entrevista de 15 minutos siguiendo los principios de "The Mom Test" para validar este problema: [frase del problema]. Incluye 6 preguntas sobre comportamientos pasados, 2 preguntas de seguimiento por cada una y las señales que indicarían que el problema es real.',
            },
          ],
        },
      ],
    },
    {
      key: 'validation',
      title: 'Validación',
      description: 'Comprueba que hay interés real antes de construir.',
      tasks: [
        {
          key: 'saas-landing',
          title: 'Publica una landing de validación',
          summary: 'Una página con la propuesta de valor y una forma de apuntarse.',
          estimatedMinutes: 180,
          steps: [
            'Escribe un titular con el resultado que consigue el cliente, no con las funcionalidades.',
            'Añade 3 beneficios, una sección de cómo funciona y una llamada a la acción para unirse a la lista de espera.',
            'Conecta un formulario que guarde correos.',
            'Añade analítica para medir visitas y conversión.',
          ],
          doneWhen: 'La landing está publicada con formulario y analítica funcionando.',
          tools: [
            { name: 'Carrd', url: 'https://carrd.co/', purpose: 'Landing de una página', pricing: 'freemium' },
            { name: 'Framer', url: 'https://www.framer.com/', purpose: 'Landing con diseño avanzado', pricing: 'freemium' },
            { name: 'Tally', url: 'https://tally.so/', purpose: 'Formulario de lista de espera', pricing: 'freemium' },
            { name: 'Plausible', url: 'https://plausible.io/', purpose: 'Analítica respetuosa con la privacidad', pricing: 'paid' },
          ],
          prompts: [
            {
              title: 'Copy de la landing',
              body: 'Escribe el texto de una landing para "{{projectName}}". Problema: [frase del problema]. Cliente: [cliente ideal]. Incluye titular (máx. 10 palabras), subtítulo, 3 beneficios, cómo funciona en 3 pasos, 4 preguntas frecuentes y llamada a la acción para la lista de espera. Usa frases literales de las entrevistas: [pega frases].',
            },
          ],
        },
        {
          key: 'saas-traffic-test',
          title: 'Lleva 200 visitas a la landing',
          summary: 'Mide si la propuesta convence a desconocidos.',
          estimatedMinutes: 240,
          steps: [
            'Comparte la landing en 3 comunidades donde esté tu cliente ideal, aportando valor y respetando sus normas.',
            'Escribe directamente a las personas que entrevistaste.',
            'Con presupuesto, prueba una campaña pequeña de anuncios con un límite fijo.',
            'Calcula la conversión: personas apuntadas entre visitas. Una conversión superior al 10 % con tráfico cualificado es una buena señal.',
          ],
          doneWhen: 'Tienes al menos 200 visitas y conoces tu tasa de conversión.',
        },
        {
          key: 'saas-presale',
          title: 'Intenta una preventa',
          summary: 'Que alguien pague antes de que exista es la mejor validación.',
          estimatedMinutes: 120,
          when: { experience: ['some', 'experienced'] },
          steps: [
            'Ofrece acceso anticipado con descuento a las personas de la lista de espera.',
            'Crea un enlace de pago.',
            'Comunica una fecha de entrega realista y la opción de devolución.',
          ],
          doneWhen: 'Has ofrecido la preventa al menos a 20 personas y anotado el resultado.',
          tools: [{ name: 'Stripe Payment Links', url: 'https://stripe.com/payments/payment-links', purpose: 'Cobrar sin programar', pricing: 'paid' }],
        },
      ],
    },
    {
      key: 'mvp',
      title: 'MVP',
      description: 'Construye la versión más pequeña que resuelve el problema.',
      tasks: [
        {
          key: 'saas-scope',
          title: 'Define el alcance del MVP',
          summary: 'Una sola tarea principal, resuelta de principio a fin.',
          estimatedMinutes: 90,
          steps: [
            'Escribe el recorrido principal del usuario en 5 pasos o menos.',
            'Haz una lista de funcionalidades y marca cada una como imprescindible o posterior.',
            'Elimina todo lo que no sea imprescindible para el recorrido principal.',
            'Fija una fecha límite de entrega de 4 a 6 semanas.',
          ],
          doneWhen: 'Tienes un documento con el recorrido principal, la lista recortada y la fecha.',
        },
        {
          key: 'saas-stack-nocode',
          title: 'Elige tu herramienta de construcción',
          summary: 'Constructores con IA o no-code para llegar rápido a un producto usable.',
          estimatedMinutes: 120,
          when: { answers: { build_skill: ['no_code'] } },
          steps: [
            'Prueba un constructor con IA y uno no-code con un prototipo de tu recorrido principal.',
            'Comprueba que permite autenticación, base de datos y pagos.',
            'Elige el que te haya permitido avanzar más en 2 horas.',
          ],
          doneWhen: 'Has elegido herramienta y tienes un prototipo inicial.',
          tools: [
            { name: 'Lovable', url: 'https://lovable.dev/', purpose: 'Aplicaciones con IA', pricing: 'freemium' },
            { name: 'Bubble', url: 'https://bubble.io/', purpose: 'Aplicaciones no-code', pricing: 'freemium' },
          ],
        },
        {
          key: 'saas-stack-code',
          title: 'Prepara tu stack técnico',
          summary: 'Un stack aburrido y probado es el mejor punto de partida.',
          estimatedMinutes: 180,
          when: { answers: { build_skill: ['some_code', 'developer'] } },
          steps: [
            'Elige un framework que conozcas (por ejemplo React con TypeScript).',
            'Usa un servicio gestionado para autenticación y base de datos.',
            'Configura despliegue automático desde GitHub.',
            'Apóyate en un asistente de código con IA y revisa todo lo que genere.',
          ],
          doneWhen: 'Tienes un repositorio que se despliega automáticamente con autenticación funcionando.',
          tools: [
            { name: 'Supabase', url: 'https://supabase.com/', purpose: 'Auth y base de datos', pricing: 'freemium' },
            { name: 'Netlify', url: 'https://www.netlify.com/', purpose: 'Despliegue', pricing: 'freemium' },
            { name: 'Claude Code', url: 'https://claude.com/product/claude-code', purpose: 'Asistente de programación', pricing: 'paid' },
          ],
        },
        {
          key: 'saas-build-core',
          title: 'Construye el recorrido principal',
          summary: 'Del registro al resultado, sin funcionalidades extra.',
          estimatedMinutes: 900,
          autoCompleteWhen: { stage: ['earning'] },
          steps: [
            'Implementa el registro y el inicio de sesión.',
            'Implementa el recorrido principal paso a paso y pruébalo tú mismo cada día.',
            'Añade cobro con Stripe si vas a cobrar desde el primer día.',
            'Pide a 3 personas de tu lista que lo prueben mientras miras, sin ayudarles.',
          ],
          doneWhen: 'Una persona externa completa el recorrido principal sin ayuda.',
        },
      ],
    },
    {
      key: 'launch',
      title: 'Lanzamiento y tracción',
      description: 'Consigue usuarios, escucha y mejora.',
      tasks: [
        {
          key: 'saas-beta',
          title: 'Lanza una beta privada',
          summary: 'Empieza con tu lista de espera y aprende antes del lanzamiento público.',
          estimatedMinutes: 180,
          steps: [
            'Invita a 10–20 personas de la lista de espera.',
            'Configura un canal sencillo de feedback (correo o formulario).',
            'Haz una llamada de 15 minutos con al menos 5 usuarios tras su primera semana.',
            'Prioriza los 3 problemas que más se repitan.',
          ],
          doneWhen: 'Al menos 10 personas han usado la beta y tienes 3 problemas priorizados.',
        },
        {
          key: 'saas-public-launch',
          title: 'Haz un lanzamiento público',
          summary: 'Concentra la atención en un día y en los canales correctos.',
          estimatedMinutes: 240,
          steps: [
            'Prepara capturas, un vídeo corto de demostración y una descripción clara.',
            'Elige 2–3 canales: Product Hunt, comunidades del sector, redes sociales o newsletter.',
            'Avisa a tu lista de espera y a los usuarios de la beta.',
            'Responde a todos los comentarios el día del lanzamiento.',
          ],
          doneWhen: 'Has lanzado públicamente y registrado los resultados en LaunchOS.',
          tools: [
            { name: 'Product Hunt', url: 'https://www.producthunt.com/', purpose: 'Lanzamiento público', pricing: 'free' },
            { name: 'Indie Hackers', url: 'https://www.indiehackers.com/', purpose: 'Comunidad de fundadores', pricing: 'free' },
          ],
        },
        {
          key: 'saas-first-paying',
          title: 'Consigue tus primeros 10 clientes de pago',
          summary: 'Ventas manuales: habla con cada cliente.',
          estimatedMinutes: 600,
          steps: [
            'Escribe personalmente a cada usuario activo y ofrécele el plan de pago.',
            'Pregunta a quien no pague qué le falta.',
            'Registra MRR y usuarios activos cada semana en LaunchOS.',
          ],
          doneWhen: 'Tienes 10 clientes de pago o una lista clara de por qué no pagan.',
        },
      ],
    },
  ],
};
