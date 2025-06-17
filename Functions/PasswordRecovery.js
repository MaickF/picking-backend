const db = require('../Database/db');
const bcrypt = require('bcryptjs');
const { enviarTokenPorCorreo } = require('./Mailer');

function generarTokenVisible(longitud = 8) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < longitud; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

async function generateToken(correo) {
    try {
        const [usuarios] = await db.query('SELECT * FROM Usuario WHERE Correo_electronico = ?', [correo]);
        if (usuarios.length === 0) {
            throw new Error('El correo no está registrado');
        }

        const tokenVisible = generarTokenVisible();
        const tokenHash = await bcrypt.hash(tokenVisible, 10);

        const expiracion = new Date(Date.now() + 15 * 60 * 1000)
            .toISOString().slice(0, 19).replace('T', ' ');

        const query = `
            INSERT INTO ResetTokens (Correo, Token, Expiracion)
            VALUES (?, ?, ?)
        `;
        await db.query(query, [correo, tokenHash, expiracion]);

        await enviarTokenPorCorreo(correo, tokenVisible);

        return tokenVisible; 
    } catch (error) {
        console.error('Error al generar el token:', error);
        throw new Error(`Error al generar el token: ${error.message}`);
    }
}

async function validateToken(correo, tokenIngresado) {
    const [rows] = await db.query(`
        SELECT * FROM ResetTokens
        WHERE Correo = ? AND Usado = FALSE AND Expiracion > UTC_TIMESTAMP()
        ORDER BY ID DESC
    `, [correo]);

    for (const row of rows) {
        const coincide = await bcrypt.compare(tokenIngresado, row.Token);
        if (coincide) return row;
    }

    throw new Error('Token inválido o expirado');
}

async function resetPassword(correo, token, nuevaContrasenaHasheada) {
    const record = await validateToken(correo, token);

    await db.query(
        `UPDATE Usuario SET Contrasena = ? WHERE Correo_electronico = ?`,
        [nuevaContrasenaHasheada, correo]
    );
    await db.query(
        `UPDATE ResetTokens SET Usado = TRUE WHERE ID = ?`,
        [record.ID]
    );
    return true;
}

module.exports = { generateToken, validateToken, resetPassword };
