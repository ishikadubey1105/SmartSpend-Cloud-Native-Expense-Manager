const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');

// We'll mock Firebase auth middleware so tests don't need a real token
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.user = {
        _id: new mongoose.Types.ObjectId('648a1b2c3d4e5f6789abcdef'),
        email: 'test@smartspend.dev',
        displayName: 'Test User',
        monthlyBudget: 20000,
    };
    next();
});

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/smartspend_test');
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

// ── Health Check ───────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
    it('returns 200 and operational message', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('operational');
        expect(res.body.version).toBeDefined();
    });
});

// ── Expenses API ───────────────────────────────────────────────────────────────
describe('Expense API', () => {
    let createdExpenseId;

    const validExpense = {
        title: 'Coffee at Starbucks',
        amount: 250,
        category: 'Food',
        paymentMethod: 'UPI',
        date: '2026-03-01',
    };

    it('POST /api/expenses → 201 creates expense successfully', async () => {
        const res = await request(app).post('/api/expenses').send(validExpense);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe('Coffee at Starbucks');
        expect(res.body.data.amount).toBe(250);
        createdExpenseId = res.body.data._id;
    });

    it('POST /api/expenses → 422 rejects invalid amount', async () => {
        const res = await request(app).post('/api/expenses').send({ ...validExpense, amount: -10 });
        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].field).toBe('amount');
    });

    it('POST /api/expenses → 422 rejects future date', async () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const res = await request(app).post('/api/expenses').send({ ...validExpense, date: futureDate });
        expect(res.status).toBe(422);
        expect(res.body.errors[0].message).toContain('future');
    });

    it('POST /api/expenses → 422 rejects invalid category', async () => {
        const res = await request(app).post('/api/expenses').send({ ...validExpense, category: 'Invalid' });
        expect(res.status).toBe(422);
        expect(res.body.errors[0].field).toBe('category');
    });

    it('POST /api/expenses → 422 rejects title > 100 chars', async () => {
        const res = await request(app).post('/api/expenses').send({ ...validExpense, title: 'x'.repeat(101) });
        expect(res.status).toBe(422);
    });

    it('GET /api/expenses → 200 returns paginated list', async () => {
        const res = await request(app).get('/api/expenses');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toMatchObject({ page: 1, limit: 20 });
    });

    it('GET /api/expenses?category=Food → filters correctly', async () => {
        const res = await request(app).get('/api/expenses?category=Food');
        expect(res.status).toBe(200);
        res.body.data.forEach((e) => expect(e.category).toBe('Food'));
    });

    it('PUT /api/expenses/:id → 200 updates expense', async () => {
        const res = await request(app).put(`/api/expenses/${createdExpenseId}`).send({ amount: 300 });
        expect(res.status).toBe(200);
        expect(res.body.data.amount).toBe(300);
    });

    it('PUT /api/expenses/:id → 404 for wrong user (ownership)', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).put(`/api/expenses/${fakeId}`).send({ amount: 999 });
        expect(res.status).toBe(404);
    });

    it('DELETE /api/expenses/:id → 200 removes expense', async () => {
        const res = await request(app).delete(`/api/expenses/${createdExpenseId}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('DELETE /api/expenses/bulk → 200 deletes multiple', async () => {
        // Create 2 expenses first
        const a = await request(app).post('/api/expenses').send({ ...validExpense, title: 'BulkA' });
        const b = await request(app).post('/api/expenses').send({ ...validExpense, title: 'BulkB' });
        const ids = [a.body.data._id, b.body.data._id];
        const res = await request(app).delete('/api/expenses/bulk').send({ ids });
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('2');
    });
});

// ── Export API ─────────────────────────────────────────────────────────────────
describe('Export API', () => {
    it('GET /api/export/csv → returns text/csv', async () => {
        const res = await request(app).get('/api/export/csv');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('GET /api/export/pdf → returns application/pdf', async () => {
        const res = await request(app).get('/api/export/pdf');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/pdf');
    });
});

// ── Analytics API ──────────────────────────────────────────────────────────────
describe('Analytics API', () => {
    it('GET /api/analytics/summary → 200 with correct shape', async () => {
        const res = await request(app).get('/api/analytics/summary');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('totalThisMonth');
        expect(res.body.data).toHaveProperty('predictedMonthEnd');
        expect(res.body.data).toHaveProperty('budgetUsedPercent');
        expect(res.body.data).toHaveProperty('categoryBreakdown');
    });

    it('GET /api/analytics/trends → returns array with ma3', async () => {
        const res = await request(app).get('/api/analytics/trends');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        if (res.body.data.length > 0) {
            expect(res.body.data[0]).toHaveProperty('ma3');
        }
    });

    it('GET /api/analytics/recurring → returns recurring analysis', async () => {
        const res = await request(app).get('/api/analytics/recurring');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('totalRecurring');
        expect(res.body.data).toHaveProperty('recurringPercent');
    });
});

// ── 404 Handler ────────────────────────────────────────────────────────────────
describe('Error Handling', () => {
    it('Unknown route → 404', async () => {
        const res = await request(app).get('/api/nonexistent');
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
});
