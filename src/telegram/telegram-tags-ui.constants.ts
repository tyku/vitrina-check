/** Offer tags (метки) callbacks — prefix `t:` (≤64 bytes). */
export const TG_CB_TAGS_MENU = 't:m';
export const TG_CB_TAGS_BACK_MAIN = 't:b';
export const TG_CB_TAGS_BACK_VITRINAS = 't:bv';

export const TG_CB_TAGS_PICK_PREFIX = 't:v:';
export const TG_CB_TAGS_ADD_PREFIX = 't:a:';
export const TG_CB_TAGS_LIST_PREFIX = 't:l:';

export const TG_CB_TAGS_DELETE_PREFIX = 't:d:';
export const TG_CB_TAGS_DELETE_YES_PREFIX = 't:y:';
export const TG_CB_TAGS_DELETE_NO_PREFIX = 't:n:';

export const TG_TAGS_CALLBACK_PREFIX = 't:';

export function isTagsCallback(data: string): boolean {
  return data.startsWith(TG_TAGS_CALLBACK_PREFIX);
}

export function tagsPickChecklistCallback(checklistId: string): string {
  return `${TG_CB_TAGS_PICK_PREFIX}${checklistId}`;
}

export function tagsAddCallback(checklistId: string): string {
  return `${TG_CB_TAGS_ADD_PREFIX}${checklistId}`;
}

export function tagsListCallback(checklistId: string): string {
  return `${TG_CB_TAGS_LIST_PREFIX}${checklistId}`;
}

export function tagsDeleteIndexCallback(
  checklistId: string,
  index: number,
): string {
  return `${TG_CB_TAGS_DELETE_PREFIX}${checklistId}:${index}`;
}

export function tagsDeleteYesCallback(
  checklistId: string,
  index: number,
): string {
  return `${TG_CB_TAGS_DELETE_YES_PREFIX}${checklistId}:${index}`;
}

export function tagsDeleteNoCallback(
  checklistId: string,
  index: number,
): string {
  return `${TG_CB_TAGS_DELETE_NO_PREFIX}${checklistId}:${index}`;
}

export function parseTagsChecklistId(
  data: string,
  prefix: string,
): string | null {
  if (!data.startsWith(prefix)) {
    return null;
  }
  const checklistId = data.slice(prefix.length);
  if (!checklistId) {
    return null;
  }
  return checklistId;
}

export function parseTagsDeleteTarget(
  data: string,
  prefix: string,
): { checklistId: string; index: number } | null {
  if (!data.startsWith(prefix)) {
    return null;
  }
  const rest = data.slice(prefix.length);
  const separator = rest.lastIndexOf(':');
  if (separator <= 0) {
    return null;
  }
  const checklistId = rest.slice(0, separator);
  const index = Number.parseInt(rest.slice(separator + 1), 10);
  if (!checklistId || !Number.isInteger(index) || index < 0) {
    return null;
  }
  return { checklistId, index };
}
