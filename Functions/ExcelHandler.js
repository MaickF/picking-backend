const ExcelJS = require('exceljs');
const fs = require('fs');
const { obtenerCoordenadas } = require('./Geolocalizacion');
const db = require('../Database/db');
const { performance } = require('perf_hooks');

async function procesarExcel(filePath) {
  let n = 0;
  let m = 0;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const hojaPedidos = workbook.getWorksheet('Dashboard');
  const hojaClientes = workbook.getWorksheet('Clientes');

  const mapaClientes = [];

  const erroresUbicaciones = [];
  const erroresClientes = [];
  const erroresPedidos = [];

  // === Procesar hoja de clientes ===
  for (let i = 2; i <= hojaClientes.rowCount; i++) {
    const inicioP1 = performance.now();
    const row = hojaClientes.getRow(i);
    const nombreSN = row.getCell('A').value?.toString().trim();
    const provincia = row.getCell('B').value?.toString().trim();
    const detalle = row.getCell('C').value?.toString().trim();
    const finP1 = performance.now();
    console.log(`Consulta Inicio 1 tardó ${(finP1 - inicioP1).toFixed(2)} ms`);
    
    try {
      let provinciaDB = provincia?.trim() || 'Provincia no especificada';
      let detalleDB = detalle?.trim() || 'Direccion no especificada';
      let idUbicacion = null;

      // PASO 1: Verificar si la ubicación ya existe
      const inicioVerif = performance.now();
      const [verificacionResult] = await db.query(
        "CALL verificarUbicacion(?, ?, @ubicacionID); SELECT @ubicacionID AS id;",
        [provinciaDB, detalleDB]
      );
      idUbicacion = verificacionResult[1][0].id;
      const finVerif = performance.now();
      console.log(`Verificación de ubicación tardó ${(finVerif - inicioVerif).toFixed(2)} ms`);
      
      // PASO 2: Solo si no existe, calcular coordenadas e insertar
      if (!idUbicacion) {
        console.log(`Ubicación no existe, calculando coordenadas para: ${detalleDB}, ${provinciaDB}`);
        
        const inicioP2 = performance.now();
        let { latitud, longitud } = await obtenerCoordenadas(detalleDB);

        if ((!latitud || !longitud) && provinciaDB !== 'Provincia no especificada') {
          const coordsProv = await obtenerCoordenadas(provinciaDB);
          latitud = coordsProv.latitud;
          longitud = coordsProv.longitud;
        }
        const finP2 = performance.now();
        console.log(`Obtención de coordenadas tardó ${(finP2 - inicioP2).toFixed(2)} ms`);
        
        const inicioP3 = performance.now();
        if (!latitud || !longitud) {
          latitud = null;
          longitud = null;
          erroresUbicaciones.push({ 
            fila: i, 
            motivo: `No se pudieron obtener coordenadas para "${detalleDB}" ni su provincia "${provinciaDB}"` 
          });
        }
        const finP3 = performance.now();
        console.log(`Validación de coordenadas tardó ${(finP3 - inicioP3).toFixed(2)} ms`);
        
        // Insertar nueva ubicación
        const inicioInsert = performance.now();
        const [insertResult] = await db.query(
          "CALL insertarUbicacion(?, ?, ?, ?, @ubicacionID); SELECT @ubicacionID AS id;",
          [provinciaDB, detalleDB, latitud, longitud]
        );
        idUbicacion = insertResult[1][0].id;
        const finInsert = performance.now();
        console.log(`Inserción de ubicación tardó ${(finInsert - inicioInsert).toFixed(2)} ms`);
        console.log(`Nueva ubicación insertada con ID: ${idUbicacion}`);
      } else {
        console.log(`Ubicación ya existe con ID: ${idUbicacion} - Coordenadas no calculadas`);
      }

      // PASO 3: Crear o verificar cliente
      const inicio2 = performance.now();
      console.log("Nombre antes de la consulta:", nombreSN);
      console.log("ID Ubicación para cliente:", idUbicacion);
      
      const [clienteResult] = await db.query(
        "CALL crearCliente(?, ?, @clienteID, @was_inserted); SELECT @clienteID AS id, @was_inserted AS was_inserted;",
        [nombreSN, idUbicacion]
      );
      const idCliente = clienteResult[1][0].id;
      const wasInserted = clienteResult[1][0].was_inserted;

      if (!wasInserted) {
        console.log("El cliente:", i, "No fue insertado por motivos internos");
        console.log("Nombre:", nombreSN);
        console.log("ID Ubicación:", idUbicacion);
        console.log("ID Cliente existente:", idCliente);
      } else {
        console.log("Cliente insertado exitosamente:", nombreSN, "con ID:", idCliente);
      }
      
      const fin2 = performance.now();
      console.log(`Consulta crearCliente tardó ${(fin2 - inicio2).toFixed(2)} ms`);
      
      // Agregar al mapa de clientes
      mapaClientes.push({ 
        nombreCliente: nombreSN, 
        idCliente: idCliente, 
        idUbicacion: idUbicacion 
      });
      
      n++;
    } catch (error) {
      console.error(`Error procesando cliente en fila ${i}:`, error);
      erroresClientes.push({ 
        fila: i, 
        motivo: `Error SQL o geolocalización: ${error.message}` 
      });
    }
  }

  // Asegurar existencia de ubicación y cliente genéricos
  const provinciaGenerica = "Provincia no especificada";
  const direccionGenerica = "Direccion no especificada";
  let idUbicacionGenerica = null;

  // Verificar si la ubicación genérica ya existe
  const [verificacionGenericaResult] = await db.query(
    "CALL verificarUbicacion(?, ?, @ubicacionID); SELECT @ubicacionID AS id;",
    [provinciaGenerica, direccionGenerica]
  );
  idUbicacionGenerica = verificacionGenericaResult[1][0].id;

  // Si no existe, crearla
  if (!idUbicacionGenerica) {
    const [insertGenericaResult] = await db.query(
      "CALL insertarUbicacion(?, ?, ?, ?, @ubicacionID); SELECT @ubicacionID AS id;",
      [provinciaGenerica, direccionGenerica, null, null]
    );
    idUbicacionGenerica = insertGenericaResult[1][0].id;
    console.log("Ubicación genérica creada con ID:", idUbicacionGenerica);
  } else {
    console.log("Ubicación genérica ya existe con ID:", idUbicacionGenerica);
  }

  // === Procesar hoja de pedidos ===
  const headers = hojaPedidos.getRow(1).values.slice(1).map(h => String(h).trim());
  
  for (let i = 2; i <= hojaPedidos.rowCount; i++) {
    const row = hojaPedidos.getRow(i);
    const values = row.values.slice(1);
    const pedido = {};
    
    headers.forEach((key, idx) => {
      pedido[key] = values[idx] ?? null;
    });

    const clienteNombre = pedido['Nombre SN']?.toString().trim();
    
    if (!clienteNombre) {
      erroresPedidos.push({ 
        fila: i, 
        motivo: 'Nombre de cliente vacío o inválido' 
      });
      continue;
    }

    // Buscar cliente en el mapa
    let match = mapaClientes.find(c => c.nombreCliente === clienteNombre);
    
    if (!match) {
      console.log("CLIENTE NO EXISTENTE EN MAPA:", clienteNombre);
      console.log("Creando cliente con ubicación genérica...");
      
      try {
        const [clienteResult] = await db.query(
          "CALL crearCliente(?, ?, @clienteID, @was_inserted); SELECT @clienteID AS id, @was_inserted AS was_inserted;",
          [clienteNombre, idUbicacionGenerica]
        );
        const idCliente = clienteResult[1][0].id;
        const wasInserted = clienteResult[1][0].was_inserted;
        
        console.log(`Cliente '${clienteNombre}' ${wasInserted ? 'creado' : 'ya existía'} con ID: ${idCliente}`);
        
        match = { 
          nombreCliente: clienteNombre, 
          idCliente: idCliente, 
          idUbicacion: idUbicacionGenerica 
        };
        
        mapaClientes.push(match);
      } catch (error) {
        console.error(`Error creando cliente '${clienteNombre}':`, error);
        erroresPedidos.push({ 
          fila: i, 
          motivo: `Error creando cliente: ${error.message}` 
        });
        continue;
      }
    }

    try {
      // Validar y procesar datos del pedido
      const peso = parseFloat(pedido['Peso']) || 0;
      const descripcion = pedido['Descripción']?.toString().trim() || '';
      const empleado = pedido['Empleado del departamento de ventas']?.toString().trim() || '';
      const nroDocumento = parseInt(pedido['Nº documento']) || 0;
      const fechaContabilizacion = pedido['Fecha de contabilización']
        ? (() => {
            const fechaObj = new Date(pedido['Fecha de contabilización']);
            const dia = String(fechaObj.getDate()).padStart(2, '0');
            const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
            const anio = String(fechaObj.getFullYear()).slice(-2); // últimos dos dígitos
            return `${dia}/${mes}/${anio}`;
          })()
        : (() => {
            const fechaObj = new Date();
            const dia = String(fechaObj.getDate()).padStart(2, '0');
            const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
            const anio = String(fechaObj.getFullYear()).slice(-2);
            return `${dia}/${mes}/${anio}`;
          })();
      const aLiberar = parseInt(pedido['A liberar']) || 0;
      const disponibleLiberar = parseInt(pedido['Disponible para liberar']) || 0;
      
      console.log(`Procesando pedido ${m + 1} para cliente '${clienteNombre}' (ID: ${match.idCliente})`);
      
      const resultado = await db.query("CALL crearPedidos(?, ?, ?, ?, ?, ?, ?, ?, @was_inserted); SELECT @was_inserted AS was_inserted;", [
        peso,
        descripcion,
        match.idCliente,
        empleado,
        nroDocumento,
        fechaContabilizacion,
        aLiberar,
        disponibleLiberar,
      ]);
      m++;
      console.log(`Pedido ${m} procesado exitosamente`);
      
    } catch (error) {
      console.error(`Error procesando pedido en fila ${i}:`, error);
      erroresPedidos.push({ 
        fila: i, 
        motivo: `Error SQL: ${error.message}` 
      });
    }
  }

  // === Mostrar resumen ===
  console.log(`\n📊 RESUMEN DEL PROCESAMIENTO:`);
  console.log(`✅ Clientes procesados: ${n}`);
  console.log(`✅ Pedidos procesados: ${m}`);
  console.log(`⚠️  Errores de ubicaciones: ${erroresUbicaciones.length}`);
  console.log(`⚠️  Errores de clientes: ${erroresClientes.length}`);
  console.log(`⚠️  Errores de pedidos: ${erroresPedidos.length}`);

  // === Mostrar errores detallados ===
  const printErrores = (titulo, lista) => {
    if (lista.length === 0) return;
    console.log(`\n📌 ${titulo}`);
    lista.forEach(({ fila, motivo }) => {
      console.log(`→ Fila ${fila}: ${motivo}`);
    });
  };

  printErrores('Ubicaciones con problemas', erroresUbicaciones);
  printErrores('Clientes con errores', erroresClientes);
  printErrores('Pedidos omitidos', erroresPedidos);

  if (erroresUbicaciones.length === 0 && erroresClientes.length === 0 && erroresPedidos.length === 0) {
    console.log('\n✅ Todos los datos fueron insertados correctamente.');
  }
  
  return {
    clientesProcesados: n,
    pedidosProcesados: m,
    errores: {
      ubicaciones: erroresUbicaciones.length,
      clientes: erroresClientes.length,
      pedidos: erroresPedidos.length
    }
  };
}

async function handleExcelUpload(req, res) {
  const filePath = req.file.path;

  try {
    const resultado = await procesarExcel(filePath);
    res.json({ 
      mensaje: 'Procesamiento completado exitosamente.',
      resultado: resultado
    });
  } catch (err) {
    console.error('Error al procesar archivo Excel:', err);
    res.status(500).json({ 
      error: 'Error procesando el archivo Excel',
      detalle: err.message 
    });
  } finally {
    // Limpiar archivo temporal
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('No se pudo eliminar el archivo temporal:', cleanupError.message);
    }
  }
}

module.exports = { handleExcelUpload };