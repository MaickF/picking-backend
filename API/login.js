// API/login.js
const express = require('express');
const router = express.Router();
const loginHandler = require('../Functions/loginHandler');

// Ruta raíz del subrouter
router.post('/', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
        }

        const result = await loginHandler.loginWithCredentials(email, password);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Credenciales inválidas' });
    }
});

module.exports = router;
