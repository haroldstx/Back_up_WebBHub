import express, { Request, Response } from 'express';
import { connectDB } from './dbConnector';
import dotenv from 'dotenv';
import { ResultSetHeader } from 'mysql2';
import { Connection } from 'mysql2/promise';
import { SendEmail } from './EmailSender';

//INTERFACES
import { Usuario, Concurso, Params } from './interfaces/interfaces';

const app = express();
const PORT = 4000;

app.use(express.json())
dotenv.config({ path: './.env' });
console.log('SSH_KEY_PATH:', process.env.SSH_KEY_PATH);

//! Porqué se crea una conexión aquí si en cada ruta se crea una nueva conexión?

let connection: Connection;
let connectionSetup = async () => {
    return await connectDB();
}

// Hashmap que guarda los códigos de verificación y su fecha de expiración
let codes: Map<string, { code: string, valid_until: number }> = new Map();


/*
PUT: Se utiliza para actualizar un recurso existente en el servidor.
GET: Se utiliza para obtener un recurso del servidor.
POST: Se utiliza para crear un nuevo recurso en el servidor.
DELETE: Se utiliza para eliminar un recurso existente en el servidor.
*/

//RUTA PARA ACTUALIZAR LA CONTRASENA DE UN USUARIO
// * Documentada
app.put('/update-password/:id', async (req, res) => {
    const { id } = req.params;
    const { contrasena } = req.body;
    try {
        const [result] = await connection.execute('UPDATE Usuario SET contrasena = ? WHERE id = ?', [contrasena, id]) as [ResultSetHeader, any];
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

//Ruta para los correos
// * Documentada
app.post('/send-email', async (req: Request<{}, {}, Params>, res: Response) => {
    const { subject, to, senderemail, htmlContent } = req.body;

    if (!subject || !to || !senderemail || !htmlContent) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await SendEmail({ subject, to, senderemail, htmlContent });
        return res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Failed to send email:', error);
        return res.status(500).json({ error: 'Failed to send email' });
    }
});

// TODO: Agregar paginación? así evitamos una respuesta demasiado grande cuando los concursos escalen.
// Se puede implementar de páginas de 5-10, ordenados del más reciente al más antiguo.
// Comentarlo con el Ing. Isaac.

//RUTA PARA VER TODOS LOS CONCURSOS
// * Documentada
app.get('/contests', async (req: Request, res: Response) => {
    try {
        const [rows] = await connection.execute('SELECT * FROM Concurso');
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

//RUTA PARA CREAR CONCURSO
// * Documentada
app.post('/create-contest', async (req: Request<{}, {}, Concurso>, res: Response) => {
    const { id, nombre, descripcion, fecha_inicio, fecha_fin, foto_perfil, banner, interno } = req.body;

    if (!id || !nombre || !descripcion || !fecha_inicio || !fecha_fin || interno === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
            INSERT INTO Concurso (nombre, descripcion, fecha_inicio, fecha_fin, foto_perfil, banner, interno)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await connection.execute(query, [
            id, nombre, descripcion, fecha_inicio, fecha_fin, foto_perfil, banner, interno
        ]);

        return res.status(201).json({ message: 'Contest created successfully', result });
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

//Ruta para desactivar cuentas de usuarios en base a su ID
// * Documentada
app.put('/deactivate-user/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await connection.execute('UPDATE Usuario SET Activo = 0 WHERE id = ?', [id]) as [ResultSetHeader, any];

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

//RUTA PARA INICIAR SESION Y OBTENER EL USUARIO
app.post('/login', async (req: Request<{}, {}, { correo: string, contrasena: string }>, res: Response) => {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
            SELECT * FROM Usuario WHERE correo = ? AND contrasena = ?
        `;

        const [rows] = await connection.execute(query, [correo, contrasena]) as [Usuario[], any];

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        return res.status(200).json({ message: 'Login successful', user });
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

//RUTA PARA OBTENER TODOS LOS USUARIOS QUE SON DE UNITEC
// TODO: Una ruta "/users/:org" para generalizar?
//* Documentada
app.get('/users-unitec', async (req, res) => {
    try {
        const [rows] = await connection.execute('SELECT nombre FROM Usuario WHERE correo LIKE "%@unitec.edu%" OR correo LIKE "%@unitec.edu.hn%"');
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

//:id es el parametro que se le pasara por la url
app.get('/get-user-by-id/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await connection.execute('SELECT nombre FROM Usuario WHERE id = ?', [id]) as [Usuario[], any];
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

//RUTA PARA CAMBIAR LA CARRERA DE UN USUARIO POR ID
app.put('/change-career/:id', async (req, res) => {
    const { id } = req.params;
    const { carrera } = req.body;
    try {
        const [result] = await connection.execute('UPDATE Usuario SET carrera = ? WHERE id = ?', [carrera, id]) as [ResultSetHeader, any];
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

//RUTA PARA OBTENER TODOS LOS USUARIOS EXISTENTES EN LA BASE DE DATOS
app.get('/users', async (req, res) => {
    try {
        const [rows] = await connection.execute('SELECT nombre FROM Usuario');
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

//RUTA PARA AGREGAR UN USUARIO A LA BASE DE DATOS
app.post('/add-user', async (req: Request<{}, {}, Omit<Usuario, 'id'>>, res: Response) => {
    const { nombre, correo, contrasena, tipo, carrera, bio, foto_perfil } = req.body;

    if (!nombre || !correo || !contrasena || typeof tipo !== 'number') {
        return res.status(400).json({ error: 'Missing required fields or invalid data types' });
    }

    // TODO: Guardar un hash de la contrasena
    try {
        const query = `
            INSERT INTO Usuario (nombre, correo, contrasena, tipo, carrera, bio, foto_perfil)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await connection.execute(query, [
            nombre, correo, contrasena, tipo, carrera || '', bio || '', foto_perfil || null
        ]);

        // Obtener el ID del usuario recién creado
        const newUserId = (result as ResultSetHeader).insertId;
        return res.status(201).json({ message: 'User added successfully', userId: newUserId });
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

/*
Genera un código de verificación de 6 dígitos y lo asocia a un correo.
*/
//* Documentada
app.post("/gen-code", async (req: Request<{}, {}, { correo: string }>, res: Response) => {
    const { correo } = req.body;

    if (correo === undefined) {
        return res.status(400).json({
            error: 'Missing required fields'
        })
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

    let newCodeData = { code: code, valid_until: valid_until }
    codes.set(correo, newCodeData);

    console.log(codes)
    return res.status(200).json(newCodeData);
});

//* Documentada
app.post("/verify-code", async (req: Request<{}, {}, { correo: string, code: string }>, res: Response) => {
    let { correo, code } = req.body;

    const codeData = codes.get(correo);

    if (codeData === undefined) {
        return res.status(404).json({ error: 'Code not found.' });
    }

    if (codeData.valid_until < Date.now()) {
        return res.status(400).json({ error: 'Code expired.' });
    }

    return res.status(200).json({ valid: codeData.code === code });
});

// Conectarse a la base de datos y reutilizar la conexión en todas las rutas
connectionSetup().then(
    (conn) => {
        connection = conn;
        console.log("Connected to Database!");
    }
).catch(
    (err) => {
        console.error("Failed to connect to database:", err);
    }
)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});