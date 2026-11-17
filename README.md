# Rentaeasy

Aplicación de solicitudes de alquiler con catálogo, cuenta de cliente y paneles de administración y operaciones.

## Funcionalidad

- Catálogo de 17 productos en tres categorías. Imágenes y presentación en el frontend; precios, estado y existencias en Supabase.
- Registro, confirmación por correo, inicio/cierre de sesión, recuperación de contraseña y edición del perfil.
- Reservas persistidas mediante `crear_reserva`: PostgreSQL calcula precios, valida fechas y protege la disponibilidad.
- Consulta de disponibilidad para las fechas seleccionadas, incluso si el producto está ocupado hoy.
- Administración y empleados comparten las mismas reservas. Flujo: pendiente → confirmada → en preparación → en alquiler → finalizada, con cancelación antes de la entrega.
- Inventario por producto: consulta de existencias y cambios de estado activo/inactivo/mantenimiento. No se simulan unidades físicas individuales.
- Contacto persistido y bandeja de consultas para el equipo en `/administracion/consultas` y `/empleados/consultas`.
- Información del alquiler, datos y sesión accesible desde el pie y el registro.

## Desarrollo

Requiere Node.js 22 o superior y npm 10 o superior.

```bash
npm ci
```

Copia `.env.example` a `.env` en la raíz y configura únicamente la URL y la clave **pública** de Supabase. Después:

```bash
npm run desarrollo
```

El frontend usa React, TypeScript, Vite y Tailwind. Vite lee el entorno de la raíz del monorepo.

La API Express es opcional para el flujo de tienda, que usa el cliente público y RLS de Supabase. Para ejecutarla, configura `backend/.env` siguiendo su ejemplo:

```bash
npm run servidor
```

La API consulta datos persistidos y reenvía el JWT del solicitante para mantener RLS. La creación de cuentas internas requiere una clave de servicio exclusivamente en el servidor. Las antiguas rutas de registro/inicio de sesión de demostración devuelven HTTP 410; utiliza Supabase Auth.

## Migraciones

Los archivos SQL de `supabase/migrations` contienen el esquema, catálogo y contacto. La migración `20261117155251_contacto_operativo.sql` ya se aplicó al proyecto conectado. No debe volver a aplicarse manualmente allí. En un proyecto nuevo, revisa y aplica las migraciones por orden; la migración del catálogo contiene un reemplazo deliberado del catálogo anterior.

Las consultas públicas de contacto tienen permiso de inserción solo para nombre, correo, asunto y mensaje. Su lectura y actualización están limitadas al equipo. El navegador nunca utiliza claves de servicio.

## Verificación

```bash
npm run verificar
```

Ejecuta las pruebas de API y reglas de precio, compila frontend y backend. GitHub Actions repite esta comprobación en pushes y pull requests sin credenciales reales.

`tests/integracion.sql` comprueba la base de datos con identidades sintéticas dentro de una transacción revertida: privacidad, permisos, stock, confirmación, preparación, entrega, devolución y cancelación. Debe ejecutarse como propietario sobre un proyecto de prueba que tenga una categoría y un administrador; no es parte de la compilación ni del CI público.

Evidencias y alcance de las pruebas: [docs/VERIFICACION.md](docs/VERIFICACION.md).

## Publicación y configuración comercial

La app es un sistema de **solicitudes**, sin cobros online. El equipo coordina entrega, posibles fianzas, pagos y condiciones definitivas. Los importes confirmados del panel no representan pagos cobrados.

Antes de operar comercialmente, el responsable debe validar tarifas, modelos y características, datos de contacto, condiciones comerciales y textos de privacidad. Las páginas informativas describen el funcionamiento implementado; no sustituyen documentación contractual validada por el negocio. Las tarifas iniciales de la base de datos proceden del catálogo provisional.

Para Vercel: raíz de proyecto `frontend`, construcción `npm run construir` y salida `dist`. Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en el entorno de construcción. `frontend/vercel.json` resuelve las rutas internas de la SPA. El backend se despliega por separado cuando se necesite la API administrativa. Configura también las URL de confirmación y recuperación en Supabase Auth.

## Autenticación con Supabase

La autenticación del frontend usa Supabase Auth (`@supabase/supabase-js`). No hay credenciales ni cuentas demo en `localStorage`.

### Requisitos previos

1. Aplicar la migración `supabase/migrations/20261103_estructura_inicial_rentaeasy.sql` en el SQL Editor. No elimina tablas ni datos: solo reemplaza políticas RLS y retira una firma antigua de función.
2. Configurar en el `.env` de la raíz:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (clave pública/anon; **nunca** `service_role`)
3. En Supabase Dashboard → Authentication → URL Configuration:
   - `Site URL`: `http://localhost:5173` (y el dominio de producción).
   - `Redirect URLs`: `http://localhost:5173/cuenta` y `http://localhost:5173/restablecer-contrasena` (más sus equivalentes de producción).
4. Configurar el proveedor de correo. Si «Confirm email» está activo (es la configuración actual del proyecto), el registro exige confirmar el correo antes de iniciar sesión. Para producción conviene configurar un servidor SMTP propio: el correo integrado de Supabase tiene límites de envío muy estrictos.
5. Recomendado: revisar en Authentication → Providers → Email la longitud mínima y la política de contraseñas. El frontend exige 8 caracteres con mayúscula, minúscula y número, pero la política del servidor es la que protege frente a clientes que llamen directamente a la API.

### Flujos implementados

- **Registro** (`/registro`): valida nombres, apellidos, correo, teléfono, contraseña segura y confirmación. Crea el usuario con `supabase.auth.signUp()` y guarda `nombres`, `apellidos` y `telefono` en los metadatos. El trigger `crear_perfil_usuario_nuevo` crea la fila en `public.perfiles` con `rol = 'cliente'`; el frontend completa el teléfono en el primer acceso.
- **Inicio de sesión** (`/iniciar-sesion`): `supabase.auth.signInWithPassword()`.
- **Sesión persistente**: el cliente de Supabase guarda la sesión y la renueva automáticamente. Al recargar se restaura antes de mostrar contenido privado.
- **Cierre de sesión**: disponible en `/cuenta` y en la barra de navegación.
- **Recuperación de contraseña**: enlace en el inicio de sesión → `resetPasswordForEmail()` → `/restablecer-contrasena`.
- **Cambio de contraseña**: en `/cuenta`, reautenticando con la contraseña actual.
- **Edición de datos personales**: actualiza `public.perfiles` (`nombres`, `apellidos`, `telefono`).

### Roles y protección de rutas

El rol se lee **siempre** de `public.perfiles`. Nunca se usa `localStorage` ni un rol enviado por el navegador.

- `cliente` → `/cuenta`
- `empleado` → `/empleados`
- `administrador` → `/administracion`

Mientras se comprueba la sesión se muestra una pantalla de carga y no se pinta contenido privado. Si el rol no autoriza el panel se muestra la pantalla de acceso denegado. Los visitantes no autenticados ven la pantalla de inicio de sesión requerido.

### Cuentas internas (empleados y administradores)

No existe registro público para roles internos. La creación se realiza desde el backend, que es el único que conoce la `service_role`:

`POST /api/administracion/cuentas-internas` con `Authorization: Bearer <access_token de un administrador>`.

El backend:

1. Verifica el token contra Supabase.
2. Lee el rol del solicitante en `public.perfiles` y exige `administrador`.
3. Crea el usuario con la API de administración (`service_role`, solo en el servidor).
4. Asigna el rol usando el token del administrador, de modo que RLS y el trigger `proteger_rol_perfil` validan el cambio.

Configura en `backend/.env` (nunca en el frontend):

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_CLAVE_SERVICIO=tu_clave_service_role
```

Ejemplo de petición:

```bash
curl -X POST http://localhost:4000/api/administracion/cuentas-internas \
  -H "Authorization: Bearer $ACCESS_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"nombres":"Equipo","apellidos":"Operaciones","correo":"equipo@rentaeasy.es","telefono":"+34 600 000 001","contrasena":"ContrasenaSegura1","rol":"empleado"}'
```

Un usuario no puede cambiar su propio rol: la política RLS y el trigger `proteger_rol_perfil_trigger` solo permiten el cambio cuando `public.es_administrador()` es verdadero para la sesión que lo solicita.

Para asignar o cambiar el rol de un perfil existente:

```bash
curl -X PATCH http://localhost:4000/api/administracion/cuentas-internas/<UUID_DEL_PERFIL> \
  -H "Authorization: Bearer $ACCESS_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"rol":"empleado"}'
```

### Cómo probar manualmente

1. `npm run construir` y `npm run desarrollo`.
2. Abre `/registro`, crea una cuenta de cliente y confirma el correo si está activado.
3. Inicia sesión: debe redirigir a `/cuenta`.
4. Recarga la página: la sesión debe mantenerse.
5. Cierra sesión: vuelve a la tienda y `/cuenta` debe mostrar el aviso de acceso.
6. Entra en `/administracion` con un cliente: debe aparecer la pantalla de acceso denegado.
7. Solicita la recuperación de contraseña y abre el enlace recibido en `/restablecer-contrasena`.
8. Intenta modificar tu `rol` con la API REST pública: debe fallar por RLS/trigger.

