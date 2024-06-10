// src/api.js
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const axios = require('axios');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;
const port2 = process.env.PORT2 || 5002;

app.use(bodyParser.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Conexión a la base de datos
pool.connect((err, client, done) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        process.exit(1);
    }
    console.log('Conexión a la base de datos establecida correctamente');

    app.on('close', () => {
        done();
    });

    app.listen(port, () => {
        console.log(`API REST escuchando en el puerto ${port}`);
    });
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Crear tabla de temperaturas
const crearTablaTemperaturas = async () => {
    console.log("Creando la tabla 'temperaturas'.");
    let client;
    try {
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS temperaturas (
                id SERIAL PRIMARY KEY,
                temperatura NUMERIC NOT NULL,
                hora TIMESTAMP NOT NULL
            )
        `);
        console.log('Tabla de temperaturas creada exitosamente');
    } catch (err) {
        console.error('Error creando la tabla de temperaturas:', err);
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Crear tabla de usuarios
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

// Agregar temperatura a la tabla
const agregarTemperatura = async (temperatura, hora) => {
    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO temperaturas (temperatura, hora)
            VALUES ($1, $2)
        `, [temperatura, hora]);
        console.log('Temperatura agregada exitosamente');
    } catch (err) {
        console.error('Error agregando temperatura:', err);
    } finally {
        client.release();
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

// Verificar credenciales de usuario
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

// Generar token JWT
const generarToken = (usuario) => {
    return jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Verificar token JWT
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ mensaje: 'Token de autorización no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ mensaje: 'Token no válido' });
        }
        req.usuario = decoded.usuario;
        next();
    });
}

// Endpoint para agregar una temperatura
app.post('/agregar_temperatura', verificarToken, async (req, res) => {
    console.log("Entré al endpoint para agregar temperatura.");
    console.log(`La temperatura es: ${req.body.temperatura}.`);
    console.log(`La hora es: ${req.body.hora}.`);

    const { temperatura, hora } = req.body;

    if (!temperatura || !hora) {
        return res.status(400).json({ error: 'La temperatura y la hora son obligatorias' });
    }

    try {
        await crearTablaTemperaturas();
        await agregarTemperatura(temperatura, hora);
        res.status(201).json({ message: 'Temperatura agregada exitosamente' });
    } catch (error) {
        console.error('Error agregando temperatura:', error);
        res.status(500).json({ error: 'Ocurrió un error al agregar la temperatura' });
    }
});

// Endpoint para obtener las temperaturas
app.get('/temperaturas', verificarToken, async (req, res) => {
    const { from, to } = req.query;

    try {
        const client = await pool.connect();
        let query = 'SELECT * FROM temperaturas';
        let params = [];

        if (from && to) {
            query += ' WHERE hora BETWEEN $1 AND $2';
            params = [from, to];
        }

        const result = await client.query(query, params);
        client.release();

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching temperaturas:', error);
        res.status(500).json({ error: 'Error fetching temperaturas' });
    }
});

// Endpoint para registro de usuario
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

// Endpoint para login de usuario
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

module.exports = app;

/*
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // Agregar axios para realizar peticiones HTTP

// Carga las variables de entorno desde el archivo .env
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;  // Usa PORT o el puerto 4001 por defecto
const port2 = process.env.PORT2 || 5002 // Usa el PORT2 o el puerto 5002

app.use(bodyParser.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
});

// Intenta conectar a la base de datos
pool.connect((err, client, done) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        process.exit(1); // Sale del proceso con un código de error
    }
    console.log('Conexión a la base de datos establecida correctamente');

    // Cierra la conexión con la base de datos cuando se detiene el servidor
    app.on('close', () => {
        done();
    });

    // Abre el puerto para escuchar conexiones solo después de que se haya establecido la conexión a la base de datos
    app.listen(port, () => {
        console.log(`API REST escuchando en el puerto ${port}`);
    });
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Endpoint para agregar una temperatura
//app.post('/agregar_temperatura', verificarToken, async (req, res) => {
app.post('/agregar_temperatura', async (req, res) => {
    console.log("Entré al endpoint para agregar temperatura.");
    console.log(`La temperatura es: ${req.body.temperatura}.`);
    console.log(`La hora es: ${req.body.hora}.`);

    const { temperatura, hora } = req.body;

    if (!temperatura || !hora) {
        return res.status(400).json({ error: 'La temperatura y la hora son obligatorias' });
    }

    try {
        await crearTablaTemperaturas();
        await agregarTemperatura(temperatura, hora);
        res.status(201).json({ message: 'Temperatura agregada exitosamente' });
    } catch (error) {
        console.error('Error agregando temperatura:', error);
        res.status(500).json({ error: 'Ocurrió un error al agregar la temperatura' });
    }
});

// Creo la tabla si no existe
const crearTablaTemperaturas = async () => {
    console.log("Creando la tabla 'temperaturas'.");
    let client;
    try {
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS temperaturas (
                id SERIAL PRIMARY KEY,
                temperatura NUMERIC NOT NULL,
                hora TIMESTAMP NOT NULL
            )
        `);
        console.log('Tabla de temperaturas creada exitosamente');
    } catch (err) {
        console.error('Error creando la tabla de temperaturas:', err);
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Agregar temperatura a la tabla
const agregarTemperatura = async (temperatura, hora) => {
    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO temperaturas (temperatura, hora)
            VALUES ($1, $2)
        `, [temperatura, hora]);
        console.log('Temperatura agregada exitosamente');
    } catch (err) {
        console.error('Error agregando temperatura:', err);
    } finally {
        client.release();
    }
};

//    Login con control de JWT


const JWT_SECRET = process.env.JWT_SECRET;

  // Genero el token JWT
  function generarToken(usuario) {
    return jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }
  
  // Verifico que el token no haya caducado
  function verificarToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ mensaje: 'Token de autorización no proporcionado' });
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ mensaje: 'Token no válido' });
        }
        req.usuario = decoded.usuario;
        next();
    });
  }

// Login usuario
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const response = await axios.post(`http://localhost:${port2}/login`, { username, password }); // Llama al microservicio
        const { token } = response.data;
        res.json({ token });
    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({ error: 'Error en el inicio de sesión' });
    }
});

// Registro de usuario
app.post('/registrar_usuario', async (req, res) => {
    try {
        const { username, pass } = req.body;
        const response = await axios.post(`http://localhost:${port2}/registrar_usuario`, { username, pass }); // Llama al microservicio
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error registrando usuario:', error);
        res.status(500).json({ error: 'Error registrando usuario' });
    }
});

module.exports = app; // Exportar app para usar en el microservicio

*/

/*
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Carga las variables de entorno desde el archivo .env
dotenv.config();

const app = express();
const port = process.env.PORT2 || 4002;  // Usa PORT2 o el puerto 4002 por defecto

app.use(bodyParser.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
});

// Intenta conectar a la base de datos
pool.connect((err, client, done) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        process.exit(1); // Sale del proceso con un código de error
    }
    console.log('Conexión a la base de datos establecida correctamente');

    // Cierra la conexión con la base de datos cuando se detiene el servidor
    app.on('close', () => {
        done();
    });

    // Abre el puerto para escuchar conexiones solo después de que se haya establecido la conexión a la base de datos
    app.listen(port, () => {
        console.log(`API REST escuchando en el puerto ${port}`);
    });
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Endpoint para agregar una temperatura
app.post('/agregar_temperatura', async (req, res) => {
    console.log("Entré al endpoint para agregar temperatura.");
    console.log(`La temperatura es: ${req.body.temperatura}.`);
    console.log(`La hora es: ${req.body.hora}.`);

    const { temperatura, hora } = req.body;

    if (!temperatura || !hora) {
        return res.status(400).json({ error: 'La temperatura y la hora son obligatorias' });
    }

    try {
        await crearTablaTemperaturas();
        await agregarTemperatura(temperatura, hora);
        res.status(201).json({ message: 'Temperatura agregada exitosamente' });
    } catch (error) {
        console.error('Error agregando temperatura:', error);
        res.status(500).json({ error: 'Ocurrió un error al agregar la temperatura' });
    }
});

// Creo la tabla si no existe
const crearTablaTemperaturas = async () => {
    console.log("Creando la tabla 'temperaturas'.");
    let client;
    try {
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS temperaturas (
                id SERIAL PRIMARY KEY,
                temperatura NUMERIC NOT NULL,
                hora TIMESTAMP NOT NULL
            )
        `);
        console.log('Tabla de temperaturas creada exitosamente');
    } catch (err) {
        console.error('Error creando la tabla de temperaturas:', err);
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Agregar temperatura a la tabla
const agregarTemperatura = async (temperatura, hora) => {
    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO temperaturas (temperatura, hora)
            VALUES ($1, $2)
        `, [temperatura, hora]);
        console.log('Temperatura agregada exitosamente');
    } catch (err) {
        console.error('Error agregando temperatura:', err);
    } finally {
        client.release();
    }
};

*/
/*
    Login con control de JWT
*/
/*
const JWT_SECRET = process.env.JWT_SECRET;

  // Genero el token JWT
  function generarToken(usuario) {
    return jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }
  
  // Verifico que el token no haya caducado
  function verificarToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ mensaje: 'Token de autorización no proporcionado' });
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ mensaje: 'Token no válido' });
        }
        req.usuario = decoded.usuario;
        next();
    });
  }

// Login usuario
app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Verificar las credenciales del usuario en la base de datos
      const user = await verificarCredenciales(username, password);
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
  
      // Generar token JWT
      const token = generarToken(username);
  
      // Devolver el token al cliente
      res.json({ token });
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      res.status(500).json({ error: 'Error en el inicio de sesión' });
    }
  });
  
  // Función para verificar las credenciales del usuario
  async function verificarCredenciales(username, password) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM usuarios WHERE username = $1 AND pass = $2', [username, password]);
      client.release();
      return result.rows[0]; // Devuelve el primer usuario encontrado o undefined si no se encuentra ningún usuario
    } catch (error) {
      console.error('Error al verificar las credenciales del usuario:', error);
      throw error;
    }
  }

*/