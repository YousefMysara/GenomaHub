import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('quotations').select('*, contacts(first_name)').limit(1);
  if (error) {
    console.error('API Error:', error);
  } else {
    console.log('Success! Data fetched:', data);
  }
}
test();
