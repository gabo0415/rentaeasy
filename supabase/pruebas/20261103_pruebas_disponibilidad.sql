-- Rentaeasy · pruebas de disponibilidad, reservas y tarifas
--
-- Este archivo no forma parte de la migración y no se ha ejecutado.
-- Requiere al menos un perfil existente con rol = 'cliente'. Debe ejecutarse
-- en un entorno de pruebas con privilegios de servicio y dentro de una
-- transacción: todas las filas creadas aquí se revierten al final.
--
-- Las fechas de las reservas son inclusivas. Por eso una reserva que termina
-- el día D y otra que empieza el día D + 1 no comparten unidades.

begin;

do $$
begin
  if not exists (select 1 from public.perfiles where rol = 'cliente') then
    raise exception 'Se necesita un perfil de prueba con rol cliente';
  end if;
end;
$$;

-- Simula una sesión autenticada para que crear_reserva() use el cliente de
-- pruebas. En Supabase normalmente este valor lo proporciona el JWT.
select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.perfiles where rol = 'cliente' order by fecha_creacion limit 1),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select id::text from public.perfiles where rol = 'cliente' order by fecha_creacion limit 1)
  )::text,
  true
);

do $$
declare
  v_categoria uuid;
  v_producto_1 uuid;
  v_producto_2 uuid;
  v_reserva_a public.reservas;
  v_reserva_b public.reservas;
  v_reserva_pendiente public.reservas;
  v_inicio date := current_date + 10;
  v_detalles integer;
  v_comprometidas integer;
  v_disponibles integer;
  v_importe numeric(12, 2);
begin
  insert into public.categorias (nombre, descripcion, estado)
  values ('__PRUEBA disponibilidad 20261103', 'Datos temporales de pruebas', 'activa')
  returning id into v_categoria;

  insert into public.productos (
    categoria,
    nombre,
    precio_fin_de_semana,
    precio_mensual,
    precio_dia_adicional,
    stock_total,
    stock_disponible,
    estado
  )
  values (
    v_categoria,
    '__PRUEBA producto 1 20261103',
    30,
    100,
    5,
    1,
    1,
    'activo'
  )
  returning id into v_producto_1;

  insert into public.productos (
    categoria,
    nombre,
    precio_fin_de_semana,
    precio_mensual,
    precio_dia_adicional,
    stock_total,
    stock_disponible,
    estado
  )
  values (
    v_categoria,
    '__PRUEBA producto 2 20261103',
    40,
    200,
    10,
    1,
    1,
    'activo'
  )
  returning id into v_producto_2;

  -- 1. Dos reservas consecutivas: se confirman ambas con stock físico = 1.
  select * into v_reserva_a
  from public.crear_reserva(
    jsonb_build_array(jsonb_build_object('producto', v_producto_1, 'cantidad', 1)),
    v_inicio,
    v_inicio + 2,
    'fin_de_semana',
    'tienda',
    null::text
  );
  update public.reservas set estado = 'confirmada' where id = v_reserva_a.id;

  select * into v_reserva_b
  from public.crear_reserva(
    jsonb_build_array(jsonb_build_object('producto', v_producto_1, 'cantidad', 1)),
    v_inicio + 3,
    v_inicio + 5,
    'fin_de_semana',
    'tienda',
    null::text
  );
  update public.reservas set estado = 'confirmada' where id = v_reserva_b.id;

  select unidades_comprometidas, unidades_disponibles
    into v_comprometidas, v_disponibles
  from public.obtener_disponibilidad_producto(v_producto_1, v_inicio, v_inicio + 5);
  if v_comprometidas <> 1 or v_disponibles <> 0 then
    raise exception 'La disponibilidad no devolvió la ocupación máxima diaria';
  end if;

  -- 2. Una reserva simultánea puede quedar pendiente, pero no puede
  -- confirmarse porque supera el máximo diario del stock físico.
  select * into v_reserva_pendiente
  from public.crear_reserva(
    jsonb_build_array(jsonb_build_object('producto', v_producto_1, 'cantidad', 1)),
    v_inicio + 1,
    v_inicio + 3,
    'fin_de_semana',
    'tienda',
    null::text
  );

  begin
    update public.reservas
    set estado = 'confirmada'
    where id = v_reserva_pendiente.id;
    raise exception 'La reserva simultánea se confirmó incorrectamente';
  exception when others then
    if sqlerrm not like 'No hay stock suficiente%' then
      raise;
    end if;
  end;

  -- 3. Un carrito con varios productos genera una única reserva y dos líneas.
  select * into v_reserva_pendiente
  from public.crear_reserva(
    jsonb_build_array(
      jsonb_build_object('producto', v_producto_1, 'cantidad', 1),
      jsonb_build_object('producto', v_producto_2, 'cantidad', 1)
    ),
    v_inicio + 20,
    v_inicio + 20,
    'mensual',
    'tienda',
    null::text
  );
  select count(*) into v_detalles
  from public.detalles_reserva
  where reserva = v_reserva_pendiente.id;
  if v_detalles <> 2 then
    raise exception 'El carrito no creó dos detalles de reserva';
  end if;

  -- 4. Un carrito nulo o vacío debe rechazarse antes de insertar una reserva.
  begin
    perform public.crear_reserva(
      null::jsonb,
      v_inicio + 30,
      v_inicio + 30,
      'mensual',
      'tienda',
      null::text
    );
    raise exception 'La reserva con carrito nulo se aceptó incorrectamente';
  exception when others then
    if sqlerrm not like 'La reserva debe contener al menos un producto%' then
      raise;
    end if;
  end;

  begin
    perform public.crear_reserva(
      '[]'::jsonb,
      v_inicio + 30,
      v_inicio + 30,
      'mensual',
      'tienda',
      null::text
    );
    raise exception 'La reserva vacía se aceptó incorrectamente';
  exception when others then
    if sqlerrm not like 'La reserva debe contener al menos un producto%' then
      raise;
    end if;
  end;

  begin
    perform public.crear_reserva(
      jsonb_build_array(jsonb_build_object('producto', v_producto_1, 'cantidad', 0)),
      v_inicio + 30,
      v_inicio + 30,
      'mensual',
      'tienda',
      null::text
    );
    raise exception 'La cantidad cero se aceptó incorrectamente';
  exception when others then
    if sqlerrm not like 'Cada línea debe incluir producto y una cantidad entera mayor que cero%' then
      raise;
    end if;
  end;

  -- 5. Treinta días = una mensualidad.
  v_importe := public.calcular_importe_alquiler(30, 100, 5, 30, 'mensual');
  if v_importe <> 100 then
    raise exception 'El importe de 30 días no es correcto: %', v_importe;
  end if;

  -- 6. Sesenta días = dos mensualidades, sin días adicionales.
  v_importe := public.calcular_importe_alquiler(30, 100, 5, 60, 'varios_meses');
  if v_importe <> 200 then
    raise exception 'El importe de 60 días no es correcto: %', v_importe;
  end if;

  -- 7. Una reserva pendiente no compromete stock; al confirmarla sí lo hace.
  select * into v_reserva_pendiente
  from public.crear_reserva(
    jsonb_build_array(jsonb_build_object('producto', v_producto_2, 'cantidad', 1)),
    v_inicio + 40,
    v_inicio + 40,
    'fin_de_semana',
    'tienda',
    null::text
  );

  select unidades_comprometidas, unidades_disponibles
    into v_comprometidas, v_disponibles
  from public.obtener_disponibilidad_producto(
    v_producto_2,
    v_inicio + 40,
    v_inicio + 40
  );
  if v_comprometidas <> 0 or v_disponibles <> 1 then
    raise exception 'La reserva pendiente comprometió stock incorrectamente';
  end if;

  update public.reservas
  set estado = 'confirmada'
  where id = v_reserva_pendiente.id;

  select unidades_comprometidas, unidades_disponibles
    into v_comprometidas, v_disponibles
  from public.obtener_disponibilidad_producto(
    v_producto_2,
    v_inicio + 40,
    v_inicio + 40
  );
  if v_comprometidas <> 1 or v_disponibles <> 0 then
    raise exception 'La reserva confirmada no comprometió stock correctamente';
  end if;

  raise notice 'OK: pasaron los 7 casos de disponibilidad, carrito y tarifas';
end;
$$;

-- No conserva datos ni cambios de las pruebas.
rollback;
