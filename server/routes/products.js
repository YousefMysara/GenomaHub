import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET all products
router.get('/', (req, res) => {
  try {
    const { category, item_type, search } = req.query
    let query = 'SELECT * FROM products WHERE 1=1'
    const params = []

    if (category && category !== 'All') {
      query += ' AND category = ?'
      params.push(category)
    }
    if (item_type && item_type !== 'All') {
      query += ' AND item_type = ?'
      params.push(item_type)
    }
    if (search) {
      query += ' AND (name LIKE ? OR item_code LIKE ? OR description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY created_at DESC'
    const products = db.prepare(query).all(...params)
    res.json(products)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single product
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST new product
router.post('/', (req, res) => {
  try {
    const { item_code, name, category, item_type, description, base_price, datasheet_url, storage_conditions } = req.body
    const result = db.prepare(`
      INSERT INTO products (item_code, name, category, item_type, description, base_price, datasheet_url, storage_conditions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(item_code, name, category || 'Consumables', item_type || 'Kit', description, base_price || 0, datasheet_url, storage_conditions)

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)

    // Auto-create inventory entry
    db.prepare(`
      INSERT INTO inventory (product_id, quantity, location, reorder_level)
      VALUES (?, 0, 'Unassigned', 5)
    `).run(result.lastInsertRowid)

    res.status(201).json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update product
router.put('/:id', (req, res) => {
  try {
    const { item_code, name, category, item_type, description, base_price, datasheet_url, storage_conditions } = req.body
    db.prepare(`
      UPDATE products SET item_code=?, name=?, category=?, item_type=?, description=?, base_price=?, datasheet_url=?, storage_conditions=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(item_code, name, category, item_type, description, base_price, datasheet_url, storage_conditions, req.params.id)

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE product
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
