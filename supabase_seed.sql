-- Supabase Seed Data for GenomaHub
-- Run this in the Supabase SQL Editor AFTER running the schema script.

-- 1. Insert Brands (Vendors)
INSERT INTO public.brands (id, name, description) VALUES 
('11111111-1111-1111-1111-111111111111', 'Illumina', 'Next-generation sequencing technology provider.'),
('22222222-2222-2222-2222-222222222222', 'Thermo Fisher Scientific', 'Life sciences solutions and equipment.'),
('33333333-3333-3333-3333-333333333333', 'Eppendorf', 'Liquid handling and sample prep instruments.'),
('44444444-4444-4444-4444-444444444444', 'Qiagen', 'Sample and assay technologies.');

-- 2. Insert Products
-- Note: 'track_stock' is boolean. 'description' is optional (one item is null).
INSERT INTO public.products (id, item_code, name, brand_id, category, item_type, description, base_price, storage_conditions, track_stock) VALUES 
-- Core Equipment
('aaaa1111-1111-1111-1111-111111111111', 'SEQ-NOVA-6000', 'NovaSeq 6000 System', '11111111-1111-1111-1111-111111111111', 'Capital Equipment', 'Equipment', 'High-throughput sequencing system for production-scale labs.', 950000.00, 'Room Temperature', true),
('bbbb2222-2222-2222-2222-222222222222', 'CEN-5425R', 'Centrifuge 5425 R', '33333333-3333-3333-3333-333333333333', 'Capital Equipment', 'Equipment', 'Refrigerated microcentrifuge.', 4500.00, 'Room Temperature', true),
-- No Stock Tracking Equipment (e.g. Software License)
('cccc3333-3333-3333-3333-333333333333', 'SW-DRAGEN-01', 'DRAGEN Bio-IT Platform License', '11111111-1111-1111-1111-111111111111', 'Software', 'Software', 'Secondary analysis software license (1 Year).', 12000.00, NULL, false),
-- Accessories
('dddd4444-4444-4444-4444-444444444444', 'ACC-ROTOR-FA45', 'Rotor FA-45-24-11', '33333333-3333-3333-3333-333333333333', 'Consumables', 'Accessory', 'Aerosol-tight rotor for Centrifuge 5425.', 550.00, 'Room Temperature', true),
('eeee5555-5555-5555-5555-555555555555', 'ACC-NOVA-FLOW', 'NovaSeq S4 Flow Cell', '11111111-1111-1111-1111-111111111111', 'Consumables', 'Accessory', 'High output flow cell.', 3500.00, '2-8°C', true),
-- Kits (One without description to test optional feature)
('ffff6666-6666-6666-6666-666666666666', 'KIT-QIA-123', 'DNeasy Blood & Tissue Kit', '44444444-4444-4444-4444-444444444444', 'Reagents', 'Kit', 'Extraction of total DNA from animal blood and tissues (250 preps).', 620.00, 'Room Temperature', true),
('1111aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'KIT-TRUSEQ-NA', 'TruSeq Nano DNA Prep', '11111111-1111-1111-1111-111111111111', 'Reagents', 'Kit', NULL, 2100.00, '-20°C', true);

-- 3. Insert Product Relations (Linked Accessories)
INSERT INTO public.product_relations (parent_product_id, child_product_id, relation_type) VALUES
-- Rotor belongs to Centrifuge
('bbbb2222-2222-2222-2222-222222222222', 'dddd4444-4444-4444-4444-444444444444', 'Accessory'),
-- Flow cell belongs to NovaSeq
('aaaa1111-1111-1111-1111-111111111111', 'eeee5555-5555-5555-5555-555555555555', 'Consumable Part');

-- 4. Insert Inventory
INSERT INTO public.inventory (product_id, quantity, location, reorder_level, lot_number, serial_number, expiry_date) VALUES
-- Equipment Inventory (Serial Numbers)
('aaaa1111-1111-1111-1111-111111111111', 2, 'Main Warehouse', 1, NULL, 'SN-NVX-8902', NULL),
('bbbb2222-2222-2222-2222-222222222222', 0, 'Demo Lab', 2, NULL, 'SN-CEN-1109', NULL), -- Out of stock
-- Accessory Inventory
('dddd4444-4444-4444-4444-444444444444', 15, 'Shelf A2', 5, 'LOT-R123', NULL, NULL),
('eeee5555-5555-5555-5555-555555555555', 3, 'Cold Room 1', 10, 'LOT-F992', NULL, '2026-12-01'), -- Low stock
-- Kit Inventory (Lots and Expiries)
('ffff6666-6666-6666-6666-666666666666', 45, 'Shelf B1', 20, 'LOT-DN2291', NULL, '2027-05-15'), -- Good stock
('1111aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 12, 'Freezer -20', 15, 'LOT-TS991', NULL, '2026-04-10'), -- Expiring soon (Low Stock + Expiring alert)
('1111aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, 'Freezer -20', 15, 'LOT-TS880', NULL, '2025-01-01'); -- Expired kit

-- 5. Insert Clients
INSERT INTO public.clients (id, name, type, contact_person, email, phone, address) VALUES
('55555555-5555-5555-5555-555555555555', 'City General Hospital', 'Hospital', 'Dr. Sarah Connor', 'sconnor@citymed.org', '555-0100', '100 Medical Plaza, Cityville'),
('66666666-6666-6666-6666-666666666666', 'Advanced Genomics Lab', 'Laboratory', 'John Smith', 'jsmith@agl.com', '555-0200', 'Tech Park, Building C');

-- 6. Insert Quotations
INSERT INTO public.quotations (id, quote_number, client_id, status, subtotal, discount_percent, total, notes) VALUES
('77777777-7777-7777-7777-777777777777', 'Q-2026-001', '55555555-5555-5555-5555-555555555555', 'Accepted', 955050.00, 5, 907297.50, 'Discount applied for multi-year service plan context.'),
('88888888-8888-8888-8888-888888888888', 'Q-2026-002', '66666666-6666-6666-6666-666666666666', 'Draft', 4200.00, 0, 4200.00, 'Urgent request for Q1 project start.');

-- 7. Insert Quotation Line Items
INSERT INTO public.quote_line_items (quote_id, product_id, quantity, quoted_price, discount_percent, line_total) VALUES
-- First Quote: NovaSeq + Rotor + Kits
('77777777-7777-7777-7777-777777777777', 'aaaa1111-1111-1111-1111-111111111111', 1, 950000.00, 0, 950000.00), -- NovaSys
('77777777-7777-7777-7777-777777777777', 'dddd4444-4444-4444-4444-444444444444', 1, 550.00, 0, 550.00),     -- Rotor
('77777777-7777-7777-7777-777777777777', 'ffff6666-6666-6666-6666-666666666666', 5, 620.00, 10, 2790.00),    -- DNeasy kits (10% line discount)
('77777777-7777-7777-7777-777777777777', '1111aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 2100.00, 0, 2100.00),    -- TruSeq
-- Second Quote: Software License + Flow Cell
('88888888-8888-8888-8888-888888888888', 'cccc3333-3333-3333-3333-333333333333', 1, 12000.00, 0, 12000.00),  -- Dragen Software
('88888888-8888-8888-8888-888888888888', 'eeee5555-5555-5555-5555-555555555555', 2, 3500.00, 0, 7000.00);    -- Flow Cell
