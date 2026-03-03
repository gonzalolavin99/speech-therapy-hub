import { ProfessionalProfile } from '@/hooks/useProfile';

interface BoletaData {
  boletaNumber: string;
  professional: {
    name: string;
    rut: string | null;
    address: string | null;
    city: string | null;
    institution: string | null;
  };
  patient: {
    name: string;
    rut: string | null;
  };
  amount: number;
  sessionDate: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  description?: string;
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
}

function formatDateCL(dateStr: string | null): string {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function numberToWords(n: number): string {
  const units = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  if (n === 0) return 'cero';
  if (n < 0) return 'menos ' + numberToWords(-n);

  let result = '';

  if (n >= 1000000) {
    const millions = Math.floor(n / 1000000);
    result += (millions === 1 ? 'un millón' : numberToWords(millions) + ' millones');
    n %= 1000000;
    if (n > 0) result += ' ';
  }

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    result += (thousands === 1 ? 'mil' : numberToWords(thousands) + ' mil');
    n %= 1000;
    if (n > 0) result += ' ';
  }

  if (n >= 100) {
    if (n === 100) {
      result += 'cien';
      return result;
    }
    result += hundreds[Math.floor(n / 100)];
    n %= 100;
    if (n > 0) result += ' ';
  }

  if (n >= 20) {
    result += tens[Math.floor(n / 10)];
    const u = n % 10;
    if (u > 0) result += ' y ' + units[u];
  } else if (n >= 10) {
    result += teens[n - 10];
  } else if (n > 0) {
    result += units[n];
  }

  return result;
}

export async function exportBoletaPDF(data: BoletaData) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ── Header ──
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('BOLETA DE HONORARIOS', margin, 22);
  doc.setFontSize(11);
  doc.text(`N° ${data.boletaNumber}`, margin, 32);
  doc.setFontSize(10);
  doc.text(`Fecha: ${formatDateCL(data.paymentDate || data.sessionDate)}`, pageWidth - margin, 22, { align: 'right' });
  doc.text('Documento no tributario - Solo referencia', pageWidth - margin, 32, { align: 'right' });

  // ── Professional Info ──
  doc.setTextColor(0, 0, 0);
  let y = 58;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EMISOR (Profesional)', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  doc.text(`Nombre: ${data.professional.name}`, margin, y); y += 6;
  if (data.professional.rut) {
    doc.text(`RUT: ${data.professional.rut}`, margin, y); y += 6;
  }
  if (data.professional.institution) {
    doc.text(`Institución: ${data.professional.institution}`, margin, y); y += 6;
  }
  if (data.professional.address) {
    const addr = data.professional.city 
      ? `${data.professional.address}, ${data.professional.city}` 
      : data.professional.address;
    doc.text(`Dirección: ${addr}`, margin, y); y += 6;
  }

  // ── Patient Info ──
  y += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEPTOR (Paciente / Apoderado)', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  doc.text(`Nombre: ${data.patient.name}`, margin, y); y += 6;
  if (data.patient.rut) {
    doc.text(`RUT: ${data.patient.rut}`, margin, y); y += 6;
  }

  // ── Separator ──
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ── Service Detail Table ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DEL SERVICIO', margin, y);
  y += 10;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Descripción', margin + 4, y + 1);
  doc.text('Fecha Sesión', 120, y + 1);
  doc.text('Monto', pageWidth - margin - 4, y + 1, { align: 'right' });
  y += 12;

  // Table row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const description = data.description || 'Sesión Profesional';
  doc.text(description, margin + 4, y);
  doc.text(formatDateCL(data.sessionDate), 120, y);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCLP(data.amount), pageWidth - margin - 4, y, { align: 'right' });
  y += 8;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Total
  doc.setFillColor(37, 99, 235);
  doc.rect(100, y - 5, pageWidth - margin - 100, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 104, y + 2);
  doc.text(formatCLP(data.amount), pageWidth - margin - 4, y + 2, { align: 'right' });
  y += 14;

  // Amount in words
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const words = numberToWords(data.amount);
  doc.text(`Son: ${words.charAt(0).toUpperCase() + words.slice(1)} pesos`, margin, y);
  y += 8;

  // Payment method
  if (data.paymentMethod) {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Método de pago: ${data.paymentMethod}`, margin, y);
    y += 8;
  }

  // ── Signature Area ──
  y = Math.max(y + 20, 210);
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, y, margin + 70, y);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma Profesional', margin, y + 6);
  doc.text(data.professional.name, margin, y + 12);

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text('Este documento es una boleta de honorarios de referencia interna. No constituye documento tributario válido ante el SII.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generado por TherapyHub - ${new Date().toLocaleDateString('es-CL')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Save
  const fileName = `boleta_${data.boletaNumber}_${data.patient.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

export function generateBoletaNumber(paymentId: string): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const short = paymentId.slice(0, 6).toUpperCase();
  return `BH-${yy}${mm}-${short}`;
}
