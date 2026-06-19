import { parseSQL } from './index'
import type { Dialect } from '@/types'

self.addEventListener('message', (e: MessageEvent<{ sql: string; dialect: Dialect }>) => {
  const { sql, dialect } = e.data
  const result = parseSQL(sql, dialect)
  self.postMessage(result)
})
