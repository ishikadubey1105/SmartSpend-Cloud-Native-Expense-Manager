const { Types: { ObjectId } } = require('mongoose');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const logger = require('../config/logger');
const https = require('https');

// Gemini API call using raw HTTPS (no extra SDK needed on backend)
const callGemini = (prompt) => {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return resolve('⚠️ Gemini API key not configured. Add GEMINI_API_KEY to server .env to enable AI Insights.');
        }

        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    resolve(text || 'AI insights unavailable.');
                } catch {
                    resolve('Unable to parse AI response.');
                }
            });
        });

        req.on('error', (err) => {
            logger.error('Gemini API error:', err);
            resolve('AI insights temporarily unavailable.');
        });

        req.setTimeout(15000, () => {
            req.destroy();
            resolve('AI request timed out. Please try again.');
        });

        req.write(body);
        req.end();
    });
};

// ── POST /api/insights ────────────────────────────────────────────────────────
const getInsights = async (req, res) => {
    const userId = new ObjectId(req.user._id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const monthlyBudget = req.user.monthlyBudget || 0;

    const [expenses, budgets, categoryStats] = await Promise.all([
        Expense.find({ userId, date: { $gte: startOfMonth, $lte: endOfMonth } })
            .sort({ amount: -1 })
            .limit(30)
            .lean(),
        Budget.find({ userId, month: now.getMonth() + 1, year: now.getFullYear() }).lean(),
        Expense.aggregate([
            { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]),
    ]);

    if (expenses.length === 0) {
        return res.json({
            success: true,
            data: { insights: '📊 No expenses found this month yet. Add some expenses and come back for personalized AI insights!' },
        });
    }

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedSpend = Math.round((totalSpent / dayOfMonth) * daysInMonth);
    const topCategory = categoryStats[0]?._id || 'N/A';

    const budgetStatus = budgets.map((b) => {
        const cat = categoryStats.find((c) => c._id === b.category);
        const pct = cat ? Math.round((cat.total / b.limit) * 100) : 0;
        return `${b.category}: ₹${cat?.total || 0} spent of ₹${b.limit} budget (${pct}%)`;
    }).join('\n');

    const prompt = `You are SmartSpend AI — a brilliant, warm personal finance advisor. Analyze this user's expenses and give genuinely useful, specific insights.

## User's Financial Snapshot
- **Month:** ${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
- **Total spent so far:** ₹${totalSpent.toLocaleString('en-IN')}
- **Day of month:** ${dayOfMonth} of ${daysInMonth}
- **Projected month-end spend:** ₹${projectedSpend.toLocaleString('en-IN')}
- **Overall monthly budget:** ₹${monthlyBudget ? monthlyBudget.toLocaleString('en-IN') : 'Not set'}
- **Top spending category:** ${topCategory}

## Category Budgets:
${budgetStatus || 'No budgets set'}

## Top Expenses This Month:
${expenses.slice(0, 10).map((e) => `- ₹${e.amount} — ${e.title} (${e.category})`).join('\n')}

## Category Breakdown:
${categoryStats.map((c) => `- ${c._id}: ₹${Math.round(c.total)} (${c.count} transactions)`).join('\n')}

Please provide these 4 sections in markdown:

### 📊 Spending Pattern
A 2-3 line analysis specific to THIS user's data. Mention actual numbers and categories.

### 💡 Top Savings Tip
One specific, actionable insight based on their biggest expense or pattern.

### 🚨 Budget Alert
Mention any category close to or over budget. If all good, say so.

### 🔮 Month-End Prediction
Based on the pace (₹${projectedSpend.toLocaleString('en-IN')} projected), what should they expect? Keep it friendly.

Be specific to this person's numbers. Use ₹ symbol. Keep each section to 2-3 lines max.`;

    const insights = await callGemini(prompt);
    res.json({ success: true, data: { insights } });
};

// ── POST /api/insights/categorize ─────────────────────────────────────────────
const categorizeExpense = async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });

    const VALID = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];

    const prompt = `Given this expense title: "${title}"
    
Suggest the most appropriate category from ONLY this list:
${VALID.join(', ')}

Respond with ONLY the exact category name from the list, nothing else.`;

    const result = await callGemini(prompt);
    const category = VALID.find((c) => result.trim().toLowerCase().includes(c.toLowerCase())) || 'Other';

    res.json({ success: true, data: { category } });
};

// ── POST /api/insights/scan-receipt ──────────────────────────────────────────
const scanReceipt = (req, res) => {
    return new Promise((resolve) => {
        const { imageFile, mimeType } = req.body; // Expect base64 strings
        if (!imageFile) return res.status(400).json({ success: false, message: 'Image data is required' });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ success: false, message: 'API key missing' });

        // Strip data prefix if passed
        const base64Data = imageFile.replace(/^data:image\/\w+;base64,/, '');
        const mime = mimeType || 'image/jpeg';

        const VALID = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];

        const prompt = `Analyze this checkout receipt. Extract the following 4 pieces of information exactly as JSON keys:
        - "title" (the name of the store or merchant, e.g. "Starbucks")
        - "amount" (the final total amount paid as a clean number, e.g. 15.50)
        - "date" (the date of the transaction in YYYY-MM-DD format if visible, else null)
        - "category" (pick the most relevant category strictly from this array: [${VALID.map(v => `"${v}"`).join(', ')}]. Default to "Other" if unmatched.)
        
        Return ONLY valid raw JSON with those 4 keys. Do NOT include markdown code blocks \`\`\`json.`;

        const body = JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mime, data: base64Data } }
                ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        };

        const request = https.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => (data += chunk));
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

                    // Cleanup any markdown artifacts just in case
                    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const extracted = JSON.parse(cleanText);

                    res.json({ success: true, data: extracted });
                } catch (e) {
                    res.status(500).json({ success: false, message: 'Failed to extract receipt data', err: e.message, raw: data });
                }
                resolve();
            });
        });

        request.on('error', (err) => {
            res.status(500).json({ success: false, message: 'Gemini request failed', error: err.message });
            resolve();
        });

        request.end(body);
    });
};

// ── POST /api/insights/command ─────────────────────────────────────────────
const processCommand = async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, message: 'query is required' });

    const VALID_CATS = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];

    const prompt = `You are the Omni-Search AI for a finance app. User input: "${query}"
    
Determine the precise intent:
- NAVIGATE: User wants to go to a page (dashboard, expenses, analytics, budgets, insights, settings, subscriptions)
- ADD_EXPENSE: User wants to log a transaction (e.g. "spent 500 on swiggy")
- UNKNOWN: anything else

Return ONLY raw JSON (no markdown \`\`\`) with:
{
  "intent": "NAVIGATE" | "ADD_EXPENSE" | "UNKNOWN",
  "path": "/page_name", // only if NAVIGATE
  "expense": { "title": "Store", "amount": 100, "category": "Food" } // only if ADD_EXPENSE (pick category from ${VALID_CATS.join(', ')} or Other)
}`;

    try {
        const result = await callGemini(prompt);
        const clean = result.replace(/```json/gi, '').replace(/```/g, '').trim();
        res.json({ success: true, data: JSON.parse(clean) });
    } catch {
        res.json({ success: true, data: { intent: 'UNKNOWN' } });
    }
}

module.exports = { getInsights, categorizeExpense, scanReceipt, processCommand };
