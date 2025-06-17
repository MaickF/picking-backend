// Ejemplo de endpoint en el backend (Node.js/Express)
// POST /enviar-reporte

const nodemailer = require('nodemailer');

// Configurar transporter de nodemailer (ejemplo con Gmail)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

app.post('/enviar-reporte', async (req, res) => {
  try {
    const {
      pedidosSeleccionados,
      usuario,
      rutaGenerada,
      capacidadVehiculo,
      fechaEnvio,
      viajeId,
      optimizationResult
    } = req.body;

    // Generar contenido HTML del reporte
    const htmlContent = `
      <html>
        <head>
          <title>Reporte de Envío</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .summary { background-color: #e8f4f8; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Envío #${viajeId}</h1>
            <p>Fecha: ${new Date(fechaEnvio).toLocaleString()}</p>
          </div>
          
          <div class="content">
            <h2>Hola ${usuario.nombre},</h2>
            <p>Se ha generado un nuevo envío con los siguientes detalles:</p>
            
            <div class="summary">
              <h3>Resumen del Envío</h3>
              <p><strong>Cantidad de pedidos:</strong> ${pedidosSeleccionados.length}</p>
              <p><strong>Capacidad del vehículo:</strong> ${capacidadVehiculo} kg</p>
              <p><strong>Peso total:</strong> ${pedidosSeleccionados.reduce((sum, p) => sum + p.Peso, 0)} kg</p>
              ${rutaGenerada ? `
                <p><strong>Distancia total:</strong> ${(rutaGenerada.distanciaTotal / 1000).toFixed(2)} km</p>
                <p><strong>Tiempo estimado:</strong> ${Math.round(rutaGenerada.tiempoTotal / 60)} minutos</p>
              ` : ''}
              ${optimizationResult ? `
                <p><strong>Optimización aplicada:</strong> Sí</p>
                <p><strong>Eficiencia:</strong> ${optimizationResult.estadisticas.eficiencia}</p>
                <p><strong>Valor total:</strong> ${optimizationResult.estadisticas.valorTotal}</p>
              ` : ''}
            </div>

            <h3>Detalle de Pedidos</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>ID Pedido</th>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Peso (kg)</th>
                  <th>Provincia</th>
                </tr>
              </thead>
              <tbody>
                ${pedidosSeleccionados.map(pedido => `
                  <tr>
                    <td>${pedido.pedidoID}</td>
                    <td>${pedido.Cliente}</td>
                    <td>${pedido.Direccion}</td>
                    <td>${pedido.Peso}</td>
                    <td>${pedido.Provincia}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${rutaGenerada && rutaGenerada.instrucciones ? `
              <h3>Instrucciones de Ruta</h3>
              <ol>
                ${rutaGenerada.instrucciones.map(inst => `
                  <li>${inst.texto} - ${(inst.distancia / 1000).toFixed(2)} km</li>
                `).join('')}
              </ol>
            ` : ''}
          </div>
        </body>
      </html>
    `;

    // Configurar el correo
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: usuario.email,
      subject: `Reporte de Envío #${viajeId} - ${new Date(fechaEnvio).toLocaleDateString()}`,
      html: htmlContent
    };

    // Enviar el correo
    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Reporte enviado por correo exitosamente'
    });

  } catch (error) {
    console.error('Error al enviar reporte por correo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al enviar el reporte'
    });
  }
});