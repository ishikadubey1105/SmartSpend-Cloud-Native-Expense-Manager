const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getBudgets, upsertBudget, deleteBudget } = require('../controllers/budgetController');

router.use(authenticate);

router.route('/')
    .get(getBudgets)
    .post(upsertBudget);

router.delete('/:id', deleteBudget);

module.exports = router;
