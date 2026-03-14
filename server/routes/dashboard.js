import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  try {
    // Total products
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count

    // Total stock value
    const stockValue = db.prepare(`
      SELECT COALESCE(SUM(i.quantity * p.base_price), 0) as value
      FROM inventory i JOIN products p ON i.product_id = p.id
    `).get().value

    // Low stock items count
    const lowStockCount = db.prepare(`
      SELECT COUNT(*) as count FROM inventory WHERE quantity <= reorder_level
    `).get().count

    // Active quotes count
    const activeQuotes = db.prepare(`
      SELECT COUNT(*) as count FROM quotations WHERE status IN ('Draft', 'Sent')
    `).get().count

    // Expiring kits (within 90 days)
    const expiringCount = db.prepare(`
      SELECT COUNT(*) as count FROM inventory
      WHERE expiry_date IS NOT NULL AND expiry_date <= date('now', '+90 days')
    `).get().count

    // Total clients
    const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count

    // Recent quotations
    const recentQuotes = db.prepare(`
      SELECT q.*, c.name as client_name
      FROM quotations q LEFT JOIN clients c ON q.client_id = c.id
      ORDER BY q.date_created DESC LIMIT 5
    `).all()

    // Stock by category
    const stockByCategory = db.prepare(`
      SELECT p.category, SUM(i.quantity) as total_qty, COUNT(*) as item_count
      FROM inventory i JOIN products p ON i.product_id = p.id
      GROUP BY p.category
      ORDER BY total_qty DESC
    `).all()

    // Low stock items
    const lowStockItems = db.prepare(`
      SELECT i.*, p.name, p.item_code, p.item_type
      FROM inventory i JOIN products p ON i.product_id = p.id
      WHERE i.quantity <= i.reorder_level
      ORDER BY i.quantity ASC LIMIT 5
    `).all()

    // Expiring items
    const expiringItems = db.prepare(`
      SELECT i.*, p.name, p.item_code
      FROM inventory i JOIN products p ON i.product_id = p.id
      WHERE i.expiry_date IS NOT NULL AND i.expiry_date <= date('now', '+90 days')
      ORDER BY i.expiry_date ASC LIMIT 5
    `).all()

    res.json({
      stats: {
        totalProducts,
        stockValue,
        lowStockCount,
        activeQuotes,
        expiringCount,
        totalClients
      },
      recentQuotes,
      stockByCategory,
      lowStockItems,
      expiringItems
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
