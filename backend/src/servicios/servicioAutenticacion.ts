import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

export type RolUsuario = 'cliente' | 'empleado' | 'administrador';
export interface UsuarioSeguro { id: string; nombre: string; apellidos: string; correo: string; telefono: string; rol: RolUsuario; }
interface UsuarioAlmacenado extends UsuarioSeguro { contrasenaHash: string; sal: string; }

const usuarios: UsuarioAlmacenado[] = [];
const sesiones = new Map<string, UsuarioSeguro>();

const crearHash = (contrasena: string, sal = randomBytes(16).toString('hex')) => ({ sal, hash: scryptSync(contrasena, sal, 64).toString('hex') });
const comprobarHash = (contrasena: string, usuario: UsuarioAlmacenado) => { const recibido = Buffer.from(scryptSync(contrasena, usuario.sal, 64).toString('hex'), 'hex'); const almacenado = Buffer.from(usuario.contrasenaHash, 'hex'); return recibido.length === almacenado.length && timingSafeEqual(recibido, almacenado); };

export const servicioAutenticacion = {
  registrarCliente: (datos: { nombre: string; apellidos: string; correo: string; telefono: string; contrasena: string }): UsuarioSeguro => {
    const correo = datos.correo.trim().toLowerCase();
    if (usuarios.some((usuario) => usuario.correo === correo)) throw new Error('Ya existe una cuenta con ese correo electrónico.');
    const credenciales = crearHash(datos.contrasena);
    const usuario: UsuarioAlmacenado = { id: randomUUID(), nombre: datos.nombre.trim(), apellidos: datos.apellidos.trim(), correo, telefono: datos.telefono.trim(), rol: 'cliente', contrasenaHash: credenciales.hash, sal: credenciales.sal };
    usuarios.push(usuario);
    return usuario;
  },
  iniciarSesion: (correo: string, contrasena: string) => {
    const usuario = usuarios.find((elemento) => elemento.correo === correo.trim().toLowerCase());
    if (!usuario || !comprobarHash(contrasena, usuario)) throw new Error('El correo electrónico o la contraseña no son correctos.');
    const seguro: UsuarioSeguro = { id: usuario.id, nombre: usuario.nombre, apellidos: usuario.apellidos, correo: usuario.correo, telefono: usuario.telefono, rol: usuario.rol };
    const token = randomUUID(); sesiones.set(token, seguro);
    return { usuario: seguro, token };
  },
  obtenerUsuarioPorToken: (token: string) => sesiones.get(token),
  crearUsuarioInterno: (datos: { nombre: string; apellidos: string; correo: string; telefono: string; contrasena: string; rol: 'empleado' | 'administrador' }) => {
    const usuario = servicioAutenticacion.registrarCliente({ ...datos });
    const almacenado = usuarios.find((elemento) => elemento.id === usuario.id)!;
    almacenado.rol = datos.rol;
    return { ...usuario, rol: datos.rol };
  },
};
