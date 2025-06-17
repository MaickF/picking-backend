const db = require('../Database/db');

async function findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM Usuario WHERE Correo_electronico = ?', [email]);
    return rows[0]; // Devuelve el primer usuario encontrado
}

module.exports = { findByEmail };
