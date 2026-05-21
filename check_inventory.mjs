import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- 1. Querying settings row write test ---');
  try {
    const { data, error } = await supabase.from('settings').upsert([
      { key: 'USD_to_EGP', value: '47.50' }
    ]);
    if (error) {
      console.error('Settings write failed:', error.message, error.details || '');
    } else {
      console.log('Settings write succeeded!', data);
    }
  } catch (err) {
    console.error('Settings write error:', err);
  }

  console.log('\n--- 2. Querying all product types count ---');
  const { data: prods, error: pErr } = await supabase.from('products').select('id, name, item_type, track_stock');
  if (pErr) {
    console.error('Failed to fetch products:', pErr.message);
  } else {
    console.log(`Found ${prods.length} products:`);
    prods.forEach(p => {
      console.log(`- Product: "${p.name}", Type: "${p.item_type}", Track Stock: ${p.track_stock}`);
    });
    const counts = {};
    prods.forEach(p => {
      counts[p.item_type] = (counts[p.item_type] || 0) + 1;
    });
    console.log('Product counts by item_type:', counts);
  }

  console.log('\n--- 3. Querying active inventory batches ---');
  const { data: inv, error: iErr } = await supabase.from('inventory').select('id, product_id, quantity, status, lot_number, serial_number');
  if (iErr) {
    console.error('Failed to fetch inventory:', iErr.message);
  } else {
    console.log(`Found ${inv.length} total inventory rows.`);
    console.log('Available inventory rows:', inv.filter(i => i.status === 'Available').length);
    
    if (prods) {
      // Find what item_types have active inventory
      const enriched = inv.filter(i => i.status === 'Available').map(i => {
        const p = prods.find(pr => pr.id === i.product_id);
        return {
          id: i.id,
          product_name: p ? p.name : 'Unknown',
          item_type: p ? p.item_type : 'Unknown',
          quantity: i.quantity,
          serial_number: i.serial_number,
          lot_number: i.lot_number
        };
      });
      console.log('Sample available items in inventory:', enriched.slice(0, 10));
    }
  }
}

check();
