import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Le nom d\'utilisateur est requis'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Le mot de passe actuel est requis'),
  new_password: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
  confirm_password: z.string().min(1, 'La confirmation est requise'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
});

export const missionSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(255, 'Le titre est trop long'),
  type: z.enum(['internal_audit', 'external_audit', 'regulatory', 'inspection'], {
    required_error: 'Le type est requis',
  }),
  source_type_id: z.number({ required_error: 'La source est requise' }).positive(),
  entity_id: z.number({ required_error: 'L\'entité est requise' }).positive(),
  start_date: z.string().min(1, 'La date de début est requise'),
  end_date: z.string().optional(),
  report_date: z.string().optional(),
  description: z.string().optional(),
  scope: z.string().optional(),
  manager_id: z.number().optional(),
});

export const recommendationSchema = z.object({
  mission_id: z.number({ required_error: 'La mission est requise' }).positive(),
  source_type_id: z.number({ required_error: 'La source est requise' }).positive(),
  entity_id: z.number({ required_error: 'L\'entité est requise' }).positive(),
  reference_externe: z.string().optional(),
  constat: z.string().min(1, 'Le constat est requis'),
  recommendation_text: z.string().min(1, 'Le texte de recommandation est requis'),
  recommendation_detail: z.string().optional(),
  is_regulatory: z.boolean().default(false),
  confidentiality: z.enum(['public', 'internal', 'confidential', 'secret']),
  severity: z.number().min(1).max(5),
  probability: z.number().min(1).max(5),
  risk_type_id: z.number().optional(),
  impact_financial: z.boolean().default(false),
  impact_regulatory: z.boolean().default(false),
  impact_operational: z.boolean().default(false),
  impact_reputational: z.boolean().default(false),
  impact_strategic: z.boolean().default(false),
  responsible_user_id: z.number().optional(),
  responsible_entity_id: z.number().optional(),
  validator_user_id: z.number().optional(),
  initial_deadline: z.string().min(1, 'L\'échéance est requise'),
  tags: z.array(z.string()).optional(),
});

export const actionPlanSchema = z.object({
  recommendation_id: z.number({ required_error: 'La recommandation est requise' }).positive(),
  title: z.string().min(1, 'Le titre est requis').max(255, 'Le titre est trop long'),
  description: z.string().optional(),
  responsible_user_id: z.number().optional(),
  responsible_entity_id: z.number().optional(),
  start_date: z.string().optional(),
  deadline: z.string().min(1, 'L\'échéance est requise'),
  budget_allocated: z.number().optional(),
});

export const userSchema = z.object({
  username: z.string().min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'),
  email: z.string().email('Email invalide'),
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  role_id: z.number({ required_error: 'Le rôle est requis' }).positive(),
  entity_id: z.number().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const entitySchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(50),
  label: z.string().min(1, 'Le libellé est requis').max(255),
  type: z.string().min(1, 'Le type est requis'),
  parent_id: z.number().optional(),
  is_active: z.boolean().default(true),
});

export const sourceTypeSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(50),
  label: z.string().min(1, 'Le libellé est requis').max(255),
  category: z.string().min(1, 'La catégorie est requise'),
  is_regulatory: z.boolean().default(false),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1, 'Le commentaire ne peut pas être vide'),
  is_internal: z.boolean().default(false),
  parent_id: z.number().optional(),
});

export const deadlineExtensionSchema = z.object({
  new_deadline: z.string().min(1, 'La nouvelle date est requise'),
  reason: z.string().min(10, 'La justification doit contenir au moins 10 caractères'),
});
