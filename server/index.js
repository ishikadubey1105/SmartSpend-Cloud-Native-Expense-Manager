require('dotenv').config();
require('express-async-errors'); // Catch async errors globally — no try/catch needed

// ── Startup Environment Validation ─────────────────────────────────────────
const REQUIRED_ENV = [
    'MONGODB_URI',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'CLIENT_URL',
];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length && !process.env.VERCEL) {
    console.error(`\n❌ STARTUP FAILED — Missing required environment variables:\n   ${missingEnv.join(', ')}\n`);
    // In local dev, we might still exit, but in Vercel we want to show a web page error instead of crashing the function
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const connectDB = require('./config/db');
const initializeFirebase = require('./config/firebase');

// Routes
const userRoutes = require('./routes/userRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const exportRoutes = require('./routes/exportRoutes');
const insightsRoutes = require('./routes/insightsRoutes');

const app = express();

// ── Vercel Config Validator Middleware ───────────────────────────────────────
app.use((req, res, next) => {
    const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        return res.status(500).send(`
            <div style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #ef4444;">Deploy Configuration Error</h1>
                <p>The Vercel Serverless Function is running, but it cannot connect to the database or Firebase because the following Environment Variables are missing in your Vercel Dashboard:</p>
                <ul>${missing.map(k => `<li style="margin-bottom: 8px;"><code>${k}</code></li>`).join('')}</ul>
                <p><strong>How to fix this:</strong></p>
                <ol>
                    <li>Go to your project on Vercel.com</li>
                    <li>Click <strong>Settings</strong> ➔ <strong>Environment Variables</strong></li>
                    <li>Add the missing keys listed above with their correct values</li>
                    <li>Go to <strong>Deployments</strong> ➔ click the 3 dots ➔ <strong>Redeploy</strong></li>
                </ol>
            </div>
        `);
    }
    next();
});

app.use(compression());

// ── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: (origin, cb) => {
        const allowed = [
            process.env.CLIENT_URL,
            'http://localhost:5173',
            'http://localhost:3000',
        ].filter(Boolean);
        if (!origin || allowed.includes(origin)) cb(null, true);
        else cb(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging  
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
}

// ── Rate Limiting ───────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many auth requests.' },
});

app.use('/api/', apiLimiter);
app.use('/api/users/sync', authLimiter);

// ── Initialize Services safely ──────────────────────────────────────────────
if (!missingEnv.includes('FIREBASE_PRIVATE_KEY') && !missingEnv.includes('FIREBASE_PROJECT_ID')) {
    try {
        initializeFirebase();
    } catch (e) {
        logger.error('Firebase Initialization failed:', e.message);
    }
}

// In Vercel serverless we connect to DB immediately outside of app.listen
if (process.env.VERCEL && !missingEnv.includes('MONGODB_URI')) {
    connectDB().catch(e => logger.error('Vercel MongoDB strict connection failed:', e));
}

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/insights', insightsRoutes);

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #10b981;">✅ SmartSpend API is Live</h1>
            <p>The backend is running successfully. Requests should be made to <code>/api/*</code>.</p>
        </div>
    `);
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SmartSpend API is operational 🚀',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
    });
});

// ── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} — ${err.message} — ${req.method} ${req.path}`);

    if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return res.status(409).json({ success: false, message: `${field} already exists` });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, () => {
            logger.info(`🚀 SmartSpend Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
        });

        // Graceful shutdown
        const shutdown = (signal) => {
            logger.info(`${signal} received — shutting down gracefully...`);
            server.close(async () => {
                const mongoose = require('mongoose');
                await mongoose.connection.close();
                logger.info('MongoDB connection closed. Process terminated.');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Only spin up the actual HTTP listener in local dev (Vercel Serverless acts as its own listener)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    startServer();
}

module.exports = app;
