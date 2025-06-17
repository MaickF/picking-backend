// Repositories/SystemRepository.js
const db = require('../Database/db');
const bcrypt = require('bcrypt');

async function updateCliente(clienteData) {
  const connection = await db.getConnection();
  
  try {
    // Iniciar transacción para asegurar consistencia
    await connection.beginTransaction();

    // 1. Actualizar el nombre del cliente
    await connection.query(
      'CALL ActualizarNombreCliente(?, ?)',
      [clienteData.clienteId, clienteData.nombre]
    );

    // 2. Actualizar la ubicación si se proporcionan coordenadas
    if (clienteData.latitud !== null && clienteData.longitud !== null) {
      await connection.query(
        'CALL ActualizarUbicacion(?, ?, ?, ?, ?)',
        [
          clienteData.ubicacionId,
          clienteData.provincia,
          clienteData.direccion,
          clienteData.latitud,
          clienteData.longitud
        ]
      );
    } else {
      // Si no hay coordenadas, actualizar solo provincia y dirección
      // Necesitarías crear un procedimiento adicional para esto o usar UPDATE directo
      await connection.query(
        'UPDATE Ubicacion SET Provincia = ?, Direccion = ? WHERE ID = ?',
        [clienteData.provincia, clienteData.direccion, clienteData.ubicacionId]
      );
    }

    // Confirmar transacción
    await connection.commit();
    
    console.log(`Cliente ${clienteData.clienteId} actualizado exitosamente`);
    return { success: true };

  } catch (error) {
    // Revertir transacción en caso de error
    await connection.rollback();
    console.error('Error en updateCliente:', error);
    return { success: false, error: error.message };
  } finally {
    // Liberar conexión
    connection.release();
  }
}

async function getUsuarios() {
  const [results] = await db.query('CALL obtenerUsuarios()');
  console.log(results)
  return results;
}

async function getClientes() {
  const [results] = await db.query('CALL obtenerCliente()');
  console.log(results)
  return results;
}

async function getRoles() {
  const [rows] = await db.query('SELECT * FROM Rol');
  return rows;
}

async function getViajes() {
  const [results] = await db.query('CALL obtenerViajes()');
  console.log(results)
  return results;
}

async function getReportes() {
  const [rows] = await db.query('SELECT * FROM Reporte');
  return rows;
}

async function createRol(Nombre, Nivel) {
  const query = 'INSERT INTO Rol (Nombre, Nivel) VALUES (?, ?)';
  const [result] = await db.query(query, [Nombre, Nivel]);
  return result;
}

async function getPedidos(provincia, fecha) {
  let fechaFormateada = null;

  if (fecha) {
    const fechaObj = new Date(fecha);
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const anio = String(fechaObj.getFullYear()).slice(-2); // AA
    fechaFormateada = `${anio}/${mes}/${dia}`;
  }

  const [results] = await db.query('CALL ObtenerPedidosPorProvinciaYFecha(?, ?)', [
    provincia || null,
    fechaFormateada || null,
  ]);

  return results;
}

async function getPedidosPorViaje(viaje) {
  const [results] = await db.query('CALL ObtenerPedidosPorViaje(?)', [
    viaje || null
  ]);

  return results;
}

async function getPedidosViaje() {
  console.log("LLEGO HASTA AQUI TAMBIEN JSDjbhasjfdud")
  const [resultados] = await db.query('CALL ObtenerPedidosViaje()');
  return resultados;
}

async function createUsuario(nombre, apellidos, correo, departamento, rol, contrasena) {
  console.log("LLegamos")
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
  const query = 'CALL crearUsuario(?, ?, ?, ?, ?, ?)';
  const [result] = await db.query(query, [rol, departamento, nombre, apellidos, correo, hashedPassword]);
  return result;
}

const deleteUsuario = async (id) => {
  console.log("TAMBIEN AQUI")
  const [rows] = await db.query('CALL eliminarUsuario(?)', [id]);
  return rows;
};

const deleteViaje = async (id) => {
  console.log("TAMBIEN AQUI")
  const [rows] = await db.query('CALL CancelarViajePedido(?)', [id]);
  return rows;
};

async function createViajeConPedidos(Capacidad, pedidosCSV, Usuario, Fecha) {
  console.log("Capacidad", Capacidad)
  console.log("Pedidos", pedidosCSV)
  const viajeQuery = 'CALL crearViaje(?, ?, ?, @out_ID); SELECT @out_ID AS id_viaje';
  const [viajeResult] = await db.query(viajeQuery, [Capacidad, Usuario, Fecha]);
  const idViaje = viajeResult[1][0].id_viaje;
  console.log("viaje", idViaje);
  if (pedidosCSV && pedidosCSV.length > 0) {
    const asignarQuery = 'CALL AsignarPedidosAViaje(?, ?)';
    await db.query(asignarQuery, [pedidosCSV, idViaje]);
  }

  return { id: idViaje };
}

module.exports = {
  getUsuarios,
  getRoles,
  getViajes,
  getReportes,
  createRol,
  createViajeConPedidos,
  createUsuario,
  getPedidos,
  deleteUsuario,
  getPedidosViaje,
  getPedidosPorViaje,
  deleteViaje,
  getClientes,
  updateCliente
};
