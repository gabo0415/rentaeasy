-- Rentaeasy · reemplazo del catálogo de productos y categorías
--
-- Alcance estrictamente limitado a:
--   - public.categorias
--   - public.productos
--   - una copia de seguridad del catálogo anterior en public.bak_catalogo_20261106
--
-- No modifica perfiles, reservas, detalles_reserva, movimientos_inventario,
-- permisos, RLS ni autenticación. Si una reserva o movimiento referencia un
-- producto, la eliminación falla por la restricción ON DELETE RESTRICT y no se
-- borra ningún historial.
--
-- Los precios e imágenes no formaban parte del nuevo documento. Para que la aplicación sea navegable,
-- se usan valores provisionales compatibles con public.productos:
--   precio_fin_de_semana = 29.00 €
--   precio_mensual = 59.00 €
--   precio_dia_adicional = 0.00 € (valor por defecto de la columna)
--   stock_total = 1 unidad
--   stock_disponible = 1 unidad
--   imagen = NULL
--   descripcion = texto provisional
--
-- Estos valores NO son tarifas definitivas ni representan existencias reales.
-- Deben revisarse antes de publicar el catálogo.

create table if not exists public.bak_catalogo_20261106 (
  migracion text not null,
  tabla text not null,
  datos jsonb not null,
  creado_en timestamptz not null default timezone('utc', now()),
  primary key (migracion, tabla)
);

revoke all on table public.bak_catalogo_20261106 from public, anon, authenticated;

insert into public.bak_catalogo_20261106 (migracion, tabla, datos)
select '20261106_reemplazar_catalogo', 'categorias', coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
from public.categorias c
on conflict (migracion, tabla) do nothing;

insert into public.bak_catalogo_20261106 (migracion, tabla, datos)
select '20261106_reemplazar_catalogo', 'productos', coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
from public.productos p
on conflict (migracion, tabla) do nothing;

-- El orden importa por la relación productos.categoria -> categorias.id.
-- Si productos tiene referencias desde detalles_reserva o movimientos_inventario,
-- PostgreSQL detiene la eliminación y no se altera el historial.
delete from public.productos;
delete from public.categorias;

with nuevas_categorias as (
  insert into public.categorias (nombre, descripcion, estado)
  values
    ('Conservación, cocina y pequeño electrodoméstico', 'Productos para conservar alimentos, cocinar y equipar la vivienda.', 'activa'),
    ('Lavado y cuidado de la ropa', 'Productos para lavar, secar, planchar y cuidar la ropa.', 'activa'),
    ('Limpieza avanzada y climatización estacional', 'Productos para limpieza avanzada, purificación de aire y climatización estacional.', 'activa')
  returning id, nombre
),
nuevos_productos as (
  select *
  from (
    values
      ('Conservación, cocina y pequeño electrodoméstico', 'Frigoríficos combi'),
      ('Conservación, cocina y pequeño electrodoméstico', 'Neveras de gran capacidad'),
      ('Conservación, cocina y pequeño electrodoméstico', 'Hornos'),
      ('Conservación, cocina y pequeño electrodoméstico', 'Lavavajillas'),
      ('Conservación, cocina y pequeño electrodoméstico', 'Cafeteras superautomáticas'),
      ('Conservación, cocina y pequeño electrodoméstico', 'Robots de cocina multifunción'),
      ('Conservación, cocina y pequeño electrodoméstico', 'Freidoras de aire de doble capacidad'),
      ('Conservación, cocina y pequeño electrodoméstico', 'Amasadoras profesionales'),
      ('Lavado y cuidado de la ropa', 'Lavadoras de carga frontal'),
      ('Lavado y cuidado de la ropa', 'Secadoras de bomba de calor'),
      ('Lavado y cuidado de la ropa', 'Lavasecadoras integrales'),
      ('Lavado y cuidado de la ropa', 'Centros de planchado profesionales'),
      ('Limpieza avanzada y climatización estacional', 'Robots aspiradores con sistema de autovaciado'),
      ('Limpieza avanzada y climatización estacional', 'Aspiradoras escoba'),
      ('Limpieza avanzada y climatización estacional', 'Limpiadoras de tapicerías'),
      ('Limpieza avanzada y climatización estacional', 'Aire acondicionado portátil'),
      ('Limpieza avanzada y climatización estacional', 'Purificadores de aire')
  ) as valores(categoria_nombre, nombre)
)
insert into public.productos (
  categoria,
  nombre,
  descripcion,
  precio_fin_de_semana,
  precio_mensual,
  precio_dia_adicional,
  stock_total,
  stock_disponible,
  estado
)
select
  nc.id,
  np.nombre,
  'Alquiler disponible en Rentaeasy. Las características concretas, tarifas y disponibilidad se confirmarán antes de formalizar la reserva.',
  29.00,
  59.00,
  0.00,
  1,
  1,
  'activo'
from nuevos_productos np
join nuevas_categorias nc on nc.nombre = np.categoria_nombre;
