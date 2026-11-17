export type TipoInformacion = 'condiciones' | 'privacidad' | 'cookies';

const CONTENIDO: Record<TipoInformacion, { titulo: string; apartados: { titulo: string; texto: string }[] }> = {
  condiciones: {
    titulo: 'Información del alquiler',
    apartados: [
      { titulo: 'Solicitud y confirmación', texto: 'La reserva online es una solicitud pendiente. El equipo comprueba el producto, el modelo y las fechas antes de confirmarla. Puedes consultar el estado desde Mi cuenta.' },
      { titulo: 'Precio y periodo', texto: 'El importe del alquiler se calcula con las tarifas del catálogo y las fechas seleccionadas. El fin de semana comprende hasta tres días. Las modalidades mensuales se calculan por bloques de 30 días y días adicionales. El importe definitivo aparece al registrar la solicitud.' },
      { titulo: 'Entrega, fianza y pago', texto: 'La recogida en tienda y la entrega a domicilio se coordinan con el equipo. El coste de entrega, cualquier fianza y las condiciones de pago se acuerdan antes de formalizar el alquiler. Esta página no procesa cobros online.' },
      { titulo: 'Cambios, cancelación y devolución', texto: 'Para solicitar una ampliación, cancelación o recogida, utiliza el formulario de contacto e indica el código de reserva. Las ampliaciones dependen de la disponibilidad. El equipo registra la entrega y la devolución y actualiza el estado visible en tu cuenta.' },
    ],
  },
  privacidad: {
    titulo: 'Información sobre tus datos',
    apartados: [
      { titulo: 'Datos de la cuenta', texto: 'Al registrarte se guardan tu nombre, apellidos, correo y teléfono para identificar tu cuenta y gestionar los alquileres. La autenticación se realiza mediante Supabase Auth. La aplicación no guarda contraseñas en sus tablas de perfiles.' },
      { titulo: 'Reservas y contacto', texto: 'Se guardan los productos, fechas, importes y estados de las reservas, y la dirección si solicitas entrega a domicilio. Las consultas de contacto guardan el nombre, correo, asunto y mensaje para que el equipo pueda responder.' },
      { titulo: 'Quién puede consultar los datos', texto: 'Desde tu cuenta puedes ver tus propias reservas y editar tus datos personales. El equipo autorizado puede consultar la información necesaria para gestionar reservas y consultas. Los visitantes no pueden leer los mensajes de contacto ni las reservas de clientes.' },
      { titulo: 'Solicitudes sobre tus datos', texto: 'Utiliza el formulario de contacto para solicitar información, correcciones o la eliminación de tu cuenta. Identifica la cuenta a la que se refiere la solicitud; el equipo deberá verificarla antes de realizar cambios.' },
    ],
  },
  cookies: {
    titulo: 'Almacenamiento de la sesión',
    apartados: [
      { titulo: 'Sesión en este navegador', texto: 'La aplicación utiliza el almacenamiento local del navegador para mantener tu sesión de Supabase y renovarla cuando corresponda. Este almacenamiento permite que no tengas que identificarte después de cada recarga.' },
      { titulo: 'Cómo cerrar la sesión', texto: 'Usa Cerrar sesión desde tu cuenta o el menú de la tienda, especialmente en equipos compartidos. También puedes borrar los datos del sitio desde la configuración de tu navegador; esto elimina la sesión guardada en ese navegador.' },
      { titulo: 'Datos operativos', texto: 'Las reservas, consultas e inventario se guardan en la base de datos. Borrar los datos del navegador no elimina una reserva ni una consulta ya registrada.' },
    ],
  },
};

export function PaginaInformacion({ tipo }: { tipo: TipoInformacion }) {
  const contenido = CONTENIDO[tipo];
  return <main className="min-h-[60vh] bg-neblina px-5 py-12"><article className="mx-auto max-w-3xl rounded-3xl border bg-white p-6 sm:p-10">
    <h1 className="text-3xl font-black text-tinta">{contenido.titulo}</h1>
    <div className="mt-8 space-y-7">{contenido.apartados.map(apartado => <section key={apartado.titulo}><h2 className="text-lg font-bold">{apartado.titulo}</h2><p className="mt-2 leading-7 text-slate-600">{apartado.texto}</p></section>)}</div>
    <a href="/?seccion=contacto" className="mt-8 inline-block rounded-xl bg-electrico px-5 py-3 font-bold text-white">Contactar con el equipo</a>
  </article></main>;
}
