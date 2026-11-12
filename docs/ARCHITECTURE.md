# Arquitectura de LaunchOS

Este documento recoge las decisiones técnicas, el modelo de datos y el plan por fases.

## 1. Estado inicial del repositorio

El repositorio estaba vacío (sin commits ni archivos), así que no había tecnología previa que conservar. Todo se ha construido desde cero.

## 2. Stack

| Capa | Elección | Motivo |
|---|---|---|
| Lenguaje | TypeScript (strict, `noUncheckedIndexedAccess`) | Seguridad de tipos en dominio, contenido y BD |
| UI | React 19 | Estándar, ecosistema, contratación |
| Build | Vite 7 | Rápido y genera un SPA estático, ideal para Netlify |
| Routing | React Router 7 (modo librería) | Rutas anidadas, protegidas y con carga diferida |
| Datos del servidor | TanStack Query 5 | Caché, reintentos, estados de carga y error, actualizaciones optimistas |
| Backend | Supabase (Auth + Postgres + RLS) | Autenticación real y persistencia sin servidor propio |
| Validación | Zod | Variables de entorno y formularios |
| Estilos | CSS con design tokens (sin framework) | Control total del diseño, sin dependencias, bundle pequeño |
| Tipografía | Inter Variable (autoalojada con @fontsource) | Sin peticiones a terceros y buena legibilidad |
| Tests | Vitest | Lógica de dominio, contenido y métricas |
| Lint | ESLint 9 + typescript-eslint + react-hooks | |
| Hosting | Netlify (SPA con redirect `/* → /index.html`) | |

**¿Por qué un SPA y no SSR (Next.js)?** Toda la app está detrás de un login: no hay SEO que ganar en las pantallas privadas. Un SPA estático es más simple de desplegar en Netlify, no necesita funciones de servidor y la seguridad recae en RLS. Si más adelante hace falta una web pública de marketing, puede ir en un proyecto aparte o como páginas estáticas.

## 3. Principio clave: el contenido vive en el código y el estado en la base de datos

- **Contenido** (caminos, fases, tareas, pasos, herramientas, prompts, métricas): en `src/content/paths/*.ts`, con tipos estrictos y tests. Se versiona en Git, se revisa en pull requests y se despliega junto con la UI.
- **Estado del usuario** (proyectos, estado de las tareas, notas, métricas): en Supabase. Las tareas guardan una `template_key` que apunta al contenido.

Ventajas: no hace falta un CMS en la fase 1, las tareas pueden mejorar sin migraciones, el contenido es testeable (claves únicas, condiciones válidas, URLs https) y añadir un camino es añadir un archivo.

Contrapartidas, ya cubiertas:
- **Una `template_key` publicada no se puede renombrar.** Si se elimina una plantilla, el dashboard oculta esa tarea y muestra un aviso (`orphanCount`).
- `projects.content_version` registra con qué versión del roadmap se generó el proyecto, para poder migrar proyectos antiguos más adelante.
- Si en el futuro el equipo de contenido no técnico necesita editar, se puede mover a tablas `path_*` sin cambiar el modelo de estado.

## 4. Generación del roadmap

`generateRoadmap(path, contexto)` (`src/domain/roadmap.ts`) es una función pura:

1. Recorre fases y plantillas en orden.
2. Incluye una tarea si cumple su condición `when` (experiencia, presupuesto, horas, etapa y respuestas específicas del camino). Dentro de cada criterio basta con cumplir una opción (OR) y entre criterios hay que cumplirlos todos (AND).
3. La marca como `done` si cumple `autoCompleteWhen`, por ejemplo cuando la persona ya tiene el canal creado.
4. Asigna posiciones consecutivas.

El cliente genera la lista y la envía a la RPC `create_project_with_tasks`, que crea el proyecto y sus tareas **en una única transacción** (si algo falla, no queda un proyecto a medias). La RPC es `SECURITY INVOKER`, así que RLS aplica a cada insert.

La **próxima acción recomendada** es la primera tarea `in_progress` o, si no hay, la primera `todo` por posición. El **progreso** es `done / (total − skipped)`.

La **orientación** ("No lo tengo claro") es un sistema de puntuación determinista y testeado (`src/content/guidance.ts`). No usa IA ni muestra caminos no disponibles.

## 5. Modelo de datos

```
auth.users (Supabase)
   │ 1:1
   ▼
profiles ──────────────┐ active_project_id (FK, on delete set null)
   │                   │
   │ 1:N (user_id)     ▼
   └──────────────► projects
                       │ 1:N (on delete cascade)
           ┌───────────┴────────────┐
           ▼                        ▼
     project_tasks            metric_entries
```

### `profiles`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK → auth.users | se crea con un trigger al registrarse |
| display_name | text ≤ 80 | |
| active_project_id | uuid → projects | último proyecto abierto ("continuar donde lo dejé") |
| created_at / updated_at | timestamptz | |

### `projects`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → auth.users | por defecto `auth.uid()`, inmutable |
| path_id | text | clave del camino (`faceless`, `vinted-reselling`, `apps-saas`) |
| name | text 1–80 | |
| goal | text ≤ 500 | personaliza los prompts |
| status | `active` \| `paused` \| `archived` | |
| experience | `none` \| `some` \| `experienced` | |
| budget | `zero` \| `low` \| `medium` \| `high` | |
| weekly_hours | `h0_5` \| `h5_10` \| `h10_20` \| `h20_plus` | |
| stage | `idea` \| `started` \| `earning` | |
| path_answers | jsonb (objeto) | respuestas específicas del camino |
| content_version | int | versión del roadmap usada |

Las respuestas de situación se guardan **por proyecto** y no en el perfil: una persona puede tener mucha experiencia en un área y empezar de cero en otra.

### `project_tasks`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| project_id | uuid → projects (cascade) | |
| user_id | uuid | desnormalizado para que RLS sea simple y rápido |
| template_key | text | `unique (project_id, template_key)` |
| phase_key | text | |
| position | int ≥ 0 | |
| status | `todo` \| `in_progress` \| `done` \| `skipped` | |
| notes | text ≤ 5000 | |
| started_at / completed_at | timestamptz | los mantiene un trigger según el estado |

### `metric_entries`
Una serie temporal simple: `metric_key`, `value numeric(14,2) ≥ 0`, `recorded_on date`, `note`. Las definiciones (etiqueta, unidad, `snapshot` o `flow`) están en el contenido de cada camino:
- `snapshot` (seguidores, MRR): se muestra el último valor y la variación respecto al registro anterior.
- `flow` (ventas, ingresos): se muestra la suma total y la de los últimos 30 días.

### Seguridad (RLS)
- RLS está activado en las 4 tablas. Cada política exige `user_id = auth.uid()` (`id` en el caso de `profiles`), solo para el rol `authenticated`.
- Los inserts y updates de tareas y métricas exigen además `owns_project(project_id)`: no se pueden colgar filas de proyectos ajenos.
- Hay triggers que impiden cambiar el propietario de un proyecto o mover tareas o métricas a otro proyecto.
- Al actualizar el perfil, `active_project_id` solo puede apuntar a un proyecto propio.
- Las funciones fijan `search_path = ''`. La RPC solo se puede ejecutar con el rol `authenticated`.
- El frontend usa únicamente la clave publicable. La clave `service_role` no se usa en ninguna parte.

## 6. Estructura de carpetas

```
src/
  app/               router, pantallas globales (config, 404)
  components/
    layout/          AppShell (sidebar responsive), PageHeader
    ui/              Button, Field, OptionGroup, Progress, States, Icon, Logo
  config/brand.ts    nombre y ruta del logo oficial
  content/
    paths/           un archivo por camino + registro (index.ts)
    guidance.ts      motor de orientación
    options.ts       opciones comunes (experiencia, presupuesto…)
  domain/            tipos, roadmap y progreso (lógica pura + tests)
  features/
    auth/            proveedor de sesión, rutas protegidas, login/registro/recuperación
    onboarding/      asistente de creación de proyecto
    projects/        hooks de datos, lista, ajustes, redirección de inicio
    dashboard/       panel del proyecto
    tasks/           detalle de tarea, toggle de estado
    metrics/         registro, resumen e historial
  lib/               cliente Supabase, tipos de BD, env, errores, formato
  styles/            tokens, base, componentes, layout, pantallas
supabase/migrations/ SQL versionado
```

## 6 bis. Interfaz

- **Navegación:** barra lateral con selector de proyecto en escritorio; cabecera y pestañas inferiores en móvil (`AppShell`). El onboarding y la landing van a pantalla completa, fuera del shell, y se cargan aparte.
- **Actividad:** no tiene tabla propia. `buildActivity` (`src/domain/activity.ts`) la deriva de las fechas de tareas y métricas ya guardadas; las tareas marcadas automáticamente al crear el proyecto no cuentan como actividad.
- **Gráficas:** SVG propio (`src/components/charts`), una serie por gráfica, eje desde cero, tooltip con cursor, toque o flechas; la tabla de historial es la vista alternativa. `buildSeries` da un punto por día (último valor o acumulado según el tipo de métrica).
- **Transición entre pantallas:** `FrozenOutlet` conserva la pantalla saliente durante su animación para que la entrante se monte una sola vez.
- **Cortina (`Curtain`):** vive fuera del router para cubrir el paso del onboarding al resumen; solo se muestra tras la confirmación de Supabase.
- **Landing:** la demostración usa `generateRoadmap`, el mismo cálculo que la app; las cifras de caminos y herramientas salen del contenido. Los únicos datos inventados son la serie de la gráfica, etiquetada como demostración.

## 7. Plan por fases

| Fase | Contenido | Estado |
|---|---|---|
| **1. Base** | Stack, auth real, onboarding, proyectos, roadmap, tareas, progreso, métricas, RLS, despliegue | Migración aplicada en `plfnmdrrmwzrvthemraq` y verificada contra Supabase real; falta SMTP propio y el despliegue en Netlify |
| 2. Producto | Hecho: cuenta, gráficas de métricas, landing, navegación móvil. Pendiente: regenerar el roadmap al cambiar las respuestas, tareas personalizadas, recordatorios por email, modo oscuro, borrado de cuenta | En curso |
| 3. Contenido | Más caminos (uno por iteración), revisión editorial, recursos por tarea, versionado y migración de roadmaps | Pendiente |
| 4. Inteligencia | Asistente con IA por tarea (Edge Function, sin exponer claves), recomendaciones basadas en métricas | Pendiente |
| 5. Negocio | Planes de pago (Stripe), analítica de producto, panel interno | Pendiente |

## 8. Riesgos y dependencias

- **Proyecto de Supabase:** `plfnmdrrmwzrvthemraq` (eu-central-1). Migraciones aplicadas: `initial_schema` y `profiles_active_project_index`. El análisis de seguridad de Supabase no da avisos.
- **Verificación de RLS** (`2026-11-11`, contra la base real, con dos usuarios y el rol anónimo): 22 comprobaciones OK. Un usuario no puede leer, modificar, borrar ni colgar filas de proyectos ajenos; el rol anónimo no tiene acceso; no se puede cambiar el propietario de un proyecto.
- **Email (bloqueante para producción):** la confirmación por email está activada y el SMTP integrado de Supabase solo permite unos pocos emails por hora (devolvió `429` en el segundo registro). Hay que configurar un SMTP propio (Resend, Postmark, SES…) en *Authentication → Emails → SMTP Settings*.
- **URLs de autenticación:** configurar *Site URL* = `https://launchos-8hq2.netlify.app` y *Redirect URLs* = `https://launchos-8hq2.netlify.app/app`, `https://launchos-8hq2.netlify.app/reset-password` y `http://localhost:5173/**`. Si no, los enlaces de confirmación apuntan a la URL por defecto.
- **Netlify:** el sitio `launchos-8hq2` pertenece a un equipo al que la cuenta conectada no tiene permiso de escritura (403), no tiene ningún despliegue y exige login SSO del equipo para verlo (*Visitor access*), lo que impediría el acceso a usuarios públicos.
- **Calidad del contenido.** Las tareas son orientativas. La tarea fiscal de Vinted advierte de que no es asesoramiento.
- **Renombrar `template_key`** rompe la relación con las tareas guardadas (está documentado y aparece aviso en la UI).
- **Logo.** Hasta recibir el archivo oficial se muestra solo el nombre "LaunchOS".
