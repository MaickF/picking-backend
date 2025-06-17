const UserRepository = require('../Repositories/UserRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../Database/db');
const { validateToken } = require('./PasswordRecovery');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecreto';

async function loginWithCredentials(email, password) {
    const user = await UserRepository.findByEmail(email);
    if (!user) throw new Error('Usuario no encontrado');

    const match = await bcrypt.compare(password, user.Contrasena);
    if (match) {
        // Contraseña válida → retornar token
        const token = jwt.sign(
            { id: user.ID, email: user.Correo_electronico, rol: user.Rol },
            JWT_SECRET,
            { expiresIn: '2h' }
        );
        console.log('Autenticación exitosa con contraseña');
        return {
            token,
            user: {
                id: user.ID,
                nombre: user.Nombre,
                apellidos: user.Apellidos,
                correo: user.Correo_electronico,
                rol: user.Rol
            }
        };
    }

    // Si la contraseña no coincide, intentar con token de recuperación
    try {
        await validateToken(email, password); 
        console.log('Token de recuperación válido, autenticación exitosa');
        return { correo: email };
    } catch {
        throw new Error('Contraseña incorrecta o token inválido');
    }
}

module.exports = { loginWithCredentials };
