const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/auth');
const { expenseCreateRules, expenseUpdateRules, paginationRules } = require('../middleware/validate');
const {
    getExpenses, getExpense, createExpense,
    updateExpense, deleteExpense, bulkDeleteExpenses, getAnomalies,
} = require('../controllers/expenseController');

router.use(authenticate);

router.route('/')
    .get(paginationRules, getExpenses)
    .post(expenseCreateRules, createExpense);

router.get('/anomalies', getAnomalies);

router.delete('/bulk', bulkDeleteExpenses);

router.route('/:id')
    .get(getExpense)
    .put(expenseUpdateRules, updateExpense)
    .delete(deleteExpense);

module.exports = router;
