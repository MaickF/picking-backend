const express = require('express');
const router = express.Router();
const { registerUser } = require('../Functions/UserRegistration');

router.post('/', async (req, res) => {
    try {
        const result = await registerUser(req.body);
        res.status(201).json(result);
    } catch (err) {
        console.error('Error en /register:', err);
        res.status(500).json({ error: 'No se pudo registrar el usuario' });
    }
});

module.exports = router;
