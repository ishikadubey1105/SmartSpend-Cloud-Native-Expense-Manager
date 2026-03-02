const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

// @desc    Get dashboard summary (total, this month, today, category breakdown)
// @route   GET /api/analytics/summary
const getSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [totalAll, totalMonth, totalToday, categoryBreakdown, recentExpenses] = await Promise.all([
            // Total all time
            Expense.aggregate([
                { $match: { userId } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]),
            // Total this month
            Expense.aggregate([
                { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]),
            // Total today
            Expense.aggregate([
                { $match: { userId, date: { $gte: startOfDay } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]),
            // Category breakdown this month
            Expense.aggregate([
                { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
                { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } },
            ]),
            // Recent 5 expenses
            Expense.find({ userId }).sort({ date: -1 }).limit(5),
        ]);

        res.json({
            success: true,
            data: {
                totalAllTime: totalAll[0]?.total || 0,
                totalExpenses: totalAll[0]?.count || 0,
                totalThisMonth: totalMonth[0]?.total || 0,
                monthlyCount: totalMonth[0]?.count || 0,
                totalToday: totalToday[0]?.total || 0,
                todayCount: totalToday[0]?.count || 0,
                categoryBreakdown: categoryBreakdown.map((c) => ({
                    category: c._id,
                    total: c.total,
                    count: c.count,
                })),
                recentExpenses,
                monthlyBudget: req.user.monthlyBudget,
                budgetUsedPercent: req.user.monthlyBudget
                    ? ((totalMonth[0]?.total || 0) / req.user.monthlyBudget) * 100
                    : 0,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get monthly trends (last 12 months)
// @route   GET /api/analytics/trends
const getMonthlyTrends = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

        const trends = await Expense.aggregate([
            {
                $match: {
                    userId,
                    date: { $gte: twelveMonthsAgo },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    avgExpense: { $avg: '$amount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ];

        const formattedTrends = trends.map((t) => ({
            label: `${months[t._id.month - 1]} ${t._id.year}`,
            month: t._id.month,
            year: t._id.year,
            total: t.total,
            count: t.count,
            average: Math.round(t.avgExpense * 100) / 100,
        }));

        res.json({ success: true, data: formattedTrends });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get category-wise analytics
// @route   GET /api/analytics/categories
const getCategoryAnalytics = async (req, res) => {
    try {
        const userId = req.user._id;
        const { month, year } = req.query;

        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();
        const startOfMonth = new Date(y, m - 1, 1);
        const endOfMonth = new Date(y, m, 0, 23, 59, 59);

        const analytics = await Expense.aggregate([
            {
                $match: {
                    userId,
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    maxExpense: { $max: '$amount' },
                    minExpense: { $min: '$amount' },
                    avgExpense: { $avg: '$amount' },
                },
            },
            { $sort: { total: -1 } },
        ]);

        // Get budget info for each category
        const budgets = await Budget.find({ userId, month: m, year: y });
        const budgetMap = {};
        budgets.forEach((b) => (budgetMap[b.category] = b.limit));

        const enriched = analytics.map((a) => ({
            category: a._id,
            total: Math.round(a.total * 100) / 100,
            count: a.count,
            max: a.maxExpense,
            min: a.minExpense,
            average: Math.round(a.avgExpense * 100) / 100,
            budget: budgetMap[a._id] || null,
            budgetUsed: budgetMap[a._id]
                ? Math.round((a.total / budgetMap[a._id]) * 100)
                : null,
        }));

        res.json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get daily spending for current month
// @route   GET /api/analytics/daily
const getDailySpending = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const daily = await Expense.aggregate([
            {
                $match: {
                    userId,
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $group: {
                    _id: { $dayOfMonth: '$date' },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({ success: true, data: daily });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get payment method breakdown
// @route   GET /api/analytics/payment-methods
const getPaymentMethodBreakdown = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const breakdown = await Expense.aggregate([
            { $match: { userId, date: { $gte: startOfMonth } } },
            { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);

        res.json({ success: true, data: breakdown });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getSummary,
    getMonthlyTrends,
    getCategoryAnalytics,
    getDailySpending,
    getPaymentMethodBreakdown,
};
