const http = require('http');
const app = require('./src/app'); // Import configured Express app
const { initGateway } = require('./src/gateway');
const { initMqtt } = require('./src/mqtt');
require('dotenv').config();

const server = http.createServer(app);

// Initialize Services
initGateway(server); // Sockets
initMqtt();          // MQTT

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
