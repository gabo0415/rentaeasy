import { Producto } from '../tipos';
import frigorificosCombi from '../assets/catalogo/frigorificos-combi.webp';
import neverasGranCapacidad from '../assets/catalogo/neveras-gran-capacidad.webp';
import hornos from '../assets/catalogo/hornos.webp';
import lavavajillas from '../assets/catalogo/lavavajillas.webp';
import cafeterasSuperautomaticas from '../assets/catalogo/cafeteras-superautomaticas.webp';
import robotsCocinaMultifuncion from '../assets/catalogo/robots-cocina-multifuncion.webp';
import freidorasAireDobleCapacidad from '../assets/catalogo/freidoras-aire-doble-capacidad.webp';
import amasadorasProfesionales from '../assets/catalogo/amasadoras-profesionales.webp';
import lavadorasCargaFrontal from '../assets/catalogo/lavadoras-carga-frontal.webp';
import secadorasBombaCalor from '../assets/catalogo/secadoras-bomba-calor.webp';
import lavasecadorasIntegrales from '../assets/catalogo/lavasecadoras-integrales.webp';
import centrosPlanchadoProfesionales from '../assets/catalogo/centros-planchado-profesionales.webp';
import robotsAspiradoresAutovaciado from '../assets/catalogo/robots-aspiradores-autovaciado.webp';
import aspiradorasEscoba from '../assets/catalogo/aspiradoras-escoba.webp';
import limpiadorasTapicerias from '../assets/catalogo/limpiadoras-tapicerias.webp';
import aireAcondicionadoPortatil from '../assets/catalogo/aire-acondicionado-portatil.webp';
import purificadoresAire from '../assets/catalogo/purificadores-aire.webp';

export type CategoriaNueva = Producto['categoria'];

const IMAGENES: Record<string, string> = {
  'frigorificos-combi': frigorificosCombi,
  'neveras-gran-capacidad': neverasGranCapacidad,
  hornos,
  lavavajillas,
  'cafeteras-superautomaticas': cafeterasSuperautomaticas,
  'robots-cocina-multifuncion': robotsCocinaMultifuncion,
  'freidoras-aire-doble-capacidad': freidorasAireDobleCapacidad,
  'amasadoras-profesionales': amasadorasProfesionales,
  'lavadoras-carga-frontal': lavadorasCargaFrontal,
  'secadoras-bomba-calor': secadorasBombaCalor,
  'lavasecadoras-integrales': lavasecadorasIntegrales,
  'centros-planchado-profesionales': centrosPlanchadoProfesionales,
  'robots-aspiradores-autovaciado': robotsAspiradoresAutovaciado,
  'aspiradoras-escoba': aspiradorasEscoba,
  'limpiadoras-tapicerias': limpiadorasTapicerias,
  'aire-acondicionado-portatil': aireAcondicionadoPortatil,
  'purificadores-aire': purificadoresAire,
};

const crearProducto = (
  id: string,
  nombre: string,
  categoria: CategoriaNueva,
  destacado = false,
): Producto => ({
  id,
  nombre,
  categoria,
  descripcion:
    'Alquiler disponible en Rentaeasy. Las características concretas, tarifas y disponibilidad se confirmarán antes de formalizar la reserva.',
  imagen: IMAGENES[id],
  etiquetas: ['Alquiler'],
  caracteristicas: ['Reserva sujeta a disponibilidad', 'Características y modelo a confirmar con el equipo'],
  precioFinDeSemana: 29,
  precioMensual: 59,
  precioVariosMeses: 49,
  destacado,
});

const COCINA: CategoriaNueva = 'Conservación, cocina y pequeño electrodoméstico';
const ROPA: CategoriaNueva = 'Lavado y cuidado de la ropa';
const LIMPIEZA: CategoriaNueva = 'Limpieza avanzada y climatización estacional';

// Catálogo provisional: precios y características están pendientes de
// confirmación. Las imágenes son fotografías de producto de los fabricantes;
// consulta LICENCIAS.md para ver la fuente de cada una.
export const productos: Producto[] = [
  crearProducto('frigorificos-combi', 'Frigoríficos combi', COCINA),
  crearProducto('neveras-gran-capacidad', 'Neveras de gran capacidad', COCINA),
  crearProducto('hornos', 'Hornos', COCINA),
  crearProducto('lavavajillas', 'Lavavajillas', COCINA),
  crearProducto('cafeteras-superautomaticas', 'Cafeteras superautomáticas', COCINA, true),
  crearProducto('robots-cocina-multifuncion', 'Robots de cocina multifunción', COCINA),
  crearProducto('freidoras-aire-doble-capacidad', 'Freidoras de aire de doble capacidad', COCINA),
  crearProducto('amasadoras-profesionales', 'Amasadoras profesionales', COCINA),
  crearProducto('lavadoras-carga-frontal', 'Lavadoras de carga frontal', ROPA, true),
  crearProducto('secadoras-bomba-calor', 'Secadoras de bomba de calor', ROPA),
  crearProducto('lavasecadoras-integrales', 'Lavasecadoras integrales', ROPA),
  crearProducto('centros-planchado-profesionales', 'Centros de planchado profesionales', ROPA),
  crearProducto('robots-aspiradores-autovaciado', 'Robots aspiradores con sistema de autovaciado', LIMPIEZA, true),
  crearProducto('aspiradoras-escoba', 'Aspiradoras escoba', LIMPIEZA),
  crearProducto('limpiadoras-tapicerias', 'Limpiadoras de tapicerías', LIMPIEZA),
  crearProducto('aire-acondicionado-portatil', 'Aire acondicionado portátil', LIMPIEZA),
  crearProducto('purificadores-aire', 'Purificadores de aire', LIMPIEZA, true),
];

