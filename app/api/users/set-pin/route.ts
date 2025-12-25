import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Récupérer le token depuis le Header 'Authorization'
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // 2. Initialiser un client Supabase temporaire pour vérifier ce token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Erreur Auth:", authError);
      return NextResponse.json({ error: 'Session invalide ou expirée' }, { status: 401 });
    }

    // 3. Parsing de la requête
    const body = await request.json();
    const { userId, pin } = body;

    // Validation du format PIN
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(pin)) {
      return NextResponse.json({ error: 'Le PIN doit contenir 4 à 6 chiffres.' }, { status: 400 });
    }

    // 4. Utilisation du SUPER ADMIN (Service Role) pour écrire le PIN
    // On contourne les RLS car on a déjà validé que l'utilisateur est connecté juste au-dessus
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ pos_pin: pin })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Erreur set-pin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}