import type { EstadoReserva } from '../tipos';

export const SIGUIENTES_ESTADOS: Record<EstadoReserva, EstadoReserva[]> = {
  Pendiente: ['Confirmada', 'Cancelada'],
  Confirmada: ['En preparación', 'Cancelada'],
  'En preparación': ['En alquiler', 'Cancelada'],
  'En alquiler': ['Finalizada'],
  Finalizada: [],
  Cancelada: [],
};
