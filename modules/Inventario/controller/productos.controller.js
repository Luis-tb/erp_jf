const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

exports.filtrarProductos = async (req, res) => {
    const db = getDB();
    const data = req.body;
    const viewMode = data.view_mode || 'summary';
    const visualizacion = data.visibilidad || 'activo';
    const params = [visualizacion];
    const clauses = ['p.estado LIKE ?'];
    // Búsqueda por nombre o ID
    if (data.busqueda) {
        clauses.push('(p.nombre LIKE ? OR p.id_producto LIKE ?)');
        const like = `%${data.busqueda}%`;
        params.push(like, like);
    }

    if (data.categoria) {
        clauses.push('c.id_categoria = ?');
        params.push(data.categoria);
    }

    if (data.almacen) {
        if (viewMode === 'detailed') {
            clauses.push('a.id_almacen = ?');
        } else {
            clauses.push(`EXISTS (
                SELECT 1 FROM inventarios i 
                WHERE i.id_producto = p.id_producto 
                AND i.id_almacen = ?
            )`);
        }
        params.push(data.almacen);
    }

    if (data.precioMin) {
        clauses.push('p.precio >= ?');
        params.push(data.precioMin);
    }

    if (data.precioMax) {
        clauses.push('p.precio <= ?');
        params.push(data.precioMax);
    }

    let sql = '';
    if (viewMode === 'detailed') {
        sql = `
            SELECT p.id_producto                            AS codigo_producto,
                   p.nombre                                 AS nombre_producto,
                   c.id_categoria,
                   c.nombre                                 AS categoria,
                   i.cantidad                               AS stock,
                   a.id_almacen,
                   a.nombre                                 AS almacen,
                   p.precio,
                   COALESCE(p.stock_minimo, c.stock_minimo) AS stock_minimo,
                   p.estado
            FROM productos p
                     LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                     LEFT JOIN inventarios i ON p.id_producto = i.id_producto
                     LEFT JOIN almacenes a ON i.id_almacen = a.id_almacen
            WHERE ${clauses.join(' AND ')}
        `;

        // Filtro de estado de stock
        if (data.estado_stock) {
            const stockCondition = `
                AND (
                    ${data.estado_stock === 'bajo' ? 'i.cantidad < COALESCE(p.stock_minimo, c.stock_minimo)' : ''}
                    ${data.estado_stock === 'medio' ? 'i.cantidad >= COALESCE(p.stock_minimo, c.stock_minimo) AND i.cantidad <= COALESCE(p.stock_minimo, c.stock_minimo) * 1.25' : ''}
                    ${data.estado_stock === 'alto' ? 'i.cantidad > COALESCE(p.stock_minimo, c.stock_minimo) * 1.25' : ''}
                )
            `;
            sql += stockCondition;
        }

    } else {
        // Summary mode con stock agrupado por almacén
        sql = `
            WITH StockTotal AS (SELECT p.id_producto,
                                       SUM(COALESCE(i.cantidad, 0)) AS stock_total,
                                       GROUP_CONCAT(
                                               JSON_OBJECT(
                                                       'almacen', COALESCE(a.nombre, 'Sin almacén'),
                                                       'cantidad', COALESCE(i.cantidad, 0)
                                               )
                                               SEPARATOR ','
                                       )                            AS stocks_por_almacen
                                FROM productos p
                                         LEFT JOIN inventarios i ON p.id_producto = i.id_producto
                                         LEFT JOIN almacenes a ON i.id_almacen = a.id_almacen
                                GROUP BY p.id_producto)
            SELECT p.id_producto                            AS codigo_producto,
                   p.nombre                                 AS nombre_producto,
                   c.id_categoria,
                   c.nombre                                 AS categoria,
                   st.stock_total                           AS stock,
                   st.stocks_por_almacen,
                   p.precio,
                   COALESCE(p.stock_minimo, c.stock_minimo) AS stock_minimo,
                   p.estado
            FROM productos p
                     LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                     LEFT JOIN StockTotal st ON p.id_producto = st.id_producto
            WHERE ${clauses.join(' AND ')}
        `;
    }

    // Ordenamiento
    const orderByMap = {
        nombre_asc: 'p.nombre ASC',
        nombre_desc: 'p.nombre DESC',
        precio_asc: 'p.precio ASC',
        precio_desc: 'p.precio DESC',
        stock_asc: viewMode === 'detailed' ? 'i.cantidad ASC' : 'stock_total ASC',
        stock_desc: viewMode === 'detailed' ? 'i.cantidad DESC' : 'stock_total DESC',
    };
    sql += ` ORDER BY ${orderByMap[data.orderBy] || 'p.nombre ASC'}`;

    try {
        const [rows] = await db.query(sql, params);
        const productos = await Promise.all(rows.map(async row => {
            const stock = row.stock ?? 0;
            const stockMin = row.stock_minimo ?? 0;

            if (stock < stockMin) {
                row.estado_stock = 'bajo';
            } else if (stock <= stockMin * 1.25) {
                row.estado_stock = 'medio';
            } else {
                row.estado_stock = 'alto';
            }

            if (viewMode !== 'detailed' && row.stocks_por_almacen) {
                try {
                    row.stocks_por_almacen = JSON.parse(`[${row.stocks_por_almacen}]`).map(alm => {
                        const cantidad = alm.cantidad;
                        alm.estado_stock =
                            cantidad < stockMin
                                ? 'bajo'
                                : cantidad <= stockMin * 1.25
                                    ? 'medio'
                                    : 'alto';
                        return alm;
                    });
                } catch {
                    row.stocks_por_almacen = [];
                }
            }

            const tieneAsociados = await verificarRegistrosAsociados(db, row.codigo_producto);
            row.accion = tieneAsociados ? 'ocultar' : 'ocultar_eliminar';

            return row;
        }));


        return success(res, {status: true, data: productos});
    } catch (err) {
        console.error('Error al filtrar productos:', err);
        return error(res, 'Error al filtrar productos', 500);
    }
};
const verificarRegistrosAsociados = async (db, idProducto) => {
    const tablas = ['detalle_entrada', 'detalle_salida', 'detalle_traslado'];
    for (const tabla of tablas) {
        const [result] = await db.query(
            `SELECT COUNT(*) AS total
             FROM ${tabla}
             WHERE id_producto = ?`,
            [idProducto]
        );
        if (result[0].total > 0) {
            return true; // Tiene registros asociados
        }
    }
    return false; // No tiene registros asociados
};
