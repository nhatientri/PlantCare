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

// Root endpoint
app.get('/', (req, res) => {
    res.send('PlantCare API is Running! 🌿');
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
