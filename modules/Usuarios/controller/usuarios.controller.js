const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');
const bcrypt = require('bcrypt');

// GET: Obtener usuarios o empleados sin usuario
exports.obtenerUsuarios = async (req, res) => {
    const {id_rol, estado, busqueda, users} = req.query;

    try {
        const db = getDB();

        if (users === 'true') {
            const [rows] = await db.query(`
                SELECT e.dni, UPPER(e.nombre) AS nombre
                FROM empleados e
                         LEFT JOIN usuarios u ON e.dni = u.dni
                WHERE u.dni IS NULL
            `);

            return success(res, rows);
        }

        let query = `
            SELECT u.dni,
                   u.usuario,
                   e.nombre,
                   u.id_rol,
                   r.nombre            AS rol,
                   u.estado,
                   MAX(a.fecha_acceso) AS ultima_fecha_acceso
            FROM usuarios u
                     JOIN empleados e ON u.dni = e.dni
                     JOIN roles r ON u.id_rol = r.id_rol
                     LEFT JOIN accesos_usuarios a ON u.dni = a.id_usuario
        `;

        const conditions = [];
        const values = [];

        if (id_rol) {
            conditions.push('u.id_rol = ?');
            values.push(id_rol);
        }

        if (estado) {
            conditions.push('u.estado = ?');
            values.push(estado);
        }

        if (busqueda) {
            conditions.push('(e.nombre LIKE ? OR u.usuario LIKE ?)');
            const term = `%${busqueda}%`;
            values.push(term, term);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY u.usuario, e.nombre, r.nombre, u.estado';

        const [usuarios] = await db.query(query, values);

        return res.json(usuarios);

    } catch (err) {
        console.error('Error al obtener usuarios:', err);
        return error(res, 'Error interno al obtener los usuarios', 500);
    }
};

// POST: Crear nuevo usuario
exports.crearUsuario = async (req, res) => {
    const {usuario, password, dni, rol_id} = req.body;

    if (!usuario || !password || !dni || !rol_id) {
        return error(res, 'Todos los campos son obligatorios', 400);
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await getDB().query(
            `INSERT INTO usuarios (dni, id_rol, usuario, contrasenia)
             VALUES (?, ?, ?, ?)`,
            [dni, rol_id, usuario, hashedPassword]
        );

        return success(res, {message: `Usuario ${usuario} creado correctamente`});
    } catch (err) {
        console.error('Error al crear usuario:', err);
        return error(res, 'Error al crear el usuario', 400);
    }
};

// PUT: Editar usuario (rol, usuario, contraseña o estado)
exports.editarUsuario = async (req, res) => {
    const {dni} = req.params;
    const {usuario, password, rol_id, estado} = req.body;

    if (!usuario || !dni) return error(res, 'Usuario y DNI son obligatorios', 400);

    try {
        let sql = '';
        const values = [];

        if (estado !== undefined) {
            // Solo cambiar estado
            if (estado !== 'activo' && estado !== 'bloqueado') {
                return error(res, "Estado inválido. Debe ser 'activo' o 'bloqueado'", 400);
            }

            sql = `UPDATE usuarios
                   SET estado = ?
                   WHERE dni = ?`;
            values.push(estado, dni);
        } else {
            // Cambiar datos generales
            sql = `UPDATE usuarios
                   SET id_rol  = ?,
                       usuario = ?`;
            values.push(rol_id, usuario);

            if (password && password.trim() !== '') {
                const hashedPassword = await bcrypt.hash(password, 10);
                sql += `, contrasenia = ?`;
                values.push(hashedPassword);
            }

            sql += ` WHERE dni = ?`;
            values.push(dni);
        }

        const [result] = await getDB().query(sql, values);

        if (result.affectedRows === 0) {
            return error(res, 'No se encontró el usuario a actualizar', 404);
        }

        const msg = estado
            ? `Estado del usuario ${usuario} actualizado a ${estado}`
            : `Usuario ${usuario} actualizado correctamente`;

        return success(res, {message: msg});

    } catch (err) {
        console.error('Error al editar usuario:', err);
        return error(res, 'Error al editar el usuario', 400);
    }
};

// DELETE: Eliminar usuario por DNI
exports.eliminarUsuario = async (req, res) => {
    const {dni} = req.params;

    if (!dni) return error(res, 'DNI es obligatorio', 400);

    try {
        const [result] = await getDB().query(`DELETE
                                              FROM usuarios
                                              WHERE dni = ?`, [dni]);

        if (result.affectedRows === 0) {
            return error(res, `No se encontró usuario con DNI ${dni}`, 404);
        }

        return success(res, {message: `Usuario con DNI ${dni} eliminado correctamente`});
    } catch (err) {
        console.error('Error al eliminar usuario:', err);
        return error(res, 'Error al eliminar usuario', 500);
    }
};
