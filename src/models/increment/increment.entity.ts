import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { Issue } from '../issue/issue.entity';
import { Project } from '../project/project.entity';
import { Group } from '../group/group.entity';
import { DetailsEntity } from '../../common/details/details.entity';
import { Phase } from '../phase/phase.entity';
import { DurationUnit } from 'luxon';

// An increment groups some issues for a group. It's similar to a sprint
@Entity()
@Index(['incrementNumber', 'projectId'], { unique: true })
export class Increment extends DetailsEntity<Increment> {
  // zero indexed number of increments per project
  @Column({
    default: 0,
  })
  incrementNumber: number;

  @Column()
  projectId: string;

  @ManyToOne(() => Project)
  project?: Project;

  // An increment contains a collection of issues
  @OneToMany(() => Issue, (issue: Issue) => issue.increment)
  issues?: Issue[];

  @OneToMany(() => Phase, (phase: Phase) => phase.increment)
  /**
   * An increment has multiple phases. Used for grouping module phases by phase name
   */
  phases?: Phase[];

  modules?: Group[];

  constructor(object: Partial<Increment>) {
    super();
    Object.assign(this, object);
  }

  getPhaseStart(phase: Phase) {
    if (phase.start) {
      return phase.start;
    }
    if (!(this.start && this.phases?.length)) {
      return null;
    }
    return this.start.plus(
      (this.end.diff(this.start).toMillis() / this.phases.length) *
        this.phases.findIndex((incPhase) => incPhase.id === phase.id),
    );
  }

  getPhaseEnd(phase: Phase) {
    if (phase.end) {
      return phase.end;
    }
    // if no end or no phases, return end of phase
    if (!(this.end && this.phases?.length)) {
      return null;
    }
    // otherwise, start, end and phases are set, so get phase.end or equal timespan of all phases in the increment
    return this.start.plus(
      (this.end.diff(this.start).toMillis() / this.phases.length) *
        (this.phases.findIndex((incPhase) => incPhase.id === phase.id) + 1),
    );
  }

  incrementDuration(unit: DurationUnit) {
    return this.start && this.end ? this.end.diff(this.start).as(unit) : 0;
  }
}
