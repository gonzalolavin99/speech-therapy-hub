export interface EdadExacta {
  años: number;
  meses: number;
  días: number;
}

/**
 * Calcula la edad exacta a partir de una fecha de nacimiento.
 */
export function calcularEdadExacta(fechaNacimiento: string | Date): EdadExacta {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);

  let años = hoy.getFullYear() - nacimiento.getFullYear();
  let meses = hoy.getMonth() - nacimiento.getMonth();
  let días = hoy.getDate() - nacimiento.getDate();

  if (días < 0) {
    meses--;
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    días += mesAnterior.getDate();
  }

  if (meses < 0) {
    años--;
    meses += 12;
  }

  return { años, meses, días };
}

/**
 * Formatea la edad exacta para mostrar en la UI.
 * Ejemplos: "4 años 3 meses", "0 años 11 meses", "1 año 0 meses"
 */
export function formatearEdad(fechaNacimiento: string | Date | null): string {
  if (!fechaNacimiento) return "Sin registro";
  
  const { años, meses } = calcularEdadExacta(fechaNacimiento);

  const añoStr = años === 1 ? "1 año" : `${años} años`;
  const mesStr = meses === 1 ? "1 mes" : `${meses} meses`;

  if (años === 0) return mesStr;
  return `${añoStr} ${mesStr}`;
}

/**
 * Retorna la edad en años (entero) para almacenar en la DB.
 */
export function calcularEdadEnAños(fechaNacimiento: string | Date): number {
  const { años } = calcularEdadExacta(fechaNacimiento);
  return años;
}
