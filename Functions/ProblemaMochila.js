class ProblemaMochila {
  constructor() {
    this.datos = []; // Tabla donde se imprime el resultado del algoritmo
    this.datos2 = []; // Tabla que almacena la cantidad de objetos usados por cada posición
    this.objetos = []; // Lista de objetos creados a partir de las entradas
    this.capacidad = 0; // Capacidad de la mochila
    this.cantidad = 0; // Cantidad de objetos
    this.escala = 100; // Escala para reducir el tamaño de la matriz
    this.capacidadEscalada = 0; // Capacidad dividida por la escala
  }

  /**
   * Valida los datos de entrada
   * @param {Array} objetos - Array de objetos con formato [id, costo, valor, cantidad]
   * @param {number} capacidad - Capacidad máxima de la mochila
   * @throws {Error} Si los datos no son válidos
   */
  validarDatos(objetos, capacidad) {
    if (!Array.isArray(objetos)) {
      throw new Error('VALIDACIÓN: Los objetos deben ser un array');
    }
    
    if (objetos.length === 0) {
      throw new Error('VALIDACIÓN: Debe proporcionar al menos un objeto');
    }
    
    if (typeof capacidad !== 'number' || capacidad <= 0) {
      throw new Error('VALIDACIÓN: La capacidad debe ser un número positivo');
    }
    
    if (capacidad < this.escala) {
      throw new Error(`VALIDACIÓN: La capacidad debe ser al menos ${this.escala} para usar esta escala`);
    }

    objetos.forEach((objeto, index) => {
      try {
        if (!Array.isArray(objeto) || objeto.length !== 4) {
          throw new Error(`debe tener formato [id, costo, valor, cantidad]`);
        }
        
        const [id, costo, valor, cantidad] = objeto;
        
        if (typeof id !== 'number') {
          throw new Error(`id debe ser un número`);
        }
        
        if (typeof costo !== 'number' || costo <= 0) {
          throw new Error(`costo debe ser un número positivo`);
        }
        
        if (typeof valor !== 'number' || valor <= 0) {
          throw new Error(`valor debe ser un número positivo`);
        }
        
        if (cantidad !== 'i' && (typeof cantidad !== 'number' || cantidad <= 0)) {
          throw new Error(`cantidad debe ser un número positivo o 'i' para infinito`);
        }
        
      } catch (error) {
        throw new Error(`VALIDACIÓN: Objeto en índice ${index} ${error.message}`);
      }
    });
  }

  /**
   * Configura los datos iniciales para el problema
   * @param {Array} objetos - Array de objetos con formato [id, costo, valor, cantidad]
   * @param {number} capacidad - Capacidad máxima de la mochila
   * @throws {Error} Si los datos no son válidos
   */
  configurarDatos(objetos, capacidad) {
    try {
      this.validarDatos(objetos, capacidad);
      
      this.objetos = objetos;
      this.capacidad = capacidad;
      this.cantidad = objetos.length;
      this.capacidadEscalada = Math.floor(capacidad / this.escala);
      
      console.log(`Configuración exitosa: ${this.cantidad} objetos, capacidad ${capacidad}, matriz reducida a ${this.capacidadEscalada + 1} filas`);
      
    } catch (error) {
      console.error('ERROR EN CONFIGURACIÓN:', error.message);
      throw error;
    }
  }

  /**
   * Crea una tabla inicial para ejecutar el algoritmo (escalada)
   * @returns {Array} Tabla inicial con encabezados y valores en 0
   * @throws {Error} Si hay problemas creando la tabla
   */
  crearTablaInicial() {
    try {
      const tabla = [];
      
      for (let i = 0; i <= this.capacidadEscalada + 1; i++) {
        const fila = [];
        
        for (let j = 0; j <= this.cantidad; j++) {
          if (i === 0 && j === 0) {
            fila[j] = "";
          } else if (j === 0) {
            fila[j] = (i - 1) * this.escala; // Mostrar capacidad real
          } else if (i === 0) {
            fila[j] = `objeto${j}`;
          } else {
            fila[j] = 0;
          }
        }
        tabla[i] = fila;
      }
      
      return tabla;
      
    } catch (error) {
      throw new Error(`TABLA_INICIAL: Error creando tabla inicial - ${error.message}`);
    }
  }

  /**
   * Convierte capacidad real a índice escalado
   * @param {number} capacidadReal - Capacidad en unidades reales
   * @returns {number} Índice correspondiente en la tabla escalada
   */
  capacidadAIndice(capacidadReal) {
    return Math.floor(capacidadReal / this.escala);
  }

  /**
   * Convierte índice escalado a capacidad real
   * @param {number} indice - Índice en la tabla escalada
   * @returns {number} Capacidad real correspondiente
   */
  indiceACapacidad(indice) {
    return indice * this.escala;
  }

  /**
   * Genera lista de valores posibles para una posición específica (con escala)
   * CORRECCIÓN: Validación estricta de capacidad
   */
  listaValores(valor, costo, cantidad, tabla, posI, posJ, capacidadReal) {
    try {
      const respuesta = [];
      const valorActual = tabla[posJ]?.[posI - 1] ?? 0;
      respuesta[0] = [valorActual, 0];

      if (cantidad === 'i') {
        let i = 1;
        while (true) {
          const costoTotal = costo * i;
          // CORRECCIÓN: Validación estricta de capacidad real
          if (costoTotal > capacidadReal) break;
          
          const capacidadRestante = capacidadReal - costoTotal;
          const indiceAnterior = this.capacidadAIndice(capacidadRestante) + 1;
          
          if (indiceAnterior >= 0 && indiceAnterior < tabla.length && tabla[indiceAnterior]) {
            const valorAnterior = tabla[indiceAnterior][posI - 1] ?? 0;
            const opcion = (i * valor) + valorAnterior;
            respuesta[i] = [opcion, i];
          }
          i++;
        }
      } else {
        for (let i = 1; i <= cantidad; i++) {
          const costoTotal = costo * i;
          // CORRECCIÓN: Validación estricta de capacidad real
          if (costoTotal > capacidadReal) break;
          
          const capacidadRestante = capacidadReal - costoTotal;
          const indiceAnterior = this.capacidadAIndice(capacidadRestante) + 1;
          
          if (indiceAnterior >= 0 && indiceAnterior < tabla.length && tabla[indiceAnterior]) {
            const valorAnterior = tabla[indiceAnterior][posI - 1] ?? 0;
            const opcion = (i * valor) + valorAnterior;
            respuesta[i] = [opcion, i];
          }
        }
      }
      
      return respuesta;
      
    } catch (error) {
      throw new Error(`LISTA_VALORES: Error calculando valores en posición [${posJ}][${posI}] - ${error.message}`);
    }
  }

  /**
   * Calcula el valor máximo para la primera columna (con escala)
   * CORRECCIÓN: Validación estricta de capacidad
   */
  primeraColumna(valor, costo, cantidad, capacidadReal) {
    try {
      let temp = 0;
      let cont = 0;

      if (cantidad === 'i') {
        let i = 1;
        while (true) {
          const costoTotal = costo * i;
          // CORRECCIÓN: Validación estricta de capacidad real
          if (costoTotal > capacidadReal) break;
          temp += valor;
          cont += 1;
          i++;
        }
      } else {
        for (let i = 1; i <= cantidad; i++) {
          const costoTotal = costo * i;
          // CORRECCIÓN: Validación estricta de capacidad real
          if (costoTotal > capacidadReal) break;
          temp += valor;
          cont += 1;
        }
      }
      
      return [temp, cont];
      
    } catch (error) {
      throw new Error(`PRIMERA_COLUMNA: Error calculando primera columna - ${error.message}`);
    }
  }

  /**
   * Encuentra la opción con el valor mayor
   * @param {Array} listaOpciones - Lista de opciones [valor, cantidad]
   * @returns {Array} La opción con mayor valor
   * @throws {Error} Si la lista está vacía o es inválida
   */
  max(listaOpciones) {
    try {
      if (!Array.isArray(listaOpciones) || listaOpciones.length === 0) {
        throw new Error('Lista de opciones vacía o inválida');
      }
      
      let mayor = -Infinity;
      let indice = 0;
      
      for (let i = 0; i < listaOpciones.length; i++) {
        if (!Array.isArray(listaOpciones[i]) || listaOpciones[i].length < 2) {
          continue;
        }
        
        const valorActual = listaOpciones[i][0];
        if (typeof valorActual === 'number' && valorActual >= mayor) {
          mayor = valorActual;
          indice = i;
        }
      }
      
      return listaOpciones[indice];
      
    } catch (error) {
      throw new Error(`MAX: Error encontrando valor máximo - ${error.message}`);
    }
  }

  /**
   * Ejecuta el algoritmo principal del problema de la mochila
   * CORRECCIÓN: Mejor manejo de capacidades y validaciones
   */
  resolver() {
    try {
      if (this.objetos.length === 0) {
        throw new Error('No hay objetos configurados. Llame a configurarDatos() primero.');
      }
      
      console.log('Iniciando resolución del problema de la mochila...');
      
      const tabla = this.crearTablaInicial();
      const tabla2 = tabla.map(subArray => [...subArray]);

      for (let i = 1; i <= this.cantidad; i++) {
        try {
          for (let j = 1; j <= this.capacidadEscalada + 1; j++) {
            const objetoActual = this.objetos[i - 1];
            
            if (!objetoActual) {
              throw new Error(`Objeto en índice ${i - 1} no encontrado`);
            }
            
            const [, costo, valor, cantidad] = objetoActual;
            // CORRECCIÓN: Calcular capacidad real correctamente
            const capacidadReal = Math.min(this.indiceACapacidad(j - 1), this.capacidad);

            if (i === 1) {
              const posActual = this.primeraColumna(valor, costo, cantidad, capacidadReal);
              tabla[j][i] = posActual[0];
              tabla2[j][i] = posActual[1];
            } else {
              const opciones = this.listaValores(valor, costo, cantidad, tabla, i, j, capacidadReal);
              const posActual = this.max(opciones);
              tabla[j][i] = posActual[0];
              tabla2[j][i] = posActual[1];
            }
          }
        } catch (error) {
          throw new Error(`Error procesando objeto ${i}: ${error.message}`);
        }
      }
      
      console.log("Resolución completada exitosamente");
      
      this.datos = tabla;
      this.datos2 = tabla2;
      
      return {
        tablaValores: tabla,
        tablaCantidades: tabla2,
        valorMaximo: tabla[this.capacidadEscalada + 1]?.[this.cantidad] ?? 0,
        capacidadUsada: this.capacidad,
        escalaUtilizada: this.escala
      };
      
    } catch (error) {
      console.error('ERROR EN RESOLUCIÓN:', error.message);
      throw new Error(`RESOLVER: ${error.message}`);
    }
  }

  /**
   * NUEVA FUNCIÓN: Reconstruye la solución óptima desde las tablas
   * @returns {Array} Array de objetos seleccionados con sus cantidades
   */
  reconstruirSolucion() {
    try {
      if (this.datos.length === 0 || this.datos2.length === 0) {
        throw new Error('No hay datos disponibles. Ejecute resolver() primero.');
      }

      const solucion = [];
      let capacidadRestante = this.capacidad;
      let filaActual = this.capacidadEscalada + 1;

      // Iterar desde el último objeto hacia el primero
      for (let i = this.cantidad; i >= 1; i--) {
        if (filaActual >= 0 && filaActual < this.datos2.length && 
            this.datos2[filaActual] && this.datos2[filaActual][i]) {
          
          const cantidadUsada = this.datos2[filaActual][i];
          
          if (cantidadUsada > 0) {
            const objeto = this.objetos[i - 1];
            const [id, costo, valor] = objeto;
            
            // VALIDACIÓN: Verificar que no se supere la capacidad
            const pesoTotal = costo * cantidadUsada;
            if (pesoTotal <= capacidadRestante) {
              solucion.push({
                id: id,
                costo: costo,
                valor: valor,
                cantidadUsada: cantidadUsada,
                pesoTotal: pesoTotal,
                valorTotal: valor * cantidadUsada
              });
              
              capacidadRestante -= pesoTotal;
              // Actualizar fila para el siguiente objeto
              filaActual = this.capacidadAIndice(capacidadRestante) + 1;
            }
          }
        }
      }

      return solucion.reverse(); // Devolver en orden original
      
    } catch (error) {
      console.error('ERROR RECONSTRUYENDO SOLUCIÓN:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene el resultado de la última ejecución
   * @returns {Object} Resultado con tablas y estadísticas
   * @throws {Error} Si no hay resultados disponibles
   */
  obtenerResultado() {
    try {
      if (this.datos.length === 0) {
        throw new Error('No hay resultados disponibles. Ejecute resolver() primero.');
      }
      
      return {
        tablaValores: this.datos,
        tablaCantidades: this.datos2,
        objetos: this.objetos,
        capacidad: this.capacidad,
        cantidad: this.cantidad,
        escalaUtilizada: this.escala,
        capacidadEscalada: this.capacidadEscalada,
        solucionOptima: this.reconstruirSolucion()
      };
      
    } catch (error) {
      console.error('ERROR OBTENIENDO RESULTADO:', error.message);
      throw error;
    }
  }

  /**
   * Cambia la escala utilizada para la matriz (por defecto 100)
   * @param {number} nuevaEscala - Nueva escala a utilizar
   * @throws {Error} Si la escala no es válida
   */
  cambiarEscala(nuevaEscala) {
    try {
      if (typeof nuevaEscala !== 'number' || nuevaEscala <= 0) {
        throw new Error('La escala debe ser un número positivo');
      }
      
      if (this.capacidad > 0 && nuevaEscala > this.capacidad) {
        throw new Error(`La escala (${nuevaEscala}) no puede ser mayor que la capacidad (${this.capacidad})`);
      }
      
      this.escala = nuevaEscala;
      if (this.capacidad > 0) {
        this.capacidadEscalada = Math.floor(this.capacidad / this.escala);
      }
      
      console.log(`Escala cambiada a ${nuevaEscala}`);
      
    } catch (error) {
      console.error('ERROR CAMBIANDO ESCALA:', error.message);
      throw error;
    }
  }
}

module.exports = ProblemaMochila;