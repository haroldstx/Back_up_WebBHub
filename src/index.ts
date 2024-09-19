import express, { Request, Response } from 'express';
import { connectDB } from './dbConnector';
import dotenv from 'dotenv';
import { ResultSetHeader } from 'mysql2';
import { Connection } from 'mysql2/promise';
import { SendEmail } from './EmailSender';
import fs from "node:fs"
import cors from 'cors';


const app = express();
//INTERFACES
import { Usuario, Concurso, Params } from './interfaces/interfaces';
app.use(cors());


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
    const { subject, to, htmlContent } = req.body;

    if (!subject || !to || !htmlContent) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await SendEmail({ subject, to, htmlContent });
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
    const { id, nombre, descripcion, fecha_inicio, fecha_fin, foto_perfil, banner, interno, activo } = req.body;

    if (!nombre || !descripcion || !fecha_inicio || !fecha_fin || interno === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
        INSERT INTO Concurso (nombre, descripcion, fecha_inicio, fecha_fin, foto_perfil, banner, interno, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `;

        const [result] = await connection.execute(query, [
            nombre, descripcion, fecha_inicio, fecha_fin, foto_perfil || null, banner || null, interno, true
        ]);

        return res.status(201).json({ message: 'Contest created successfully', result });
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

// RUTA PARA BUSCAR CONCURSOS SEGÚN UNA PALABRA O FRASE EN EL NOMBRE
// * Documentada
app.get('/search-contests-by-name/:palabra', async (req: Request, res: Response) => {
    const { palabra } = req.params;

    if (!palabra) {
        return res.status(400).json({ error: 'Missing search query' });
    }
    try {
        const searchQuery = `%${palabra}%`;
        const sqlQuery = `
            SELECT * FROM Concurso
            WHERE nombre LIKE ?
            ORDER BY fecha_inicio DESC;
        `;

        const [rows] = await connection.execute(sqlQuery, [searchQuery]);

        if ((rows as Array<any>).length === 0) {
            return res.status(404).json({ error: 'No contests found' });
        }

        return res.status(200).json(rows);
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});


//RUTA PARA FILTRAR EN BASE A SOLO LOS QUE EL USUARIO PUEDE VER
app.get('/contests-for-user/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        // Obtener el tipo de usuario (interno o externo)
        const userQuery = `SELECT tipo FROM Usuario WHERE id = ?`;
        const [userRows] = await connection.execute(userQuery, [userId]);

        if ((userRows as Array<any>).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userType = (userRows as Array<any>)[0].tipo; // 0 = interno, 1 = externo

        // Definir la consulta SQL en base al tipo de usuario
        let contestQuery = '';
        let queryParams: any[] = [];

        if (userType === 0) { // Interno, obtiene todos los concursos
            contestQuery = `
                SELECT * FROM Concurso
                ORDER BY fecha_inicio DESC;
            `;
        } else if (userType === 1) { // Externo, solo obtiene concursos externos
            contestQuery = `
                SELECT * FROM Concurso
                WHERE interno = 0
                ORDER BY fecha_inicio DESC;
            `;
        }

        const [contestRows] = await connection.execute(contestQuery, queryParams);

        if ((contestRows as Array<any>).length === 0) {
            return res.status(404).json({ error: 'No contests found' });
        }

        return res.status(200).json(contestRows);
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
});

app.post('/add-participant', async (req: Request, res: Response) => {
    const { user_id, concurso_id, equipo_id, rol } = req.body;

    if (!user_id || !concurso_id) {
        return res.status(400).json({ error: 'Missing user_id or concurso_id' });
    }

    try {
        const sqlInsert = `
            INSERT INTO Participante (user_id, concurso_id, equipo_id, rol)
            VALUES (?, ?, ?, ?);
        `;

        await connection.execute(sqlInsert, [user_id, concurso_id, equipo_id || null, rol || null]);

        return res.status(201).json({ message: 'Participant added successfully' });
    } catch (error) {
        console.error('Failed to insert participant:', error);
        return res.status(500).json({ error: 'Failed to insert participant' });
    }
});

app.get('/contests-by-user/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'Missing user ID' });
    }

    try {
        const sqlQuery = `
            SELECT C.*
            FROM Concurso C
            INNER JOIN Participante P ON C.id = P.concurso_id
            WHERE P.user_id = ?
            ORDER BY C.fecha_inicio DESC;
        `;

        const [rows] = await connection.execute(sqlQuery, [userId]);

        if ((rows as Array<any>).length === 0) {
            return res.status(404).json({ error: 'No contests found for this user' });
        }

        return res.status(200).json(rows);
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
            INSERT INTO Usuario (nombre, correo, contrasena, tipo, carrera, bio, foto_perfil, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await connection.execute(query, [
            nombre, correo, contrasena, tipo, carrera || '', bio || '', foto_perfil || null, true
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
app.post("/gen-code", async (req: Request<{}, {}, { correo: string, nombre: string }>, res: Response) => {
    const { correo, nombre } = req.body;

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

    // open and read contents of emailVerify.html
    let htmlContent = fs.readFileSync("./src/emailVerify.html", 'utf-8')
    // set html content in one line
    htmlContent = htmlContent.replace(/\n/g, "").replace(/\t/g, "").replace(/\r/g, "")
    htmlContent = htmlContent.replace("{name}", nombre)
    htmlContent = htmlContent.replace("{code}", code)

    const subject = "[WEBHUB] Verificación de Correo"
    // para enviar un msg en el response relacionado al correo
    let emailMsg = ""
    let to = [{ email: correo, name: "name" }]
    // Enviar codigo por correo
    try {
        await SendEmail({ subject, to, htmlContent } as Params);
        emailMsg = "Email sent successfully."
    } catch (error) {
        console.error('Failed to send email:', error);
        emailMsg = "Failed to send email: " + error
    }

    let out = {
        message: emailMsg,
        valid_until: valid_until
    }
    return res.status(200).json(out);
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

app.put('/update-banner/:id', async (req: Request<{ id: string }, {}, { banner: Buffer }>, res: Response) => {
    const { id } = req.params;
    const { banner } = req.body;

    if (!banner) {
        return res.status(400).json({ error: 'No banner' });
    }

    try {
        const query = `UPDATE Concurso SET banner = ? WHERE id = ?`;
        const [result]: any = await connection.execute(query, [banner, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Contest not found' });
        }

        return res.status(200).json({ message: 'Banner updated successfully' });
    } catch (error) {
        console.error('Database operation failed:', error);
        return res.status(500).json({ error: 'Database operation failed' });
    }
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
