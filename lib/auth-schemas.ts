import { z } from 'zod';

/**
 * Validation Zod des payloads d'authentification.
 *
 * Rôle de cette couche : valider la STRUCTURE et les TYPES du corps de
 * requête (présence, longueur, format basique) avant que la logique
 * métier existante (lib/security-validator.ts) n'applique ses propres
 * règles plus fines (politique de mot de passe, normalisation email,
 * anti-injection). Les deux couches sont complémentaires : Zod rejette
 * vite les payloads mal formés, security-validator reste la source de
 * vérité pour les règles métier. La validation finale déterminante
 * reste, dans tous les cas, faite côté serveur.
 */

export const loginSchema = z.object({
  email: z.string().trim().min(3).max(254).email('Format d’adresse email invalide.'),
  password: z.string().min(1, 'Le mot de passe est requis.').max(200),
});

export const registerSchema = z.object({
  email: z.string().trim().min(3).max(254).email('Format d’adresse email invalide.'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.').max(200),
  civility: z.string().max(10).optional(),
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.').max(60),
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.').max(60),
  studentId: z.string().trim().max(50).optional(),
  matricule: z.string().trim().max(50).optional(),
  field: z.string().trim().max(80).optional(),
  level: z.string().trim().max(40).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(3).max(254).email('Format d’adresse email invalide.'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.').max(200),
});

/**
 * Petit utilitaire : valide `body` avec le schéma donné et renvoie soit
 * les données validées, soit un message d'erreur prêt à renvoyer au
 * client (jamais les détails internes de Zod, pour ne pas exposer la
 * structure exacte attendue à un attaquant).
 */
export function safeParseAuthBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  const firstIssue = result.error.issues[0];
  return {
    success: false,
    error: firstIssue?.message || 'Requête invalide.',
  };
}
