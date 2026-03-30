export const calculateStock = (movements: any[]) => {
  let stock = 0

  movements.forEach(m => {
    if (m.type === 'IN') stock += m.quantity
    else stock -= m.quantity
  })

  return stock
}

export const calculateProfit = (movements: any[]) => {
  let profit = 0

  movements.forEach(m => {
    if (m.type === 'OUT') profit += m.total
    if (m.type === 'IN') profit -= m.total
  })

  return profit
}