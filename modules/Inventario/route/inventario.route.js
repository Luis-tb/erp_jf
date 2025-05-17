const express = require('express');
const inventarioRouter = express.Router();
const almacenesController = require('../controller/almacenes.controller');
const categoriasController = require("../controller/categorias.controller");
const productosController = require("../controller/productos.controller");
const accionController = require("../controller/accion.controller");
const registroController = require("../controller/registro.controller");
const auth = require('../../../middlewares/auth');

// Rutas equivalentes a tus PHP
inventarioRouter.get('/almacenes', auth, almacenesController.obtenerAlmacenes);
inventarioRouter.post('/almacenes', auth, almacenesController.crearAlmacen);
inventarioRouter.put('/almacenes/:id', auth, almacenesController.editarAlmacen);
inventarioRouter.delete('/almacenes/:id', auth, almacenesController.eliminarAlmacen);

inventarioRouter.get('/categorias', auth, categoriasController.obtenerCategorias);
inventarioRouter.post('/categorias', auth, categoriasController.crearCategoria);
inventarioRouter.put('/categorias/:id_categoria', auth, categoriasController.editarCategoria);
inventarioRouter.delete('/categorias/:id_categoria', auth, categoriasController.eliminarCategoria);

inventarioRouter.post('/filtrarProductos', auth, productosController.filtrarProductos);
inventarioRouter.post('/accion-producto', auth, accionController.accionProducto);

inventarioRouter.get('/producto/:id', auth, registroController.obtenerProducto);
inventarioRouter.post('/producto', auth, registroController.crearProducto);
inventarioRouter.put('/producto/:id', auth, registroController.actualizarProducto);

module.exports = inventarioRouter;
