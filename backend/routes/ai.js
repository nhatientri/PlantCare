const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

router.get('/health', (req, res) => {
    res.json({
        score: aiService.healthScore,
        anomalies: aiService.recentAnomalies
    });
});

router.post('/predict', async (req, res) => {
    // Expects { currentMoisture, temp, humidity, threshold }
    const { currentMoisture, temp, humidity, threshold } = req.body;

    if (currentMoisture === undefined || !temp || !humidity) {
        return res.status(400).json({ error: "Missing parameters" });
    }

    const hours = await aiService.predictTimeUntilDry(currentMoisture, threshold || 30, temp, humidity);
    res.json({ hoursUntilDry: hours });
});

router.post('/train', (req, res) => {
    // 1. Fetch History from DB
    const db = require('../database');
    // Get last 1000 readings for training
    db.all(`SELECT r.timestamp, r.temperature, r.humidity, r.pump_state, pr.moisture 
            FROM readings r 
            JOIN plant_readings pr ON r.id = pr.reading_id 
            WHERE pr.sensor_index = 0 
            ORDER BY r.timestamp ASC LIMIT 1000`, [], async (err, rows) => {

        if (err) return res.status(500).json({ error: err.message });

        // 2. Trigger Training
        try {
            const result = await aiService.trainModel(rows);
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

module.exports = router;
