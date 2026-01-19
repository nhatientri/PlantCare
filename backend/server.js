const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
