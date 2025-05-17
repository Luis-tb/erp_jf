const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

exports.registrarSalida = async (req, res) => {
    const data = req.body;

    if (!data || typeof data !== 'object') {
        return error(res, "No se recibieron datos válidos.", 400);
    }

    const {
        fecha,
        n_requerimiento,
        id_almacen_origen,
        id_zona,
        id_equipo,
        id_solicitante,
        id_autorizado,
        id_despachado,
        productos
    } = data;
    const id_procesado = req.user.dni;
    if (!n_requerimiento || !id_almacen_origen || !fecha || !Array.isArray(productos) || productos.length === 0) {
        return error(res, "Todos los campos y al menos un producto son requeridos.", 400);
    }

    const conn = await getDB().getConnection();
    await conn.beginTransaction();

    try {
        // Insertar cabecera de salida
        const [salidaRes] = await conn.execute(`
            INSERT INTO salidas (codigo_operacion, n_requerimiento, id_almacen, id_zona, id_equipo,
                                 id_solicitante, id_autorizado, id_despachado, id_procesado, fecha)
            VALUES ('02', ?, ?, ?, ?, ?, ?, ?, ?,
                    ?)`, [n_requerimiento, id_almacen_origen, id_zona, id_equipo, id_solicitante, id_autorizado, id_despachado, id_procesado, fecha]);

        const id_salida = salidaRes.insertId;

        for (const detalle of productos) {
            const {id_producto, cantidad} = detalle;

            if (!id_producto || cantidad <= 0) {
                throw new Error("Cada detalle debe incluir un producto y una cantidad válida.");
            }

            // Verificar stock disponible
            const [stockRows] = await conn.execute(`
                SELECT cantidad
                FROM inventarios
                WHERE id_almacen = ?
                  AND id_producto = ? FOR
                UPDATE`, [id_almacen_origen, id_producto]);

            const stock_actual = stockRows[0]?.cantidad;

            if (stock_actual == null || stock_actual < cantidad) {
                throw new Error(`Stock insuficiente para el producto ${id_producto}.`);
            }

            // Actualizar inventario (restar)
            await conn.execute(`
                UPDATE inventarios
                SET cantidad = cantidad - ?
                WHERE id_almacen = ?
                  AND id_producto = ?`, [cantidad, id_almacen_origen, id_producto]);

            // Insertar detalle de salida
            await conn.execute(`
                INSERT INTO detalle_salida (id_salida, id_producto, cantidad)
                VALUES (?, ?, ?)`, [id_salida, id_producto, cantidad]);
        }

        await conn.commit();
        conn.release();
        return success(res, {status: true, message: "Salida registrada correctamente."});
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("Error al registrar salida:", err);
        return error(res, err.message, 500);
    }
};

exports.devolverSalida = async (req, res) => {
    const {id, observacion} = req.body;
    const id_usuario = req.user.dni;
    if (!id || !id_usuario) {
        return error(res, "ID de salida y usuario procesador son obligatorios.", 400);
    }

    const conn = await getDB().getConnection();
    await conn.beginTransaction();

    try {
        // Verificar salida existente
        const [salidaRows] = await conn.execute(`
            SELECT id_almacen
            FROM salidas
            WHERE id_salida = ?
              AND codigo_operacion = '02'`, [id]);
        if (salidaRows.length === 0) {
            throw new Error("No se encontró una salida activa para devolver.");
        }

        const id_almacen = salidaRows[0].id_almacen;

        // Obtener detalles
        const [detalles] = await conn.execute(`
            SELECT id_producto, cantidad
            FROM detalle_salida
            WHERE id_salida = ?`, [id]);

        // Revertir inventario
        for (const item of detalles) {
            const {id_producto, cantidad} = item;

            // Verificar existencia
            const [stockRows] = await conn.execute(`
                SELECT cantidad
                FROM inventarios
                WHERE id_almacen = ?
                  AND id_producto = ? FOR
                UPDATE`, [id_almacen, id_producto]);

            if (stockRows.length > 0) {
                await conn.execute(`
                    UPDATE inventarios
                    SET cantidad = cantidad + ?
                    WHERE id_almacen = ?
                      AND id_producto = ?`, [cantidad, id_almacen, id_producto]);
            } else {
                await conn.execute(`
                    INSERT INTO inventarios (id_almacen, id_producto, cantidad)
                    VALUES (?, ?, ?)`, [id_almacen, id_producto, cantidad]);
            }
        }

        // Actualizar cabecera de salida
        await conn.execute(`
            UPDATE salidas
            SET codigo_operacion = '04',
                observacion      = ?,
                id_procesado     = ?
            WHERE id_salida = ?`, [observacion || null, id_usuario, id]);

        await conn.commit();
        conn.release();
        return success(res, {status: true, message: "Salida devuelta correctamente."});

    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("Error en devolución:", err);
        return error(res, err.message || "Error interno", 500);
    }
};
