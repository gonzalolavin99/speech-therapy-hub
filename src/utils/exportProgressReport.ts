import { Patient } from '@/hooks/usePatients';
import { Planning } from '@/hooks/usePlannings';
import { Session } from '@/hooks/useSessions';
import { TestResult } from '@/hooks/useTestResults';
import { ProfessionalProfile } from '@/hooks/useProfile';
import { formatearEdad } from '@/utils/age';

interface ProgressReportData {
  patient: Patient;
  professional: ProfessionalProfile;
  plannings: Planning[];
  sessions: Session[];
  testResults: TestResult[];
  dateFrom?: string;
  dateTo?: string;
  sections: {
    patientInfo: boolean;
    diagnosis: boolean;
    plannings: boolean;
    sessions: boolean;
    tests: boolean;
    progress: boolean;
    recommendations: boolean;
  };
  customNotes?: string;
}

function formatDateCL(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  completed: 'Completada',
  paused: 'Pausada',
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const PROFESSION_LABELS: Record<string, string> = {
  fonoaudiologo: 'Fonoaudiólogo/a',
  psicologo: 'Psicólogo/a Clínico/a',
};

export async function exportProgressReportPDF(data: ProgressReportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ===================== HEADER =====================
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('INFORME DE EVOLUCIÓN', margin, 18);

  doc.setFontSize(11);
  doc.text(data.patient.name, margin, 28);

  doc.setFontSize(9);
  const profLabel = PROFESSION_LABELS[data.professional.profession] || 'Profesional';
  doc.text(`${profLabel}: ${data.professional.full_name}`, margin, 36);

  // Date range
  doc.setFontSize(9);
  const dateRange = data.dateFrom && data.dateTo
    ? `${formatDateCL(data.dateFrom)} - ${formatDateCL(data.dateTo)}`
    : `Al ${formatDateCL(new Date().toISOString())}`;
  doc.text(dateRange, pageWidth - margin, 18, { align: 'right' });
  doc.text(`Emitido: ${formatDateCL(new Date().toISOString())}`, pageWidth - margin, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  let currentY = 55;

  // ===================== PATIENT INFO =====================
  if (data.sections.patientInfo) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Datos del Paciente', margin, currentY);
    currentY += 3;

    const patientInfo = [
      ['Nombre', data.patient.name],
      ['RUT', data.patient.rut],
      ['Edad', data.patient.birth_date ? formatearEdad(data.patient.birth_date) : (data.patient.age ? `${data.patient.age} años` : '-')],
      ['Teléfono', data.patient.phone || '-'],
      ['Email', data.patient.email || '-'],
      ['Estado', STATUS_LABELS[data.patient.status] || data.patient.status],
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
  }

  // ===================== DIAGNOSIS =====================
  if (data.sections.diagnosis && data.patient.diagnosis) {
    currentY = checkPageBreak(doc, currentY, 40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Diagnóstico Clínico', margin, currentY);
    currentY += 7;

    doc.setFillColor(240, 249, 255);
    doc.roundedRect(margin, currentY - 4, contentWidth, 16, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(data.patient.diagnosis, margin + 4, currentY + 5);
    currentY += 22;

    if (data.patient.consult_reason) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Motivo de consulta:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(data.patient.consult_reason, margin + 40, currentY);
      currentY += 8;
    }
  }

  // ===================== PLANNINGS =====================
  if (data.sections.plannings && data.plannings.length > 0) {
    currentY = checkPageBreak(doc, currentY, 50);
    const sectionNum = getSectionNumber(data.sections, 'plannings');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionNum}. Planificaciones de Intervención`, margin, currentY);
    currentY += 8;

    for (const planning of data.plannings) {
      currentY = checkPageBreak(doc, currentY, 60);

      // Planning header
      doc.setFillColor(245, 245, 250);
      doc.roundedRect(margin, currentY - 4, contentWidth, 14, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${planning.intervention_approach} - ${planning.method}`, margin + 4, currentY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const progress = planning.total_sessions > 0
        ? Math.round((planning.completed_sessions / planning.total_sessions) * 100)
        : 0;
      doc.text(
        `${planning.completed_sessions}/${planning.total_sessions} sesiones (${progress}%) | ${STATUS_LABELS[planning.status] || planning.status}`,
        pageWidth - margin - 4,
        currentY + 4,
        { align: 'right' }
      );
      currentY += 16;

      // Objectives
      if (planning.general_objective) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Objetivo General:', margin + 4, currentY);
        currentY += 5;
        doc.setFont('helvetica', 'normal');
        const objLines = doc.splitTextToSize(planning.general_objective, contentWidth - 8);
        doc.text(objLines, margin + 4, currentY);
        currentY += objLines.length * 4 + 4;
      }

      if (planning.specific_objectives) {
        currentY = checkPageBreak(doc, currentY, 30);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Objetivos Específicos:', margin + 4, currentY);
        currentY += 5;
        doc.setFont('helvetica', 'normal');
        const specs = planning.specific_objectives.split('\n').filter(Boolean);
        specs.forEach((obj, i) => {
          currentY = checkPageBreak(doc, currentY, 8);
          const cleaned = obj.replace(/^\d+[\.\)\-]\s*/, '');
          const lines = doc.splitTextToSize(`${i + 1}. ${cleaned}`, contentWidth - 12);
          doc.text(lines, margin + 8, currentY);
          currentY += lines.length * 4 + 2;
        });
      }

      // Progress bar visual
      currentY = checkPageBreak(doc, currentY, 12);
      doc.setFillColor(230, 230, 235);
      doc.roundedRect(margin + 4, currentY, contentWidth - 8, 5, 2, 2, 'F');
      if (progress > 0) {
        const barColor = progress === 100 ? [34, 197, 94] : progress >= 50 ? [59, 130, 246] : [245, 158, 11];
        doc.setFillColor(barColor[0], barColor[1], barColor[2]);
        doc.roundedRect(margin + 4, currentY, (contentWidth - 8) * (progress / 100), 5, 2, 2, 'F');
      }
      currentY += 14;
    }
  }

  // ===================== SESSIONS =====================
  if (data.sections.sessions && data.sessions.length > 0) {
    currentY = checkPageBreak(doc, currentY, 50);
    const sectionNum = getSectionNumber(data.sections, 'sessions');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionNum}. Registro de Sesiones`, margin, currentY);
    currentY += 3;

    const filteredSessions = filterByDateRange(data.sessions, data.dateFrom, data.dateTo);
    const completedCount = filteredSessions.filter(s => s.status === 'completed').length;
    const cancelledCount = filteredSessions.filter(s => s.status === 'cancelled' || s.status === 'no_show').length;

    // Summary
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Total: ${filteredSessions.length} | Completadas: ${completedCount} | Canceladas/Inasistencias: ${cancelledCount} | Asistencia: ${filteredSessions.length > 0 ? Math.round(((filteredSessions.length - cancelledCount) / filteredSessions.length) * 100) : 0}%`,
      margin,
      currentY + 5
    );
    currentY += 5;

    const sessionRows = filteredSessions
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map(s => [
        formatDateCL(s.start_time),
        s.title || '-',
        s.session_type === 'evaluation' ? 'Evaluación' : s.session_type === 'therapy' ? 'Terapia' : 'Control',
        STATUS_LABELS[s.status] || s.status,
        (s.notes || '-').substring(0, 60) + ((s.notes || '').length > 60 ? '...' : ''),
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Título', 'Tipo', 'Estado', 'Notas']],
      body: sessionRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 40 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 'auto' },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===================== TESTS =====================
  if (data.sections.tests && data.testResults.length > 0) {
    currentY = checkPageBreak(doc, currentY, 50);
    const sectionNum = getSectionNumber(data.sections, 'tests');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionNum}. Evaluaciones Aplicadas`, margin, currentY);
    currentY += 3;

    const testRows = data.testResults
      .sort((a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime())
      .map(t => [
        formatDateCL(t.evaluation_date),
        t.test_name,
        t.score || '-',
        STATUS_LABELS[t.status] || t.status,
        (t.observations || '-').substring(0, 50) + ((t.observations || '').length > 50 ? '...' : ''),
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Test', 'Puntaje', 'Estado', 'Observaciones']],
      body: testRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===================== PROGRESS SUMMARY =====================
  if (data.sections.progress) {
    currentY = checkPageBreak(doc, currentY, 60);
    const sectionNum = getSectionNumber(data.sections, 'progress');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionNum}. Resumen de Progreso`, margin, currentY);
    currentY += 8;

    const allSessions = filterByDateRange(data.sessions, data.dateFrom, data.dateTo);
    const completed = allSessions.filter(s => s.status === 'completed').length;
    const total = allSessions.length;
    const cancelled = allSessions.filter(s => s.status === 'cancelled' || s.status === 'no_show').length;
    const attendanceRate = total > 0 ? Math.round(((total - cancelled) / total) * 100) : 0;
    const totalPlanned = data.plannings.reduce((sum, p) => sum + p.total_sessions, 0);
    const totalCompleted = data.plannings.reduce((sum, p) => sum + p.completed_sessions, 0);
    const planProgress = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

    const summaryData = [
      ['Sesiones realizadas', `${completed} de ${total} programadas`],
      ['Tasa de asistencia', `${attendanceRate}%`],
      ['Progreso de planificación', `${planProgress}% (${totalCompleted}/${totalPlanned} sesiones)`],
      ['Planificaciones activas', `${data.plannings.filter(p => p.status === 'active').length}`],
      ['Evaluaciones aplicadas', `${data.testResults.length}`],
      ['Cancelaciones/Inasistencias', `${cancelled}`],
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
  }

  // ===================== RECOMMENDATIONS / NOTES =====================
  if (data.sections.recommendations || data.customNotes) {
    currentY = checkPageBreak(doc, currentY, 40);
    const sectionNum = getSectionNumber(data.sections, 'recommendations');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionNum}. Observaciones y Recomendaciones`, margin, currentY);
    currentY += 8;

    if (data.customNotes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize(data.customNotes, contentWidth);
      doc.text(noteLines, margin, currentY);
      currentY += noteLines.length * 4 + 8;
    } else {
      // Placeholder lines for manual completion
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('(Espacio para observaciones del profesional)', margin, currentY);
      currentY += 6;
      for (let i = 0; i < 5; i++) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, currentY + i * 8, pageWidth - margin, currentY + i * 8);
      }
      currentY += 50;
      doc.setTextColor(0, 0, 0);
    }
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
      `Informe de Evolución - ${data.patient.name} | Generado por TherapyHub | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  // Save
  const fileName = `informe_evolucion_${data.patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
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

function filterByDateRange(sessions: Session[], dateFrom?: string, dateTo?: string): Session[] {
  return sessions.filter(s => {
    const sessionDate = new Date(s.start_time);
    if (dateFrom && sessionDate < new Date(dateFrom)) return false;
    if (dateTo && sessionDate > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });
}

function getSectionNumber(
  sections: ProgressReportData['sections'],
  current: keyof ProgressReportData['sections']
): number {
  const order: (keyof ProgressReportData['sections'])[] = [
    'patientInfo', 'diagnosis', 'plannings', 'sessions', 'tests', 'progress', 'recommendations',
  ];
  let num = 0;
  for (const key of order) {
    if (sections[key]) num++;
    if (key === current) return num;
  }
  return num;
}
