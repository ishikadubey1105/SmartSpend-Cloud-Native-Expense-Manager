import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const getExpenseInsights = async (expenses, monthlyBudget) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const expenseSummary = expenses.map((e) => ({
            title: e.title,
            amount: e.amount,
            category: e.category,
            date: new Date(e.date).toLocaleDateString(),
        }));

        const prompt = `You are SmartSpend AI, a friendly personal finance assistant. Analyze these expenses and provide actionable insights.

Monthly Budget: ₹${monthlyBudget || 'Not set'}

Recent Expenses:
${JSON.stringify(expenseSummary, null, 2)}

Please provide:
1. **Spending Pattern**: Brief analysis of spending habits (2-3 lines)
2. **Top Savings Tip**: One specific, actionable tip to save money (1-2 lines)
3. **Budget Alert**: Any category that seems overspent (1 line)
4. **Smart Suggestion**: One smart financial suggestion based on the data (1-2 lines)

Keep the response concise, friendly, and use emojis. Format in markdown.`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Gemini AI Error:', error);
        return 'Unable to generate insights right now. Please check your API key and try again.';
    }
};

export const categorizeExpense = async (title) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `Given this expense title: "${title}"
    
Suggest the most appropriate category from this list:
Food & Dining, Transportation, Shopping, Bills & Utilities, Entertainment, Healthcare, Education, Travel, Groceries, Other

Respond with ONLY the category name, nothing else.`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        return 'Other';
    }
};
