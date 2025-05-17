// middlewares/authMiddleware.js
const {verificarAccessToken} = require('../modules/Sesion/service/token.service');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({status: false, message: 'Token de acceso no proporcionado'});
    }

    const token = authHeader.split(' ')[1];

    try {
        // Access token
        req.user = verificarAccessToken(token); // DNI, username, etc.
        next();
    } catch (err) {
        return res.status(404).json({status: false, message: 'Token inválido o expirado'});
    }
};
