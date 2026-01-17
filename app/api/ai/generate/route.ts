import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt');

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt requis' }, { status: 400 });
  }

  try {
    // On appelle l'IA depuis le serveur (contourne le blocage 403 du navigateur)
    const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&model=flux&nologo=true`;
    
    const response = await fetch(aiUrl, {
      headers: {
        'User-Agent': 'UniversalEats/1.0' // Bonnes pratiques
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur API IA: ${response.status}`);
    }

    const blob = await response.blob();
    
    // On renvoie l'image directement au frontend
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error: any) {
    console.error('AI Proxy Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur génération' }, { status: 500 });
  }
}