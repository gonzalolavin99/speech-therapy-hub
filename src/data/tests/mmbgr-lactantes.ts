/**
 * Protocolo MMBGR - Examen Clínico Miofuncional Orofacial
 * Edad de aplicación: 6 a 71 meses (Lactantes y Preescolares)
 */

export interface MMBGRSection {
  id: string;
  title: string;
  maxScore?: number;
  subsections: MMBGRSubsection[];
}

export interface MMBGRSubsection {
  id: string;
  name: string;
  maxScore?: number;
  items: MMBGRItem[];
}

export interface MMBGRItem {
  id: string;
  label: string;
  type: 'select' | 'text' | 'number' | 'multiselect';
  options?: { value: string; label: string; score?: number }[];
  unit?: string;
}

export const mmbgrLactantesTestInfo = {
  id: 'mmbgr-lactantes',
  name: 'Protocolo MMBGR - Lactantes',
  fullName: 'Protocolo MMBGR - Examen Clínico Miofuncional Orofacial',
  description: 'Evaluación miofuncional orofacial para lactantes y preescolares',
  category: 'Motricidad Orofacial',
  ageRange: '6 a 71 meses',
  duration: '25-35 min',
  scoring: 'Menor puntaje = mejor resultado',
};

export const mmbgrLactantesSections: MMBGRSection[] = [
  {
    id: 'examen_extraoral',
    title: 'EXAMEN EXTRAORAL',
    maxScore: 28,
    subsections: [
      {
        id: 'rostro',
        name: 'Rostro',
        maxScore: 16,
        items: [
          {
            id: 'tipo_facial',
            label: 'Tipo facial (comparar altura con ancho)',
            type: 'select',
            options: [
              { value: 'medio', label: 'Medio', score: 0 },
              { value: 'largo', label: 'Largo', score: 1 },
              { value: 'corto', label: 'Corto', score: 2 },
            ],
          },
          {
            id: 'proporcion_facial',
            label: 'Proporción facial',
            type: 'select',
            options: [
              { value: 'semejantes', label: 'Semejantes', score: 0 },
              { value: 'tercio_inf_mayor', label: 'Tercio inferior mayor', score: 1 },
              { value: 'tercio_inf_menor', label: 'Tercio inferior menor', score: 1 },
              { value: 'asimetrica', label: 'Asimétrica', score: 1 },
            ],
          },
          {
            id: 'simetria_infraorbitario',
            label: 'Simetría - Plano infraorbitario',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'simetria_cigomatica',
            label: 'Simetría - Región cigomática',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'simetria_alas_nariz',
            label: 'Simetría - Alas de la nariz',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'simetria_mejillas',
            label: 'Simetría - Mejillas',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'simetria_surco_nasolabial',
            label: 'Simetría - Surco nasolabial',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'simetria_labio_sup',
            label: 'Simetría - Labio superior',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'simetria_comisura',
            label: 'Simetría - Comisura labial',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'simetria_labio_inf',
            label: 'Simetría - Labio inferior',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'simetria_menton',
            label: 'Simetría - Mentón',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'simetria_mandibula',
            label: 'Simetría - Mandíbula',
            type: 'select',
            options: [
              { value: 'simetrico', label: 'Simétrico', score: 0 },
              { value: 'asimetrico', label: 'Asimétrico', score: 1 },
            ],
          },
          {
            id: 'patron_facial',
            label: 'Patrón facial (plano lateral)',
            type: 'select',
            options: [
              { value: 'patron_i', label: 'Patrón I - Recto', score: 0 },
              { value: 'patron_ii', label: 'Patrón II - Convexo', score: 1 },
              { value: 'patron_iii', label: 'Patrón III - Cóncavo', score: 1 },
            ],
          },
          {
            id: 'angulo_nasolabial',
            label: 'Ángulo nasolabial',
            type: 'select',
            options: [
              { value: 'normal', label: '90°–110°', score: 0 },
              { value: 'menor', label: '<90°', score: 1 },
              { value: 'mayor', label: '>110°', score: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'movilidad_labios',
    title: 'MOVILIDAD - LABIOS',
    maxScore: 24,
    subsections: [
      {
        id: 'labios',
        name: 'Labios (evaluar con dientes ocluidos)',
        items: [
          {
            id: 'protrusion_cerrados',
            label: 'Protrusión cerrados',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'retraccion_cerrados',
            label: 'Retracción cerrados',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'protrusion_abiertos',
            label: 'Protrusión abiertos',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'retraccion_abiertos',
            label: 'Retracción abiertos',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'protrusion_derecha',
            label: 'Protrusión hacia derecha',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'protrusion_izquierda',
            label: 'Protrusión hacia izquierda',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'estallar_protruidos',
            label: 'Estallar protruidos',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'estallar_retraidos',
            label: 'Estallar retraídos',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'labios_observaciones',
            label: 'Observaciones',
            type: 'text',
          },
        ],
      },
    ],
  },
  {
    id: 'movilidad_lengua',
    title: 'MOVILIDAD - LENGUA',
    maxScore: 24,
    subsections: [
      {
        id: 'lengua_movilidad',
        name: 'Lengua',
        items: [
          {
            id: 'protruir',
            label: 'Protruir',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'tocar_comisuras',
            label: 'Tocar comisuras alternadamente',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'tocar_alveolar',
            label: 'Tocar región alveolar',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'tocar_mejilla_der',
            label: 'Tocar mejilla derecha',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'tocar_mejilla_izq',
            label: 'Tocar mejilla izquierda',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'chasquido_apice',
            label: 'Chasquido con ápice',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'succionar_paladar',
            label: 'Succionar contra paladar',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'vibrar',
            label: 'Vibrar',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'discreta', label: 'Alteración discreta', score: 1 },
              { value: 'grave', label: 'Alteración grave', score: 2 },
              { value: 'no_realiza', label: 'No realiza', score: 3 },
            ],
          },
          {
            id: 'lengua_observaciones',
            label: 'Observaciones',
            type: 'text',
          },
        ],
      },
    ],
  },
  {
    id: 'movilidad_paladar',
    title: 'MOVILIDAD - PALADAR BLANDO',
    maxScore: 4,
    subsections: [
      {
        id: 'paladar_blando',
        name: 'Paladar blando (emitir "a" repetidamente)',
        items: [
          {
            id: 'paladar_derecha',
            label: 'Movimiento derecha',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'reducida', label: 'Reducida', score: 1 },
              { value: 'ausente', label: 'Ausente', score: 2 },
            ],
          },
          {
            id: 'paladar_izquierda',
            label: 'Movimiento izquierda',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'reducida', label: 'Reducida', score: 1 },
              { value: 'ausente', label: 'Ausente', score: 2 },
            ],
          },
          {
            id: 'paladar_observaciones',
            label: 'Observaciones',
            type: 'text',
          },
        ],
      },
    ],
  },
  {
    id: 'movilidad_mandibula',
    title: 'MOVILIDAD - MANDÍBULA',
    maxScore: 13,
    subsections: [
      {
        id: 'mandibula',
        name: 'Mandíbula (valores esperados niños: 35-50mm)',
        items: [
          {
            id: 'abertura_boca',
            label: 'Abertura de boca',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'reducida', label: 'Reducida', score: 1 },
              { value: 'aumentada', label: 'Aumentada', score: 1 },
              { value: 'no_realiza', label: 'No realiza', score: 2 },
              { value: 'con_desvio', label: 'Con desvío', score: 1 },
              { value: 'con_ruido', label: 'Con ruido', score: 1 },
              { value: 'con_dolor', label: 'Con dolor', score: 1 },
            ],
          },
          {
            id: 'cierre_boca',
            label: 'Cierre',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'reducida', label: 'Reducida', score: 1 },
              { value: 'aumentada', label: 'Aumentada', score: 1 },
              { value: 'no_realiza', label: 'No realiza', score: 2 },
              { value: 'con_desvio', label: 'Con desvío', score: 1 },
              { value: 'con_ruido', label: 'Con ruido', score: 1 },
              { value: 'con_dolor', label: 'Con dolor', score: 1 },
            ],
          },
          {
            id: 'lateralizacion_der',
            label: 'Lateralización derecha',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'reducida', label: 'Reducida', score: 1 },
              { value: 'aumentada', label: 'Aumentada', score: 1 },
              { value: 'no_realiza', label: 'No realiza', score: 2 },
            ],
          },
          {
            id: 'lateralizacion_izq',
            label: 'Lateralización izquierda',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'reducida', label: 'Reducida', score: 1 },
              { value: 'aumentada', label: 'Aumentada', score: 1 },
              { value: 'no_realiza', label: 'No realiza', score: 2 },
            ],
          },
          {
            id: 'mandibula_observaciones',
            label: 'Observaciones',
            type: 'text',
          },
        ],
      },
    ],
  },
  {
    id: 'examen_intraoral_lengua',
    title: 'EXAMEN INTRAORAL - LENGUA',
    subsections: [
      {
        id: 'lengua_intraoral',
        name: 'Lengua',
        items: [
          {
            id: 'posicion_habitual',
            label: 'Posición habitual',
            type: 'select',
            options: [
              { value: 'no_observable', label: 'No observable', score: 0 },
              { value: 'en_piso', label: 'En el piso', score: 1 },
              { value: 'punta_baja_dorso_alto', label: 'Punta baja y dorso alto', score: 1 },
              { value: 'interdental', label: 'Interdental', score: 2 },
            ],
          },
          {
            id: 'simetria_lengua',
            label: 'Simetría',
            type: 'select',
            options: [
              { value: 'si', label: 'Sí', score: 0 },
              { value: 'no', label: 'No', score: 1 },
            ],
          },
          {
            id: 'ancho_lengua',
            label: 'Ancho',
            type: 'select',
            options: [
              { value: 'adecuado', label: 'Adecuado', score: 0 },
              { value: 'disminuido', label: 'Disminuido', score: 1 },
              { value: 'aumentado', label: 'Aumentado', score: 2 },
            ],
          },
          {
            id: 'altura_lengua',
            label: 'Altura',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'aumentada', label: 'Aumentada', score: 1 },
            ],
          },
          {
            id: 'mucosa_lengua',
            label: 'Mucosa',
            type: 'select',
            options: [
              { value: 'normal', label: 'Normal', score: 0 },
              { value: 'geografica', label: 'Geográfica', score: 1 },
              { value: 'fisurada', label: 'Fisurada', score: 1 },
              { value: 'heridas', label: 'Heridas', score: 1 },
              { value: 'marcas_dentarias', label: 'Marcas dentarias', score: 1 },
              { value: 'marcas_aparato', label: 'Marcas de aparato', score: 1 },
            ],
          },
          {
            id: 'lengua_intraoral_obs',
            label: 'Observaciones',
            type: 'text',
          },
        ],
      },
    ],
  },
  {
    id: 'frenillo_lingual',
    title: 'FRENILLO LINGUAL - EXAMEN ANATÓMICO',
    maxScore: 18,
    subsections: [
      {
        id: 'frenillo',
        name: 'Frenillo lingual',
        items: [
          {
            id: 'lengua_elevada',
            label: 'Lengua elevada',
            type: 'select',
            options: [
              { value: 'redondeada', label: 'Redondeada', score: 0 },
              { value: 'punta_rectangular', label: 'Punta rectangular', score: 1 },
              { value: 'hendidura', label: 'Hendidura', score: 2 },
              { value: 'forma_corazon', label: 'Forma de corazón', score: 4 },
              { value: 'no_se_eleva', label: 'No se eleva', score: 4 },
            ],
          },
          {
            id: 'cara_ventral_fijacion',
            label: 'Cara ventral - fijación',
            type: 'select',
            options: [
              { value: 'tercio_medio', label: 'Tercio medio', score: 0 },
              { value: 'tercio_inferior', label: 'Tercio inferior', score: 1 },
              { value: 'tercio_superior', label: 'Tercio superior', score: 2 },
              { value: 'apice', label: 'Ápice', score: 3 },
            ],
          },
          {
            id: 'forma_frenillo',
            label: 'Forma del frenillo',
            type: 'select',
            options: [
              { value: 'puntiforme', label: 'Puntiforme', score: 0 },
              { value: 'en_abanico', label: 'En abanico', score: 1 },
              { value: 'sumergido', label: 'Sumergido', score: 2 },
              { value: 'fibrosis', label: 'Fibrosis', score: 3 },
            ],
          },
          {
            id: 'piso_boca_fijacion',
            label: 'Piso de la boca - fijación',
            type: 'select',
            options: [
              { value: 'carunculas', label: 'Carúnculas sublinguales', score: 0 },
              { value: 'cresta_alveolar', label: 'Cresta alveolar inferior', score: 1 },
              { value: 'periodontal', label: 'Periodontal', score: 2 },
            ],
          },
          {
            id: 'espesor_frenillo',
            label: 'Espesor',
            type: 'select',
            options: [
              { value: 'normal', label: 'Normal', score: 0 },
              { value: 'hipertrofico', label: 'Hipertrófico', score: 1 },
            ],
          },
          {
            id: 'anatomia_maxilar',
            label: 'Anatomía maxilar',
            type: 'select',
            options: [
              { value: 'paladar_normal', label: 'Paladar normal', score: 0 },
              { value: 'paladar_alto', label: 'Paladar alto', score: 1 },
              { value: 'paladar_estrecho', label: 'Paladar estrecho', score: 1 },
              { value: 'rugas_gruesas', label: 'Rugas palatinas gruesas', score: 1 },
            ],
          },
          {
            id: 'relacion_periodontal',
            label: 'Relación periodontal',
            type: 'select',
            options: [
              { value: 'sin_relacion', label: 'Sin relación con dientes', score: 0 },
              { value: 'recesion_gingival', label: 'Recesión gingival', score: 1 },
              { value: 'diastema', label: 'Diastema interincisivo', score: 1 },
            ],
          },
          {
            id: 'frenillo_observaciones',
            label: 'Observaciones',
            type: 'text',
          },
        ],
      },
    ],
  },
  {
    id: 'dientes',
    title: 'DIENTES',
    maxScore: 5,
    subsections: [
      {
        id: 'dientes_eval',
        name: 'Dientes',
        items: [
          {
            id: 'denticion',
            label: 'Dentición',
            type: 'select',
            options: [
              { value: 'decidua', label: 'Decidua', score: 0 },
              { value: 'mixta', label: 'Mixta', score: 0 },
              { value: 'permanente', label: 'Permanente', score: 0 },
            ],
          },
          {
            id: 'num_dientes_sup_d',
            label: 'Número de dientes - Superior derecho',
            type: 'number',
          },
          {
            id: 'num_dientes_sup_i',
            label: 'Número de dientes - Superior izquierdo',
            type: 'number',
          },
          {
            id: 'num_dientes_inf_d',
            label: 'Número de dientes - Inferior derecho',
            type: 'number',
          },
          {
            id: 'num_dientes_inf_i',
            label: 'Número de dientes - Inferior izquierdo',
            type: 'number',
          },
          {
            id: 'ausencia_dientes',
            label: 'Ausencia de dientes',
            type: 'select',
            options: [
              { value: 'no', label: 'No', score: 0 },
              { value: 'si', label: 'Sí', score: 1 },
            ],
          },
          {
            id: 'elementos_ausentes',
            label: 'Elementos ausentes',
            type: 'text',
          },
          {
            id: 'salud_oral_dientes',
            label: 'Salud oral - Dientes',
            type: 'select',
            options: [
              { value: 'buena', label: 'Buena', score: 0 },
              { value: 'regular', label: 'Regular', score: 1 },
              { value: 'mala', label: 'Mala', score: 2 },
            ],
          },
          {
            id: 'salud_oral_encias',
            label: 'Salud oral - Encías',
            type: 'select',
            options: [
              { value: 'buena', label: 'Buena', score: 0 },
              { value: 'regular', label: 'Regular', score: 1 },
              { value: 'mala', label: 'Mala', score: 2 },
            ],
          },
          {
            id: 'uso_protesis',
            label: 'Uso de prótesis',
            type: 'select',
            options: [
              { value: 'no', label: 'No', score: 0 },
              { value: 'removible', label: 'Removible', score: 0 },
              { value: 'fija', label: 'Fija', score: 0 },
              { value: 'parcial', label: 'Parcial', score: 0 },
              { value: 'total', label: 'Total', score: 0 },
            ],
          },
          {
            id: 'dientes_observaciones',
            label: 'Observaciones',
            type: 'text',
          },
        ],
      },
    ],
  },
  {
    id: 'oclusion',
    title: 'OCLUSIÓN',
    maxScore: 13,
    subsections: [
      {
        id: 'oclusion_eval',
        name: 'Oclusión',
        items: [
          {
            id: 'linea_media',
            label: 'Línea media',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'desviada_der', label: 'Desviada derecha', score: 1 },
              { value: 'desviada_izq', label: 'Desviada izquierda', score: 1 },
            ],
          },
          {
            id: 'angle_derecho',
            label: 'Clasificación de Angle - Lado derecho',
            type: 'select',
            options: [
              { value: 'clase_i', label: 'Clase I', score: 0 },
              { value: 'clase_ii_div1', label: 'Clase II div. 1', score: 1 },
              { value: 'clase_ii_div2', label: 'Clase II div. 2', score: 1 },
              { value: 'clase_iii', label: 'Clase III', score: 1 },
            ],
          },
          {
            id: 'angle_izquierdo',
            label: 'Clasificación de Angle - Lado izquierdo',
            type: 'select',
            options: [
              { value: 'clase_i', label: 'Clase I', score: 0 },
              { value: 'clase_ii_div1', label: 'Clase II div. 1', score: 1 },
              { value: 'clase_ii_div2', label: 'Clase II div. 2', score: 1 },
              { value: 'clase_iii', label: 'Clase III', score: 1 },
            ],
          },
          {
            id: 'guia_desoclusion',
            label: 'Guía de desoclusión',
            type: 'select',
            options: [
              { value: 'presente', label: 'Presente', score: 0 },
              { value: 'ausente_d', label: 'Ausente derecha', score: 1 },
              { value: 'ausente_i', label: 'Ausente izquierda', score: 1 },
            ],
          },
          {
            id: 'relacion_sagital',
            label: 'Relación sagital',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada (1-3mm)', score: 0 },
              { value: 'bis_a_bis', label: 'Bis a bis', score: 1 },
              { value: 'resalte_acentuado', label: 'Resalte acentuado (>3mm)', score: 2 },
              { value: 'mordida_cruzada_ant', label: 'Mordida cruzada anterior (<0mm)', score: 2 },
            ],
          },
          {
            id: 'relacion_vertical',
            label: 'Relación vertical',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'sobremordida', label: 'Sobremordida', score: 1 },
              { value: 'bis_a_bis', label: 'Mordida bis a bis', score: 1 },
              { value: 'mordida_abierta_ant', label: 'Mordida abierta anterior', score: 2 },
              { value: 'mordida_abierta_post_d', label: 'Mordida abierta posterior D', score: 1 },
              { value: 'mordida_abierta_post_i', label: 'Mordida abierta posterior I', score: 1 },
            ],
          },
          {
            id: 'relacion_transversal',
            label: 'Relación transversal',
            type: 'select',
            options: [
              { value: 'adecuada', label: 'Adecuada', score: 0 },
              { value: 'mordida_cruzada_d', label: 'Mordida cruzada posterior D', score: 1 },
              { value: 'mordida_cruzada_i', label: 'Mordida cruzada posterior I', score: 1 },
            ],
          },
          {
            id: 'uso_aparato',
            label: 'Uso de aparato',
            type: 'select',
            options: [
              { value: 'no', label: 'No', score: 0 },
              { value: 'movil', label: 'Móvil', score: 0 },
              { value: 'fijo', label: 'Fijo', score: 0 },
            ],
          },
          {
            id: 'oclusion_observaciones',
            label: 'Observaciones',
            type: 'text',
          },
        ],
      },
    ],
  },
];
