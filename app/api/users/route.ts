import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Force le mode dynamique pour que les cookies soient toujours lus correctement
export const dynamic = 'force-dynamic';

// Client Admin (Service Role) pour contourner les RLS et gérer Auth
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

// --- POST: CRÉATION ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, role, storeId, phone } = body;

    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Erreur création user");

    // 2. Créer le profil associé
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: role,
          store_id: storeId || null,
          phone: phone || null,
          status: role === 'DRIVER' ? 'OFFLINE' : null,
          wallet_balance: role === 'DRIVER' ? 0 : null
        }
      ]);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, user: authData.user });

  } catch (error: any) {
    console.error('Erreur API (Create):', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// --- PUT: MODIFICATION ---
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, email, password, fullName, role, storeId, phone } = body;

    if (!id) throw new Error("ID utilisateur manquant");

    // 1. Mise à jour Auth (Email / Password si fournis)
    const authUpdates: any = { user_metadata: { full_name: fullName } };
    if (email) authUpdates.email = email;
    if (password && password.length > 0) authUpdates.password = password;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      authUpdates
    );

    if (authError) throw authError;

    // 2. Mise à jour Profil (Table profiles)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        role: role,
        store_id: storeId || null,
        phone: phone || null,
        email: email // On garde l'email synchro
      })
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erreur API (Update):', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}