import { Client } from 'ssh2';
import mysql, { Connection } from 'mysql2/promise';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export async function connectDB(): Promise<Connection> {
    return new Promise((resolve, reject) => {
        const sshClient = new Client();
        sshClient.on('ready', () => {
            console.log('SSH Client ready');
            sshClient.forwardOut(
                '127.0.0.1', // source address
                12345, // source port
                '127.0.0.1', // destination address (MySQL server on the SSH server)
                3306, // destination port (MySQL's port)
                async (err, stream) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    try {
                        const connection = await mysql.createConnection({
                            host: '127.0.0.1',
                            user: process.env.DB_USER,
                            password: process.env.DB_PASSWORD,
                            database: process.env.DB_DATABASE,
                            stream: stream
                        });
                        resolve(connection);
                    } catch (connectError) {
                        reject(connectError);
                    }
                }
            );
        }).connect({
            host: process.env.SSH_HOST,
            port: 22,
            username: process.env.SSH_USERNAME,
            privateKey: fs.readFileSync(process.env.SSH_KEY_PATH!)
        });
    });
}

export async function testDatabaseConnection() {
    try {
        const connection = await connectDB();
        await connection.end();
    } catch (error) {
        console.error('Failed to connect to the database:', error);
    }
}
