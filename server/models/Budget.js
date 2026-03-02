const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        limit: {
            type: Number,
            required: [true, 'Budget limit is required'],
            min: [1, 'Budget limit must be at least 1'],
        },
        month: {
            type: Number, // 1-12
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        alertThreshold: {
            type: Number,
            default: 80, // Alert when 80% spent
            min: 1,
            max: 100,
        },
    },
    {
        timestamps: true,
    }
);

budgetSchema.index({ userId: 1, month: 1, year: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
