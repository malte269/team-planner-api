import { Column, Entity, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { WEEKDAYS } from '../../helper/Constants';
import { DateTime } from 'luxon';
import { DateTimeStringTransformer } from '../../helper/helper-functions';
import { BaseEntity } from '../../common/base.entity';
import { calculateOverlapDuration } from '../../common/interfaces/timeline.interface';

export type Weekdays = {
  [key in (typeof WEEKDAYS)[number]]?: number;
};

// Doesn't need tenant, because it is related to user only. There should only be one valid workTime per user at time.
// They should not overlap
@Entity()
export class WorkTime extends BaseEntity<WorkTime> implements Weekdays {
  // Die Tage dienen der besseren Übersicht zum manuellen Planen
  @Column({
    default: 0,
  })
  monday: number;

  @Column({
    default: 0,
  })
  tuesday: number;

  @Column({
    default: 0,
  })
  wednesday: number;

  @Column({
    default: 0,
  })
  thursday: number;

  @Column({
    default: 0,
  })
  friday: number;

  @Column({
    comment:
      'Ein bestimmter Stundensatz pro Woche. Kann zur Validierung der Tage herangezogen werden, oder wird aus diesen berechnet',
    default: 0,
  })
  weeklyAmount: number;

  @Column({
    type: 'date',
    transformer: DateTimeStringTransformer,
  })
  validFrom: DateTime;

  @Column({
    type: 'date',
    transformer: DateTimeStringTransformer,
    nullable: true,
  })
  /**
   * Specifies, until when the workTime is valid. If null, it is valid "forever"
   */
  validTo: DateTime | null;

  @Column({
    update: false,
  })
  userId: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  user?: User;

  /**
   * Returns the amount of time, that can be worked in the timeRange. This ignores the weekdays for calculation as long
   * this is just a prototype
   * @param from
   * @param to
   */
  public getAmount(to: DateTime, from: DateTime = DateTime.now()): number {
    return (
      // if the calculation is less than 0 (no overlap), return 0
      Math.max(
        0,
        calculateOverlapDuration(from, to, this.validFrom, this.validTo) / 5,
      ) * this.weeklyAmount
    );
  }
}
