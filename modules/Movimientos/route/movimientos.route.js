const express = require('express');
const inventarioRouter = express.Router();
const zonasController = require('../controller/zonas.controller');
const proveedoresController = require('../controller/proveedores.controller');
const movimientosController = require('../controller/movimientos.controller');
const trasladosController = require('../controller/traslados.controller');
const entradasController = require('../controller/entradas.controller');
const salidasController = require('../controller/salidas.controller');
const {listarMovimientos} = require("../controller/listarMovimientos.controller");

// Rutas equivalentes a tus PHP
inventarioRouter.get('/zonas', zonasController.obtenerZonas);
inventarioRouter.post('/zonas', zonasController.crearZona);
inventarioRouter.put('/zonas/:id', zonasController.editarZona);
inventarioRouter.delete('/zonas/:id', zonasController.eliminarZona);

inventarioRouter.get('/proveedores', proveedoresController.obtenerProveedores);
inventarioRouter.post('/proveedores', proveedoresController.crearProveedor);
inventarioRouter.put('/proveedores/:ruc', proveedoresController.editarProveedor);
inventarioRouter.delete('/proveedores/:ruc', proveedoresController.eliminarProveedor);

inventarioRouter.get('/almacenes', movimientosController.obtenerAlmacenes);
inventarioRouter.get('/equipos', movimientosController.obtenerEquipos);
inventarioRouter.get('/empleados', movimientosController.obtenerEmpleados);
inventarioRouter.get('/productos/:id_almacen', movimientosController.obtenerProductos);

inventarioRouter.post('/movimientos', listarMovimientos);

inventarioRouter.post('/traslados', trasladosController.registrarTraslado)
inventarioRouter.delete('/traslados', trasladosController.devolverTraslado)

inventarioRouter.post('/entradas', entradasController.registrarEntrada)
inventarioRouter.delete('/entradas', entradasController.devolverEntrada)

inventarioRouter.post('/salidas', salidasController.registrarSalida)
inventarioRouter.delete('/salidas', salidasController.devolverSalida)

module.exports = inventarioRouter;
