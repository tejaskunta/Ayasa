const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';

  if (!token) {
    return res.status(401).json({ msg: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ayasa_secret_2025');
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ msg: 'Invalid token' });
  }
}

module.exports = { authMiddleware };
