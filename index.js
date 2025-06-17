const express = require('express');
const cors = require('cors'); // <- Importa esto
const dotenv = require('dotenv');
const routes = require('./API/routes');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// IMPORTANTE: Configurar límites de payload ANTES de usar las rutas
app.use(express.json({ 
  limit: '50mb' // Aumenta el límite para JSON (ajusta según tus necesidades)
}));

app.use(express.urlencoded({ 
  limit: '50mb', // Aumenta el límite para form data
  extended: true 
}));


app.use(cors()); // <- Habilita CORS aquí
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use('/', routes);

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
