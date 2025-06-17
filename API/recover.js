const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateToken, resetPassword } = require('../Functions/PasswordRecovery');

// Ruta: Solicita token de recuperación para un usuario
router.post('/request', async (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).json({ error: 'Correo requerido' });

  try {
    const token = await generateToken(correo);
    res.status(200).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ruta: Usuario con token cambia su contraseña
router.post('/reset', async (req, res) => {
  const { correo, token, nuevaContrasena } = req.body;

  if (!correo || !token || !nuevaContrasena) {
    return res.status(400).json({ error: 'Correo, token y nueva contraseña son requeridos' });
  }

  try {
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);
    await resetPassword(correo, token, hashedPassword);
    res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
