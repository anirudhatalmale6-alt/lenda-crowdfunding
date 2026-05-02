import {
    AlertCircle,
    CheckCircle2,
    Circle,
    Clock3,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_STYLES = {
    pending: {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        line: 'bg-amber-200',
        dot: 'text-amber-500',
        icon: Clock3,
    },
    completed: {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        line: 'bg-emerald-200',
        dot: 'text-emerald-500',
        icon: CheckCircle2,
    },
    upcoming: {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        line: 'bg-blue-200',
        dot: 'text-blue-500',
        icon: Circle,
    },
    overdue: {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        line: 'bg-rose-200',
        dot: 'text-rose-500',
        icon: AlertCircle,
    },
};

function MilestoneTimeline({ title, subtitle, items, emptyMessage }) {
    if (!items?.length) {
        return (
            <div className="card p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
                    </div>
                </div>
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    {emptyMessage}
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {items.length} milestones
                </span>
            </div>

            <div className="mt-6 space-y-0">
                {items.map((item, index) => {
                    const style = STATUS_STYLES[item.status] || STATUS_STYLES.upcoming;
                    const Icon = style.icon;
                    const isLast = index === items.length - 1;
                    const amountColor = item.direction === 'outflow' ? 'text-rose-600' : 'text-emerald-600';
                    const signedAmount = `${item.direction === 'outflow' ? '-' : '+'}${formatCurrency(item.amount || 0)}`;

                    return (
                        <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                            <div className="relative flex w-8 flex-col items-center">
                                <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white shadow-sm ${style.dot}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                {!isLast ? <div className={`mt-1 h-full w-0.5 ${style.line}`} /> : null}
                            </div>

                            <div className="flex-1 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${style.badge}`}>
                                                {item.badge || item.status}
                                            </span>
                                        </div>
                                        {item.subtitle ? (
                                            <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
                                        ) : null}
                                        {item.description ? (
                                            <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                                        ) : null}
                                    </div>

                                    <div className="min-w-[170px] text-left lg:text-right">
                                        {typeof item.amount === 'number' ? (
                                            <div className={`text-base font-semibold ${amountColor}`}>{signedAmount}</div>
                                        ) : null}
                                        {item.date ? (
                                            <div className="mt-1 text-sm text-slate-500">{formatDate(item.date)}</div>
                                        ) : null}
                                    </div>
                                </div>

                                {item.meta?.length ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {item.meta.map((entry) => (
                                            <span
                                                key={entry}
                                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                                            >
                                                {entry}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MilestoneTimeline;