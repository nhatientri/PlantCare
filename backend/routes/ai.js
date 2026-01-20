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

module.exports = router;
