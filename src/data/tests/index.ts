export { mbgrSections, mbgrTestInfo, type MBGRSection, type MBGRSubsection, type MBGRItem } from './mbgr';
export { mmbgrLactantesSections, mmbgrLactantesTestInfo, type MMBGRSection, type MMBGRSubsection, type MMBGRItem } from './mmbgr-lactantes';
export { tarSections, tarFrases, tarTestInfo, type TARSection, type TARItem } from './tar';
export { teprosifItems, teprosifProcesses, teprosifTestInfo, type TEPROSIFItem, type TEPROSIFProcess } from './teprosif';
export { reel3AgeGroups, reel3TestInfo, reel3ScoreInterpretation, type REEL3Item, type REEL3AgeGroup } from './reel3';

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
    id: 'mmbgr-lactantes',
    name: 'Protocolo MMBGR - Lactantes',
    description: 'Examen Clínico Miofuncional Orofacial',
    category: 'Motricidad Orofacial',
    ageRange: '6-71 meses',
    duration: '25-35 min',
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
  {
    id: 'reel-3',
    name: 'REEL-3',
    description: 'Test de Lenguaje Emergente Receptivo Expresivo',
    category: 'Lenguaje',
    ageRange: '0-36 meses',
    duration: '20-30 min',
  },
];
