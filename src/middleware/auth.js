const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      // Try to verify the access token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
      next();
    } catch (error) {
      // If token is expired, allow client to refresh
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: error.expiredAt
        });
      }
      // If token is invalid for other reasons
      throw error;
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
};

const optionalAuthMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      // No token provided, continue without user context
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
    } catch (error) {
      // Token invalid, continue without user context
      req.user = null;
    }
    
    next();
  } catch (error) {
    // In case of other errors, continue without user
    req.user = null;
    next();
  }
};

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

module.exports = { authMiddleware, optionalAuthMiddleware, roleMiddleware };
