import { createClient } from '@supabase/supabase-js'

// Utilisation de process.env ou variables en dur pour le MVP
// Remplace par tes vraies clés si elles ne sont pas dans un fichier .env
const supabaseUrl = 'https://kdoodpxjgczqajykcqcd.supabase.co' 
const supabaseKey = 'sb_publishable_ddklRnFtTbJ6C9hVK3sU2w_Ocj8QHSs'

export const supabase = createClient(supabaseUrl, supabaseKey)