import { tool } from 'ai';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LPConstraint {
  coefficients: Record<string, number>;
  type: '<=' | '>=' | '=';
  rhs: number;
}

export interface LPInput {
  opType: 'max' | 'min';
  objective: Record<string, number>;
  constraints: LPConstraint[];
}

export interface TableauSnapshot {
  iteration: number;
  /** Variable name for each column (excluding the RHS column) */
  colNames: string[];
  /** Basic variable name for each constraint row */
  basicVars: string[];
  /** Full matrix including the RHS column. Last row is the objective row. */
  matrix: number[][];
}

export interface SimplexResult {
  feasible: boolean;
  bounded: boolean;
  /** Optimal value of the objective function (present when feasible and bounded) */
  optimal?: number;
  /** Optimal values of each decision variable */
  variables?: Record<string, number>;
  /** One snapshot per iteration, starting with the initial tableau (iteration 0) */
  tableaux: TableauSnapshot[];
}

// ─── Algorithm ────────────────────────────────────────────────────────────────

const BIG_M = 1_000_000;
const OPTIMALITY_TOL = 1e-9;
const PIVOT_TOL = 1e-9;
const ZERO_TOL = 1e-10;
const FEASIBILITY_TOL = 1e-6;
const MAX_ITERATIONS = 200;

/**
 * Solves a linear programming problem using the Big-M Simplex method.
 *
 * Supports:
 *  - Maximization and minimization
 *  - All constraint types: <=, >=, =
 *  - Infeasibility and unboundedness detection
 *  - Returns a snapshot of the tableau after each pivot
 *
 * Does NOT handle degeneracy / cycling prevention.
 */
export function solveSimplex(input: LPInput): SimplexResult {
  const { opType, objective, constraints } = input;
  const m = constraints.length;

  // Collect decision variables: union of objective keys + constraint keys, preserving order
  const dvSet = new Set<string>(Object.keys(objective));
  for (const c of constraints) {
    for (const v of Object.keys(c.coefficients)) dvSet.add(v);
  }
  const decisionVars = Array.from(dvSet);

  // ── Build auxiliary variable lists ──────────────────────────────────────────
  // <= : add slack s_i  (+1)
  // >= : add surplus s_i (−1) + artificial a_i (+1)
  //  = : add artificial a_i (+1)

  interface RowMeta {
    slackName: string | null;
    slackSign: number; // +1 or -1
    artificialName: string | null;
    initialBasic: string; // variable that starts basic in this row
  }

  const auxVars: string[] = [];
  const artificialNames: string[] = [];
  const rowMeta: RowMeta[] = [];

  for (let i = 0; i < m; i++) {
    const type = constraints[i].type;
    let slackName: string | null = null;
    let slackSign = 0;
    let artificialName: string | null = null;

    if (type === '<=') {
      slackName = `s${i + 1}`;
      slackSign = 1;
      auxVars.push(slackName);
    } else if (type === '>=') {
      slackName = `s${i + 1}`;
      slackSign = -1;
      auxVars.push(slackName);
      artificialName = `a${i + 1}`;
      artificialNames.push(artificialName);
      auxVars.push(artificialName);
    } else {
      // '='
      artificialName = `a${i + 1}`;
      artificialNames.push(artificialName);
      auxVars.push(artificialName);
    }

    rowMeta.push({
      slackName,
      slackSign,
      artificialName,
      initialBasic: artificialName ?? slackName!,
    });
  }

  const allVars = [...decisionVars, ...auxVars];
  const n = allVars.length;
  const vi: Record<string, number> = Object.fromEntries(allVars.map((v, i) => [v, i]));

  // ── Build initial tableau ────────────────────────────────────────────────────
  // Shape: (m+1) rows × (n+1) cols
  //   Rows 0..m-1 : constraint rows
  //   Row m       : objective row
  //   Col n       : RHS

  const mat: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const basicVars: string[] = rowMeta.map((r) => r.initialBasic);

  // Constraint rows
  for (let i = 0; i < m; i++) {
    const c = constraints[i];
    const r = rowMeta[i];

    for (const [v, coef] of Object.entries(c.coefficients)) {
      if (vi[v] !== undefined) mat[i][vi[v]] = coef;
    }
    if (r.slackName !== null) mat[i][vi[r.slackName]] = r.slackSign;
    if (r.artificialName !== null) mat[i][vi[r.artificialName]] = 1;
    mat[i][n] = c.rhs;
  }

  // Objective row
  // For max: store −c_j  (entering = most negative)
  // For min: convert to max(−c·x) → store +c_j
  const sign = opType === 'max' ? 1 : -1;
  for (const [v, coef] of Object.entries(objective)) {
    if (vi[v] !== undefined) mat[m][vi[v]] = -sign * coef;
  }

  // Big-M penalty for artificials: add BIG_M to their objective column
  for (const a of artificialNames) {
    mat[m][vi[a]] = BIG_M;
  }

  // Adjust objective row so every initial basic variable has reduced cost 0.
  // For each artificial a_i (basic in row i): obj_row -= BIG_M * constraint_row_i
  for (let i = 0; i < m; i++) {
    const a = rowMeta[i].artificialName;
    if (a !== null) {
      const factor = mat[m][vi[a]];
      for (let j = 0; j <= n; j++) {
        mat[m][j] -= factor * mat[i][j];
      }
    }
  }

  // ── Snapshot helper ─────────────────────────────────────────────────────────

  const snap = (iteration: number): TableauSnapshot => ({
    iteration,
    colNames: [...allVars],
    basicVars: [...basicVars],
    matrix: mat.map((row) => [...row]),
  });

  const tableaux: TableauSnapshot[] = [snap(0)];

  // ── Simplex iterations ───────────────────────────────────────────────────────

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // 1. Optimality check: find most-negative reduced cost (= entering variable)
    let pivotCol = -1;
    let minVal = -OPTIMALITY_TOL;
    for (let j = 0; j < n; j++) {
      if (mat[m][j] < minVal) {
        minVal = mat[m][j];
        pivotCol = j;
      }
    }
    if (pivotCol === -1) break; // all reduced costs ≥ 0 → optimal

    // 2. Minimum ratio test (= leaving variable)
    let pivotRow = -1;
    let minRatio = Infinity;
    for (let i = 0; i < m; i++) {
      if (mat[i][pivotCol] > PIVOT_TOL) {
        const ratio = mat[i][n] / mat[i][pivotCol];
        if (ratio < minRatio - PIVOT_TOL) {
          minRatio = ratio;
          pivotRow = i;
        }
      }
    }
    if (pivotRow === -1) {
      // No positive entry in pivot column → problem is unbounded
      return { feasible: true, bounded: false, tableaux };
    }

    // 3. Pivot
    basicVars[pivotRow] = allVars[pivotCol];
    const pivotVal = mat[pivotRow][pivotCol];

    // Normalize pivot row
    for (let j = 0; j <= n; j++) mat[pivotRow][j] /= pivotVal;

    // Eliminate pivot column from all other rows (including objective row)
    for (let i = 0; i <= m; i++) {
      if (i !== pivotRow && Math.abs(mat[i][pivotCol]) > ZERO_TOL) {
        const f = mat[i][pivotCol];
        for (let j = 0; j <= n; j++) mat[i][j] -= f * mat[pivotRow][j];
      }
    }

    tableaux.push(snap(iter + 1));
  }

  // ── Feasibility check ────────────────────────────────────────────────────────
  // If any artificial is still basic with a positive RHS, the problem is infeasible
  for (const a of artificialNames) {
    const row = basicVars.indexOf(a);
    if (row !== -1 && mat[row][n] > FEASIBILITY_TOL) {
      return { feasible: false, bounded: true, tableaux };
    }
  }

  // ── Extract solution ─────────────────────────────────────────────────────────
  const variables: Record<string, number> = Object.fromEntries(
    decisionVars.map((v) => [v, 0])
  );
  for (let i = 0; i < m; i++) {
    const bv = basicVars[i];
    if (bv in variables) variables[bv] = Math.max(0, mat[i][n]);
  }

  // mat[m][n] accumulates Z (the value being maximized)
  // For max: optimal = mat[m][n]
  // For min: we maximized −c·x, so optimal = −mat[m][n]
  const optimal = opType === 'max' ? mat[m][n] : -mat[m][n];

  return { feasible: true, bounded: true, optimal, variables, tableaux };
}

// ─── AI SDK Tool ──────────────────────────────────────────────────────────────

export const simplexTool = tool({
  description: `Resuelve un problema de programación lineal con el método Simplex.
Retorna si es factible, el valor óptimo, los valores de las variables, y las tablas intermedias de cada iteración.

Ejemplo — Maximizar Z = 3x1 + 5x2  sujeto a:  x1 + 2x2 ≤ 4,  2x1 + x2 ≤ 6
{
  "opType": "max",
  "objective": { "x1": 3, "x2": 5 },
  "constraints": [
    { "coefficients": { "x1": 1, "x2": 2 }, "type": "<=", "rhs": 4 },
    { "coefficients": { "x1": 2, "x2": 1 }, "type": "<=", "rhs": 6 }
  ]
}`,
  inputSchema: z.object({
    opType: z.enum(['max', 'min']).describe('Maximizar o minimizar la función objetivo'),
    objective: z
      .record(z.string(), z.number())
      .describe('Coeficientes de la función objetivo: { nombreVariable: coeficiente }'),
    constraints: z
      .array(
        z.object({
          coefficients: z
            .record(z.string(), z.number())
            .describe('Coeficientes de cada variable de decisión en esta restricción'),
          type: z.enum(['<=', '>=', '=']).describe('Tipo de restricción'),
          rhs: z.number().describe('Valor del lado derecho de la restricción'),
        })
      )
      .describe('Lista de restricciones del problema'),
  }),
  execute: async (input) => solveSimplex(input),
});
