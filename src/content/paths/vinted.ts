import type { AvailablePath } from '@/domain/types';

export const vintedPath: AvailablePath = {
  id: 'vinted-reselling',
  status: 'available',
  name: 'Reventa en Vinted',
  tagline: 'Compra barato, presenta mejor y vende con margen',
  category: 'commerce',
  description:
    'Empieza vendiendo lo que ya tienes para aprender la plataforma y pasa después a comprar producto de segunda mano para revender con un margen controlado.',
  contentVersion: 1,
  idealFor: [
    'Empezar a generar ingresos en pocas semanas',
    'Personas organizadas y con ojo para el producto',
    'Presupuesto bajo: se puede empezar con lo que ya tienes',
  ],
  questions: [
    {
      key: 'source',
      label: '¿Con qué vas a empezar?',
      options: [
        { value: 'own', label: 'Con cosas que ya tengo', description: 'Ropa y artículos propios. Riesgo cero.' },
        { value: 'sourcing', label: 'Comprando para revender', description: 'Tiendas de segunda mano, rastros, lotes.' },
      ],
    },
    {
      key: 'category',
      label: '¿Qué categoría te interesa más?',
      options: [
        { value: 'fashion', label: 'Moda', description: 'Ropa y complementos de marca.' },
        { value: 'streetwear', label: 'Streetwear y zapatillas', description: 'Marcas con demanda y precios altos.' },
        { value: 'kids', label: 'Infantil', description: 'Alta rotación y compradores recurrentes.' },
        { value: 'mixed', label: 'Variado', description: 'Todavía no lo tengo claro.' },
      ],
    },
  ],
  metrics: [
    { key: 'items_listed', label: 'Artículos publicados', unit: 'count', kind: 'flow', help: 'Nuevos artículos publicados desde el último registro.' },
    { key: 'items_sold', label: 'Artículos vendidos', unit: 'count', kind: 'flow', help: 'Ventas cerradas desde el último registro.' },
    { key: 'revenue', label: 'Ingresos', unit: 'currency', kind: 'flow', help: 'Importe cobrado por las ventas.' },
    { key: 'cost_of_goods', label: 'Coste del producto', unit: 'currency', kind: 'flow', help: 'Lo que pagaste por los artículos vendidos o comprados.' },
  ],
  phases: [
    {
      key: 'foundations',
      title: 'Fundamentos',
      description: 'Entiende cómo funciona Vinted y tus obligaciones antes de vender.',
      tasks: [
        {
          key: 'vinted-how-it-works',
          title: 'Aprende cómo funciona Vinted',
          summary: 'Comisiones, envíos, protección al comprador y valoraciones.',
          estimatedMinutes: 45,
          when: { experience: ['none', 'some'] },
          autoCompleteWhen: { stage: ['earning'] },
          steps: [
            'Lee en el centro de ayuda de Vinted cómo se pagan las ventas y cuándo se libera el dinero.',
            'Revisa cómo funciona el envío: quién paga, puntos de entrega y plazos para enviar.',
            'Entiende la protección al comprador y qué ocurre si un comprador abre una reclamación.',
            'Anota qué influye en la visibilidad de un artículo (fotos, precio, actividad, valoraciones).',
          ],
          doneWhen: 'Sabes cómo cobras, cómo envías y cómo se gestiona una reclamación.',
          tools: [
            { name: 'Centro de ayuda de Vinted', url: 'https://www.vinted.es/help', purpose: 'Normas, envíos y pagos', pricing: 'free' },
          ],
        },
        {
          key: 'vinted-taxes',
          title: 'Conoce tus obligaciones fiscales',
          summary: 'Vender lo tuyo y revender con ánimo de lucro no se tratan igual.',
          estimatedMinutes: 30,
          steps: [
            'Infórmate sobre la directiva DAC7: las plataformas comunican a Hacienda los datos de vendedores que superan 30 ventas o 2.000 € al año.',
            'Diferencia entre vender objetos personales usados y comprar para revender de forma habitual (actividad económica).',
            'Si vas a revender de forma habitual, consulta con un asesor fiscal tu situación concreta antes de escalar.',
          ],
          doneWhen: 'Conoces los umbrales de DAC7 y has decidido si necesitas asesoramiento.',
          tools: [
            { name: 'Agencia Tributaria', url: 'https://sede.agenciatributaria.gob.es/', purpose: 'Información oficial', pricing: 'free' },
          ],
          tips: ['LaunchOS no ofrece asesoramiento fiscal. Esta tarea es orientativa.'],
        },
        {
          key: 'vinted-market-research',
          title: 'Investiga precios y demanda',
          summary: 'Aprende qué se vende, a qué precio y en cuánto tiempo.',
          estimatedMinutes: 90,
          steps: [
            'Busca en Vinted 10 marcas o tipos de producto de tu categoría.',
            'Filtra por "Vendido" cuando esté disponible o fíjate en los favoritos y en la fecha de publicación para estimar la rotación.',
            'Anota en una hoja de cálculo el precio medio de venta de cada producto según su estado.',
            'Marca las 5 marcas o productos con mejor combinación de precio y rotación.',
          ],
          doneWhen: 'Tienes una hoja con precios de referencia de al menos 10 productos y 5 seleccionados.',
          tools: [
            { name: 'Google Sheets', url: 'https://sheets.google.com/', purpose: 'Hoja de precios de referencia', pricing: 'free' },
          ],
        },
      ],
    },
    {
      key: 'setup',
      title: 'Preparación',
      description: 'Perfil, inventario y un sistema para fotografiar y publicar.',
      tasks: [
        {
          key: 'vinted-profile',
          title: 'Configura un perfil que genere confianza',
          summary: 'Los compradores miran el perfil antes de pagar.',
          estimatedMinutes: 30,
          autoCompleteWhen: { stage: ['started', 'earning'] },
          steps: [
            'Crea tu cuenta y verifica el correo y el teléfono.',
            'Añade una foto de perfil clara y una descripción breve: qué vendes, cómo envías y en qué plazo.',
            'Configura tus opciones de envío y añade tu cuenta bancaria para recibir pagos.',
          ],
          doneWhen: 'Perfil completo, verificado y con método de cobro configurado.',
          tools: [{ name: 'Vinted', url: 'https://www.vinted.es/', purpose: 'Plataforma de venta', pricing: 'free' }],
        },
        {
          key: 'vinted-inventory-sheet',
          title: 'Crea tu hoja de inventario',
          summary: 'Controla cada artículo: coste, precio, estado y beneficio.',
          estimatedMinutes: 45,
          steps: [
            'Crea una hoja con columnas: artículo, marca, talla, coste, precio de publicación, fecha de publicación, fecha de venta, precio final y beneficio.',
            'Añade una fórmula de beneficio: precio final menos coste.',
            'Registra cada artículo antes de publicarlo.',
          ],
          doneWhen: 'La hoja existe y tiene al menos los artículos que vas a publicar esta semana.',
          tools: [{ name: 'Google Sheets', url: 'https://sheets.google.com/', purpose: 'Inventario', pricing: 'free' }],
        },
        {
          key: 'vinted-photo-setup',
          title: 'Prepara tu espacio de fotos',
          summary: 'Fotos consistentes venden más y más rápido.',
          estimatedMinutes: 60,
          steps: [
            'Elige un fondo neutro (pared blanca, suelo de madera claro o una sábana lisa).',
            'Haz fotos con luz natural indirecta, nunca con flash.',
            'Define tu secuencia: frontal, trasera, etiqueta, detalle de tejido y cualquier defecto.',
            'Plancha o vaporiza la ropa antes de fotografiarla.',
          ],
          doneWhen: 'Has hecho una sesión de prueba con un artículo siguiendo la secuencia completa.',
        },
        {
          key: 'vinted-sourcing',
          title: 'Encuentra tus primeras fuentes de producto',
          summary: 'Compra con margen: el beneficio se decide al comprar, no al vender.',
          estimatedMinutes: 180,
          when: { answers: { source: ['sourcing'] } },
          steps: [
            'Localiza 3 fuentes cercanas: tiendas de segunda mano, rastros, mercadillos o lotes en Wallapop.',
            'Fija tu regla de compra: solo compras si el precio de venta estimado es al menos 3 veces el coste.',
            'Antes de comprar, consulta en Vinted el precio real de ese artículo.',
            'Haz una primera compra pequeña (máximo el 20 % de tu presupuesto) para probar.',
          ],
          doneWhen: 'Has hecho tu primera compra de prueba y la has registrado en el inventario.',
          tools: [
            { name: 'Wallapop', url: 'https://es.wallapop.com/', purpose: 'Lotes y artículos por debajo de precio', pricing: 'free' },
          ],
        },
      ],
    },
    {
      key: 'launch',
      title: 'Primeras ventas',
      description: 'Publica, vende y aprende de los primeros resultados.',
      tasks: [
        {
          key: 'vinted-first-listings',
          title: 'Publica tus primeros 10 artículos',
          summary: 'El volumen de artículos activos aumenta tu visibilidad.',
          estimatedMinutes: 150,
          autoCompleteWhen: { stage: ['earning'] },
          steps: [
            'Escribe títulos con el formato: marca + tipo de prenda + detalle + talla.',
            'En la descripción incluye medidas, estado real, defectos y composición.',
            'Fija el precio con tu hoja de referencia: ligeramente por encima para dejar margen a ofertas.',
            'Publica en franjas con más actividad (tardes y domingos).',
          ],
          doneWhen: 'Tienes 10 artículos publicados y registrados en tu inventario.',
          prompts: [
            {
              title: 'Descripción de artículo',
              body: 'Escribe una descripción para Vinted de este artículo: [marca, prenda, talla, estado, defectos, medidas]. Tono cercano y honesto, máximo 600 caracteres, con las medidas en una lista y sin exagerar el estado.',
            },
          ],
        },
        {
          key: 'vinted-shipping-routine',
          title: 'Crea tu rutina de envíos',
          summary: 'Enviar rápido mejora tus valoraciones.',
          estimatedMinutes: 30,
          steps: [
            'Consigue material de embalaje (bolsas, cajas reutilizadas y cinta).',
            'Fija un momento del día para preparar y llevar envíos.',
            'Envía siempre en las primeras 48 horas y añade una nota de agradecimiento.',
          ],
          doneWhen: 'Tienes material de envío y una franja fija para enviar.',
        },
        {
          key: 'vinted-first-sale',
          title: 'Cierra tu primera venta',
          summary: 'Responde rápido, negocia con criterio y envía bien.',
          estimatedMinutes: 60,
          autoCompleteWhen: { stage: ['earning'] },
          steps: [
            'Responde a los mensajes en menos de una hora cuando puedas.',
            'Decide de antemano tu precio mínimo para cada artículo.',
            'Usa las ofertas a interesados para los artículos con favoritos.',
            'Registra la venta en tu inventario y en las métricas de LaunchOS.',
          ],
          doneWhen: 'Has vendido y enviado tu primer artículo.',
        },
      ],
    },
    {
      key: 'growth',
      title: 'Escalar',
      description: 'Rota inventario, sube el ticket medio y profesionaliza.',
      tasks: [
        {
          key: 'vinted-weekly-review',
          title: 'Haz tu primera revisión semanal',
          summary: 'Decide con datos qué bajar de precio, qué republicar y qué comprar.',
          estimatedMinutes: 45,
          steps: [
            'Revisa los artículos con más de 21 días sin vender.',
            'Baja el precio un 10 % o mejora las fotos de los que tengan visitas pero no favoritos.',
            'Calcula tu beneficio medio por artículo y tu tiempo medio de venta.',
            'Decide qué categoría o marca priorizar la próxima semana.',
          ],
          doneWhen: 'Has revisado tu inventario y anotado 2 decisiones para la próxima semana.',
        },
        {
          key: 'vinted-bundles',
          title: 'Activa descuentos por lote',
          summary: 'Aumenta el ticket medio y reduce envíos.',
          estimatedMinutes: 20,
          steps: [
            'Activa los descuentos por lote en la configuración de tu perfil.',
            'Agrupa artículos complementarios de la misma talla.',
            'Menciónalo en tu descripción de perfil.',
          ],
          doneWhen: 'Descuentos por lote activos.',
        },
        {
          key: 'vinted-scale-sourcing',
          title: 'Reinvierte con una regla fija',
          summary: 'Crece sin perder el control del dinero.',
          estimatedMinutes: 45,
          when: { budget: ['low', 'medium', 'high'] },
          steps: [
            'Decide qué porcentaje del beneficio reinviertes en producto (por ejemplo, el 50 %).',
            'Prioriza las marcas con mejor beneficio medio según tu inventario.',
            'Fija un límite de inventario sin vender para no inmovilizar dinero.',
          ],
          doneWhen: 'Tienes una regla de reinversión escrita y un límite de inventario.',
        },
      ],
    },
  ],
};
