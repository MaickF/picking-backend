const nodemailer = require('nodemailer');
require('dotenv').config();
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, 
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function enviarTokenPorCorreo(destinatario, token) {
    // Verificar credenciales antes de enviar
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Credenciales de correo no configuradas');
    }
    
    const mailOptions = {
        from: `"Soporte" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: 'Token de recuperación de contraseña',
        text: `Tu token de recuperación es: ${token}`,
        html: `<p>Tu token de recuperación es: <strong>${token}</strong></p>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Token enviado a ${destinatario}`, info.messageId);
        return true;
    } catch (error) {
        console.error(`Error al enviar el correo: ${error.message}`);
        throw error;
    }
}

module.exports = { enviarTokenPorCorreo };
