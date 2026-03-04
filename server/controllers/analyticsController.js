const { Types: { ObjectId } } = require('mongoose');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

const toOid = (id) => new ObjectId(id);

// ── GET /api/analytics/summary ────────────────────────────────────────────────
const getSummary = async (req, res) => {
    const userId = toOid(req.user._id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Prediction: project month-end based on pace so far
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const [totalAll, totalMonth, totalToday, categoryBreakdown, recentExpenses, recurringTotal] =
        await Promise.all([
            Expense.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
            Expense.aggregate([{ $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
            Expense.aggregate([{ $match: { userId, date: { $gte: startOfDay } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
            Expense.aggregate([
                { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
                { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } },
            ]),
            Expense.find({ userId }).sort({ date: -1 }).limit(5).lean(),
            Expense.aggregate([
                { $match: { userId, isRecurring: true } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ]);

    const thisMonthTotal = totalMonth[0]?.total || 0;
    const predictedMonthEnd = dayOfMonth > 0
        ? Math.round((thisMonthTotal / dayOfMonth) * daysInMonth)
        : 0;

    res.json({
        success: true,
        data: {
            totalAllTime: totalAll[0]?.total || 0,
            totalExpenses: totalAll[0]?.count || 0,
            totalThisMonth: thisMonthTotal,
            monthlyCount: totalMonth[0]?.count || 0,
            totalToday: totalToday[0]?.total || 0,
            todayCount: totalToday[0]?.count || 0,
            predictedMonthEnd,
            dayOfMonth,
            daysInMonth,
            recurringMonthly: recurringTotal[0]?.total || 0,
            categoryBreakdown: categoryBreakdown.map((c) => ({
                category: c._id, total: c.total, count: c.count,
            })),
            recentExpenses,
            monthlyBudget: req.user.monthlyBudget,
            budgetUsedPercent: req.user.monthlyBudget
                ? (thisMonthTotal / req.user.monthlyBudget) * 100
                : 0,
        },
    });
};

// ── GET /api/analytics/trends ─────────────────────────────────────────────────
const getMonthlyTrends = async (req, res) => {
    const userId = toOid(req.user._id);
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const raw = await Expense.aggregate([
        { $match: { userId, date: { $gte: twelveMonthsAgo } } },
        {
            $group: {
                _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                total: { $sum: '$amount' },
                count: { $sum: 1 },
                avgExpense: { $avg: '$amount' },
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = raw.map((t) => ({
        label: `${MONTHS[t._id.month - 1]} ${t._id.year}`,
        month: t._id.month,
        year: t._id.year,
        total: t.total,
        count: t.count,
        average: Math.round(t.avgExpense * 100) / 100,
    }));

    // 3-month rolling average
    const withMA = formatted.map((item, i) => {
        const window = formatted.slice(Math.max(0, i - 2), i + 1);
        const ma3 = Math.round(window.reduce((s, w) => s + w.total, 0) / window.length);
        return { ...item, ma3 };
    });

    res.json({ success: true, data: withMA });
};

// ── GET /api/analytics/categories ────────────────────────────────────────────
const getCategoryAnalytics = async (req, res) => {
    const userId = toOid(req.user._id);
    const m = parseInt(req.query.month) || new Date().getMonth() + 1;
    const y = parseInt(req.query.year) || new Date().getFullYear();
    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    const [analytics, budgets] = await Promise.all([
        Expense.aggregate([
            { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    maxExpense: { $max: '$amount' },
                    minExpense: { $min: '$amount' },
                    avgExpense: { $avg: '$amount' },
                    stdDev: { $stdDevPop: '$amount' },
                }
            },
            { $sort: { total: -1 } },
        ]),
        Budget.find({ userId, month: m, year: y }).lean(),
    ]);

    const budgetMap = {};
    budgets.forEach((b) => (budgetMap[b.category] = b.limit));

    const enriched = analytics.map((a) => ({
        category: a._id,
        total: Math.round(a.total * 100) / 100,
        count: a.count,
        max: a.maxExpense,
        min: a.minExpense,
        average: Math.round(a.avgExpense * 100) / 100,
        stdDev: Math.round((a.stdDev || 0) * 100) / 100,
        budget: budgetMap[a._id] || null,
        budgetUsed: budgetMap[a._id] ? Math.round((a.total / budgetMap[a._id]) * 100) : null,
    }));

    res.json({ success: true, data: enriched });
};

// ── GET /api/analytics/daily ──────────────────────────────────────────────────
const getDailySpending = async (req, res) => {
    const userId = toOid(req.user._id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const daily = await Expense.aggregate([
        { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: { $dayOfMonth: '$date' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: daily });
};

// ── GET /api/analytics/payment-methods ───────────────────────────────────────
const getPaymentMethodBreakdown = async (req, res) => {
    const userId = toOid(req.user._id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const breakdown = await Expense.aggregate([
        { $match: { userId, date: { $gte: startOfMonth } } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data: breakdown });
};

// ── GET /api/analytics/recurring ─────────────────────────────────────────────
const getRecurringAnalysis = async (req, res) => {
    const userId = toOid(req.user._id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [recurring, discretionary] = await Promise.all([
        Expense.aggregate([
            { $match: { userId, isRecurring: true, date: { $gte: startOfMonth } } },
            { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]),
        Expense.aggregate([
            { $match: { userId, isRecurring: false, date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
    ]);

    const totalRecurring = recurring.reduce((s, r) => s + r.total, 0);
    const totalDiscretionary = discretionary[0]?.total || 0;

    res.json({
        success: true,
        data: {
            recurring,
            totalRecurring,
            totalDiscretionary,
            recurringPercent: totalRecurring + totalDiscretionary
                ? Math.round((totalRecurring / (totalRecurring + totalDiscretionary)) * 100)
                : 0,
        },
    });
};

module.exports = {
    getSummary, getMonthlyTrends, getCategoryAnalytics,
    getDailySpending, getPaymentMethodBreakdown, getRecurringAnalysis,
};
