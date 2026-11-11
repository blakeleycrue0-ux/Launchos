import type { AvailablePath } from '@/domain/types';

export const facelessPath: AvailablePath = {
  id: 'faceless',
  status: 'available',
  name: 'Faceless content',
  tagline: 'Canal de contenido sin mostrar tu cara',
  category: 'content',
  description:
    'Crea un canal de YouTube, TikTok o Shorts sin aparecer en cámara: elige un nicho, define un formato repetible, produce con un sistema y monetiza cuando haya audiencia.',
  contentVersion: 1,
  idealFor: [
    'Personas constantes que pueden publicar cada semana',
    'Quien quiere construir un activo a medio plazo',
    'Empezar con presupuesto bajo o nulo',
  ],
  questions: [
    {
      key: 'format',
      label: '¿Qué formato quieres trabajar?',
      options: [
        { value: 'long', label: 'Vídeo largo en YouTube', description: '8–15 minutos. Más trabajo por vídeo, mejor monetización.' },
        { value: 'short', label: 'Vídeo corto', description: 'TikTok, Shorts y Reels. Más volumen y crecimiento rápido.' },
        { value: 'both', label: 'Ambos', description: 'Vídeo largo como base y cortos derivados.' },
      ],
    },
    {
      key: 'voice',
      label: '¿Cómo vas a narrar?',
      options: [
        { value: 'own', label: 'Con mi voz', description: 'Más confianza y diferenciación.' },
        { value: 'ai', label: 'Con voz de IA', description: 'Más rápido; requiere cuidar la calidad.' },
        { value: 'none', label: 'Sin voz', description: 'Texto en pantalla y música.' },
      ],
    },
  ],
  metrics: [
    { key: 'videos_published', label: 'Vídeos publicados', unit: 'count', kind: 'flow', help: 'Vídeos publicados desde el último registro.' },
    { key: 'followers', label: 'Seguidores', unit: 'count', kind: 'snapshot', help: 'Suscriptores o seguidores totales hoy.' },
    { key: 'views_28d', label: 'Visualizaciones (28 días)', unit: 'count', kind: 'snapshot', help: 'Dato de YouTube Studio o TikTok Analytics.' },
    { key: 'revenue', label: 'Ingresos', unit: 'currency', kind: 'flow', help: 'Ingresos cobrados desde el último registro (AdSense, afiliados, marcas).' },
  ],
  phases: [
    {
      key: 'foundations',
      title: 'Fundamentos',
      description: 'Decide qué canal vas a construir antes de producir nada.',
      tasks: [
        {
          key: 'faceless-how-it-works',
          title: 'Entiende cómo crece un canal faceless',
          summary: 'Aprende las métricas que deciden si un vídeo se distribuye: CTR, retención y constancia.',
          estimatedMinutes: 45,
          when: { experience: ['none'] },
          steps: [
            'Lee la guía oficial de YouTube sobre cómo funciona la recomendación de vídeos.',
            'Anota la definición de CTR (porcentaje de clics en la miniatura) y retención media.',
            'Elige 3 canales faceless de temas distintos y apunta cuántos vídeos publican por semana.',
            'Escribe en una frase qué te hace pensar que puedes sostener ese ritmo.',
          ],
          doneWhen: 'Puedes explicar con tus palabras qué es el CTR, la retención y por qué importa la constancia.',
          tools: [
            { name: 'YouTube Creators', url: 'https://www.youtube.com/creators/', purpose: 'Guías oficiales para creadores', pricing: 'free' },
          ],
        },
        {
          key: 'faceless-niche',
          title: 'Elige y valida tu nicho',
          summary: 'Encuentra un tema con demanda, que puedas producir de forma repetible y que te interese de verdad.',
          estimatedMinutes: 120,
          autoCompleteWhen: { stage: ['earning'] },
          steps: [
            'Haz una lista de 10 temas que conozcas o te interesen (historia, finanzas personales, curiosidades, tecnología…).',
            'Para cada tema, busca en YouTube y TikTok y localiza al menos 3 canales pequeños (menos de 50.000 seguidores) con vídeos de más de 50.000 visualizaciones.',
            'Comprueba la tendencia del tema en Google Trends en los últimos 12 meses.',
            'Descarta los temas en los que no podrías hacer 50 vídeos sin repetirte.',
            'Quédate con un nicho y escribe a quién va dirigido y qué problema o curiosidad resuelve.',
          ],
          doneWhen: 'Tienes un nicho elegido, 3 canales de referencia anotados y una frase de posicionamiento.',
          tools: [
            { name: 'Google Trends', url: 'https://trends.google.com/', purpose: 'Comprobar si el interés crece o cae', pricing: 'free' },
            { name: 'vidIQ', url: 'https://vidiq.com/', purpose: 'Ver volumen de búsqueda y competencia en YouTube', pricing: 'freemium' },
          ],
          prompts: [
            {
              title: 'Generar ideas de nicho',
              body: 'Actúa como estratega de contenido en YouTube. Quiero crear un canal sin mostrar mi cara. Mis intereses son: [tus intereses]. Propón 10 nichos con: público objetivo, 5 ideas de vídeo de ejemplo, nivel de competencia estimado y potencial de monetización. Prioriza nichos donde se puedan hacer más de 50 vídeos sin repetirse.',
            },
          ],
          tips: ['Un nicho estrecho al principio crece más rápido que uno genérico.'],
        },
        {
          key: 'faceless-format',
          title: 'Define tu formato repetible',
          summary: 'Diseña la estructura fija de tus vídeos para producir rápido y con calidad constante.',
          estimatedMinutes: 90,
          steps: [
            'Analiza los 3 vídeos más vistos de tus canales de referencia: duración, gancho de los primeros 5 segundos, estructura y tipo de imágenes.',
            'Define tu estructura: gancho, contexto, desarrollo en bloques y cierre con llamada a la acción.',
            'Decide el estilo visual: imágenes de archivo, animación simple, capturas de pantalla o texto en pantalla.',
            'Fija la duración objetivo y la frecuencia de publicación que puedes cumplir.',
          ],
          doneWhen: 'Tienes un documento de una página con la estructura del vídeo, el estilo visual y la frecuencia.',
          prompts: [
            {
              title: 'Plantilla de formato',
              body: 'Mi canal faceless "{{projectName}}" trata sobre [tu nicho]. Objetivo: {{goal}}. Analiza este formato de vídeo de referencia: [describe el vídeo]. Crea una plantilla reutilizable con: gancho de 5 segundos, estructura por bloques con tiempos, transiciones y cierre. Formato objetivo: [largo / corto].',
            },
          ],
        },
      ],
    },
    {
      key: 'setup',
      title: 'Configuración',
      description: 'Prepara cuentas, identidad y herramientas de producción.',
      tasks: [
        {
          key: 'faceless-accounts',
          title: 'Crea y configura tus cuentas',
          summary: 'Abre el canal con nombre, descripción e imagen coherentes en cada plataforma.',
          estimatedMinutes: 60,
          autoCompleteWhen: { stage: ['started', 'earning'] },
          steps: [
            'Elige un nombre corto, fácil de recordar y relacionado con el nicho. Comprueba que esté libre en todas las plataformas.',
            'Crea una cuenta de Google dedicada al canal y abre el canal de YouTube.',
            'Si vas a publicar cortos, crea también la cuenta de TikTok con el mismo nombre.',
            'Escribe la descripción del canal: qué publicas, para quién y con qué frecuencia.',
            'Activa la verificación del canal en YouTube Studio para poder subir miniaturas personalizadas.',
          ],
          doneWhen: 'El canal existe en cada plataforma elegida, con nombre, descripción y verificación completados.',
          tools: [
            { name: 'YouTube Studio', url: 'https://studio.youtube.com/', purpose: 'Gestionar el canal', pricing: 'free' },
            { name: 'TikTok', url: 'https://www.tiktok.com/', purpose: 'Publicar vídeo corto', pricing: 'free' },
          ],
        },
        {
          key: 'faceless-branding',
          title: 'Diseña la identidad visual',
          summary: 'Foto de perfil, banner y una plantilla de miniatura reconocible.',
          estimatedMinutes: 90,
          steps: [
            'Define 2 colores y 1 tipografía para todo el canal.',
            'Crea la foto de perfil y el banner en Canva usando las medidas oficiales.',
            'Diseña una plantilla de miniatura: texto grande de 3–5 palabras, un elemento visual y alto contraste.',
            'Comprueba que la miniatura se lee bien al tamaño de un móvil.',
          ],
          doneWhen: 'Perfil, banner y plantilla de miniatura subidos o guardados.',
          tools: [
            { name: 'Canva', url: 'https://www.canva.com/', purpose: 'Diseño de banner y miniaturas', pricing: 'freemium' },
          ],
        },
        {
          key: 'faceless-tools',
          title: 'Monta tu sistema de producción',
          summary: 'Elige herramientas de guion, voz, edición y recursos visuales según tu presupuesto.',
          estimatedMinutes: 60,
          steps: [
            'Guion: usa un asistente de IA para investigar y estructurar, y revisa siempre los datos.',
            'Edición: instala CapCut (más sencillo) o DaVinci Resolve (más completo y gratuito).',
            'Recursos: crea cuenta en Pexels para vídeo e imágenes libres de derechos.',
            'Voz: prueba la herramienta de voz elegida con un párrafo de tu guion y compara 2–3 opciones.',
            'Crea una carpeta por vídeo con la misma estructura: guion, audio, recursos y exportación.',
          ],
          doneWhen: 'Tienes instaladas las herramientas y una carpeta plantilla lista para el primer vídeo.',
          tools: [
            { name: 'CapCut', url: 'https://www.capcut.com/', purpose: 'Edición sencilla y subtítulos', pricing: 'freemium' },
            { name: 'DaVinci Resolve', url: 'https://www.blackmagicdesign.com/products/davinciresolve', purpose: 'Edición profesional gratuita', pricing: 'free' },
            { name: 'Pexels', url: 'https://www.pexels.com/videos/', purpose: 'Vídeo e imágenes libres de derechos', pricing: 'free' },
            { name: 'ElevenLabs', url: 'https://elevenlabs.io/', purpose: 'Voz con IA', pricing: 'freemium' },
            { name: 'Claude', url: 'https://claude.ai/', purpose: 'Investigación y guiones', pricing: 'freemium' },
          ],
          tips: ['Con presupuesto cero, CapCut, Pexels y tu propia voz son suficientes para empezar.'],
        },
      ],
    },
    {
      key: 'production',
      title: 'Primeros vídeos',
      description: 'Produce y publica tus primeros vídeos con un proceso que puedas repetir.',
      tasks: [
        {
          key: 'faceless-ideas-bank',
          title: 'Crea un banco de 30 ideas',
          summary: 'Ten ideas preparadas para no depender de la inspiración.',
          estimatedMinutes: 60,
          steps: [
            'Revisa los vídeos más vistos de tus canales de referencia y anota los temas que se repiten.',
            'Usa la búsqueda de YouTube y TikTok: escribe tu tema y apunta las sugerencias de autocompletado.',
            'Escribe 30 títulos posibles en una hoja de cálculo.',
            'Ordénalos por potencial (interés y facilidad de producción).',
          ],
          doneWhen: 'Tienes una lista ordenada de al menos 30 ideas.',
          prompts: [
            {
              title: 'Ideas de vídeo',
              body: 'Mi canal faceless "{{projectName}}" trata sobre [tu nicho]. Objetivo: {{goal}}. Propón 30 títulos de vídeo con alto potencial de clic, sin clickbait engañoso. Para cada uno indica el gancho de los primeros 5 segundos.',
            },
          ],
        },
        {
          key: 'faceless-first-video',
          title: 'Produce y publica tu primer vídeo',
          summary: 'Guion, voz, edición, miniatura y publicación de principio a fin.',
          estimatedMinutes: 240,
          autoCompleteWhen: { stage: ['started', 'earning'] },
          steps: [
            'Escribe el guion siguiendo tu plantilla de formato. Léelo en voz alta y recorta lo que sobre.',
            'Graba o genera la narración.',
            'Edita: recursos visuales cada 3–5 segundos, subtítulos legibles y música de fondo baja.',
            'Diseña la miniatura con tu plantilla.',
            'Publica con título, descripción con palabras clave y 3–5 etiquetas relevantes.',
          ],
          doneWhen: 'El vídeo está publicado y tienes el enlace.',
          prompts: [
            {
              title: 'Guion de vídeo',
              body: 'Escribe un guion para un vídeo de [duración] sobre "[título]". Estructura: gancho de 5 segundos, contexto breve, 3–5 bloques de desarrollo y cierre con llamada a la acción. Tono: [cercano / informativo]. Señala con [VERIFICAR] cualquier dato que deba comprobar.',
            },
          ],
        },
        {
          key: 'faceless-first-five',
          title: 'Publica tus primeros 5 vídeos',
          summary: 'El primer vídeo no dice nada; cinco ya empiezan a dar datos.',
          estimatedMinutes: 600,
          steps: [
            'Publica según la frecuencia que fijaste, sin cambiar de nicho entre vídeos.',
            'Tras cada vídeo, apunta el tiempo que has tardado en producirlo.',
            'Registra tus métricas en LaunchOS al publicar el quinto vídeo.',
          ],
          doneWhen: 'Cinco vídeos publicados y métricas registradas.',
        },
        {
          key: 'faceless-shorts-repurpose',
          title: 'Convierte cada vídeo largo en 3 cortos',
          summary: 'Aprovecha el trabajo hecho para crecer en TikTok y Shorts.',
          estimatedMinutes: 90,
          when: { answers: { format: ['both'] } },
          steps: [
            'Elige los 3 momentos con más ritmo o el dato más sorprendente de cada vídeo largo.',
            'Recórtalos en formato vertical 9:16, de 20 a 45 segundos.',
            'Añade un gancho de texto en el primer segundo y subtítulos grandes.',
            'Publícalos en Shorts y TikTok enlazando al vídeo completo cuando sea posible.',
          ],
          doneWhen: 'Has publicado al menos 3 cortos derivados de un vídeo largo.',
        },
      ],
    },
    {
      key: 'growth',
      title: 'Optimización y crecimiento',
      description: 'Mide, mejora lo que funciona y prepara la monetización.',
      tasks: [
        {
          key: 'faceless-analytics-review',
          title: 'Analiza tus métricas',
          summary: 'Descubre qué vídeos funcionan y por qué.',
          estimatedMinutes: 60,
          steps: [
            'En YouTube Studio, revisa el CTR de impresiones y la retención media de cada vídeo.',
            'Localiza en la curva de retención el momento donde más gente abandona.',
            'Compara tu mejor y tu peor vídeo: título, miniatura, gancho y tema.',
            'Escribe 3 cambios concretos para los próximos vídeos.',
          ],
          doneWhen: 'Tienes 3 cambios concretos anotados a partir de datos reales.',
          tools: [
            { name: 'YouTube Studio', url: 'https://studio.youtube.com/', purpose: 'Analytics del canal', pricing: 'free' },
          ],
        },
        {
          key: 'faceless-thumbnail-tests',
          title: 'Mejora títulos y miniaturas',
          summary: 'El CTR es la palanca más rápida para conseguir más visualizaciones.',
          estimatedMinutes: 90,
          when: { answers: { format: ['long', 'both'] } },
          steps: [
            'Elige el vídeo con más impresiones y CTR por debajo del 4 %.',
            'Diseña una miniatura alternativa con un enfoque distinto (emoción, contraste o curiosidad).',
            'Usa la función de prueba de miniaturas de YouTube Studio si está disponible en tu canal, o cámbiala manualmente y compara 7 días.',
          ],
          doneWhen: 'Has probado al menos una miniatura alternativa y anotado el resultado.',
        },
        {
          key: 'faceless-monetization',
          title: 'Prepara la monetización',
          summary: 'Conoce los requisitos y abre fuentes de ingresos adicionales.',
          estimatedMinutes: 60,
          steps: [
            'Revisa los requisitos actuales del Programa de Socios de YouTube.',
            'Calcula cuánto te falta para cumplirlos según tu ritmo actual.',
            'Identifica 2 productos afiliados relacionados con tu nicho y añade los enlaces en la descripción cuando sea relevante.',
            'Prepara un documento sencillo con las cifras del canal para futuras colaboraciones con marcas.',
          ],
          doneWhen: 'Conoces tus requisitos pendientes y tienes al menos una fuente de ingresos preparada.',
          tools: [
            { name: 'Programa de Socios de YouTube', url: 'https://support.google.com/youtube/answer/72851', purpose: 'Requisitos de monetización', pricing: 'free' },
          ],
        },
      ],
    },
  ],
};
