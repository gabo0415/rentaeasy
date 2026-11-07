# Rentaeasy

Plataforma de alquiler flexible de tecnología y pequeños electrodomésticos premium.

## Estructura

- `frontend`: aplicación React, TypeScript, Vite y Tailwind CSS.
- `backend`: API Express preparada para conectar con PostgreSQL mediante Supabase.
- Los productos actuales se sirven desde `frontend/src/datos` como demostración. La capa `servicios` permite sustituir esta fuente por la API sin rehacer la interfaz.
- El catálogo provisional contiene 3 categorías y 17 productos. Precios, stock y características concretas están pendientes de confirmación y aparecen marcados como provisionales. Las imágenes actuales son packshots vectoriales temporales; no son fotografías oficiales del fabricante.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.

## Desarrollo local

```bash
npm install
npm run desarrollo
```

La aplicación estará disponible en `http://localhost:5173`.

Para iniciar la API de demostración en otra terminal:

```bash
npm run servidor
```

## Variables de entorno

Copia los archivos `.env.example` de `frontend` y `backend` como `.env` cuando se configure la API y Supabase. No se incluyen credenciales en el repositorio.

## Próximas integraciones

La validación definitiva de disponibilidad, precios y reservas debe realizarse en el backend. La interfaz de catálogo y reservas sigue usando datos de demostración identificados como tales.

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

