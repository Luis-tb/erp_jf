const express = require('express');
const authRouter = require('../modules/Sesion/route/auth.route');
const inventarioRouter = require('../modules/Inventario/route/inventario.route');
const movimientosRouter = require('../modules/Movimientos/route/movimientos.route');
const usuariosRouter = require('../modules/Usuarios/route/usuarios.route');
const auth = require('../middlewares/auth');
const verificarPermisos = require('../middlewares/verificarPermisos');

const router = express.Router();

router.use('/auth', authRouter);          // /auth/login, /auth/logout

router.use('/inventario', auth, verificarPermisos, inventarioRouter);
router.use('/movimientos', auth, verificarPermisos, movimientosRouter);
router.use('/usuarios', auth, verificarPermisos, usuariosRouter);

module.exports = router;
