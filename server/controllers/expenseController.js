const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

// @desc    Get all expenses for user (with filters)
// @route   GET /api/expenses
const getExpenses = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            startDate,
            endDate,
            paymentMethod,
            search,
            sortBy = 'date',
            sortOrder = 'desc',
        } = req.query;

        const filter = { userId: req.user._id };

        if (category) filter.category = category;
        if (paymentMethod) filter.paymentMethod = paymentMethod;
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [expenses, total] = await Promise.all([
            Expense.find(filter).sort(sort).skip(skip).limit(parseInt(limit)),
            Expense.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: expenses,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
const getExpense = async (req, res) => {
    try {
        const expense = await Expense.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        res.json({ success: true, data: expense });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create expense
// @route   POST /api/expenses
const createExpense = async (req, res) => {
    try {
        const { title, amount, category, description, date, paymentMethod, isRecurring, recurringInterval, tags } = req.body;

        const expense = await Expense.create({
            userId: req.user._id,
            title,
            amount,
            category,
            description,
            date: date || new Date(),
            paymentMethod,
            isRecurring,
            recurringInterval,
            tags,
        });

        // Check budget alerts
        const budgetAlert = await checkBudgetAlert(req.user._id, category, expense.date);

        res.status(201).json({
            success: true,
            data: expense,
            budgetAlert,
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        res.json({ success: true, data: expense });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        res.json({ success: true, message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk delete expenses
// @route   DELETE /api/expenses
const bulkDeleteExpenses = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No expense IDs provided' });
        }

        const result = await Expense.deleteMany({
            _id: { $in: ids },
            userId: req.user._id,
        });

        res.json({ success: true, message: `${result.deletedCount} expenses deleted` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper: Check if budget limit is exceeded
async function checkBudgetAlert(userId, category, date) {
    try {
        const month = new Date(date).getMonth() + 1;
        const year = new Date(date).getFullYear();

        const budget = await Budget.findOne({ userId, category, month, year });
        if (!budget) return null;

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const totalSpent = await Expense.aggregate([
            {
                $match: {
                    userId,
                    category,
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const spent = totalSpent[0]?.total || 0;
        const percentage = (spent / budget.limit) * 100;

        if (percentage >= 100) {
            return { type: 'exceeded', message: `Budget exceeded for ${category}! Spent ₹${spent} of ₹${budget.limit}`, percentage };
        } else if (percentage >= budget.alertThreshold) {
            return { type: 'warning', message: `${percentage.toFixed(0)}% of ${category} budget used (₹${spent} of ₹${budget.limit})`, percentage };
        }

        return null;
    } catch {
        return null;
    }
}

module.exports = {
    getExpenses,
    getExpense,
    createExpense,
    updateExpense,
    deleteExpense,
    bulkDeleteExpenses,
};
