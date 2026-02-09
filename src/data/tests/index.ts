export { mbgrSections, mbgrTestInfo, type MBGRSection, type MBGRSubsection, type MBGRItem } from './mbgr';
export { tarSections, tarFrases, tarTestInfo, type TARSection, type TARItem } from './tar';
export { teprosifItems, teprosifProcesses, teprosifTestInfo, type TEPROSIFItem, type TEPROSIFProcess } from './teprosif';

export const availableTests = [
  {
    id: 'mbgr',
    name: 'Protocolo MBGR',
    description: 'Evaluación Miofuncional Orofacial',
    category: 'Motricidad Orofacial',
    ageRange: 'Todas las edades',
    duration: '30-45 min',
  },
  {
    id: 'tar',
    name: 'TAR Abreviado',
    description: 'Test de Articulación a la Repetición',
    category: 'Articulación',
    ageRange: '3-7 años',
    duration: '15-20 min',
  },
  {
    id: 'teprosif',
    name: 'TEPROSIF-R',
    description: 'Test de Procesos de Simplificación Fonológica',
    category: 'Fonología',
    ageRange: '3-6 años',
    duration: '15-20 min',
  },
];
