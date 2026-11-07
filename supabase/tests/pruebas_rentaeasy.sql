-- Rentaeasy · suite de pruebas SQL
--
-- NO ejecutar en producción ni contra una base de datos con datos reales.
-- Este archivo no se ha ejecutado en Supabase.
--
-- Requisitos:
-- * aplicar previamente la migración de Rentaeasy;
-- * ejecutar como postgres o como un rol de pruebas con permiso para cambiar
--   temporalmente a anon y authenticated;
-- * disponer de los roles PostgreSQL anon y authenticated de Supabase.
--
-- Se crean usuarios de prueba directamente en auth.users para probar el
-- trigger de creación automática de perfiles. Todos los cambios terminan en
-- ROLLBACK. La autenticación real por email debe probarse mediante Auth, no
-- mediante esta inserción interna.

begin;

set local role postgres;

create temporary table rentaeasy_test_context (
  cliente uuid not null,
  empleado uuid not null,
  administrador uuid not null,
  categoria_activa uuid not null,
  categoria_inactiva uuid not null,
  producto_1 uuid not null,
  producto_2 uuid not null,
  reserva_privada uuid not null,
  movimiento_inventario uuid not null,
  reserva_fin_de_semana uuid,
  reserva_mensual uuid,
  reserva_consecutiva uuid,
  reserva_superpuesta uuid,
  reserva_carrito uuid,
  detalle_reserva uuid
) on commit drop;

-- La tabla temporal pertenece a postgres. authenticated necesita consultar los
-- identificadores y actualizar las columnas de reservas; anon no consulta el
-- contexto, porque sus pruebas solo leen el catálogo público. No se conceden
-- permisos INSERT, DELETE ni permisos sobre tablas reales.
revoke all on table rentaeasy_test_context from public, anon, authenticated;
grant select (
  cliente,
  empleado,
  administrador,
  categoria_activa,
  categoria_inactiva,
  producto_1,
  producto_2,
  reserva_privada,
  movimiento_inventario,
  reserva_fin_de_semana,
  reserva_mensual,
  reserva_consecutiva,
  reserva_superpuesta,
  reserva_carrito,
  detalle_reserva
) on table rentaeasy_test_context to authenticated;
grant update (
  reserva_fin_de_semana,
  reserva_mensual,
  reserva_consecutiva,
  reserva_superpuesta,
  reserva_carrito,
  detalle_reserva
) on table rentaeasy_test_context to authenticated;

-- El esquema temporal solo es accesible por su propietario. Se concede USAGE
-- exclusivamente a authenticated; anon sigue sin acceso, y la suite lo
-- comprueba en el bloque de lectura pública del catálogo.
do $$
declare
  v_esquema_temporal text;
begin
  select nspname into v_esquema_temporal
  from pg_namespace
  where oid = pg_my_temp_schema();

  execute format('grant usage on schema %I to authenticated', v_esquema_temporal);
end;
$$;

do $$
declare
  v_cliente uuid := gen_random_uuid();
  v_empleado uuid := gen_random_uuid();
  v_administrador uuid := gen_random_uuid();
  v_categoria_activa uuid;
  v_categoria_inactiva uuid;
  v_producto_1 uuid;
  v_producto_2 uuid;
  v_reserva_privada uuid;
  v_movimiento_inventario uuid;
  v_email_sufijo text := replace(gen_random_uuid()::text, '-', '');
begin
  -- 1. Registro temporal y creación automática del perfil.
  insert into auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    v_cliente,
    'test-cliente-' || v_email_sufijo || '@rentaeasy.invalid',
    'hash-temporal-no-valido',
    timezone('utc', now()),
    '{"nombres":"Cliente", "apellidos":"Prueba"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

  insert into auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    v_empleado,
    'test-empleado-' || v_email_sufijo || '@rentaeasy.invalid',
    'hash-temporal-no-valido',
    timezone('utc', now()),
    '{"nombres":"Empleado", "apellidos":"Prueba"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

  insert into auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    v_administrador,
    'test-admin-' || v_email_sufijo || '@rentaeasy.invalid',
    'hash-temporal-no-valido',
    timezone('utc', now()),
    '{"nombres":"Administrador", "apellidos":"Prueba"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

  if not exists (
    select 1 from public.perfiles
    where id = v_cliente and nombres = 'Cliente' and rol = 'cliente'
  ) then
    raise exception 'No se creó automáticamente el perfil del cliente';
  end if;

  if not exists (
    select 1 from public.perfiles
    where id = v_empleado and nombres = 'Empleado' and rol = 'cliente'
  ) then
    raise exception 'No se creó automáticamente el perfil del empleado';
  end if;

  if not exists (
    select 1 from public.perfiles
    where id = v_administrador and nombres = 'Administrador' and rol = 'cliente'
  ) then
    raise exception 'No se creó automáticamente el perfil del administrador';
  end if;

  -- La migración protege las elevaciones de rol. Esta preparación de fixtures
  -- usa el rol postgres y desactiva solo ese trigger durante la transacción.
  alter table public.perfiles disable trigger proteger_rol_perfil_trigger;
  update public.perfiles set rol = 'empleado' where id = v_empleado;
  update public.perfiles set rol = 'administrador' where id = v_administrador;
  alter table public.perfiles enable trigger proteger_rol_perfil_trigger;

  insert into public.categorias (nombre, descripcion, estado)
  values (
    '__TEST categoría activa Rentaeasy',
    'Fixture temporal',
    'activa'
  ) returning id into v_categoria_activa;

  insert into public.categorias (nombre, descripcion, estado)
  values (
    '__TEST categoría inactiva Rentaeasy',
    'Fixture temporal',
    'inactiva'
  ) returning id into v_categoria_inactiva;

  insert into public.productos (
    categoria,
    nombre,
    precio_fin_de_semana,
    precio_mensual,
    precio_dia_adicional,
    stock_total,
    stock_disponible,
    estado
  ) values (
    v_categoria_activa,
    '__TEST producto 1 Rentaeasy',
    30,
    100,
    5,
    1,
    1,
    'activo'
  ) returning id into v_producto_1;

  insert into public.productos (
    categoria,
    nombre,
    precio_fin_de_semana,
    precio_mensual,
    precio_dia_adicional,
    stock_total,
    stock_disponible,
    estado
  ) values (
    v_categoria_activa,
    '__TEST producto 2 Rentaeasy',
    40,
    200,
    10,
    2,
    2,
    'activo'
  ) returning id into v_producto_2;

  insert into public.productos (
    categoria,
    nombre,
    precio_fin_de_semana,
    precio_mensual,
    precio_dia_adicional,
    stock_total,
    stock_disponible,
    estado
  ) values (
    v_categoria_inactiva,
    '__TEST producto inactivo Rentaeasy',
    10,
    50,
    2,
    1,
    1,
    'inactivo'
  );

  -- Reserva ajena para comprobar que un cliente no puede verla.
  insert into public.reservas (
    cliente,
    fecha_inicio,
    fecha_devolucion,
    modalidad_alquiler,
    modalidad_entrega,
    importe_total,
    estado
  ) values (
    v_empleado,
    current_date + 200,
    current_date + 200,
    'mensual',
    'tienda',
    0,
    'pendiente'
  ) returning id into v_reserva_privada;

  insert into public.movimientos_inventario (
    producto,
    reserva,
    tipo_movimiento,
    cantidad,
    observaciones
  ) values (
    v_producto_1,
    v_reserva_privada,
    'ajuste',
    1,
    'Fixture temporal de auditoría'
  ) returning id into v_movimiento_inventario;

  insert into rentaeasy_test_context (
    cliente,
    empleado,
    administrador,
    categoria_activa,
    categoria_inactiva,
    producto_1,
    producto_2,
    reserva_privada,
    movimiento_inventario
  ) values (
    v_cliente,
    v_empleado,
    v_administrador,
    v_categoria_activa,
    v_categoria_inactiva,
    v_producto_1,
    v_producto_2,
    v_reserva_privada,
    v_movimiento_inventario
  );
end;
$$;

-- 2. Lectura pública de categorías y productos activos.
set local role anon;

do $$
begin
  begin
    perform count(*) from rentaeasy_test_context;
    raise exception 'anon obtuvo acceso inesperado al contexto temporal';
  exception
    when insufficient_privilege then
      null;
    when undefined_table then
      null;
    when others then
      raise;
  end;

  if not exists (
    select 1 from public.categorias
    where nombre = '__TEST categoría activa Rentaeasy'
  ) then
    raise exception 'El catálogo público no muestra la categoría activa';
  end if;

  if exists (
    select 1 from public.categorias
    where nombre = '__TEST categoría inactiva Rentaeasy'
  ) then
    raise exception 'El catálogo público muestra una categoría inactiva';
  end if;

  if not exists (
    select 1 from public.productos
    where nombre = '__TEST producto 1 Rentaeasy'
  ) then
    raise exception 'El catálogo público no muestra el producto activo';
  end if;

  if exists (
    select 1 from public.productos
    where nombre = '__TEST producto inactivo Rentaeasy'
  ) then
    raise exception 'El catálogo público muestra un producto inactivo';
  end if;
end;
$$;

reset role;

-- 3 y 4. Creación de reservas y cálculo de precios.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select cliente::text from rentaeasy_test_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select cliente::text from rentaeasy_test_context)
  )::text,
  true
);

do $$
declare
  v_producto_1 uuid;
  v_producto_2 uuid;
  v_reserva_fin public.reservas;
  v_reserva_mensual public.reservas;
  v_reserva_varios_meses public.reservas;
  v_reserva_carrito public.reservas;
  v_detalles integer;
begin
  select producto_1, producto_2 into v_producto_1, v_producto_2
  from rentaeasy_test_context;

  -- Fin de semana inclusivo de tres días: precio fijo de fin de semana.
  select * into v_reserva_fin
  from public.crear_reserva(
    jsonb_build_array(jsonb_build_object('producto', v_producto_1, 'cantidad', 1)),
    current_date + 5,
    current_date + 7,
    'fin_de_semana',
    'tienda',
    null::text
  );
  if v_reserva_fin.importe_total <> 30 then
    raise exception 'Precio de fin de semana incorrecto: %', v_reserva_fin.importe_total;
  end if;

  -- Treinta días inclusivos: una mensualidad.
  select * into v_reserva_mensual
  from public.crear_reserva(
    jsonb_build_array(jsonb_build_object('producto', v_producto_2, 'cantidad', 1)),
    current_date + 20,
    current_date + 49,
    'mensual',
    'tienda',
    null::text
  );
  if v_reserva_mensual.importe_total <> 200 then
    raise exception 'Precio mensual de 30 días incorrecto: %', v_reserva_mensual.importe_total;
  end if;
  -- Sesenta días mediante la RPC pública: dos mensualidades.
  select * into v_reserva_varios_meses
  from public.crear_reserva(
    jsonb_build_array(jsonb_build_object('producto', v_producto_2, 'cantidad', 1)),
    current_date + 60,
    current_date + 119,
    'varios_meses',
    'tienda',
    null::text
  );
  if v_reserva_varios_meses.importe_total <> 400 then
    raise exception 'Precio de 60 días incorrecto: %', v_reserva_varios_meses.importe_total;
  end if;

  -- Carrito de dos productos y dos detalles.
  select * into v_reserva_carrito
  from public.crear_reserva(
    jsonb_build_array(
      jsonb_build_object('producto', v_producto_1, 'cantidad', 1),
      jsonb_build_object('producto', v_producto_2, 'cantidad', 1)
    ),
    current_date + 130,
    current_date + 130,
    'mensual',
    'tienda',
    null::text
  );
  select count(*) into v_detalles
  from public.detalles_reserva where reserva = v_reserva_carrito.id;
  if v_detalles <> 2 or v_reserva_carrito.importe_total <> 300 then
    raise exception 'El carrito no calculó correctamente sus líneas o importe';
  end if;

  -- El cliente no puede insertar reservas directamente.
  begin
    insert into public.reservas (
      cliente,
      fecha_inicio,
      fecha_devolucion,
      modalidad_alquiler,
      modalidad_entrega,
      importe_total,
      estado
    ) values (
      auth.uid(),
      current_date + 300,
      current_date + 300,
      'mensual',
      'tienda',
      1,
      'pendiente'
    );
    raise exception 'El cliente pudo insertar una reserva directamente';
  exception when others then
    if sqlerrm like 'El cliente pudo insertar%' then
      raise;
    end if;
  end;

  update rentaeasy_test_context
  set reserva_fin_de_semana = v_reserva_fin.id,
      reserva_mensual = v_reserva_mensual.id,
      reserva_carrito = v_reserva_carrito.id,
      detalle_reserva = (
        select id
        from public.detalles_reserva
        where reserva = v_reserva_carrito.id
        order by id
        limit 1
      );

  -- El cliente ve sus reservas, pero no la reserva ajena.
  if not exists (
    select 1 from public.reservas where id = v_reserva_fin.id
  ) then
    raise exception 'El cliente no puede leer su propia reserva';
  end if;
  if exists (
    select 1 from public.reservas
    where id = (select reserva_privada from rentaeasy_test_context)
  ) then
    raise exception 'El cliente puede leer una reserva ajena';
  end if;
end;
$$;

-- 5 y 6. Reservas consecutivas, solapadas y stock máximo diario.
-- crear_reserva() exige rol cliente, así que las solicitudes se crean con el
-- JWT del cliente y las confirmaciones se hacen después con el empleado.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select cliente::text from rentaeasy_test_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select cliente::text from rentaeasy_test_context)
  )::text,
  true
);

do $$
declare
  v_producto_1 uuid;
  v_reserva_consecutiva public.reservas;
  v_reserva_superpuesta public.reservas;
begin
  select producto_1 into v_producto_1 from rentaeasy_test_context;

  -- Una reserva que empieza al día siguiente de la primera.
  select * into v_reserva_consecutiva
  from public.crear_reserva(
    jsonb_build_array(jsonb_build_object('producto', v_producto_1, 'cantidad', 1)),
    current_date + 8,
    current_date + 10,
    'fin_de_semana',
    'tienda',
    null::text
  );

  -- La solicitud superpuesta puede quedar pendiente, pero no confirmarse.
  select * into v_reserva_superpuesta
  from public.crear_reserva(
    jsonb_build_array(jsonb_build_object('producto', v_producto_1, 'cantidad', 1)),
    current_date + 7,
    current_date + 9,
    'fin_de_semana',
    'tienda',
    null::text
  );

  update rentaeasy_test_context
  set reserva_consecutiva = v_reserva_consecutiva.id,
      reserva_superpuesta = v_reserva_superpuesta.id;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select empleado::text from rentaeasy_test_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select empleado::text from rentaeasy_test_context)
  )::text,
  true
);

do $$
declare
  v_producto_1 uuid;
  v_comprometidas integer;
  v_disponibles integer;
begin
  select producto_1 into v_producto_1 from rentaeasy_test_context;

  -- Confirma la primera reserva creada por el cliente.
  update public.reservas
  set estado = 'confirmada'
  where id = (select reserva_fin_de_semana from rentaeasy_test_context);

  -- Confirma la reserva consecutiva.
  update public.reservas
  set estado = 'confirmada'
  where id = (select reserva_consecutiva from rentaeasy_test_context);

  -- El máximo diario entre ambas reservas consecutivas sigue siendo uno.
  select unidades_comprometidas, unidades_disponibles
    into v_comprometidas, v_disponibles
  from public.obtener_disponibilidad_producto(
    v_producto_1,
    current_date + 5,
    current_date + 10
  );
  if v_comprometidas <> 1 or v_disponibles <> 0 then
    raise exception 'La ocupación consecutiva no se calculó por máximo diario';
  end if;

  -- La reserva superpuesta no puede confirmarse con stock físico = 1.
  begin
    update public.reservas
    set estado = 'confirmada'
    where id = (select reserva_superpuesta from rentaeasy_test_context);
    raise exception 'Se confirmó una reserva que supera el stock físico';
  exception when others then
    if sqlerrm not like 'No hay stock suficiente%' then
      raise;
    end if;
  end;
end;
$$;

-- 7. Transiciones permitidas y prohibidas.
do $$
begin
  -- Salto inválido: pendiente -> en_alquiler.
  begin
    update public.reservas
    set estado = 'en_alquiler'
    where id = (select reserva_carrito from rentaeasy_test_context);
    raise exception 'Se permitió saltar estados operativos';
  exception when others then
    if sqlerrm not like 'Transición de estado no permitida%' then
      raise;
    end if;
  end;

  -- Flujo permitido completo.
  update public.reservas
  set estado = 'confirmada'
  where id = (select reserva_carrito from rentaeasy_test_context);
  update public.reservas
  set estado = 'en_preparacion'
  where id = (select reserva_carrito from rentaeasy_test_context);
  update public.reservas
  set estado = 'en_alquiler'
  where id = (select reserva_carrito from rentaeasy_test_context);
  update public.reservas
  set estado = 'finalizada'
  where id = (select reserva_carrito from rentaeasy_test_context);

  -- Estado terminal: no se permite reabrir una reserva finalizada.
  begin
    update public.reservas
    set estado = 'confirmada'
    where id = (select reserva_carrito from rentaeasy_test_context);
    raise exception 'Se reabrió una reserva finalizada';
  exception when others then
    if sqlerrm not like 'La reserva en estado finalizada%' then
      raise;
    end if;
  end;
end;
$$;

-- 8. Permisos de empleados y administradores.
do $$
begin
  -- Un empleado no puede alterar importes ni convertirse en administrador.
  begin
    update public.reservas
    set importe_total = 0
    where id = (select reserva_fin_de_semana from rentaeasy_test_context);
    raise exception 'El empleado pudo modificar el importe';
  exception when others then
    if sqlerrm not like 'Un empleado solo puede actualizar%' then
      raise;
    end if;
  end;

  begin
    update public.productos
    set id = gen_random_uuid()
    where id = (select producto_1 from rentaeasy_test_context);
    raise exception 'El empleado pudo modificar el identificador del producto';
  exception when others then
    if sqlerrm not like 'El identificador y la fecha de creación del producto%' then
      raise;
    end if;
  end;

  begin
    update public.reservas
    set id = gen_random_uuid()
    where id = (select reserva_fin_de_semana from rentaeasy_test_context);
    raise exception 'El empleado pudo modificar el identificador de la reserva';
  exception when others then
    if sqlerrm not like 'El identificador, código y fecha de solicitud%' then
      raise;
    end if;
  end;

  begin
    update public.perfiles
    set id = gen_random_uuid()
    where id = (select empleado from rentaeasy_test_context);
    raise exception 'El empleado pudo modificar el identificador del perfil';
  exception when others then
    if sqlerrm not like 'El identificador y la fecha de creación del perfil%' then
      raise;
    end if;
  end;

  begin
    update public.perfiles
    set rol = 'administrador'
    where id = (select empleado from rentaeasy_test_context);
    raise exception 'El empleado pudo elevar su rol';
  exception when others then
    if sqlerrm not like 'Solo un administrador puede modificar roles%' then
      raise;
    end if;
  end;

  if not exists (
    select 1 from public.reservas
    where id = (select reserva_privada from rentaeasy_test_context)
  ) then
    raise exception 'El empleado no puede consultar reservas operativas';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select administrador::text from rentaeasy_test_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select administrador::text from rentaeasy_test_context)
  )::text,
  true
);

do $$
begin
  if not exists (
    select 1 from public.reservas
    where id = (select reserva_privada from rentaeasy_test_context)
  ) then
    raise exception 'El administrador no puede consultar todas las reservas';
  end if;

  begin
    update public.detalles_reserva
    set id = gen_random_uuid()
    where id = (select detalle_reserva from rentaeasy_test_context);
    raise exception 'El administrador pudo modificar el identificador del detalle';
  exception when others then
    if sqlerrm not like 'El identificador del detalle de reserva%' then
      raise;
    end if;
  end;

  begin
    update public.movimientos_inventario
    set id = gen_random_uuid()
    where id = (select movimiento_inventario from rentaeasy_test_context);
    raise exception 'El administrador pudo modificar el identificador del movimiento';
  exception when others then
    if sqlerrm not like 'El identificador y la fecha del movimiento%' then
      raise;
    end if;
  end;

  -- El administrador sí puede gestionar el catálogo y los roles.
  update public.productos
  set precio_mensual = precio_mensual + 1
  where id = (select producto_2 from rentaeasy_test_context);

  update public.perfiles
  set rol = 'administrador'
  where id = (select empleado from rentaeasy_test_context);

  update public.perfiles
  set rol = 'empleado'
  where id = (select empleado from rentaeasy_test_context);
end;
$$;

do $$
begin
  raise notice 'OK: finalizaron las pruebas de perfiles, catálogo, reservas, tarifas, stock, estados y permisos';
end;
$$;

-- Se revierte todo: usuarios, perfiles, catálogo, reservas y cambios de roles.
rollback;
