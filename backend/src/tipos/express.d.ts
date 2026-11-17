type Rol = 'cliente' | 'empleado' | 'administrador';

declare global {
  namespace Express {
    interface Request {
      rol?: Rol;
      tokenSupabase?: string;
    }
  }
}

export {};
