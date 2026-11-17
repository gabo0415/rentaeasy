import 'dotenv/config';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { rutasProductos } from './rutas/rutasProductos.js';
import { rutasReservas } from './rutas/rutasReservas.js';
import { rutasEmpleados } from './rutas/rutasEmpleados.js';
import { rutasAdministracion } from './rutas/rutasAdministracion.js';
import { rutasAutenticacion } from './rutas/rutasAutenticacion.js';

export const aplicacion = express();
const puerto = Number(process.env.PUERTO || 4000);
aplicacion.use(helmet());
aplicacion.use(cors({ origin: process.env.ORIGEN_FRONTEND || 'http://localhost:5173' }));
aplicacion.use(express.json({ limit: '32kb' }));
aplicacion.get('/api/salud', (_solicitud, respuesta) => respuesta.json({ estado: 'correcto', servicio: 'Rentaeasy API' }));
aplicacion.use('/api/productos', rutasProductos);
aplicacion.use('/api/autenticacion', rutasAutenticacion);
aplicacion.use('/api/reservas', rutasReservas);
aplicacion.use('/api/empleados', rutasEmpleados);
aplicacion.use('/api/administracion', rutasAdministracion);
aplicacion.use((_, respuesta) => respuesta.status(404).json({ error: 'Ruta no encontrada.' }));
const manejarError: ErrorRequestHandler = (error, _solicitud, respuesta, _siguiente) => {
  const estado = typeof error?.status === 'number' ? error.status : 500;
  respuesta.status(estado).json({ error: estado === 400 ? 'El JSON de la solicitud no es válido.' : estado === 413 ? 'La solicitud es demasiado grande.' : 'No se pudo completar la solicitud.' });
};
aplicacion.use(manejarError);
if (process.env.NODE_ENV !== 'test') {
  aplicacion.listen(puerto, () => console.log(`Rentaeasy API disponible en http://localhost:${puerto}`));
}
