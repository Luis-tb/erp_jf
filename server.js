const app = require('./app');
const {connectDB} = require('./config/db');
const {port} = require('./config/env');

connectDB().then(() => {
    app.listen(port, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    });
});