/**
 * BullMQ: все исходящие вызовы Bot API — через эту очередь (E3.1+).
 * Имя совпадает с `TG_TASKS.md`.
 */
export const TELEGRAM_OUTBOUND_QUEUE = 'telegram-outbound';

/** Один job на вызов API до дробления по методам (E3.2+). */
export const TELEGRAM_OUTBOUND_JOB_API_CALL = 'telegram-outbound-api-call';
