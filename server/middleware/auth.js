const admin = require('firebase-admin');
const User = require('../models/User');

/**
 * Firebase Authentication Middleware
 * Verifies the Firebase ID token and attaches user to request
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Find or create user in our database
        let user = await User.findOne({ firebaseUid: decodedToken.uid });

        if (!user) {
            // Auto-create user on first login
            user = await User.create({
                firebaseUid: decodedToken.uid,
                email: decodedToken.email,
                displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
                photoURL: decodedToken.picture || '',
            });
        }

        req.user = user;
        req.firebaseUser = decodedToken;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error.message);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.',
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.',
        });
    }
};

module.exports = authenticate;
