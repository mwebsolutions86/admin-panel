
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, role, storeId } = body;

    // 1. Initialiser Supabase en mode ADMIN (Côté serveur uniquement)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 2. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // On valide automatiquement l'email
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Erreur création user");

    // 3. Créer le profil associé dans la table 'profiles'
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: role,     // 'STORE_MANAGER' ou 'SUPER_ADMIN'
          store_id: storeId || null // Null si super admin
        }
      ]);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, user: authData.user });

  } catch (error: any) {
    console.error('Erreur API:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}