import { NextResponse } from 'next/server';

/**
 * SÉCURITÉ : l'auto-inscription Super Admin via un "code" a été
 * définitivement supprimée (faille critique — n'importe quel code
 * de 6+ caractères était accepté). La création d'un compte Admin
 * ou Super Admin passe désormais EXCLUSIVEMENT par le système
 * d'invitation (token cryptographique à usage unique, généré par
 * un Super Admin existant et envoyé par e-mail).
 *
 * Voir : /api/admin/invitations (génération) et
 *        /api/admin/invitations/accept (activation).
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "L'auto-inscription administrateur est désactivée. Un compte Admin ou Super Admin ne peut être créé que par invitation depuis un compte Super Admin existant.",
    },
    { status: 403 }
  );
}
