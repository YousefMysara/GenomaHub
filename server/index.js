import express from 'express'
import cors from 'cors'
import productsRouter from './routes/products.js'
import inventoryRouter from './routes/inventory.js'
import clientsRouter from './routes/clients.js'
import quotationsRouter from './routes/quotations.js'
import dashboardRouter from './routes/dashboard.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// API Routes
app.use('/api/products', productsRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/quotations', quotationsRouter)
app.use('/api/dashboard', dashboardRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'GenomaHub API', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`\n🧬 GenomaHub API running at http://localhost:${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`)
})
