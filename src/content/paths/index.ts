import type { AvailablePath, BusinessPath, PlannedPath } from '@/domain/types';
import { facelessPath } from './faceless';
import { saasPath } from './saas';
import { vintedPath } from './vinted';

/**
 * Registro de caminos de negocio.
 *
 * Para añadir un camino nuevo:
 * 1. Crea src/content/paths/<id>.ts exportando un AvailablePath.
 * 2. Sustituye su entrada en PLANNED_PATHS por el objeto importado.
 * Los tests de contenido validan claves únicas y referencias coherentes.
 */
export const AVAILABLE_PATHS: AvailablePath[] = [facelessPath, vintedPath, saasPath];

export const PLANNED_PATHS: PlannedPath[] = [
  { id: 'youtube-tiktok', status: 'planned', name: 'YouTube y TikTok con tu marca personal', tagline: 'Creación de contenido en cámara', category: 'content' },
  { id: 'sneakers-electronics', status: 'planned', name: 'Reventa de zapatillas y electrónica', tagline: 'Producto de alto valor', category: 'commerce' },
  { id: 'dropshipping', status: 'planned', name: 'Dropshipping', tagline: 'Tienda sin stock propio', category: 'commerce' },
  { id: 'ecommerce', status: 'planned', name: 'E-commerce', tagline: 'Tienda online con producto propio', category: 'commerce' },
  { id: 'print-on-demand', status: 'planned', name: 'Print on demand', tagline: 'Diseños impresos bajo pedido', category: 'commerce' },
  { id: 'affiliate', status: 'planned', name: 'Marketing de afiliados', tagline: 'Comisiones por recomendar productos', category: 'content' },
  { id: 'ai-automation-agency', status: 'planned', name: 'Agencia de automatización con IA', tagline: 'Automatizaciones para empresas', category: 'services' },
  { id: 'smma', status: 'planned', name: 'Agencia de redes sociales', tagline: 'Gestión de redes para marcas', category: 'services' },
  { id: 'video-editing-agency', status: 'planned', name: 'Agencia de edición de vídeo', tagline: 'Edición para creadores y marcas', category: 'services' },
  { id: 'web-design', status: 'planned', name: 'Diseño web', tagline: 'Webs para negocios locales y marcas', category: 'services' },
  { id: 'freelancing', status: 'planned', name: 'Freelancing', tagline: 'Vende tus habilidades por proyecto', category: 'services' },
  { id: 'digital-products', status: 'planned', name: 'Productos digitales', tagline: 'Plantillas, cursos y guías', category: 'software' },
  { id: 'ai-tools', status: 'planned', name: 'Herramientas de IA', tagline: 'Productos construidos sobre modelos de IA', category: 'software' },
];

export const ALL_PATHS: BusinessPath[] = [...AVAILABLE_PATHS, ...PLANNED_PATHS];

export function getAvailablePath(id: string): AvailablePath | undefined {
  return AVAILABLE_PATHS.find((p) => p.id === id);
}
