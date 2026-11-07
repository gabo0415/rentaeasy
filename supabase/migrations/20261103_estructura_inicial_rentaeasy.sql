-- Rentaeasy · estructura inicial segura para Supabase/PostgreSQL
--
-- Esta migración no elimina tablas ni datos. Las políticas existentes se
-- reemplazan de forma explícita para dejar una configuración RLS conocida.
-- No ejecutar desde el frontend: debe ejecutarse en Supabase SQL Editor.

create extension if not exists pgcrypto;

-- ============================================================
-- 1. TABLAS BASE
-- ============================================================

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombres text not null check (char_length(trim(nombres)) >= 2),
  apellidos text not null check (char_length(trim(apellidos)) >= 2),
  telefono text,
  rol text not null default 'cliente' check (rol in ('cliente', 'empleado', 'administrador')),
  fecha_creacion timestamptz not null default timezone('utc', now())
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (char_length(trim(nombre)) >= 2),
  descripcion text,
  imagen text,
  estado text not null default 'activa' check (estado in ('activa', 'inactiva'))
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  categoria uuid not null references public.categorias(id) on update cascade on delete restrict,
  nombre text not null check (char_length(trim(nombre)) >= 2),
  descripcion text,
  precio_fin_de_semana numeric(12, 2) not null default 0 check (precio_fin_de_semana >= 0),
  precio_mensual numeric(12, 2) not null default 0 check (precio_mensual >= 0),
  precio_dia_adicional numeric(12, 2) not null default 0 check (precio_dia_adicional >= 0),
  stock_total integer not null default 0 check (stock_total >= 0),
  stock_disponible integer not null default 0 check (stock_disponible >= 0 and stock_disponible <= stock_total),
  imagen text,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo', 'mantenimiento')),
  fecha_creacion timestamptz not null default timezone('utc', now())
);

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  cliente uuid not null references public.perfiles(id) on update cascade on delete restrict,
  codigo_reserva text not null unique default ('RE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  fecha_solicitud timestamptz not null default timezone('utc', now()),
  fecha_inicio date not null,
  fecha_devolucion date not null,
  modalidad_alquiler text not null default 'fin_de_semana' constraint reservas_modalidad_alquiler_check check (modalidad_alquiler in ('fin_de_semana', 'mensual', 'varios_meses')),
  modalidad_entrega text not null check (modalidad_entrega in ('tienda', 'domicilio')),
  direccion_entrega text,
  importe_total numeric(12, 2) not null default 0 check (importe_total >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'en_preparacion', 'en_alquiler', 'finalizada', 'cancelada')),
  fecha_actualizacion timestamptz not null default timezone('utc', now()),
  constraint reservas_fechas_validas check (fecha_devolucion >= fecha_inicio),
  constraint reservas_direccion_domicilio check (modalidad_entrega = 'tienda' or nullif(trim(direccion_entrega), '') is not null)
);

-- Compatibilidad con una ejecución previa de la migración inicial, que aún
-- no tenía la modalidad de alquiler necesaria para calcular tarifas.
alter table public.reservas
  add column if not exists modalidad_alquiler text not null default 'fin_de_semana';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservas_modalidad_alquiler_check') then
    alter table public.reservas
      add constraint reservas_modalidad_alquiler_check
      check (modalidad_alquiler in ('fin_de_semana', 'mensual', 'varios_meses'));
  end if;
end;
$$;

create table if not exists public.detalles_reserva (
  id uuid primary key default gen_random_uuid(),
  reserva uuid not null references public.reservas(id) on update cascade on delete cascade,
  producto uuid not null references public.productos(id) on update cascade on delete restrict,
  cantidad integer not null default 1 check (cantidad > 0),
  precio_aplicado numeric(12, 2) not null check (precio_aplicado >= 0),
  subtotal numeric(12, 2) generated always as (cantidad * precio_aplicado) stored,
  constraint detalles_reserva_producto_unico unique (reserva, producto)
);

create table if not exists public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto uuid not null references public.productos(id) on update cascade on delete restrict,
  reserva uuid references public.reservas(id) on update cascade on delete set null,
  tipo_movimiento text not null check (tipo_movimiento in ('entrada', 'salida', 'devolucion', 'mantenimiento', 'ajuste')),
  cantidad integer not null check (cantidad > 0),
  fecha timestamptz not null default timezone('utc', now()),
  observaciones text
);

-- ============================================================
-- 2. ÍNDICES Y DATOS INICIALES NO DESTRUCTIVOS
-- ============================================================

create index if not exists perfiles_rol_idx on public.perfiles(rol);
create index if not exists categorias_estado_idx on public.categorias(estado);
create index if not exists productos_categoria_idx on public.productos(categoria);
create index if not exists productos_estado_idx on public.productos(estado);
create index if not exists productos_disponibilidad_idx on public.productos(stock_disponible) where estado = 'activo';
create index if not exists reservas_cliente_idx on public.reservas(cliente);
create index if not exists reservas_estado_idx on public.reservas(estado);
create index if not exists reservas_fechas_idx on public.reservas(fecha_inicio, fecha_devolucion);
create index if not exists reservas_pendientes_idx on public.reservas(fecha_solicitud) where estado = 'pendiente';
create index if not exists detalles_reserva_reserva_idx on public.detalles_reserva(reserva);
create index if not exists detalles_reserva_producto_idx on public.detalles_reserva(producto);
create index if not exists movimientos_inventario_producto_idx on public.movimientos_inventario(producto);
create index if not exists movimientos_inventario_reserva_idx on public.movimientos_inventario(reserva);
create index if not exists movimientos_inventario_fecha_idx on public.movimientos_inventario(fecha desc);

insert into public.categorias (nombre, descripcion, estado)
values
  ('Limpieza y cuidado personal', 'Productos para limpieza del hogar y cuidado personal.', 'activa'),
  ('Audiovisual y creación', 'Cámaras, audio, iluminación y herramientas para crear contenido.', 'activa'),
  ('Ocio y realidad virtual', 'Tecnología de ocio, entretenimiento y experiencias inmersivas.', 'activa'),
  ('Cocina y hogar', 'Pequeños electrodomésticos para cocinar y disfrutar en casa.', 'activa'),
  ('Salud y climatización', 'Bienestar, purificación de aire y climatización estacional.', 'activa')
on conflict (nombre) do nothing;

comment on table public.perfiles is 'Datos de aplicación y rol del usuario autenticado en Supabase Auth.';
comment on column public.perfiles.rol is 'Solo un administrador autorizado puede asignar roles internos.';
comment on column public.reservas.importe_total is 'Calculado en crear_reserva; no se acepta desde el cliente.';
comment on column public.detalles_reserva.precio_aplicado is 'Copiado desde productos por la función transaccional de reserva.';

-- ============================================================
-- 3. FUNCIONES SEGURAS DE ROLES Y PERFILES
-- ============================================================

-- Se crean después de public.perfiles para respetar el orden de dependencias.
create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'administrador'
  );
$$;

create or replace function public.es_empleado()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol in ('empleado', 'administrador')
  );
$$;

create or replace function public.proteger_rol_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
    and (new.id is distinct from old.id or new.fecha_creacion is distinct from old.fecha_creacion) then
    raise exception 'El identificador y la fecha de creación del perfil no pueden cambiar';
  end if;

  if tg_op = 'INSERT' and new.rol <> 'cliente' and not public.es_administrador() then
    raise exception 'Solo un administrador puede crear usuarios internos';
  end if;

  if tg_op = 'UPDATE' and new.rol is distinct from old.rol and not public.es_administrador() then
    raise exception 'Solo un administrador puede modificar roles';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'proteger_rol_perfil_trigger'
      and tgrelid = 'public.perfiles'::regclass
  ) then
    create trigger proteger_rol_perfil_trigger
      before insert or update on public.perfiles
      for each row execute function public.proteger_rol_perfil();
  end if;
end;
$$;

create or replace function public.crear_perfil_usuario_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.perfiles (id, nombres, apellidos, telefono, rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombres'), ''), 'Cliente'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'apellidos'), ''), 'Rentaeasy'),
    new.phone,
    'cliente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'crear_perfil_usuario_nuevo_trigger'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger crear_perfil_usuario_nuevo_trigger
      after insert on auth.users
      for each row execute function public.crear_perfil_usuario_nuevo();
  end if;
end;
$$;

-- ============================================================
-- 4. VALIDACIÓN DE CATÁLOGO, PRECIOS Y DISPONIBILIDAD
-- ============================================================

create or replace function public.proteger_cambios_producto_empleado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
    and (new.id is distinct from old.id or new.fecha_creacion is distinct from old.fecha_creacion) then
    raise exception 'El identificador y la fecha de creación del producto no pueden cambiar';
  end if;

  if public.es_empleado() and not public.es_administrador() then
    if new.categoria is distinct from old.categoria
      or new.nombre is distinct from old.nombre
      or new.descripcion is distinct from old.descripcion
      or new.precio_fin_de_semana is distinct from old.precio_fin_de_semana
      or new.precio_mensual is distinct from old.precio_mensual
      or new.precio_dia_adicional is distinct from old.precio_dia_adicional
      or new.stock_total is distinct from old.stock_total
      or new.imagen is distinct from old.imagen then
      raise exception 'Un empleado solo puede actualizar disponibilidad y estado';
    end if;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'proteger_cambios_producto_empleado_trigger'
      and tgrelid = 'public.productos'::regclass
  ) then
    create trigger proteger_cambios_producto_empleado_trigger
      before update on public.productos
      for each row execute function public.proteger_cambios_producto_empleado();
  end if;
end;
$$;

-- Bloquea la fila del producto y comprueba la máxima ocupación simultánea
-- diaria. La función se invoca dentro de la misma transacción que confirma
-- una reserva.
create or replace function public.validar_disponibilidad_reserva(
  p_reserva uuid,
  p_fecha_inicio date,
  p_fecha_devolucion date
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_producto_id uuid;
  v_stock_total integer;
  v_cantidad_solicitada integer;
  v_cantidad_reservada integer;
begin
  if p_fecha_inicio is null or p_fecha_devolucion is null then
    raise exception 'Las fechas de inicio y devolución son obligatorias';
  end if;

  for v_producto_id in
    select distinct producto
    from public.detalles_reserva
    where reserva = p_reserva
    order by producto
  loop
    select stock_total
      into v_stock_total
      from public.productos
      where id = v_producto_id
      for update;

    if not found then
      raise exception 'El producto de la reserva no existe';
    end if;

    select coalesce(sum(cantidad), 0)::integer
      into v_cantidad_solicitada
      from public.detalles_reserva
      where reserva = p_reserva and producto = v_producto_id;

    select coalesce(max(ocupacion_diaria.cantidad), 0)::integer
      into v_cantidad_reservada
      from generate_series(
        p_fecha_inicio,
        p_fecha_devolucion,
        interval '1 day'
      ) as dia(fecha)
      left join lateral (
        select coalesce(sum(dr.cantidad), 0)::integer as cantidad
        from public.detalles_reserva dr
        join public.reservas r on r.id = dr.reserva
        where dr.producto = v_producto_id
          and r.id <> p_reserva
          and r.estado in ('confirmada', 'en_preparacion', 'en_alquiler')
          and r.fecha_inicio <= dia.fecha::date
          and r.fecha_devolucion >= dia.fecha::date
      ) as ocupacion_diaria on true;

    if v_cantidad_reservada + v_cantidad_solicitada > v_stock_total then
      raise exception 'No hay stock suficiente para el producto % en el periodo solicitado', v_producto_id;
    end if;
  end loop;
end;
$$;

create or replace function public.proteger_cambios_reserva_empleado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
    and (new.id is distinct from old.id
      or new.codigo_reserva is distinct from old.codigo_reserva
      or new.fecha_solicitud is distinct from old.fecha_solicitud) then
    raise exception 'El identificador, código y fecha de solicitud de la reserva no pueden cambiar';
  end if;

  if public.es_empleado() and not public.es_administrador() then
    if new.cliente is distinct from old.cliente
      or new.fecha_inicio is distinct from old.fecha_inicio
      or new.fecha_devolucion is distinct from old.fecha_devolucion
      or new.modalidad_alquiler is distinct from old.modalidad_alquiler
      or new.modalidad_entrega is distinct from old.modalidad_entrega
      or new.direccion_entrega is distinct from old.direccion_entrega
      or new.importe_total is distinct from old.importe_total then
      raise exception 'Un empleado solo puede actualizar el estado operativo de una reserva';
    end if;
  end if;
  return new;
  end;
$$;

create or replace function public.proteger_identificador_detalle_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'El identificador del detalle de reserva no puede cambiar';
  end if;
  return new;
end;
$$;

create or replace function public.proteger_identificador_movimiento_inventario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
    and (new.id is distinct from old.id or new.fecha is distinct from old.fecha) then
    raise exception 'El identificador y la fecha del movimiento de inventario no pueden cambiar';
  end if;
  return new;
end;
$$;

create or replace function public.validar_estado_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado <> 'pendiente' then
      raise exception 'Una reserva nueva debe comenzar en estado pendiente';
    end if;
    if new.fecha_inicio < current_date then
      raise exception 'La fecha de inicio no puede ser anterior a hoy';
    end if;
    if new.fecha_devolucion < new.fecha_inicio then
      raise exception 'La fecha de devolución debe ser posterior o igual a la fecha de inicio';
    end if;
  elsif new.fecha_inicio is distinct from old.fecha_inicio
    or new.fecha_devolucion is distinct from old.fecha_devolucion then
    if new.fecha_inicio < current_date then
      raise exception 'La fecha de inicio no puede ser anterior a hoy';
    end if;
    if new.fecha_devolucion < new.fecha_inicio then
      raise exception 'La fecha de devolución debe ser posterior o igual a la fecha de inicio';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.estado is distinct from old.estado then
    case old.estado
      when 'pendiente' then
        if new.estado not in ('confirmada', 'cancelada') then
          raise exception 'Transición de estado no permitida: % -> %', old.estado, new.estado;
        end if;
      when 'confirmada' then
        if new.estado not in ('en_preparacion', 'cancelada') then
          raise exception 'Transición de estado no permitida: % -> %', old.estado, new.estado;
        end if;
      when 'en_preparacion' then
        if new.estado not in ('en_alquiler', 'cancelada') then
          raise exception 'Transición de estado no permitida: % -> %', old.estado, new.estado;
        end if;
      when 'en_alquiler' then
        if new.estado <> 'finalizada' then
          raise exception 'Transición de estado no permitida: % -> %', old.estado, new.estado;
        end if;
      when 'finalizada', 'cancelada' then
        raise exception 'La reserva en estado % no puede cambiar de estado', old.estado;
      else
        raise exception 'Estado de reserva anterior no reconocido: %', old.estado;
    end case;
  end if;

  if new.estado in ('confirmada', 'en_preparacion', 'en_alquiler') then
    perform public.validar_disponibilidad_reserva(new.id, new.fecha_inicio, new.fecha_devolucion);
  end if;
  return new;
end;
$$;

create or replace function public.actualizar_fecha_reserva()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.fecha_actualizacion = timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'proteger_cambios_reserva_empleado_trigger'
      and tgrelid = 'public.reservas'::regclass
  ) then
    create trigger proteger_cambios_reserva_empleado_trigger
      before update on public.reservas
      for each row execute function public.proteger_cambios_reserva_empleado();
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'validar_estado_reserva_trigger'
      and tgrelid = 'public.reservas'::regclass
  ) then
    create trigger validar_estado_reserva_trigger
      before insert or update on public.reservas
      for each row execute function public.validar_estado_reserva();
  end if;
  if not exists (
    select 1 from pg_trigger
      where tgname = 'actualizar_fecha_reserva_trigger'
      and tgrelid = 'public.reservas'::regclass
  ) then
    create trigger actualizar_fecha_reserva_trigger
      before update on public.reservas
      for each row execute function public.actualizar_fecha_reserva();
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'proteger_identificador_detalle_reserva_trigger'
      and tgrelid = 'public.detalles_reserva'::regclass
  ) then
    create trigger proteger_identificador_detalle_reserva_trigger
      before update on public.detalles_reserva
      for each row execute function public.proteger_identificador_detalle_reserva();
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'proteger_identificador_movimiento_inventario_trigger'
      and tgrelid = 'public.movimientos_inventario'::regclass
  ) then
    create trigger proteger_identificador_movimiento_inventario_trigger
      before update on public.movimientos_inventario
      for each row execute function public.proteger_identificador_movimiento_inventario();
  end if;
end;
$$;

-- Regla de tarifas documentada:
-- * fin_de_semana: precio_fin_de_semana y máximo tres días.
-- * mensual: cada bloque de 30 días usa precio_mensual; los días restantes
--   usan precio_dia_adicional. Menos de 30 días se cobra como un mes.
-- * varios_meses: misma regla por bloques de 30 días, permitiendo varios
--   bloques. Por ejemplo, 60 días = 2 * precio_mensual.
create or replace function public.calcular_importe_alquiler(
  p_precio_fin_de_semana numeric,
  p_precio_mensual numeric,
  p_precio_dia_adicional numeric,
  p_dias integer,
  p_modalidad_alquiler text
)
returns numeric(12, 2)
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_bloques_mensuales integer;
  v_dias_adicionales integer;
begin
  if p_dias <= 0 then
    raise exception 'La duración del alquiler debe ser mayor que cero';
  end if;

  if p_modalidad_alquiler = 'fin_de_semana' then
    if p_dias > 3 then
      raise exception 'La modalidad de fin de semana permite como máximo tres días';
    end if;
    return round(p_precio_fin_de_semana, 2);
  end if;

  if p_modalidad_alquiler is null then
    raise exception 'La modalidad de alquiler es obligatoria';
  end if;
  if p_modalidad_alquiler not in ('mensual', 'varios_meses') then
    raise exception 'La modalidad de alquiler no es válida';
  end if;

  v_bloques_mensuales := greatest(1, floor(p_dias / 30.0)::integer);
  v_dias_adicionales := greatest(p_dias - (v_bloques_mensuales * 30), 0);

  return round(
    (p_precio_mensual * v_bloques_mensuales)
    + (p_precio_dia_adicional * v_dias_adicionales),
    2
  );
end;
$$;

-- Disponibilidad calculada para un periodo, nunca a partir únicamente de
-- productos.stock_disponible. Las fechas son inclusivas: se cuenta cada día
-- desde fecha_inicio hasta fecha_devolucion. Las reservas pendientes no
-- comprometen stock; las confirmadas, preparadas y activas sí lo hacen.
create or replace function public.obtener_disponibilidad_producto(
  p_producto uuid,
  p_fecha_inicio date,
  p_fecha_devolucion date
)
returns table (
  producto uuid,
  stock_fisico_total integer,
  unidades_comprometidas integer,
  unidades_disponibles integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_fecha_inicio is null or p_fecha_devolucion is null then
    raise exception 'Las fechas de inicio y devolución son obligatorias';
  end if;
  if p_fecha_inicio < current_date then
    raise exception 'La fecha de inicio no puede ser anterior a hoy';
  end if;
  if p_fecha_devolucion < p_fecha_inicio then
    raise exception 'La fecha de devolución debe ser posterior o igual a la fecha de inicio';
  end if;

  return query
    select
      p.id,
      p.stock_total,
      coalesce(max(ocupacion_diaria.cantidad), 0)::integer,
      greatest(p.stock_total - coalesce(max(ocupacion_diaria.cantidad), 0)::integer, 0)
    from public.productos p
    cross join generate_series(
      p_fecha_inicio,
      p_fecha_devolucion,
      interval '1 day'
    ) as dia(fecha)
    left join lateral (
      select coalesce(sum(dr.cantidad), 0)::integer as cantidad
      from public.detalles_reserva dr
      join public.reservas r on r.id = dr.reserva
      where dr.producto = p.id
        and r.estado in ('confirmada', 'en_preparacion', 'en_alquiler')
        and r.fecha_inicio <= dia.fecha::date
        and r.fecha_devolucion >= dia.fecha::date
    ) as ocupacion_diaria on true
    where p.id = p_producto and p.estado = 'activo';
end;
$$;

-- Se elimina únicamente la firma antigua de un solo producto. No se usa
-- CASCADE: si otra función, vista o trigger dependiera de esa firma,
-- PostgreSQL detendrá la migración en lugar de borrar la dependencia
-- silenciosamente. Los clientes que llamaban a la RPC antigua deben migrar
-- a la firma JSONB antes de aplicar esta migración.
drop function if exists public.crear_reserva(uuid, integer, date, date, text, text, text);

-- RPC transaccional para un carrito completo. p_items debe ser un array JSON:
-- [{"producto":"uuid", "cantidad":2}, {"producto":"uuid", "cantidad":1}]
-- Los productos se bloquean por UUID ordenado para evitar carreras y reducir
-- el riesgo de deadlocks en carritos con varios productos.
create or replace function public.crear_reserva(
  p_items jsonb,
  p_fecha_inicio date,
  p_fecha_devolucion date,
  p_modalidad_alquiler text,
  p_modalidad_entrega text,
  p_direccion_entrega text default null
)
returns public.reservas
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_producto public.productos%rowtype;
  v_reserva public.reservas%rowtype;
  v_rol text;
  v_dias integer;
  v_cantidad_reservada integer;
  v_importe_unitario numeric(12, 2);
  v_importe_total numeric(12, 2) := 0;
begin
  select rol into v_rol from public.perfiles where id = auth.uid();
  if v_rol is distinct from 'cliente' then
    raise exception 'Solo un cliente puede crear una solicitud de reserva';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'La reserva debe contener al menos un producto';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La reserva debe contener al menos un producto';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as elemento(item)
    where jsonb_typeof(elemento.item) <> 'object'
      or jsonb_typeof(elemento.item -> 'producto') <> 'string'
      or jsonb_typeof(elemento.item -> 'cantidad') <> 'number'
      or elemento.item ->> 'producto' is null
      or elemento.item ->> 'cantidad' is null
      or (elemento.item ->> 'cantidad') !~ '^[0-9]+$'
  ) then
    raise exception 'Cada línea debe incluir producto y cantidad';
  end if;
  if p_fecha_inicio is null or p_fecha_devolucion is null then
    raise exception 'Las fechas de inicio y devolución son obligatorias';
  end if;
  if p_fecha_inicio < current_date then
    raise exception 'La fecha de inicio no puede ser anterior a hoy';
  end if;
  if p_fecha_devolucion < p_fecha_inicio then
    raise exception 'La fecha de devolución debe ser posterior o igual a la fecha de inicio';
  end if;
  if p_modalidad_alquiler is null then
    raise exception 'La modalidad de alquiler es obligatoria';
  end if;
  if p_modalidad_alquiler not in ('fin_de_semana', 'mensual', 'varios_meses') then
    raise exception 'La modalidad de alquiler no es válida';
  end if;
  if p_modalidad_entrega is null then
    raise exception 'La modalidad de entrega es obligatoria';
  end if;
  if p_modalidad_entrega not in ('tienda', 'domicilio') then
    raise exception 'La modalidad de entrega no es válida';
  end if;
  if p_modalidad_entrega = 'domicilio' and nullif(trim(p_direccion_entrega), '') is null then
    raise exception 'La dirección es obligatoria para una entrega a domicilio';
  end if;

  v_dias := (p_fecha_devolucion - p_fecha_inicio) + 1;

  -- Valida cada línea antes de agrupar. Así una cantidad inválida no puede
  -- quedar compensada por otra línea del mismo producto.
  for v_item in
    select item.producto, item.cantidad
    from jsonb_to_recordset(p_items) as item(producto uuid, cantidad integer)
  loop
    if v_item.producto is null or v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'Cada línea debe incluir producto y una cantidad entera mayor que cero';
    end if;
  end loop;

  -- Agrupar productos repetidos del carrito evita líneas duplicadas y hace
  -- que toda la validación de stock use la cantidad real solicitada.
  for v_item in
    select item.producto, sum(item.cantidad)::integer as cantidad
    from jsonb_to_recordset(p_items) as item(producto uuid, cantidad integer)
    group by item.producto
    order by item.producto
  loop
    if v_item.producto is null or v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'Cada línea debe incluir producto y una cantidad mayor que cero';
    end if;

    -- Este bloqueo se mantiene hasta terminar la transacción RPC.
    select * into v_producto
      from public.productos
      where id = v_item.producto and estado = 'activo'
      for update;
    if not found then
      raise exception 'Uno de los productos no está disponible';
    end if;

    select coalesce(max(ocupacion_diaria.cantidad), 0)::integer
      into v_cantidad_reservada
      from generate_series(
        p_fecha_inicio,
        p_fecha_devolucion,
        interval '1 day'
      ) as dia(fecha)
      left join lateral (
        select coalesce(sum(dr.cantidad), 0)::integer as cantidad
        from public.detalles_reserva dr
        join public.reservas r on r.id = dr.reserva
        where dr.producto = v_item.producto
          and r.estado in ('confirmada', 'en_preparacion', 'en_alquiler')
          and r.fecha_inicio <= dia.fecha::date
          and r.fecha_devolucion >= dia.fecha::date
      ) as ocupacion_diaria on true;

    if v_cantidad_reservada + v_item.cantidad > v_producto.stock_total then
      raise exception 'La cantidad solicitada supera el stock disponible para el periodo';
    end if;

    v_importe_unitario := public.calcular_importe_alquiler(
      v_producto.precio_fin_de_semana,
      v_producto.precio_mensual,
      v_producto.precio_dia_adicional,
      v_dias,
      p_modalidad_alquiler
    );
    v_importe_total := v_importe_total + (v_importe_unitario * v_item.cantidad);
  end loop;

  insert into public.reservas (cliente, fecha_inicio, fecha_devolucion, modalidad_alquiler, modalidad_entrega, direccion_entrega, importe_total, estado)
  values (auth.uid(), p_fecha_inicio, p_fecha_devolucion, p_modalidad_alquiler, p_modalidad_entrega, nullif(trim(p_direccion_entrega), ''), v_importe_total, 'pendiente')
  returning * into v_reserva;

  for v_item in
    select item.producto, sum(item.cantidad)::integer as cantidad
    from jsonb_to_recordset(p_items) as item(producto uuid, cantidad integer)
    group by item.producto
    order by item.producto
  loop
    select * into v_producto from public.productos where id = v_item.producto;
    v_importe_unitario := public.calcular_importe_alquiler(
      v_producto.precio_fin_de_semana,
      v_producto.precio_mensual,
      v_producto.precio_dia_adicional,
      v_dias,
      p_modalidad_alquiler
    );
    insert into public.detalles_reserva (reserva, producto, cantidad, precio_aplicado)
    values (v_reserva.id, v_item.producto, v_item.cantidad, v_importe_unitario);
  end loop;

  return v_reserva;
end;
$$;

-- Mantiene stock_disponible como resumen operativo del día actual. Las
-- reservas futuras no se descuentan de este campo; para cualquier periodo
-- solicitado se debe usar obtener_disponibilidad_producto().
create or replace function public.recalcular_stock_producto(p_producto uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.productos p
  set stock_disponible = greatest(
    p.stock_total - coalesce((
      select sum(dr.cantidad)::integer
      from public.detalles_reserva dr
      join public.reservas r on r.id = dr.reserva
      where dr.producto = p.id
        and r.estado in ('confirmada', 'en_preparacion', 'en_alquiler')
        and r.fecha_inicio <= current_date
        and r.fecha_devolucion >= current_date
    ), 0),
    0
  )
  where p.id = p_producto;
end;
$$;

create or replace function public.recalcular_stock_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_producto uuid;
begin
  -- En DELETE los detalles se eliminan por la FK ON DELETE CASCADE y su
  -- propio trigger recalcula cada producto. No se consulta NEW ni se depende
  -- de que los detalles hijos sigan visibles en este punto.
  if tg_op = 'DELETE' then
    return old;
  end if;

  for v_producto in select distinct producto from public.detalles_reserva where reserva = new.id loop
    perform public.recalcular_stock_producto(v_producto);
  end loop;
  return new;
end;
$$;

create or replace function public.recalcular_stock_detalle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reserva uuid;
  v_producto uuid;
begin
  if tg_op = 'DELETE' then
    v_reserva := old.reserva;
    v_producto := old.producto;
  elsif tg_op = 'INSERT' then
    v_reserva := new.reserva;
    v_producto := new.producto;
  else
    v_reserva := new.reserva;
    v_producto := new.producto;
  end if;

  -- INSERT y UPDATE validan el detalle completo cuando la reserva ya
  -- compromete inventario. DELETE solo libera unidades, por lo que no debe
  -- leer NEW ni volver a validar una fila que ya fue eliminada.
  if tg_op <> 'DELETE' and exists (
    select 1
    from public.reservas
    where id = v_reserva
      and estado in ('confirmada', 'en_preparacion', 'en_alquiler')
  ) then
    perform public.validar_disponibilidad_reserva(
      v_reserva,
      (select fecha_inicio from public.reservas where id = v_reserva),
      (select fecha_devolucion from public.reservas where id = v_reserva)
    );
  end if;
  perform public.recalcular_stock_producto(v_producto);
  if tg_op = 'UPDATE'
    and (new.producto is distinct from old.producto or new.reserva is distinct from old.reserva) then
    perform public.recalcular_stock_producto(old.producto);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'recalcular_stock_reserva_trigger'
      and tgrelid = 'public.reservas'::regclass
  ) then
    create trigger recalcular_stock_reserva_trigger
      after insert or update or delete on public.reservas
      for each row execute function public.recalcular_stock_reserva();
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'recalcular_stock_detalle_trigger'
      and tgrelid = 'public.detalles_reserva'::regclass
  ) then
    create trigger recalcular_stock_detalle_trigger
      after insert or update or delete on public.detalles_reserva
      for each row execute function public.recalcular_stock_detalle();
  end if;
end;
$$;

-- ============================================================
-- 5. RLS Y POLÍTICAS
-- ============================================================

alter table public.perfiles enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.reservas enable row level security;
alter table public.detalles_reserva enable row level security;
alter table public.movimientos_inventario enable row level security;

-- Perfiles: propios para clientes; consulta operativa para empleados;
-- administración total únicamente para administradores.
drop policy if exists perfiles_consultar_propios_o_operativos on public.perfiles;
create policy perfiles_consultar_propios_o_operativos
  on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_empleado());

drop policy if exists perfiles_crear_cliente_propio on public.perfiles;
create policy perfiles_crear_cliente_propio
  on public.perfiles for insert to authenticated
  with check (id = auth.uid() and rol = 'cliente');

drop policy if exists perfiles_actualizar_datos_propios on public.perfiles;
create policy perfiles_actualizar_datos_propios
  on public.perfiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists perfiles_administracion_total on public.perfiles;
create policy perfiles_administracion_total
  on public.perfiles for all to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- Catálogo público: solo activos para visitantes y clientes. Se separan las
-- políticas anon/authenticated para que el visitante no tenga que ejecutar
-- funciones privadas de roles.
drop policy if exists categorias_lectura_activas on public.categorias;
drop policy if exists categorias_lectura_publica on public.categorias;
create policy categorias_lectura_publica
  on public.categorias for select to anon
  using (estado = 'activa');

create policy categorias_lectura_activas
  on public.categorias for select to authenticated
  using (estado = 'activa' or public.es_empleado());

drop policy if exists categorias_administracion on public.categorias;
create policy categorias_administracion
  on public.categorias for all to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists productos_lectura_activos on public.productos;
drop policy if exists productos_lectura_publicos on public.productos;
create policy productos_lectura_publicos
  on public.productos for select to anon
  using (estado = 'activo');

create policy productos_lectura_activos
  on public.productos for select to authenticated
  using (estado = 'activo' or public.es_empleado());

drop policy if exists productos_operacion_empleados on public.productos;
create policy productos_operacion_empleados
  on public.productos for update to authenticated
  using (public.es_empleado())
  with check (public.es_empleado());

drop policy if exists productos_gestion_administracion on public.productos;
create policy productos_gestion_administracion
  on public.productos for all to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- Los clientes no insertan reservas directamente: deben usar crear_reserva,
-- que calcula importes y valida stock dentro de una transacción.
drop policy if exists reservas_consultar_propias_o_operativas on public.reservas;
create policy reservas_consultar_propias_o_operativas
  on public.reservas for select to authenticated
  using (cliente = auth.uid() or public.es_empleado());

drop policy if exists reservas_crear_mediante_funcion on public.reservas;
create policy reservas_crear_mediante_funcion
  on public.reservas for insert to authenticated
  with check (false);

drop policy if exists reservas_operacion_empleados on public.reservas;
create policy reservas_operacion_empleados
  on public.reservas for update to authenticated
  using (public.es_empleado())
  with check (public.es_empleado());

drop policy if exists reservas_administracion on public.reservas;
create policy reservas_administracion
  on public.reservas for all to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- Los clientes tampoco pueden falsear precio_aplicado; los detalles se crean
-- dentro de crear_reserva con el precio leído de productos.
drop policy if exists detalles_consultar_propios_o_operativos on public.detalles_reserva;
create policy detalles_consultar_propios_o_operativos
  on public.detalles_reserva for select to authenticated
  using (exists (
    select 1 from public.reservas r
    where r.id = reserva and (r.cliente = auth.uid() or public.es_empleado())
  ));

drop policy if exists detalles_crear_mediante_funcion on public.detalles_reserva;
create policy detalles_crear_mediante_funcion
  on public.detalles_reserva for insert to authenticated
  with check (false);

drop policy if exists detalles_administracion on public.detalles_reserva;
create policy detalles_administracion
  on public.detalles_reserva for all to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- Los movimientos de inventario son internos y nunca se exponen a clientes.
drop policy if exists movimientos_operacion_empleados on public.movimientos_inventario;
create policy movimientos_operacion_empleados
  on public.movimientos_inventario for select to authenticated
  using (public.es_empleado());

drop policy if exists movimientos_insertar_operativos on public.movimientos_inventario;
create policy movimientos_insertar_operativos
  on public.movimientos_inventario for insert to authenticated
  with check (public.es_empleado());

drop policy if exists movimientos_administracion on public.movimientos_inventario;
create policy movimientos_administracion
  on public.movimientos_inventario for all to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- ============================================================
-- 6. PRIVILEGIOS DE TABLAS Y RLS
-- ============================================================

-- Los GRANT conceden únicamente el privilegio PostgreSQL necesario para que
-- la consulta llegue a RLS. Las políticas anteriores siguen siendo la
-- autorización efectiva por usuario y rol.
grant usage on schema public to anon, authenticated;

revoke all on table
  public.perfiles,
  public.categorias,
  public.productos,
  public.reservas,
  public.detalles_reserva,
  public.movimientos_inventario
from public, anon, authenticated;

grant select on table public.categorias, public.productos
  to anon;

grant select, insert, update, delete on table
  public.perfiles,
  public.categorias,
  public.productos,
  public.reservas,
  public.detalles_reserva,
  public.movimientos_inventario
  to authenticated;

-- ============================================================
-- 7. PERMISOS DE FUNCIONES
-- ============================================================

revoke all on function public.es_administrador() from public, anon, authenticated;
revoke all on function public.es_empleado() from public, anon, authenticated;
revoke all on function public.proteger_rol_perfil() from public, anon, authenticated;
revoke all on function public.crear_perfil_usuario_nuevo() from public, anon, authenticated;
revoke all on function public.proteger_cambios_producto_empleado() from public, anon, authenticated;
revoke all on function public.validar_disponibilidad_reserva(uuid, date, date) from public, anon, authenticated;
revoke all on function public.proteger_cambios_reserva_empleado() from public, anon, authenticated;
revoke all on function public.proteger_identificador_detalle_reserva() from public, anon, authenticated;
revoke all on function public.proteger_identificador_movimiento_inventario() from public, anon, authenticated;
revoke all on function public.validar_estado_reserva() from public, anon, authenticated;
revoke all on function public.actualizar_fecha_reserva() from public, anon, authenticated;
revoke all on function public.calcular_importe_alquiler(numeric, numeric, numeric, integer, text) from public, anon, authenticated;
revoke all on function public.obtener_disponibilidad_producto(uuid, date, date) from public, anon, authenticated;
revoke all on function public.crear_reserva(jsonb, date, date, text, text, text) from public, anon, authenticated;
revoke all on function public.recalcular_stock_producto(uuid) from public, anon, authenticated;
revoke all on function public.recalcular_stock_reserva() from public, anon, authenticated;
revoke all on function public.recalcular_stock_detalle() from public, anon, authenticated;

grant execute on function public.es_administrador() to authenticated;
grant execute on function public.es_empleado() to authenticated;
grant execute on function public.obtener_disponibilidad_producto(uuid, date, date) to anon, authenticated;
grant execute on function public.crear_reserva(jsonb, date, date, text, text, text) to authenticated;
