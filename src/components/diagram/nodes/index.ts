export { NODE_COLORS, DIFF_BORDER, getDiffBorder } from './node-utils'
import { TableNode } from './TableNode'
import { JoinNode } from './JoinNode'
import { FilterNode } from './FilterNode'
import { AggregateNode } from './AggregateNode'
import { OutputNode } from './OutputNode'
import { SortNode } from './SortNode'
import { LimitNode } from './LimitNode'
import { CteNode } from './CteNode'
import { TempTableNode } from './TempTableNode'
import { SubqueryNode } from './SubqueryNode'
import { SetopNode } from './SetopNode'
import { ProcedureNode } from './ProcedureNode'
import { ParamNode } from './ParamNode'
import { DeclareNode } from './DeclareNode'
import { ConditionNode } from './ConditionNode'
import { LoopNode } from './LoopNode'

export const customNodeTypes = {
  tableNode: TableNode,
  joinNode: JoinNode,
  filterNode: FilterNode,
  aggregateNode: AggregateNode,
  outputNode: OutputNode,
  sortNode: SortNode,
  limitNode: LimitNode,
  cteNode: CteNode,
  tempTableNode: TempTableNode,
  subqueryNode: SubqueryNode,
  setopNode: SetopNode,
  procedureNode: ProcedureNode,
  paramNode: ParamNode,
  declareNode: DeclareNode,
  conditionNode: ConditionNode,
  loopNode: LoopNode,
}
