import { useCallback, useEffect, useRef, useState } from 'react';
import { RutaNavegacion } from './componentes/BarraNavegacion';
import { AccesoProtegido } from './componentes/AccesoProtegido';
import { AccesoNoAutenticado } from './componentes/AccesoNoAutenticado';
import { PantallaCargaSesion } from './componentes/PantallaCargaSesion';
import { DatosReservaConfirmada, ModalReserva } from './componentes/ModalReserva';
import { LayoutTienda } from './componentes/LayoutTienda';
import { productos as productosBase } from './datos/productos';
import { DetalleProducto } from './paginas/DetalleProducto';
import { PaginaCatalogo } from './paginas/PaginaCatalogo';
import { PaginaCuenta } from './paginas/PaginaCuenta';
import { PaginaInicio } from './paginas/PaginaInicio';
import { PaginaAutenticacion } from './paginas/PaginaAutenticacion';
import { PaginaRestablecerContrasena } from './paginas/PaginaRestablecerContrasena';
import { LayoutEmpleados, SeccionEmpleado } from './paginas/PanelEmpleados';
import { LayoutAdministracion, SeccionAdministracionNombre } from './paginas/PanelAdministracion';
import { servicioAutenticacion, Usuario } from './servicios/servicioAutenticacion';
import { servicioReservas } from './servicios/servicioReservas';
import { servicioProductos } from './servicios/servicioProductos';
import { productoDisponible } from './utilidades/disponibilidad';
import { Categoria, ModalidadAlquiler, Producto, Rol } from './tipos';

type Vista =
  | 'inicio'
  | 'catalogo'
  | 'detalle'
  | 'reserva'
  | 'cuenta'
  | 'administracion'
  | 'empleados'
  | 'registro'
  | 'inicio-sesion'
  | 'restablecer-contrasena';

interface EstadoNavegacion {
  vista: Vista;
  categoria?: Categoria | 'Todas';
  seccion?: 'como-funciona' | 'contacto';
  productoId?: string;
  modalidad?: ModalidadAlquiler;
  redirigir?: string;
  seccionEmpleado?: SeccionEmpleado;
  seccionAdministracion?: SeccionAdministracionNombre;
}

const MODALIDADES: ModalidadAlquiler[] = ['fin de semana', 'mensual', 'varios meses'];
const normalizarModalidad = (valor: string | null): ModalidadAlquiler | undefined =>
  MODALIDADES.find((modalidad) => modalidad === valor);

/** Solo se aceptan rutas internas para evitar redirecciones a dominios externos. */
const rutaSegura = (destino: string | null | undefined, respaldo: string) =>
  destino && destino.startsWith('/') && !destino.startsWith('//') ? destino : respaldo;

const leerRuta = (): EstadoNavegacion => {
  const url = new URL(window.location.href);
  const categoria = url.searchParams.get('categoria') as Categoria | null;
  const seccion = url.searchParams.get('seccion') as EstadoNavegacion['seccion'];
  const redirigir = url.searchParams.get('redirigir') || undefined;
  const modalidad = normalizarModalidad(url.searchParams.get('modalidad'));
  if (url.pathname === '/catalogo') return { vista: 'catalogo', categoria: categoria || 'Todas' };
  if (url.pathname.startsWith('/producto/'))
    return { vista: 'detalle', productoId: url.pathname.split('/').filter(Boolean)[1] };
  if (url.pathname.startsWith('/reserva/'))
    return {
      vista: 'reserva',
      productoId: url.pathname.split('/').filter(Boolean)[1],
      modalidad,
      redirigir,
    };
  if (url.pathname === '/cuenta') return { vista: 'cuenta' };
  if (url.pathname === '/restablecer-contrasena') return { vista: 'restablecer-contrasena' };
  if (url.pathname.startsWith('/administracion')) {
    const secciones: Record<string, SeccionAdministracionNombre> = {
      productos: 'Productos',
      pedidos: 'Pedidos',
      clientes: 'Clientes',
      inventario: 'Inventario',
      mantenimiento: 'Mantenimiento',
      reportes: 'Reportes',
      configuracion: 'Configuración',
    };
    return { vista: 'administracion', seccionAdministracion: secciones[url.pathname.split('/')[2]] || 'Resumen' };
  }
  if (url.pathname.startsWith('/empleados')) {
    const secciones: Record<string, SeccionEmpleado> = {
      pedidos: 'Pedidos',
      inventario: 'Inventario',
      reportes: 'Reportes',
    };
    return { vista: 'empleados', seccionEmpleado: secciones[url.pathname.split('/')[2]] || 'Resumen' };
  }
  if (url.pathname === '/registro') return { vista: 'registro', redirigir };
  if (url.pathname === '/iniciar-sesion') return { vista: 'inicio-sesion', redirigir };
  return {
    vista: 'inicio',
    seccion: seccion === 'como-funciona' || seccion === 'contacto' ? seccion : undefined,
  };
};

/** Página de inicio según el rol leído de public.perfiles. */
const rutaPorRol = (rol: Rol) =>
  rol === 'administrador' ? '/administracion' : rol === 'empleado' ? '/empleados' : '/cuenta';

export default function App() {
  const [navegacion, setNavegacion] = useState<EstadoNavegacion>(leerRuta);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [productoElegido, setProductoElegido] = useState<Producto | null>(null);
  const [reservas, setReservas] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState<Producto[]>(productosBase);
  const idCatalogo = useRef(0);

  const recargarCatalogo = useCallback(async () => {
    const id = ++idCatalogo.current;
    try {
      const catalogoReal = await servicioProductos.obtenerTodos();
      if (id === idCatalogo.current) setProductos(catalogoReal);
    } catch (error) {
      console.error('[catálogo] No se pudo cargar la disponibilidad real.', error);
    }
  }, []);

  // Catálogo y disponibilidad se recargan al entrar en cualquier vista de tienda
  // (incluido el regreso desde el panel de administración).
  useEffect(() => {
    if (['inicio', 'catalogo', 'detalle', 'reserva'].includes(navegacion.vista)) {
      void recargarCatalogo();
    }
  }, [navegacion.vista, recargarCatalogo]);

  // Mantiene sincronizado el producto elegido con la última disponibilidad.
  useEffect(() => {
    if (!productoElegido) return;
    const actualizado = productos.find((producto) => producto.id === productoElegido.id);
    if (actualizado && actualizado !== productoElegido) setProductoElegido(actualizado);
  }, [productos, productoElegido]);

  // Sin polling: se actualiza al volver a la pestaña o a la ventana.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') void recargarCatalogo();
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [recargarCatalogo]);

  // Realtime opcional: si public.productos está en supabase_realtime, cada
  // recálculo de stock_disponible llega aquí. Si no, queda el refetch por foco.
  useEffect(() => {
    let temporizador: number | undefined;
    const alCambiar = () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => void recargarCatalogo(), 400);
    };
    const cancelar = servicioProductos.suscribirCambios(alCambiar);
    return () => {
      window.clearTimeout(temporizador);
      cancelar();
    };
  }, [recargarCatalogo]);

  useEffect(() => {
    const alCambiarHistorial = () => setNavegacion(leerRuta());
    window.addEventListener('popstate', alCambiarHistorial);
    return () => window.removeEventListener('popstate', alCambiarHistorial);
  }, []);

  // Restaura la sesión persistida y mantiene el usuario sincronizado con Supabase.
  useEffect(() => {
    let activo = true;
    const aplicar = (usuario: Usuario | null) => {
      if (!activo) return;
      setUsuarioActual(usuario);
      setCargandoSesion(false);
    };

    void servicioAutenticacion
      .obtenerUsuarioActual()
      .then(aplicar)
      .catch((error: unknown) => {
        console.error('[auth] No se pudo restaurar la sesión.', error);
        aplicar(null);
      });

    const cancelarSuscripcion = servicioAutenticacion.suscribirSesion(aplicar);
    return () => {
      activo = false;
      cancelarSuscripcion();
    };
  }, []);

  useEffect(() => {
    const productoDeRuta = navegacion.productoId
      ? productos.find((producto) => producto.id === navegacion.productoId)
      : null;
    if (productoDeRuta) setProductoElegido(productoDeRuta);
    window.requestAnimationFrame(() => {
      if (navegacion.seccion)
        document.getElementById(navegacion.seccion)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [navegacion]);

  // Un usuario ya autenticado no debe quedarse en las pantallas de acceso:
  // continúa en la reserva (u otra ruta) que había solicitado antes de entrar.
  useEffect(() => {
    if (cargandoSesion || !usuarioActual) return;
    if (navegacion.vista !== 'inicio-sesion' && navegacion.vista !== 'registro') return;
    const destino = rutaSegura(navegacion.redirigir, rutaPorRol(usuarioActual.rol));
    window.history.replaceState({}, '', destino);
    setNavegacion(leerRuta());
  }, [cargandoSesion, usuarioActual, navegacion.vista, navegacion.redirigir]);

  // La reserva exige sesión: si se entra directamente sin autenticarse,
  // se envía al inicio de sesión conservando la ruta de vuelta.
  useEffect(() => {
    if (cargandoSesion || usuarioActual || navegacion.vista !== 'reserva') return;
    const destino = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, '', `/iniciar-sesion?redirigir=${encodeURIComponent(destino)}`);
    setNavegacion(leerRuta());
  }, [cargandoSesion, usuarioActual, navegacion.vista]);

  const cambiarRuta = (ruta: string) => {
    window.history.pushState({}, '', ruta);
    setNavegacion(leerRuta());
  };

  const navegar = (ruta: RutaNavegacion, categoria?: Categoria) => {
    if (ruta === 'inicio') cambiarRuta('/');
    if (ruta === 'catalogo') {
      setBusqueda('');
      cambiarRuta('/catalogo');
    }
    if (ruta === 'categorias' && categoria) {
      setBusqueda('');
      cambiarRuta(`/catalogo?categoria=${encodeURIComponent(categoria)}`);
    }
    if (ruta === 'como-funciona') cambiarRuta('/?seccion=como-funciona');
    if (ruta === 'contacto') cambiarRuta('/?seccion=contacto');
  };
  const navegarEmpleados = (seccion: SeccionEmpleado) =>
    cambiarRuta(seccion === 'Resumen' ? '/empleados' : `/empleados/${seccion.toLowerCase()}`);
  const navegarAdministracion = (seccion: SeccionAdministracionNombre) =>
    cambiarRuta(
      seccion === 'Resumen'
        ? '/administracion'
        : `/administracion/${seccion === 'Configuración' ? 'configuracion' : seccion.toLowerCase()}`,
    );

  const verProducto = (producto: Producto) => {
    setProductoElegido(producto);
    cambiarRuta(`/producto/${producto.id}`);
  };
  // "Alquilar ahora" abre siempre la ficha del producto, igual que "Ver producto".
  const alquilar = (producto: Producto) => {
    setProductoElegido(producto);
    cambiarRuta(`/producto/${producto.id}`);
  };
  const continuarReserva = (producto: Producto, modalidad: ModalidadAlquiler = 'fin de semana') => {
    setProductoElegido(producto);
    if (!productoDisponible(producto)) {
      cambiarRuta(`/producto/${producto.id}`);
      return;
    }
    const destino = `/reserva/${producto.id}?modalidad=${encodeURIComponent(modalidad)}`;
    if (!usuarioActual) {
      cambiarRuta(`/iniciar-sesion?redirigir=${encodeURIComponent(destino)}`);
      return;
    }
    cambiarRuta(destino);
  };
  const abrirCuenta = () => {
    if (usuarioActual) {
      cambiarRuta('/cuenta');
      return;
    }
    // Si venimos de una reserva, el acceso debe devolvernos a ella.
    cambiarRuta(
      navegacion.redirigir
        ? `/iniciar-sesion?redirigir=${encodeURIComponent(navegacion.redirigir)}`
        : '/iniciar-sesion',
    );
  };
  const abrirReserva = () => {
    if (productoElegido) continuarReserva(productoElegido, navegacion.modalidad);
    else cambiarRuta('/catalogo');
  };
  const autenticarUsuario = (usuario: Usuario) => {
    setUsuarioActual(usuario);
    setCargandoSesion(false);
    const redirigir = new URL(window.location.href).searchParams.get('redirigir');
    cambiarRuta(rutaSegura(redirigir, rutaPorRol(usuario.rol)));
  };
  const cerrarSesion = () => {
    setUsuarioActual(null);
    cambiarRuta('/');
    void servicioAutenticacion.cerrarSesion();
  };
  const rolActual = usuarioActual?.rol || 'cliente';
  const confirmarReserva = async (datos: DatosReservaConfirmada) => {
    const reserva = await servicioReservas.crear({
      producto: datos.producto,
      modalidad: datos.modalidad,
      inicio: datos.inicio,
      fin: datos.fin,
      entrega: datos.entrega,
      direccion: datos.direccion,
    });
    setReservas((actuales) => actuales + 1);
    void recargarCatalogo();
    return { codigo: reserva.codigo, importe: reserva.importe };
  };
  const estadoVista = navegacion.vista;
  const esPanel = estadoVista === 'empleados' || estadoVista === 'administracion';
  const productoDeRuta = navegacion.productoId
    ? productos.find((producto) => producto.id === navegacion.productoId) || null
    : null;
  const productoActual = productoDeRuta || productoElegido;

  // Nunca se pinta contenido privado mientras se comprueba la sesión.
  if (
    cargandoSesion &&
    (esPanel ||
      estadoVista === 'cuenta' ||
      estadoVista === 'reserva' ||
      estadoVista === 'restablecer-contrasena')
  ) {
    return <PantallaCargaSesion />;
  }

  const moduloProtegido =
    estadoVista === 'empleados' ? 'el panel de empleados' : 'el panel de administración';
  const accesoPermitido =
    Boolean(usuarioActual) &&
    (estadoVista === 'empleados'
      ? rolActual === 'empleado' || rolActual === 'administrador'
      : rolActual === 'administrador');
  const irIniciarSesion = () => cambiarRuta('/iniciar-sesion');
  const cambiarCuenta = () => {
    setUsuarioActual(null);
    setCargandoSesion(false);
    void servicioAutenticacion.cerrarSesion();
    cambiarRuta('/iniciar-sesion');
  };

  const contenidoTienda = (
    <>
      {estadoVista === 'inicio' && (
        <PaginaInicio
          productos={productos}
          alVerProducto={verProducto}
          alAlquilar={alquilar}
          irAlCatalogo={(categoria) => (categoria ? navegar('categorias', categoria) : navegar('catalogo'))}
        />
      )}
      {estadoVista === 'catalogo' && (
        <PaginaCatalogo
          productos={productos}
          textoInicial={busqueda}
          categoriaInicial={navegacion.categoria}
          alVerProducto={verProducto}
          alAlquilar={alquilar}
        />
      )}
      {estadoVista === 'detalle' && productoActual && (
        <DetalleProducto
          producto={productoActual}
          volver={() => cambiarRuta('/catalogo')}
          alReservar={continuarReserva}
        />
      )}
      {estadoVista === 'reserva' && usuarioActual && productoDeRuta && (
        <ModalReserva
          comoPagina
          key={`${productoDeRuta.id}-${navegacion.modalidad ?? 'fin de semana'}`}
          producto={productoDeRuta}
          modalidadInicial={navegacion.modalidad}
          cerrar={() => cambiarRuta(`/producto/${productoDeRuta.id}`)}
          confirmar={confirmarReserva}
          alTerminar={() => cambiarRuta('/cuenta')}
        />
      )}
      {estadoVista === 'reserva' && usuarioActual && !productoDeRuta && (
        <main className="min-h-[calc(100vh-76px)] bg-neblina px-5 py-16">
          <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-suave">
            <h1 className="text-2xl font-black text-tinta">No hemos encontrado ese producto</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              El producto de la reserva ya no está disponible. Vuelve al catálogo para elegir otro.
            </p>
            <button
              onClick={() => cambiarRuta('/catalogo')}
              className="mt-6 rounded-xl bg-electrico px-5 py-3 text-sm font-bold text-white transition hover:bg-violeta"
            >
              Ir al catálogo
            </button>
          </div>
        </main>
      )}
      {(estadoVista === 'inicio-sesion' || estadoVista === 'registro') && (
        <PaginaAutenticacion
          modoInicial={estadoVista === 'registro' ? 'registro' : 'inicio'}
          alAutenticar={autenticarUsuario}
          volver={() => navegar('inicio')}
          cambiarModo={(modo) => {
            const ruta = modo === 'registro' ? '/registro' : '/iniciar-sesion';
            cambiarRuta(
              navegacion.redirigir
                ? `${ruta}?redirigir=${encodeURIComponent(navegacion.redirigir)}`
                : ruta,
            );
          }}
        />
      )}
      {estadoVista === 'restablecer-contrasena' && (
        <PaginaRestablecerContrasena
          alTerminar={() => cambiarRuta('/iniciar-sesion')}
          volver={() => navegar('inicio')}
        />
      )}
      {estadoVista === 'cuenta' &&
        (usuarioActual ? (
          <PaginaCuenta
            usuario={usuarioActual}
            cerrar={cerrarSesion}
            alActualizar={setUsuarioActual}
            irAlCatalogo={() => navegar('catalogo')}
          />
        ) : (
          <AccesoNoAutenticado irIniciarSesion={irIniciarSesion} volver={() => navegar('inicio')} />
        ))}
    </>
  );

  const contenidoPanel =
    estadoVista === 'empleados' ? (
      !usuarioActual ? (
        <AccesoNoAutenticado irIniciarSesion={irIniciarSesion} volver={() => navegar('inicio')} />
      ) : accesoPermitido ? (
        <LayoutEmpleados
          seccionInicial={navegacion.seccionEmpleado}
          navegar={navegarEmpleados}
          salir={() => navegar('inicio')}
        />
      ) : (
        <AccesoProtegido
          modulo={moduloProtegido}
          rolActual={rolActual}
          irIniciarSesion={irIniciarSesion}
          cambiarCuenta={cambiarCuenta}
          volver={() => navegar('inicio')}
        />
      )
    ) : !usuarioActual ? (
      <AccesoNoAutenticado irIniciarSesion={irIniciarSesion} volver={() => navegar('inicio')} />
    ) : accesoPermitido ? (
      <LayoutAdministracion
        seccionInicial={navegacion.seccionAdministracion}
        navegar={navegarAdministracion}
        salir={() => navegar('inicio')}
        usuario={usuarioActual}
      />
    ) : (
      <AccesoProtegido
        modulo={moduloProtegido}
        rolActual={rolActual}
        irIniciarSesion={irIniciarSesion}
        cambiarCuenta={cambiarCuenta}
        volver={() => navegar('inicio')}
      />
    );

  return esPanel ? (
    <>{contenidoPanel}</>
  ) : (
    <LayoutTienda
      vista={estadoVista}
      navegar={navegar}
      buscar={(texto) => {
        setBusqueda(texto);
        cambiarRuta('/catalogo');
      }}
      reservas={reservas}
      abrirCuenta={abrirCuenta}
      abrirReserva={abrirReserva}
      nombreUsuario={usuarioActual ? usuarioActual.nombre : undefined}
      alCerrarSesion={cerrarSesion}
      mostrarPie={
        estadoVista !== 'inicio-sesion' &&
        estadoVista !== 'registro' &&
        estadoVista !== 'restablecer-contrasena'
      }
    >
      {contenidoTienda}
    </LayoutTienda>
  );
}
