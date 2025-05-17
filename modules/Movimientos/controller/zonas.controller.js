const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

// GET: Obtener todas las zonas y su cantidad de productos
exports.obtenerZonas = async (req, res) => {
    try {
        const [rows] = await getDB().query(`
            SELECT z.id_zona, z.zona
            FROM zonas z
        `);
        return res.json(rows);
    } catch (err) {
        console.error('Error al obtener zonas:', err);
        return error(res, 'Error al obtener zonas', 500);
    }
};

// POST: Insertar nueva zona
exports.crearZona = async (req, res) => {
    const {zona} = req.body;

    if (!zona?.trim()) {
        return error(res, 'El nombre es obligatorio', 400);
    }

    try {
        const [result] = await getDB().query(
            `INSERT INTO zonas (zona)
             VALUES (?)`,
            [zona.trim()]
        );

        return success(res, {
            status: true,
            id_zona: result.insertId,
            message: 'Zona agregada exitosamente'
        });
    } catch (err) {
        console.error('Error al crear zona:', err);
        return error(res, 'Error al crear el zona', 500);
    }
};
// PUT: Editar un zona existente
exports.editarZona = async (req, res) => {
    const {id} = req.params;
    const {zona} = req.body;

    if (!id || !zona?.trim()) {
        return error(res, "ID y nombre son obligatorios", 400);
    }

    try {
        await getDB().query(
            `UPDATE zonas
             SET zona = ?
             WHERE id_zona = ?`,
            [zona.trim(), parseInt(id)]
        );

        return success(res, {status: true, message: "Zona actualizado correctamente"});
    } catch (err) {
        console.error("Error al editar zona:", err);
        return error(res, "Error al actualizar el zona", 500);
    }
};

// DELETE: Eliminar una zona por ID
exports.eliminarZona = async (req, res) => {
    const {id} = req.params;

    if (!id) {
        return error(res, "ID de zona es obligatorio", 400);
    }

    try {
        const [result] = await getDB().query(
            `DELETE
             FROM zonas
             WHERE id_zona = ?`,
            [parseInt(id)]
        );

        if (result.affectedRows === 0) {
            return error(res, "No se encontró la zona", 404);
        }

        return success(res, {status: true, message: "Zona eliminada correctamente"});
    } catch (err) {
        console.error("Error al eliminar zona:", err);
        if (err.message.includes("a foreign key constraint")) {
            return error(res, "No se puede eliminar la zona porque tiene registros dependientes", 409);
        }
        return error(res, "Error al eliminar el zona", 500);
    }
};