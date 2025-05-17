const {getDB} = require('../../../config/db');
const {success, error} = require('../../../utils/response');

exports.listarMovimientos = async (req, res) => {
    const db = getDB();
    const {
        page = 1,
        limit = 10,
        fechaDesde,
        fechaHasta,
        tipoMovimiento,
        codigoOperacion,
        idAlmacen,
        busquedaProducto,
        busquedaUsuario,
        busquedaRequerimiento
    } = req.body;

    const offset = (page - 1) * limit;

    try {
        // Subconsulta base
        let baseQuery = `
            SELECT *
            FROM (SELECT e.id_entrada AS id_movimiento,
                         'entrada'    AS tipo_movimiento,
                         e.codigo_operacion,
                         e.fecha,
                         e.n_requerimiento,
                         e.id_almacen,
                         a.nombre     AS nombre_almacen,
                         e.id_procesado,
                         emp.nombre   AS nombre_usuario,
                         e.observacion,
                         JSON_ARRAYAGG(
                                 JSON_OBJECT(
                                         'id', p.id_producto,
                                         'nombre', p.nombre,
                                         'cantidad', de.cantidad,
                                         'um', p.um
                                 )
                         )            AS productos
                  FROM entradas e
                           JOIN almacenes a ON e.id_almacen = a.id_almacen
                           JOIN empleados emp ON e.id_procesado = emp.dni
                           JOIN detalle_entrada de ON e.id_entrada = de.id_entrada
                           JOIN productos p ON de.id_producto = p.id_producto
                  GROUP BY e.id_entrada

                  UNION ALL

                  SELECT s.id_salida AS id_movimiento,
                         'salida'    AS tipo_movimiento,
                         s.codigo_operacion,
                         s.fecha,
                         s.n_requerimiento,
                         s.id_almacen,
                         a.nombre    AS nombre_almacen,
                         s.id_procesado,
                         emp.nombre  AS nombre_usuario,
                         s.observacion,
                         JSON_ARRAYAGG(
                                 JSON_OBJECT(
                                         'id', p.id_producto,
                                         'nombre', p.nombre,
                                         'cantidad', ds.cantidad,
                                         'um', p.um
                                 )
                         )
                  FROM salidas s
                           JOIN almacenes a ON s.id_almacen = a.id_almacen
                           JOIN empleados emp ON s.id_procesado = emp.dni
                           JOIN detalle_salida ds ON s.id_salida = ds.id_salida
                           JOIN productos p ON ds.id_producto = p.id_producto
                  GROUP BY s.id_salida

                  UNION ALL

                  SELECT t.id_traslado       AS id_movimiento,
                         'traslado'          AS tipo_movimiento,
                         t.codigo_operacion,
                         t.fecha,
                         t.n_requerimiento,
                         t.id_almacen_origen AS id_almacen,
                         CONCAT(ao.nombre, ' ➝ ', ad.nombre) AS nombre_almacen,
                         t.id_procesado,
                         emp.nombre          AS nombre_usuario,
                         t.observacion,
                         JSON_ARRAYAGG(
                                 JSON_OBJECT(
                                         'id', p.id_producto,
                                         'nombre', p.nombre,
                                         'cantidad', dt.cantidad,
                                         'um', p.um
                                 )
                         ) AS productos
                  FROM traslados t
                           JOIN almacenes ao ON t.id_almacen_origen = ao.id_almacen
                           JOIN almacenes ad ON t.id_almacen_destino = ad.id_almacen
                           JOIN empleados emp ON t.id_procesado = emp.dni
                           JOIN detalle_traslado dt ON t.id_traslado = dt.id_traslado
                           JOIN productos p ON dt.id_producto = p.id_producto
                  GROUP BY t.id_traslado
                 ) AS movimientos
            WHERE 1 = 1
        `;

        const params = [];

        if (fechaDesde) {
            baseQuery += ` AND fecha >= ?`;
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            baseQuery += ` AND fecha <= ?`;
            params.push(fechaHasta);
        }

        if (tipoMovimiento) {
            baseQuery += ` AND tipo_movimiento = ?`;
            params.push(tipoMovimiento);
        }

        if (codigoOperacion) {
            baseQuery += ` AND codigo_operacion = ?`;
            params.push(codigoOperacion);
        }

        if (idAlmacen) {
            baseQuery += ` AND id_almacen = ?`;
            params.push(idAlmacen);
        }

        if (busquedaUsuario) {
            baseQuery += ` AND LOWER(nombre_usuario) LIKE ?`;
            params.push(`%${busquedaUsuario.toLowerCase()}%`);
        }

        if (busquedaRequerimiento) {
            baseQuery += ` AND LOWER(n_requerimiento) LIKE ?`;
            params.push(`%${busquedaRequerimiento.toLowerCase()}%`);
        }

        if (busquedaProducto) {
            baseQuery += ` AND JSON_SEARCH(LOWER(productos), 'all', ?) IS NOT NULL`;
            params.push(`%${busquedaProducto.toLowerCase()}%`);
        }

        // Total sin paginación
        const [totalRows] = await db.query(`SELECT COUNT(*) AS total
                                            FROM (${baseQuery}) AS total_filtrado`, params);
        const total = totalRows[0].total;

        // Agregar paginación
        baseQuery += ` ORDER BY fecha DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.query(baseQuery, params);

        return success(res, {
            data: rows,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (err) {
        console.error('Error en listado de movimientos filtrado:', err);
        return error(res, 'Error al listar movimientos con filtros', 500);
    }
};
