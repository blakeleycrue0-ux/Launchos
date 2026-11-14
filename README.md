# MIO — finanzas personales

*Tu dinero. Tus planes. Todo claro.* App móvil (iOS y Android) con React Native + Expo + TypeScript.

## Arrancar

```bash
npm install
npx expo start          # escanea el QR con Expo Go, o pulsa i / a / w
npm test                # 69 tests de dominio, datos local e i18n
npm run test:db         # migración SQL + RLS en un PostgreSQL embebido (PGlite)
npm run typecheck
```

Sin configuración, MIO arranca en **modo local**: sin cuenta, datos solo en el dispositivo.
Para activar cuentas de usuario copia `.env.example` a `.env` y rellena la URL y la clave **pública** (anon) de tu proyecto Supabase,
y aplica `supabase/migrations/*.sql` (ver `docs/PLAN.md` → «Pendiente de ti»).

## Estado de la Fase 1 (qué está probado y qué no)

| Funcionalidad | Estado |
|---|---|
| Sistema de diseño, tema claro/oscuro/auto, ES/EN | Implementado; recorrido en navegador (web) en claro y oscuro |
| Onboarding de 4 pasos con progreso guardado | Implementado y probado (web) |
| Cuentas manuales, saldo calculado, transferencias | Implementado; lógica con tests; flujo probado (web) |
| Registrar / editar / borrar movimientos, teclado numérico, búsqueda, filtros, CSV | Implementado; flujo probado (web) |
| **Disponible para gastar** | Implementado: saldo de cuentas gastables − reservas. Las reservas (pagos, deudas, ahorro) valen 0 hasta las Fases 2–3 |
| Mascota animada (parpadeo, flotación, expresiones) | Implementada; verificada visualmente en web |
| Esquema SQL + RLS + borrar cuenta | Probado con PGlite (aislamiento entre usuarios, FKs compuestas, idempotencia, borrado en cascada) |
| Auth Supabase (email, login, recuperar, cerrar sesión, eliminar cuenta) | Implementado; **no probado contra un proyecto real** (solo validaciones y errores de red) |
| Háptica, safe areas, Dynamic Island, teclado | Implementado con APIs nativas; **no probado en iPhone/Android físicos** |
| Apple / Google Sign In | **No implementado** (ver `docs/PLAN.md`) |
| Asistente de IA, ¿Puedo comprarlo?, pagos recurrentes, grupos, pareja, objetivos, estadísticas, notificaciones, suscripción | Fases 2–4, **aún no construidos** |
