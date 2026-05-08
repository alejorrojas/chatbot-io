# Simplex Tool — Documentación

La herramienta `solveSimplex` resuelve problemas de programación lineal usando el método Simplex implementado a mano en TypeScript (`app/tools/simplex.ts`). Está registrada como tool del AI SDK y el modelo la invoca automáticamente cuando necesita resolver un LP.

---

## Input

```ts
{
  opType: 'max' | 'min';
  objective: Record<string, number>;       // variable → coeficiente en la FO
  constraints: Array<{
    coefficients: Record<string, number>;  // variable → coeficiente en la restricción
    type: '<=' | '>=' | '=';
    rhs: number;                           // lado derecho
  }>;
}
```

### Ejemplo

Problema: Maximizar Z = 3x1 + 5x2, sujeto a x1 + 2x2 ≤ 4, 2x1 + x2 ≤ 6

```json
{
  "opType": "max",
  "objective": { "x1": 3, "x2": 5 },
  "constraints": [
    { "coefficients": { "x1": 1, "x2": 2 }, "type": "<=", "rhs": 4 },
    { "coefficients": { "x1": 2, "x2": 1 }, "type": "<=", "rhs": 6 }
  ]
}
```

---

## Output

```ts
{
  feasible: boolean;
  bounded: boolean;
  optimal?: number;                        // valor óptimo de Z
  variables?: Record<string, number>;     // valor de cada variable de decisión
  tableaux: TableauSnapshot[];            // tabla de cada iteración
}
```

### Campos de `TableauSnapshot`

| Campo | Descripción |
|---|---|
| `iteration` | Número de iteración (0 = tableau inicial) |
| `colNames` | Nombres de todas las variables (columnas), sin la columna RHS |
| `basicVars` | Variable básica de cada fila de restricción |
| `matrix` | Matriz completa; última columna = RHS, última fila = fila objetivo |

---

## Variables auxiliares

La implementación convierte el problema a forma estándar automáticamente:

| Tipo de restricción | Variables agregadas |
|---|---|
| `<=` | Variable de holgura `s_i` (+1) |
| `>=` | Variable de exceso `s_i` (−1) + artificial `a_i` (+1) |
| `=` | Artificial `a_i` (+1) |

Las artificiales se penalizan con Big-M en la función objetivo para forzar su salida de la base.

---

## Casos especiales

- **Infactible**: `feasible: false`. Ocurre cuando alguna artificial permanece en la base con valor > 0 al terminar.
- **No acotado**: `bounded: false`. Ocurre cuando en alguna iteración la columna pivote no tiene entradas positivas.
- **Degeneración / ciclado**: No manejado actualmente (poco frecuente en problemas educativos).

---

## Cómo usar los tableaux intermedios

Cada elemento de `tableaux` es una foto del estado de la tabla en esa iteración. Para construir la tabla LaTeX de la iteración `k`:

- Las columnas son `colNames[k]` más una columna "RHS"
- Las filas de restricción usan `basicVars[k][i]` como variable básica de la fila `i`
- La última fila es la fila Z
- Los valores vienen de `matrix[k]`

### Cómo interpretar la fila objetivo

La fila objetivo almacena los **costos reducidos negados**:
- Valores negativos → la variable puede entrar a la base (mejora Z)
- Todos ≥ 0 → solución óptima alcanzada
- La última celda (RHS) = valor actual de Z para maximización

---

## Limitaciones conocidas

- Asume variables de decisión no negativas (x ≥ 0)
- No maneja variables libres (sin restricción de signo)
- No implementa prevención de ciclado (regla de Bland u otra)
- RHS negativo en restricciones no está soportado; el usuario debe reformular
