# Verificación de Rentaeasy

Fecha: 17 de noviembre de 2026.

## Comprobaciones completadas

| Capa | Resultado | Evidencia |
| --- | --- | --- |
| Pruebas de API y dominio | 12 pruebas aprobadas | `npm test`: sesiones, permisos, validación, RPC con JWT, precios e inventario futuro |
| Frontend | Compilación TypeScript y Vite | `npm run construir` |
| Backend | Compilación TypeScript | `npm run construir --workspace backend` |
| PostgreSQL real | Prueba transaccional aprobada | `tests/integracion.sql`, ejecutado con `ROLLBACK` |
| Catálogo en navegador | 17 productos y búsqueda de cafeteras | Datos cargados desde Supabase, búsqueda devuelve un producto |
| Reserva sin sesión | Redirige a inicio de sesión | La URL conserva el destino de reserva |
| Contacto en navegador | Consulta registrada y confirmada en PostgreSQL | `verificacion/contacto.jpg`; cuenta de prueba `qa-rentaeasy-20261117@example.invalid` |
| Móvil | Catálogo y navegación comprobados a 390 × 844 | `verificacion/catalogo-movil.jpg` |

La consulta de prueba del navegador se marcó atendida. Las cuentas, producto y reservas de las pruebas SQL se revirtieron; no se modificaron reservas de clientes.

## Alcance

Las pruebas HTTP aíslan Supabase con respuestas controladas y comprueban que las rutas reenvían la sesión y llaman a las RPC correctas. La prueba SQL comprueba de forma independiente las políticas RLS, triggers y persistencia reales. No se inició sesión con contraseñas de usuarios reales ni se probó correo SMTP extremo a extremo. No se verificó un despliegue de producción.

## Revisión de seguridad de Supabase

La nueva tabla de contacto tiene RLS y no permite SELECT a visitantes. Las pruebas confirmaron el aislamiento entre clientes y que empleados no pueden cambiar tarifas ni elevar su rol.

El asesor conserva avisos del esquema anterior: funciones `SECURITY DEFINER` destinadas a RPC de reservas, disponibilidad y comprobación de rol; función de evento `rls_auto_enable`; copia de respaldo sin políticas (cerrada por RLS); protección de contraseñas filtradas desactivada. No se cambiaron estas configuraciones en esta entrega.

Referencias: [funciones privilegiadas públicas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Operación comercial

Los datos de contacto y tarifas iniciales deben ser validados por el responsable. No hay pasarela de pago ni facturación automática. El formulario registra consultas; el equipo responde desde su cliente de correo. Las páginas informativas no son contratos ni una certificación de cumplimiento legal.
