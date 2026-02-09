export interface TARSection {
  id: string;
  name: string;
  category: string;
  items: TARItem[];
}

export interface TARItem {
  id: string;
  word: string;
  column: 'inicial' | 'media' | 'final' | 'trabada';
}

export const tarSections: TARSection[] = [
  {
    id: 'bilabiales',
    name: 'Bilabiales',
    category: 'B/P/M',
    items: [
      { id: 'bil_1', word: 'Bote', column: 'inicial' },
      { id: 'bil_2', word: 'Pato', column: 'inicial' },
      { id: 'bil_3', word: 'Mano', column: 'inicial' },
      { id: 'bil_4', word: 'Nube', column: 'media' },
      { id: 'bil_5', word: 'Copa', column: 'media' },
      { id: 'bil_6', word: 'Suma', column: 'media' },
      { id: 'bil_7', word: 'Campo', column: 'trabada' },
    ],
  },
  {
    id: 'labiodental',
    name: 'Labio-dental',
    category: 'F',
    items: [
      { id: 'lab_1', word: 'Foca', column: 'inicial' },
      { id: 'lab_2', word: 'Café', column: 'media' },
    ],
  },
  {
    id: 'dentales',
    name: 'Dentales',
    category: 'D/T',
    items: [
      { id: 'den_1', word: 'Dama', column: 'inicial' },
      { id: 'den_2', word: 'Tapa', column: 'inicial' },
      { id: 'den_3', word: 'Codo', column: 'media' },
      { id: 'den_4', word: 'Mata', column: 'media' },
    ],
  },
  {
    id: 'alveolares',
    name: 'Alveolares',
    category: 'S/N/L/R/RR',
    items: [
      { id: 'alv_1', word: 'Sapo', column: 'inicial' },
      { id: 'alv_2', word: 'Nido', column: 'inicial' },
      { id: 'alv_3', word: 'Luna', column: 'inicial' },
      { id: 'alv_4', word: 'Rosa', column: 'media' },
      { id: 'alv_5', word: 'Poroto', column: 'media' },
      { id: 'alv_6', word: 'Taza', column: 'final' },
      { id: 'alv_7', word: 'Maní', column: 'final' },
      { id: 'alv_8', word: 'Pala', column: 'media' },
      { id: 'alv_9', word: 'Coro', column: 'media' },
      { id: 'alv_10', word: 'Perro', column: 'media' },
      { id: 'alv_11', word: 'Pasto', column: 'trabada' },
      { id: 'alv_12', word: 'Dulce', column: 'trabada' },
      { id: 'alv_13', word: 'Torta', column: 'trabada' },
    ],
  },
  {
    id: 'palatales',
    name: 'Palatales',
    category: 'Y/Ñ/CH',
    items: [
      { id: 'pal_1', word: 'Llave', column: 'inicial' },
      { id: 'pal_2', word: 'Ñato', column: 'inicial' },
      { id: 'pal_3', word: 'Chala', column: 'inicial' },
      { id: 'pal_4', word: 'Malla', column: 'media' },
      { id: 'pal_5', word: 'Caña', column: 'media' },
      { id: 'pal_6', word: 'Noche', column: 'media' },
    ],
  },
  {
    id: 'velares',
    name: 'Velares',
    category: 'K/G/J',
    items: [
      { id: 'vel_1', word: 'Casa', column: 'inicial' },
      { id: 'vel_2', word: 'Gato', column: 'inicial' },
      { id: 'vel_3', word: 'José', column: 'inicial' },
      { id: 'vel_4', word: 'Taco', column: 'media' },
      { id: 'vel_5', word: 'Jugo', column: 'media' },
      { id: 'vel_6', word: 'Caja', column: 'media' },
      { id: 'vel_7', word: 'Reloj', column: 'final' },
    ],
  },
  {
    id: 'difonos_vocalicos',
    name: 'Dífonos Vocálicos',
    category: 'Diptongos',
    items: [
      { id: 'div_1', word: 'Vaina', column: 'media' },
      { id: 'div_2', word: 'Violín', column: 'inicial' },
      { id: 'div_3', word: 'Auto', column: 'media' },
      { id: 'div_4', word: 'Nuevo', column: 'media' },
      { id: 'div_5', word: 'Peina', column: 'media' },
    ],
  },
  {
    id: 'difonos_consonanticos',
    name: 'Dífonos Consonánticos',
    category: 'Grupos consonánticos',
    items: [
      { id: 'dic_1', word: 'Blusa', column: 'inicial' },
      { id: 'dic_2', word: 'Globo', column: 'inicial' },
      { id: 'dic_3', word: 'Plato', column: 'inicial' },
      { id: 'dic_4', word: 'Clavo', column: 'inicial' },
      { id: 'dic_5', word: 'Flecha', column: 'inicial' },
      { id: 'dic_6', word: 'Atlas', column: 'media' },
      { id: 'dic_7', word: 'Brazo', column: 'inicial' },
      { id: 'dic_8', word: 'Dragón', column: 'inicial' },
      { id: 'dic_9', word: 'Crema', column: 'inicial' },
      { id: 'dic_10', word: 'Premio', column: 'inicial' },
      { id: 'dic_11', word: 'Tren', column: 'inicial' },
      { id: 'dic_12', word: 'Fruta', column: 'inicial' },
      { id: 'dic_13', word: 'Grano', column: 'inicial' },
    ],
  },
  {
    id: 'polisilabicas',
    name: 'Palabras Polisilábicas',
    category: 'Polisílabos',
    items: [
      { id: 'pol_1', word: 'Carabinero', column: 'inicial' },
      { id: 'pol_2', word: 'Panadería', column: 'inicial' },
      { id: 'pol_3', word: 'Caperucita', column: 'inicial' },
      { id: 'pol_4', word: 'Ametralladora', column: 'inicial' },
      { id: 'pol_5', word: 'Helicóptero', column: 'inicial' },
      { id: 'pol_6', word: 'Bicicleta', column: 'inicial' },
    ],
  },
];

export const tarFrases = [
  { id: 'frase_1', text: 'El perro salta.' },
  { id: 'frase_2', text: 'La niña rubia come.' },
  { id: 'frase_3', text: 'Ana fue al jardín con su gatita.' },
  { id: 'frase_4', text: 'La guagua lloraba porque tenía hambre.' },
  { id: 'frase_5', text: 'El mono que estaba dentro de la jaula se perdió.' },
  { id: 'frase_6', text: 'Juanito se metió debajo de la cama para que no lo pillara su mamá.' },
];

export const tarTestInfo = {
  id: 'tar',
  name: 'TAR Abreviado',
  fullName: 'Test de Articulación a la Repetición Abreviado',
  description: 'Evaluación de la producción articulatoria mediante repetición de palabras y frases',
  ageRange: '3 a 7 años',
  duration: '15-20 minutos',
  sections: tarSections,
  frases: tarFrases,
};
