const Expense = require('../models/Expense');
const { createObjectCsvStringifier } = require('csv-writer');
const PDFDocument = require('pdfkit');

// @desc    Export expenses as CSV
// @route   GET /api/export/csv
const exportCSV = async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        const filter = { userId: req.user._id };
        if (category) filter.category = category;
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const expenses = await Expense.find(filter).sort({ date: -1 });

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'title', title: 'Title' },
                { id: 'amount', title: 'Amount (₹)' },
                { id: 'category', title: 'Category' },
                { id: 'paymentMethod', title: 'Payment Method' },
                { id: 'description', title: 'Description' },
                { id: 'date', title: 'Date' },
                { id: 'tags', title: 'Tags' },
            ],
        });

        const records = expenses.map((e) => ({
            title: e.title,
            amount: e.amount.toFixed(2),
            category: e.category,
            paymentMethod: e.paymentMethod,
            description: e.description || '',
            date: new Date(e.date).toLocaleDateString('en-IN'),
            tags: (e.tags || []).join(', '),
        }));

        const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="smartspend-expenses-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Export expenses as PDF
// @route   GET /api/export/pdf
const exportPDF = async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        const filter = { userId: req.user._id };
        if (category) filter.category = category;
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const expenses = await Expense.find(filter).sort({ date: -1 });
        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="smartspend-report-${Date.now()}.pdf"`);
        doc.pipe(res);

        // ---- Header ----
        doc.fontSize(22).fillColor('#6366f1').text('SmartSpend', { align: 'center' });
        doc.fontSize(12).fillColor('#64748b').text('Expense Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#94a3b8')
            .text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, { align: 'center' });

        doc.moveDown(1);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').stroke();
        doc.moveDown(0.5);

        // ---- Summary ----
        doc.fontSize(11).fillColor('#1e293b')
            .text(`Total Expenses: ${expenses.length}`, { continued: true })
            .text(`   |   Total Amount: ₹${totalAmount.toFixed(2)}`, { align: 'right' });
        doc.moveDown(1);

        // ---- Table Header ----
        const colX = [40, 200, 300, 390, 470];
        doc.fontSize(9).fillColor('#ffffff');
        doc.rect(40, doc.y, 515, 20).fill('#6366f1');
        const headerY = doc.y - 16;
        doc.fillColor('#ffffff')
            .text('Title', colX[0], headerY, { width: 155 })
            .text('Category', colX[1], headerY, { width: 95 })
            .text('Amount', colX[2], headerY, { width: 85 })
            .text('Method', colX[3], headerY, { width: 75 })
            .text('Date', colX[4], headerY, { width: 80 });
        doc.moveDown(0.3);

        // ---- Table Rows ----
        expenses.forEach((e, i) => {
            if (doc.y > 720) {
                doc.addPage();
                doc.y = 40;
            }
            const rowY = doc.y;
            const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
            doc.rect(40, rowY, 515, 18).fill(bg);
            doc.fontSize(8).fillColor('#334155')
                .text(e.title.substring(0, 22), colX[0], rowY + 4, { width: 155 })
                .text(e.category, colX[1], rowY + 4, { width: 95 })
                .text(`₹${e.amount.toFixed(2)}`, colX[2], rowY + 4, { width: 85 })
                .text(e.paymentMethod, colX[3], rowY + 4, { width: 75 })
                .text(new Date(e.date).toLocaleDateString('en-IN'), colX[4], rowY + 4, { width: 80 });
            doc.y = rowY + 20;
        });

        // ---- Footer ----
        doc.moveDown(2);
        doc.fontSize(8).fillColor('#94a3b8').text('SmartSpend — Cloud Native Expense Manager', { align: 'center' });

        doc.end();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { exportCSV, exportPDF };
