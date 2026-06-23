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

  {
    id: 'pg-multi-join',
    title: 'Multi-table JOIN',
    dialect: 'postgresql',
    category: 'join',
    description: 'INNER JOIN + two LEFT JOINs across four tables.',
    sql: `SELECT
  o.id     AS order_id,
  c.name   AS customer,
  e.name   AS salesperson,
  sh.name  AS shipper
FROM orders o
INNER JOIN customers c ON o.customer_id    = c.id
LEFT JOIN  employees e ON o.salesperson_id = e.id
LEFT JOIN  shippers sh ON o.shipper_id     = sh.id
WHERE o.status = 'completed'
ORDER BY o.id DESC`,
  },
  {
    id: 'pg-upsert',
    title: 'INSERT … ON CONFLICT (Upsert)',
    dialect: 'postgresql',
    category: 'basic',
    description: 'Inserts or updates on primary key conflict.',
    sql: `INSERT INTO product_prices (product_id, price, updated_at)
VALUES (42, 19.99, NOW())
ON CONFLICT (product_id)
DO UPDATE SET
  price      = EXCLUDED.price,
  updated_at = EXCLUDED.updated_at`,
  },
  {
    id: 'pg-case',
    title: 'CASE WHEN — Tier Classification',
    dialect: 'postgresql',
    category: 'basic',
    description: 'Classifies orders into tiers with a CASE expression.',
    sql: `SELECT
  id,
  total,
  CASE
    WHEN total >= 1000 THEN 'platinum'
    WHEN total >= 500  THEN 'gold'
    WHEN total >= 100  THEN 'silver'
    ELSE 'bronze'
  END AS tier
FROM orders
WHERE status = 'completed'
ORDER BY total DESC`,
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

  {
    id: 'my-window',
    title: 'Window Functions',
    dialect: 'mysql',
    category: 'window',
    description: 'ROW_NUMBER + RANK over partitioned sales data (MySQL 8+).',
    sql: `SELECT
  product_id,
  sale_date,
  amount,
  ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY sale_date)        AS row_num,
  RANK()       OVER (PARTITION BY product_id ORDER BY amount DESC)      AS amt_rank
FROM sales
ORDER BY product_id, sale_date`,
  },
  {
    id: 'my-cte',
    title: 'CTE — Daily Revenue (MySQL 8+)',
    dialect: 'mysql',
    category: 'cte',
    description: 'Aggregates daily revenue in a CTE and selects the last 30 days.',
    sql: `WITH daily AS (
  SELECT
    DATE(created_at)  AS day,
    COUNT(*)          AS orders_count,
    SUM(total)        AS revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY DATE(created_at)
)
SELECT day, orders_count, revenue
FROM daily
ORDER BY day DESC
LIMIT 30`,
  },
  {
    id: 'my-update',
    title: 'UPDATE with WHERE',
    dialect: 'mysql',
    category: 'basic',
    description: 'Updates multiple columns for rows matching a condition.',
    sql: `UPDATE orders
SET status     = 'archived',
    archived_at = NOW()
WHERE status = 'completed'
  AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)`,
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
  {
    id: 'ss-offset-fetch',
    title: 'OFFSET / FETCH Pagination',
    dialect: 'sqlserver',
    category: 'basic',
    description: 'Standard SQL Server pagination — page 3 of 10 rows.',
    sql: `SELECT id, name, email, total_purchases
FROM customers
ORDER BY total_purchases DESC
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY`,
  },
  {
    id: 'ss-update',
    title: 'UPDATE with WHERE',
    dialect: 'sqlserver',
    category: 'basic',
    description: 'Updates tier and timestamp for high-value customers.',
    sql: `UPDATE customers
SET tier       = 'gold',
    updated_at  = GETDATE()
WHERE total_spent  > 5000
  AND last_order_at IS NOT NULL`,
  },
  {
    id: 'ss-delete',
    title: 'DELETE with Subquery',
    dialect: 'sqlserver',
    category: 'basic',
    description: 'Deletes expired sessions older than the threshold.',
    sql: `DELETE FROM session_logs
WHERE session_start < GETDATE()
  AND is_expired = 1`,
  },
  {
    id: 'sqlserver-merge',
    title: 'MERGE (upsert)',
    dialect: 'sqlserver',
    category: 'basic',
    description: 'SQL Server MERGE statement — upsert pattern',
    sql: `MERGE INTO employees AS target
USING new_employees AS source
  ON target.employee_id = source.employee_id
WHEN MATCHED THEN
  UPDATE SET
    target.name   = source.name,
    target.salary = source.salary
WHEN NOT MATCHED THEN
  INSERT (employee_id, name, salary)
  VALUES (source.employee_id, source.name, source.salary);`,
  },
  {
    id: 'sqlserver-pivot',
    title: 'PIVOT — columns from rows',
    dialect: 'sqlserver',
    category: 'aggregation',
    description: 'SQL Server PIVOT — aggregate rows into columns',
    sql: `SELECT department, [Jan], [Feb], [Mar]
FROM (
  SELECT department, month, sales
  FROM sales_data
) AS src
PIVOT (
  SUM(sales)
  FOR month IN ([Jan], [Feb], [Mar])
) AS pvt
ORDER BY department`,
  },
  {
    id: 'sqlserver-unpivot',
    title: 'UNPIVOT — rows from columns',
    dialect: 'sqlserver',
    category: 'basic',
    description: 'SQL Server UNPIVOT — expand column values into rows',
    sql: `SELECT employee_id, quarter, sales
FROM quarterly_sales
UNPIVOT (
  sales FOR quarter IN (Q1, Q2, Q3, Q4)
) AS unpvt`,
  },

  // ────── SQLite (3) ──────
  {
    id: 'sqlite-basic',
    title: 'Basic SELECT with LIMIT',
    dialect: 'sqlite',
    category: 'basic',
    description: 'Simple SQLite query using INTEGER PRIMARY KEY and LIMIT',
    sql: `SELECT id, name, email
FROM users
WHERE active = 1
ORDER BY created_at DESC
LIMIT 10`,
  },
  {
    id: 'sqlite-join',
    title: 'JOIN with aliases',
    dialect: 'sqlite',
    category: 'join',
    description: 'SQLite INNER JOIN — same as standard SQL',
    sql: `SELECT u.name, COUNT(o.id) AS order_count, SUM(o.total) AS total_spent
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name
ORDER BY total_spent DESC`,
  },
  {
    id: 'sqlite-cte',
    title: 'CTE with aggregation',
    dialect: 'sqlite',
    category: 'cte',
    description: 'SQLite CTE support (available since 3.8.3)',
    sql: `WITH monthly_totals AS (
  SELECT
    strftime('%Y-%m', created_at) AS month,
    SUM(amount) AS total
  FROM transactions
  GROUP BY strftime('%Y-%m', created_at)
)
SELECT month, total,
  SUM(total) OVER (ORDER BY month) AS running_total
FROM monthly_totals
ORDER BY month`,
  },
]

export function getExamplesByDialect(dialect: string) {
  return EXAMPLES.filter(e => e.dialect === dialect)
}
