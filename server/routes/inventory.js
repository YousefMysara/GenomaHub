import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET all inventory with product info
router.get('/', (req, res) => {
  try {
    const { item_type, stock_status, search } = req.query
    let query = `
      SELECT i.*, p.name, p.item_code, p.category, p.item_type, p.base_price, p.storage_conditions
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE 1=1
    `
    const params = []

    if (item_type && item_type !== 'All') {
      query += ' AND p.item_type = ?'
      params.push(item_type)
    }
    if (stock_status === 'low') {
      query += ' AND i.quantity <= i.reorder_level AND i.quantity > 0'
    } else if (stock_status === 'out') {
      query += ' AND i.quantity = 0'
    } else if (stock_status === 'ok') {
      query += ' AND i.quantity > i.reorder_level'
    }
    if (search) {
      query += ' AND (p.name LIKE ? OR p.item_code LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY i.quantity ASC'
    const items = db.prepare(query).all(...params)
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET alerts (low stock + expiring)
router.get('/alerts', (req, res) => {
  try {
    const lowStock = db.prepare(`
      SELECT i.*, p.name, p.item_code, p.category, p.item_type
      FROM inventory i JOIN products p ON i.product_id = p.id
      WHERE i.quantity <= i.reorder_level
      ORDER BY i.quantity ASC
    `).all()

    const expiring = db.prepare(`
      SELECT i.*, p.name, p.item_code, p.category, p.item_type
      FROM inventory i JOIN products p ON i.product_id = p.id
      WHERE i.expiry_date IS NOT NULL AND i.expiry_date <= date('now', '+90 days')
      ORDER BY i.expiry_date ASC
    `).all()

    res.json({ lowStock, expiring })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update inventory
router.put('/:id', (req, res) => {
  try {
    const { quantity, location, reorder_level, lot_number, serial_number, expiry_date } = req.body
    db.prepare(`
      UPDATE inventory SET quantity=?, location=?, reorder_level=?, lot_number=?, serial_number=?, expiry_date=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(quantity, location, reorder_level, lot_number, serial_number, expiry_date, req.params.id)

    const item = db.prepare(`
      SELECT i.*, p.name, p.item_code, p.category, p.item_type, p.base_price, p.storage_conditions
      FROM inventory i JOIN products p ON i.product_id = p.id
      WHERE i.id = ?
    `).get(req.params.id)
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
