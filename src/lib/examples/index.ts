import type { Example } from '@/types'

export const EXAMPLES: Example[] = [
  // ────── PostgreSQL (5) ──────
  {
    id: 'pg-basic',
    title: 'Basic SELECT with JOIN',
    dialect: 'postgresql',
    category: 'join',
    description: 'Simple inner join with filter and ordering.',
    sql: `SELECT u.id, u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > 100
ORDER BY o.total DESC
LIMIT 10`,
  },
  {
    id: 'pg-cte',
    title: 'CTE Chain',
    dialect: 'postgresql',
    category: 'cte',
    description: 'Two CTEs where the second references the first.',
    sql: `WITH active_users AS (
  SELECT id, name, email
  FROM users
  WHERE status = 'active'
),
recent_orders AS (
  SELECT user_id, SUM(total) AS total_spent
  FROM orders
  WHERE created_at > '2024-01-01'
  GROUP BY user_id
)
SELECT u.name, u.email, COALESCE(r.total_spent, 0) AS spent
FROM active_users u
LEFT JOIN recent_orders r ON u.id = r.user_id
ORDER BY spent DESC`,
  },
  {
    id: 'pg-recursive-cte',
    title: 'Recursive CTE — Employee Hierarchy',
    dialect: 'postgresql',
    category: 'cte',
    description: 'Traverses an employee hierarchy using WITH RECURSIVE.',
    sql: `WITH RECURSIVE emp_tree AS (
  SELECT id, name, manager_id, 0 AS depth
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, t.depth + 1
  FROM employees e
  JOIN emp_tree t ON e.manager_id = t.id
)
SELECT id, name, depth
FROM emp_tree
ORDER BY depth, name`,
  },
  {
    id: 'pg-window',
    title: 'Window Function — ROW_NUMBER',
    dialect: 'postgresql',
    category: 'window',
    description: 'Ranks orders per user by total amount.',
    sql: `SELECT
  user_id,
  order_id,
  total,
  ROW_NUMBER() OVER (
    PARTITION BY user_id
    ORDER BY total DESC
  ) AS rank_in_user
FROM orders
WHERE status = 'completed'`,
  },
  {
    id: 'pg-subquery',
    title: 'Correlated Subquery',
    dialect: 'postgresql',
    category: 'subquery',
    description: 'Finds users whose total order amount exceeds the average.',
    sql: `SELECT u.id, u.name
FROM users u
WHERE (
  SELECT COALESCE(SUM(o.total), 0)
  FROM orders o
  WHERE o.user_id = u.id
) > (
  SELECT AVG(total) FROM orders
)
ORDER BY u.name`,
  },

  // ────── MySQL (5) ──────
  {
    id: 'my-group',
    title: 'GROUP BY with HAVING',
    dialect: 'mysql',
    category: 'aggregation',
    description: 'Groups orders by status and filters groups with more than 5 orders.',
    sql: `SELECT
  status,
  COUNT(*) AS order_count,
  SUM(total) AS total_revenue,
  AVG(total) AS avg_order
FROM orders
GROUP BY status
HAVING COUNT(*) > 5
ORDER BY total_revenue DESC`,
  },
  {
    id: 'my-join-limit',
    title: 'JOIN with LIMIT',
    dialect: 'mysql',
    category: 'join',
    description: 'Left join with a limit for pagination.',
    sql: `SELECT p.id, p.name, p.price, c.name AS category
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.active = 1
ORDER BY p.created_at DESC
LIMIT 20`,
  },
  {
    id: 'my-insert-select',
    title: 'INSERT … SELECT',
    dialect: 'mysql',
    category: 'basic',
    description: 'Copies active users to an archive table.',
    sql: `INSERT INTO users_archive (id, name, email, archived_at)
SELECT id, name, email, NOW()
FROM users
WHERE status = 'inactive'
  AND last_login < DATE_SUB(NOW(), INTERVAL 1 YEAR)`,
  },
  {
    id: 'my-full-outer',
    title: 'FULL OUTER JOIN Emulation',
    dialect: 'mysql',
    category: 'join',
    description: 'MySQL does not support FULL OUTER JOIN — emulated with UNION.',
    sql: `SELECT a.id AS a_id, b.id AS b_id
FROM table_a a
LEFT JOIN table_b b ON a.id = b.a_id
UNION
SELECT a.id AS a_id, b.id AS b_id
FROM table_a a
RIGHT JOIN table_b b ON a.id = b.a_id`,
  },
  {
    id: 'my-subquery-corr',
    title: 'Correlated Subquery in SELECT',
    dialect: 'mysql',
    category: 'subquery',
    description: 'Shows each department with the count of its employees.',
    sql: `SELECT
  d.id,
  d.name,
  (SELECT COUNT(*) FROM employees e WHERE e.dept_id = d.id) AS headcount
FROM departments d
ORDER BY headcount DESC`,
  },

  // ────── SQL Server (5) ──────
  {
    id: 'ss-top',
    title: 'SELECT TOP 10',
    dialect: 'sqlserver',
    category: 'basic',
    description: 'Retrieves the 10 most recent orders.',
    sql: `SELECT TOP 10
  o.id,
  o.customer_id,
  o.total,
  o.created_at
FROM orders o WITH (NOLOCK)
ORDER BY o.created_at DESC`,
  },
  {
    id: 'ss-cte-multi',
    title: 'Multiple CTEs',
    dialect: 'sqlserver',
    category: 'cte',
    description: 'Combines two CTEs to produce a report.',
    sql: `WITH SalesCTE AS (
  SELECT salesperson_id, SUM(amount) AS total_sales
  FROM sales
  WHERE YEAR(sale_date) = 2024
  GROUP BY salesperson_id
),
QuotaCTE AS (
  SELECT salesperson_id, quota
  FROM sales_quotas
  WHERE year = 2024
)
SELECT
  e.name,
  s.total_sales,
  q.quota,
  s.total_sales - q.quota AS delta
FROM SalesCTE s
JOIN QuotaCTE q ON s.salesperson_id = q.salesperson_id
JOIN employees e ON s.salesperson_id = e.id
ORDER BY delta DESC`,
  },
  {
    id: 'ss-row-number',
    title: 'ROW_NUMBER() OVER — Pagination',
    dialect: 'sqlserver',
    category: 'window',
    description: 'Keyset pagination using ROW_NUMBER.',
    sql: `SELECT id, name, email, row_num
FROM (
  SELECT
    id, name, email,
    ROW_NUMBER() OVER (ORDER BY id) AS row_num
  FROM customers
) AS paged
WHERE row_num BETWEEN 21 AND 40`,
  },
  {
    id: 'ss-sp-simple',
    title: 'Stored Procedure with IF/ELSE',
    dialect: 'sqlserver',
    category: 'sp',
    description: 'SP that returns active or all orders based on a parameter.',
    sql: `CREATE PROCEDURE dbo.GetOrders
  @ActiveOnly BIT = 1,
  @UserId INT = NULL
AS
BEGIN
  DECLARE @Count INT

  IF @ActiveOnly = 1
  BEGIN
    SELECT id, total, status
    FROM orders
    WHERE status = 'active'
  END
  ELSE
  BEGIN
    SELECT id, total, status
    FROM orders
    WHERE (@UserId IS NULL OR user_id = @UserId)
  END
END`,
  },
  {
    id: 'ss-temp',
    title: 'Temp Table with INSERT',
    dialect: 'sqlserver',
    category: 'temp',
    description: 'Stores intermediate results in a temp table.',
    sql: `SELECT id, name, SUM(total) AS revenue
INTO #top_customers
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name
HAVING SUM(total) > 10000

SELECT *
FROM #top_customers
ORDER BY revenue DESC`,
  },
]

export function getExamplesByDialect(dialect: string) {
  return EXAMPLES.filter(e => e.dialect === dialect)
}
