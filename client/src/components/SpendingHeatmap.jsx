import { useMemo } from 'react';
import { motion } from 'framer-motion';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getIntensityColor(val, max) {
    if (!val || val === 0) return 'rgba(255,255,255,0.04)';
    const ratio = Math.min(val / max, 1);
    if (ratio < 0.25) return 'rgba(16,185,129,0.25)';
    if (ratio < 0.5) return 'rgba(16,185,129,0.5)';
    if (ratio < 0.75) return 'rgba(16,185,129,0.75)';
    return '#10b981';
}

function getGlowColor(val, max) {
    if (!val || val === 0) return 'none';
    const ratio = Math.min(val / max, 1);
    if (ratio < 0.5) return 'none';
    return `0 0 6px rgba(16,185,129,${ratio * 0.6})`;
}

/**
 * SpendingHeatmap — a GitHub-style calendar contribution chart.
 * Expects `dailyData` = array of { date: ISOString, total: number }
 */
export default function SpendingHeatmap({ dailyData = [] }) {
    const { weeks, maxVal, monthLabels } = useMemo(() => {
        // Build a map of dateString -> total
        const map = {};
        dailyData.forEach(({ date, total }) => {
            const d = new Date(date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            map[key] = (map[key] || 0) + total;
        });

        const maxVal = Math.max(1, ...Object.values(map));

        // Build 52 weeks of cells (Sun–Sat), going back from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Start from Sunday before 364 days ago
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364);
        while (startDate.getDay() !== 0) startDate.setDate(startDate.getDate() - 1);

        const weeks = [];
        const monthLabels = [];
        let current = new Date(startDate);
        let lastMonth = -1;

        while (current <= today) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const dt = new Date(current);
                const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                const isFuture = dt > today;
                week.push({
                    date: new Date(dt),
                    key,
                    val: isFuture ? null : (map[key] || 0),
                    isFuture,
                    isToday: dt.toDateString() === today.toDateString(),
                });
                current.setDate(current.getDate() + 1);
            }

            // Month label logic: check if week contains a new month
            const firstDay = week[0].date;
            if (firstDay.getMonth() !== lastMonth) {
                monthLabels.push({ weekIndex: weeks.length, label: MONTHS[firstDay.getMonth()] });
                lastMonth = firstDay.getMonth();
            }

            weeks.push(week);
        }

        return { weeks, maxVal, monthLabels };
    }, [dailyData]);

    const totalSpend = useMemo(() =>
        dailyData.reduce((s, d) => s + d.total, 0), [dailyData]);

    const activeDays = useMemo(() =>
        dailyData.filter(d => d.total > 0).length, [dailyData]);

    return (
        <div style={{ width: '100%' }}>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Total (Past Year)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>₹{totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Active Days</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0', marginTop: 2 }}>{activeDays}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Peak Day</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', marginTop: 2 }}>₹{maxVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
            </div>

            {/* Grid */}
            <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                <div style={{ display: 'flex', gap: 4, position: 'relative', minWidth: 600 }}>
                    {/* Day labels */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 20, flexShrink: 0 }}>
                        {DAYS.map((d, i) => (
                            <div key={i} style={{ height: 11, display: 'flex', alignItems: 'center', fontSize: '0.55rem', color: '#475569', fontWeight: 700, width: 12 }}>
                                {i % 2 === 1 ? d : ''}
                            </div>
                        ))}
                    </div>

                    {/* Weeks */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        {/* Month labels */}
                        <div style={{ display: 'flex', position: 'relative', height: 18, marginBottom: 2 }}>
                            {monthLabels.map(({ weekIndex, label }) => (
                                <div
                                    key={label + weekIndex}
                                    style={{
                                        position: 'absolute',
                                        left: weekIndex * 13,
                                        fontSize: '0.6rem',
                                        color: '#64748b',
                                        fontWeight: 700,
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {label}
                                </div>
                            ))}
                        </div>

                        {/* Cell grid */}
                        <div style={{ display: 'flex', gap: 2 }}>
                            {weeks.map((week, wi) => (
                                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {week.map((cell, di) => (
                                        <motion.div
                                            key={`${wi}-${di}`}
                                            initial={{ opacity: 0, scale: 0.3 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.3, delay: (wi * 7 + di) * 0.001 }}
                                            title={
                                                cell.isFuture
                                                    ? 'Future'
                                                    : `${cell.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ₹${(cell.val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                                            }
                                            style={{
                                                width: 11,
                                                height: 11,
                                                borderRadius: 2,
                                                background: cell.isFuture
                                                    ? 'rgba(255,255,255,0.02)'
                                                    : getIntensityColor(cell.val, maxVal),
                                                boxShadow: cell.isFuture ? 'none' : getGlowColor(cell.val, maxVal),
                                                border: cell.isToday ? '1px solid #10b981' : '1px solid transparent',
                                                cursor: 'default',
                                                transition: 'transform 0.1s',
                                            }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 700 }}>Less</span>
                {[0.04, 0.25, 0.5, 0.75, 1].map((r, i) => (
                    <div key={i} style={{
                        width: 10, height: 10, borderRadius: 2,
                        background: r === 0.04
                            ? 'rgba(255,255,255,0.04)'
                            : `rgba(16,185,129,${r})`,
                    }} />
                ))}
                <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 700 }}>More</span>
            </div>
        </div>
    );
}
