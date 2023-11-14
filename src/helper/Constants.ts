export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const;

/**
 * This constant represents an example of settings of a tenant. A tenant is a company, that uses this software. To
 * simplify this software for now, it is implemented as a constant
 */
export const TENANT_SETTINGS = {
  estimatedAvailability: 90,
  tacticalUnderload: 75,
  incrementPenaltyConstant: 1,
  novicePenaltyConstant: 0.4,
  sharedDeveloperPenalty: 0.4,
  teamSizePenaltyConstant: 1,
  skillPenaltyConstant: 1,
  timePenalty: 1,
  randomness: 33,
  similarResultCount: 8,
  worseResultCount: 2000,
  innerLoopCount: 100,
  alpha: 0.95,
  initialTemperature: 100,
};
