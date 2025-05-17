const express = require('express');
const usuariosRouter = express.Router();
const cargosController = require('../controller/cargos.controller');
const rolesController = require('../controller/roles.controller');
const empleadosController = require('../controller/empleados.controller');
const usuariosController = require('../controller/usuarios.controller');
// Rutas equivalentes a tus PHP
usuariosRouter.get('/cargos', cargosController.obtenerCargos);
usuariosRouter.post('/cargos', cargosController.crearCargo);
usuariosRouter.put('/cargos/:id_cargo', cargosController.editarCargo);
usuariosRouter.delete('/cargos/:id_cargo', cargosController.eliminarCargo);

usuariosRouter.get('/roles', rolesController.obtenerRoles);
usuariosRouter.post('/roles', rolesController.crearRol);
usuariosRouter.put('/roles/:id_rol', rolesController.editarRol);
usuariosRouter.delete('/roles/:id_rol', rolesController.eliminarRol);

usuariosRouter.get('/empleados', empleadosController.obtenerEmpleados);
usuariosRouter.post('/empleados', empleadosController.crearEmpleado);
usuariosRouter.put('/empleados/:dni', empleadosController.editarEmpleado);
usuariosRouter.delete('/empleados/:dni', empleadosController.eliminarEmpleado);

usuariosRouter.get('/usuarios', usuariosController.obtenerUsuarios);
usuariosRouter.post('/usuarios', usuariosController.crearUsuario);
usuariosRouter.put('/usuarios/:dni', usuariosController.editarUsuario);
usuariosRouter.delete('/usuarios/:dni', usuariosController.eliminarUsuario);

module.exports = usuariosRouter;
