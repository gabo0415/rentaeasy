-- Consultas duraderas: los visitantes solo pueden insertar el contenido;
-- únicamente el equipo puede leer y marcar una consulta como atendida.
create table public.mensajes_contacto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 2 and 120),
  correo text not null check (char_length(correo) <= 254 and correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  asunto text not null check (asunto in ('Consulta sobre un producto','Ayuda con una reserva','Entrega o devolución','Otra consulta')),
  mensaje text not null check (char_length(trim(mensaje)) between 10 and 5000),
  fecha_creacion timestamptz not null default now(),
  atendido boolean not null default false
);
alter table public.mensajes_contacto enable row level security;
revoke all on public.mensajes_contacto from anon, authenticated;
grant insert (nombre, correo, asunto, mensaje) on public.mensajes_contacto to anon, authenticated;
grant select on public.mensajes_contacto to authenticated;
grant update (atendido) on public.mensajes_contacto to authenticated;
create policy contacto_recibir on public.mensajes_contacto for insert to anon, authenticated with check (not atendido);
create policy contacto_equipo_lectura on public.mensajes_contacto for select to authenticated using ((select public.es_empleado()));
create policy contacto_equipo_atender on public.mensajes_contacto for update to authenticated
  using ((select public.es_empleado())) with check ((select public.es_empleado()));
create index mensajes_contacto_fecha_idx on public.mensajes_contacto (fecha_creacion desc);
