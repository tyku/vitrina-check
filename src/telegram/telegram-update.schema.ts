import { z } from 'zod';

/** Chat id may be number or string in JSON (large ids). */
const ChatIdSchema = z.union([z.number(), z.string(), z.bigint()]);

const TelegramUserSchema = z.object({
  id: z.number(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

const ChatSchema = z.object({
  id: ChatIdSchema,
});

const MessageSchema = z.object({
  message_id: z.number(),
  chat: ChatSchema,
  from: TelegramUserSchema.optional(),
  text: z.string().optional(),
});

const CallbackQuerySchema = z.object({
  id: z.string(),
  from: TelegramUserSchema,
  message: z
    .object({
      message_id: z.number(),
      chat: ChatSchema,
    })
    .optional(),
  data: z.string().optional(),
});

/** Minimal subset of Telegram Update for E7 bot UI. */
export const TelegramUpdateSchema = z
  .object({
    update_id: z.number(),
    message: MessageSchema.optional(),
    callback_query: CallbackQuerySchema.optional(),
  })
  .passthrough();

export type ParsedTelegramUpdate = z.infer<typeof TelegramUpdateSchema>;
