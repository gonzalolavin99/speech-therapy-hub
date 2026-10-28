/**
 * Utilidades de validación y sanitización para prevenir inyecciones
 * y asegurar datos limpios en la aplicación
 */

// Sanitizar texto general - elimina caracteres peligrosos
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Prevenir XSS básico
    .replace(/javascript:/gi, '') // Prevenir inyección JS
    .replace(/on\w+=/gi, '') // Prevenir event handlers
    .trim();
}

// Validar y formatear RUT chileno
export function validateRUT(rut: string): { valid: boolean; formatted: string; error?: string } {
  if (!rut) {
    return { valid: false, formatted: '', error: 'RUT es requerido' };
  }

  // Limpiar RUT
  const cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
  if (cleanRut.length < 8 || cleanRut.length > 9) {
    return { valid: false, formatted: rut, error: 'RUT debe tener entre 8 y 9 caracteres' };
  }

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const remainder = sum % 11;
  const calculatedDV = remainder === 0 ? '0' : remainder === 1 ? 'K' : String(11 - remainder);

  if (dv !== calculatedDV) {
    return { valid: false, formatted: rut, error: 'RUT inválido' };
  }

  // Formatear RUT
  const formatted = `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
  
  return { valid: true, formatted };
}

// Validar email
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: true }; // Email es opcional
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email inválido' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email demasiado largo' };
  }

  return { valid: true };
}

// Validar teléfono chileno
export function validatePhone(phone: string): { valid: boolean; formatted: string; error?: string } {
  if (!phone) {
    return { valid: true, formatted: '' }; // Teléfono es opcional
  }

  // Limpiar teléfono
  let cleanPhone = phone.replace(/[^0-9+]/g, '');
  
  // Si empieza con +56 se mantiene; si no, se normaliza
  if (cleanPhone.startsWith('56')) {
    cleanPhone = '+' + cleanPhone;
  } else if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
    cleanPhone = '+56' + cleanPhone;
  }

  // Validar longitud
  if (cleanPhone.length !== 12 || !cleanPhone.startsWith('+56')) {
    return { valid: false, formatted: phone, error: 'Teléfono debe ser formato chileno (+56 9 XXXX XXXX)' };
  }

  // Formatear
  const formatted = `+56 ${cleanPhone.slice(3, 4)} ${cleanPhone.slice(4, 8)} ${cleanPhone.slice(8)}`;
  
  return { valid: true, formatted };
}

// Validar contraseña segura
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Sanitizar nombre (solo letras, espacios y acentos)
export function sanitizeName(name: string): string {
  if (!name) return '';
  return name
    .replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sanitizar para prevenir SQL injection (aunque Supabase ya lo maneja)
export function sanitizeForDB(input: string): string {
  if (!input) return '';
  return input
    .replace(/'/g, "''") // Escapar comillas simples
    .replace(/;/g, '') // Eliminar punto y coma
    .replace(/--/g, '') // Eliminar comentarios SQL
    .trim();
}

// Validar fecha
export function validateDate(dateStr: string): { valid: boolean; error?: string } {
  if (!dateStr) {
    return { valid: true }; // Fecha puede ser opcional
  }

  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Fecha inválida' };
  }

  // No permitir fechas futuras para nacimiento
  if (date > new Date()) {
    return { valid: false, error: 'La fecha no puede ser futura' };
  }

  // No permitir fechas muy antiguas
  const minDate = new Date('1900-01-01');
  if (date < minDate) {
    return { valid: false, error: 'Fecha demasiado antigua' };
  }

  return { valid: true };
}

// Limpiar objeto de datos antes de enviar a la BD
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    const value = sanitized[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value) as T[typeof key];
    }
  }
  
  return sanitized;
}
