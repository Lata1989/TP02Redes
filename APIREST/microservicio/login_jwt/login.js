const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken'); // Importar jwt para login

dotenv.config();

const app = express();
const PORT = process.env.PORT2 || 5002;

app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Endpoint para crear un usuario
app.post('/registrar_usuario', async (req, res) => {
  console.log("Entré al endpoint del microservicio.");
  console.log(`El usuario es: ${req.body.username}.`);
  console.log(`El pass es: ${req.body.pass}.`);
  const { username, pass } = req.body;

  if (!username || !pass) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    await crearTablaUsuarios();
    await crearUsuario(username, pass);
    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Ocurrió un error al crear el usuario' });
  }
});

// Endpoint para logear un usuario
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await verificarCredenciales(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = generarToken(username);
    res.json({ token });
  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    res.status(500).json({ error: 'Error en el inicio de sesión' });
  }
});

const generarToken = (usuario) => {
  return jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const verificarCredenciales = async (username, password) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM usuarios WHERE username = $1 AND pass = $2', [username, password]);
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error al verificar las credenciales del usuario:', error);
    throw error;
  }
};

// Creo la tabla si no existe
const crearTablaUsuarios = async () => {
  console.log("Creando la tabla 'usuarios'.");
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        pass VARCHAR(100) NOT NULL
      )
    `);
    console.log('Tabla de usuarios creada exitosamente');
  } catch (err) {
    console.error('Error creando la tabla de usuarios:', err);
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Registro de usuario
const crearUsuario = async (username, pass) => {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO usuarios (username, pass)
      VALUES ($1, $2)
    `, [username, pass]);
    console.log('Usuario creado exitosamente');
  } catch (err) {
    console.error('Error creando usuario:', err);
  } finally {
    client.release();
  }
};

// Iniciar el servidor
pool.connect()
  .then(() => {
    console.log('Conexión a la base de datos exitosa');
    app.listen(PORT, () => {
      console.log(`Microservicio de creación de usuarios funcionando correctamente en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error conectando a la base de datos:', err);
  });

module.exports = app; // Exportar app para usar en otros lugares si es necesario

/*
const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const bodyParser = require('body-parser'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Endpoint para crear un usuario
app.post('/registrar_usuario', async (req, res) => {
  console.log("Entré al endpoint del microservicio.");
  console.log(`El usuario es: ${req.body.username}.`); // Cambiar 'user' a 'username'
  console.log(`El pass es: ${req.body.pass}.`);
  const { username, pass } = req.body;// Cambiar 'user' a 'username'

  if (!username || !pass) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    await crearTablaUsuarios(); // Aquí se llama a la función para crear la tabla
    await crearUsuario(username, pass, nombre, apellido, rol); // Cambiar 'user' a 'username'
    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Ocurrió un error al crear el usuario' });
  }
});

// Creo la tabla si no existe
const crearTablaUsuarios = async () => {
  console.log("Creando la tabla 'usuarios'.");
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        pass VARCHAR(100) NOT NULL
      )
    `);
    console.log('Tabla de usuarios creada exitosamente');
  } catch (err) {
    console.error('Error creando la tabla de usuarios:', err);
  } finally {
    if (client) {
      client.release();
    }
  }
};


// Registro de usuario
const crearUsuario = async (username, pass) => {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO usuarios (username, pass)
      VALUES ($1, $2)
    `, [username, pass, nombre, apellido,rol]);
    console.log('Usuario creado exitosamente');
  } catch (err) {
    console.error('Error creando usuario:', err);
  } finally {
    client.release();
  }
};

// Endpoint para borrar la tabla de usuarios
app.delete('/borrar_tabla_usuarios', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('DROP TABLE IF EXISTS usuarios');
    console.log('Tabla de usuarios borrada exitosamente');
    res.status(200).json({ message: 'Tabla de usuarios borrada exitosamente' });
  } catch (error) {
    console.error('Error borrando la tabla de usuarios:', error);
    res.status(500).json({ error: 'Ocurrió un error al borrar la tabla de usuarios' });
  }
});

// Iniciar el servidor
pool.connect()
  .then(() => {
    console.log('Conexión a la base de datos exitosa');
    app.listen(PORT, () => {
      console.log(`Microservicio de creación de usuarios funcionando correctamente en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error conectando a la base de datos:', err);
  });
  */