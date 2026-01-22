const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now (adjust for prod)
        methods: ["GET", "POST"]
    }
});

// Make io accessible to our router
app.set('socketio', io);

// MQTT Client Integration
const mqttClient = require('./lib/mqttClient');

// Subscribe to readings
mqttClient.on('connect', () => {
    mqttClient.subscribe('plantcare/readings', (err) => {
        if (!err) console.log("Server: Subscribed to plantcare/readings");
    });
});

// Handle incoming MQTT messages
mqttClient.on('message', (topic, message) => {
    if (topic === 'plantcare/readings') {
        try {
            const payload = JSON.parse(message.toString());

            // Broadcast to frontend via Socket.IO
            io.emit('new_reading', payload);

            if (payload.updateType === 'threshold') {
                console.log(`Socket Broadcast: Threshold Confirmation for ${payload.deviceId}: ${payload.threshold}%`);
            }
        } catch (e) {
            console.error("Error processing MQTT message:", e);
        }
    }
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const readingRoutes = require('./routes/readings');
const commandRoutes = require('./routes/commands');

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/ai', require('./routes/ai'));

// Root endpoint
app.get('/', (req, res) => {
    res.send('PlantCare API is Running! 🌿');
});

// Initialize AI Service
const aiService = require('./services/aiService');
const db = require('./database');

// Start Server Function
const startServer = async () => {
    try {
        // 1. Initialize Database
        await db.init();

        // 2. Initialize AI Service (Dependent on DB)
        await aiService.init();

        // 3. Start Listening
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
