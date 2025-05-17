const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

exports.registrarEntrada = async (req, res) => {
    const data = req.body;

    const {
        n_requerimiento,
        id_almacen_destino,
        id_proveedor,
        id_transportista,
        observacion,
        fecha,
        productos
    } = data;
    const id_procesado = req.user.dni;
    // Validación de campos
    if (!n_requerimiento) return error(res, "El número de requerimiento es obligatorio.", 400);
    if (!id_almacen_destino) return error(res, "El almacén es obligatorio.", 400);
    if (!id_proveedor) return error(res, "El proveedor es obligatorio.", 400);
    if (!fecha) return error(res, "La fecha es obligatoria.", 400);
    if (!Array.isArray(productos) || productos.length === 0)
        return error(res, "Debe proporcionar al menos un detalle de entrada.", 400);

    const conn = await getDB().getConnection();
    await conn.beginTransaction();

    try {
        // Registrar cabecera de entrada
        const [entradaRes] = await conn.execute(`
                    INSERT INTO entradas (codigo_operacion, n_requerimiento, id_proveedor, id_almacen,
                                          id_transportista, fecha, id_procesado, observacion_entrada)
                    VALUES ('01', ?, ?, ?, ?, ?, ?, ?)`,
            [n_requerimiento, id_proveedor, id_almacen_destino, id_transportista, fecha, id_procesado, observacion]
        );

        const id_entrada = entradaRes.insertId;

        // Procesar cada producto en los detalles
        for (const detalle of productos) {
            const {id_producto, cantidad} = detalle;

            if (!id_producto || cantidad <= 0) {
                throw new Error("Cada detalle debe tener un ID de producto y una cantidad válida.");
            }

            // Verificar si el producto ya existe en el inventario del almacén
            const [stockRows] = await conn.execute(`
                        SELECT cantidad
                        FROM inventarios
                        WHERE id_almacen = ?
                          AND id_producto = ? FOR
                        UPDATE`,
                [id_almacen_destino, id_producto]
            );
            const stock_actual = stockRows[0]?.cantidad || 0;

            // Actualizar o insertar producto en el inventario
            if (stock_actual === 0) {
                // Si no existe el producto, insertarlo
                await conn.execute(`
                            INSERT INTO inventarios (id_almacen, id_producto, cantidad)
                            VALUES (?, ?, ?)`,
                    [id_almacen_destino, id_producto, cantidad]
                );
            } else {
                // Si existe, actualizar el stock
                await conn.execute(`
                            UPDATE inventarios
                            SET cantidad = cantidad + ?
                            WHERE id_almacen = ?
                              AND id_producto = ?`,
                    [cantidad, id_almacen_destino, id_producto]
                );
            }

            // Insertar detalle de entrada
            await conn.execute(`
                        INSERT INTO detalle_entrada (id_entrada, id_producto, cantidad)
                        VALUES (?, ?, ?)`,
                [id_entrada, id_producto, cantidad]
            );
        }

        // Confirmar la transacción
        await conn.commit();
        conn.release();

        return success(res, {status: true, message: "Entrada registrada correctamente."});
    } catch (err) {
        // Rollback en caso de error
        await conn.rollback();
        conn.release();
        console.error("Error en registro de entrada:", err);
        return error(res, err.message, 500);
    }
};

exports.devolverEntrada = async (req, res) => {
    const {id, observacion} = req.body;
    const id_usuario = req.user.dni;
    if (!id || !id_usuario) {
        return error(res, "ID de entrada y usuario procesador son obligatorios.", 400);
    }

    const conn = await getDB().getConnection();
    await conn.beginTransaction();

    try {
        // Verificar entrada válida
        const [entradaRows] = await conn.execute(`
                    SELECT id_almacen
                    FROM entradas
                    WHERE id_entrada = ?
                      AND codigo_operacion = '01'`,
            [id]
        );
        if (entradaRows.length === 0) {
            throw new Error("No se encontró una entrada activa para devolver.");
        }

        const id_almacen = entradaRows[0].id_almacen;

        // Obtener detalles de entrada
        const [detalles] = await conn.execute(`
                    SELECT id_producto, cantidad
                    FROM detalle_entrada
                    WHERE id_entrada = ?`,
            [id]
        );

        // Restar inventario
        for (const {id_producto, cantidad} of detalles) {
            const [stockRows] = await conn.execute(`
                        SELECT cantidad
                        FROM inventarios
                        WHERE id_almacen = ?
                          AND id_producto = ? FOR
                        UPDATE`,
                [id_almacen, id_producto]
            );

            const stock_actual = stockRows[0]?.cantidad;

            if (stock_actual == null || stock_actual < cantidad) {
                throw new Error(`Stock insuficiente para devolver el producto ${id_producto}.`);
            }

            await conn.execute(`
                        UPDATE inventarios
                        SET cantidad = cantidad - ?
                        WHERE id_almacen = ?
                          AND id_producto = ?`,
                [cantidad, id_almacen, id_producto]
            );
        }

        // Marcar la entrada como devuelta
        await conn.execute(`
                    UPDATE entradas
                    SET codigo_operacion    = '04',
                        observacion_entrada = ?,
                        id_procesado        = ?
                    WHERE id_entrada = ?`,
            [observacion || null, id_usuario, id]
        );

        await conn.commit();
        conn.release();
        return success(res, {status: true, message: "Entrada devuelta correctamente."});

    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("Error en devolución de entrada:", err);
        return error(res, err.message || "Error interno", 500);
    }
};
