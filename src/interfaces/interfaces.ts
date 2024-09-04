export interface RestriccionesConcurso {
    concurso_id: number;
    carrera: string;
    facultad: string;
    concurso?: Concurso;
}

export interface Equipo {
    team_id: number;
    nombre: string;
    concurso: number;
    concurso_info?: Concurso;
}

export interface Params {
    subject: string;
    to: { email: string; name: string }[];
    senderemail: string;
    htmlContent: string;
}

export interface Participante {
    user_id: number;
    concurso_id: number;
    equipo_id: number;
    rol: number | string;
    usuario?: Usuario;
    concurso?: Concurso;
    equipo?: Equipo;
}

export interface Recursos {
    id: number;
    concurso_id: number;
    nombre: string;
    archivo: Buffer;
}

export interface Propuesta {
    id: number;
    nombre: string;
    descripcion: string;
    foto_perfil: Buffer;
    banner: Buffer;
    concurso_id: number;
    equipo_id: number;
}

export interface RecursosPropuestas {
    id: number;
    propuesta_id: number;
    nombre: string;
    archivo: Buffer;
}

export interface Usuario {
    id: number;
    nombre: string;
    correo: string;
    contrasena: string;
    tipo: number;
    carrera?: string;
    bio?: string;
    foto_perfil?: Buffer | null;
}

export interface Concurso {
    id: number;
    nombre: string;
    descripcion: string;
    fecha_inicio: Date;
    fecha_fin: Date;
    foto_perfil: Buffer;
    banner: Buffer;
    interno: boolean;
}
