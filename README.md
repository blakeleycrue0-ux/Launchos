# MIO — finanzas personales

*Tu dinero. Tus planes. Todo claro.* App móvil (iOS y Android) con React Native + Expo + TypeScript.

## Arrancar

```bash
npm install
npx expo start          # escanea el QR con Expo Go, o pulsa i / a / w
npm test                # 111 tests de dominio, datos local e i18n
npm run test:db         # migración SQL + RLS en un PostgreSQL embebido (PGlite)
npm run typecheck
```

Sin configuración, MIO arranca en **modo local**: sin cuenta, datos solo en el dispositivo.
Para activar cuentas de usuario copia `.env.example` a `.env` y rellena la URL y la clave **pública** (anon) de tu proyecto Supabase,
y aplica `supabase/migrations/*.sql` (ver `docs/PLAN.md` → «Pendiente de ti»).

## Estado actual (qué está probado y qué no)

Rediseño premium en curso: sistema visual (negro, carbón, champagne), iconos Lucide y tres pantallas principales
(Inicio, Nuevo movimiento, Grupos). Capturas en `docs/preview/`, auditoría en `docs/AUDIT.md`.

| Funcionalidad | Estado |
|---|---|
| Inicio, Nuevo movimiento, Grupos (rediseñadas) | Probadas en navegador a 390×844 y 375×667, claro y oscuro |
| Disponible para gastar + «Cómo se calcula» | Saldo gastable − pagos de los próximos 30 días − ahorro reservado en objetivos. Deudas a 0 (aún no existen) |
| Pagos y suscripciones | Crear, editar, pausar, borrar; próximos 30 días; marcar como pagado crea el gasto real sin duplicar (tests + navegador) |
| Objetivos de ahorro | Reservar y retirar con límites, progreso y cuota mensual necesaria (tests + navegador) |
| Grupos | Crear, editar, borrar, foto y presupuesto. **Sin** invitaciones, reparto ni liquidación todavía |
| ¿Puedo comprarlo? | Simulación determinista con el disponible actual (tests) |
| MIO AI | Respuestas calculadas por palabras clave. **No hay modelo de IA conectado** |
| Esquema SQL + RLS (incluidos grupos y miembros) | Probado con PGlite |
| Auth Supabase | Implementado; **no probado contra un proyecto real** |
| Dispositivo físico (safe areas, háptica, teclado) | **No probado** |
| Mascota | Archivo provisional recortado del JPEG recibido; pendiente del PNG oficial (`assets/mascot/mio.png`) |
| Reparto de gastos en grupos, deudas, Análisis, notificaciones, Apple/Google | **Sin construir** |
