// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(403).json({ message: 'Aucun token fourni.' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
     return res.status(403).json({ message: 'Format de token invalide.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erreur de vérification du jeton:', error.message);
    return res.status(401).json({ message: 'Token invalide.' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Accès refusé. Administrateurs uniquement.' });
  }
};

const isRider = (req, res, next) => {
  if (req.user && req.user.role === 'livreur') {
    next();
  } else {
    return res.status(403).json({ message: 'Accès refusé. Livreurs uniquement.' });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isRider,
};