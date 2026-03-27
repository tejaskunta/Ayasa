const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');

router.post('/submit', checkInController.submitCheckIn);
router.get('/history', checkInController.getHistory);
router.get('/ml-health', checkInController.getMLHealth);

module.exports = router;
