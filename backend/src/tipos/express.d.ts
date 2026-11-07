import type { Rol } from '../middleware/autenticacion.js';

declare global {
  namespace Express {
    interface Request {
      rol?: Rol;
      tokenSupabase?: string;
    }
  }
}

export {};
