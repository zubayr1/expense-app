import { useEffect, useState } from 'react'
import { EXPENSE_TYPES } from '../consts/expenseTypes'
import type { ExpenseEntry, ExpenseType } from '../types/expense'
import { readCSV, toCSV } from '../utils/fsCsv'
import './Dashboard.css'
import Header from './Header.tsx'

type Kind = 'expense' | 'saving'

function Dashboard() {
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null)
  const [month, setMonth] = useState('')
  const [type, setType] = useState<ExpenseType>('Rent')
  const [kind, setKind] = useState<Kind>('expense')
  const [amount, setAmount] = useState<string>('')
  const [miscType, setMiscType] = useState('')
  const [entries, setEntries] = useState<ExpenseEntry[]>([])
  const [loadedEntries, setLoadedEntries] = useState<ExpenseEntry[]>([])

  // --- Modal state for editing ---
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editType, setEditType] = useState<ExpenseType>('Rent')
  const [editKind, setEditKind] = useState<Kind>('expense')
  const [editAmount, setEditAmount] = useState<string>('')
  const [editMiscType, setEditMiscType] = useState('')

  const canBeBoth = EXPENSE_TYPES[type].canBeBoth
  const editCanBeBoth = EXPENSE_TYPES[editType].canBeBoth

  // Force expense-only types to 'expense' kind
  useEffect(() => {
    if (!canBeBoth) setKind('expense')
  }, [canBeBoth])

  useEffect(() => {
    if (!editCanBeBoth) setEditKind('expense')
  }, [editCanBeBoth])

  // Load existing CSV whenever month or folder changes
  useEffect(() => {
    const load = async () => {
      if (!directoryHandle || !month) {
        setLoadedEntries([])
        return
      }
      try {
        const fileHandle = await directoryHandle.getFileHandle(`${month}.csv`)
        const data = await readCSV(fileHandle)
        setLoadedEntries(data)
      } catch {
        setLoadedEntries([])
      }
    }
    load()
  }, [directoryHandle, month])

  const selectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker()
      setDirectoryHandle(handle)
    } catch {
      console.log('Folder selection cancelled')
    }
  }

  const handleAddExpense = () => {
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) return

    const subtype = type === 'misc extra' ? miscType.trim() : undefined
    const signed = kind === 'expense' ? -numericAmount : numericAmount

    setEntries((prev) => {
      const existingIndex = prev.findIndex(
        (e) => e.type === type && e.subtype === subtype
      )
      if (existingIndex !== -1) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          amount: updated[existingIndex].amount + signed,
        }
        return updated
      }
      return [...prev, { type, subtype, amount: signed }]
    })

    setAmount('')
    setMiscType('')
  }

  const handleDelete = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const handleEdit = (index: number) => {
    const entry = entries[index]
    setEditIndex(index)
    setEditType(entry.type)
    setEditKind(entry.amount < 0 ? 'expense' : 'saving')
    setEditAmount(Math.abs(entry.amount).toString())
    setEditMiscType(entry.subtype || '')
    setIsEditOpen(true)
  }

  const handleSaveEdit = () => {
    if (editIndex === null) return
    const numericAmount = Number(editAmount)
    if (!numericAmount || numericAmount <= 0) return

    const subtype = editType === 'misc extra' ? editMiscType.trim() : undefined
    const signed = editKind === 'expense' ? -numericAmount : numericAmount

    setEntries((prev) => {
      const updated = [...prev]
      updated[editIndex] = { type: editType, subtype, amount: signed }
      return updated
    })

    setIsEditOpen(false)
    setEditIndex(null)
  }

  const handleSubmit = async () => {
    if (!directoryHandle) {
      alert('Please select a folder first')
      return
    }
    if (entries.length === 0) {
      alert('Please add at least one expense')
      return
    }

    const fileName = `${month}.csv`
    let fileHandle: FileSystemFileHandle
    try {
      fileHandle = await directoryHandle.getFileHandle(fileName)
    } catch {
      fileHandle = await directoryHandle.getFileHandle(fileName, { create: true })
    }

    let mergedEntries = [...entries]
    try {
      const existing = await readCSV(fileHandle)
      existing.forEach((old) => {
        const idx = mergedEntries.findIndex(
          (e) => e.type === old.type && e.subtype === old.subtype
        )
        if (idx !== -1) {
          mergedEntries[idx].amount += old.amount
        } else {
          mergedEntries.push(old)
        }
      })
    } catch {
      // file empty or new
    }

    const writable = await fileHandle.createWritable()
    await writable.write(toCSV(month, mergedEntries))
    await writable.close()

    alert(`Saved ${fileName} successfully`)
    setEntries([])

    try {
      const updatedHandle = await directoryHandle.getFileHandle(fileName)
      const data = await readCSV(updatedHandle)
      setLoadedEntries(data)
    } catch {
      setLoadedEntries([])
    }
  }

  const isAddDisabled =
    !amount || Number(amount) <= 0 || (type === 'misc extra' && !miscType.trim())
  const isSubmitDisabled =
    !month || !directoryHandle || entries.length === 0

  return (
    <>
      <Header />

      <div className="dashboard-container">
        <div className="card">
          <h1 className="title">Monthly Expenses</h1>

          <div className="entry-area">
            <button className="secondary-btn" onClick={selectFolder}>
              Select Expenses Folder
            </button>

          <div className="form-grid">
            <div className="field">
              <label>Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Expense Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExpenseType)}
              >
                {Object.entries(EXPENSE_TYPES).map(([t, config]) => (
                  <option key={t} value={t}>
                    {t}
                    {config.canBeBoth ? ' (expense or savings)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {canBeBoth && (
              <div className="field">
                <label>Kind</label>
                <div className="kind-toggle">
                  <button
                    type="button"
                    className={`kind-btn ${kind === 'expense' ? 'active expense' : ''}`}
                    onClick={() => setKind('expense')}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={`kind-btn ${kind === 'saving' ? 'active saving' : ''}`}
                    onClick={() => setKind('saving')}
                  >
                    Saving
                  </button>
                </div>
              </div>
            )}

            {type === 'misc extra' && (
              <div className="field">
                <label>Misc Type</label>
                <input
                  type="text"
                  placeholder="e.g. charger, gift"
                  value={miscType}
                  onChange={(e) => setMiscType(e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label>Amount (€)</label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={handleAddExpense}
            disabled={isAddDisabled}
          >
            Add Expense
          </button>

          {entries.length > 0 && (
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Kind</th>
                  <th>Subtype</th>
                  <th>Amount (€)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={idx}>
                    <td>{e.type}</td>
                    <td className={e.amount < 0 ? 'kind-expense' : 'kind-saving'}>
                      {e.amount < 0 ? 'Expense' : 'Saving'}
                    </td>
                    <td>{e.subtype || '-'}</td>
                    <td>{Math.abs(e.amount).toFixed(2)}</td>
                    <td>
                      <button className="edit-btn" onClick={() => handleEdit(idx)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDelete(idx)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <button
            className="primary-btn2"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            Submit (Save Locally)
          </button>
          </div>

          {month && directoryHandle && (() => {
            // Aggregate loaded entries by type
            const settledByType = new Map<
              ExpenseType,
              { total: number; subtypes: string[] }
            >()
            loadedEntries.forEach((e) => {
              const existing = settledByType.get(e.type)
              if (existing) {
                existing.total += e.amount
                if (e.subtype) existing.subtypes.push(e.subtype)
              } else {
                settledByType.set(e.type, {
                  total: e.amount,
                  subtypes: e.subtype ? [e.subtype] : [],
                })
              }
            })

            const settledList = Array.from(settledByType.entries()).map(
              ([type, info]) => {
                const config = EXPENSE_TYPES[type]
                // canBeBoth types default to saving (+amount); others default to expense (-amount)
                const defaultSigned = config.canBeBoth ? config.amount : -config.amount
                const net = info.total - defaultSigned
                return { type, info, defaultSigned, net }
              }
            )

            const unsettledTypes = (Object.keys(EXPENSE_TYPES) as ExpenseType[]).filter(
              (t) => !settledByType.has(t)
            )

            return (
              <div className="summary-section">
                <h2 className="summary-title">Summary for {month}</h2>
                <div className="summary-columns">
                  <div className="summary-column">
                    <h3>Settled</h3>
                    {settledList.length === 0 ? (
                      <p className="summary-empty">Nothing settled yet.</p>
                    ) : (
                      <ul className="summary-list">
                        {settledList.map(({ type, info, defaultSigned, net }) => (
                          <li key={type} className="summary-item">
                            <div className="summary-item-header">
                              <span className="summary-item-name">{type}</span>
                              {info.subtypes.length > 0 && (
                                <span className="summary-subtype">
                                  {' '}({info.subtypes.join(', ')})
                                </span>
                              )}
                            </div>
                            <div className="summary-item-rows">
                              <div className="summary-row">
                                <span className="summary-label">Actual</span>
                                <span className={info.total < 0 ? 'kind-expense' : 'kind-saving'}>
                                  {info.total < 0 ? 'Expense' : 'Saving'} €
                                  {Math.abs(info.total).toFixed(2)}
                                </span>
                              </div>
                              <div className="summary-row">
                                <span className="summary-label">Default</span>
                                <span className={defaultSigned < 0 ? 'kind-expense' : 'kind-saving'}>
                                  {defaultSigned < 0 ? 'Expense' : 'Saving'} €
                                  {Math.abs(defaultSigned).toFixed(2)}
                                </span>
                              </div>
                              <div className="summary-row summary-net">
                                <span className="summary-label">Net</span>
                                <span className={net < 0 ? 'kind-expense' : 'kind-saving'}>
                                  {net < 0 ? 'Expense' : 'Saving'} €
                                  {Math.abs(net).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="summary-divider"></div>

                  <div className="summary-column">
                    <h3>Not yet settled</h3>
                    {unsettledTypes.length === 0 ? (
                      <p className="summary-empty">All types settled.</p>
                    ) : (
                      <ul className="summary-list">
                        {unsettledTypes.map((t) => (
                          <li key={t} className="summary-item summary-item-unsettled">
                            <div className="summary-item-name">{t}</div>
                            <span className="summary-hint">
                              Default: {EXPENSE_TYPES[t].canBeBoth ? 'Saving' : 'Expense'} €
                              {EXPENSE_TYPES[t].amount.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Expense</h2>

            <div className="field">
              <label>Expense Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as ExpenseType)}
              >
                {Object.entries(EXPENSE_TYPES).map(([t, config]) => (
                  <option key={t} value={t}>
                    {t}
                    {config.canBeBoth ? ' (expense or savings)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {editCanBeBoth && (
              <div className="field">
                <label>Kind</label>
                <div className="kind-toggle">
                  <button
                    type="button"
                    className={`kind-btn ${editKind === 'expense' ? 'active expense' : ''}`}
                    onClick={() => setEditKind('expense')}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={`kind-btn ${editKind === 'saving' ? 'active saving' : ''}`}
                    onClick={() => setEditKind('saving')}
                  >
                    Saving
                  </button>
                </div>
              </div>
            )}

            {editType === 'misc extra' && (
              <div className="field">
                <label>Misc Type</label>
                <input
                  type="text"
                  value={editMiscType}
                  onChange={(e) => setEditMiscType(e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label>Amount (€)</label>
              <input
                type="number"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div className="modal-buttons">
              <button onClick={handleSaveEdit}>Save</button>
              <button onClick={() => setIsEditOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Dashboard
