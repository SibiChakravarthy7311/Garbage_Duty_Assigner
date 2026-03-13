function getFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export interface ZonedDateTimeParts {
  date: string;
  hour: number;
  minute: number;
}

export function getZonedDateTimeParts(timeZone: string, input = new Date()): ZonedDateTimeParts {
  const parts = getFormatter(timeZone).formatToParts(input);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));

  const year = lookup.get("year");
  const month = lookup.get("month");
  const day = lookup.get("day");
  const hour = lookup.get("hour");
  const minute = lookup.get("minute");

  if (!year || !month || !day || !hour || !minute) {
    throw new Error(`Unable to format date parts for timezone ${timeZone}.`);
  }

  return {
    date: `${year}-${month}-${day}`,
    hour: Number(hour),
    minute: Number(minute)
  };
}
