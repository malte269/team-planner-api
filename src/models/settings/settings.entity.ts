import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { TENANT_SETTINGS } from '../../helper/Constants';

@Entity()
export class SettingsEntity extends BaseEntity<SettingsEntity> {
  @Column({
    default: TENANT_SETTINGS.estimatedAvailability,
    type: 'float',
  })
  estimatedAvailability: number;

  @Column({
    default: TENANT_SETTINGS.tacticalUnderload,
    type: 'float',
  })
  tacticalUnderload: number;

  @Column({
    default: TENANT_SETTINGS.incrementPenaltyConstant,
    type: 'float',
  })
  incrementPenaltyConstant: number;

  @Column({
    default: TENANT_SETTINGS.novicePenaltyConstant,
    type: 'float',
  })
  novicePenaltyConstant: number;

  @Column({
    default: TENANT_SETTINGS.teamSizePenaltyConstant,
    type: 'float',
  })
  teamSizePenaltyConstant: number;

  @Column({
    default: TENANT_SETTINGS.skillPenaltyConstant,
    type: 'float',
  })
  skillPenaltyConstant: number;

  @Column({
    default: TENANT_SETTINGS.sharedDeveloperPenalty,
    type: 'float',
  })
  sharedDeveloperPenalty: number;

  @Column({
    default: TENANT_SETTINGS.timePenalty,
    type: 'float',
  })
  timePenalty: number;

  @Column({
    default: TENANT_SETTINGS.randomness,
  })
  randomness: number;

  @Column({
    default: TENANT_SETTINGS.similarResultCount,
  })
  similarResultCount: number;

  @Column({
    default: TENANT_SETTINGS.worseResultCount,
  })
  worseResultCount: number;

  @Column({
    default: TENANT_SETTINGS.innerLoopCount,
  })
  innerLoopCount: number;

  @Column({
    default: TENANT_SETTINGS.alpha,
    type: 'float',
  })
  alpha: number;

  @Column({
    default: TENANT_SETTINGS.initialTemperature,
  })
  initialTemperature: number;

  constructor(object?: Partial<SettingsEntity>) {
    super();
    if (object) {
      Object.assign(this, object);
    }
  }
}
