const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
        },
        photoURL: {
            type: String,
            default: '',
        },
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'],
        },
        monthlyBudget: {
            type: Number,
            default: 0,
        },
        language: {
            type: String,
            default: 'en',
            enum: ['en', 'hi'],
        },
        categories: {
            type: [String],
            default: [
                'Food & Dining',
                'Transportation',
                'Shopping',
                'Bills & Utilities',
                'Entertainment',
                'Healthcare',
                'Education',
                'Travel',
                'Groceries',
                'Other',
            ],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('User', userSchema);
