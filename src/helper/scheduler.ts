/**
 * Maybe not needed. Approach to parallelize the team generation
 */
export class Scheduler {
  private maxWorkers: number;
  private currentWorker: any[];
  private workerQueue: any[];
  private restrictResourceAccess: boolean;
  constructor(maxWorkers: number, restrictResourceAccess: boolean = true) {
    this.maxWorkers = maxWorkers;
    this.restrictResourceAccess = restrictResourceAccess;
  }
}
