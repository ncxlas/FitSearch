import reglas from '@shared/reglas.json';

// Datos comunes del plan de alimentación (11-11-2026): macronutrientes con sus colores y gramos de un porcentaje.
const { kcalPorGramo } = reglas.comidas;
export const MACROS = [
  { clave: 'proteinas', nombre: 'Proteínas', color: '#2a7de1' },
  { clave: 'carbohidratos', nombre: 'Carbohidratos', color: '#1fa37a' },
  { clave: 'grasas', nombre: 'Grasas', color: '#f7931e' },
];
export const decimal = (valor) => valor.toLocaleString('es-CL', { maximumFractionDigits: 2 });
export const gramos = (kcal, porcentaje, macro) => Math.round((kcal * porcentaje) / 100 / kcalPorGramo[macro]);

// Historial de peso (SC-43).
// Peso que marca la meta en un día: desde el peso inicial, al ritmo semanal, sin pasarse del objetivo.
export function pesoDeLaMeta(meta, dia) {
  if (!meta) return null;
  const dias = (Date.parse(`${dia}T00:00:00Z`) - Date.parse(`${meta.fechaInicio}T00:00:00Z`)) / 86400000;
  if (dias < 0) return null;
  const bajar = meta.objetivo === 'bajar_peso';
  const avance = (meta.ritmoSemanalKg / 7) * dias;
  return bajar ? Math.max(meta.pesoObjetivoKg, meta.pesoInicialKg - avance) : Math.min(meta.pesoObjetivoKg, meta.pesoInicialKg + avance);
}

// Días de la semana de un plan de comidas semanal (SC-44): 1 = lunes … 7 = domingo.
export const DIAS = [
  { dia: 1, corto: 'Lun', nombre: 'Lunes' }, { dia: 2, corto: 'Mar', nombre: 'Martes' }, { dia: 3, corto: 'Mié', nombre: 'Miércoles' },
  { dia: 4, corto: 'Jue', nombre: 'Jueves' }, { dia: 5, corto: 'Vie', nombre: 'Viernes' }, { dia: 6, corto: 'Sáb', nombre: 'Sábado' },
  { dia: 7, corto: 'Dom', nombre: 'Domingo' },
];
