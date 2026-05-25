'use client';

import katex from 'katex';

interface ColInfo {
  align: 'c' | 'l' | 'r';
  borderLeft: boolean;
  borderRight: boolean;
}

function parseColSpec(spec: string): ColInfo[] {
  const cols: ColInfo[] = [];
  let pendingLeft = false;

  for (const ch of spec) {
    if (ch === '|') {
      if (cols.length === 0) {
        pendingLeft = true;
      } else {
        cols[cols.length - 1].borderRight = true;
        pendingLeft = true;
      }
    } else if (ch === 'c' || ch === 'l' || ch === 'r') {
      cols.push({ align: ch, borderLeft: pendingLeft, borderRight: false });
      pendingLeft = false;
    }
  }

  return cols;
}

type TableRow = { kind: 'hline' } | { kind: 'data'; cells: string[] };

function parseArrayBody(body: string): TableRow[] {
  const rows: TableRow[] = [];
  const lines = body.split(/\\\\/).map(l => l.trim());

  for (const line of lines) {
    let remaining = line;

    while (remaining.startsWith('\\hline')) {
      rows.push({ kind: 'hline' });
      remaining = remaining.slice('\\hline'.length).trim();
    }

    if (remaining.length === 0) continue;

    const cells = remaining.split('&').map(c => c.trim());
    rows.push({ kind: 'data', cells });
  }

  return rows;
}

function renderCell(latex: string): string {
  if (!latex) return '';
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false });
  } catch {
    return latex;
  }
}

export function SimplexTableau({ latex }: { latex: string }) {
  // Strip optional \displaystyle prefix added by normalizeDisplayMath
  const clean = latex.replace(/^\\displaystyle\s+/, '');
  const match = clean.match(/\\begin\{array\}\{([^}]+)\}([\s\S]*?)\\end\{array\}/);

  if (!match) {
    // Fallback: KaTeX display render
    const html = katex.renderToString(clean, { throwOnError: false, displayMode: true });
    return (
      <div
        className="overflow-x-auto my-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const [, specStr, body] = match;
  const cols = parseColSpec(specStr);
  const allRows = parseArrayBody(body);
  const dataRows = allRows.filter(r => r.kind === 'data');

  // Build a map: allRows index → data row index (for header/footer styling)
  const dataIdxMap = new Map<number, number>();
  let di = 0;
  allRows.forEach((row, i) => {
    if (row.kind === 'data') dataIdxMap.set(i, di++);
  });

  return (
    <div className="not-prose overflow-x-auto my-5">
      <div className="inline-block min-w-max rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <table className="border-collapse text-sm">
          <tbody>
            {allRows.map((row, i) => {
              if (row.kind === 'hline') return null;

              const dataIdx = dataIdxMap.get(i)!;
              const isHeader = dataIdx === 0;
              const isObjective = dataIdx === dataRows.length - 1 && dataRows.length > 1;
              const prevIsHline = i > 0 && allRows[i - 1].kind === 'hline';

              const rowBg = isHeader
                ? 'bg-zinc-50 dark:bg-zinc-800'
                : isObjective
                ? 'bg-zinc-50/60 dark:bg-zinc-800/40'
                : 'bg-white dark:bg-zinc-900';

              return (
                <tr key={i} className={rowBg}>
                  {row.cells.map((cell, j) => {
                    const col = cols[j] ?? { align: 'c', borderLeft: false, borderRight: false };
                    const html = renderCell(cell);

                    const alignClass =
                      col.align === 'l'
                        ? 'text-left'
                        : col.align === 'r'
                        ? 'text-right'
                        : 'text-center';

                    const borderClasses = [
                      prevIsHline ? 'border-t border-zinc-200 dark:border-zinc-700' : '',
                      col.borderLeft ? 'border-l border-zinc-200 dark:border-zinc-700' : '',
                      col.borderRight ? 'border-r border-zinc-200 dark:border-zinc-700' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    const fontClass = isHeader ? 'font-medium' : 'font-normal';

                    return (
                      <td
                        key={j}
                        className={`px-4 py-2.5 ${alignClass} ${borderClasses} ${fontClass} text-zinc-800 dark:text-zinc-200`}
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Split preprocessed text into text segments and array blocks
export function splitLatexContent(
  text: string,
): Array<{ type: 'text'; content: string } | { type: 'array'; latex: string }> {
  const result: Array<{ type: 'text'; content: string } | { type: 'array'; latex: string }> = [];
  // Matches $$...$$  where the inner content contains \begin{array}
  const regex = /\$\$((?:\\displaystyle\s+)?\\begin\{array\}[\s\S]*?\\end\{array\})\$\$/g;

  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      result.push({ type: 'text', content: text.slice(lastIdx, match.index) });
    }
    result.push({ type: 'array', latex: match[1] });
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    result.push({ type: 'text', content: text.slice(lastIdx) });
  }

  return result;
}
