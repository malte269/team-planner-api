import { Column, Entity, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { Project } from '../project/project.entity';
import { Group } from '../group/group.entity';
import { DateTime } from 'luxon';
import { DateTimeStringTransformer } from '../../helper/helper-functions';
import { Phase } from '../phase/phase.entity';
import { Increment } from '../increment/increment.entity';
import { BaseEntityWithTenant } from '../../common/with-tenant/base.entity.with-tenant';
import { calculateOverlapDuration } from '../../common/interfaces/timeline.interface';
import { WorkTime } from '../work-time/workTime.entity';

export enum SlotFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

// Doesn't need tenant, because it is related to user only
@Entity()
export class Slot extends BaseEntityWithTenant<Slot> {
  @Column({
    type: 'float',
    comment:
      'The percentage of allocation of a user to a project/group in the time-range',
  })
  allocation: number;

  @Column({
    transformer: DateTimeStringTransformer,
    type: 'date',
  })
  dateStart: DateTime;

  @Column({
    transformer: DateTimeStringTransformer,
    type: 'date',
    nullable: true,
    comment: 'If null, the slot is "forever"',
  })
  dateEnd: DateTime | null;

  @Column({
    enum: SlotFrequency,
    type: 'enum',
  })
  frequency: SlotFrequency;

  @Column()
  projectId: string;

  @ManyToOne(() => Project)
  project?: Project;

  @Column()
  incrementId: string;

  @ManyToOne(() => Increment)
  increment?: Increment;

  @Column({
    nullable: true,
  })
  moduleId: string;

  @ManyToOne(() => Group)
  module?: Group | null;

  @Column({
    update: false,
  })
  userId: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  user?: User;

  @Column({
    update: false,
    nullable: true,
  })
  phaseId: string | null;

  @ManyToOne(() => Phase)
  phase?: Phase;

  public constructor(slot: Partial<Slot>) {
    super(slot);
    if (slot) {
      Object.assign(this, slot);
    }
  }

  /**
   * Calculates the percentage of allocation in the specified timeRange
   * @param from
   * @param to
   */
  public getAmount(to: DateTime, from: DateTime = DateTime.now()): number {
    if (this.dateEnd) {
      return (
        (calculateOverlapDuration(
          from,
          to,
          this.dateStart,
          this.dateEnd,
          'hours',
        ) /
          (to.diff(from).as('hours') || 1)) *
        (this.allocation / 100)
      );
    } else if (
      calculateOverlapDuration(
        from,
        to,
        this.dateStart,
        this.dateEnd,
        'hours',
      ) > 0
    ) {
      // if no endDate defined, but it has an overlap, return the allocation rate, because a percentage cannot be
      // calculated
      return this.allocation / 100;
    }
    // if even no overlap, return 0, because the user is not allocated in that time-range
    return 0;
  }

  public getWorkTimeAmountInSlot(
    workTimes: WorkTime[],
    to: DateTime,
    from: DateTime = DateTime.now(),
  ) {
    const slotAmount = this.getAmount(to, from);
    return (
      slotAmount &&
      workTimes
        .filter((workTime) =>
          calculateOverlapDuration(
            from,
            to,
            workTime.validFrom,
            workTime.validTo,
          ),
        )
        .reduce(
          (result, currentValue) => result + currentValue.weeklyAmount,
          0,
        ) * slotAmount
    );
  }
}
