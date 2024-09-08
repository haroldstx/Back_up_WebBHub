CREATE TABLE Concurso (
    id INT PRIMARY KEY,
    nombre VARCHAR(255),
    descripcion TEXT,
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    foto_perfil BLOB,
    banner BLOB,
    interno BOOLEAN
    activo BOOLEAN
);

CREATE TABLE RestriccionesConcurso (
    concurso_id INT,
    carrera VARCHAR(255),
    facultad VARCHAR(255),
    FOREIGN KEY (concurso_id) REFERENCES Concurso(id)
);

CREATE TABLE Usuario (
    id INT PRIMARY KEY,
    nombre VARCHAR(255),
    correo VARCHAR(255),
    contrasena VARCHAR(255),
    tipo INT, -- 0 - interno | 1 - externo
    carrera VARCHAR(255), -- vacío si es externo
    bio TEXT,
    foto_perfil BLOB
    activo BOOLEAN
);

CREATE TABLE Equipo (
    team_id INT PRIMARY KEY,
    nombre VARCHAR(255),
    concurso INT,
    FOREIGN KEY (concurso) REFERENCES Concurso(id)
);

CREATE TABLE Participante (
    user_id INT,
    concurso_id INT,
    equipo_id INT,
    rol INT, -- puede ser string si prefieres
    FOREIGN KEY (user_id) REFERENCES Usuario(id),
    FOREIGN KEY (concurso_id) REFERENCES Concurso(id),
    FOREIGN KEY (equipo_id) REFERENCES Equipo(team_id),
    PRIMARY KEY (user_id, concurso_id, equipo_id)
);

CREATE TABLE Recursos (
    id INT PRIMARY KEY,
    concurso INT,
    nombre VARCHAR(255),
    archivo BLOB,
    FOREIGN KEY (concurso) REFERENCES Concurso(id)
);

CREATE TABLE Propuesta (
    id INT PRIMARY KEY,
    nombre VARCHAR(255),
    descripcion TEXT,
    foto_perfil BLOB,
    banner BLOB,
    concurso_id INT,
    equipo_id INT,
    FOREIGN KEY (concurso_id) REFERENCES Concurso(id),
    FOREIGN KEY (equipo_id) REFERENCES Equipo(team_id)
);

CREATE TABLE RecursosPropuestas (
    id INT PRIMARY KEY,
    propuesta_id INT,
    nombre VARCHAR(255),
    archivo BLOB,
    FOREIGN KEY (propuesta_id) REFERENCES Propuesta(id)
);
