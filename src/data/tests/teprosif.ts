export interface TEPROSIFItem {
  id: number;
  targetWord: string;
}

export interface TEPROSIFProcess {
  id: string;
  name: string;
  code: string;
  category: 'estructura' | 'asimilacion' | 'sustitucion';
  description: string;
  examples: string[];
}

export const teprosifItems: TEPROSIFItem[] = [
  { id: 1, targetWord: 'pelota' },
  { id: 2, targetWord: 'plátano' },
  { id: 3, targetWord: 'frutilla' },
  { id: 4, targetWord: 'tren' },
  { id: 5, targetWord: 'dragón' },
  { id: 6, targetWord: 'blanco' },
  { id: 7, targetWord: 'globo' },
  { id: 8, targetWord: 'princesa' },
  { id: 9, targetWord: 'estrella' },
  { id: 10, targetWord: 'cruz' },
  { id: 11, targetWord: 'flor' },
  { id: 12, targetWord: 'bicicleta' },
  { id: 13, targetWord: 'cuchara' },
  { id: 14, targetWord: 'chocolate' },
  { id: 15, targetWord: 'queso' },
  { id: 16, targetWord: 'guitarra' },
  { id: 17, targetWord: 'payaso' },
  { id: 18, targetWord: 'llave' },
  { id: 19, targetWord: 'lluvia' },
  { id: 20, targetWord: 'zapato' },
  { id: 21, targetWord: 'camisa' },
  { id: 22, targetWord: 'jardín' },
  { id: 23, targetWord: 'tambor' },
  { id: 24, targetWord: 'bandera' },
  { id: 25, targetWord: 'serpiente' },
  { id: 26, targetWord: 'escalera' },
  { id: 27, targetWord: 'escuela' },
  { id: 28, targetWord: 'espejo' },
  { id: 29, targetWord: 'hospital' },
  { id: 30, targetWord: 'policía' },
];

export const teprosifProcesses: TEPROSIFProcess[] = [
  // Procesos de Estructura Silábica
  {
    id: 'red_gc',
    name: 'Reducción grupo consonántico',
    code: 'R.G.C.',
    category: 'estructura',
    description: 'Omisión de uno de los elementos del grupo consonántico',
    examples: ['plancha → pancha', 'tren → ten'],
  },
  {
    id: 'red_dipt',
    name: 'Reducción de diptongo',
    code: 'R.Dipt.',
    category: 'estructura',
    description: 'Reducción del diptongo a un solo elemento vocálico',
    examples: ['auto → ato', 'jaula → jala'],
  },
  {
    id: 'om_cons_fin',
    name: 'Omisión consonante final',
    code: 'O.C.F.',
    category: 'estructura',
    description: 'Omisión de la consonante trabante',
    examples: ['tambor → tambo', 'pan → pa'],
  },
  {
    id: 'om_sil_at',
    name: 'Omisión sílaba átona',
    code: 'O.S.A.',
    category: 'estructura',
    description: 'Omisión de una sílaba no acentuada',
    examples: ['mariposa → maposa', 'teléfono → tefono'],
  },
  {
    id: 'om_elem_at',
    name: 'Omisión elemento átono',
    code: 'O.E.A.',
    category: 'estructura',
    description: 'Omisión de un elemento no acentuado',
    examples: ['refrigerador → refrigador'],
  },
  {
    id: 'adicion',
    name: 'Adición de fonemas o sílabas',
    code: 'Adic.',
    category: 'estructura',
    description: 'Agregación de fonemas o sílabas que no corresponden',
    examples: ['tres → teres', 'flor → felor'],
  },
  {
    id: 'inversion',
    name: 'Inversión de fonemas o sílabas',
    code: 'Inv.',
    category: 'estructura',
    description: 'Cambio de orden de fonemas o sílabas',
    examples: ['estufa → etufa'],
  },
  // Procesos de Asimilación
  {
    id: 'asim_iden',
    name: 'Asimilación idéntica',
    code: 'A.I.',
    category: 'asimilacion',
    description: 'Un fonema se hace idéntico a otro presente en la palabra',
    examples: ['mariposa → marimosa', 'teléfono → teletono'],
  },
  {
    id: 'asim_lab',
    name: 'Asimilación labial',
    code: 'A.Lab.',
    category: 'asimilacion',
    description: 'Un fonema asimila el rasgo labial de otro',
    examples: ['bufanda → bubanda'],
  },
  {
    id: 'asim_dent',
    name: 'Asimilación dental',
    code: 'A.Dent.',
    category: 'asimilacion',
    description: 'Un fonema asimila el rasgo dental de otro',
    examples: ['dulce → dutce'],
  },
  {
    id: 'asim_vel',
    name: 'Asimilación velar',
    code: 'A.Vel.',
    category: 'asimilacion',
    description: 'Un fonema asimila el rasgo velar de otro',
    examples: ['enchufe → encufe'],
  },
  {
    id: 'asim_pal',
    name: 'Asimilación palatal',
    code: 'A.Pal.',
    category: 'asimilacion',
    description: 'Un fonema asimila el rasgo palatal de otro',
    examples: ['plancha → plañcha'],
  },
  {
    id: 'asim_nas',
    name: 'Asimilación nasal',
    code: 'A.Nas.',
    category: 'asimilacion',
    description: 'Un fonema asimila el rasgo nasal de otro',
    examples: ['pantalón → mantalón'],
  },
  {
    id: 'asim_son',
    name: 'Asimilación de sonoridad',
    code: 'A.Son.',
    category: 'asimilacion',
    description: 'Un fonema asimila la sonoridad de otro',
    examples: ['bicicleta → bisisleta'],
  },
  // Procesos de Sustitución
  {
    id: 'sust_fon_liq',
    name: 'Sustitución fonemas líquidos entre sí',
    code: 'S.Líq.',
    category: 'sustitucion',
    description: 'Cambio de /r/, /l/, /rr/ entre sí',
    examples: ['regalo → legalo', 'alfombra → arfombra'],
  },
  {
    id: 'sust_liq_x_no_liq',
    name: 'Sustitución de líquido por no líquido',
    code: 'S.L/NL',
    category: 'sustitucion',
    description: 'Cambio de fonema líquido por otro fonema',
    examples: ['remedio → demedio', 'polera → podeda'],
  },
  {
    id: 'post_ant',
    name: 'Posteriorización (frontal por posterior)',
    code: 'Post.',
    category: 'sustitucion',
    description: 'Cambio de fonema frontal por uno posterior',
    examples: ['taza → kaza', 'sopa → jopa'],
  },
  {
    id: 'front',
    name: 'Frontalización (posterior por frontal)',
    code: 'Front.',
    category: 'sustitucion',
    description: 'Cambio de fonema posterior por uno frontal',
    examples: ['gato → dato', 'casa → tasa'],
  },
  {
    id: 'son',
    name: 'Sonorización',
    code: 'Son.',
    category: 'sustitucion',
    description: 'Cambio de fonema sordo por sonoro',
    examples: ['pato → bato', 'taza → daza'],
  },
  {
    id: 'asord',
    name: 'Ensordecimiento',
    code: 'Asord.',
    category: 'sustitucion',
    description: 'Cambio de fonema sonoro por sordo',
    examples: ['bota → pota', 'dedo → teto'],
  },
  {
    id: 'sem_voc',
    name: 'Semiconsonantización de líquidas',
    code: 'S.Voc.',
    category: 'sustitucion',
    description: 'Cambio de líquida por semiconsonante',
    examples: ['plato → piato', 'clavo → ciavo'],
  },
];

export const teprosifNorms: { age: string; min: number; max: number; percentile50: number }[] = [
  { age: '3:0-3:5', min: 0, max: 37, percentile50: 15 },
  { age: '3:6-3:11', min: 0, max: 37, percentile50: 11 },
  { age: '4:0-4:5', min: 0, max: 37, percentile50: 8 },
  { age: '4:6-4:11', min: 0, max: 37, percentile50: 6 },
  { age: '5:0-5:5', min: 0, max: 37, percentile50: 4 },
  { age: '5:6-5:11', min: 0, max: 37, percentile50: 3 },
  { age: '6:0-6:11', min: 0, max: 37, percentile50: 2 },
];

export const teprosifTestInfo = {
  id: 'teprosif',
  name: 'TEPROSIF-R',
  fullName: 'Test para Evaluar Procesos de Simplificación Fonológica - Revisado',
  description: 'Evaluación de los procesos de simplificación fonológica en niños de 3 a 6 años',
  ageRange: '3 a 6 años 11 meses',
  duration: '15-20 minutos',
  items: teprosifItems,
  processes: teprosifProcesses,
  norms: teprosifNorms,
  totalItems: 37,
  scoring: {
    description: 'Se contabiliza el número total de PSF presentes en las producciones del niño',
    interpretation: 'A mayor cantidad de PSF, mayor es la severidad del trastorno fonológico',
  },
};
