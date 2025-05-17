const {getDB} = require('../config/db');

// Secciones públicas (por ejemplo: /auth no necesita verificación de permisos)
const seccionesPublicas = ['auth'];

module.exports = async (req, res, next) => {
    const dni = req.user?.dni;
    if (!dni) {
        return res.status(401).json({status: false, message: 'Usuario no autenticado'});
    }

    const seccion = req.baseUrl.split('/')[1]; // Ej: de "/inventario" → "inventario"

    if (seccionesPublicas.includes(seccion)) {
        return next(); // No se requiere verificación de permisos
    }

    try {
        // Verifica si el usuario está bloqueado
        const [usuarios] = await getDB().query('SELECT estado FROM usuarios WHERE dni = ?', [dni]);
        if (!usuarios.length) {
            return res.status(404).json({status: false, message: 'Usuario no encontrado'});
        }
        if (usuarios[0].estado === 'bloqueado') {
            return res.status(403).json({status: false, message: 'Usuario bloqueado'});
        }

        // Verifica si el usuario tiene acceso a la sección
        const [accesos] = await getDB().query(`
            SELECT s.ruta
            FROM usuarios u
                     JOIN roles_secciones rs ON u.id_rol = rs.id_rol
                     JOIN secciones s ON rs.id_seccion = s.id_seccion
            WHERE u.dni = ?
              AND s.ruta = ?
        `, [dni, `/${seccion}`]);
        if (!accesos.length) {
            return res.status(403).json({status: false, message: 'Acceso denegado a la sección /' + seccion});
        }

        next(); // Todo OK
    } catch (err) {
        console.error('Error al verificar permisos', err);
        res.status(500).json({status: false, message: 'Error del servidor al verificar permisos'});
    }
};
