import { DatosReserva } from '../tipos/index.js';

/**
 * Validador temporal de demostración. En producción debe consultar unidades
 * físicas y reservas solapadas en PostgreSQL dentro de una transacción.
 */
export const servicioDisponibilidad = {
  validarReserva: (datos: DatosReserva) => {
    const inicio = new Date(datos.fechaInicio);
    const fin = new Date(datos.fechaFin);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
      return { disponible: false, mensaje: 'El periodo seleccionado no es válido.' };
    }
    if (datos.entrega === 'domicilio' && (!datos.direccion || datos.direccion.trim().length < 8)) {
      return { disponible: false, mensaje: 'La dirección de entrega es obligatoria.' };
    }
    return { disponible: true, mensaje: 'Disponibilidad pendiente de confirmación de inventario.' };
  },
};
