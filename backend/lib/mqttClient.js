const mqtt = require('mqtt');
const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883');

mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker');
});

mqttClient.on('error', (err) => {
    console.error('MQTT Error:', err);
});

module.exports = mqttClient;
