const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

router.post('/', authMiddleware, sessionController.createSession);
router.get('/', authMiddleware, sessionController.getSessions);

module.exports = router;
