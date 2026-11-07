import { Router } from 'express';

export const rutasProductos = Router();
rutasProductos.get('/', (_solicitud, respuesta) => respuesta.json({ datos: [], mensaje: 'Conecta Supabase para cargar productos reales.' }));
