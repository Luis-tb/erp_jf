const app = require('./app');
const {connectDB} = require('./config/db');

connectDB().then(() => {
    console.log('✅ Conectado a la base de datos');
});

// 🚫 NO uses app.listen
// ✅ Exporta la app para que Passenger la use
module.exports = app;
