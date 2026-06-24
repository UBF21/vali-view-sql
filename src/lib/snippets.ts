export interface Snippet {
  id: string
  title: string
  description: string
  sql: string
}

export const SNIPPETS: Snippet[] = [
  {
    id: 'select-join',
    title: 'SELECT with JOIN',
    description: 'INNER JOIN between two tables',
    sql: `SELECT\n  a.id,\n  a.name,\n  b.value\nFROM table_a a\nINNER JOIN table_b b ON a.id = b.a_id\nWHERE a.active = true\nORDER BY a.id;`,
  },
  {
    id: 'cte',
    title: 'WITH (CTE)',
    description: 'Common table expression with ROW_NUMBER',
    sql: `WITH ranked AS (\n  SELECT\n    id,\n    name,\n    ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) AS rn\n  FROM items\n)\nSELECT *\nFROM ranked\nWHERE rn = 1;`,
  },
  {
    id: 'subquery',
    title: 'Subquery in SELECT',
    description: 'Scalar subquery counted per row',
    sql: `SELECT\n  u.id,\n  u.name,\n  (\n    SELECT COUNT(*)\n    FROM orders o\n    WHERE o.user_id = u.id\n  ) AS order_count\nFROM users u;`,
  },
  {
    id: 'window',
    title: 'Window function',
    description: 'RANK and AVG over a partition',
    sql: `SELECT\n  id,\n  name,\n  salary,\n  AVG(salary) OVER (PARTITION BY department_id) AS dept_avg,\n  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS salary_rank\nFROM employees;`,
  },
  {
    id: 'group-by',
    title: 'GROUP BY + HAVING',
    description: 'Aggregate counts with HAVING filter',
    sql: `SELECT\n  department_id,\n  COUNT(*) AS total,\n  AVG(salary) AS avg_salary,\n  MAX(salary) AS max_salary\nFROM employees\nGROUP BY department_id\nHAVING COUNT(*) > 5\nORDER BY avg_salary DESC;`,
  },
]
