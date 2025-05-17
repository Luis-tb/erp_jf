// app.js
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const router = require('./routes/index.routes');
const cookieParser = require('cookie-parser');
const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:5173', // ajusta si usas otro puerto o dominio
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/', router);


module.exports = app;
