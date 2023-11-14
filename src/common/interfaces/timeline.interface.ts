import { BaseService } from '../base.service';
import { KeyOf, ObjectWithId } from '../../helper/Typings';
import { BaseEntity } from '../base.entity';
import { DateTime, DurationUnit as LuxonDurationUnit } from 'luxon';

export type Path = { path: string[]; duration: number };
/**
 * Possible durations units for a task
 */
export enum DurationUnit {
  // in months. Equals 4 weeks
  MONTHS = 'months',
  // in weeks. Equals 7d of 24h
  WEEKS = 'weeks',
  // In days. Equals 24h
  DAYS = 'days',
  // in hours
  HOURS = 'hours',
  // person weeks. Equals 5d of 8h
  PW = 'pw',
  // person days. Equals 8h
  PT = 'pt',
}

export interface TimelineInterface<Module extends ObjectWithId<Module>> {
  id: string;
  startDateSoft: DateTime | null;
  startDateHard: DateTime | null;
  endDateSoft: DateTime | null;
  endDateHard: DateTime | null;
  duration: number | null;
  unit: DurationUnit | null;

  // subclasses could overwrite these, but they don't have to
  following?: TimelineInterface<Module>[];
  previous?: TimelineInterface<Module>[];
}

export function convertDuration(
  duration: number,
  fromUnit: DurationUnit,
  toUnit: DurationUnit,
): number {
  // convert duration to hours first
  let tempDuration = normalizeDuration(duration, fromUnit);
  // then convert it to another unit, by reverting the process
  switch (toUnit) {
    case DurationUnit.MONTHS:
      tempDuration /= 4;
    case DurationUnit.WEEKS:
      tempDuration /= 7;
    case DurationUnit.DAYS:
      tempDuration /= 24;
    case DurationUnit.HOURS:
      return tempDuration;
    case DurationUnit.PW:
      tempDuration /= 5;
    case DurationUnit.PT:
      return tempDuration / 8;
    default:
      return 0;
  }
}

/**
 * This normalizes the duration by from calculating the remaining hours from the duration with that unit
 * @param duration
 * @param unit
 */
export function normalizeDuration(
  duration: number,
  unit: DurationUnit,
): number {
  // since the duration can be undefined, null or a number greater than 0, check if duration is defined
  if (!duration) {
    // return 0 to don't break any calculations
    return 0;
  }
  let retVal = duration;
  switch (unit) {
    case DurationUnit.MONTHS:
      // convert months to weeks
      retVal *= 4;
    case DurationUnit.WEEKS:
      // convert weeks to days
      retVal *= 7;
    case DurationUnit.DAYS:
      // convert days to hours
      retVal *= 24;
    case DurationUnit.HOURS:
      // return hours
      return retVal;
    case DurationUnit.PW:
      // convert to days in person week
      retVal *= 5;
    case DurationUnit.PT:
      // convert person days to hours
      return retVal * 8;
    default:
      // if unit is undefined (e.g. it is not selected in query, return 0)
      return 0;
  }
}

export function initTimeline<Entity extends TimelineInterface<Entity>>(
  elements: Entity[],
): Entity[] {
  const retVal: Entity[] = [];
  for (const element of elements) {
    if ((element.previous ?? []).length === 0) {
      retVal.push(element);
      delete element.previous;
      continue;
    }
    const mappedPrevious = element.previous.map((el) => el.id);
    // get previous elements from the elements array
    const prevEl = elements.filter((el) => mappedPrevious.includes(el.id));
    if (prevEl.length > 0) {
      prevEl.forEach((el) =>
        (el.following || (el.following = [])).push(element),
      );
    } else {
      retVal.push(element);
    }
    delete element.previous;
  }
  return retVal;
}

export async function saveTimelineRelation<
  Entity extends BaseEntity<Entity> & TimelineInterface<Entity>,
  EntityDto,
>(
  service: BaseService<Entity, EntityDto>,
  id: string,
  dto: EntityDto,
  deleteProp: boolean = true,
) {
  const timelineKeys: KeyOf<
    TimelineInterface<Entity>,
    TimelineInterface<Entity>[]
  >[] = ['previous', 'following'];
  await Promise.all(
    timelineKeys.map((key) => {
      if (dto[key]) {
        const promise = service.replaceCollection(id, key as any, dto[key]);
        if (deleteProp) {
          delete dto[key];
        }
        return promise;
      }
      return dto;
    }),
  );
}

/**
 * Uses "following" attribute to extract all possible paths
 * @param entity
 */
export function extractPaths<Entity extends TimelineInterface<Entity>>(
  entity: TimelineInterface<Entity>,
): Path[] {
  return (entity.following ?? []).length === 0
    ? [{ path: [entity.id], duration: entity.duration ?? 0 }]
    : entity.following
        .map((after) => extractPaths(after))
        .flat()
        .map((pathElement) => {
          pathElement.path.unshift(entity.id);
          pathElement.duration += entity.duration ?? 0;
          return pathElement;
        });
}

/**
 * Calculates the duration of the overlap of the two timeRanges. If result <= 0, no overlap
 * @param from Start of first timeRange
 * @param to End of first timeRange
 * @param actualStart Start of the compared timeRange
 * @param actualEnd End of the compared timeRange
 * @param unit Unit of the resulting duration
 */
export function calculateOverlapDuration(
  from: DateTime,
  to: DateTime,
  actualStart: DateTime,
  actualEnd: DateTime,
  unit: LuxonDurationUnit | '5dayWeeksday' = '5dayWeeksday',
): number {
  // Begin calculation from the latest startDate
  const start = !(from && actualStart)
    ? // because dates are nullable, use now as default
      from || actualStart || DateTime.now()
    : DateTime.max(from, actualStart);
  // to the earliest endDate
  const end = !(to && actualEnd)
    ? to || actualEnd || DateTime.now()
    : DateTime.min(to, actualEnd);
  if (unit === '5dayWeeksday') {
    return calculateWorkDayCount(start, end);
  }
  // If overlap is less than 0, there is no overlap
  return Math.max(end.diff(start).as(unit), 0);
}

/**
 * Calculates the workdays (Mo - Fr) in the timeRange, including start and end day
 * @param start
 * @param end
 */
export function calculateWorkDayCount(start: DateTime, end: DateTime): number {
  // Get difference in weeks
  const weeks = DateTime.fromMillis(end.toMillis())
    // add a day, because Mo - Sun is < 1 week
    .plus({ day: 1 })
    .diff(start, 'weeks').weeks;
  const fullWeeksCount = Math.floor(weeks);
  if (fullWeeksCount > 0) {
    // if weekday of startDay is 1 (monday) it is a complete week, so nothing to add.
    const daysBefore = start.weekday === 1 ? 0 : Math.max(0, 6 - start.weekday);
    // if weekday of endDay is 7 (Sunday) it is a complete week, so nothing to add.
    const daysAfter = end.weekday === 7 ? 0 : Math.min(5, end.weekday);
    // 5 days a week + maybe some days in the week before or the one after
    return fullWeeksCount * 5 + daysBefore + daysAfter;
  }
  // if no full weeks, calculate difference between the days
  return Math.min(end.weekday + 1, 6) - start.weekday;
}
