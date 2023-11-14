import { ApiProperty } from '@nestjs/swagger';
import { AsDto } from '../../helper/Typings';
import { SettingsEntity } from './settings.entity';
import { Dto } from '../../common/base.dto';
import { DtoWithTenant } from '../../common/with-tenant/base.dto.with-tenant';
import { TENANT_SETTINGS } from '../../helper/Constants';

export class SettingsDto
  extends DtoWithTenant<SettingsDto>
  implements
    AsDto<
      SettingsEntity,
      | keyof Dto<SettingsDto>
      | 'estimatedAvailability'
      | 'teamSizePenaltyConstant'
      | 'incrementPenaltyConstant'
      | 'novicePenaltyConstant'
      | 'tacticalUnderload'
      | 'skillPenaltyConstant'
      | 'randomness'
      | 'similarResultCount'
      | 'worseResultCount'
      | 'innerLoopCount'
      | 'alpha'
      | 'initialTemperature'
      | 'sharedDeveloperPenalty'
      | 'timePenalty'
    >
{
  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.estimatedAvailability,
  })
  estimatedAvailability?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.incrementPenaltyConstant,
  })
  incrementPenaltyConstant?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.tacticalUnderload,
  })
  tacticalUnderload?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.novicePenaltyConstant,
  })
  novicePenaltyConstant?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.teamSizePenaltyConstant,
  })
  teamSizePenaltyConstant?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.skillPenaltyConstant,
  })
  skillPenaltyConstant?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.sharedDeveloperPenalty,
  })
  sharedDeveloperPenalty?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.timePenalty,
  })
  timePenalty?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.randomness,
  })
  randomness?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.similarResultCount,
  })
  similarResultCount?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.worseResultCount,
  })
  worseResultCount?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.innerLoopCount,
  })
  innerLoopCount?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.alpha,
  })
  alpha?: number;

  @ApiProperty({
    required: false,
    default: TENANT_SETTINGS.initialTemperature,
  })
  initialTemperature?: number;

  constructor(object?: Partial<SettingsDto>) {
    super(object);
    if (object) {
      Object.assign(this, object);
    }
  }
}
