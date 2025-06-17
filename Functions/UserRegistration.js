const bcrypt = require('bcryptjs');
const db = require('../Database/db');

async function registerUser({ id, nombre, apellidos, correo, departamento, rol, contrasena }) {
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

        const query = `
            INSERT INTO Usuario (ID, Nombre, Apellidos, Correo_electronico, Departamento, Rol, Contrasena)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [id, nombre, apellidos, correo, departamento, rol, hashedPassword];
        await db.query(query, values);

        return { success: true, message: 'Usuario registrado exitosamente' };
    } catch (err) {
        console.error("Error en registerUser:", err);
        throw err;
    }
}

module.exports = { registerUser };
