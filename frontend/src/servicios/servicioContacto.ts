import { supabase } from './supabase';

export interface ConsultaContacto {
  id: string;
  nombre: string;
  correo: string;
  asunto: string;
  mensaje: string;
  fecha_creacion: string;
  atendido: boolean;
}

export const servicioContacto = {
  enviar: async (datos: Pick<ConsultaContacto, 'nombre' | 'correo' | 'asunto' | 'mensaje'>) => {
    const { error } = await supabase.from('mensajes_contacto').insert(datos);
    if (error) throw new Error('No se pudo registrar tu consulta. Inténtalo de nuevo en unos minutos.');
  },
  obtener: async (): Promise<ConsultaContacto[]> => {
    const { data, error } = await supabase.from('mensajes_contacto')
      .select('id,nombre,correo,asunto,mensaje,fecha_creacion,atendido')
      .order('fecha_creacion', { ascending: false }).limit(200);
    if (error) throw new Error('No se pudo cargar la bandeja de consultas.');
    return data ?? [];
  },
  atender: async (id: string) => {
    const { data, error } = await supabase.from('mensajes_contacto').update({ atendido: true })
      .eq('id', id).select('id').maybeSingle();
    if (error || !data) throw new Error('No se pudo marcar la consulta como atendida.');
  },
};
