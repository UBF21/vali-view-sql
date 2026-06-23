export interface SchemaColumn {
  name:         string
  type:         string
  nullable:     boolean
  isPrimaryKey: boolean
  isForeignKey: boolean
  references?:  { table: string; column: string }
  isIndexed:    boolean
}

export interface SchemaTable {
  name:    string
  columns: SchemaColumn[]
  indexes: string[]  // column names that are indexed (beyond PK)
}

export type Schema = Record<string, SchemaTable>  // keyed by lowercase table name
