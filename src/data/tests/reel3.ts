export interface REEL3Item {
  id: string;
  number: number;
  question: string;
}

export interface REEL3AgeGroup {
  id: string;
  name: string;
  ageRange: string;
  expressivoItems: REEL3Item[];
  receptivoItems: REEL3Item[];
}

export interface REEL3PatientInfo {
  nombreNino: string;
  sexo: 'mujer' | 'hombre' | '';
  nombreInformante: string;
  relacionConNino: string;
  establecimiento: string;
  nombreExaminador: string;
  fechaEvaluacion: string;
  fechaNacimiento: string;
  edadCronologica: string;
  ajustePrematurez: string;
  edadCorregida: string;
  edadEnMeses: string;
}

export interface REEL3Scores {
  receptivo: {
    puntajeBruto: string;
    edadEquivalente: string;
    puntajeHabilidad: string;
    percentil: string;
    sem: string;
    intervaloConfianzaMin: string;
    intervaloConfianzaMax: string;
    rangoDescriptivo: string;
  };
  expresivo: {
    puntajeBruto: string;
    edadEquivalente: string;
    puntajeHabilidad: string;
    percentil: string;
    sem: string;
    intervaloConfianzaMin: string;
    intervaloConfianzaMax: string;
    rangoDescriptivo: string;
  };
  sumaPuntajeHabilidad: string;
  puntajeHabilidadLenguaje: {
    puntaje: string;
    percentil: string;
    intervaloMin: string;
    intervaloMax: string;
    rangoDescriptivo: string;
  };
}

export const reel3ScoreInterpretation = [
  { range: '>130', descriptor: 'Muy superior', percentage: '2.34%' },
  { range: '121–130', descriptor: 'Superior', percentage: '6.87%' },
  { range: '111–120', descriptor: 'Sobre el promedio', percentage: '16.12%' },
  { range: '90–110', descriptor: 'Promedio', percentage: '49.51%' },
  { range: '80–89', descriptor: 'Bajo el promedio', percentage: '16.12%' },
  { range: '70–79', descriptor: 'Pobre', percentage: '6.87%' },
  { range: '<70', descriptor: 'Muy pobre', percentage: '2.34%' },
];

export const reel3AgeGroups: REEL3AgeGroup[] = [
  {
    id: '0-6',
    name: '0–6 Meses',
    ageRange: '0-6 meses',
    expressivoItems: [
      { id: 'e1', number: 1, question: '¿Llora fuerte y claro?' },
      { id: 'e2', number: 2, question: '¿Hace otros sonidos aparte del llanto?' },
      { id: 'e3', number: 3, question: '¿Hace sonidos como "eee", "iii", "aaa"?' },
      { id: 'e4', number: 4, question: '¿Llora distinto cuando tiene hambre?' },
      { id: 'e5', number: 5, question: '¿Hace sonidos de placer al alimentarse?' },
      { id: 'e6', number: 6, question: '¿Puede notar cuando está contento por sus sonidos?' },
      { id: 'e7', number: 7, question: '¿Responde con sonidos al escuchar voces?' },
      { id: 'e8', number: 8, question: '¿Se ríe o hace ruidos de placer cuando juegan con él/ella?' },
      { id: 'e9', number: 9, question: '¿Hace más sonidos frente a personas que cuando está solo?' },
      { id: 'e10', number: 10, question: '¿Hace sonidos nuevos como "uuu"?' },
      { id: 'e11', number: 11, question: '¿Varía la intensidad de sus sonidos?' },
      { id: 'e12', number: 12, question: '¿Hace sonidos como "ba", "pa" o "ma"?' },
      { id: 'e13', number: 13, question: '¿Se ríe o "habla" mientras juega?' },
      { id: 'e14', number: 14, question: '¿Usa sonidos distintos al llanto cuando está molesto?' },
      { id: 'e15', number: 15, question: '¿Repite sonidos como "aaa-aaa"?' },
    ],
    receptivoItems: [
      { id: 'r1', number: 1, question: '¿Se sobresalta ante ruidos repentinos?' },
      { id: 'r2', number: 2, question: '¿Se queda quieto ante ruidos poco habituales?' },
      { id: 'r3', number: 3, question: '¿Se calma al oír una voz conocida?' },
      { id: 'r4', number: 4, question: '¿Mira hacia sonidos o voces nuevas?' },
      { id: 'r5', number: 5, question: '¿Mira hacia quien habla?' },
      { id: 'r6', number: 6, question: '¿Mira y sonríe al hablante?' },
      { id: 'r7', number: 7, question: '¿Mira directamente la cara de quien habla?' },
      { id: 'r8', number: 8, question: '¿Busca con la mirada a quien habla cerca?' },
      { id: 'r9', number: 9, question: '¿Se fija en la boca de quien habla?' },
      { id: 'r10', number: 10, question: '¿Gira cabeza y ojos hacia el hablante?' },
      { id: 'r11', number: 11, question: '¿Intenta encontrar a quien escucha?' },
      { id: 'r12', number: 12, question: '¿Se asusta con una voz enojada?' },
      { id: 'r13', number: 13, question: '¿Encuentra rápidamente la fuente de la voz?' },
      { id: 'r14', number: 14, question: '¿Muestra interés al escuchar su nombre?' },
      { id: 'r15', number: 15, question: '¿Deja de llorar con voz de consuelo?' },
    ],
  },
  {
    id: '7-12',
    name: '7–12 Meses',
    ageRange: '7-12 meses',
    expressivoItems: [
      { id: 'e16', number: 16, question: '¿Balbucea al ver personas?' },
      { id: 'e17', number: 17, question: '¿Combina sonidos como "pa-da"?' },
      { id: 'e18', number: 18, question: '¿Balbucea como juego?' },
      { id: 'e19', number: 19, question: '¿Grita para llamar la atención?' },
      { id: 'e20', number: 20, question: '¿Responde con sonidos a su nombre?' },
      { id: 'e21', number: 21, question: '¿Usa expresiones que parecen palabras?' },
      { id: 'e22', number: 22, question: '¿Emite sonidos sin mover el cuerpo?' },
      { id: 'e23', number: 23, question: '¿Juega a "ahí está" o aplaude?' },
      { id: 'e24', number: 24, question: '¿Usa sus propias palabras al cantar?' },
      { id: 'e25', number: 25, question: '¿Intenta imitar sonidos?' },
      { id: 'e26', number: 26, question: '¿Parece hablar en oraciones?' },
      { id: 'e27', number: 27, question: '¿Agrega sonidos al inicio de vocalizaciones?' },
      { id: 'e28', number: 28, question: '¿Usa palabras asociadas a situaciones?' },
      { id: 'e29', number: 29, question: '¿Usa exclamaciones?' },
      { id: 'e30', number: 30, question: '¿Dice "no" para rechazar algo?' },
      { id: 'e31', number: 31, question: '¿Inicia juegos como aplaudir?' },
      { id: 'e32', number: 32, question: '¿Sus sonidos reflejan felicidad?' },
      { id: 'e33', number: 33, question: '¿Usa voz y gestos para pedir algo?' },
    ],
    receptivoItems: [
      { id: 'r16', number: 16, question: '¿Reacciona distinto según el tono de voz?' },
      { id: 'r17', number: 17, question: '¿Reconoce "mamá", "papá", "chao"?' },
      { id: 'r18', number: 18, question: '¿Se detiene cuando le dicen "no"?' },
      { id: 'r19', number: 19, question: '¿Reacciona al nombrar familiares?' },
      { id: 'r20', number: 20, question: '¿Levanta brazos al decir "arriba"?' },
      { id: 'r21', number: 21, question: '¿Escucha música con interés?' },
      { id: 'r22', number: 22, question: '¿Se detiene a escuchar conversaciones?' },
      { id: 'r23', number: 23, question: '¿Se da vuelta al llamarlo?' },
      { id: 'r24', number: 24, question: '¿Mira objetos nombrados?' },
      { id: 'r25', number: 25, question: '¿Sigue órdenes simples?' },
      { id: 'r26', number: 26, question: '¿Se detiene ante advertencias?' },
      { id: 'r27', number: 27, question: '¿Escucha cuando le muestran imágenes?' },
      { id: 'r28', number: 28, question: '¿Disfruta escuchar nombres de objetos?' },
      { id: 'r29', number: 29, question: '¿Escucha sin distraerse?' },
      { id: 'r30', number: 30, question: '¿Entrega objetos cuando se le pide?' },
      { id: 'r31', number: 31, question: '¿Obedece órdenes simples?' },
      { id: 'r32', number: 32, question: '¿Entiende preguntas con "dónde"?' },
      { id: 'r33', number: 33, question: '¿Se mueve con música?' },
    ],
  },
  {
    id: '13-18',
    name: '13–18 Meses',
    ageRange: '13-18 meses',
    expressivoItems: [
      { id: 'e34', number: 34, question: '¿Dice palabras aparte de mamá/papá?' },
      { id: 'e35', number: 35, question: '¿"Conversa" con juguetes?' },
      { id: 'e36', number: 36, question: '¿Vocaliza si le cantan?' },
      { id: 'e37', number: 37, question: '¿Puede distinguirse cuando pregunta?' },
      { id: 'e38', number: 38, question: '¿Combina palabras y gestos?' },
      { id: 'e39', number: 39, question: '¿Dice palabras reales?' },
      { id: 'e40', number: 40, question: '¿Saluda con palabras?' },
      { id: 'e41', number: 41, question: '¿Llama su atención verbalmente?' },
      { id: 'e42', number: 42, question: '¿Usa palabras junto con gestos?' },
    ],
    receptivoItems: [
      { id: 'r34', number: 34, question: '¿Realiza acciones cuando se le pide?' },
      { id: 'r35', number: 35, question: '¿Escucha con interés?' },
      { id: 'r36', number: 36, question: '¿Saluda cuando se lo piden?' },
      { id: 'r37', number: 37, question: '¿Aprende nuevas palabras cada semana?' },
      { id: 'r38', number: 38, question: '¿Reconoce estados de ánimo?' },
      { id: 'r39', number: 39, question: '¿Señala objetos nombrados?' },
      { id: 'r40', number: 40, question: '¿Sigue órdenes de 2 pasos?' },
      { id: 'r41', number: 41, question: '¿Anticipa rutinas?' },
      { id: 'r42', number: 42, question: '¿Muestra partes del cuerpo?' },
    ],
  },
  {
    id: '19-24',
    name: '19–24 Meses',
    ageRange: '19-24 meses',
    expressivoItems: [
      { id: 'e43', number: 43, question: '¿Imita palabras escuchadas?' },
      { id: 'e44', number: 44, question: '¿Nombra juguetes o mascotas?' },
      { id: 'e45', number: 45, question: '¿Repite palabras favoritas?' },
      { id: 'e46', number: 46, question: '¿Imita sonidos del entorno?' },
      { id: 'e47', number: 47, question: '¿Dice cerca de 50 palabras?' },
      { id: 'e48', number: 48, question: '¿Dice frases de dos palabras?' },
    ],
    receptivoItems: [
      { id: 'r43', number: 43, question: '¿Entiende referencias a objetos fuera de la habitación?' },
      { id: 'r44', number: 44, question: '¿Nombra categorías?' },
      { id: 'r45', number: 45, question: '¿Disfruta rimas y canciones?' },
      { id: 'r46', number: 46, question: '¿Hace pausas esperando respuesta?' },
      { id: 'r47', number: 47, question: '¿Sigue instrucciones sin gestos?' },
      { id: 'r48', number: 48, question: '¿Comprende pronombres?' },
    ],
  },
  {
    id: '25-36',
    name: '25–36 Meses',
    ageRange: '25-36 meses',
    expressivoItems: [
      { id: 'e49', number: 49, question: '¿Dice al menos dos palabras nuevas por semana?' },
      { id: 'e50', number: 50, question: '¿Relata experiencias?' },
      { id: 'e51', number: 51, question: '¿Usa "yo", "mi", "este"?' },
      { id: 'e52', number: 52, question: '¿Se refiere a sí mismo por nombre?' },
      { id: 'e53', number: 53, question: '¿Se frustra si no lo entienden?' },
      { id: 'e54', number: 54, question: '¿Usa terminaciones verbales?' },
      { id: 'e55', number: 55, question: '¿Pronuncia palabras claramente?' },
      { id: 'e56', number: 56, question: '¿Pide ayuda?' },
      { id: 'e57', number: 57, question: '¿Usa palabras de posición?' },
      { id: 'e58', number: 58, question: '¿Pluraliza con "s"?' },
      { id: 'e59', number: 59, question: '¿Usa oraciones largas?' },
      { id: 'e60', number: 60, question: '¿Responde preguntas abiertas?' },
      { id: 'e61', number: 61, question: '¿Nombra colores o tamaños?' },
      { id: 'e62', number: 62, question: '¿Se le entiende la mayor parte del tiempo?' },
      { id: 'e63', number: 63, question: '¿Usa "por favor"?' },
      { id: 'e64', number: 64, question: '¿Cuenta historias?' },
      { id: 'e65', number: 65, question: '¿Hace preguntas?' },
      { id: 'e66', number: 66, question: '¿Mantiene conversaciones?' },
    ],
    receptivoItems: [
      { id: 'r49', number: 49, question: '¿Sigue órdenes de 3 partes?' },
      { id: 'r50', number: 50, question: '¿Reconoce palabras nuevas diariamente?' },
      { id: 'r51', number: 51, question: '¿Entiende la mayoría de objetos y acciones?' },
      { id: 'r52', number: 52, question: '¿Elige correctamente entre varios objetos?' },
      { id: 'r53', number: 53, question: '¿Comprende oraciones largas?' },
      { id: 'r54', number: 54, question: '¿Recuerda información?' },
      { id: 'r55', number: 55, question: '¿Identifica acciones en imágenes?' },
      { id: 'r56', number: 56, question: '¿Señala partes pequeñas del cuerpo?' },
      { id: 'r57', number: 57, question: '¿Responde sí/no por relación?' },
      { id: 'r58', number: 58, question: '¿Responde preguntas abiertas?' },
      { id: 'r59', number: 59, question: '¿Comprende tamaño y color?' },
      { id: 'r60', number: 60, question: '¿Entiende pasado y futuro?' },
      { id: 'r61', number: 61, question: '¿Sigue órdenes no relacionadas?' },
      { id: 'r62', number: 62, question: '¿Entiende lenguaje adulto?' },
      { id: 'r63', number: 63, question: '¿Comprende descripciones?' },
      { id: 'r64', number: 64, question: '¿Escucha explicaciones?' },
      { id: 'r65', number: 65, question: '¿Comprende posiciones?' },
      { id: 'r66', number: 66, question: '¿Recuerda secuencias de cuentos?' },
    ],
  },
];

export const reel3TestInfo = {
  id: 'reel-3',
  name: 'REEL-3',
  fullName: 'Receptive Expressive Emergent Language Test – Third Edition',
  spanishName: 'Test de Lenguaje Emergente Receptivo Expresivo – Tercera Edición',
  description: 'Un método para evaluar habilidades lingüísticas en niños mediante subpruebas receptiva y expresiva.',
  ageRange: '0-36 meses',
  instructions: {
    start: 'Comenzar preguntando según la edad del niño.',
    ceiling: 'Continuar hasta obtener 5 respuestas "NO" consecutivas (techo).',
    basal: 'Si no se obtiene puntaje basal (5 "SÍ" consecutivos), retroceder desde el punto de entrada hasta hallarlo.',
  },
};
