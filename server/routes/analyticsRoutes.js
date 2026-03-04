const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { cacheResponse } = require('../middleware/cache');
const {
    getSummary, getMonthlyTrends, getCategoryAnalytics,
    getDailySpending, getPaymentMethodBreakdown, getRecurringAnalysis,
} = require('../controllers/analyticsController');

router.use(authenticate);

// Cache analytics responses for 5 minutes (300 seconds)
router.get('/summary', cacheResponse(300), getSummary);
router.get('/trends', cacheResponse(300), getMonthlyTrends);
router.get('/categories', cacheResponse(300), getCategoryAnalytics);
router.get('/daily', cacheResponse(300), getDailySpending);
router.get('/payment-methods', cacheResponse(300), getPaymentMethodBreakdown);
router.get('/recurring', cacheResponse(300), getRecurringAnalysis);

module.exports = router;
