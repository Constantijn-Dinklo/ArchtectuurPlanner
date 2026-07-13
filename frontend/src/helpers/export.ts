

export function exportToCsv<T extends Record<string, any>>(
    data: T[],
    fields?: (keyof T)[],
    filename = 'export.csv',
) {
    if (data.length === 0) return;

    const headers = fields ?? Object.keys(data[0]) as (keyof T)[];

    const csv = [
        headers.join(','),
        ...data.map(row =>
            headers
                .map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`)
                .join(',')
        )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}