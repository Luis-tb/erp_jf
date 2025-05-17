const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

exports.registrarTraslado = async (req, res) => {
    const data = req.body;

    if (!data || typeof data !== 'object') {
        return error(res, "No se recibieron datos.", 400);
    }

    const {
        fecha,
        n_requerimiento,
        id_almacen_origen,
        id_almacen_destino,
        id_autorizado,
        id_despachado,
        productos
    } = data;

    const id_procesado = req.user.dni;

    if (!fecha?.trim()) return error(res, "La fecha del traslado es obligatoria.", 400);
    if (!n_requerimiento?.trim()) return error(res, "El número de requerimiento es obligatorio.", 400);
    if (!id_almacen_origen) return error(res, "El almacén de origen es obligatorio.", 400);
    if (!id_almacen_destino) return error(res, "El almacén de destino es obligatorio.", 400);
    if (!Array.isArray(productos) || productos.length === 0)
        return error(res, "Debe proporcionar al menos un producto en el traslado.", 400);

    const conn = await getDB().getConnection();
    await conn.beginTransaction();

    try {
        // Insertar traslado
        const [trasladoRes] = await conn.execute(`
                    INSERT INTO traslados (codigo_operacion, n_requerimiento, id_almacen_origen,
                                           id_almacen_destino, id_autorizado, id_despachado, id_procesado, fecha)
                    VALUES ('03', ?, ?, ?, ?, ?, ?, ?)`,
            [n_requerimiento.trim(), id_almacen_origen, id_almacen_destino, id_autorizado, id_despachado, id_procesado, fecha.trim()]
        );

        const id_traslado = trasladoRes.insertId;

        for (const producto of productos) {
            const {id_producto, cantidad} = producto;
            if (!id_producto || !cantidad) {
                throw new Error("Cada producto debe tener un ID y una cantidad válida.");
            }

            // Verificar stock en origen
            const [stockRows] = await conn.execute(`
                        SELECT cantidad
                        FROM inventarios
                        WHERE id_almacen = ?
                          AND id_producto = ?`,
                [id_almacen_origen, id_producto]
            );
            const stock_origen = stockRows[0]?.cantidad;

            if (stock_origen == null || stock_origen < cantidad) {
                throw new Error(`Stock insuficiente para el producto ${id_producto}. Disponible: ${stock_origen}, Requerido: ${cantidad}`);
            }

            // Insertar detalle traslado
            await conn.execute(`
                INSERT INTO detalle_traslado (id_traslado, id_producto, cantidad)
                VALUES (?, ?, ?)`, [id_traslado, id_producto, cantidad]
            );

            // Actualizar stock en origen
            await conn.execute(`
                        UPDATE inventarios
                        SET cantidad = cantidad - ?
                        WHERE id_almacen = ?
                          AND id_producto = ?`,
                [cantidad, id_almacen_origen, id_producto]
            );

            // Verificar si producto existe en destino
            const [destRows] = await conn.execute(`
                        SELECT cantidad
                        FROM inventarios
                        WHERE id_almacen = ?
                          AND id_producto = ?`,
                [id_almacen_destino, id_producto]
            );

            if (destRows.length > 0) {
                // Aumentar stock en destino
                await conn.execute(`
                            UPDATE inventarios
                            SET cantidad = cantidad + ?
                            WHERE id_almacen = ?
                              AND id_producto = ?`,
                    [cantidad, id_almacen_destino, id_producto]
                );
            } else {
                // Insertar producto nuevo en destino
                await conn.execute(`
                            INSERT INTO inventarios (id_almacen, id_producto, cantidad)
                            VALUES (?, ?, ?)`,
                    [id_almacen_destino, id_producto, cantidad]
                );
            }
        }

        await conn.commit();
        conn.release();

        return success(res, {status: true, message: "Traslado registrado correctamente."});
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("Error en traslado:", err);
        return error(res, err.message, 500);
    }
};

exports.devolverTraslado = async (req, res) => {
    const {id, observacion} = req.body;
    const id_usuario = req.user.dni;
    if (!id || !id_usuario) {
        return error(res, "ID de traslado y usuario procesador son obligatorios.", 400);
    }

    const conn = await getDB().getConnection();
    await conn.beginTransaction();

    try {
        // Verificar traslado activo
        const [trasladoRows] = await conn.execute(`
                    SELECT id_almacen_origen, id_almacen_destino
                    FROM traslados
                    WHERE id_traslado = ?
                      AND codigo_operacion = '03'`,
            [id]
        );
        if (trasladoRows.length === 0) {
            throw new Error("No se encontró un traslado activo para devolver.");
        }

        const {id_almacen_origen, id_almacen_destino} = trasladoRows[0];

        // Obtener productos del traslado
        const [productos] = await conn.execute(`
                    SELECT id_producto, cantidad
                    FROM detalle_traslado
                    WHERE id_traslado = ?`,
            [id]
        );

        // Revertir el traslado
        for (const {id_producto, cantidad} of productos) {
            // Restar del destino
            const [destRows] = await conn.execute(`
                        SELECT cantidad
                        FROM inventarios
                        WHERE id_almacen = ?
                          AND id_producto = ? FOR
                        UPDATE`,
                [id_almacen_destino, id_producto]
            );

            const stock_destino = destRows[0]?.cantidad;
            if (stock_destino == null || stock_destino < cantidad) {
                throw new Error(`Stock insuficiente para revertir producto ${id_producto} en el almacén destino.`);
            }

            await conn.execute(`
                        UPDATE inventarios
                        SET cantidad = cantidad - ?
                        WHERE id_almacen = ?
                          AND id_producto = ?`,
                [cantidad, id_almacen_destino, id_producto]
            );

            // Sumar al origen
            const [origenRows] = await conn.execute(`
                        SELECT cantidad
                        FROM inventarios
                        WHERE id_almacen = ?
                          AND id_producto = ? FOR
                        UPDATE`,
                [id_almacen_origen, id_producto]
            );

            if (origenRows.length > 0) {
                await conn.execute(`
                            UPDATE inventarios
                            SET cantidad = cantidad + ?
                            WHERE id_almacen = ?
                              AND id_producto = ?`,
                    [cantidad, id_almacen_origen, id_producto]
                );
            } else {
                await conn.execute(`
                            INSERT INTO inventarios (id_almacen, id_producto, cantidad)
                            VALUES (?, ?, ?)`,
                    [id_almacen_origen, id_producto, cantidad]
                );
            }
        }

        // Marcar traslado como devuelto
        await conn.execute(`
                    UPDATE traslados
                    SET codigo_operacion = '04',
                        observacion      = ?,
                        id_procesado     = ?
                    WHERE id_traslado = ?`,
            [observacion || null, id_usuario, id]
        );

        await conn.commit();
        conn.release();
        return success(res, {status: true, message: "Traslado devuelto correctamente."});

    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("Error en devolución de traslado:", err);
        return error(res, err.message || "Error interno", 500);
    }
};
