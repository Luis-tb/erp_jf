const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

// GET: Obtener todos los roles con sus secciones
exports.obtenerRoles = async (req, res) => {
    try {
        const db = getDB();

        // Obtener roles con secciones
        const [rolesData] = await db.query(`
            SELECT r.id_rol,
                   r.nombre                                                    AS rol_nombre,
                   GROUP_CONCAT(s.id_seccion ORDER BY s.nombre SEPARATOR ', ') AS secciones_ids
            FROM roles r
                     LEFT JOIN roles_secciones rs ON r.id_rol = rs.id_rol
                     LEFT JOIN secciones s ON rs.id_seccion = s.id_seccion
            GROUP BY r.id_rol, r.nombre
        `);

        const roles = rolesData.map(r => ({
            ...r,
            secciones_ids: r.secciones_ids ? r.secciones_ids.split(', ').map(id => parseInt(id)) : []
        }));

        // Obtener todas las secciones
        const [secciones] = await db.query(`
            SELECT id_seccion, nombre
            FROM secciones
            ORDER BY id_seccion
        `);

        return success(res, {roles, secciones});
    } catch (err) {
        console.error('Error al obtener roles:', err);
        return error(res, 'Error al obtener roles', 500);
    }
};

// POST: Crear un nuevo rol
exports.crearRol = async (req, res) => {
    const {rol_nombre, secciones_ids} = req.body;

    if (!rol_nombre || !Array.isArray(secciones_ids)) {
        return error(res, 'Nombre del rol y secciones son obligatorios', 400);
    }

    const db = getDB();
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [rolResult] = await conn.query(
            `INSERT INTO roles (nombre)
             VALUES (?)`,
            [rol_nombre]
        );
        const id_rol = rolResult.insertId;

        const insertQuery = `INSERT INTO roles_secciones (id_rol, id_seccion)
                             VALUES (?, ?)`;
        for (const id_seccion of secciones_ids) {
            await conn.query(insertQuery, [id_rol, id_seccion]);
        }

        await conn.commit();
        return success(res, {status: true, message: 'Rol agregado correctamente'});
    } catch (err) {
        await conn.rollback();
        console.error('Error al crear rol:', err);
        return error(res, 'Error al crear el rol', 500);
    } finally {
        conn.release();
    }
};

// PUT: Actualizar un rol existente
exports.editarRol = async (req, res) => {
    const {id_rol} = req.params;
    const {rol_nombre, secciones_ids} = req.body;

    if (!id_rol || !rol_nombre || !Array.isArray(secciones_ids)) {
        return error(res, 'ID del rol, nombre y secciones son obligatorios', 400);
    }

    const db = getDB();
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(`UPDATE roles
                          SET nombre = ?
                          WHERE id_rol = ?`, [rol_nombre, id_rol]);
        await conn.query(`DELETE
                          FROM roles_secciones
                          WHERE id_rol = ?`, [id_rol]);

        const insertQuery = `INSERT INTO roles_secciones (id_rol, id_seccion)
                             VALUES (?, ?)`;
        for (const id_seccion of secciones_ids) {
            await conn.query(insertQuery, [id_rol, id_seccion]);
        }

        await conn.commit();
        return success(res, {status: true, message: 'Rol actualizado correctamente'});
    } catch (err) {
        await conn.rollback();
        console.error('Error al actualizar rol:', err);
        return error(res, 'Error al actualizar el rol', 500);
    } finally {
        conn.release();
    }
};

// DELETE: Eliminar un rol por ID
exports.eliminarRol = async (req, res) => {
    const {id_rol} = req.params;

    if (!id_rol) {
        return error(res, 'El id_rol es obligatorio', 400);
    }

    const db = getDB();
    const conn = await db.getConnection();
    try {
        const [[{total}]] = await conn.query(
            `SELECT COUNT(*) as total
             FROM usuarios
             WHERE id_rol = ?`,
            [id_rol]
        );

        if (total > 0) {
            return error(res, 'No se puede eliminar el rol porque hay usuarios utilizándolo.', 400);
        }

        await conn.beginTransaction();
        await conn.query(`DELETE
                          FROM roles_secciones
                          WHERE id_rol = ?`, [id_rol]);
        await conn.query(`DELETE
                          FROM roles
                          WHERE id_rol = ?`, [id_rol]);

        await conn.commit();
        return success(res, {status: true, message: 'Rol eliminado correctamente'});
    } catch (err) {
        await conn.rollback();
        console.error('Error al eliminar rol:', err);
        return error(res, 'Error al eliminar el rol', 500);
    } finally {
        conn.release();
    }
};
