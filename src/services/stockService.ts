import { supabase } from './supabaseClient'

export const addStock = async (productId: string, quantity: number, cost: number) => {
  return await supabase.from('stock_movements').insert({
    product_id: productId,
    type: 'IN',
    quantity,
    unit_cost: cost,
    total: quantity * cost,
  })
}

export const removeStock = async (productId: string, quantity: number, price: number) => {
  return await supabase.from('stock_movements').insert({
    product_id: productId,
    type: 'OUT',
    quantity,
    unit_price: price,
    total: quantity * price,
  })
}