/**
 * Safe fields for logs — no message text, captions, contacts, or raw payload.
 */
export function summarizeTelegramUpdateForLog(body: unknown): {
  update_id?: unknown;
  update_types?: string[];
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }
  const o = body as Record<string, unknown>;
  const known = [
    'message',
    'edited_message',
    'callback_query',
    'inline_query',
    'channel_post',
    'edited_channel_post',
    'poll',
    'my_chat_member',
    'chat_member',
    'shipping_query',
    'pre_checkout_query',
  ] as const;
  const update_types = known.filter((k) => k in o);
  return {
    update_id: o.update_id,
    ...(update_types.length > 0 ? { update_types } : {}),
  };
}
