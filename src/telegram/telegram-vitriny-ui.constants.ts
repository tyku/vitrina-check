/** Vitriny submenu callbacks — prefix `v:` (≤64 bytes). */
export const TG_CB_VITRINY_MENU = 'v:m';
export const TG_CB_VITRINY_ADD = 'v:a';
export const TG_CB_VITRINY_LIST = 'v:l';
export const TG_CB_VITRINY_BACK_MAIN = 'v:b';

export const TG_CB_VITRINY_DELETE_PREFIX = 'v:d:';
export const TG_CB_VITRINY_DELETE_YES_PREFIX = 'v:y:';
export const TG_CB_VITRINY_DELETE_NO_PREFIX = 'v:n:';

export const TG_VITRINY_CALLBACK_PREFIX = 'v:';

export function isVitrinyCallback(data: string): boolean {
  return data.startsWith(TG_VITRINY_CALLBACK_PREFIX);
}

export function vitrinyDeleteCallback(id: string): string {
  return `${TG_CB_VITRINY_DELETE_PREFIX}${id}`;
}

export function vitrinyDeleteYesCallback(id: string): string {
  return `${TG_CB_VITRINY_DELETE_YES_PREFIX}${id}`;
}

export function vitrinyDeleteNoCallback(id: string): string {
  return `${TG_CB_VITRINY_DELETE_NO_PREFIX}${id}`;
}
