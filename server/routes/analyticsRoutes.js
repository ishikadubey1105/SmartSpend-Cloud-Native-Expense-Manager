const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
    getSummary,
    getMonthlyTrends,
    getCategoryAnalytics,
    getDailySpending,
    getPaymentMethodBreakdown,
} = require('../controllers/analyticsController');

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/trends', getMonthlyTrends);
router.get('/categories', getCategoryAnalytics);
router.get('/daily', getDailySpending);
router.get('/payment-methods', getPaymentMethodBreakdown);

module.exports = router;
