require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');

const app = express();
const port = process.env.PORT || 4001;
const API_URL = process.env.API_URL || 'http://localhost:5001/agregar_temperatura';

app.use(bodyParser.json());

app.post('/webhook/temperatura', (req, res) => {
    let { temperature, timestamp } = req.body;

    console.log(`La temperatura es ${temperature}.`);
    console.log(`La hora original es ${timestamp}.`);

    // Convertir la hora a la zona horaria de Buenos Aires
    timestamp = moment(timestamp).tz('America/Argentina/Buenos_Aires').format();

    console.log(`La hora convertida es ${timestamp}.`);

    // Enviar la temperatura y la fecha a la API REST
    axios.post('http://localhost:5001/agregar_temperatura', {
        temperatura: temperature,
        hora: timestamp
    })
    .then(response => {
        console.log('Temperatura enviada a la API REST:', response.data);
        res.status(200).json({ message: 'Datos enviados a la API REST' });
    })
    .catch(error => {
        console.error('Error al enviar la temperatura a la API REST:', error);
        res.status(500).json({ error: 'Error al enviar los datos a la API REST' });
    });
});

app.listen(port, () => {
    console.log(`Webhook escuchando en el puerto ${port}`);
});


/*
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 4001;  // Asegúrate de que esto use la variable de entorno PORT o el puerto 4001 por defecto
const API_URL = process.env.API_URL || 'http://localhost:4002/agregar_temperatura';  // Asegúrate de que esto use la variable de entorno API_URL o la URL por defecto

app.use(bodyParser.json());

app.post('/webhook/temperatura', (req, res) => {
    // const { temperature, timestamp } = req.body;
    temperature = req.body.temperature;
    timestamp = req.body.timestamp;

    console.log(`La temperatura es ${temperature}.`);
    console.log(`La hora es ${timestamp}.`);

    // Enviar la temperatura y la fecha a la API REST
    axios.post('http://localhost:4002/agregar_temperatura', {
        temperatura: temperature,
        hora: timestamp
    })
    .then(response => {
        console.log('Temperatura enviada a la API REST:', response.data);
        res.status(200).json({ message: 'Datos enviados a la API REST' });
    })
    .catch(error => {
        console.error('Error al enviar la temperatura a la API REST:', error);
        res.status(500).json({ error: 'Error al enviar los datos a la API REST' });
    });
});

app.listen(port, () => {
    console.log(`Webhook escuchando en el puerto ${port}`);
});
*/