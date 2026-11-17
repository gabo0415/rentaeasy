-- Ejecutar con execute_sql o psql como propietario de la base de datos.
-- Todas las filas y cambios de esta prueba se revierten, incluso al fallar.
begin;
do $$
declare
  v_admin uuid;
  v_cliente uuid := gen_random_uuid();
  v_otro uuid := gen_random_uuid();
  v_empleado uuid := gen_random_uuid();
  v_producto uuid := gen_random_uuid();
  v_categoria uuid;
  v_reserva public.reservas;
  v_segunda public.reservas;
  v_denegado boolean;
  v_cantidad integer;
begin
  select id into v_admin from public.perfiles where rol = 'administrador' limit 1;
  select id into v_categoria from public.categorias limit 1;
  if v_admin is null or v_categoria is null then raise exception 'Se requiere una cuenta de administrador y una categoría.'; end if;
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_cliente, v_cliente || '@example.invalid', '{"nombres":"Prueba","apellidos":"Cliente"}'),
    (v_otro, v_otro || '@example.invalid', '{"nombres":"Prueba","apellidos":"Otro"}'),
    (v_empleado, v_empleado || '@example.invalid', '{"nombres":"Prueba","apellidos":"Empleado"}');
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  update public.perfiles set rol = 'empleado' where id = v_empleado;
  insert into public.productos (id,categoria,nombre,precio_fin_de_semana,precio_mensual,precio_dia_adicional,stock_total,stock_disponible)
    values (v_producto,v_categoria,'Producto de verificación transaccional',29,59,3,1,1);

  -- Visitantes: pueden enviar; no pueden consultar ni marcar atendida.
  perform set_config('role','anon',true);
  insert into public.mensajes_contacto (nombre,correo,asunto,mensaje)
    values ('Prueba','verificacion@example.invalid','Otra consulta','Consulta de verificación que será revertida.');
  v_denegado := false;
  begin perform 1 from public.mensajes_contacto; exception when insufficient_privilege then v_denegado := true; end;
  if not v_denegado then raise exception 'Un visitante pudo leer consultas privadas.'; end if;

  -- Cliente: precio calculado en servidor y reserva visible solo a su titular.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claim.sub',v_cliente::text,true);
  select * into v_reserva from public.crear_reserva(jsonb_build_array(jsonb_build_object('producto',v_producto,'cantidad',1)),current_date,current_date+2,'fin_de_semana','tienda',null);
  if v_reserva.importe_total <> 29 or v_reserva.estado <> 'pendiente' then raise exception 'Precio o estado inicial incorrectos.'; end if;
  select * into v_segunda from public.crear_reserva(jsonb_build_array(jsonb_build_object('producto',v_producto,'cantidad',1)),current_date,current_date+2,'fin_de_semana','tienda',null);
  select count(*) into v_cantidad from public.mensajes_contacto where correo='verificacion@example.invalid';
  if v_cantidad <> 0 then raise exception 'Un cliente pudo leer consultas internas.'; end if;
  update public.reservas set estado='confirmada' where id=v_reserva.id;
  get diagnostics v_cantidad = row_count;
  if v_cantidad <> 0 then raise exception 'Un cliente pudo confirmar su propia reserva.'; end if;
  perform set_config('request.jwt.claim.sub',v_otro::text,true);
  select count(*) into v_cantidad from public.reservas where id=v_reserva.id;
  if v_cantidad <> 0 then raise exception 'Un cliente pudo ver la reserva de otro.'; end if;

  -- Empleado: puede gestionar; no puede alterar precio ni escalar su rol.
  perform set_config('request.jwt.claim.sub',v_empleado::text,true);
  select count(*) into v_cantidad from public.reservas where id=v_reserva.id;
  if v_cantidad <> 1 then raise exception 'El empleado no puede leer la reserva real.'; end if;
  v_denegado := false;
  begin update public.productos set precio_mensual=0 where id=v_producto; exception when others then v_denegado := true; end;
  if not v_denegado then raise exception 'Un empleado pudo cambiar tarifas.'; end if;
  v_denegado := false;
  begin update public.perfiles set rol='administrador' where id=v_empleado; exception when others then v_denegado := true; end;
  if not v_denegado then raise exception 'Un empleado pudo escalar su rol.'; end if;
  update public.reservas set estado='confirmada' where id=v_reserva.id;
  select stock_disponible into v_cantidad from public.productos where id=v_producto;
  if v_cantidad <> 0 then raise exception 'Confirmar no descontó la disponibilidad de hoy.'; end if;
  v_denegado := false;
  begin update public.reservas set estado='confirmada' where id=v_segunda.id; exception when others then v_denegado := true; end;
  if not v_denegado then raise exception 'Se permitió confirmar más reservas que existencias.'; end if;
  v_denegado := false;
  begin update public.reservas set estado='finalizada' where id=v_reserva.id; exception when others then v_denegado := true; end;
  if not v_denegado then raise exception 'Se permitió saltar directamente a devolución.'; end if;
  update public.reservas set estado='en_preparacion' where id=v_reserva.id;
  update public.reservas set estado='en_alquiler' where id=v_reserva.id;
  update public.reservas set estado='finalizada' where id=v_reserva.id;
  select stock_disponible into v_cantidad from public.productos where id=v_producto;
  if v_cantidad <> 1 then raise exception 'La devolución no liberó las existencias.'; end if;
  update public.reservas set estado='cancelada' where id=v_segunda.id;
  update public.productos set estado='mantenimiento' where id=v_producto;
  update public.productos set estado='activo' where id=v_producto;
  update public.mensajes_contacto set atendido=true where correo='verificacion@example.invalid';
  get diagnostics v_cantidad = row_count;
  if v_cantidad < 1 then raise exception 'El equipo no pudo gestionar la consulta.'; end if;
  perform set_config('role','postgres',true);
  if public.calcular_importe_alquiler(29,59,3,31,'mensual') <> 62 or public.calcular_importe_alquiler(29,59,3,60,'varios_meses') <> 118 then raise exception 'Reglas de precio inesperadas.'; end if;
end;
$$;
rollback;
select 'OK: contacto privado, aislamiento de clientes, permisos de empleado, reserva, stock, devolución y tarifas; cambios revertidos.' as resultado;
