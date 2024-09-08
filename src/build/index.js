"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dbConnector_1 = require("./dbConnector");
const dotenv_1 = __importDefault(require("dotenv"));
const EmailSender_1 = require("./EmailSender");
const app = (0, express_1.default)();
const PORT = 4000;
app.use(express_1.default.json());
dotenv_1.default.config({ path: './.env' });
console.log('SSH_KEY_PATH:', process.env.SSH_KEY_PATH);
//! Porqué se crea una conexión aquí si en cada ruta se crea una nueva conexión?
let connection;
let connectionSetup = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield (0, dbConnector_1.connectDB)();
});
// Hashmap que guarda los códigos de verificación y su fecha de expiración
let codes = new Map();
/*
PUT: Se utiliza para actualizar un recurso existente en el servidor.
GET: Se utiliza para obtener un recurso del servidor.
POST: Se utiliza para crear un nuevo recurso en el servidor.
DELETE: Se utiliza para eliminar un recurso existente en el servidor.
*/
//RUTA PARA ACTUALIZAR LA CONTRASENA DE UN USUARIO
// * Documentada
app.put('/update-password/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { contrasena } = req.body;
    try {
        const [result] = yield connection.execute('UPDATE Usuario SET contrasena = ? WHERE id = ?', [contrasena, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ message: 'User updated successfully' });
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
//Ruta para los correos
// * Documentada
app.post('/send-email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subject, to, senderemail, htmlContent } = req.body;
    if (!subject || !to || !senderemail || !htmlContent) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        yield (0, EmailSender_1.SendEmail)({ subject, to, senderemail, htmlContent });
        return res.status(200).json({ message: 'Email sent successfully' });
    }
    catch (error) {
        console.error('Failed to send email:', error);
        return res.status(500).json({ error: 'Failed to send email' });
    }
}));
// TODO: Agregar paginación? así evitamos una respuesta demasiado grande cuando los concursos escalen.
// Se puede implementar de páginas de 5-10, ordenados del más reciente al más antiguo.
// Comentarlo con el Ing. Isaac.
//RUTA PARA VER TODOS LOS CONCURSOS
// * Documentada
app.get('/contests', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield connection.execute('SELECT * FROM Concurso');
        return res.status(200).json(rows);
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
//RUTA PARA CREAR CONCURSO
// * Documentada
app.post('/create-contest', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, nombre, descripcion, fecha_inicio, fecha_fin, foto_perfil, banner, interno, activo } = req.body;
    if (!nombre || !descripcion || !fecha_inicio || !fecha_fin || interno === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const query = `
        INSERT INTO Concurso (nombre, descripcion, fecha_inicio, fecha_fin, foto_perfil, banner, interno, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `;
        const [result] = yield connection.execute(query, [
            nombre, descripcion, fecha_inicio, fecha_fin, foto_perfil || null, banner || null, interno, true
        ]);
        return res.status(201).json({ message: 'Contest created successfully', result });
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
//Ruta para desactivar cuentas de usuarios en base a su ID
// * Documentada
app.put('/deactivate-user/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const [result] = yield connection.execute('UPDATE Usuario SET Activo = 0 WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ message: 'User deactivated successfully' });
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
//RUTA PARA INICIAR SESION Y OBTENER EL USUARIO
app.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const query = `
            SELECT * FROM Usuario WHERE correo = ? AND contrasena = ?
        `;
        const [rows] = yield connection.execute(query, [correo, contrasena]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = rows[0];
        return res.status(200).json({ message: 'Login successful', user });
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
//RUTA PARA OBTENER TODOS LOS USUARIOS QUE SON DE UNITEC
// TODO: Una ruta "/users/:org" para generalizar?
//* Documentada
app.get('/users-unitec', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield connection.execute('SELECT nombre FROM Usuario WHERE correo LIKE "%@unitec.edu%" OR correo LIKE "%@unitec.edu.hn%"');
        return res.status(200).json(rows);
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
//:id es el parametro que se le pasara por la url
app.get('/get-user-by-id/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const [rows] = yield connection.execute('SELECT nombre FROM Usuario WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json(rows[0]);
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
//RUTA PARA CAMBIAR LA CARRERA DE UN USUARIO POR ID
app.put('/change-career/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { carrera } = req.body;
    try {
        const [result] = yield connection.execute('UPDATE Usuario SET carrera = ? WHERE id = ?', [carrera, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ message: 'User updated successfully' });
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
//RUTA PARA OBTENER TODOS LOS USUARIOS EXISTENTES EN LA BASE DE DATOS
app.get('/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield connection.execute('SELECT nombre FROM Usuario');
        return res.status(200).json(rows);
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
//RUTA PARA AGREGAR UN USUARIO A LA BASE DE DATOS
app.post('/add-user', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nombre, correo, contrasena, tipo, carrera, bio, foto_perfil } = req.body;
    if (!nombre || !correo || !contrasena || typeof tipo !== 'number') {
        return res.status(400).json({ error: 'Missing required fields or invalid data types' });
    }
    // TODO: Guardar un hash de la contrasena
    try {
        const query = `
            INSERT INTO Usuario (nombre, correo, contrasena, tipo, carrera, bio, foto_perfil, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = yield connection.execute(query, [
            nombre, correo, contrasena, tipo, carrera || '', bio || '', foto_perfil || null, true
        ]);
        // Obtener el ID del usuario recién creado
        const newUserId = result.insertId;
        return res.status(201).json({ message: 'User added successfully', userId: newUserId });
    }
    catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
}));
/*
Genera un código de verificación de 6 dígitos y lo asocia a un correo.
*/
//* Documentada
app.post("/gen-code", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { correo } = req.body;
    if (correo === undefined) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }
    // Verificar que ese codigo no esté generado
    const codeData = codes.get(correo);
    if (codeData !== undefined) {
        if (codeData.valid_until > Date.now()) {
            return res.status(400).json({ error: 'Code already generated.', code: codeData.code });
        }
    }
    const validTime = 2 * 60 * 1000; // 2 minutos
    let code = Math.floor(100000 + Math.random() * 900000).toString();
    let valid_until = Date.now() + (validTime);
    let newCodeData = { code: code, valid_until: valid_until };
    codes.set(correo, newCodeData);
    console.log(codes);
    return res.status(200).json(newCodeData);
}));
//* Documentada
app.post("/verify-code", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { correo, code } = req.body;
    const codeData = codes.get(correo);
    if (codeData === undefined) {
        return res.status(404).json({ error: 'Code not found.' });
    }
    if (codeData.valid_until < Date.now()) {
        return res.status(400).json({ error: 'Code expired.' });
    }
    return res.status(200).json({ valid: codeData.code === code });
}));
// Conectarse a la base de datos y reutilizar la conexión en todas las rutas
connectionSetup().then((conn) => {
    connection = conn;
    console.log("Connected to Database!");
}).catch((err) => {
    console.error("Failed to connect to database:", err);
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
