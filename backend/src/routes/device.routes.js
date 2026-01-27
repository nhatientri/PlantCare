const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');

router.post('/claim', (req, res) => deviceController.claim(req, res));
router.get('/', (req, res) => deviceController.list(req, res));
router.delete('/:deviceId', (req, res) => deviceController.delete(req, res));
router.put('/:deviceId/nickname', (req, res) => deviceController.rename(req, res));
router.post('/command', (req, res) => deviceController.command(req, res));

module.exports = router;
