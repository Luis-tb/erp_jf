const {getDB} = require('../../../config/db');
const {error} = require('../../../utils/response');

// GET: Obtener todos los almacenes y su cantidad de productos
exports.obtenerAlmacenes = async (req, res) => {
    try {
        const [rows] = await getDB().query(`
            SELECT a.id_almacen, a.nombre, a.ubicacion
            FROM almacenes a
        `);
        return res.json(rows);
    } catch (err) {
        console.error('Error al obtener almacenes:', err);
        return error(res, 'Error al obtener almacenes', 500);
    }
};

exports.obtenerEmpleados = async (req, res) => {
    try {
        const [rows] = await getDB().query(`
            SELECT e.dni, UPPER(e.nombre) AS nombre, UPPER(c.nombre) AS cargo
            FROM empleados e
                     LEFT JOIN cargos c ON e.id_cargo = c.id_cargo
        `);
        return res.json(rows); // O puedes usar: success(res, { data: rows });
    } catch (err) {
        console.error('Error al obtener empleados:', err);
        return error(res, 'Error al obtener empleados', 500);
    }
};

exports.obtenerEquipos = async (req, res) => {
    try {
        const [rows] = await getDB().query(`
            SELECT e.id_equipo, e.descripcion, e.placa
            FROM equipos e
        `);
        return res.json(rows); // O usa: success(res, { data: rows });
    } catch (err) {
        console.error('Error al obtener equipos:', err);
        return error(res, 'Error al obtener equipos', 500);
    }
};

exports.obtenerProductos = async (req, res) => {
    const {id_almacen} = req.params;

    try {
        let query;
        let params = [];

        if (id_almacen !== undefined && id_almacen !== null && id_almacen !== '' && id_almacen !== 'undefined') {
            // productos por almacén específico
            query = `
                SELECT p.id_producto,
                       UPPER(p.nombre) AS nombre,
                       i.cantidad      AS stock
                FROM productos p
                         LEFT JOIN inventarios i ON p.id_producto = i.id_producto
                         LEFT JOIN almacenes a ON i.id_almacen = a.id_almacen
                WHERE p.estado = 'activo'
                  AND i.cantidad > 0
                  AND a.id_almacen = ?
            `;
            params.push(id_almacen);
        } else {
            // todos los productos
            query = `
                SELECT p.id_producto,
                       UPPER(p.nombre) AS nombre,
                       p.precio
                FROM productos p
                WHERE p.estado = 'activo'
            `;
        }

        const [rows] = await getDB().query(query, params);
        return res.json(rows);
    } catch (err) {
        console.error('Error al obtener productos:', err);
        return error(res, 'Error al obtener productos', 500);
    }
};
