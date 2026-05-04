/** Inline menu callbacks — ≤64 bytes each (Telegram limit). Prefix `m:` = main menu. */
export const TG_CB_MENU_VITRINY = 'm:v';
export const TG_CB_MENU_TAGS = 'm:t';
export const TG_CB_MENU_SCHEDULE = 'm:s';
export const TG_CB_MENU_RUN = 'm:r';
export const TG_CB_MENU_REPORT = 'm:o';
export const TG_CB_MENU_SUB = 'm:p';

export const TG_MAIN_MENU_CALLBACKS = new Set([
  TG_CB_MENU_VITRINY,
  TG_CB_MENU_TAGS,
  TG_CB_MENU_SCHEDULE,
  TG_CB_MENU_RUN,
  TG_CB_MENU_REPORT,
  TG_CB_MENU_SUB,
]);
