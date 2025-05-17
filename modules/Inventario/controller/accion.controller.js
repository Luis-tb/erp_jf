const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

exports.accionProducto = async (req, res) => {
    const db = getDB();
    const {id_producto, accion} = req.body;

    if (!id_producto || !accion) {
        return error(res, 'Faltan datos: id_producto o accion', 400);
    }

    try {
        let result;
        if (accion === 'verificar') {
            // Verificar si tiene registros asociados
            const mensaje = await verificarRegistrosAsociados(db, id_producto);
            if (mensaje.length > 0) {
                return success(res, {
                    status: true,
                    message: 'El producto tiene registros asociados.',
                    details: mensaje,
                    actions: ['ocultar', 'cancelar'],
                });
            } else {
                return success(res, {
                    status: true,
                    message: 'El producto no tiene registros asociados.',
                    actions: ['eliminar', 'ocultar', 'cancelar'],
                });
            }
        }

        if (accion === 'ocultar') {
            result = await ocultarProducto(db, id_producto);
            if (result) {
                return success(res, {status: true, message: 'Producto ocultado correctamente.'});
            } else {
                return error(res, 'Error al ocultar el producto', 500);
            }
        }

        if (accion === 'eliminar') {
            result = await eliminarProducto(db, id_producto);
            if (result.status) {
                return success(res, {status: true, message: result.message});
            } else {
                return error(res, result.message, 500);
            }
        }

        if (accion === 'mostrar') {
            result = await mostrarProducto(db, id_producto);
            if (result) {
                return success(res, {status: true, message: 'Producto mostrado correctamente.'});
            } else {
                return error(res, 'Error al mostrar el producto', 500);
            }
        }

        return error(res, 'Acción no válida', 400);
    } catch (err) {
        console.error('Error en la acción del producto:', err);
        return error(res, 'Error al procesar la acción', 500);
    }
};

const verificarRegistrosAsociados = async (db, idProducto) => {
    const tablas = ['detalle_entrada', 'detalle_salida', 'detalle_traslado', 'inventarios'];
    let mensaje = [];
    for (const tabla of tablas) {
        const [result] = await db.query(`SELECT COUNT(*) AS total
                                         FROM ${tabla}
                                         WHERE id_producto = ?`, [idProducto]);
        if (result[0].total > 0) {
            mensaje.push(`El producto tiene registros en la tabla '${tabla}'.`);
        }
    }
    return mensaje;
};

const ocultarProducto = async (db, idProducto) => {
    const [result] = await db.query("UPDATE productos SET estado = 'oculto' WHERE id_producto = ?", [idProducto]);
    return result.affectedRows > 0;
};

const mostrarProducto = async (db, idProducto) => {
    const [result] = await db.query("UPDATE productos SET estado = 'activo' WHERE id_producto = ?", [idProducto]);
    return result.affectedRows > 0;
};


const eliminarProducto = async (db, idProducto) => {
    // Verificar si se puede eliminar
    const mensaje = await verificarRegistrosAsociados(db, idProducto);
    if (mensaje.length > 0) {
        return {
            status: false,
            message: 'No se puede eliminar el producto porque tiene registros asociados.',
            details: mensaje
        };
    }

    const [result] = await db.query('DELETE FROM productos WHERE id_producto = ?', [idProducto]);
    if (result.affectedRows > 0) {
        return {status: true, message: 'Producto eliminado correctamente.'};
    } else {
        return {status: false, message: 'Error al eliminar el producto.'};
    }
};
