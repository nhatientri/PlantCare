const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/change-password', (req, res) => authController.changePassword(req, res));

module.exports = router;
