"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.connectDB = connectDB;
exports.testDatabaseConnection = testDatabaseConnection;
const ssh2_1 = require("ssh2");
const promise_1 = __importDefault(require("mysql2/promise"));
const fs = __importStar(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function connectDB() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const sshClient = new ssh2_1.Client();
            sshClient.on('ready', () => {
                console.log('SSH Client ready');
                sshClient.forwardOut('127.0.0.1', // source address
                12345, // source port
                '127.0.0.1', // destination address (MySQL server on the SSH server)
                3306, // destination port (MySQL's port)
                (err, stream) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        reject(err);
                        return;
                    }
                    try {
                        const connection = yield promise_1.default.createConnection({
                            host: '127.0.0.1',
                            user: process.env.DB_USER,
                            password: process.env.DB_PASSWORD,
                            database: process.env.DB_DATABASE,
                            stream: stream
                        });
                        resolve(connection);
                    }
                    catch (connectError) {
                        reject(connectError);
                    }
                }));
            }).connect({
                host: process.env.SSH_HOST,
                port: 22,
                username: process.env.SSH_USERNAME,
                privateKey: fs.readFileSync(process.env.SSH_KEY_PATH)
            });
        });
    });
}
function testDatabaseConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const connection = yield connectDB();
            yield connection.end();
        }
        catch (error) {
            console.error('Failed to connect to the database:', error);
        }
    });
}
