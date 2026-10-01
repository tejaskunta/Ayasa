const express = require('express');

const {
  createSession,
  listSessions,
  getMessages,
  postMessage,
} = require('../controllers/sessionController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every session route is protected.
router.use(requireAuth);

router.post('/', createSession);
router.get('/', listSessions);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', postMessage);

module.exports = router;