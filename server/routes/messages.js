const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const messageController = require('../controllers/messageController');

const router = express.Router();

router.post('/', authMiddleware, messageController.createMessage);
router.get('/:sessionId', authMiddleware, messageController.getMessagesBySession);

module.exports = router;
