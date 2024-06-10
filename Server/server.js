require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/send-message', (req, res) => {
    const { message } = req.body;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    res.send({ status: 'Mensaje enviado', message });
});

wss.on('connection', (ws) => {
    console.log('Cliente conectado!');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const { temperature, timestamp } = data;
        console.log('Temperatura recibida:', temperature);
        console.log('Hora recibida:', timestamp);

        // Enviar la temperatura y la hora al webhook
        // axios.post(WEBHOOK_URL, {
        axios.post('http://localhost:4001/webhook/temperatura', {
            temperature,
            timestamp
        })
        .then(response => {
            console.log('Temperatura enviada al webhook:', response.data);
        })
        .catch(error => {
            console.error('Error al enviar la temperatura al webhook:', error);
        });
    });

    ws.on('close', () => {
        console.log('Cliente desconectado!!!');
    });
});

server.listen(3000, () => {
    console.log('Server en el puerto 3000');
});
