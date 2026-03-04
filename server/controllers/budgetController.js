const Budget = require('../models/Budget');
const { Types: { ObjectId } } = require('mongoose');
const Expense = require('../models/Expense');

// @desc    Get all budgets with real-time spent amounts
// @route   GET /api/budgets
const getBudgets = async (req, res) => {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const userId = new ObjectId(req.user._id);

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    const [budgets, spending] = await Promise.all([
        Budget.find({ userId, month: m, year: y }).lean(),
        Expense.aggregate([
            { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: '$category', spent: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
    ]);

    const spendMap = {};
    spending.forEach((s) => { spendMap[s._id] = { spent: s.spent, count: s.count }; });

    const enriched = budgets.map((b) => {
        const s = spendMap[b.category] || { spent: 0, count: 0 };
        return {
            ...b,
            spent: s.spent,
            remaining: Math.max(0, b.limit - s.spent),
            usedPercent: Math.round((s.spent / b.limit) * 100),
            transactionCount: s.count,
            isOverBudget: s.spent > b.limit,
            isNearLimit: !s.spent > b.limit && (s.spent / b.limit) * 100 >= b.alertThreshold,
        };
    });

    res.json({ success: true, data: enriched });
};

// @desc    Create or update budget for a category
// @route   POST /api/budgets
const upsertBudget = async (req, res) => {
    const { category, limit, month, year, alertThreshold } = req.body;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    // Was there an existing budget?
    const existing = await Budget.findOne({ userId: req.user._id, category, month: m, year: y });

    const budget = await Budget.findOneAndUpdate(
        { userId: req.user._id, category, month: m, year: y },
        {
            limit: parseFloat(limit),
            alertThreshold: parseInt(alertThreshold) || 80,
            userId: req.user._id,
            category, month: m, year: y,
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const statusCode = existing ? 200 : 201;
    const message = existing ? 'Budget updated successfully' : 'Budget created successfully';

    res.status(statusCode).json({ success: true, message, data: budget, isNew: !existing });
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
const deleteBudget = async (req, res) => {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, message: 'Budget deleted successfully' });
};

module.exports = { getBudgets, upsertBudget, deleteBudget };
