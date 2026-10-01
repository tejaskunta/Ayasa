const express = require('express');

const {
  createCheckIn,
  listCheckIns,
  getInsights,
} = require('../controllers/checkInController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/', createCheckIn);
router.get('/', listCheckIns);
router.get('/insights', getInsights);

module.exports = router;