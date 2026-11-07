import { productos as catalogoVisual } from '../datos/productos';
import type { Producto } from '../tipos';
import { supabase } from './supabase';

interface ProductoDb {
  nombre: string;
  stock_total: number;
  stock_disponible: number;
  estado: string;
}

interface ErrorSupabase {
  message?: string;
  details?: string;
  code?: string;
}

/**
 * Los nombres son el punto de unión entre el catálogo visual (imágenes,
 * descripciones y precios ya aprobados) y las filas reales de public.productos.
 * Se normalizan para no depender de tildes ni espacios extra.
 */
const normalizarNombre = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const traducirError = (error: ErrorSupabase | null): string => {
  const texto = `${error?.code ?? ''} ${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  if (texto.includes('permission denied') || texto.includes('row-level security')) {
    return 'No se pudo consultar la disponibilidad del catálogo.';
  }
  if (texto.includes('failed to fetch') || texto.includes('networkerror')) {
    return 'No se pudo conectar con Supabase para consultar la disponibilidad.';
  }
  return 'No se pudo consultar la disponibilidad del catálogo.';
};

export const servicioProductos = {
  /**
   * Devuelve el catálogo visible con la disponibilidad real de Supabase.
   *
   * `stock_disponible` y `stock_total` son valores mantenidos por PostgreSQL a
   * partir de las reservas reales (triggers de public.reservas y
   * public.detalles_reserva). No se usa ningún valor local ni simulado.
   */
  obtenerTodos: async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from('productos')
      .select('nombre, stock_total, stock_disponible, estado')
      .eq('estado', 'activo');

    if (error) throw new Error(traducirError(error));

    const reales = new Map<string, ProductoDb>();
    ((data ?? []) as ProductoDb[]).forEach((producto) => {
      reales.set(normalizarNombre(producto.nombre), producto);
    });

    const catalogo: Producto[] = [];
    catalogoVisual.forEach((producto) => {
      const real = reales.get(normalizarNombre(producto.nombre));
      if (!real) return;
      catalogo.push({
        ...producto,
        disponibles: Math.max(0, real.stock_disponible),
        totalUnidades: Math.max(0, real.stock_total),
      });
    });

    return catalogo;
  },

  obtenerPorId: async (id: string): Promise<Producto | undefined> => {
    const catalogo = await servicioProductos.obtenerTodos();
    return catalogo.find((producto) => producto.id === id);
  },

  /**
   * Realtime opcional sobre public.productos: cada cambio de estado de una
   * reserva recalcula stock_disponible mediante triggers y emite un UPDATE.
   * Si la tabla no está en la publicación `supabase_realtime`, no llega nada y
   * el catálogo se refresca al recuperar el foco de la ventana.
   */
  suscribirCambios: (alCambiar: () => void): (() => void) => {
    const canal = supabase
      .channel('catalogo-disponibilidad')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'productos' },
        alCambiar,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  },
};
