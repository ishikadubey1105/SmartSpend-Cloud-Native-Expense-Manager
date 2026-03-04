const { validationResult, body, query, param } = require('express-validator');

/**
 * Run after express-validator rules — returns 422 if any field fails
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

// ── Expense Validators ────────────────────────────────────────────────────────
const VALID_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];
const VALID_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Other'];
const VALID_INTERVALS = ['daily', 'weekly', 'monthly', 'yearly'];

const expenseCreateRules = [
    body('title')
        .trim().notEmpty().withMessage('Title is required')
        .isLength({ max: 100 }).withMessage('Title max 100 characters'),
    body('amount')
        .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('category')
        .isIn(VALID_CATEGORIES).withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('paymentMethod')
        .optional().isIn(VALID_METHODS).withMessage('Invalid payment method'),
    body('date')
        .optional().isISO8601().withMessage('Date must be a valid ISO date')
        .custom((v) => {
            if (new Date(v) > new Date()) throw new Error('Date cannot be in the future');
            return true;
        }),
    body('description')
        .optional().trim().isLength({ max: 500 }).withMessage('Description max 500 characters'),
    body('isRecurring')
        .optional().isBoolean().withMessage('isRecurring must be boolean'),
    body('recurringInterval')
        .optional().isIn([...VALID_INTERVALS, null]).withMessage('Invalid recurring interval'),
    body('tags')
        .optional().isArray({ max: 10 }).withMessage('Max 10 tags'),
    validate,
];

const expenseUpdateRules = [
    param('id').isMongoId().withMessage('Invalid expense ID'),
    body('title').optional().trim().notEmpty().isLength({ max: 100 }),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('category').optional().isIn(VALID_CATEGORIES),
    body('paymentMethod').optional().isIn(VALID_METHODS),
    body('date').optional().isISO8601().custom((v) => {
        if (new Date(v) > new Date()) throw new Error('Date cannot be in the future');
        return true;
    }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('tags').optional().isArray({ max: 10 }),
    validate,
];

// ── Budget Validators ─────────────────────────────────────────────────────────
const budgetUpsertRules = [
    body('category').isIn(VALID_CATEGORIES).withMessage('Invalid category'),
    body('limit').isFloat({ min: 1 }).withMessage('Budget limit must be at least ₹1'),
    body('alertThreshold').optional().isInt({ min: 50, max: 100 }).withMessage('Threshold must be between 50 and 100'),
    validate,
];

// ── Pagination validator ──────────────────────────────────────────────────────
const paginationRules = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate,
];

module.exports = { validate, expenseCreateRules, expenseUpdateRules, budgetUpsertRules, paginationRules };
