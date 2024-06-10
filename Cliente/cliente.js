const WebSocket = require('ws');
const moment = require('moment-timezone');

// Crea una nueva instancia de WebSocket, conectándose al servidor en 'ws://localhost:3000'
const ws = new WebSocket('ws://localhost:3000');

// Define un evento que se ejecuta cuando se establece la conexión con el servidor
ws.on('open', () => {
    console.log('Conectado al server');

    // Envía una temperatura aleatoria cada 5 segundos
    setInterval(() => {
        const temperature = (Math.random() * (35 - 15) + 15).toFixed(2);
        const timestamp = moment().tz('America/Argentina/Buenos_Aires').format(); // Convierte la hora actual a la zona horaria de Buenos Aires en formato ISO
        const message = JSON.stringify({ temperature, timestamp });
        ws.send(message);
        console.log('Enviando temperatura:', message);
    }, 5000);
});

// Define un evento que se ejecuta cuando se recibe un mensaje del servidor WebSocket
ws.on('message', (data) => {
    console.log('Mensaje desde el server:', data.toString());
});

// Define un evento que se ejecuta cuando la conexión con el servidor WebSocket se cierra
ws.on('close', () => {
    console.log('Desconectado!!');
});

// Define un evento que se ejecuta cuando ocurre un error en la conexión WebSocket
ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});
