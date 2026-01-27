import { useState } from 'react'
import { EXPENSE_TYPES } from '../consts/expenseTypes'
import { getExpenseTypeDisplay } from '../consts/defaultExpenses'
import type { ExpenseEntry, ExpenseType } from '../types/expense'
import { readCSV } from '../utils/fsCsv'
import './Expenses.css'
import Header from './Header.tsx'

function Expenses() {
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null)
  const [month, setMonth] = useState('')
  const [entries, setEntries] = useState<ExpenseEntry[]>([])
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [selectedType, setSelectedType] = useState<ExpenseType>('rent')
  const [totalForType, setTotalForType] = useState<number | null>(null)

  // ---- Select Folder ----
  const selectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker()
      setDirectoryHandle(handle)
    } catch {
      console.log('Folder selection cancelled')
    }
  }

  // ---- Load expenses for selected month ----
  const loadMonth = async () => {
    if (!directoryHandle || !month) return

    try {
      const fileHandle = await directoryHandle.getFileHandle(`${month}.csv`)
      const data = await readCSV(fileHandle)
      setEntries(data)
    } catch {
      setEntries([])
      alert('No CSV found for this month')
    }
  }

  // ---- Calculate total for a type over a month range (inclusive) ----
  const calculateTotalForType = async () => {
    if (!directoryHandle || !rangeStart || !rangeEnd) return

    const start = new Date(rangeStart)
    const end = new Date(rangeEnd)
    let total = 0

    // loop over months from start to end inclusive
    let current = new Date(start.getFullYear(), start.getMonth(), 1)
    const endInclusive = new Date(end.getFullYear(), end.getMonth(), 31)

    while (current <= endInclusive) {
      const monthStr = current.toISOString().slice(0, 7) // YYYY-MM
      try {
        const fileHandle = await directoryHandle.getFileHandle(`${monthStr}.csv`)
        const data: ExpenseEntry[] = await readCSV(fileHandle)
        const monthTotal = data
          .filter((e) => e.type === selectedType)
          .reduce((sum, e) => sum + e.amount, 0)
        total += monthTotal
      } catch {
        // file missing, skip
      }

      // next month
      current.setMonth(current.getMonth() + 1)
    }

    setTotalForType(total)
  }

  return (
    <>
      <Header />

      <div className="dashboard-container">
        <div className="card">
          <h1 className="title">View Expenses</h1>

          <button className="secondary-btn" onClick={selectFolder}>
            Select Expenses Folder
          </button>

          <div className="expenses-columns">
            {/* ----- Left Column: Monthly Expenses ----- */}
            <div className="expenses-column">
              <h2>Monthly Expenses</h2>
              <div className="form-grid">
                <div className="field">
                  <label>Month</label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </div>
                <button className="primary-btn" onClick={loadMonth}>Load Month</button>
              </div>

              {entries.length > 0 ? (
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Subtype</th>
                      <th>Amount (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => (
                      <tr key={idx}>
                        <td>{e.type}</td>
                        <td>{e.subtype || '-'}</td>
                        <td>{e.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No data for selected month.</p>
              )}
            </div>

            {/* ----- Divider ----- */}
            <div className="divider"></div>

            {/* ----- Right Column: Total for Type over Range ----- */}
            <div className="expenses-column">
              <h2>Total for Expense Type</h2>
              <div className="form-grid">
                <div className="field">
                  <label>Start Month</label>
                  <input
                    type="month"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>End Month</label>
                  <input
                    type="month"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Expense Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as ExpenseType)}
                  >
                    {EXPENSE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {getExpenseTypeDisplay(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="primary-btn2" onClick={calculateTotalForType}>Calculate Total</button>
              </div>

              {totalForType !== null && (
                <h3>
                  Total {selectedType} from {rangeStart} to {rangeEnd} : €
                  {totalForType.toFixed(2)}
                </h3>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Expenses
