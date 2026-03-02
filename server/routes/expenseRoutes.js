const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
    getExpenses,
    getExpense,
    createExpense,
    updateExpense,
    deleteExpense,
    bulkDeleteExpenses,
} = require('../controllers/expenseController');

router.use(authenticate); // All expense routes require auth

router.route('/')
    .get(getExpenses)
    .post(createExpense)
    .delete(bulkDeleteExpenses);

router.route('/:id')
    .get(getExpense)
    .put(updateExpense)
    .delete(deleteExpense);

module.exports = router;
