const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');

router.post('/submit', checkInController.submitCheckIn);
router.get('/history', checkInController.getHistory);

module.exports = router;
