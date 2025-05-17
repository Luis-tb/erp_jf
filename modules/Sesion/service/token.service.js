require('dotenv').config();
const jwt = require('jsonwebtoken');

function generarAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN
    });
}

function generarRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
    });
}

function verificarAccessToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}

function verificarRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
    generarAccessToken,
    generarRefreshToken,
    verificarAccessToken,
    verificarRefreshToken
};
