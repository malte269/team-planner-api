import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository, SelectQueryBuilder } from 'typeorm';
import { UserDto } from './user.dto';
import { ResException } from '../../common/ResException';
import { USER_ERROR_CREATE, USER_ERROR_UPDATE } from './user.enums';
import { WorkTimeService } from '../work-time/workTime.service';
import WorkTimeDto from '../work-time/workTime.dto';
import { key } from '../../common/base.entity';
import { DateTime } from 'luxon';
import { sortArray } from '../../helper/helper-functions';
import { BaseServiceWithTenant } from '../../common/with-tenant/with-tenant.service';

@Injectable()
export class UserService extends BaseServiceWithTenant<User, UserDto> {
  constructor(
    @InjectRepository(User) public repository: Repository<User>,
    @Inject(forwardRef(() => WorkTimeService))
    private readonly workTimeService: WorkTimeService,
  ) {
    super('UsS');
  }

  async beforeInsert(createDto: UserDto, user: User): Promise<UserDto> {
    if (createDto.email) {
      // trim and lower it
      createDto.email = createDto.email.trim().toLowerCase();
      const uniqueExists = await this.count({
        email: createDto.email,
        deleted: false,
      });
      if (uniqueExists) {
        throw new ResException(USER_ERROR_CREATE.UNIQUE);
      }
    }

    return super.beforeInsert(createDto, user);
  }

  protected async afterInsert(
    record: User,
    createDto: UserDto,
    user: User,
    ...args
  ): Promise<User> {
    if (createDto.workTimes && Array.isArray(createDto.workTimes)) {
      createDto.workTimes.forEach(
        (workTime: WorkTimeDto) => (workTime.userId = record.id),
      );
      if (
        createDto.workTimes.some(
          (workTime: WorkTimeDto) =>
            !(workTime.validFrom = workTime.validFrom
              ? DateTime.fromISO(workTime.validFrom as string)
              : DateTime.now()).isValid,
        )
      ) {
        throw new ResException(USER_ERROR_CREATE.INVALID_VALID_FROM);
      } else if (
        createDto.workTimes.some((workTime: WorkTimeDto, index: number) =>
          createDto.workTimes.some(
            (workTime2: WorkTimeDto, index2: number) =>
              (workTime.validFrom as DateTime)
                .startOf('day')
                .diff((workTime2.validFrom as DateTime).startOf('day'), 'days')
                .get('days') === 0 && index !== index2,
          ),
        )
      ) {
        throw new ResException(USER_ERROR_CREATE.DUPLICATE_VALID_FROM);
      }
    } else {
      createDto.workTimes = [
        {
          userId: record.id,
          validFrom: DateTime.now().startOf('day'),
        },
      ];
    }

    sortArray(createDto.workTimes, false, (workTime) =>
      (workTime.validFrom as DateTime).toMillis(),
    );

    for (const workTime of createDto.workTimes) {
      try {
        // try creating workTimes in order
        await this.workTimeService.create(workTime, user);
      } catch (e) {
        throw e;
      }
    }

    return super.afterInsert(record, createDto, user, ...args);
  }

  async beforeUpdate(
    id: string,
    user: User,
    updateDto: Partial<UserDto>,
    record: User,
    ...args
  ): Promise<Partial<UserDto>> {
    updateDto.email = updateDto.email?.trim().toLowerCase();

    // check if new email is unique
    if (updateDto.email && record.email !== updateDto.email) {
      const uniqueExists = await this.count({
        id: Not(id),
        email: updateDto.email,
        deleted: false,
      });
      if (uniqueExists) {
        throw new ResException(USER_ERROR_UPDATE.UNIQUE);
      }
    }

    if (updateDto.workTimes) {
      await Promise.all(
        updateDto.workTimes
          .filter((wT) => wT.id)
          .map((wT) => this.workTimeService.update(wT.id, user, wT)),
      );
    }

    delete updateDto.workTimes;
    delete updateDto.slots;
    delete updateDto.projects;
    delete updateDto.issues;

    return super.beforeUpdate(id, user, updateDto, record, ...args);
  }

  public parseWhereProperty(
    queryBuilder: SelectQueryBuilder<User>,
    propKey: string,
    propValue: any,
  ) {
    switch (propKey) {
      case key<User>('skills'):
        // the query for skills can be a single string of skills, separated with commas, or already an array of
        // strings. It is possible to query with AND and OR clauses, so all values of the string array will be split
        // again
        let orSkillArray: string[] | string[][];
        if (typeof propValue === 'string') {
          // if it is only a string, use it as AND skills
          orSkillArray = [propValue];
        } else {
          // if it is not a string, it is an array of strings
          orSkillArray = propValue;
        }
        // orSkillArray is the array of all OR values
        const where = (orSkillArray as string[]).map(
          (orSkill: string, orIndex: number) => {
            const andSkills = orSkill.split(',');
            orSkillArray[orIndex] = andSkills;
            return `(${andSkills
              .map(
                (andSkill: string, andIndex) =>
                  `${queryBuilder.alias}.${key<User>(
                    'skills',
                  )} LIKE :skill${orIndex}_${andIndex}`,
              )
              .join(' AND ')})`;
          },
        );
        queryBuilder.andWhere(
          `(${where.join(' OR ')})`,
          (orSkillArray as string[][]).reduce(
            (
              previousValue: object,
              andSkills: string[],
              currentIndex: number,
            ) => {
              andSkills.forEach(
                (_: string, andSkillIndex: number) =>
                  (previousValue[
                    `skill${currentIndex}_${andSkillIndex}`
                  ] = `%${orSkillArray[currentIndex][andSkillIndex]}%`),
              );
              return previousValue;
            },
            {},
          ),
        );
        break;
      default:
        return false;
    }
    return true;
  }
}
