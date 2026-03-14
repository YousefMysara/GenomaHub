import db from './db.js'

// Clear existing data
db.exec('DELETE FROM quote_line_items')
db.exec('DELETE FROM quotations')
db.exec('DELETE FROM inventory')
db.exec('DELETE FROM clients')
db.exec('DELETE FROM products')

// Reset autoincrement
db.exec("DELETE FROM sqlite_sequence")

console.log('🧬 Seeding GenomaHub database...\n')

// --- Products ---
const insertProduct = db.prepare(`
  INSERT INTO products (item_code, name, category, item_type, description, base_price, datasheet_url, storage_conditions)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const products = [
  ['NGS-ILL-001', 'NextSeq 2000 Sequencing System', 'Capital Equipment', 'Equipment', 'High-throughput benchtop sequencer for whole-genome, exome, and targeted sequencing applications.', 350000, null, null],
  ['PCR-BIO-002', 'CFX Opus 96 Real-Time PCR System', 'Capital Equipment', 'Equipment', 'Versatile real-time PCR detection system with 96-well capacity and advanced optical technology.', 28500, null, null],
  ['ANA-HEM-003', 'Sysmex XN-1000 Hematology Analyzer', 'Capital Equipment', 'Equipment', 'Automated hematology analyzer with fluorescence flow cytometry for complete blood count analysis.', 95000, null, null],
  ['EXT-QIA-004', 'QIAamp DNA Mini Kit (250 rxns)', 'Reagents', 'Kit', 'Silica-membrane-based nucleic acid purification for genomic DNA from blood, tissues, and cells.', 485, null, 'Room Temperature'],
  ['LIB-ILL-005', 'Nextera DNA Flex Library Prep Kit', 'Reagents', 'Kit', 'Streamlined library preparation for whole-genome sequencing with flexible input amounts.', 2150, null, '-20°C'],
  ['MAS-ABI-006', 'TaqMan Fast Advanced Master Mix (5 mL)', 'Reagents', 'Kit', 'Optimized PCR master mix for fast real-time PCR with TaqMan assays.', 320, null, '-20°C'],
  ['EXT-INV-007', 'TRIzol Reagent (200 mL)', 'Reagents', 'Kit', 'Monophasic solution for RNA, DNA, and protein isolation from biological samples.', 275, null, '2-8°C'],
  ['SEQ-ONT-008', 'MinION Flow Cell R10.4.1', 'Consumables', 'Kit', 'Nanopore flow cell for long-read sequencing on the MinION device.', 900, null, '2-8°C'],
  ['CYT-BIO-009', 'BD FACSLyric Flow Cytometer', 'Capital Equipment', 'Equipment', 'Clinical flow cytometry system with up to 12-color analysis for immunophenotyping.', 185000, null, null],
  ['ELI-ABS-010', 'Human IL-6 ELISA Kit (96 tests)', 'Reagents', 'Kit', 'Quantitative sandwich ELISA for human interleukin-6 determination in serum and plasma.', 620, null, '2-8°C'],
  ['MIC-NAN-011', 'NanoDrop One Spectrophotometer', 'Capital Equipment', 'Equipment', 'Micro-volume UV-Vis spectrophotometer for nucleic acid and protein quantification.', 9800, null, null],
  ['SAM-CRY-012', 'CoolCell LX Cell Freezing Container', 'Consumables', 'Kit', 'Alcohol-free controlled-rate cell freezing container for consistent -1°C/min cooling.', 350, null, 'Room Temperature'],
  ['CUL-GIB-013', 'DMEM High Glucose Media (500 mL)', 'Consumables', 'Kit', 'Cell culture medium with 4.5 g/L glucose, L-glutamine, and sodium pyruvate.', 25, null, '2-8°C'],
  ['PCR-TAK-014', 'PrimeSTAR Max DNA Polymerase (200 rxns)', 'Reagents', 'Kit', 'Ultra-high-fidelity polymerase for accurate PCR amplification of long fragments.', 410, null, '-20°C'],
  ['IMG-KEY-015', 'Keyence BZ-X810 Fluorescence Microscope', 'Capital Equipment', 'Equipment', 'All-in-one fluorescence microscope with motorized stage and advanced image analysis.', 125000, null, null],
]

const insertMany = db.transaction((items) => {
  for (const item of items) {
    insertProduct.run(...item)
  }
})
insertMany(products)
console.log(`✅ Inserted ${products.length} products`)

// --- Inventory ---
const insertInventory = db.prepare(`
  INSERT INTO inventory (product_id, quantity, location, reorder_level, lot_number, serial_number, expiry_date)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const inventoryItems = [
  [1,  2,  'Warehouse A - Bay 1',  1,  null,           'SN-NS2K-2024-0871', null],
  [2,  3,  'Warehouse A - Bay 2',  1,  null,           'SN-CFX96-2024-1102', null],
  [3,  1,  'Warehouse A - Bay 3',  1,  null,           'SN-XN1K-2024-0456', null],
  [4,  45, 'Cold Storage B - Shelf 2', 10, 'LOT-QIA-20250112',  null, '2027-01-15'],
  [5,  12, 'Freezer C - Rack 1',   5,  'LOT-NFX-20250305',  null, '2026-09-30'],
  [6,  80, 'Freezer C - Rack 2',   20, 'LOT-TAQ-20250201',  null, '2026-12-31'],
  [7,  30, 'Cold Storage B - Shelf 1', 10, 'LOT-TRI-20250101', null, '2026-06-15'],
  [8,  8,  'Cold Storage B - Shelf 3', 3,  'LOT-FC-20250220',  null, '2026-05-01'],
  [9,  1,  'Warehouse A - Bay 4',  1,  null,           'SN-FACS-2024-0223', null],
  [10, 25, 'Cold Storage B - Shelf 4', 8,  'LOT-IL6-20250115', null, '2026-07-20'],
  [11, 5,  'Warehouse A - Bay 5',  2,  null,           'SN-NDOP-2024-0912', null],
  [12, 18, 'Room Temp Storage D',  5,  'LOT-CC-20250301',   null, null],
  [13, 200,'Cold Storage B - Shelf 5', 50, 'LOT-DMM-20250310', null, '2026-04-10'],
  [14, 3,  'Freezer C - Rack 3',   8,  'LOT-PSM-20241215',  null, '2026-08-15'],
  [15, 1,  'Warehouse A - Bay 6',  1,  null,           'SN-BZX8-2024-0501', null],
]

const insertInvMany = db.transaction((items) => {
  for (const item of items) {
    insertInventory.run(...item)
  }
})
insertInvMany(inventoryItems)
console.log(`✅ Inserted ${inventoryItems.length} inventory entries`)

// --- Clients ---
const insertClient = db.prepare(`
  INSERT INTO clients (name, type, contact_person, email, phone, address)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const clients = [
  ['King Fahad Medical City', 'Hospital', 'Dr. Ahmad Al-Rashid', 'a.alrashid@kfmc.med.sa', '+966-11-288-9999', 'Riyadh, Saudi Arabia'],
  ['National Genomics Institute', 'Research Center', 'Prof. Sarah Mahmoud', 's.mahmoud@ngi.edu.eg', '+20-2-2792-1234', 'Cairo, Egypt'],
  ['BioLab Diagnostics LLC', 'Private Laboratory', 'Eng. Omar Hassan', 'o.hassan@biolab-dx.com', '+971-4-338-8000', 'Dubai, UAE'],
  ['University of Jordan Medical Labs', 'Academic', 'Dr. Rania Khalil', 'r.khalil@ju.edu.jo', '+962-6-535-5000', 'Amman, Jordan'],
  ['Beirut Central Hospital', 'Hospital', 'Dr. Karim Aoun', 'k.aoun@bch.med.lb', '+961-1-615-000', 'Beirut, Lebanon'],
]

const insertCliMany = db.transaction((items) => {
  for (const item of items) {
    insertClient.run(...item)
  }
})
insertCliMany(clients)
console.log(`✅ Inserted ${clients.length} clients`)

// --- Quotations ---
const insertQuote = db.prepare(`
  INSERT INTO quotations (quote_number, client_id, validity_days, status, subtotal, discount_percent, total, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const insertLineItem = db.prepare(`
  INSERT INTO quote_line_items (quote_id, product_id, quantity, quoted_price, discount_percent, line_total)
  VALUES (?, ?, ?, ?, ?, ?)
`)

// Quote 1: NGS system + library prep for the genome institute
insertQuote.run('Q-2026-001', 2, 60, 'Sent', 356300, 5, 338485, 'Includes installation, training, and 1-year service contract.')
insertLineItem.run(1, 1, 1, 350000, 0, 350000)
insertLineItem.run(1, 5, 2, 2150, 0, 4300)
insertLineItem.run(1, 4, 4, 500, 0, 2000)

// Quote 2: PCR setup for hospital
insertQuote.run('Q-2026-002', 1, 30, 'Accepted', 30090, 0, 30090, 'Delivery within 4-6 weeks from PO date.')
insertLineItem.run(2, 2, 1, 28500, 0, 28500)
insertLineItem.run(2, 6, 5, 318, 0.6, 1590)

// Quote 3: Flow cytometer for private lab
insertQuote.run('Q-2026-003', 3, 45, 'Draft', 187360, 3, 181739.2, null)
insertLineItem.run(3, 9, 1, 185000, 0, 185000)
insertLineItem.run(3, 10, 3, 620, 0, 1860)
insertLineItem.run(3, 13, 20, 25, 0, 500)

console.log(`✅ Inserted 3 quotations with line items`)
console.log('\n🎉 Database seeded successfully!')

db.close()
