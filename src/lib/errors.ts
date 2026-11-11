/** Traduce errores habituales de Supabase/red a mensajes comprensibles. */
export function toUserMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);

  const map: [RegExp, string][] = [
    [/invalid login credentials/i, 'El correo o la contraseña no son correctos.'],
    [/email not confirmed/i, 'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'],
    [/user already registered/i, 'Ya existe una cuenta con este correo.'],
    [/password should be at least/i, 'La contraseña es demasiado corta.'],
    [/rate limit|too many requests/i, 'Demasiados intentos. Espera un momento y vuelve a probar.'],
    [/failed to fetch|network/i, 'No hay conexión con el servidor. Comprueba tu conexión a internet.'],
    [/jwt expired|invalid jwt/i, 'Tu sesión ha caducado. Vuelve a iniciar sesión.'],
    [/relation .* does not exist|could not find the (table|function)/i, 'La base de datos todavía no está preparada. Falta aplicar la migración inicial.'],
    [/row-level security/i, 'No tienes permiso para realizar esta acción.'],
  ];
  for (const [pattern, message] of map) if (pattern.test(raw)) return message;
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}
