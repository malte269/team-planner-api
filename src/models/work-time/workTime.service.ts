import { Injectable } from '@nestjs/common';
import { WorkTime } from './workTime.entity';
import WorkTimeDto from './workTime.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { WEEKDAYS } from '../../helper/Constants';
import { ResException } from '../../common/ResException';
import {
  WORK_TIME_ERROR_CREATE,
  WORK_TIME_ERROR_UPDATE,
} from './workTime.enums';
import { ErrorCollectionItem } from '../../common/decorators/ApiResponses.decorator';
import { BaseService } from '../../common/base.service';
import { DateTime } from 'luxon';

@Injectable()
export class WorkTimeService extends BaseService<WorkTime, WorkTimeDto> {
  constructor(
    @InjectRepository(WorkTime) public repository: Repository<WorkTime>,
  ) {
    super('WTS');
  }

  async beforeInsert(
    createDto: WorkTimeDto,
    user: User,
    ...args: any[]
  ): Promise<WorkTimeDto> {
    if (!createDto.validFrom) {
      createDto.validFrom = DateTime.now().startOf('day');
    }
    if (!createDto.validTo) {
      // some date in far future just for now
      createDto.validTo = DateTime.local(2200, 1, 1).endOf('day');
    }
    this.calculateWeeklyAmount(createDto, WORK_TIME_ERROR_CREATE);
    return super.beforeInsert(createDto, user, ...args);
  }

  async beforeUpdate(
    id: string,
    user: User,
    updateDto: Partial<WorkTimeDto>,
    record: WorkTime,
    ...args: any[]
  ): Promise<Partial<WorkTimeDto>> {
    this.calculateWeeklyAmount(updateDto, WORK_TIME_ERROR_UPDATE, record);
    // create changes for every change in the updateDto
    Object.keys(updateDto).filter(
      (key: string) =>
        !(
          updateDto[key] === undefined ||
          updateDto[key] === null ||
          key === 'userId'
        ),
    );
    return super.beforeUpdate(id, user, updateDto, record, ...args);
  }

  private calculateWeeklyAmount(
    dto: Partial<WorkTimeDto>,
    errorCollection: { [key in 'WEEKLY_AMOUNT_CONFLICT']: ErrorCollectionItem },
    record?: WorkTime,
  ) {
    // calculate the amount per week from the weekday props
    const calculatedAmountPerWeek = WEEKDAYS.reduce((retVal, key) => {
      // The ?? Operator selects the right side, if the left side is not defined(null or undefined), otherwise the left
      // side. The || Operator will select the right side, if the left side equals false(NaN, undefined, null, 0),
      // otherwise the right side.
      retVal += (Number(dto[key]) ?? record?.[key]) || 0;
      return retVal;
    }, 0);

    // if amount is > 0
    if (dto.weeklyAmount) {
      // if amount === 0, split the weekly amount to all weekdays
      if (!calculatedAmountPerWeek) {
        // because weekdays has a length of 5, the post comma precision is always 1, so no need to set it manually
        const average = Number(dto.weeklyAmount / WEEKDAYS.length);
        WEEKDAYS.forEach((weekDay) => (dto[weekDay] = average));
      }
      // if the amount is > 0 and does not match, throw an error
      else if (calculatedAmountPerWeek !== dto.weeklyAmount) {
        throw new ResException(errorCollection.WEEKLY_AMOUNT_CONFLICT);
      }
    } else {
      // amount is undefined, null or 0, assign weeklyAmount
      dto.weeklyAmount = calculatedAmountPerWeek;
    }
  }
}
