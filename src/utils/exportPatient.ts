import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Patient } from '@/hooks/usePatients';

interface ExportOptions {
  patient: Patient;
  sessions?: Array<{
    date: string;
    duration: number;
    notes?: string;
    status: string;
  }>;
  testResults?: Array<{
    test_type: string;
    date: string;
    score: any;
  }>;
}

export function exportPatientToPDF({ patient, sessions = [], testResults = [] }: ExportOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(37, 99, 235); // Primary blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('TherapyHub', 14, 20);
  doc.setFontSize(12);
  doc.text('Ficha del Paciente', 14, 30);
  
  // Fecha de exportación
  doc.setFontSize(10);
  doc.text(`Exportado: ${new Date().toLocaleDateString('es-CL')}`, pageWidth - 14, 30, { align: 'right' });
  
  // Reset color
  doc.setTextColor(0, 0, 0);
  
  // Datos del paciente
  doc.setFontSize(14);
  doc.text('Datos Personales', 14, 55);
  
  const patientData = [
    ['Nombre', patient.name],
    ['RUT', patient.rut],
    ['Fecha de Nacimiento', patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('es-CL') : 'No registrado'],
    ['Edad', patient.age ? `${patient.age} años` : 'No registrado'],
    ['Teléfono', patient.phone || 'No registrado'],
    ['Email', patient.email || 'No registrado'],
    ['Estado', patient.status === 'active' ? 'Activo' : patient.status === 'inactive' ? 'Inactivo' : 'Completado'],
  ];
  
  autoTable(doc, {
    startY: 60,
    head: [],
    body: patientData,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    styles: { fontSize: 10 },
  });
  
  // Diagnóstico
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(14);
  doc.text('Diagnóstico Fonoaudiológico', 14, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setFillColor(240, 249, 255);
  doc.rect(14, currentY - 5, pageWidth - 28, 15, 'F');
  doc.text(patient.diagnosis || 'No registrado', 18, currentY + 3);
  currentY += 20;
  
  // Anamnesis
  doc.setFontSize(14);
  doc.text('Ficha de Anamnesis', 14, currentY);
  currentY += 5;
  
  const anamnesisData = [
    ['Motivo de Consulta', patient.consult_reason || 'No registrado'],
    ['Derivado por', patient.referred_by || 'No registrado'],
    ['Antecedentes Perinatales', patient.perinatal_history || 'No registrado'],
    ['Desarrollo Psicomotor', patient.psychomotor_dev || 'No registrado'],
    ['Observaciones', patient.observations || 'No registrado'],
  ];
  
  autoTable(doc, {
    startY: currentY,
    head: [],
    body: anamnesisData,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    styles: { fontSize: 10 },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 15;
  
  // Sesiones (si hay)
  if (sessions.length > 0) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Historial de Sesiones', 14, currentY);
    currentY += 5;
    
    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Duración', 'Estado', 'Notas']],
      body: sessions.map(s => [
        new Date(s.date).toLocaleDateString('es-CL'),
        `${s.duration} min`,
        s.status,
        s.notes || '-',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Tests (si hay)
  if (testResults.length > 0) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Resultados de Evaluaciones', 14, currentY);
    currentY += 5;
    
    autoTable(doc, {
      startY: currentY,
      head: [['Test', 'Fecha', 'Resultado']],
      body: testResults.map(t => [
        t.test_type,
        new Date(t.date).toLocaleDateString('es-CL'),
        typeof t.score === 'object' ? JSON.stringify(t.score).substring(0, 50) + '...' : String(t.score),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount} | Documento generado por TherapyHub | Confidencial`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Guardar
  doc.save(`ficha_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportPatientToCSV(patient: Patient) {
  const headers = [
    'Nombre', 'RUT', 'Fecha Nacimiento', 'Edad', 'Teléfono', 'Email',
    'Diagnóstico', 'Estado', 'Motivo Consulta', 'Derivado por',
    'Antecedentes Perinatales', 'Desarrollo Psicomotor', 'Observaciones'
  ];
  
  const values = [
    patient.name,
    patient.rut,
    patient.birth_date || '',
    patient.age?.toString() || '',
    patient.phone || '',
    patient.email || '',
    patient.diagnosis || '',
    patient.status,
    patient.consult_reason || '',
    patient.referred_by || '',
    patient.perinatal_history || '',
    patient.psychomotor_dev || '',
    patient.observations || '',
  ];
  
  const csvContent = [
    headers.join(','),
    values.map(v => `"${v.replace(/"/g, '""')}"`).join(','),
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `paciente_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}
