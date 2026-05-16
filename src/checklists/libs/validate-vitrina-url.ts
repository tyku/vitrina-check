import { z } from 'zod';

const MAX_VITRINA_URL_LENGTH = 2048;

const blockedHostnames = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
]);

const VitrinaUrlSchema = z
  .string()
  .trim()
  .url()
  .max(MAX_VITRINA_URL_LENGTH);

export type TValidateVitrinaUrlResult =
  | { ok: true; href: string }
  | { ok: false; error: string };

export function validateVitrinaUrl(input: string): TValidateVitrinaUrlResult {
  const parsed = VitrinaUrlSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Укажите корректный URL (http или https).' };
  }

  let url: URL;
  try {
    url = new URL(parsed.data);
  } catch {
    return { ok: false, error: 'Не удалось разобрать URL.' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'Допустимы только ссылки http:// или https://.' };
  }

  const hostname = url.hostname.toLowerCase();
  if (blockedHostnames.has(hostname)) {
    return { ok: false, error: 'Этот адрес добавить нельзя.' };
  }

  return { ok: true, href: url.href };
}
