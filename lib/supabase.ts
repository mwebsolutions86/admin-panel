import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Les variables d\'environnement Supabase sont manquantes.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Re-export createClient for modules that expect it from './supabase'
export { createClient } from '@supabase/supabase-js';
