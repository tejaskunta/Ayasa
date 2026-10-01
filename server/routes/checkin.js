const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/submit', authMiddleware, checkInController.submitCheckIn);
router.get('/history', authMiddleware, checkInController.getHistory);
router.get('/insights', authMiddleware, checkInController.getInsights);
router.get('/ml-health', checkInController.getMLHealth);

module.exports = router;
