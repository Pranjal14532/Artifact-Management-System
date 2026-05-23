const jwt = require('jsonwebtoken');
const blacklist = require('../services/blacklist');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (blacklist.has(token)) {
    return res.status(401).json({ message: 'Token has been revoked' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Failed to authenticate' });
    req.user = decoded;
    req.token = token; // Store token for logout
    next();
  });
};