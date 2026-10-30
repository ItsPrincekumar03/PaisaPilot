import { MAX_CATCH_UP_PER_RUN, SCHEDULE_STATUS } from './recurringConstants.js';
import { getDueOccurrences, getOccurrenceDate } from './recurringDates.js';

/**
 * Deterministic occurrence ID. The same schedule and date always give the same ID,
 * so processing the same occurrence twice can be detected and skipped.
 */
export function getOccurrenceId(scheduleId, date) {
  return `${scheduleId}_${date}`;
}

/**
 * Plans the transactions a schedule should create today. Pure: writes nothing.
 *
 * schedule fields used: id, status, type, amountPaise, categoryId, description,
 *   frequency, startDate, endDate (or null), nextIndex.
 *
 * Returns:
 *   items:     [{ occurrenceId, index, date, transaction }] in date order
 *   nextIndex: index to store after the run succeeds
 *   nextDate:  next occurrence date, or null when the schedule has ended
 */
export function planScheduleRun(schedule, todayIso, limit = MAX_CATCH_UP_PER_RUN) {
  if (schedule.status !== SCHEDULE_STATUS.ACTIVE) {
    return { items: [], nextIndex: schedule.nextIndex, nextDate: null, skipped: true };
  }

  const endDate = schedule.endDate ?? null;
  const due = getDueOccurrences({
    startDate: schedule.startDate,
    endDate,
    frequency: schedule.frequency,
    fromIndex: schedule.nextIndex,
    todayIso,
    limit,
  });

  const items = due.map(({ index, date }) => ({
    occurrenceId: getOccurrenceId(schedule.id, date),
    index,
    date,
    transaction: {
      type: schedule.type,
      amountPaise: schedule.amountPaise,
      categoryId: schedule.categoryId,
      date,
      description: schedule.description,
    },
  }));

  const nextIndex = schedule.nextIndex + due.length;
  const candidate = getOccurrenceDate(schedule.startDate, schedule.frequency, nextIndex);
  const nextDate = endDate && candidate > endDate ? null : candidate;

  return { items, nextIndex, nextDate, skipped: false };
}
