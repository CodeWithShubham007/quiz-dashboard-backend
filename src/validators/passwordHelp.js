import { z } from 'zod';

export const passwordHelpRequestSchema = z.object({
  role: z.enum(['student', 'faculty']),
  accountId: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
}).strict();
