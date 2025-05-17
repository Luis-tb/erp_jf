const {getDB} = require('../../../config/db');

async function registrarAcceso(req, user) {
    if (!user?.dni) {
        throw new Error('Usuario no autenticado');
    }

    const id_usuario = user.dni;
    const ip_acceso = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const user_agent = req.get('User-Agent');

    try {
        await getDB().execute(`
            INSERT INTO accesos_usuarios (id_usuario, ip_acceso, user_agent)
            VALUES (?, ?, ?)
        `, [id_usuario, ip_acceso, user_agent]);
    } catch (error) {
        console.error('[Error al registrar acceso]', error);
        // Evitamos romper el flujo de login si falla el log
    }
}

module.exports = {registrarAcceso};
