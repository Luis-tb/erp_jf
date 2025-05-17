const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

// GET: Obtener empleados con filtros opcionales
exports.obtenerEmpleados = async (req, res) => {
    const {id_cargo, estado, busqueda} = req.query;

    try {
        let query = `
            SELECT e.dni,
                   UPPER(e.nombre) AS nombre,
                   e.id_cargo,
                   UPPER(c.nombre) AS cargo,
                   e.fecha_ingreso,
                   e.fecha_inactivo,
                   e.estado,
                   u.usuario
            FROM empleados e
                     LEFT JOIN cargos c ON e.id_cargo = c.id_cargo
                     LEFT JOIN usuarios u ON e.dni = u.dni
        `;

        const conditions = [];
        const values = [];

        if (id_cargo) {
            conditions.push('e.id_cargo = ?');
            values.push(id_cargo);
        }

        if (estado) {
            conditions.push('e.estado = ?');
            values.push(estado);
        }

        if (busqueda) {
            conditions.push('(e.dni LIKE ? OR e.nombre LIKE ?)');
            const searchTerm = `%${busqueda}%`;
            values.push(searchTerm, searchTerm);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY e.id_cargo';

        const [rows] = await getDB().query(query, values);

        return res.json(rows);
    } catch (err) {
        console.error('Error al obtener empleados:', err);
        return error(res, 'Error al obtener los empleados', 500);
    }
};

// POST: Crear un nuevo empleado
exports.crearEmpleado = async (req, res) => {
    const {dni, nombre, id_cargo, fecha_ingreso, estado} = req.body;

    if (!dni || !nombre || !id_cargo) {
        return error(res, 'Faltan datos requeridos', 400);
    }

    const db = getDB();
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const ingreso = fecha_ingreso
            ? new Date(fecha_ingreso).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        await conn.query(
            `
                INSERT INTO empleados (dni, nombre, id_cargo, fecha_ingreso, estado)
                VALUES (?, ?, ?, ?, ?)
            `,
            [dni, nombre, id_cargo, ingreso, estado]
        );

        await conn.commit();
        return success(res, {status: true, message: 'Empleado agregado correctamente'});
    } catch (err) {
        await conn.rollback();
        console.error('Error al agregar empleado:', err);
        return error(res, err.message || 'Error al agregar empleado', 500);
    } finally {
        conn.release();
    }
};

// PUT: Editar empleado existente
exports.editarEmpleado = async (req, res) => {
    const {dni} = req.params;
    const {nombre, id_cargo, fecha_ingreso, fecha_inactivo, estado} = req.body;

    if (!dni || !nombre || !id_cargo) {
        return error(res, 'Faltan datos requeridos', 400);
    }

    const db = getDB();
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const ingreso = fecha_ingreso ? new Date(fecha_ingreso).toISOString().split('T')[0] : null;
        const inactivo = fecha_inactivo ? new Date(fecha_inactivo).toISOString().split('T')[0] : null;

        await conn.query(
            `
                UPDATE empleados
                SET nombre         = ?,
                    id_cargo       = ?,
                    fecha_ingreso  = ?,
                    fecha_inactivo = ?,
                    estado         = ?
                WHERE dni = ?
            `,
            [nombre, id_cargo, ingreso, inactivo, estado, dni]
        );

        await conn.commit();
        return success(res, {status: true, message: 'Empleado actualizado correctamente'});
    } catch (err) {
        await conn.rollback();
        console.error('Error al actualizar empleado:', err);
        return error(res, err.message || 'Error al actualizar empleado', 500);
    } finally {
        conn.release();
    }
};

// DELETE: Eliminar empleado por DNI
exports.eliminarEmpleado = async (req, res) => {
    const {dni} = req.params;

    if (!dni) {
        return error(res, 'El DNI es obligatorio', 400);
    }

    try {
        const [result] = await getDB().query(
            `DELETE
             FROM empleados
             WHERE dni = ?`,
            [dni]
        );

        if (result.affectedRows === 0) {
            return error(res, 'No se encontró el empleado', 404);
        }

        return success(res, {status: true, message: 'Empleado eliminado correctamente'});
    } catch (err) {
        console.error('Error al eliminar empleado:', err);
        return error(res, 'Error al eliminar empleado', 500);
    }
};
