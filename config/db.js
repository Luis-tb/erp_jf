const mysql = require('mysql2/promise');
const {database} = require('./env');

let db;

const connectDB = async () => {
    if (!db) {
        try {
            db = await mysql.createPool({
                host: database.host,
                user: database.user,
                password: database.password,
                database: database.database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            console.log('✅ Base de datos conectada');
        } catch (error) {
            console.error('❌ Error al conectar a la base de datos:', error);
            process.exit(1);
        }
    }
};

// Usar la conexión ya establecida
const getDB = () => db;

module.exports = {connectDB, getDB};
