import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Generate next quote number
function getNextQuoteNumber() {
  const year = new Date().getFullYear()
  const last = db.prepare(`
    SELECT quote_number FROM quotations
    WHERE quote_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(`Q-${year}-%`)

  let seq = 1
  if (last) {
    const parts = last.quote_number.split('-')
    seq = parseInt(parts[2]) + 1
  }
  return `Q-${year}-${String(seq).padStart(3, '0')}`
}

// GET all quotations
router.get('/', (req, res) => {
  try {
    const { status, search } = req.query
    let query = `
      SELECT q.*, c.name as client_name, c.type as client_type
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE 1=1
    `
    const params = []

    if (status && status !== 'All') {
      query += ' AND q.status = ?'
      params.push(status)
    }
    if (search) {
      query += ' AND (q.quote_number LIKE ? OR c.name LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY q.date_created DESC'
    const quotes = db.prepare(query).all(...params)
    res.json(quotes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single quotation with line items
router.get('/:id', (req, res) => {
  try {
    const quote = db.prepare(`
      SELECT q.*, c.name as client_name, c.type as client_type, c.contact_person, c.email, c.phone, c.address
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.id = ?
    `).get(req.params.id)

    if (!quote) return res.status(404).json({ error: 'Quotation not found' })

    const lineItems = db.prepare(`
      SELECT li.*, p.name as product_name, p.item_code, p.description as product_description, p.item_type, p.category
      FROM quote_line_items li
      JOIN products p ON li.product_id = p.id
      WHERE li.quote_id = ?
    `).all(req.params.id)

    res.json({ ...quote, lineItems })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST new quotation
router.post('/', (req, res) => {
  try {
    const { client_id, validity_days, status, terms_conditions, notes, lineItems } = req.body
    const quote_number = getNextQuoteNumber()

    // Calculate totals from line items
    let subtotal = 0
    if (lineItems && lineItems.length > 0) {
      for (const item of lineItems) {
        const lineTotal = item.quantity * item.quoted_price * (1 - (item.discount_percent || 0) / 100)
        subtotal += lineTotal
      }
    }

    const discount_percent = req.body.discount_percent || 0
    const total = subtotal * (1 - discount_percent / 100)

    const result = db.prepare(`
      INSERT INTO quotations (quote_number, client_id, validity_days, status, terms_conditions, subtotal, discount_percent, total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(quote_number, client_id, validity_days || 30, status || 'Draft', terms_conditions, subtotal, discount_percent, total, notes)

    const quoteId = result.lastInsertRowid

    // Insert line items
    if (lineItems && lineItems.length > 0) {
      const insertLine = db.prepare(`
        INSERT INTO quote_line_items (quote_id, product_id, quantity, quoted_price, discount_percent, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const item of lineItems) {
        const lineTotal = item.quantity * item.quoted_price * (1 - (item.discount_percent || 0) / 100)
        insertLine.run(quoteId, item.product_id, item.quantity, item.quoted_price, item.discount_percent || 0, lineTotal)
      }
    }

    const quote = db.prepare(`
      SELECT q.*, c.name as client_name
      FROM quotations q LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.id = ?
    `).get(quoteId)
    res.status(201).json(quote)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update quotation status
router.put('/:id', (req, res) => {
  try {
    const { status, validity_days, terms_conditions, notes, discount_percent, client_id } = req.body

    // Recalculate if discount changed
    if (discount_percent !== undefined) {
      const quote = db.prepare('SELECT subtotal FROM quotations WHERE id = ?').get(req.params.id)
      const total = quote.subtotal * (1 - discount_percent / 100)
      db.prepare('UPDATE quotations SET discount_percent=?, total=? WHERE id=?').run(discount_percent, total, req.params.id)
    }

    if (status) db.prepare('UPDATE quotations SET status=? WHERE id=?').run(status, req.params.id)
    if (validity_days) db.prepare('UPDATE quotations SET validity_days=? WHERE id=?').run(validity_days, req.params.id)
    if (terms_conditions) db.prepare('UPDATE quotations SET terms_conditions=? WHERE id=?').run(terms_conditions, req.params.id)
    if (notes !== undefined) db.prepare('UPDATE quotations SET notes=? WHERE id=?').run(notes, req.params.id)
    if (client_id) db.prepare('UPDATE quotations SET client_id=? WHERE id=?').run(client_id, req.params.id)

    const quote = db.prepare(`
      SELECT q.*, c.name as client_name
      FROM quotations q LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.id = ?
    `).get(req.params.id)
    res.json(quote)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE quotation
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM quotations WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
