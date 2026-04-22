const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.me);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/keys', authMiddleware, authController.saveRuntimeKeys);
router.get('/keys-status', authMiddleware, authController.getRuntimeKeyStatus);

module.exports = router;
