// Functions/SystemHandlers.js
const repo = require('../Repositories/SystemRepository');

async function handleGetPedidos(req, res) {
  const { provincia, fecha } = req.query;

  try {
    const data = await repo.getPedidos(provincia, fecha);
    res.json(data);
  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
}

async function handleGetPedidosPorViaje(req, res) {
  const { id } = req.query;
  try {
    const data = await repo.getPedidosPorViaje(id);
    res.json(data);
  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
}

async function handleGetPedidosViaje(req, res) {
  try {
    const data = await repo.getPedidosViaje();
    res.json(data);
  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
}

const handleDeleteUsuario = async (req, res) => {
  console.log("llego hasta aqui")
  const id = parseInt(req.params.id);
  console.log(id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    await repo.deleteUsuario(id);
    res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const handleDeleteViaje = async (req, res) => {
  console.log("llego hasta aqui")
  const id = parseInt(req.params.id);
  console.log(id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    await repo.deleteViaje(id);
    res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

async function handleCreateViaje(req, res) {
  const { Capacidad } = req.body;

  try {
    const result = await repo.createViaje(Capacidad);
    console.log("CAPACIDAD: ", Capacidad)
    res.status(201).json({ mensaje: 'Viaje creado exitosamente', data: result });
  } catch (err) {
    console.error('Error al crear viaje:', err);
    res.status(500).json({ error: 'Error al crear viaje' });
  }
}


async function handleGetUsuarios(req, res) {
  try {
    const data = await repo.getUsuarios();
    res.json(data);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

async function handleGetClientes(req, res) {
  try {
    const data = await repo.getClientes();
    res.json(data);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

async function handleGetRoles(req, res) {
  try {
    const data = await repo.getRoles();
    res.json(data);
  } catch (err) {
    console.error('Error al obtener roles:', err);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
}

async function handleGetViajes(req, res) {
  try {
    const data = await repo.getViajes();
    res.json(data);
  } catch (err) {
    console.error('Error al obtener viajes:', err);
    res.status(500).json({ error: 'Error al obtener viajes' });
  }
}

async function handleGetReportes(req, res) {
  try {
    const data = await repo.getReportes();
    res.json(data);
  } catch (err) {
    console.error('Error al obtener reportes:', err);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
}

async function handleCreateRol(req, res) {
  const { Nombre, Nivel } = req.body;
  try {
    const result = await repo.createRol(Nombre, Nivel);
    res.status(201).json({ mensaje: 'Rol creado', data: result });
  } catch (err) {
    console.error('Error al crear rol:', err);
    res.status(500).json({ error: 'Error al crear rol' });
  }
}

async function handleCreateViaje(req, res) {
  const { Capacidad, Pedidos, Usuario, Fecha } = req.body; // Pedidos es string tipo "1,2,3"

  try {
    const result = await repo.createViajeConPedidos(Capacidad, Pedidos, Usuario, Fecha);
    res.status(201).json({ mensaje: 'Viaje y asignación completados', data: result });
  } catch (err) {
    console.error('Error al crear viaje con pedidos:', err);
    res.status(500).json({ error: 'Error al crear viaje con pedidos' });
  }
}

async function handleCreateUsuario(req, res) {
  const { nombre, apellidos, correo, departamento, rol, contrasena } = req.body;
  console.log(req.body)
  try {
    const result = await repo.createUsuario(nombre, apellidos, correo, departamento, rol, contrasena);
    res.status(201).json({ mensaje: 'Usuario creado', data: result });
  } catch (err) {
    console.error('Error al crear viaje con pedidos:', err);
    res.status(500).json({ error: 'Error al crear viaje con pedidos' });
  }
}

async function handleUpdateCliente(req, res) {
  try {
    const clienteId = parseInt(req.params.id);
    const { Nombre, Provincia, Direccion, Latitud, Longitud, UbicacionID } = req.body;

    // Validar que se reciban todos los datos necesarios
    if (!clienteId || !Nombre || !Provincia || !Direccion) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos: ID, Nombre, Provincia, Direccion' 
      });
    }

    // Validar coordenadas si se proporcionan
    if ((Latitud && !Longitud) || (!Latitud && Longitud)) {
      return res.status(400).json({ 
        error: 'Debe proporcionar tanto latitud como longitud' 
      });
    }

    // Llamar al repository para actualizar el cliente
    const result = await repo.updateCliente({
      clienteId,
      nombre: Nombre,
      ubicacionId: UbicacionID || clienteId, // Si no se proporciona UbicacionID, usar el ID del cliente
      provincia: Provincia,
      direccion: Direccion,
      latitud: Latitud ? parseFloat(Latitud) : null,
      longitud: Longitud ? parseFloat(Longitud) : null
    });

    if (result.success) {
      res.json({ 
        message: 'Cliente actualizado exitosamente',
        clienteId: clienteId 
      });
    } else {
      res.status(500).json({ error: 'Error al actualizar el cliente' });
    }

  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = {
    getUsuarios: handleGetUsuarios,
    getRoles: handleGetRoles,
    getViajes: handleGetViajes,
    getReportes: handleGetReportes,
    createRol: handleCreateRol,
    getPedidos: handleGetPedidos,
    createUsuario: handleCreateUsuario,
    createViaje: handleCreateViaje,
    deleteUsuario: handleDeleteUsuario,
    getPedidosViaje: handleGetPedidosViaje,
    getPedidosPorViaje: handleGetPedidosPorViaje,
    deleteViaje: handleDeleteViaje,
    getClientes: handleGetClientes,
    updateCliente: handleUpdateCliente
};

  
