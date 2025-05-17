const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

// GET: Obtener todos los proveedores
exports.obtenerProveedores = async (req, res) => {
    try {
        const [rows] = await getDB().query(`
            SELECT id_proveedor AS ruc, razon_social, direccion
            FROM proveedores
        `);
        return res.json(rows);
    } catch (err) {
        console.error('Error al obtener proveedores:', err);
        return error(res, 'Error al obtener proveedores', 500);
    }
};

// POST: Insertar nuevo proveedor
exports.crearProveedor = async (req, res) => {
    const {ruc, razon_social, direccion} = req.body;

    if (!ruc?.trim() || !razon_social?.trim()) {
        return error(res, 'El RUC y la razón social son obligatorios', 400);
    }

    try {
        await getDB().query(
            `INSERT INTO proveedores (id_proveedor, razon_social, direccion)
             VALUES (?, ?, ?)`,
            [ruc.trim(), razon_social.trim(), direccion?.trim() || null]
        );

        return success(res, {
            status: true,
            message: 'Proveedor agregado exitosamente'
        });
    } catch (err) {
        console.error('Error al crear proveedor:', err);
        return error(res, 'Error al crear el proveedor', 500);
    }
};

// PUT: Editar proveedor existente
exports.editarProveedor = async (req, res) => {
    const {ruc} = req.params;
    const {razon_social, direccion} = req.body;

    if (!ruc || !razon_social?.trim()) {
        return error(res, 'RUC y razón social son obligatorios', 400);
    }

    try {
        await getDB().query(
            `UPDATE proveedores
             SET razon_social = ?,
                 direccion    = ?
             WHERE id_proveedor = ?`,
            [razon_social.trim(), direccion.trim(), ruc.trim()]
        );

        return success(res, {
            status: true,
            message: 'Proveedor actualizado correctamente'
        });
    } catch (err) {
        console.error('Error al actualizar proveedor:', err);
        return error(res, 'Error al actualizar el proveedor', 500);
    }
};

// DELETE: Eliminar proveedor por ID
exports.eliminarProveedor = async (req, res) => {
    const {ruc} = req.params;
    if (!ruc) {
        return error(res, 'El RUC es obligatorio', 400);
    }

    try {
        const [result] = await getDB().query(
            `DELETE
             FROM proveedores
             WHERE id_proveedor = ?`,
            [ruc]
        );

        if (result.affectedRows === 0) {
            return error(res, 'No se encontró el proveedor', 404);
        }

        return success(res, {
            status: true,
            message: 'Proveedor eliminado correctamente'
        });
    } catch (err) {
        console.error('Error al eliminar proveedor:', err);
        if (err.message.includes('a foreign key constraint')) {
            return error(res, 'No se puede eliminar el proveedor porque tiene registros dependientes', 409);
        }
        return error(res, 'Error al eliminar el proveedor', 500);
    }
};
