import { Router } from 'express';
import { consultarDatos } from '../servicios/datosSupabase.js';
export const rutasProductos = Router();
rutasProductos.get('/', async (_solicitud, respuesta) => {
  try {
    const resultado = await consultarDatos('productos?estado=eq.activo&select=id,nombre,descripcion,precio_fin_de_semana,precio_mensual,precio_dia_adicional,stock_total,stock_disponible,imagen&order=nombre');
    return respuesta.status(resultado.estado).json({ datos: resultado.datos });
  } catch { return respuesta.status(503).json({ error: 'No se pudo cargar el catálogo.' }); }
});
