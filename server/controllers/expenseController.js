const { Types: { ObjectId } } = require('mongoose');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

// ── Helpers ───────────────────────────────────────────────────────────────────
const toObjectId = (id) => new ObjectId(id);

async function checkBudgetAlert(userId, category, date) {
    const month = new Date(date).getMonth() + 1;
    const year = new Date(date).getFullYear();

    const budget = await Budget.findOne({ userId: toObjectId(userId), category, month, year });
    if (!budget) return null;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const [agg] = await Expense.aggregate([
        { $match: { userId: toObjectId(userId), category, date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const spent = agg?.total || 0;
    const percentage = (spent / budget.limit) * 100;

    if (percentage >= 100) {
        return { type: 'exceeded', message: `🚨 Budget exceeded for ${category}! Spent ₹${spent.toFixed(0)} of ₹${budget.limit}`, percentage };
    }
    if (percentage >= budget.alertThreshold) {
        return { type: 'warning', message: `⚠️ ${percentage.toFixed(0)}% of ${category} budget used (₹${spent.toFixed(0)} of ₹${budget.limit})`, percentage };
    }
    return null;
}

// ── GET /api/expenses ─────────────────────────────────────────────────────────
const getExpenses = async (req, res) => {
    const {
        page = 1, limit = 20, category, startDate, endDate,
        paymentMethod, search, sortBy = 'date', sortOrder = 'desc',
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
            { tags: { $regex: search, $options: 'i' } },
        ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [expenses, total] = await Promise.all([
        Expense.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
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
};

// ── GET /api/expenses/:id ─────────────────────────────────────────────────────
const getExpense = async (req, res) => {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: expense });
};

// ── POST /api/expenses ────────────────────────────────────────────────────────
const createExpense = async (req, res) => {
    // Whitelist — only pick known safe fields
    const {
        title, amount, category, description,
        date, paymentMethod, isRecurring, recurringInterval, tags,
    } = req.body;

    const expense = await Expense.create({
        userId: req.user._id,
        title, amount, category, description,
        date: date || new Date(),
        paymentMethod, isRecurring, recurringInterval, tags,
    });

    const budgetAlert = await checkBudgetAlert(req.user._id, category, expense.date);

    res.status(201).json({ success: true, data: expense, budgetAlert });
};

// ── PUT /api/expenses/:id ─────────────────────────────────────────────────────
const updateExpense = async (req, res) => {
    // Explicit whitelist — prevents mass assignment
    const {
        title, amount, category, description,
        date, paymentMethod, isRecurring, recurringInterval, tags,
    } = req.body;

    const update = {};
    if (title !== undefined) update.title = title;
    if (amount !== undefined) update.amount = amount;
    if (category !== undefined) update.category = category;
    if (description !== undefined) update.description = description;
    if (date !== undefined) update.date = date;
    if (paymentMethod !== undefined) update.paymentMethod = paymentMethod;
    if (isRecurring !== undefined) update.isRecurring = isRecurring;
    if (recurringInterval !== undefined) update.recurringInterval = recurringInterval;
    if (tags !== undefined) update.tags = tags;

    const expense = await Expense.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        update,
        { new: true, runValidators: true }
    );

    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: expense });
};

// ── DELETE /api/expenses/:id ──────────────────────────────────────────────────
const deleteExpense = async (req, res) => {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted successfully' });
};

// ── DELETE /api/expenses (bulk) ───────────────────────────────────────────────
const bulkDeleteExpenses = async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
    }
    // Validate all IDs are valid ObjectIds
    const valid = ids.every((id) => ObjectId.isValid(id));
    if (!valid) return res.status(400).json({ success: false, message: 'One or more IDs are invalid' });

    const result = await Expense.deleteMany({ _id: { $in: ids }, userId: req.user._id });
    res.json({ success: true, message: `${result.deletedCount} expense(s) deleted` });
};

// ── GET /api/expenses/anomalies ───────────────────────────────────────────────
const getAnomalies = async (req, res) => {
    const userId = toObjectId(req.user._id);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    // Per-category mean + stdDev over last 3 months
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const stats = await Expense.aggregate([
        { $match: { userId, date: { $gte: threeMonthsAgo } } },
        {
            $group: {
                _id: '$category',
                mean: { $avg: '$amount' },
                stdDev: { $stdDevPop: '$amount' },
            }
        },
    ]);

    const statsMap = {};
    stats.forEach((s) => { statsMap[s._id] = s; });

    // Current month expenses
    const expenses = await Expense.find({ userId, date: { $gte: start } }).lean();

    const anomalies = expenses
        .filter((e) => {
            const s = statsMap[e.category];
            if (!s || s.stdDev === 0) return false;
            const z = (e.amount - s.mean) / s.stdDev;
            return z > 2.0; // 2-sigma threshold
        })
        .map((e) => {
            const s = statsMap[e.category];
            const z = ((e.amount - s.mean) / s.stdDev).toFixed(1);
            return { ...e, zScore: z, categoryMean: Math.round(s.mean) };
        });

    res.json({ success: true, data: anomalies });
};

module.exports = {
    getExpenses, getExpense, createExpense,
    updateExpense, deleteExpense, bulkDeleteExpenses, getAnomalies,
};
