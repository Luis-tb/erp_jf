const {getDB} = require('../../../config/db');
const {error, success} = require('../../../utils/response');

exports.obtenerProducto = async (req, res) => {
    const db = getDB();
    const {id} = req.params;

    try {
        const [rows] = await db.query(
            `WITH StockTotal AS (SELECT p.id_producto,
                                        SUM(COALESCE(i.cantidad, 0)) AS stock_total,
                                        GROUP_CONCAT(JSON_OBJECT(
                                                'id_almacen', a.id_almacen,
                                                'nombreAlmacen', a.nombre,
                                                'cantidad', COALESCE(i.cantidad, 0)
                                                     ))              AS stocks
                                 FROM productos p
                                          LEFT JOIN inventarios i ON p.id_producto = i.id_producto
                                          LEFT JOIN almacenes a ON i.id_almacen = a.id_almacen
                                 GROUP BY p.id_producto)
             SELECT p.id_producto                            AS codigo_producto,
                    p.nombre,
                    p.um,
                    c.id_categoria,
                    c.nombre                                 AS categoria,
                    st.stock_total                           AS stock,
                    st.stocks,
                    p.precio,
                    p.dias_caducidad,
                    COALESCE(p.stock_minimo, c.stock_minimo) AS stock_minimo
             FROM productos p
                      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                      LEFT JOIN StockTotal st ON p.id_producto = st.id_producto
             WHERE p.id_producto = ?`,
            [id]
        );

        const producto = rows[0];
        if (!producto) return error(res, 'Producto no encontrado', 404);

        producto.stocks = JSON.parse(`[${producto.stocks}]`);
        return success(res, {producto});
    } catch (err) {
        return error(res, 'Error al obtener producto', 500);
    }
};

exports.crearProducto = async (req, res) => {
    const pool = getDB();
    const connection = await pool.getConnection(); // 👈 conexión individual
    const {
        nombre, um, id_categoria, stock_minimo,
        precio, dias_caducidad, stocks = []
    } = req.body;

    if (!nombre || id_categoria == null) {
        return error(res, 'Nombre y categoría son obligatorios.', 400);
    }

    const generarCodigo = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({length: 7}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    try {
        await connection.beginTransaction(); // ✅ funciona con una conexión individual

        let codigo, existe;
        let intentos = 0;
        do {
            if (intentos++ > 10) throw new Error('No se pudo generar un código único');
            codigo = generarCodigo();
            const [rows] = await connection.query(
                'SELECT COUNT(*) AS total FROM productos WHERE id_producto = ?',
                [codigo]
            );
            existe = rows[0].total > 0;
        } while (existe);

        await connection.query(`
                    INSERT INTO productos (id_producto, nombre, um, id_categoria, stock_minimo, precio, dias_caducidad)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [codigo, nombre, um || null, id_categoria, stock_minimo || null, precio || null, dias_caducidad || null]
        );

        for (const s of stocks) {
            if (s.id_almacen && s.cantidad != null) {
                await connection.query(`
                            INSERT INTO inventarios (id_almacen, id_producto, cantidad)
                            VALUES (?, ?, ?)`,
                    [s.id_almacen, codigo, s.cantidad]
                );
            }
        }

        await connection.commit(); // ✅
        connection.release(); // ✅ liberar conexión al pool

        return success(res, {message: 'Producto insertado correctamente', codigo_producto: codigo});

    } catch (err) {
        await connection.rollback(); // ✅
        connection.release(); // ✅ liberar incluso si falla
        console.error('Error al crear producto:', err);
        return error(res, 'No se pudo crear el producto', 500);
    }
};

exports.actualizarProducto = async (req, res) => {
    const pool = getDB();
    const connection = await pool.getConnection();
    const {id} = req.params;
    const {
        nombre, um, id_categoria, stock_minimo,
        precio, dias_caducidad, stocks = []
    } = req.body;

    if (!id || !nombre || id_categoria == null) {
        return error(res, 'Código, nombre y categoría son obligatorios.', 400);
    }

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(`
                    UPDATE productos
                    SET nombre = ?,
                        um = ?,
                        id_categoria = ?,
                        stock_minimo = ?,
                        precio = ?,
                        dias_caducidad = ?
                    WHERE id_producto = ?`,
            [nombre, um || null, id_categoria, stock_minimo || null, precio || null, dias_caducidad || null, id]
        );

        if (result.affectedRows === 0) {
            throw new Error('No se encontró el producto para actualizar');
        }

        for (const s of stocks) {
            if (s.modificado && s.id_almacen && s.cantidad != null) {
                // Verificar si ya existe la entrada en inventarios
                const [rows] = await connection.query(
                    'SELECT COUNT(*) AS total FROM inventarios WHERE id_producto = ? AND id_almacen = ?',
                    [id, s.id_almacen]
                );

                if (rows[0].total > 0) {
                    // Actualizar inventario existente
                    await connection.query(`
                                UPDATE inventarios
                                SET cantidad = ?
                                WHERE id_producto = ?
                                  AND id_almacen = ?`,
                        [s.cantidad, id, s.id_almacen]
                    );
                } else {
                    // Insertar nuevo inventario
                    await connection.query(`
                                INSERT INTO inventarios (id_almacen, id_producto, cantidad)
                                VALUES (?, ?, ?)`,
                        [s.id_almacen, id, s.cantidad]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        return success(res, {message: 'Producto actualizado correctamente', id});

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error al actualizar producto:', err);
        return error(res, err.message || 'Error al actualizar producto', 500);
    }
};
