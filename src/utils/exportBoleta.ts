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

// ── Boleta de Honorarios con desglose de retención ──

interface BoletaHonorariosData {
  boletaNumber: string;
  siiFolio?: string | null;
  professional: {
    name: string;
    rut: string | null;
    address: string | null;
    city: string | null;
  };
  patient: {
    name: string;
    rut: string | null;
  };
  amountBruto: number;
  retencionPercent: number;
  retencionAmount: number;
  amountLiquido: number;
  description: string;
  serviceDate: string;
  emissionDate: string | null;
  status: string;
}

export async function exportBoletaHonorariosPDF(data: BoletaHonorariosData) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ── Header ──
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('BOLETA DE HONORARIOS', margin, 20);
  doc.setFontSize(11);
  doc.text(`N° ${data.boletaNumber}`, margin, 30);

  if (data.siiFolio) {
    doc.setFontSize(10);
    doc.text(`Folio SII: ${data.siiFolio}`, margin, 38);
  }

  doc.setFontSize(10);
  doc.text(`Fecha: ${formatDateCL(data.emissionDate || data.serviceDate)}`, pageWidth - margin, 20, { align: 'right' });

  const statusLabels: Record<string, string> = {
    draft: 'BORRADOR',
    pending_sii: 'PENDIENTE EMISION SII',
    emitted: 'EMITIDA EN SII',
    voided: 'ANULADA',
  };
  doc.setFontSize(9);
  doc.text(statusLabels[data.status] || data.status.toUpperCase(), pageWidth - margin, 30, { align: 'right' });
  doc.text('Documento de referencia interna', pageWidth - margin, 38, { align: 'right' });

  // ── Professional Info ──
  doc.setTextColor(0, 0, 0);
  let y = 62;

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
  if (data.professional.address) {
    const addr = data.professional.city
      ? `${data.professional.address}, ${data.professional.city}`
      : data.professional.address;
    doc.text(`Direccion: ${addr}`, margin, y); y += 6;
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

  // ── Service Detail ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DEL SERVICIO', margin, y);
  y += 10;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Descripcion', margin + 4, y + 1);
  doc.text('Fecha Servicio', 120, y + 1);
  doc.text('Monto Bruto', pageWidth - margin - 4, y + 1, { align: 'right' });
  y += 12;

  // Table row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.description, margin + 4, y);
  doc.text(formatDateCL(data.serviceDate), 120, y);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCLP(data.amountBruto), pageWidth - margin - 4, y, { align: 'right' });
  y += 12;

  // ── Retention Breakdown ──
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DESGLOSE TRIBUTARIO', margin, y);
  y += 10;

  // Breakdown box
  const boxX = 90;
  const boxW = pageWidth - margin - boxX;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(boxX, y - 5, boxW, 42, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  doc.text('Monto Bruto:', boxX + 6, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(formatCLP(data.amountBruto), boxX + boxW - 6, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 80, 60);
  doc.text(`Retencion (${data.retencionPercent}%):`, boxX + 6, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(`-${formatCLP(data.retencionAmount)}`, boxX + boxW - 6, y + 14, { align: 'right' });

  // Separator line inside box
  doc.setDrawColor(200, 200, 200);
  doc.line(boxX + 6, y + 20, boxX + boxW - 6, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('Monto Liquido:', boxX + 6, y + 30);
  doc.text(formatCLP(data.amountLiquido), boxX + boxW - 6, y + 30, { align: 'right' });

  y += 50;

  // Amount in words
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const words = numberToWords(data.amountLiquido);
  doc.text(`Monto liquido en palabras: ${words.charAt(0).toUpperCase() + words.slice(1)} pesos`, margin, y);
  y += 10;

  // ── SII Notice ──
  if (data.status === 'pending_sii') {
    doc.setFillColor(255, 250, 230);
    doc.setDrawColor(245, 200, 80);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'FD');
    doc.setTextColor(150, 100, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PENDIENTE: Emita esta boleta en el portal del SII', margin + 6, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text('https://homer.sii.cl', margin + 6, y + 15);
    y += 28;
  }

  if (data.status === 'emitted' && data.siiFolio) {
    doc.setFillColor(230, 250, 230);
    doc.setDrawColor(80, 200, 80);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 3, 3, 'FD');
    doc.setTextColor(30, 120, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`EMITIDA EN SII - Folio: ${data.siiFolio}`, margin + 6, y + 9);
    y += 22;
  }

  // ── Signature Area ──
  y = Math.max(y + 15, 220);
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
  doc.text(
    'Este documento es un registro interno de referencia. NO constituye documento tributario valido ante el SII.',
    pageWidth / 2, footerY, { align: 'center' }
  );
  doc.text(
    `Generado por TherapyHub - ${new Date().toLocaleDateString('es-CL')}`,
    pageWidth / 2, footerY + 5, { align: 'center' }
  );

  // Save
  const fileName = `bhe_${data.boletaNumber}_${data.patient.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
