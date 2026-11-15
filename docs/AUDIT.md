# Auditoría del proyecto (antes del rediseño)

**Framework y arquitectura:** Expo SDK 58 + React Native 0.88 + TypeScript, Expo Router, TanStack Query, Zustand, Reanimated.
Lógica financiera pura en `src/domain` (importes en céntimos enteros), acceso a datos tras un contrato `Repository`
con dos implementaciones: local (dispositivo) y Supabase (PostgreSQL + RLS).

## Se conserva (funcionaba y estaba probado)
- Dominio: saldos, transferencias, disponible para gastar, resumen mensual, reparto de céntimos, validación, CSV.
- Capa de datos, idempotencia por UUID, mutaciones optimistas, migración SQL y pruebas de RLS.
- Onboarding con progreso guardado, autenticación Supabase (email), cuentas, movimientos, ajustes, i18n es/en.

## Se corrige en este rediseño
| Problema detectado | Corrección |
|---|---|
| Mascota recreada en SVG | Eliminada. `MioMascot` muestra solo el archivo de imagen |
| Iconos dibujados a mano | Sustituidos por Lucide (un único trazo, 1.75) |
| Paleta gris neutra, sin identidad; halo lila en la bienvenida | Negro profundo, carbón, blanco cálido y champagne |
| Botones de 56 pt, teclado que ocupaba media pantalla, tarjetas grandes | Escala compacta (botón 50, teclas 46, filas 46–56) |
| Importes sin separador de miles («1087,50 €») | Formato propio: «1.087,50 €» |
| Interruptor nativo turquesa en web | `Toggle` propio en champagne |
| Cuentas y Ajustes ocupaban pestañas | Pasan a pantallas secundarias; pestañas: Inicio, Movimientos, Grupos |
| Contorno de foco del navegador en los campos | Foco con borde champagne |

## Faltaba / sigue faltando
- Grupos: ahora existen (crear, editar, borrar, fotografía, presupuesto) con su tabla y permisos; **falta** invitar, repartir gastos y liquidar.
- ¿Puedo comprarlo? y asistente: existen en versión básica y determinista; **falta** integrar pagos, objetivos y un modelo de IA.
- Sin construir: objetivos, suscripciones, deudas, estadísticas (pestaña Análisis), notificaciones, Apple/Google Sign In.
- No probado: dispositivos físicos (safe areas, háptica, teclado nativo) ni Supabase real.
