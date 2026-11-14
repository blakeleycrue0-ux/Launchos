# MIO — análisis, arquitectura y plan

## 1. Lectura de las referencias visuales

- **Neumorfismo gris** (widget): superficies del mismo tono que el fondo, profundidad solo con luz y sombra suaves, radios muy grandes, tipografía ancha.
- **Mascota** (esfera oscura, dos ojos verticales, anillo luminoso con halo violeta/magenta): personaje mínimo, único punto de color de toda la identidad.
- **Cristal esmerilado** (tarjeta verde, carpetas, «Daily Insights»): capas translúcidas con desenfoque; se usa con moderación (no se ha adoptado en Fase 1 para no sacrificar rendimiento ni legibilidad).
- **Calendario Nothing-style** (cifra enorme, puntos negros/grises): jerarquía radical por tamaño; un número protagonista.
- **Pantallas de acceso** (Qanun, Untitled UI, Beside): formularios limpios, un solo botón primario negro/blanco en forma de píldora, bienvenida oscura con un resplandor.
- **Credit Factors**: tarjetas redondeadas con mucho aire y micro-métricas.

**Identidad resultante:** monocromo (carbón, blanco, grises), tipografía Manrope, radios 20–36 px, botones píldora, una cifra gigante por pantalla, sombras suaves en claro y bordes finos en oscuro. Sin colores de acento ni emojis; el único color es la mascota.

## 2. Sistema de diseño (`src/theme`, `src/ui`)

| Token | Valor |
|---|---|
| Color claro | bg `#ECECEA` · surface `#F7F7F5` · ink `#0B0B0C` · soft `#5E5E63` · faint `#9B9BA0` |
| Color oscuro | bg `#09090A` · surface `#141416` · ink `#F4F4F2` · soft `#A3A3A9` · faint `#66666C` |
| Radios | 12 · 20 · 28 · 36 · píldora |
| Tipografía | display 56/800 · title 30/700 · headline 19/700 · body 16/500 · caption 13 · micro 11 (mayúsculas) |
| Espaciado | base 4 px; márgenes de pantalla 20 px |
| Componentes | Text, Button, Card, Chip, Field, Segmented, Sheet, Numpad, Screen, EmptyState, Icon (24 px, trazo 1.8), Mascot |
| Movimiento | muelles (Reanimated) en cada pulsación, entradas con fundido, la mascota respeta «reducir movimiento» |
| Estados | carga (splash hasta datos), vacío (mascota + una acción), error de conexión (reintento) |

## 3. Arquitectura

```
app/                Expo Router: (auth) · (onboarding) · (tabs) · modales; guardas con Stack.Protected
src/domain/         Lógica financiera PURA y determinista (importes en unidades menores, enteros)
src/data/           Repository (contrato) → localRepo (dispositivo) | supabaseRepo (PostgreSQL + RLS)
src/features/       Pantallas compuestas (editor de movimientos, bienvenida, auth…)
src/ui, src/theme   Sistema de diseño
src/i18n            es / en con test de paridad y de claves usadas
supabase/           Migraciones SQL + pruebas de RLS (PGlite)
```

Decisiones clave
- **Dinero:** `bigint` en SQL y enteros en TS. Reparto con método del mayor resto (`allocate`), sin perder céntimos.
- **Idempotencia:** el cliente genera el UUID del movimiento; todas las escrituras son *upsert* por id → reintentar tras un corte de red no duplica. Mutaciones optimistas con retroceso si fallan.
- **Transferencias:** una sola fila con origen y destino (atómica por diseño, no cuenta como ingreso ni gasto).
- **Seguridad:** `user_id` lo pone la base (`default auth.uid()`), nunca el cliente; RLS en todas las tablas; claves foráneas compuestas `(id, user_id)` impiden referenciar filas de otro usuario; la clave `service_role` nunca está en la app; sesión en SecureStore (troceada).
- **Disponible para gastar** (`availableToSpend`): cuentas gastables (excluye «Ahorros») − pagos reservados − deudas reservadas − ahorro protegido. Lo que te deben **nunca** se suma.
- **IA:** no existe aún. Los cálculos financieros ya son deterministas; cuando se añada, el modelo solo redactará y llamará a esas funciones desde un backend (Edge Function), sin claves en la app.

## 4. Fases

**Fase 1 — Base funcional (construida):** proyecto Expo, sistema de diseño, navegación, onboarding, auth Supabase, esquema (perfiles, cuentas, categorías, movimientos), cuentas manuales, movimientos, dashboard, disponible, ajustes, exportación CSV/JSON, eliminar datos.

**Fase 2 — Diferenciación:** ¿Puedo comprarlo? (`canAfford` determinista), pagos recurrentes + calendario + conciliación sin duplicados, deudas personales, grupos (invitaciones seguras y revocables), división (igual, %, importes, exclusiones, varios pagadores), liquidaciones, conexión con finanzas personales (gasto propio vs. pendiente de cobro). Migraciones nuevas: `recurring_payments`, `debts`, `groups`, `group_members`, `group_expenses`, `group_expense_shares`, `settlements`, `invitations`. Los permisos de grupo se prueban con PGlite como la RLS actual.

**Fase 3 — Experiencia avanzada:** pareja, objetivos (reservas contables), estadísticas en grises, notificaciones (Expo Notifications), asistente (primero respuestas calculadas, luego API vía backend).

**Fase 4 — Lanzamiento:** pruebas E2E en dispositivo, auditoría de seguridad, rendimiento, accesibilidad (VoiceOver/TalkBack), localización, textos legales revisados, builds EAS iOS/Android, suscripciones.

## 5. Pendiente de ti (dependencias externas y credenciales)

| Qué | Para qué |
|---|---|
| Proyecto Supabase (URL + clave anon en `.env`) | Cuentas de usuario; **no se ha aplicado ninguna migración a ningún proyecto remoto** sin tu aprobación |
| Aplicar `supabase/migrations/*.sql` | Esquema + RLS |
| Confirmación de email / plantillas de correo y URL de redirección | Registro y recuperar contraseña |
| Apple Developer (Sign in with Apple) + `expo-apple-authentication` | Botón de Apple (no se muestra hasta estar configurado) |
| Google Cloud OAuth (iOS/Android/Web client IDs) + Supabase Google provider | Botón de Google (idem) |
| Cuenta Expo/EAS, iconos y *splash* finales | Builds iOS/Android |
| App Store Connect / Google Play (productos de suscripción, RevenueCat o StoreKit) | Premium 2,99 €/mes — no se cobra nada hasta definirlo |
| Clave de proveedor de IA en una Edge Function | Asistente completo (Fase 3) |
| Textos legales y política de privacidad revisados por un profesional | Lanzamiento |

## 6. Límites conocidos de la Fase 1

- No hay selector de fecha nativo (se navega por días con ‹ ›).
- En un ajuste de saldo no se puede introducir un saldo real negativo.
- Una sola moneda por usuario (se bloquea cambiarla con movimientos).
- La lista de movimientos carga todo el historial en memoria; hará falta paginación con miles de filas.
- «Gastos recurrentes principales» y «objetivo de ahorro» del onboarding se difieren a Fase 2/3 (necesitan sus tablas).
- Las pestañas inactivas siguen montadas (coste de memoria menor).
