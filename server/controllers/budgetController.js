const Budget = require('../models/Budget');

// @desc    Get all budgets for user
// @route   GET /api/budgets
const getBudgets = async (req, res) => {
    try {
        const { month, year } = req.query;
        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();

        const budgets = await Budget.find({
            userId: req.user._id,
            month: m,
            year: y,
        });

        res.json({ success: true, data: budgets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create or update budget
// @route   POST /api/budgets
const upsertBudget = async (req, res) => {
    try {
        const { category, limit, month, year, alertThreshold } = req.body;
        const m = month || new Date().getMonth() + 1;
        const y = year || new Date().getFullYear();

        const budget = await Budget.findOneAndUpdate(
            { userId: req.user._id, category, month: m, year: y },
            { limit, alertThreshold: alertThreshold || 80 },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ success: true, data: budget });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
const deleteBudget = async (req, res) => {
    try {
        await Budget.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id,
        });

        res.json({ success: true, message: 'Budget deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getBudgets, upsertBudget, deleteBudget };
