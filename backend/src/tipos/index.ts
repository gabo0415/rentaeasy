export type EstadoReserva = 'Pendiente' | 'Confirmada' | 'En preparación' | 'En alquiler' | 'Finalizada' | 'Cancelada';

export interface DatosReserva {
  productoId: string;
  fechaInicio: string;
  fechaFin: string;
  modalidad: 'fin de semana' | 'mensual' | 'varios meses';
  entrega: 'tienda' | 'domicilio';
  direccion?: string;
}
