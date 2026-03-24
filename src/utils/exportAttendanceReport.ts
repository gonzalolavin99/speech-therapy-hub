import { Patient } from '@/hooks/usePatients';
import { Session } from '@/hooks/useSessions';
import { ProfessionalProfile } from '@/hooks/useProfile';
import { formatearEdad } from '@/utils/age';

interface AttendanceReportData {
  patient: Patient;
  professional: ProfessionalProfile;
  sessions: Session[];
  dateFrom?: string;
  dateTo?: string;
}

function formatDateCL(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  evaluation: 'Evaluación',
  therapy: 'Terapia',
  followup: 'Control',
};

const PROFESSION_LABELS: Record<string, string> = {
  fonoaudiologo: 'Fonoaudiólogo/a',
  psicologo: 'Psicólogo/a Clínico/a',
};

export async function exportAttendanceReportPDF(data: AttendanceReportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const profLabel = PROFESSION_LABELS[data.professional.profession] || 'Profesional';

  // Filter sessions by date range
  let sessions = [...data.sessions].filter(s => s.patient_id === data.patient.id);
  if (data.dateFrom) {
    sessions = sessions.filter(s => new Date(s.start_time) >= new Date(data.dateFrom!));
  }
  if (data.dateTo) {
    sessions = sessions.filter(s => new Date(s.start_time) <= new Date(data.dateTo! + 'T23:59:59'));
  }
  sessions.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Stats
  const total = sessions.length;
  const completed = sessions.filter(s => s.status === 'completed').length;
  const cancelled = sessions.filter(s => s.status === 'cancelled').length;
  const noShow = sessions.filter(s => s.status === 'no_show').length;
  const scheduled = sessions.filter(s => s.status === 'scheduled' || s.status === 'confirmed').length;
  const attendanceRate = total > 0 ? Math.round((completed / (completed + cancelled + noShow || 1)) * 100) : 0;

  // ===================== HEADER =====================
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('REPORTE DE ASISTENCIA', margin, 18);

  doc.setFontSize(11);
  doc.text(data.patient.name, margin, 28);

  doc.setFontSize(9);
  doc.text(`${profLabel}: ${data.professional.full_name}`, margin, 36);

  const dateRange = data.dateFrom && data.dateTo
    ? `${formatDateCL(data.dateFrom)} - ${formatDateCL(data.dateTo)}`
    : `Al ${formatDateCL(new Date().toISOString())}`;
  doc.text(dateRange, pageWidth - margin, 18, { align: 'right' });
  doc.text(`Emitido: ${formatDateCL(new Date().toISOString())}`, pageWidth - margin, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  let currentY = 55;

  // ===================== PATIENT INFO =====================
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Datos del Paciente', margin, currentY);
  currentY += 3;

  const patientInfo = [
    ['Nombre', data.patient.name],
    ['RUT', data.patient.rut],
    ['Edad', data.patient.birth_date ? formatearEdad(data.patient.birth_date) : (data.patient.age ? `${data.patient.age} años` : '-')],
    ['Teléfono', data.patient.phone || '-'],
  ];

  autoTable(doc, {
    startY: currentY,
    body: patientInfo,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, textColor: [100, 100, 100] },
      1: { cellWidth: 'auto' },
    },
    styles: { fontSize: 9, cellPadding: 2 },
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ===================== SUMMARY STATS =====================
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Resumen de Asistencia', margin, currentY);
  currentY += 3;

  const summaryData = [
    ['Total de sesiones', `${total}`],
    ['Completadas', `${completed}`],
    ['Canceladas', `${cancelled}`],
    ['Inasistencias', `${noShow}`],
    ['Pendientes/Agendadas', `${scheduled}`],
    ['Tasa de asistencia', `${attendanceRate}%`],
  ];

  autoTable(doc, {
    startY: currentY,
    body: summaryData,
    theme: 'grid',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: [245, 247, 250] },
      1: { cellWidth: 'auto' },
    },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ===================== ATTENDANCE BAR =====================
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Tasa de asistencia:', margin, currentY);
  currentY += 4;

  // Background bar
  doc.setFillColor(230, 230, 235);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 8, 3, 3, 'F');
  // Filled bar
  if (attendanceRate > 0) {
    const barColor = attendanceRate >= 80 ? [34, 197, 94] : attendanceRate >= 50 ? [245, 158, 11] : [239, 68, 68];
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.roundedRect(margin, currentY, (pageWidth - margin * 2) * (attendanceRate / 100), 8, 3, 3, 'F');
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`${attendanceRate}%`, margin + 4, currentY + 6);
  doc.setTextColor(0, 0, 0);
  currentY += 18;

  // ===================== SESSION TABLE =====================
  if (sessions.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Detalle de Sesiones', margin, currentY);
    currentY += 3;

    const sessionRows = sessions.map(s => {
      const startDate = new Date(s.start_time);
      const endDate = new Date(s.end_time);
      const timeStr = `${startDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${endDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

      return [
        formatDateCL(s.start_time),
        timeStr,
        SESSION_TYPE_LABELS[s.session_type] || s.session_type,
        STATUS_LABELS[s.status] || s.status,
        (s.notes || '-').substring(0, 50) + ((s.notes || '').length > 50 ? '...' : ''),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Horario', 'Tipo', 'Estado', 'Notas']],
      body: sessionRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 'auto' },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===================== SIGNATURE =====================
  currentY = checkPageBreak(doc, currentY, 50);
  currentY += 10;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, currentY, margin + 70, currentY);
  currentY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(data.professional.full_name, margin, currentY);
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(profLabel, margin, currentY);
  if (data.professional.sis_registration) {
    currentY += 4;
    doc.text(`Reg: ${data.professional.sis_registration}`, margin, currentY);
  }

  // ===================== FOOTER =====================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Reporte de Asistencia - ${data.patient.name} | Generado por TherapyHub | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const fileName = `reporte_asistencia_${data.patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

function checkPageBreak(doc: any, currentY: number, neededHeight: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + neededHeight > pageHeight - 20) {
    doc.addPage();
    return 20;
  }
  return currentY;
}
