const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

// GET: Obtener todos los cargos
exports.obtenerCargos = async (req, res) => {
    try {
        const [rows] = await getDB().query(`
            SELECT id_cargo, nombre
            FROM cargos
        `);
        return res.json(rows);
    } catch (err) {
        console.error('Error al obtener cargos:', err);
        return error(res, 'Error al obtener cargos', 500);
    }
};

// POST: Crear nuevo cargo
exports.crearCargo = async (req, res) => {
    const {nombre} = req.body;

    if (!nombre?.trim()) {
        return error(res, 'El nombre es obligatorio', 400);
    }

    try {
        const [result] = await getDB().query(
            `INSERT INTO cargos (nombre)
             VALUES (?)`,
            [nombre.trim()]
        );

        return success(res, {
            status: true,
            id_cargo: result.insertId,
            message: 'Cargo agregado exitosamente'
        });
    } catch (err) {
        console.error('Error al agregar cargo:', err);
        return error(res, 'Error al agregar cargo', 500);
    }
};

// PUT: Editar un cargo existente
exports.editarCargo = async (req, res) => {
    const {id_cargo} = req.params;
    const {nombre} = req.body;

    if (!id_cargo || !nombre?.trim()) {
        return error(res, 'ID y nuevo nombre son obligatorios', 400);
    }

    try {
        const [result] = await getDB().query(
            `UPDATE cargos
             SET nombre = ?
             WHERE id_cargo = ?`,
            [nombre.trim(), parseInt(id_cargo)]
        );

        if (result.affectedRows > 0) {
            return success(res, {status: true, message: 'Cargo actualizado correctamente'});
        } else {
            return error(res, 'No se encontró el cargo o no hubo cambios', 404);
        }
    } catch (err) {
        console.error('Error al editar cargo:', err);
        return error(res, 'Error al editar el cargo', 500);
    }
};

// DELETE: Eliminar un cargo por ID
exports.eliminarCargo = async (req, res) => {
    const {id_cargo} = req.params;

    if (!id_cargo) {
        return error(res, 'El id_cargo es obligatorio', 400);
    }

    try {
        const [result] = await getDB().query(
            `DELETE
             FROM cargos
             WHERE id_cargo = ?`,
            [parseInt(id_cargo)]
        );

        if (result.affectedRows > 0) {
            return success(res, {status: true, message: 'Cargo eliminado correctamente'});
        } else {
            return error(res, 'No se encontró el cargo', 404);
        }
    } catch (err) {
        console.error('Error al eliminar cargo:', err);
        if (err.message.includes('foreign key constraint')) {
            return error(res, 'No se puede eliminar el cargo porque está siendo utilizado por empleados. Asegúrese de que no esté asignado a empleados o elimine primero los registros dependientes.', 400);
        }
        return error(res, 'Error al eliminar el cargo', 500);
    }
};
