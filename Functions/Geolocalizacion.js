const fetch = require('node-fetch');

async function obtenerCoordenadas(direccion) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TuAppNombre/1.0 (tu-email@ejemplo.com)' // Recomendado para Nominatim
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        latitud: parseFloat(data[0].lat),
        longitud: parseFloat(data[0].lon)
      };
    }
    return { latitud: null, longitud: null };
  } catch (error) {
    console.error('Error obteniendo coordenadas:', error);
    return { latitud: null, longitud: null };
  }
}

module.exports = { obtenerCoordenadas };
