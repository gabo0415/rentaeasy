import { Pedido, Producto, ModalidadAlquiler, ModalidadEntrega, EstadoReserva, UnidadInventario } from '../tipos';

const CLAVE_PEDIDOS = 'rentaeasy_pedidos_catalogo_20261106';
const CLAVE_INVENTARIO = 'rentaeasy_inventario_catalogo_20261106';

const pedidosIniciales: Pedido[] = [
  { id: 'pedido-1048', numero: 'RE-1048', cliente: { nombre: 'Lucía Martín', correo: 'lucia.martin@email.es', telefono: '+34 600 123 456' }, productoId: 'robots-aspiradores-autovaciado', producto: 'Robots aspiradores con sistema de autovaciado', solicitud: '12 jun 2026', inicio: '12 jun 2026', fin: '12 jul 2026', importe: 59, entrega: 'domicilio', direccion: 'Calle de Bravo Murillo, 280, Madrid', observaciones: 'Llamar antes de la entrega.', estado: 'En alquiler', unidadId: 'RA-002' },
  { id: 'pedido-1047', numero: 'RE-1047', cliente: { nombre: 'Marcos Díaz', correo: 'marcos.diaz@email.es', telefono: '+34 611 222 333' }, productoId: 'lavadoras-carga-frontal', producto: 'Lavadoras de carga frontal', solicitud: '14 jun 2026', inicio: '20 jun 2026', fin: '22 jun 2026', importe: 59, entrega: 'tienda', observaciones: 'Recogida en tienda de Bellas Vistas.', estado: 'Pendiente' },
  { id: 'pedido-1046', numero: 'RE-1046', cliente: { nombre: 'Ana López', correo: 'ana.lopez@email.es', telefono: '+34 622 333 444' }, productoId: 'cafeteras-superautomaticas', producto: 'Cafeteras superautomáticas', solicitud: '08 jun 2026', inicio: '24 jun 2026', fin: '24 jul 2026', importe: 59, entrega: 'domicilio', direccion: 'Avenida de Asturias, 15, Madrid', observaciones: 'Entregar en horario de mañana.', estado: 'Confirmada' },
  { id: 'pedido-1045', numero: 'RE-1045', cliente: { nombre: 'Javier Ruiz', correo: 'javier.ruiz@email.es', telefono: '+34 633 444 555' }, productoId: 'aire-acondicionado-portatil', producto: 'Aire acondicionado portátil', solicitud: '06 jun 2026', inicio: '18 jun 2026', fin: '20 jun 2026', importe: 59, entrega: 'tienda', observaciones: 'Preparar controladores incluidos.', estado: 'En preparación', unidadId: 'AC-001' },
  { id: 'pedido-1044', numero: 'RE-1044', cliente: { nombre: 'Sofía García', correo: 'sofia.garcia@email.es', telefono: '+34 644 555 666' }, productoId: 'purificadores-aire', producto: 'Purificadores de aire', solicitud: '04 jun 2026', inicio: '04 jun 2026', fin: '04 jul 2026', importe: 59, entrega: 'domicilio', direccion: 'Calle de la Infanta Mercedes, 9, Madrid', observaciones: 'Dejar instrucciones de uso.', estado: 'En alquiler', unidadId: 'PA-003' },
];

const inventarioInicial: UnidadInventario[] = [
  { id: 'RA-001', productoId: 'robots-aspiradores-autovaciado', producto: 'Robots aspiradores con sistema de autovaciado', estado: 'Disponible', ultimaRevision: '10 jun 2026' },
  { id: 'RA-002', productoId: 'robots-aspiradores-autovaciado', producto: 'Robots aspiradores con sistema de autovaciado', estado: 'Alquilada', pedido: 'RE-1048', ultimaRevision: '08 jun 2026' },
  { id: 'RA-003', productoId: 'robots-aspiradores-autovaciado', producto: 'Robots aspiradores con sistema de autovaciado', estado: 'Mantenimiento', ultimaRevision: '12 jun 2026' },
  { id: 'LAV-001', productoId: 'lavadoras-carga-frontal', producto: 'Lavadoras de carga frontal', estado: 'Disponible', ultimaRevision: '11 jun 2026' },
  { id: 'LAV-002', productoId: 'lavadoras-carga-frontal', producto: 'Lavadoras de carga frontal', estado: 'Disponible', ultimaRevision: '09 jun 2026' },
  { id: 'CF-001', productoId: 'cafeteras-superautomaticas', producto: 'Cafeteras superautomáticas', estado: 'Disponible', ultimaRevision: '13 jun 2026' },
  { id: 'AC-001', productoId: 'aire-acondicionado-portatil', producto: 'Aire acondicionado portátil', estado: 'Alquilada', pedido: 'RE-1045', ultimaRevision: '11 jun 2026' },
  { id: 'PA-003', productoId: 'purificadores-aire', producto: 'Purificadores de aire', estado: 'Alquilada', pedido: 'RE-1044', ultimaRevision: '12 jun 2026' },
];

const leerPedidos = (): Pedido[] => {
  const guardados = window.localStorage.getItem(CLAVE_PEDIDOS);
  if (!guardados) return pedidosIniciales;
  try { return JSON.parse(guardados) as Pedido[]; } catch { return pedidosIniciales; }
};
const guardarPedidos = (pedidos: Pedido[]) => window.localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(pedidos));
const leerInventario = (): UnidadInventario[] => {
  const guardado = window.localStorage.getItem(CLAVE_INVENTARIO);
  if (!guardado) return inventarioInicial;
  try { return JSON.parse(guardado) as UnidadInventario[]; } catch { return inventarioInicial; }
};

export interface DatosPedidoNuevo {
  producto: Producto;
  modalidad: ModalidadAlquiler;
  inicio: string;
  fin: string;
  entrega: ModalidadEntrega;
  direccion: string;
  importe: number;
  cliente?: Pedido['cliente'];
}

export const servicioPedidos = {
  obtenerTodos: (): Pedido[] => leerPedidos(),
  actualizarEstado: (id: string, estado: EstadoReserva): Pedido | undefined => {
    const pedidos = leerPedidos();
    const indice = pedidos.findIndex((pedido) => pedido.id === id);
    if (indice === -1) return undefined;
    pedidos[indice] = { ...pedidos[indice], estado };
    guardarPedidos(pedidos);
    return pedidos[indice];
  },
  crearDesdeReserva: (datos: DatosPedidoNuevo): Pedido => {
    const pedidos = leerPedidos();
    const siguienteNumero = 1049 + pedidos.length;
    const pedido: Pedido = { id: `pedido-${Date.now()}`, numero: `RE-${siguienteNumero}`, cliente: datos.cliente ?? { nombre: 'Cliente demo', correo: 'cliente@email.es', telefono: '+34 600 000 000' }, productoId: datos.producto.id, producto: datos.producto.nombre, solicitud: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }), inicio: datos.inicio, fin: datos.fin, importe: datos.importe, entrega: datos.entrega, direccion: datos.direccion, observaciones: 'Solicitud creada desde la tienda online.', estado: 'Pendiente' };
    guardarPedidos([pedido, ...pedidos]);
    return pedido;
  },
  obtenerInventario: (): UnidadInventario[] => leerInventario(),
  actualizarUnidad: (id: string, estado: UnidadInventario['estado']): UnidadInventario[] => {
    const inventario = leerInventario().map((unidad) => unidad.id === id ? { ...unidad, estado } : unidad);
    window.localStorage.setItem(CLAVE_INVENTARIO, JSON.stringify(inventario));
    return inventario;
  },
};
