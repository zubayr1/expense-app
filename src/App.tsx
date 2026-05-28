import { Route, Routes } from 'react-router-dom'
import './App.css'
import Dashboard from './components/dashboard'
import Expenses from './components/Expenses'


function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/get-expense" element={<Expenses />} />
    </Routes>
  )
}

export default App
