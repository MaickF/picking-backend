// routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const nodemailer = require('nodemailer');
const MapRouteGenerator = require('../Functions/MapRouterGenerator');
const path = require('path');
const fs = require('fs').promises;

const { enviarTokenPorCorreo } = require('../Functions/Mailer');
const crypto = require('crypto');

const upload = multer({ dest: 'uploads/' });
const ProblemaMochila = require('../Functions/ProblemaMochila');

// Rutas públicas
const loginRoutes = require('./login');
const registerRoutes = require('./register');
const recoverRoutes = require('./recover');

const { handleExcelUpload } = require('../Functions/ExcelHandler');

router.use('/auth/login', loginRoutes);
router.use('/auth/register', registerRoutes);
router.use('/auth/recover', recoverRoutes);
const authenticateToken = require('../Functions/AuthMiddleware'); 



// Middleware de autenticación (protege las rutas que vienen después)
//const authMiddleware = require('../Functions/AuthMiddleware');
//router.use(authMiddleware);

// Rutas protegidas (handlers importados)
const {
  getUsuarios,
  getRoles,
  getViajes,
  getReportes,
  createRol,
  createViaje,
  getPedidos,
  getPedidosViaje,
  getPedidosPorViaje,
  createUsuario,
  deleteUsuario,
  deleteViaje,
  getClientes,
  updateCliente,
} = require('../Functions/SystemHandler');


router.put('/cliente/:id', updateCliente);

router.delete('/delete/usuario/:id', deleteUsuario);
router.delete('/delete/viaje/:id', deleteViaje); 

router.get('/usuarios', getUsuarios);
router.get('/clientes', getClientes);
router.get('/roles', getRoles);
router.get('/viajes', getViajes);
router.get('/reportes', getReportes);
router.get('/pedidos', getPedidos);
router.get('/pedidos/viajes', getPedidosViaje);
router.get('/pedidos/viaje', getPedidosPorViaje);

router.post('/create/roles', createRol);
router.post('/create/viajes', createViaje);
router.post('/create/usuario', createUsuario); 
router.post('/excel/upload', upload.single('file'), handleExcelUpload);

/**
 * POST /api/mochila/optimizar
 * Recibe una lista de pedidos y capacidad, retorna los pedidos seleccionados óptimamente
 */
/**
 * POST /api/optimizar
 * Recibe una lista de pedidos y capacidad, retorna los pedidos seleccionados óptimamente
 */
router.post('/optimizar', async (req, res) => {
  try {
    const { pedidos, capacidad } = req.body;

    console.log('Datos recibidos:', {
      cantidadPedidos: pedidos?.length,
      capacidad,
      primerPedido: pedidos?.[0]
    });

    // Validación de entrada
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      return res.status(400).json({ 
        error: 'Se requiere un array de pedidos no vacío' 
      });
    }

    if (!capacidad || capacidad <= 0) {
      return res.status(400).json({ 
        error: 'Se requiere una capacidad válida mayor a 0' 
      });
    }

    // Convertir pedidos al formato del algoritmo
    // Formato: [id, peso, valor, cantidad]
    const objetosParaMochila = pedidos.map((pedido, index) => {
      const peso = Number(pedido.Peso) || 0;
      const valor = Number(pedido.Peso) || 0; // Valor = Peso según requisito del cliente
      
      return [
        index, // ID interno para el algoritmo
        peso, // peso del pedido
        valor, // valor del pedido (igual al peso por decisión del cliente)
        1 // cantidad siempre es 1
      ];
    });

    console.log('Objetos para mochila (primeros 3):', objetosParaMochila.slice(0, 3));

    // Filtrar objetos con peso y valor válidos
    const objetosValidos = objetosParaMochila.filter(obj => 
      obj[1] > 0 && obj[2] > 0 && obj[1] <= capacidad
    );

    console.log('Objetos válidos:', objetosValidos.length);

    if (objetosValidos.length === 0) {
      return res.status(400).json({ 
        error: 'No hay pedidos válidos que puedan caber en la capacidad especificada' 
      });
    }

    // Ejecutar algoritmo de la mochila
    const mochila = new ProblemaMochila();
    mochila.configurarDatos(objetosValidos, capacidad);
    const resultado = mochila.resolver();

    console.log('Resultado del algoritmo:', {
      valorMaximo: resultado.valorMaximo,
      tieneTablaValores: !!resultado.tablaValores,
      tieneTablaCantidades: !!resultado.tablaCantidades
    });

    // Usar el nuevo método de reconstrucción de solución
    const solucionOptima = mochila.reconstruirSolucion();
    console.log('Solución óptima:', solucionOptima);

    // Mapear la solución óptima a los pedidos originales
    const pedidosSeleccionados = solucionOptima.map(item => 
      pedidos[item.id]
    ).filter(pedido => pedido !== undefined);

    console.log('Pedidos seleccionados:', pedidosSeleccionados.length);

    // Calcular estadísticas
    const pesoTotal = pedidosSeleccionados.reduce((sum, pedido) => 
      sum + (Number(pedido.Peso) || 0), 0);
    const valorTotal = pedidosSeleccionados.reduce((sum, pedido) => 
      sum + (Number(pedido.Peso) || 0), 0); // Valor = Peso según decisión del cliente

    // Verificación de seguridad (no debería ser necesaria con el algoritmo corregido)
    if (pesoTotal > capacidad) {
      console.error('¡ERROR! El algoritmo retornó una solución que supera la capacidad');
      return res.status(500).json({
        error: 'Error interno: solución supera la capacidad máxima',
        pesoTotal,
        capacidad
      });
    }

    // Respuesta
    res.json({
      success: true,
      pedidosSeleccionados,
      estadisticas: {
        cantidadPedidos: pedidosSeleccionados.length,
        pesoTotal,
        valorTotal,
        capacidadUsada: pesoTotal,
        capacidadRestante: capacidad - pesoTotal,
        eficiencia: (pesoTotal / capacidad * 100).toFixed(2) + '%'
      },
      algoritmo: {
        valorMaximo: resultado.valorMaximo,
        objetosValidos: objetosValidos.length,
        solucionDetallada: solucionOptima
      }
    });

  } catch (error) {
    console.error('Error en algoritmo de mochila:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Error interno del servidor al procesar el algoritmo de la mochila',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail', // o el servicio que uses
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Ruta para enviar reporte por correo
// Ruta para enviar reporte por correo con mapa
router.post('/enviar-reporte', authenticateToken, async (req, res) => {
  const mapGenerator = new MapRouteGenerator();
  let tempMapPath = null;

  try {
    const {
      pedidosSeleccionados,
      usuario,
      rutaGenerada,
      capacidadVehiculo,
      fechaEnvio,
      viajeId,
      optimizationResult,
    } = req.body;
    const direcciones = pedidosSeleccionados.map(p => ({ lat: p.Latitud, lng: p.Longitud }));
    // Validar datos requeridos
    if (!pedidosSeleccionados || !usuario || !usuario.email) {
      return res.status(400).json({
        success: false,
        error: 'Datos insuficientes para enviar el reporte'
      });
    }

    // Calcular estadísticas
    const pesoTotal = pedidosSeleccionados.reduce((sum, p) => sum + (p.Peso || 0), 0);
    const cantidadPedidos = pedidosSeleccionados.length;

    // Generar imagen del mapa si hay direcciones
    let mapImagePath = null;
    let routeData = null;
    
    if (direcciones && direcciones.length > 0) {
      console.log('🗺️ Procesando direcciones para el mapa:', direcciones.length);
      
      try {
        // Generar datos de ruta actualizados
        console.log('📊 Generando datos de ruta...');
        routeData = await mapGenerator.generateRouteData(direcciones);
        console.log('✅ Datos de ruta generados:', routeData);
        
        // Generar imagen del mapa
        console.log('🎨 Iniciando generación de imagen del mapa...');
        const tempDir = path.join(__dirname, '../../temp');
        await fs.mkdir(tempDir, { recursive: true });
        console.log('📁 Directorio temporal creado/verificado:', tempDir);
        
        tempMapPath = path.join(tempDir, `map_${viajeId || Date.now()}.png`);
        console.log('📍 Ruta de archivo temporal:', tempMapPath);
        
        await mapGenerator.generateAndSaveRouteImage(direcciones, tempMapPath, {
          width: 800,
          height: 500,
          format: 'png'
        });
        
        // Verificar que el archivo existe
        const fileExists = await fs.access(tempMapPath).then(() => true).catch(() => false);
        console.log('📂 Archivo de mapa existe:', fileExists);
        
        if (fileExists) {
          const stats = await fs.stat(tempMapPath);
          console.log('📏 Tamaño del archivo de mapa:', stats.size, 'bytes');
          
          if (stats.size > 0) {
            mapImagePath = tempMapPath;
            console.log('✅ Imagen del mapa generada exitosamente');
          } else {
            console.error('❌ El archivo de mapa está vacío');
          }
        } else {
          console.error('❌ El archivo de mapa no se pudo crear');
        }
        
      } catch (mapError) {
        console.error('❌ Error completo generando mapa:', mapError);
        console.error('Stack:', mapError.stack);
        // Continuar sin el mapa si hay error
      }
    } else {
      console.log('⚠️ No hay direcciones para generar mapa');
    }

    // Usar datos de ruta generados o los existentes
    const rutaFinal = routeData || rutaGenerada;

    // Generar contenido HTML del reporte
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Envío</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container { max-width: 800px; margin: 0 auto; }
            .header { 
              background-color: #2c3e50; 
              color: white; 
              padding: 20px; 
              text-align: center; 
            }
            .content { padding: 20px; }
            .summary { 
              background-color: #ecf0f1; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 5px;
            }
            .table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
            }
            .table th, .table td { 
              border: 1px solid #bdc3c7; 
              padding: 10px; 
              text-align: left; 
            }
            .table th { 
              background-color: #34495e; 
              color: white;
            }
            .table tr:nth-child(even) { background-color: #f8f9fa; }
            .footer { 
              background-color: #95a5a6; 
              color: white; 
              text-align: center; 
              padding: 10px; 
              font-size: 12px;
            }
            .optimization { 
              background-color: #d5f4e6; 
              border-left: 4px solid #27ae60; 
              padding: 10px; 
              margin: 15px 0;
            }
            .map-container {
              text-align: center;
              margin: 20px 0;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 5px;
            }
            .map-image {
              max-width: 100%;
              height: auto;
              border: 1px solid #ddd;
              border-radius: 5px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .route-details {
              background-color: #e3f2fd;
              border-left: 4px solid #2196f3;
              padding: 15px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Reporte de Envío</h1>
              <p>Generado el: ${new Date(fechaEnvio).toLocaleString('es-ES')}</p>
            </div>
            
            <div class="content">
              <h2>Hola ${usuario.nombre || 'Usuario'},</h2>
              <p>Se ha confirmado un nuevo envío con los siguientes detalles:</p>
              
              <div class="summary">
                <h3>📊 Resumen del Envío</h3>
                <p><strong>Cantidad de pedidos:</strong> ${cantidadPedidos}</p>
                <p><strong>Capacidad del vehículo:</strong> ${capacidadVehiculo} kg</p>
                <p><strong>Peso total cargado:</strong> ${pesoTotal} kg</p>
                <p><strong>Capacidad utilizada:</strong> ${((pesoTotal / capacidadVehiculo) * 100).toFixed(1)}%</p>
                ${rutaFinal ? `
                  <p><strong>Distancia total:</strong> ${(rutaFinal.distanciaTotal / 1000).toFixed(2)} km</p>
                  <p><strong>Tiempo estimado:</strong> ${Math.round(rutaFinal.tiempoTotal / 60)} minutos</p>
                ` : ''}
              </div>

              ${optimizationResult ? `
                <div class="optimization">
                  <h3>🎯 Optimización Aplicada</h3>
                  <p><strong>Eficiencia alcanzada:</strong> ${optimizationResult.estadisticas.eficiencia}</p>
                  <p><strong>Valor total optimizado:</strong> ${optimizationResult.estadisticas.valorTotal}</p>
                  <p>Este envío fue optimizado automáticamente para maximizar la eficiencia.</p>
                </div>
              ` : ''}

              ${mapImagePath ? `
                <div class="map-container">
                  <h3>🗺️ Mapa de la Ruta</h3>
                  <p>Visualización de la ruta optimizada para su envío:</p>
                  <img src="cid:routeMap" alt="Mapa de la ruta" class="map-image">
                </div>
              ` : ''}

              <h3>📋 Detalle de Pedidos</h3>
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
                      <td>${pedido.pedidoID || 'N/A'}</td>
                      <td>${pedido.Nombre || 'N/A'}</td>
                      <td>${pedido.Direccion || 'N/A'}</td>
                      <td>${pedido.Peso || 0}</td>
                      <td>${pedido.Provincia || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <p><strong>Nota:</strong> Este reporte ha sido generado automáticamente por el sistema de gestión de envíos.</p>
            </div>

            <div class="footer">
              <p>Sistema de Gestión de Envíos - ${new Date().getFullYear()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Configurar el correo
    const mailOptions = {
      from: `"Sistema de Envíos" <${process.env.EMAIL_USER}>`,
      to: usuario.email,
      subject: `📦 Reporte de Envío #${viajeId || 'N/A'} - ${new Date(fechaEnvio).toLocaleDateString('es-ES')}`,
      html: htmlContent,
      text: `
        Reporte de Envío #${viajeId || 'N/A'}
        
        Hola ${usuario.nombre || 'Usuario'},
        
        Se ha confirmado un nuevo envío:
        - Cantidad de pedidos: ${cantidadPedidos}
        - Peso total: ${pesoTotal} kg
        - Capacidad del vehículo: ${capacidadVehiculo} kg
        ${rutaFinal ? `- Distancia total: ${(rutaFinal.distanciaTotal / 1000).toFixed(2)} km` : ''}
        ${rutaFinal ? `- Tiempo estimado: ${Math.round(rutaFinal.tiempoTotal / 60)} minutos` : ''}
        
        Pedidos incluidos: ${pedidosSeleccionados.map(p => `#${p.pedidoID}`).join(', ')}
        
        Sistema de Gestión de Envíos
      `
    };

    // Agregar imagen como adjunto si existe
    if (mapImagePath) {
      console.log('📎 Agregando imagen como adjunto al correo...');
      mailOptions.attachments = [
        {
          filename: 'mapa-ruta.png',
          path: mapImagePath,
          cid: 'routeMap', // Para usar en el HTML como src="cid:routeMap"
          contentType: 'image/png'
        }
      ];
      console.log('✅ Adjunto agregado correctamente');
    } else {
      console.log('⚠️ No se agregará imagen al correo (no se generó)');
    }

    // Enviar el correo
    console.log('📧 Enviando correo a:', usuario.email);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Correo enviado exitosamente:', info.messageId);

    // Limpiar archivo temporal
    if (tempMapPath) {
      try {
        await fs.unlink(tempMapPath);
        console.log('Archivo temporal eliminado:', tempMapPath);
      } catch (cleanupError) {
        console.error('Error eliminando archivo temporal:', cleanupError);
      }
    }

    res.json({
      success: true,
      message: 'Reporte enviado por correo exitosamente',
      messageId: info.messageId,
      mapGenerated: !!mapImagePath,
      routeData: rutaFinal
    });

  } catch (error) {
    console.error('Error al enviar reporte por correo:', error);
    
    // Limpiar archivo temporal en caso de error
    if (tempMapPath) {
      try {
        await fs.unlink(tempMapPath);
      } catch (cleanupError) {
        console.error('Error eliminando archivo temporal tras error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al enviar el reporte',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Cerrar navegador si fue inicializado
    try {
      await mapGenerator.closeBrowser();
    } catch (browserError) {
      console.error('Error cerrando navegador:', browserError);
    }
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Verificar si el email existe en tu BD
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Generar token de 6 dígitos
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Guardar token en BD con expiración (ej: 15 minutos)
    await Token.create({
      email,
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });
    
    // Enviar email usando tu Mailer.js
    await enviarTokenPorCorreo(email, token);
    
    res.json({ message: 'Token enviado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al enviar token' });
  }
});

router.post('/verify-token', async (req, res) => {
  try {
    const { email, token } = req.body;
    
    // Buscar token válido
    const tokenDoc = await Token.findOne({
      email,
      token,
      expiresAt: { $gt: new Date() }
    });
    
    if (!tokenDoc) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }
    
    res.json({ message: 'Token válido' });
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar token' });
  }
});

const bcrypt = require('bcrypt');

router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    
    // Verificar token nuevamente
    const tokenDoc = await Token.findOne({
      email,
      token,
      expiresAt: { $gt: new Date() }
    });
    
    if (!tokenDoc) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }
    
    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña del usuario
    await User.updateOne({ email }, { password: hashedPassword });
    
    // Eliminar token usado
    await Token.deleteOne({ _id: tokenDoc._id });
    
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar contraseña' });
  }
});

module.exports = router;
