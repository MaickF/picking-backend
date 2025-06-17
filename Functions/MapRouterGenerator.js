const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class MapRouteGenerator {
  constructor() {
    this.browser = null;
  }

  /**
   * Inicializa el navegador Puppeteer
   */
  async initBrowser() {
    if (!this.browser) {
      console.log('🚀 Lanzando navegador Puppeteer...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      console.log('✅ Navegador iniciado correctamente');
    }
    return this.browser;
  }

  /**
   * Cierra el navegador
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Genera una imagen del mapa con la ruta trazada
   * @param {Array} direcciones - Array de objetos con lat, lng
   * @param {Object} options - Opciones de configuración
   * @returns {Buffer} - Buffer de la imagen PNG
   */
  async generateRouteImage(direcciones, options = {}) {
    console.log('🗺️ Iniciando generación de imagen del mapa...');
    console.log('📍 Direcciones recibidas:', direcciones);

    const {
      width = 800,
      height = 600,
      zoom = 10,
      format = 'png',
      quality = 90
    } = options;

    // Filtrar direcciones válidas
    const direccionesValidas = direcciones.filter(
      (d) => d && typeof d.lat === 'number' && typeof d.lng === 'number'
    );

    console.log('✅ Direcciones válidas filtradas:', direccionesValidas.length);

    if (direccionesValidas.length === 0) {
      throw new Error('No hay direcciones válidas para generar el mapa');
    }

    // Calcular centro del mapa basado en las coordenadas
    const center = this.calculateCenter(direccionesValidas);
    const calculatedZoom = this.calculateZoom(direccionesValidas);
    
    console.log('📐 Centro calculado:', center);
    console.log('🔍 Zoom calculado:', calculatedZoom);

    console.log('🚀 Inicializando navegador...');
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      // Configurar viewport
      await page.setViewport({ width, height });
      console.log('📏 Viewport configurado:', width, 'x', height);

      // Configurar eventos de consola para debugging
      page.on('console', msg => console.log('🖥️ Browser console:', msg.text()));
      page.on('pageerror', error => console.error('❌ Page error:', error));

      // Generar HTML del mapa
      const htmlContent = this.generateMapHTML(direccionesValidas, center, calculatedZoom, width, height);
      console.log('📄 HTML generado, longitud:', htmlContent.length);
      
      // Cargar el HTML
      console.log('📥 Cargando contenido HTML...');
      await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

      // Esperar a que el mapa se cargue completamente
      console.log('⏳ Esperando que el mapa se cargue...');
      await page.waitForSelector('#map', { timeout: 15000 });
      
      // Esperar a que el mapa esté listo
      console.log('⏳ Esperando que el mapa esté completamente listo...');
      await page.waitForFunction(() => window.mapReady === true, { timeout: 20000 });
      
      // Esperar un poco más para que se carguen las tiles y la ruta
      console.log('⏳ Esperando carga final de tiles y ruta...');
      await page.waitForTimeout(5000);

      console.log('📸 Tomando screenshot...');
      // Tomar screenshot
      const screenshot = await page.screenshot({
        type: format,
        quality: format === 'jpeg' ? quality : undefined,
        fullPage: false
      });

      console.log('✅ Screenshot generado, tamaño:', screenshot.length, 'bytes');
      return screenshot;

    } catch (error) {
      console.error('❌ Error generando imagen del mapa:', error);
      
      // Intentar tomar screenshot de la página actual para debugging
      try {
        const debugScreenshot = await page.screenshot({ type: 'png' });
        console.log('🐛 Screenshot de debug generado, tamaño:', debugScreenshot.length);
        return debugScreenshot; // Devolver aunque sea una imagen de error
      } catch (debugError) {
        console.error('❌ Error tomando screenshot de debug:', debugError);
        throw error;
      }
    } finally {
      console.log('🧹 Cerrando página...');
      await page.close();
    }
  }

  /**
   * Calcula el centro geográfico de las coordenadas
   * @param {Array} coordenadas - Array de objetos con lat, lng
   * @returns {Object} - Objeto con lat, lng del centro
   */
  calculateCenter(coordenadas) {
    const lat = coordenadas.reduce((sum, coord) => sum + coord.lat, 0) / coordenadas.length;
    const lng = coordenadas.reduce((sum, coord) => sum + coord.lng, 0) / coordenadas.length;
    return { lat, lng };
  }

  /**
   * Calcula el zoom apropiado basado en las coordenadas
   * @param {Array} coordenadas - Array de objetos con lat, lng
   * @returns {number} - Nivel de zoom
   */
  calculateZoom(coordenadas) {
    if (coordenadas.length <= 1) return 10;

    const lats = coordenadas.map(c => c.lat);
    const lngs = coordenadas.map(c => c.lng);
    
    const latDiff = Math.max(...lats) - Math.min(...lats);
    const lngDiff = Math.max(...lngs) - Math.min(...lngs);
    
    const maxDiff = Math.max(latDiff, lngDiff);
    
    if (maxDiff > 10) return 5;
    if (maxDiff > 5) return 6;
    if (maxDiff > 2) return 7;
    if (maxDiff > 1) return 8;
    if (maxDiff > 0.5) return 9;
    if (maxDiff > 0.2) return 10;
    if (maxDiff > 0.1) return 11;
    return 12;
  }

  /**
   * Genera el HTML del mapa con Leaflet
   * @param {Array} direcciones - Direcciones válidas
   * @param {Object} center - Centro del mapa
   * @param {number} zoom - Nivel de zoom
   * @param {number} width - Ancho del mapa
   * @param {number} height - Alto del mapa
   * @returns {string} - HTML del mapa
   */
  generateMapHTML(direcciones, center, zoom, width, height) {
    const coordenadas = direcciones.map(d => `[${d.lat}, ${d.lng}]`).join(', ');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Mapa de Ruta</title>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            #map {
              width: ${width}px;
              height: ${height}px;
            }
            .leaflet-control-attribution {
              font-size: 10px;
            }
            .route-info {
              position: absolute;
              top: 10px;
              right: 10px;
              background: rgba(255, 255, 255, 0.9);
              padding: 10px;
              border-radius: 5px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.2);
              z-index: 1000;
              font-size: 12px;
            }
            /* OCULTAR COMPLETAMENTE LAS INSTRUCCIONES DE RUTA */
            .leaflet-routing-container {
              display: none !important;
            }
            .leaflet-control-container .leaflet-routing-container {
              display: none !important;
            }
            /* Ocultar cualquier elemento de control de routing */
            .leaflet-routing-alternatives-container {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div class="route-info">
            <strong>Ruta de Envío</strong><br>
            Puntos: ${direcciones.length}<br>
            Fecha: ${new Date().toLocaleDateString('es-ES')}
          </div>
          
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
          
          <script>
            // Inicializar mapa
            const map = L.map('map').setView([${center.lat}, ${center.lng}], ${zoom});
            
            // Agregar capa de tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Coordenadas de la ruta
            const waypoints = [${coordenadas}];
            
            // Crear marcadores personalizados
            const startIcon = L.divIcon({
              html: '<div style="background-color: #22c55e; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">A</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });
            
            const endIcon = L.divIcon({
              html: '<div style="background-color: #ef4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">B</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });
            
            const waypointIcon = L.divIcon({
              html: '<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">•</div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            
            // Agregar marcadores
            waypoints.forEach((coord, index) => {
              let icon = waypointIcon;
              if (index === 0) icon = startIcon;
              else if (index === waypoints.length - 1) icon = endIcon;
              
              L.marker(coord, { icon }).addTo(map);
            });
            
            // Crear ruta SIN panel de instrucciones
            if (waypoints.length > 1) {
              const routingControl = L.Routing.control({
                waypoints: waypoints.map(coord => L.latLng(coord[0], coord[1])),
                routeWhileDragging: false,
                show: false,                    // No mostrar el panel
                addWaypoints: false,
                createMarker: function() { return null; }, // No crear marcadores automáticos
                lineOptions: {
                  styles: [{
                    color: '#2563eb',
                    weight: 4,
                    opacity: 0.8
                  }]
                },
                router: L.Routing.osrmv1({
                  serviceUrl: 'https://router.project-osrm.org/route/v1'
                }),
                // CONFIGURACIÓN CLAVE: Eliminar completamente el contenedor de instrucciones
                formatter: new L.Routing.Formatter(),
                summaryTemplate: '',
                routeWhileDragging: false,
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: false
              }).addTo(map);
              
              // FORZAR ELIMINACIÓN del panel de instrucciones después de que se cree
              routingControl.on('routesfound', function(e) {
                // Ocultar el contenedor de routing si aparece
                const routingContainer = document.querySelector('.leaflet-routing-container');
                if (routingContainer) {
                  routingContainer.style.display = 'none';
                }
              });
              
              // También intentar ocultarlo inmediatamente
              setTimeout(() => {
                const routingContainers = document.querySelectorAll('.leaflet-routing-container');
                routingContainers.forEach(container => {
                  container.style.display = 'none';
                });
              }, 100);
              
              // Ajustar vista para mostrar toda la ruta
              setTimeout(() => {
                const group = new L.featureGroup(waypoints.map(coord => L.marker(coord)));
                map.fitBounds(group.getBounds().pad(0.1));
                
                // Ocultar cualquier elemento de routing que haya aparecido
                const routingContainers = document.querySelectorAll('.leaflet-routing-container');
                routingContainers.forEach(container => {
                  container.style.display = 'none';
                });
              }, 1000);
            }
            
            // Marcar como listo
            window.mapReady = true;
            
            // Función adicional para asegurar que no aparezcan las instrucciones
            setInterval(() => {
              const routingContainers = document.querySelectorAll('.leaflet-routing-container');
              routingContainers.forEach(container => {
                if (container.style.display !== 'none') {
                  container.style.display = 'none';
                }
              });
            }, 500);
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Genera imagen de la ruta y la guarda en el sistema de archivos
   * @param {Array} direcciones - Array de direcciones
   * @param {string} outputPath - Ruta donde guardar la imagen
   * @param {Object} options - Opciones de configuración
   * @returns {string} - Ruta del archivo generado
   */
  async generateAndSaveRouteImage(direcciones, outputPath, options = {}) {
    console.log('💾 Generando y guardando imagen en:', outputPath);
    
    try {
      const imageBuffer = await this.generateRouteImage(direcciones, options);
      await fs.writeFile(outputPath, imageBuffer);
      
      // Verificar que el archivo se guardó correctamente
      const stats = await fs.stat(outputPath);
      console.log('✅ Archivo guardado correctamente, tamaño:', stats.size, 'bytes');
      
      return outputPath;
    } catch (error) {
      console.error('❌ Error guardando imagen:', error);
      throw error;
    }
  }

  /**
   * Genera datos de la ruta (distancia, tiempo, instrucciones)
   * @param {Array} direcciones - Array de direcciones
   * @returns {Object} - Datos de la ruta
   */
  async generateRouteData(direcciones) {
    const direccionesValidas = direcciones.filter(
      (d) => d && typeof d.lat === 'number' && typeof d.lng === 'number'
    );

    if (direccionesValidas.length < 2) {
      return {
        distanciaTotal: 0,
        tiempoTotal: 0,
        instrucciones: []
      };
    }

    try {
      // Construir URL para OSRM
      const coordinates = direccionesValidas
        .map(d => `${d.lng},${d.lat}`)
        .join(';');
      
      const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&steps=true`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        return {
          distanciaTotal: route.distance,
          tiempoTotal: route.duration,
          instrucciones: route.legs?.flatMap(leg => 
            leg.steps?.map(step => ({
              texto: step.maneuver?.instruction || 'Continuar',
              distancia: step.distance,
              duracion: step.duration
            })) || []
          ) || []
        };
      }
      
      return {
        distanciaTotal: 0,
        tiempoTotal: 0,
        instrucciones: []
      };
      
    } catch (error) {
      console.error('Error obteniendo datos de ruta:', error);
      return {
        distanciaTotal: 0,
        tiempoTotal: 0,
        instrucciones: []
      };
    }
  }
}

module.exports = MapRouteGenerator;