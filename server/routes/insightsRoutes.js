const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getInsights, categorizeExpense, scanReceipt, processCommand, chatWithAI } = require('../controllers/insightsController');

// Stricter rate limit for AI routes (expensive API calls)
const rateLimit = require('express-rate-limit');
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: 'AI rate limit: max 10 requests per minute' },
});

router.use(authenticate);
router.get('/', aiLimiter, getInsights);
router.post('/categorize', aiLimiter, categorizeExpense);
router.post('/scan-receipt', aiLimiter, scanReceipt);
router.post('/command', aiLimiter, processCommand);
router.post('/chat', aiLimiter, chatWithAI);

module.exports = router;
