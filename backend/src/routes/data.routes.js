const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');

router.delete('/history', (req, res) => dataController.clearHistory(req, res));
router.get('/history/:deviceId', (req, res) => dataController.getHistory(req, res));
router.get('/logs', (req, res) => dataController.getLogs(req, res));
router.post('/logs', (req, res) => dataController.createLog(req, res));
router.get('/analytics', (req, res) => dataController.getAnalytics(req, res));

module.exports = router;
