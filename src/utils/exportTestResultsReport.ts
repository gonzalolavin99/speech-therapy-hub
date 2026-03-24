import { Patient } from '@/hooks/usePatients';
import { TestResult } from '@/hooks/useTestResults';
import { ProfessionalProfile } from '@/hooks/useProfile';
import { formatearEdad } from '@/utils/age';

interface TestResultsReportData {
  patient: Patient;
  professional: ProfessionalProfile;
  testResults: TestResult[];
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

const TEST_TYPE_LABELS: Record<string, string> = {
  mbgr: 'MBGR - Protocolo Miofuncional Orofacial',
  'mmbgr-lactantes': 'M-MBGR - Lactantes',
  tar: 'TAR - Articulación a la Repetición',
  teprosif: 'TEPROSIF-R - Procesos de Simplificación Fonológica',
  'reel-3': 'REEL-3 - Receptive-Expressive Emergent Language',
  'phq-9': 'PHQ-9 - Depresión',
  'gad-7': 'GAD-7 - Ansiedad',
  'psc-17': 'PSC-17 - Screening Pediátrico',
  asrs: 'ASRS - ADHD Self-Report Scale',
  'snap-iv': 'SNAP-IV - Evaluación TDAH',
};

const PROFESSION_LABELS: Record<string, string> = {
  fonoaudiologo: 'Fonoaudiólogo/a',
  psicologo: 'Psicólogo/a Clínico/a',
};

export async function exportTestResultsReportPDF(data: TestResultsReportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const profLabel = PROFESSION_LABELS[data.professional.profession] || 'Profesional';

  // Filter by date range
  let tests = [...data.testResults].filter(t => t.patient_id === data.patient.id);
  if (data.dateFrom) {
    tests = tests.filter(t => new Date(t.evaluation_date) >= new Date(data.dateFrom!));
  }
  if (data.dateTo) {
    tests = tests.filter(t => new Date(t.evaluation_date) <= new Date(data.dateTo! + 'T23:59:59'));
  }
  tests.sort((a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime());

  // ===================== HEADER =====================
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('INFORME DE EVALUACIONES', margin, 18);

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
    ['Diagnóstico', data.patient.diagnosis || '-'],
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

  // ===================== SUMMARY TABLE =====================
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Resumen de Evaluaciones Aplicadas', margin, currentY);
  currentY += 3;

  if (tests.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No se encontraron evaluaciones en el período seleccionado.', margin, currentY + 8);
    doc.setTextColor(0, 0, 0);
    currentY += 18;
  } else {
    const summaryRows = tests.map(t => [
      formatDateCL(t.evaluation_date),
      TEST_TYPE_LABELS[t.test_type] || t.test_name,
      t.score || '-',
      t.status === 'completed' ? 'Completada' : 'Pendiente',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Evaluación', 'Puntaje', 'Estado']],
      body: summaryRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===================== DETAILED RESULTS =====================
  if (tests.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    currentY = checkPageBreak(doc, currentY, 40);
    doc.text('3. Detalle por Evaluación', margin, currentY);
    currentY += 8;

    for (const test of tests) {
      currentY = checkPageBreak(doc, currentY, 50);

      // Test header
      doc.setFillColor(245, 245, 250);
      doc.roundedRect(margin, currentY - 4, contentWidth, 14, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(TEST_TYPE_LABELS[test.test_type] || test.test_name, margin + 4, currentY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(
        `Fecha: ${formatDateCL(test.evaluation_date)} | Puntaje: ${test.score || 'N/A'}`,
        pageWidth - margin - 4,
        currentY + 4,
        { align: 'right' }
      );
      currentY += 16;

      // Observations
      if (test.observations) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Observaciones:', margin + 4, currentY);
        currentY += 5;
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(test.observations, contentWidth - 8);
        doc.text(obsLines, margin + 4, currentY);
        currentY += obsLines.length * 4 + 4;
      }

      // Results data (if JSON has structured data)
      if (test.results_data && typeof test.results_data === 'object') {
        const resultsObj = test.results_data;

        // Try to extract meaningful data from results_data
        if (resultsObj.totalScore !== undefined) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Resultados:', margin + 4, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');

          const resultEntries: string[][] = [];

          if (resultsObj.totalScore !== undefined) {
            resultEntries.push(['Puntaje Total', String(resultsObj.totalScore)]);
          }
          if (resultsObj.percentile !== undefined) {
            resultEntries.push(['Percentil', String(resultsObj.percentile)]);
          }
          if (resultsObj.classification !== undefined) {
            resultEntries.push(['Clasificación', String(resultsObj.classification)]);
          }
          if (resultsObj.interpretation !== undefined) {
            resultEntries.push(['Interpretación', String(resultsObj.interpretation)]);
          }

          // Add section scores if available
          if (resultsObj.sections && Array.isArray(resultsObj.sections)) {
            for (const section of resultsObj.sections) {
              if (section.name && section.score !== undefined) {
                resultEntries.push([section.name, String(section.score)]);
              }
            }
          }

          // Add category scores if available
          if (resultsObj.categories && typeof resultsObj.categories === 'object') {
            for (const [key, value] of Object.entries(resultsObj.categories)) {
              resultEntries.push([key, String(value)]);
            }
          }

          if (resultEntries.length > 0) {
            autoTable(doc, {
              startY: currentY,
              body: resultEntries,
              theme: 'plain',
              columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 55, textColor: [100, 100, 100] },
                1: { cellWidth: 'auto' },
              },
              styles: { fontSize: 8, cellPadding: 2 },
              margin: { left: margin + 4 },
            });
            currentY = (doc as any).lastAutoTable.finalY + 4;
          }
        }
      }

      currentY += 6;
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
      `Informe de Evaluaciones - ${data.patient.name} | Generado por TherapyHub | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const fileName = `informe_evaluaciones_${data.patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
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
