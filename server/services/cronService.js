const cron = require('node-cron');
const Expense = require('../models/Expense');

// Pattern: Run every 24 hours at midnight
const startCronJobs = () => {
    // Schedule task to run at 00:00 every day
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('🔄 [CronService] Running daily recurring expense auto-detector...');
            const startTime = Date.now();

            // Detect identical expenses occurring at least 3 times within the last 4 months
            const fourMonthsAgo = new Date();
            fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

            const result = await Expense.aggregate([
                { $match: { date: { $gte: fourMonthsAgo }, isRecurring: { $ne: true } } },
                {
                    $group: {
                        _id: {
                            userId: '$userId',
                            title: { $toLower: { $trim: { input: '$title' } } },
                            amount: '$amount'
                        },
                        count: { $sum: 1 },
                        expenseIds: { $push: '$_id' },
                        lastDate: { $max: '$date' }
                    }
                },
                { $match: { count: { $gte: 3 } } }
            ]);

            let flaggedCount = 0;
            for (const group of result) {
                // Bulk update these expenses to mark them as recurring
                await Expense.updateMany(
                    { _id: { $in: group.expenseIds } },
                    { $set: { isRecurring: true, recurringInterval: 'monthly' } } // simplified matching to monthly
                );
                flaggedCount += group.count;
            }

            console.log(`✅ [CronService] Auto-detector complete in ${Date.now() - startTime}ms. Flagged ${flaggedCount} expenses as recurring.`);
        } catch (error) {
            console.error('❌ [CronService] Error running recurring detector:', error);
        }
    });

    console.log('🕒 [CronService] Scheduled recurring expense auto-detector (runs daily).');
};

module.exports = { startCronJobs };
