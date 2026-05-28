import { EXPENSE_TYPES } from '../consts/expenseTypes'

export type ExpenseType = keyof typeof EXPENSE_TYPES

export interface ExpenseEntry {
  type: ExpenseType
  subtype?: string   // used only for misc extra
  amount: number
  note?: string
}

export interface MonthlyExpenses {
  month: string      // YYYY-MM
  entries: ExpenseEntry[]
}
