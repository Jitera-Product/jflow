import { z } from 'zod';

const words = (s: string) => s.split(/\s+/).filter(Boolean);

export const settingsFormSchema = z.object({
  docsUrl: z.string().trim(),
  docsToken: z.string().trim(),
  linearApiKey: z.string().trim(),
  teams: z.array(z.string()),
  tdrFolder: z.string().trim(),
  publicUrl: z.string().trim(),
  engineers: z.string().transform((s) => words(s.toLowerCase())),
});

export type SettingsFormInput = z.input<typeof settingsFormSchema>;
