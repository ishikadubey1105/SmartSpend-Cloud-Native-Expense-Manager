const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Expense title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0.01, 'Amount must be at least 0.01'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
            default: '',
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
            default: Date.now,
        },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Other'],
            default: 'Cash',
        },
        isRecurring: {
            type: Boolean,
            default: false,
        },
        recurringInterval: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'yearly', null],
            default: null,
        },
        tags: {
            type: [String],
            default: [],
        },
        receipt: {
            type: String, // URL to uploaded receipt image
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
