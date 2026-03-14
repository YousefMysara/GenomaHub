import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET all clients
router.get('/', (req, res) => {
  try {
    const { type, search } = req.query
    let query = 'SELECT * FROM clients WHERE 1=1'
    const params = []

    if (type && type !== 'All') {
      query += ' AND type = ?'
      params.push(type)
    }
    if (search) {
      query += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY name ASC'
    const clients = db.prepare(query).all(...params)
    res.json(clients)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single client with quote history
router.get('/:id', (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id)
    if (!client) return res.status(404).json({ error: 'Client not found' })

    const quotes = db.prepare(`
      SELECT * FROM quotations WHERE client_id = ? ORDER BY date_created DESC
    `).all(req.params.id)

    res.json({ ...client, quotes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST new client
router.post('/', (req, res) => {
  try {
    const { name, type, contact_person, email, phone, address } = req.body
    const result = db.prepare(`
      INSERT INTO clients (name, type, contact_person, email, phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, type || 'Laboratory', contact_person, email, phone, address)

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(client)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update client
router.put('/:id', (req, res) => {
  try {
    const { name, type, contact_person, email, phone, address } = req.body
    db.prepare(`
      UPDATE clients SET name=?, type=?, contact_person=?, email=?, phone=?, address=?
      WHERE id=?
    `).run(name, type, contact_person, email, phone, address, req.params.id)

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id)
    res.json(client)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE client
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
