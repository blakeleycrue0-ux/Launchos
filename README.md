# LaunchOS

LaunchOS es un sistema operativo para emprendedores digitales: ayuda a elegir qué construir, evaluar tu punto de partida, seguir un roadmap personalizado con tareas reales y medir resultados.

> Estado: **fase 1**. Autenticación, onboarding, proyectos, roadmap, tareas, progreso y métricas. Tres caminos disponibles: **Faceless content**, **Reventa en Vinted** y **Apps & SaaS**. El resto aparece como "En preparación".

## Stack

React 19 · TypeScript · Vite · React Router · TanStack Query · Supabase (Auth, Postgres, RLS) · Netlify.
Las decisiones y el modelo de datos están en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Puesta en marcha local

Requisitos: Node 20 o superior.

```bash
npm install
cp .env.example .env.local   # rellena VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Sin variables de entorno, la app muestra una pantalla que explica qué falta configurar.

## Base de datos

El esquema está en `supabase/migrations/`. Para aplicarlo en un proyecto **dedicado** a LaunchOS:

- **SQL Editor de Supabase**: pega y ejecuta el contenido de `supabase/migrations/20261111120000_initial_schema.sql`.
- **CLI**: `npx supabase link --project-ref <ref>` y después `npx supabase db push`.

Configuración en Supabase → Authentication → URL Configuration:
- **Site URL**: la URL de Netlify (p. ej. `https://launchos-8hq2.netlify.app`).
- **Redirect URLs**: `https://<tu-dominio>/app`, `https://<tu-dominio>/reset-password` y `http://localhost:5173/**` para desarrollo local.

## Despliegue en Netlify

`netlify.toml` ya define el build (`npm run build`), la carpeta publicada (`dist`), el redirect del SPA y las cabeceras de seguridad. Solo falta añadir en *Site configuration → Environment variables*:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clave publicable (`sb_publishable_…`) o clave anon |

Ambas son públicas por diseño (acaban en el navegador). **Nunca** uses la clave `service_role` ni una `sb_secret_…` en el frontend ni la subas al repositorio.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck y build de producción |
| `npm run typecheck` | Solo TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Tests (Vitest) |
| `npm run check` | Typecheck, lint y tests |

## Añadir un camino de negocio

1. Crea `src/content/paths/<id>.ts` exportando un `AvailablePath` (fases, tareas, preguntas y métricas).
2. Regístralo en `AVAILABLE_PATHS` y quítalo de `PLANNED_PATHS` en `src/content/paths/index.ts`.
3. Ejecuta `npm test`: los tests de contenido comprueban que las claves son únicas, que las condiciones apuntan a preguntas existentes y que las URLs son https.

Las `key` de las tareas son permanentes: la base de datos las referencia.

## Logo

El logo oficial se configura en `src/config/brand.ts` (`logoSrc`) cuando el archivo original esté en `public/brand/`. Hasta entonces solo se muestra el nombre.
