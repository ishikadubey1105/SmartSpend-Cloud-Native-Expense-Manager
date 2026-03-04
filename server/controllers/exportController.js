const Expense = require('../models/Expense');
const PDFDocument = require('pdfkit');
const { createObjectCsvStringifier } = require('csv-writer');
const { Types: { ObjectId } } = require('mongoose');

// ── Export CSV ────────────────────────────────────────────────────────────────
const exportCSV = async (req, res) => {
    const { month, year, startDate, endDate } = req.query;
    const userId = new ObjectId(req.user._id);

    const filter = { userId };
    if (month && year) {
        const m = parseInt(month); const y = parseInt(year);
        filter.date = { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0, 23, 59, 59) };
    } else if (startDate && endDate) {
        filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();

    const csvStringifier = createObjectCsvStringifier({
        header: [
            { id: 'title', title: 'Title' },
            { id: 'amount', title: 'Amount (₹)' },
            { id: 'category', title: 'Category' },
            { id: 'paymentMethod', title: 'Payment Method' },
            { id: 'date', title: 'Date' },
            { id: 'description', title: 'Description' },
            { id: 'isRecurring', title: 'Recurring' },
            { id: 'tags', title: 'Tags' },
        ],
    });

    const records = expenses.map((e) => ({
        title: e.title,
        amount: e.amount.toFixed(2),
        category: e.category,
        paymentMethod: e.paymentMethod || 'N/A',
        date: new Date(e.date).toLocaleDateString('en-IN'),
        description: e.description || '',
        isRecurring: e.isRecurring ? 'Yes' : 'No',
        tags: (e.tags || []).join('; '),
    }));

    const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    const fileName = `SmartSpend_Expenses_${month || 'All'}_${year || new Date().getFullYear()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
};

// ── Export PDF ────────────────────────────────────────────────────────────────
const exportPDF = async (req, res) => {
    const { month, year } = req.query;
    const userId = new ObjectId(req.user._id);

    const filter = { userId };
    if (month && year) {
        const m = parseInt(month); const y = parseInt(year);
        filter.date = { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0, 23, 59, 59) };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MONTHS = month ? monthNames[parseInt(month) - 1] : 'All Time';
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

    const fileName = `SmartSpend_Report_${MONTHS}_${year || ''}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // ── Header Band ────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill('#7c3aed');
    doc.fillColor('white').fontSize(24).font('Helvetica-Bold').text('💸 SmartSpend', 40, 20);
    doc.fontSize(10).font('Helvetica').text(`Expense Report — ${MONTHS} ${year || ''}`, 40, 48);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 350, 48, { align: 'right', width: 200 });
    doc.moveDown(3);

    // ── Summary Row ────────────────────────────────────────────────────────────
    doc.fillColor('#1e1e2e').rect(40, 80, doc.page.width - 80, 50).fillAndStroke('#f8f4ff', '#e9d5ff');
    doc.fillColor('#7c3aed').fontSize(11).font('Helvetica-Bold');
    doc.text(`Total Expenses: ${expenses.length}`, 55, 93);
    doc.text(`Total Amount: ₹${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 250, 93);
    doc.text(`Avg per Expense: ₹${expenses.length ? (totalSpent / expenses.length).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 0}`, 430, 93);
    doc.moveDown(4.5);

    // ── Table Header ──────────────────────────────────────────────────────────
    const COL = { title: 40, date: 200, category: 295, method: 380, amount: 490 };
    const tableTop = 145;

    doc.rect(40, tableTop - 5, doc.page.width - 80, 22).fill('#7c3aed');
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    doc.text('TITLE', COL.title, tableTop, { width: 155 });
    doc.text('DATE', COL.date, tableTop, { width: 90 });
    doc.text('CATEGORY', COL.category, tableTop, { width: 80 });
    doc.text('METHOD', COL.method, tableTop, { width: 105 });
    doc.text('AMOUNT', COL.amount, tableTop, { width: 70, align: 'right' });

    // ── Table Rows ─────────────────────────────────────────────────────────────
    let y = tableTop + 26;
    const ROW_MIN_H = 20;
    const PAGE_BOTTOM = doc.page.height - 60;

    expenses.forEach((e, idx) => {
        // Measure description height (truncate long text)
        const titleText = e.title.length > 30 ? e.title.substring(0, 27) + '...' : e.title;
        const subText = e.description ? e.description.substring(0, 40) : '';
        const rowH = subText ? ROW_MIN_H + 12 : ROW_MIN_H;

        if (y + rowH > PAGE_BOTTOM) {
            doc.addPage();
            y = 50;
            // Repeat header on new page
            doc.rect(40, y - 5, doc.page.width - 80, 22).fill('#7c3aed');
            doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
            doc.text('TITLE', COL.title, y, { width: 155 });
            doc.text('DATE', COL.date, y, { width: 90 });
            doc.text('CATEGORY', COL.category, y, { width: 80 });
            doc.text('METHOD', COL.method, y, { width: 105 });
            doc.text('AMOUNT', COL.amount, y, { width: 70, align: 'right' });
            y += 26;
        }

        // Alternating row shading
        if (idx % 2 === 0) {
            doc.rect(40, y - 2, doc.page.width - 80, rowH + 2).fill('#faf5ff');
        }

        doc.fillColor('#1e1b4b').fontSize(9).font('Helvetica-Bold');
        doc.text(titleText, COL.title, y, { width: 155 });
        doc.font('Helvetica').fillColor('#374151');
        doc.text(new Date(e.date).toLocaleDateString('en-IN'), COL.date, y, { width: 90 });
        doc.text(e.category || 'Other', COL.category, y, { width: 80 });
        doc.text(e.paymentMethod || 'N/A', COL.method, y, { width: 105 });
        doc.fillColor('#7c3aed').font('Helvetica-Bold');
        doc.text(`₹${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, COL.amount, y, { width: 70, align: 'right' });

        if (subText) {
            doc.fillColor('#6b7280').fontSize(7.5).font('Helvetica');
            doc.text(subText, COL.title, y + 12, { width: 440 });
        }

        y += rowH + 4;
    });

    // ── Footer ──────────────────────────────────────────────────────────────────
    doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill('#7c3aed');
    doc.fillColor('white').fontSize(8).font('Helvetica');
    doc.text('SmartSpend — Cloud-Native Expense Manager  ·  smartspend.vercel.app', 40, doc.page.height - 25, { align: 'center', width: doc.page.width - 80 });

    doc.end();
};

module.exports = { exportCSV, exportPDF };
