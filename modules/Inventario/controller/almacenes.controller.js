const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

// GET: Obtener todos los almacenes y su cantidad de productos
exports.obtenerAlmacenes = async (req, res) => {
    try {
        const [rows] = await getDB().query(`
            SELECT a.id_almacen,
                   a.nombre,
                   a.ubicacion,
                   COALESCE(SUM(i.cantidad), 0) AS productos
            FROM almacenes a
                     LEFT JOIN inventarios i ON a.id_almacen = i.id_almacen
            GROUP BY a.id_almacen, a.nombre, a.ubicacion
        `);
        return res.json(rows);
    } catch (err) {
        console.error('Error al obtener almacenes:', err);
        return error(res, 'Error al obtener almacenes', 500);
    }
};

// POST: Insertar nuevo almacén
exports.crearAlmacen = async (req, res) => {
    const {nombre, ubicacion} = req.body;

    if (!nombre?.trim() || !ubicacion?.trim()) {
        return error(res, 'El nombre y la ubicación son obligatorios', 400);
    }

    try {
        const [result] = await getDB().query(
            `INSERT INTO almacenes (nombre, ubicacion)
             VALUES (?, ?)`,
            [nombre.trim(), ubicacion.trim()]
        );

        return success(res, {
            status: true,
            id_almacen: result.insertId,
            message: 'Almacén agregado exitosamente'
        });
    } catch (err) {
        console.error('Error al crear almacén:', err);
        return error(res, 'Error al crear el almacén', 500);
    }
};
// PUT: Editar un almacén existente
exports.editarAlmacen = async (req, res) => {
    const {id} = req.params;
    const {nombre, ubicacion} = req.body;

    if (!id || !nombre?.trim() || !ubicacion?.trim()) {
        return error(res, "ID, nombre y ubicación son obligatorios", 400);
    }

    try {
        await getDB().query(
            `UPDATE almacenes
             SET nombre    = ?,
                 ubicacion = ?
             WHERE id_almacen = ?`,
            [nombre.trim(), ubicacion.trim(), parseInt(id)]
        );

        return success(res, {status: true, message: "Almacén actualizado correctamente"});
    } catch (err) {
        console.error("Error al editar almacén:", err);
        return error(res, "Error al actualizar el almacén", 500);
    }
};

// DELETE: Eliminar un almacén por ID
exports.eliminarAlmacen = async (req, res) => {
    const {id} = req.params;

    if (!id) {
        return error(res, "ID del almacén es obligatorio", 400);
    }

    try {
        const [result] = await getDB().query(
            `DELETE
             FROM almacenes
             WHERE id_almacen = ?`,
            [parseInt(id)]
        );

        if (result.affectedRows === 0) {
            return error(res, "No se encontró el almacén", 404);
        }

        return success(res, {status: true, message: "Almacén eliminado correctamente"});
    } catch (err) {
        console.error("Error al eliminar almacén:", err);
        if (err.message.includes("a foreign key constraint")) {
            return error(res, "No se puede eliminar el almacén porque tiene registros dependientes", 409);
        }
        return error(res, "Error al eliminar el almacén", 500);
    }
};