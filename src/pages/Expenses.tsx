import { useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Expenses() {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState(0)

  const addExpense = async () => {
    await supabase.from('expenses').insert({
      label,
      amount,
      date: new Date()
    })
  }

  return (
    <div>
      <h1>Dépenses</h1>
      <input placeholder="Label" onChange={e => setLabel(e.target.value)} />
      <input type="number" onChange={e => setAmount(+e.target.value)} />
      <button onClick={addExpense}>Ajouter</button>
    </div>
  )
}