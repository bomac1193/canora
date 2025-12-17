import type {
  User,
  Work,
  WorkEdge,
  Contribution,
  PromotionEvent,
  CuratedList,
  CuratedListItem,
  Role,
  WorkStatus,
  EdgeType,
  ContributionRole
} from '@prisma/client'

// Re-export Prisma types
export type {
  User,
  Work,
  WorkEdge,
  Contribution,
  PromotionEvent,
  CuratedList,
  CuratedListItem
}

export { Role, WorkStatus, EdgeType, ContributionRole }

// Extended types with relations
export type WorkWithRelations = Work & {
  contributions: Contribution[]
  promotionEvents: (PromotionEvent & { signedBy: Pick<User, 'id' | 'name'> })[]
  parentEdges: (WorkEdge & { fromWork: Pick<Work, 'id' | 'slug' | 'title' | 'status'> })[]
  childEdges: (WorkEdge & { toWork: Pick<Work, 'id' | 'slug' | 'title' | 'status'> })[]
  canonLockedBy: Pick<User, 'id' | 'name'> | null
  createdBy: Pick<User, 'id' | 'name'> | null
}

export type CuratedListWithItems = CuratedList & {
  curator: Pick<User, 'id' | 'name'>
  items: (CuratedListItem & { work: Pick<Work, 'id' | 'slug' | 'title' | 'status'> })[]
}

// Lineage graph types for React Flow
export type LineageNode = {
  id: string
  slug: string
  title: string
  status: WorkStatus
  depth: number
}

export type LineageEdge = {
  id: string
  source: string
  target: string
  type: EdgeType
}

export type LineageGraph = {
  nodes: LineageNode[]
  edges: LineageEdge[]
}

// API response types
export type ApiResponse<T> = {
  data?: T
  error?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Metrics types for admin dashboard
export type Metrics = {
  totalWorks: number
  jamCount: number
  plateCount: number
  canonCount: number
  canonPercentage: number
  lineageExplorationEvents: number
  creationEvents: number
  medianJamToPlate: number | null // in days
  medianPlateToCanon: number | null // in days
}
