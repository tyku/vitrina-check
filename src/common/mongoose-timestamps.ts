import type { SchemaOptions } from 'mongoose';

const DEFAULT_TIMEZONE_OFFSET_MINUTES = 180;

function getTimezoneOffsetMinutes(): number {
  const rawValue = process.env.APP_TIMEZONE_OFFSET_MINUTES;
  const parsed = Number.parseInt(rawValue ?? '', 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_TIMEZONE_OFFSET_MINUTES;
  }

  return parsed;
}

export function createTimestampOptions(): SchemaOptions['timestamps'] {
  return {
    currentTime: () => {
      const offsetMinutes = getTimezoneOffsetMinutes();
      return new Date(Date.now() + offsetMinutes * 60 * 1000);
    },
  };
}
