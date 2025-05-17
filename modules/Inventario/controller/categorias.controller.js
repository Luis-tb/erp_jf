const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

// GET: Obtener todas las categorías
exports.obtenerCategorias = async (req, res) => {
    try {
        const [rows] = await getDB().query(`
            SELECT id_categoria, nombre, stock_minimo
            FROM categorias
        `);
        return res.json(rows);
    } catch (err) {
        console.error('Error al obtener categorías:', err);
        return error(res, 'Error al obtener categorías', 500);
    }
};

// POST: Crear nueva categoría
exports.crearCategoria = async (req, res) => {
    const {nombre, stock_minimo} = req.body;

    if (!nombre?.trim()) {
        return error(res, 'El nombre de la categoría es obligatorio', 400);
    }

    try {
        const [result] = await getDB().query(
            `INSERT INTO categorias (nombre, stock_minimo)
             VALUES (?, ?)`,
            [nombre.trim(), stock_minimo ?? null]
        );

        return success(res, {
            status: true,
            id_categoria: result.insertId,
            message: 'Categoría agregada exitosamente'
        });
    } catch (err) {
        console.error('Error al crear categoría:', err);
        return error(res, 'Error al crear la categoría', 500);
    }
};

// PUT: Editar una categoría existente
exports.editarCategoria = async (req, res) => {
    const {id_categoria} = req.params;
    const {nombre, stock_minimo} = req.body;

    if (!id_categoria || !nombre?.trim()) {
        return error(res, 'ID y nombre son obligatorios', 400);
    }

    try {
        const [result] = await getDB().query(
            `UPDATE categorias
             SET nombre = ?, stock_minimo = ?
             WHERE id_categoria = ?`,
            [nombre.trim(), stock_minimo ?? null, parseInt(id_categoria)]
        );

        if (result.affectedRows === 0) {
            return error(res, 'No se encontró la categoría', 404);
        }

        return success(res, {status: true, message: 'Categoría actualizada correctamente'});
    } catch (err) {
        console.error('Error al editar categoría:', err);
        return error(res, 'Error al actualizar la categoría', 500);
    }
};

// DELETE: Eliminar una categoría por ID
exports.eliminarCategoria = async (req, res) => {
    const {id_categoria} = req.params;

    if (!id_categoria) {
        return error(res, 'ID de la categoría es obligatorio', 400);
    }

    try {
        const [result] = await getDB().query(
            `DELETE FROM categorias WHERE id_categoria = ?`,
            [parseInt(id_categoria)]
        );

        if (result.affectedRows === 0) {
            return error(res, 'No se encontró la categoría', 404);
        }

        return success(res, {status: true, message: 'Categoría eliminada correctamente'});
    } catch (err) {
        console.error('Error al eliminar categoría:', err);
        return error(res, 'Error al eliminar la categoría', 500);
    }
};
