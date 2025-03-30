const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

const isTeamAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'team-admin' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Team admin role required.' });
  }
};

const isCoach = (req, res, next) => {
  if (req.user && (req.user.role === 'coach' || req.user.role === 'team-admin' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Coach role required.' });
  }
};

const isMedicalStaff = (req, res, next) => {
  if (req.user && req.user.role === 'medical') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Medical staff role required.' });
  }
};

const isMedicalOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'medical' || req.user.role === 'team-admin' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Medical staff or admin role required.' });
  }
};

const isOwnDataOrAuthorized = (req, res, next) => {
  if (req.user && (req.user.userId === req.params.userId || 
    ['coach', 'team-admin', 'admin', 'medical'].includes(req.user.role))) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. You can only access your own data.' });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isTeamAdmin,
  isCoach,
  isMedicalStaff,
  isMedicalOrAdmin,
  isOwnDataOrAuthorized
};