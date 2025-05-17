const {getDB} = require('../../../config/db');
const bcrypt = require('bcryptjs');
const {success, error} = require('../../../utils/response');
const {registrarAcceso} = require('../service/acceso.service');
const {generarAccessToken, generarRefreshToken, verificarRefreshToken} = require('../service/token.service');

exports.login = async (req, res) => {
    const {username, password} = req.body;
    try {
        if (!username || !password) return error(res, "Username y password son requeridos", 400);

        const [rows] = await getDB().query(`
            SELECT u.dni, u.contrasenia, e.nombre, u.estado
            FROM usuarios u
                     JOIN empleados e ON u.dni = e.dni
            WHERE u.usuario = ?;
        `, [username]);

        if (rows.length === 0) return error(res, "Usuario incorrecto", 401);

        const user = rows[0];
        if (user.estado !== 'activo') return error(res, "El usuario no está activo", 403);

        const passwordCorrecta = await bcrypt.compare(password, user.contrasenia);
        if (!passwordCorrecta) return error(res, "Contraseña incorrecta", 401);

        const payload = {
            dni: user.dni,
            nombre: user.nombre,
            username: username
        };

        const accessToken = generarAccessToken(payload);
        const refreshToken = generarRefreshToken(payload);

        // Enviar refresh token como cookie httpOnly
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });

        // await registrarAcceso(req, payload);
        return success(res, {
            usuario: payload,
            accessToken
        }, "Inicio de sesión exitoso");
    } catch (err) {
        console.error("Error en login:", err);
        return error(res, "Error interno del servidor", 500);
    }
};

exports.logout = (req, res) => {
    res.clearCookie('refreshToken');
    return res.json({status: true, message: "Sesión cerrada correctamente"});
};

exports.refreshToken = (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) {
        return res.status(401).json({status: false, message: "No se envió el refresh token"});
    }

    try {
        const user = verificarRefreshToken(token);

        // Quitar propiedades automáticas del JWT
        const {exp, iat, ...userData} = user;

        const newAccessToken = generarAccessToken(userData);
        return res.json({accessToken: newAccessToken});
    } catch (err) {
        console.error("Error en logout:", err);
        return res.status(403).json({status: false, message: "Refresh token inválido o expirado"});
    }
};


exports.verificarSesion = (req, res) => {
    return res.json({status: true, message: "Token válido", usuario: req.user});
};

exports.getMenu = async (req, res) => {
    try {
        const {dni} = req.user;

        const [rows] = await getDB().query(`
            SELECT s.icono AS icon, s.nombre AS label, s.ruta AS href
            FROM usuarios u
                     JOIN roles_secciones rs ON u.id_rol = rs.id_rol
                     JOIN secciones s ON rs.id_seccion = s.id_seccion
            WHERE u.dni = ?
        `, [dni]);

        if (!rows.length) return res.status(404).json({status: false, message: "Menú vacío"});

        return res.json(rows);
    } catch (err) {
        console.error("Error al obtener el menú:", err);
        return res.status(500).json({status: false, message: "Error interno"});
    }
};
