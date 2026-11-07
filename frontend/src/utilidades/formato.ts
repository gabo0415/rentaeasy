export const formatearEuros = (importe: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(importe);

export const formatearFecha = (fecha: string) => {
  if (!fecha) return '';
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(anio, mes - 1, dia));
};

export const formatearFechaHora = (fecha: string) => {
  if (!fecha) return '';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return fecha;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(valor);
};

export const obtenerDias = (inicio: string, fin: string) => {
  if (!inicio || !fin) return 0;
  const diferencia = new Date(fin).getTime() - new Date(inicio).getTime();
  return Math.max(1, Math.ceil(diferencia / (1000 * 60 * 60 * 24)) + 1);
};
