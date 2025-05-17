const express = require('express');
const authRouter = express.Router();
const authController = require('../controller/auth.controller');
const auth = require('../../../middlewares/auth');
// Rutas equivalentes a tus PHP
authRouter.get('/refresh-token', authController.refreshToken);
authRouter.post('/login', authController.login);
authRouter.get('/logout', authController.logout);
authRouter.get('/verificar-sesion', auth, authController.verificarSesion);
authRouter.get('/menu', auth, authController.getMenu);
module.exports = authRouter;
