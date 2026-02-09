export interface MBGRSection {
  id: string;
  title: string;
  subsections: MBGRSubsection[];
}

export interface MBGRSubsection {
  id: string;
  name: string;
  items: MBGRItem[];
}

export interface MBGRItem {
  id: string;
  label: string;
  type: 'select' | 'text' | 'number';
  options?: { value: string; label: string; score?: number }[];
  unit?: string;
}

export const mbgrSections: MBGRSection[] = [
  {
    id: 'medidas_faciales',
    title: 'I. MEDIDAS FACIALES, MOVIMIENTOS MANDIBULARES Y OCLUSIÓN',
    subsections: [
      {
        id: 'medidas',
        name: 'Medidas faciales (tomar cada medida 3 veces y calcular la media)',
        items: [
          { id: 'tercio_medio', label: 'A. Tercio medio de la cara (glabela a subnasal)', type: 'number', unit: 'mm' },
          { id: 'tercio_inferior', label: 'B. Tercio inferior de la cara (subnasal a mentón)', type: 'number', unit: 'mm' },
          { id: 'altura_cara', label: 'C. Altura de la cara (glabela a mentón)', type: 'number', unit: 'mm' },
          { id: 'ancho_cara', label: 'D. Ancho de la cara (arcos cigomáticos)', type: 'number', unit: 'mm' },
          { id: 'canto_der', label: 'E. Canto externo ojo derecho a comisura labial derecha', type: 'number', unit: 'mm' },
          { id: 'canto_izq', label: 'F. Canto externo ojo izquierdo a comisura labial izquierda', type: 'number', unit: 'mm' },
          { id: 'labio_sup', label: 'G. Labio superior', type: 'number', unit: 'mm' },
          { id: 'labio_inf', label: 'H. Labio inferior', type: 'number', unit: 'mm' },
        ],
      },
      {
        id: 'mov_mandibulares',
        name: 'Movimientos mandibulares y oclusión',
        items: [
          { id: 'overbite', label: 'A. Entrecruzamiento vertical (Overbite)', type: 'number', unit: 'mm' },
          { id: 'overjet', label: 'B. Entrecruzamiento horizontal (Overjet)', type: 'number', unit: 'mm' },
          { id: 'lat_der', label: 'C. Lateralidad mandibular derecha', type: 'number', unit: 'mm' },
          { id: 'lat_izq', label: 'D. Lateralidad mandibular izquierda', type: 'number', unit: 'mm' },
          { id: 'dima', label: 'E. Distancia interincisal máxima activa (DIMA)', type: 'number', unit: 'mm' },
          { id: 'abertura_boca', label: 'F. Abertura de boca', type: 'number', unit: 'mm' },
        ],
      },
    ],
  },
  {
    id: 'examen_extraoral',
    title: 'II. EXAMEN EXTRAORAL',
    subsections: [
      {
        id: 'rostro',
        name: 'Rostro',
        items: [
          { id: 'tipo_facial', label: 'Tipo facial', type: 'select', options: [
            { value: 'medio', label: 'Medio', score: 0 },
            { value: 'largo', label: 'Largo', score: 1 },
            { value: 'corto', label: 'Corto', score: 2 },
          ]},
          { id: 'proporcion_facial', label: 'Proporción facial', type: 'select', options: [
            { value: 'semejantes', label: 'Semejantes', score: 0 },
            { value: 'tercio_inf_mayor', label: 'Tercio inferior mayor', score: 1 },
            { value: 'tercio_inf_menor', label: 'Tercio inferior menor', score: 1 },
            { value: 'asimetrica', label: 'Asimétrica', score: 1 },
          ]},
          { id: 'patron_facial', label: 'Patrón facial (vista lateral)', type: 'select', options: [
            { value: 'recto', label: 'I - Recto', score: 0 },
            { value: 'convexo', label: 'II - Convexo', score: 1 },
            { value: 'concavo', label: 'III - Cóncavo', score: 1 },
          ]},
          { id: 'angulo_nasolabial', label: 'Ángulo nasolabial', type: 'select', options: [
            { value: 'normal', label: '90°–110°', score: 0 },
            { value: 'menor', label: '<90°', score: 1 },
            { value: 'mayor', label: '>110°', score: 1 },
          ]},
        ],
      },
      {
        id: 'labios_ext',
        name: 'Labios',
        items: [
          { id: 'postura_labios', label: 'Postura habitual', type: 'select', options: [
            { value: 'cerrados', label: 'Cerrados', score: 0 },
            { value: 'cerrados_tension', label: 'Cerrados con tensión', score: 1 },
            { value: 'entreabiertos', label: 'Entreabiertos', score: 2 },
            { value: 'abiertos', label: 'Abiertos', score: 3 },
          ]},
          { id: 'forma_labios', label: 'Forma', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'asa_gaviota', label: 'Asa de gaviota', score: 1 },
            { value: 'fisurado', label: 'Fisurado', score: 1 },
            { value: 'eversion', label: 'Eversión', score: 1 },
          ]},
          { id: 'mucosa_externa', label: 'Mucosa externa', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'con_saliva', label: 'Con saliva', score: 1 },
            { value: 'reseca', label: 'Reseca', score: 1 },
            { value: 'herida', label: 'Herida', score: 1 },
          ]},
        ],
      },
      {
        id: 'masetero',
        name: 'Masetero',
        items: [
          { id: 'masetero_reposo', label: 'En reposo', type: 'select', options: [
            { value: 'relajado', label: 'Relajado', score: 0 },
            { value: 'contraido', label: 'Contraído', score: 1 },
          ]},
          { id: 'masetero_reclutamiento', label: 'Reclutamiento isométrico', type: 'select', options: [
            { value: 'simultaneo', label: 'Simultáneo', score: 0 },
            { value: 'primero_der', label: 'Primero lado derecho', score: 1 },
            { value: 'primero_izq', label: 'Primero lado izquierdo', score: 1 },
          ]},
        ],
      },
    ],
  },
  {
    id: 'examen_intraoral',
    title: 'III. EXAMEN INTRAORAL',
    subsections: [
      {
        id: 'labios_int',
        name: 'Labios (mucosa interna)',
        items: [
          { id: 'mucosa_interna', label: 'Mucosa interna', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'marcas_dentarias', label: 'Marcas dentarias', score: 1 },
            { value: 'heridas', label: 'Heridas', score: 1 },
          ]},
          { id: 'frenillo_sup_fijacion', label: 'Frenillo superior - Fijación', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'baja', label: 'Baja', score: 1 },
            { value: 'diastema', label: 'Con diastema', score: 1 },
          ]},
        ],
      },
      {
        id: 'paladar',
        name: 'Paladar',
        items: [
          { id: 'paladar_duro_prof', label: 'Paladar duro - Profundidad', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'bajo', label: 'Bajo', score: 1 },
            { value: 'alto', label: 'Alto (ojival)', score: 1 },
          ]},
          { id: 'paladar_duro_ancho', label: 'Paladar duro - Ancho', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'ancho', label: 'Ancho', score: 1 },
            { value: 'estrecho', label: 'Estrecho', score: 1 },
          ]},
          { id: 'velo_simetria', label: 'Velo palatino - Simetría', type: 'select', options: [
            { value: 'presente', label: 'Presente', score: 0 },
            { value: 'ausente', label: 'Ausente', score: 1 },
          ]},
          { id: 'velo_extension', label: 'Velo palatino - Extensión', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'larga', label: 'Larga', score: 1 },
            { value: 'corta', label: 'Corta', score: 1 },
          ]},
          { id: 'uvula', label: 'Úvula', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'alterada', label: 'Alterada', score: 1 },
          ]},
        ],
      },
      {
        id: 'tonsilas',
        name: 'Tonsilas palatinas',
        items: [
          { id: 'tonsilas_presencia', label: 'Presencia', type: 'select', options: [
            { value: 'presentes', label: 'Presentes', score: 0 },
            { value: 'removidas', label: 'Removidas', score: 0 },
            { value: 'no_observadas', label: 'No observadas', score: 0 },
          ]},
          { id: 'tonsilas_grado', label: 'Grado (Brodsky)', type: 'select', options: [
            { value: '0', label: '0 - Cubiertas por pilar anterior', score: 0 },
            { value: '1', label: '1 - <25%', score: 1 },
            { value: '2', label: '2 - 25–50%', score: 2 },
            { value: '3', label: '3 - 50–75%', score: 3 },
            { value: '4', label: '4 - >75%', score: 4 },
          ]},
        ],
      },
      {
        id: 'mallampati',
        name: 'Test de Mallampati',
        items: [
          { id: 'mallampati', label: 'Clasificación', type: 'select', options: [
            { value: 'I', label: 'Clase I - Paladar blando, úvula y pilares visibles', score: 0 },
            { value: 'II', label: 'Clase II - Paladar blando y úvula visibles', score: 1 },
            { value: 'III', label: 'Clase III - Paladar blando y base de úvula visibles', score: 2 },
            { value: 'IV', label: 'Clase IV - Paladar no observable', score: 3 },
          ]},
        ],
      },
    ],
  },
  {
    id: 'movilidad',
    title: 'IV. MOVILIDAD',
    subsections: [
      {
        id: 'mov_labios',
        name: 'Labios',
        items: [
          { id: 'mov_protrusion', label: 'Protrusión', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'ausente', label: 'Ausente', score: 2 },
          ]},
          { id: 'mov_retraccion', label: 'Retracción', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'ausente', label: 'Ausente', score: 2 },
          ]},
          { id: 'mov_estallido', label: 'Estallido', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'ausente', label: 'Ausente', score: 2 },
          ]},
        ],
      },
      {
        id: 'mov_lengua',
        name: 'Lengua',
        items: [
          { id: 'lengua_protruir', label: 'Protruir', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'ausente', label: 'Ausente', score: 2 },
          ]},
          { id: 'lengua_comisuras', label: 'Tocar comisuras', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'ausente', label: 'Ausente', score: 2 },
          ]},
          { id: 'lengua_alveolar', label: 'Tocar región alveolar', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'ausente', label: 'Ausente', score: 2 },
          ]},
          { id: 'lengua_mejillas', label: 'Tocar mejillas', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'ausente', label: 'Ausente', score: 2 },
          ]},
          { id: 'lengua_chasquido', label: 'Chasquido', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'ausente', label: 'Ausente', score: 2 },
          ]},
          { id: 'lengua_vibrar', label: 'Vibrar', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'ausente', label: 'Ausente', score: 2 },
          ]},
        ],
      },
      {
        id: 'mov_mandibula',
        name: 'Mandíbula',
        items: [
          { id: 'mand_abertura', label: 'Abertura', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
          ]},
          { id: 'mand_cierre', label: 'Cierre', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
          ]},
          { id: 'mand_lateralizacion', label: 'Lateralización', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
          ]},
        ],
      },
    ],
  },
  {
    id: 'tono_muscular',
    title: 'V. FUNCIÓN MUSCULAR (Tono)',
    subsections: [
      {
        id: 'tono',
        name: 'Evaluar tono',
        items: [
          { id: 'tono_labio_sup', label: 'Labio superior', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'disminuido', label: 'Disminuido', score: 1 },
            { value: 'aumentado', label: 'Aumentado', score: 1 },
          ]},
          { id: 'tono_labio_inf', label: 'Labio inferior', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'disminuido', label: 'Disminuido', score: 1 },
            { value: 'aumentado', label: 'Aumentado', score: 1 },
          ]},
          { id: 'tono_menton', label: 'Mentón', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'disminuido', label: 'Disminuido', score: 1 },
            { value: 'aumentado', label: 'Aumentado', score: 1 },
          ]},
          { id: 'tono_lengua', label: 'Lengua', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'disminuido', label: 'Disminuido', score: 1 },
            { value: 'aumentado', label: 'Aumentado', score: 1 },
          ]},
          { id: 'tono_mejillas', label: 'Mejillas', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'disminuido', label: 'Disminuido', score: 1 },
            { value: 'aumentado', label: 'Aumentado', score: 1 },
          ]},
        ],
      },
    ],
  },
  {
    id: 'funciones',
    title: 'VI. FUNCIONES OROFACIALES',
    subsections: [
      {
        id: 'respiracion',
        name: 'Respiración',
        items: [
          { id: 'resp_tipo', label: 'Tipo', type: 'select', options: [
            { value: 'medio_inferior', label: 'Medio/inferior', score: 0 },
            { value: 'medio_superior', label: 'Medio/superior', score: 1 },
          ]},
          { id: 'resp_modo', label: 'Modo', type: 'select', options: [
            { value: 'nasal', label: 'Nasal', score: 0 },
            { value: 'oronasal', label: 'Oronasal', score: 1 },
            { value: 'oral', label: 'Oral', score: 2 },
          ]},
          { id: 'resp_uso_nasal', label: 'Uso nasal', type: 'select', options: [
            { value: 'mas_2min', label: '>2 min', score: 0 },
            { value: '1_2min', label: '1–2 min', score: 1 },
            { value: 'menos_1min', label: '<1 min', score: 2 },
          ]},
        ],
      },
      {
        id: 'masticacion',
        name: 'Masticación',
        items: [
          { id: 'mast_incision', label: 'Incisión', type: 'select', options: [
            { value: 'anterior', label: 'Anterior', score: 0 },
            { value: 'lateral', label: 'Lateral', score: 1 },
          ]},
          { id: 'mast_trituracion', label: 'Trituración', type: 'select', options: [
            { value: 'posterior', label: 'Posterior', score: 0 },
            { value: 'anterior', label: 'Anterior', score: 1 },
            { value: 'lengua', label: 'Con lengua', score: 1 },
          ]},
          { id: 'mast_patron', label: 'Patrón masticatorio', type: 'select', options: [
            { value: 'bilateral', label: 'Bilateral alternado', score: 0 },
            { value: 'unilateral_pref', label: 'Unilateral preferencial', score: 1 },
            { value: 'unilateral_cron', label: 'Unilateral crónico', score: 2 },
          ]},
          { id: 'mast_cierre_labial', label: 'Cierre labial', type: 'select', options: [
            { value: 'adecuado', label: 'Adecuado', score: 0 },
            { value: 'inadecuado', label: 'Inadecuado', score: 1 },
          ]},
        ],
      },
      {
        id: 'deglucion',
        name: 'Deglución',
        items: [
          { id: 'deg_postura_labios', label: 'Postura de labios', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'inadecuada', label: 'Inadecuada', score: 1 },
          ]},
          { id: 'deg_postura_lengua', label: 'Postura de lengua', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'anteriorizada', label: 'Anteriorizada', score: 1 },
            { value: 'interposicion', label: 'Interposición', score: 2 },
          ]},
          { id: 'deg_contraccion_orb', label: 'Contracción orbicular', type: 'select', options: [
            { value: 'ausente', label: 'Ausente', score: 0 },
            { value: 'presente', label: 'Presente', score: 1 },
          ]},
          { id: 'deg_contraccion_ment', label: 'Contracción mentoniana', type: 'select', options: [
            { value: 'ausente', label: 'Ausente', score: 0 },
            { value: 'presente', label: 'Presente', score: 1 },
          ]},
          { id: 'deg_mov_cabeza', label: 'Movimiento de cabeza', type: 'select', options: [
            { value: 'ausente', label: 'Ausente', score: 0 },
            { value: 'presente', label: 'Presente', score: 1 },
          ]},
          { id: 'deg_ruido', label: 'Ruido', type: 'select', options: [
            { value: 'ausente', label: 'Ausente', score: 0 },
            { value: 'presente', label: 'Presente', score: 1 },
          ]},
          { id: 'deg_residuos', label: 'Residuos', type: 'select', options: [
            { value: 'ausentes', label: 'Ausentes', score: 0 },
            { value: 'presentes', label: 'Presentes', score: 1 },
          ]},
        ],
      },
      {
        id: 'habla',
        name: 'Habla',
        items: [
          { id: 'habla_saliva', label: 'Saliva', type: 'select', options: [
            { value: 'normal', label: 'Normal', score: 0 },
            { value: 'excesiva', label: 'Excesiva', score: 1 },
          ]},
          { id: 'habla_abertura', label: 'Abertura bucal', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'reducida', label: 'Reducida', score: 1 },
            { value: 'exagerada', label: 'Exagerada', score: 1 },
          ]},
          { id: 'habla_resonancia', label: 'Resonancia', type: 'select', options: [
            { value: 'equilibrada', label: 'Equilibrada', score: 0 },
            { value: 'hipernasal', label: 'Hipernasal', score: 1 },
            { value: 'hiponasal', label: 'Hiponasal', score: 1 },
          ]},
          { id: 'habla_velocidad', label: 'Velocidad', type: 'select', options: [
            { value: 'adecuada', label: 'Adecuada', score: 0 },
            { value: 'aumentada', label: 'Aumentada', score: 1 },
            { value: 'reducida', label: 'Reducida', score: 1 },
          ]},
          { id: 'habla_imprecision', label: 'Imprecisión articulatoria', type: 'select', options: [
            { value: 'ausente', label: 'Ausente', score: 0 },
            { value: 'presente', label: 'Presente', score: 1 },
          ]},
        ],
      },
    ],
  },
  {
    id: 'conclusion',
    title: 'VII. CONCLUSIÓN',
    subsections: [
      {
        id: 'diagnostico',
        name: 'Diagnóstico y Plan',
        items: [
          { id: 'hipotesis', label: 'Hipótesis diagnóstica fonoaudiológica', type: 'text' },
          { id: 'pronostico', label: 'Pronóstico', type: 'text' },
          { id: 'plan', label: 'Plan terapéutico', type: 'text' },
          { id: 'derivaciones', label: 'Derivaciones', type: 'text' },
          { id: 'orientaciones', label: 'Orientaciones', type: 'text' },
        ],
      },
    ],
  },
];

export const mbgrTestInfo = {
  id: 'mbgr',
  name: 'Protocolo MBGR',
  fullName: 'Evaluación Miofuncional Orofacial – Protocolo MBGR',
  description: 'Evaluación completa de estructuras y funciones del sistema estomatognático',
  ageRange: 'Todas las edades',
  duration: '30-45 minutos',
  sections: mbgrSections,
};
