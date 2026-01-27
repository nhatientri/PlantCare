const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const deviceRoutes = require('./routes/device.routes');
const dataRoutes = require('./routes/data.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api', dataRoutes); // For history, logs, analytics root endpoints

// Error Handling (Must be last)
const errorHandler = require('./middleware/error.middleware');
app.use(errorHandler);

module.exports = app;
