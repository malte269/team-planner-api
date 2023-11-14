import { BaseEntityWithTenant } from '../with-tenant/base.entity.with-tenant';
import { Column } from 'typeorm';
import { DateTimeStringTransformer } from '../../helper/helper-functions';
import { DateTime } from 'luxon';
import {
  DurationUnit,
  normalizeDuration,
  TimelineInterface,
} from '../interfaces/timeline.interface';

export abstract class DetailsEntity<Model extends BaseEntityWithTenant<Model>>
  extends BaseEntityWithTenant<Model>
  implements TimelineInterface<Model>
{
  @Column()
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'date',
    nullable: true,
    transformer: DateTimeStringTransformer,
    comment: 'Date when should started',
  })
  startDateSoft: DateTime | null;

  @Column({
    type: 'date',
    nullable: true,
    transformer: DateTimeStringTransformer,
    comment: 'Date when it has to start',
  })
  startDateHard: DateTime | null;

  @Column({
    type: 'date',
    nullable: true,
    transformer: DateTimeStringTransformer,
    comment: 'Date when it should end',
  })
  endDateSoft: DateTime | null;

  @Column({
    type: 'date',
    nullable: true,
    transformer: DateTimeStringTransformer,
    comment: 'Date when it has to end. Otherwise, deadline is in danger',
  })
  endDateHard: DateTime | null;

  @Column({
    nullable: true,
    comment: 'Planned working time',
    type: 'float',
  })
  duration: number | null;

  @Column({
    enum: DurationUnit,
    type: 'enum',
    nullable: true,
    comment: 'Unit of the duration',
  })
  unit: DurationUnit | null;

  @Column({
    nullable: true,
  })
  teamSize: number | null;

  get normalizedDuration(): number {
    return normalizeDuration(this.duration, this.unit);
  }

  get start(): DateTime | null {
    return this.startDateSoft ?? this.startDateHard;
  }

  get end(): DateTime | null {
    return this.endDateSoft ?? this.endDateHard;
  }
}
