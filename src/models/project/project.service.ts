import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Project, ProjectStatus } from './project.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectDto } from './project.dto';
import { ResException } from '../../common/ResException';
import { PROJECT_ERROR_CREATE } from './project.enums';
import { MAX_SKILL_LEVEL, User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { DateTime } from 'luxon';
import {
  getArray,
  getDateTime,
  randInt,
  removeFromArray,
  splitArray,
  toUniqueArray,
} from '../../helper/helper-functions';
import { Increment } from '../increment/increment.entity';
import { Group } from '../group/group.entity';
import { Issue } from '../issue/issue.entity';
import { Phase } from '../phase/phase.entity';
import { BaseServiceWithTenant } from '../../common/with-tenant/with-tenant.service';
import { Slot, SlotFrequency } from '../slot/slot.entity';
import { key } from '../../common/base.entity';
import { WorkTime } from '../work-time/workTime.entity';
import {
  initFamilyHierarchy,
  teamCountOfFamily,
} from '../../common/interfaces/family.interface';
import { PhaseService } from '../phase/phase.service';
import { IncrementService } from '../increment/increment.service';
import { IncrementDto } from '../increment/increment.dto';
import { PhaseDto } from '../phase/phase.dto';
import {
  calculateOverlapDuration,
  convertDuration,
  DurationUnit,
} from '../../common/interfaces/timeline.interface';
import { SettingsService } from '../settings/settings.service';
import { TenantService } from '../tenant/tenant.service';
import { SettingsDto } from '../settings/settings.dto';
import { TENANT_SETTINGS } from '../../helper/Constants';

type Assignment<Module> = Module & { users: UserWithProd[] };

type ProjectAssignment = Assignment<Omit<Project, 'increments'>> & {
  increments: IncrementAssignment[];
  allocationResult: GroupAssignment[][];
};

type IncrementAssignment = Assignment<Omit<Increment, 'modules'>> & {
  // modules of increment with hierarchy
  modules: GroupAssignment[];
  // all modules of increment, without hierarchy
  allModules: GroupAssignment[];
};

type GroupAssignment = Assignment<Omit<Group, 'phases' | 'children'>> & {
  workload?: number;
  phases: Assignment<Phase>[];
  children: GroupAssignment[];
};

/**
 * The key of prods is created from incrementId_groupId_phaseId
 */
type UserWithProd = User & { prods: { [key: string]: number } };

@Injectable()
export class ProjectService extends BaseServiceWithTenant<Project, ProjectDto> {
  constructor(
    @InjectRepository(Project) public repository: Repository<Project>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => TenantService))
    private readonly tenantService: TenantService,
    @Inject(forwardRef(() => IncrementService))
    private readonly incrementService: IncrementService,
    @Inject(forwardRef(() => PhaseService))
    private readonly phaseService: PhaseService,
    @Inject(forwardRef(() => SettingsService))
    private readonly settingsService: SettingsService,
  ) {
    super('ProjS');
  }

  async beforeInsert(createDto: ProjectDto, user: User): Promise<ProjectDto> {
    const uniqueExists = await this.count({
      name: createDto.name,
      deleted: false,
    });
    if (uniqueExists) {
      throw new ResException(PROJECT_ERROR_CREATE.UNIQUE);
    }

    const uniqueShort = await this.count({
      name: createDto.short,
      deleted: false,
    });
    if (uniqueShort) {
      throw new ResException(PROJECT_ERROR_CREATE.UNIQUE_SHORT);
    }

    createDto.startDateSoft = (
      getDateTime(createDto.startDateSoft) ?? DateTime.now()
    ).startOf('day');

    const projectStart = createDto.startDateSoft.toMillis();

    const end = getDateTime(createDto.endDateSoft ?? createDto.endDateHard);
    const projectEnd = end ? end.toMillis() : Infinity;

    if (projectStart > projectEnd) {
      throw new ResException(PROJECT_ERROR_CREATE.SWITCHED_TIMES);
    }

    createDto.status =
      createDto.status ??
      (projectEnd < DateTime.now().toMillis()
        ? ProjectStatus.FINISHED
        : projectStart < DateTime.now().toMillis()
        ? ProjectStatus.ACTIVE
        : ProjectStatus.PENDING);

    return super.beforeInsert(createDto, user);
  }

  protected async afterInsert(
    record: Project,
    createDto: ProjectDto,
    user: User,
    ...args: any[]
  ): Promise<Project> {
    let phaseError = false;
    const defaultPhases: PhaseDto[] = [
      // default is one phase
      {
        name: 'Durchführung',
        tenantId: record.tenantId,
        projectId: record.id,
        order: 0,
      },
    ];
    const defaultIncrements: IncrementDto[] = [
      {
        name: 'Sprint 1',
        tenantId: record.tenantId,
        projectId: record.id,
        startDateSoft: record.startDateSoft,
        startDateHard: record.startDateHard,
      },
    ];
    let incrementPhases = [];
    let i = 0;
    for (const phase of getArray(createDto.phases, defaultPhases)) {
      phase.projectId = record.id;
      phase.tenantId = record.tenantId;
      // at this time, a project does not have any phases, so the index can be used to order phases
      phase.order = i;
      try {
        await this.phaseService.create(phase, user);
        incrementPhases.push(phase);
        i++;
      } catch (e) {
        if (i === 0) {
          // if no phase was created, create default phases
          incrementPhases = await Promise.all(
            defaultPhases.map((phase) => this.phaseService.create(phase, user)),
          );
        }
        // don't throw an error here, because of increment creation.
        phaseError = true;
      }
    }
    i = 0;
    for (const inc of getArray(createDto.increments, defaultIncrements)) {
      inc.projectId = record.id;
      inc.tenantId = record.tenantId;
      inc.incrementNumber = i;
      inc.phases = incrementPhases.slice();
      try {
        await this.incrementService.create(inc, user);
        i++;
      } catch (e) {
        if (i === 0) {
          // if no increment was created, create default increments
          await Promise.all(
            defaultIncrements.map((inc) =>
              this.incrementService.create(inc, user),
            ),
          );
        }
        throw new ResException(PROJECT_ERROR_CREATE.MALFORMED_INCREMENTS);
      }
    }
    if (phaseError) {
      throw new ResException(PROJECT_ERROR_CREATE.MALFORMED_PHASES);
    }

    const tenant = await this.tenantService.findOne({
      where: {
        id: record.tenantId,
      },
      relations: {
        settings: true,
      },
    });
    const settings = await this.settingsService.create(
      {
        // set tenantSettings as default
        ...tenant.settings,
        ...createDto.settings,
      },
      user,
    );
    // update settingsId of project
    await this.update(record.id, user, { settingsId: settings.id }, record);
    return super.afterInsert(record, createDto, user, ...args);
  }

  async beforeUpdate(
    id: string,
    user: User,
    updateDto: Partial<ProjectDto>,
    record: Project,
    ...args: any[]
  ): Promise<Partial<ProjectDto>> {
    // don't add phases via project update. Use phase entrypoint for that
    delete updateDto.phases;
    delete updateDto.users;
    delete updateDto.increments;
    delete updateDto.modules;
    delete updateDto.issues;
    if (updateDto.settings) {
      // if new settings object, create
      if (!record.settingsId) {
        const tenant = await this.tenantService.findOne({
          where: {
            id: record.tenantId,
          },
          relations: {
            settings: true,
          },
        });
        const settings = await this.settingsService.create(
          {
            ...tenant.settings,
            ...updateDto.settings,
          },
          user,
        );
        updateDto.settingsId = settings.id;
      } else {
        // if record already has a settings object, update it
        await this.settingsService.update(
          record.settingsId,
          user,
          updateDto.settings,
        );
      }
      delete updateDto.settings;
    }
    return super.beforeUpdate(id, user, updateDto, record, ...args);
  }

  /**
   * Gets the project with all its items, to be able to perform automated allocation
   * @param projectId
   * @param user
   * @private
   */
  public async getProject(projectId: string, user: User) {
    const projectQuery = this.createQueryBuilder(user).andWhereInIds(projectId);
    projectQuery
      .leftJoinAndSelect(
        `${projectQuery.alias}.${key<Project>('settings')}`,
        `p${key<Project>('settings')}`,
      )
      // maybe the project has users assigned. If so, use them for allocation
      .leftJoinAndSelect(
        `${projectQuery.alias}.${key<Project>('users')}`,
        `p${key<Project>('users')}`,
      )
      // and the slots of the users
      .leftJoinAndSelect(
        `p${key<Project>('users')}.${key<User>('slots')}`,
        `p${key<User>('slots')}`,
        `p${key<User>('slots')}.${key<Slot>('dateStart')} < ${
          projectQuery.alias
        }.${key<Project>('endDateHard')} AND p${key<User>('slots')}.${key<Slot>(
          'dateEnd',
        )} > ${projectQuery.alias}.${key<Project>('startDateSoft')}`,
      ) // and the workTimes of the users to be able to validate the amount of work
      .leftJoinAndSelect(
        `p${key<Project>('users')}.${key<User>('workTimes')}`,
        `p${key<User>('workTimes')}`,
        `p${key<User>('workTimes')}.${key<WorkTime>('validFrom')} < ${
          projectQuery.alias
        }.${key<Project>('endDateHard')} AND p${key<User>(
          'workTimes',
        )}.${key<WorkTime>('validTo')} > ${projectQuery.alias}.${key<Project>(
          'startDateSoft',
        )}`,
      )
      // with all increments
      .leftJoinAndSelect(
        `${projectQuery.alias}.${key<Project>('increments')}`,
        key<Project>('increments'),
      )
      .leftJoinAndSelect(
        `${key<Project>('increments')}.${key<Increment>('issues')}`,
        `i_${key<Project>('issues')}`,
        // join issues to increments, that have no group
        `i_${key<Project>('issues')}.${key<Issue>('groupId')} IS NULL`,
      )
      // join increment phases
      .leftJoinAndSelect(
        `${key<Project>('increments')}.${key<Increment>('phases')}`,
        `i_${key<Project>('phases')}`,
      )
      // and all modules of the project
      .leftJoinAndSelect(
        `${projectQuery.alias}.${key<Project>('modules')}`,
        key<Project>('modules'),
      )
      // and all the issues of the modules, that are assigned to an increment
      .leftJoinAndSelect(
        `${key<Project>('modules')}.${key<Group>('issues')}`,
        `m_${key<Group>('issues')}`,
        `m_${key<Group>('issues')}.${key<Issue>('incrementId')} IS NOT NULL`,
      )
      // sort increments and phases
      .addOrderBy(
        `${key<Project>('increments')}.${key<Increment>('incrementNumber')}`,
        'ASC',
      )
      .addOrderBy(
        `i_${key<Increment>('phases')}.${key<Phase>('order')}`,
        'ASC',
      );
    return projectQuery.getOne();
  }

  private async getPotentialDevs(
    user: User,
    from: DateTime = DateTime.now(),
    to: DateTime = DateTime.now().plus({ year: 20 }),
  ): Promise<User[]> {
    const userQuery = this.userService.createQueryBuilder(user);
    return userQuery
      .andWhere(`${userQuery.alias}.${key<User>('deleted')} = false`)
      .innerJoinAndSelect(
        `${userQuery.alias}.${key<User>('workTimes')}`,
        key<User>('workTimes'),
        // get workTimes, that are valid before endDate
        `${key<User>('workTimes')}.${key<WorkTime>(
          'deleted',
          // AND that are valid after the startDate
        )} = false AND ${key<User>('workTimes')}.${key<WorkTime>(
          'validFrom',
          // AND that are valid after the startDate
        )} < :endDate AND ${key<User>('workTimes')}.${key<WorkTime>(
          'validTo',
        )} > :startDate`,
        {
          startDate: (from ?? DateTime.now()).toJSDate(),
          endDate: (to ?? DateTime.now().plus({ year: 20 })).toJSDate(),
        },
      )
      .leftJoinAndSelect(
        `${userQuery.alias}.${key<User>('slots')}`,
        key<User>('slots'),
        `${key<User>('slots')}.${key<Slot>('deleted')} = false AND ${key<User>(
          'slots',
        )}.${key<Slot>('dateStart')} <= :endDate AND ${key<User>(
          'slots',
        )}.${key<Slot>('dateEnd')} >= :startDate`,
      )
      .orderBy(`${key<User>('workTimes')}.${key<WorkTime>('validFrom')}`, 'ASC')
      .orderBy(`${key<User>('slots')}.${key<Slot>('dateStart')}`, 'ASC')
      .getMany();
  }

  /**
   * This sorts the items of the project, to process them in the first allocation and beyond. The initial structure
   * of the project, after getting it from the database ist like:
   * project : {
   *   increments: [
   *     {
   *       phases: [
   *             ...
   *       ],
   *       issues: [
   *         ...
   *       ]
   *     },
   *     ...
   *   ],
   *   modules: [
   *     {
   *        issues: [
   *          ...
   *        ]
   *     },
   *     ...
   *   ],
   *   users: [
   *     a team, that should do this project. This can be defined, before allocation. Otherwise, all users are possible
   *   ]
   * }
   * So the modules need to be sorted to their increments and parents (if they have one)
   * @param project
   * @private
   */
  private sortItems(project: Project) {
    // init the hierarchy. The project groups now have the family attributes filled, but are still a flat array
    initFamilyHierarchy(project.modules);
    project.increments.forEach((projectIncrement: IncrementAssignment) => {
      projectIncrement.users = [];
      // project groups can now be filtered by incrementId and whole family is on one increment (important for team
      // allocation)
      (projectIncrement as IncrementAssignment).allModules = project.modules
        .filter((module) => module.incrementIds.includes(projectIncrement.id))
        .map((module) => {
          // create new objects of the modules to not alter the object stored in project groups
          const retVal = new Group(module) as GroupAssignment;
          // and filter the issues of this increment
          retVal.issues = module.issues.filter(
            (issue) => issue.incrementId === projectIncrement.id,
          );
          // assign phases. Some may not have any issues or phases in this increment, but its children does
          retVal.phases = projectIncrement.phases
            .filter((phase) => retVal.phaseIds.includes(phase.id))
            .map((phase) => {
              const mPhase = new Phase(phase) as Assignment<Phase>;
              // assign issues to its phases
              mPhase.issues = retVal.issues.filter(
                (issue) => (issue.phaseId = phase.id),
              );
              mPhase.users = [];
              return mPhase;
            });
          // remove children, to create family hierarchy afterward again
          delete retVal.children;
          // assign default empty users array for team allocation
          retVal.users = [];
          return retVal;
        });
      projectIncrement.modules = initFamilyHierarchy(
        (projectIncrement as IncrementAssignment).allModules,
      );
    });
    return project;
  }

  private initDeveloperAllocationForModules(
    users: UserWithProd[],
    increment: IncrementAssignment,
    parent: GroupAssignment,
    modules: GroupAssignment[],
    settings?: SettingsDto,
  ) {
    // IMPORTANT: For best case the teamSize of the project needs to be more or equal to the largest child array
    //  of groups because a constraint says, that no developers should be shared between groups of the same level
    const experts = users.filter((user) => user.isExpert);
    // allocate all experts to the module
    this.allocateDevelopersToGroups(
      experts,
      increment,
      parent,
      modules,
      settings,
      (group) => {
        const minRecommendedTeamSize = this.getMinRecommendedTeamSize(
          increment,
          group,
        );
        const familyTeamCount = teamCountOfFamily(group);
        // teamCount already reached its limit
        return (
          group.users.length >=
          (group.teamSize = Math.max(minRecommendedTeamSize, familyTeamCount))
        );
      },
    );
    if (
      // if some of the groups have no expert...
      modules.some((group) => !group.users.some((user) => user.isExpert))
    ) {
      // move an expert from a group that has more than one expert
      const groupsWithExpert = modules
        // here are only experts assigned, so first filter for more than one user, then map array
        .filter(
          (group) => group.users.filter((user) => user.isExpert).length > 1,
        );
      const groupsWithoutExperts = modules.filter(
        // get those, without any expert
        (group) => !group.users.filter((user) => user.isExpert).length,
      );
      const usersToMove = groupsWithExpert.flatMap((group) =>
        group.users.filter((user) => user.isExpert),
      );
      this.moveDevelopers(
        usersToMove,
        groupsWithExpert,
        groupsWithoutExperts,
        increment,
        parent,
        settings,
        (newGroup, oldGroup, _, groupArray, usersArray) => {
          let remainingExperts: UserWithProd[] = [];
          // remove the new group from the groups array, because every group should have at least one expert
          removeFromArray(newGroup, groupArray, 'id') &&
            // and if the old group only has one expert left, deny reallocating him by removing the user from the users
            // array
            (remainingExperts = oldGroup.users.filter((user) => user.isExpert))
              .length <= 1 &&
            removeFromArray(remainingExperts[0], usersArray, 'id');
        },
      );
    }
    // after allocation of all experts, allocate novices
    const novices = users.filter((dev) => !dev.isExpert);
    this.allocateDevelopersToGroups(
      novices,
      increment,
      parent,
      modules,
      settings,
    );
  }

  /**
   * Assigns the users with the highest productivity to the modules with the highest workload, until no users are left,
   * or no user has a productivity greater than 0 for any module
   * @param users
   * @param increment
   * @param parent
   * @param modules
   * @param settings
   * @param abortCondition Optional: Set a condition on the selected group, to end allocation
   * @param onAssignUser Optional: Defines, what to do on assign user to a group
   * @private
   */
  private allocateDevelopersToGroups(
    users: UserWithProd[],
    increment: IncrementAssignment,
    parent: GroupAssignment,
    modules: GroupAssignment[],
    settings?: SettingsDto,
    abortCondition: (group: GroupAssignment) => boolean = (group) =>
      group.users.length >= this.getMinRecommendedTeamSize(increment, group),
    onAssignUser?: (
      group: GroupAssignment,
      user: UserWithProd,
      groupArray: GroupAssignment[],
      usersArray: UserWithProd[],
    ) => void,
  ): void {
    // Now assign the "best" developers to the modules with the most workload
    const modulesCopy = modules.slice();
    const usersCopy = users.slice();
    while (usersCopy.length > 0 && modulesCopy.length > 0) {
      // sort the groups of the increment
      this.sortGroupsForRemainingWorkload(increment, modulesCopy);
      // if module has already the recommended teamCount, remove it from the array
      if (
        // TODO: think about skill covering
        abortCondition(modulesCopy[0])
      ) {
        modulesCopy.shift();
        continue;
      }
      // sort experts according to their productivity to the most expensive group
      this.sortDevsForProd(usersCopy, increment, modulesCopy[0]);
      const developer = usersCopy.shift();
      if (developer.prods[`${increment.id}_${modulesCopy[0].id}`] === 0) {
        // if no prod, it's useless to add him to the module, so remove it from the modules array and re-add the
        // developer to the users array and continue
        modulesCopy.shift();
        usersCopy.push(developer);
        continue;
      }
      // something on assign user
      onAssignUser &&
        onAssignUser(modulesCopy[0], developer, modulesCopy, usersCopy);
      // if the user is allocated to a parents issue, he can work on children too, but the participation rate needs to
      // be split
      if (parent.issues?.some((issue) => issue.userId === developer.id)) {
        this.splitDeveloperAllocation(
          developer,
          increment,
          parent,
          modulesCopy[0].phases?.length,
        );
      } else {
        // if the user is not allocated to any of the parents issues, remove him, so he can be allocated to the child
        this.removeUserFromGroup(
          developer,
          increment.id,
          parent as GroupAssignment,
        );
      }
      this.allocateUserToGroup(developer, increment, modulesCopy[0], settings);
    }
  }

  private allocateUserToGroup(
    developer: UserWithProd,
    increment: IncrementAssignment,
    group: GroupAssignment,
    settings: SettingsDto,
  ) {
    // if already allocated to this group, don't allocate again
    if (
      developer.slots.some(
        (slot) =>
          slot.moduleId === group.id && slot.incrementId === increment.id,
      )
    ) {
      return;
    }
    group.users.push(developer);
    // for phase continuity, add a slot for every phase of the module in the increment
    group.phases.forEach((phase) =>
      this.addSlotForGroup(developer, group, increment, phase, settings),
    );
    // calculate the duration again
    group.workload = this.duration(increment, group);
  }

  private removeUserFromGroup(
    user: UserWithProd,
    incrementId: string,
    oldGroup: GroupAssignment,
  ): boolean {
    // go through the users of the old group and check for id
    return oldGroup.users?.some((groupUser, index, array) => {
      return (
        // compare user
        user.id === groupUser.id &&
        // remove if check passed
        !!array.splice(index, 1) &&
        // and remove all its slots
        user.slots.reduceRight((_, slot, index, array) => {
          if (
            slot.incrementId === incrementId &&
            slot.moduleId === oldGroup.id
            // phase does not matter here, because the user is added to all of them and now removed from all
          ) {
            array.splice(index, 1);
          }
          return true;
        }, true)
      );
    });
  }

  private moveDevelopers(
    usersToMove: UserWithProd[],
    from: GroupAssignment[],
    to: GroupAssignment[],
    increment: IncrementAssignment,
    parent: GroupAssignment,
    settings: SettingsDto,
    onAssign?: (
      newGroup: GroupAssignment,
      oldGroup: GroupAssignment,
      user: UserWithProd,
      groupArray: GroupAssignment[],
      usersArray: UserWithProd[],
    ) => void,
  ) {
    this.allocateDevelopersToGroups(
      usersToMove,
      increment,
      parent,
      to,
      settings,
      undefined,
      // on assign user, remove the user from its old group
      (newGroup, user, groups, users) => {
        from.find(
          (oldGroup) =>
            this.removeUserFromGroup(user, increment.id, oldGroup) &&
            (!onAssign ||
              onAssign(newGroup, oldGroup, user, groups, users) ||
              true),
        );
      },
    );
  }

  private sortDevsForProd<T = UserWithProd>(
    devs: T[],
    increment: Increment,
    group: Group,
    phaseId?: string,
    withChildren: boolean = true,
    transform: (arg: T) => UserWithProd = (arg) => arg as UserWithProd,
  ) {
    // sort experts according to their productivity to the most expensive group
    devs.sort(
      (a, b) =>
        this.prodForGroup(
          transform(b),
          increment,
          group,
          phaseId,
          withChildren,
        ) -
        this.prodForGroup(
          transform(a),
          increment,
          group,
          phaseId,
          withChildren,
        ),
    );
  }

  private sortGroupsForRemainingWorkload(
    increment: IncrementAssignment,
    groups: GroupAssignment[],
    withChildren: boolean = true,
  ) {
    // sort modules in descending order of their workload
    groups.sort((a, b) => {
      // If the workload of a group is already defined, use it, otherwise calculate it and store it. As a side effect
      // of assigning variables, the value is returned and can be used. Omit children from workload calculation here
      return (a.workload ??
        (a.workload = this.duration(increment, a, undefined, withChildren))) >
        (b.workload ??
          (b.workload = this.duration(increment, b, undefined, withChildren)))
        ? -1
        : 0;
    });
  }

  private addSlotForGroup(
    user: User,
    module: Group,
    increment: IncrementAssignment,
    phase?: Assignment<Phase>,
    settings?: SettingsDto,
  ) {
    const dateStart = increment.getPhaseStart(phase) ?? DateTime.now();
    const dateEnd = increment.getPhaseEnd(phase);
    const newSlot = new Slot({
      // If the user is already allocated 100% in the time-range, set allocation to 0%
      allocation: Math.max(
        0,
        +(
          100 *
            ((settings?.estimatedAvailability ?? 100) / 100) *
            ((settings?.tacticalUnderload ?? 100) / 100) -
          user.plannedAmount(dateEnd, dateStart) * 100
        ).toFixed(4),
      ),
      frequency: SlotFrequency.DAILY,
      tenantId: module.tenantId,
      projectId: module.projectId,
      moduleId: module.id,
      incrementId: increment.id,
      phaseId: phase?.id ?? null,
      userId: user.id,
      dateStart,
      dateEnd,
    });
    user.slots.push(newSlot);
  }

  /**
   * Initialize the first solution
   * @private
   */
  public async initialize(
    projectId: string,
    user: User,
  ): Promise<{ project: ProjectAssignment; users: UserWithProd[] }> {
    // get the project
    const project = await this.getProject(projectId, user);
    // create the hierarchy of the project elements
    const sortedProject = this.sortItems(project);
    // get potential users
    const devs =
      // if the project already has an assigned team, use this instead
      project.users?.length > 0
        ? project.users
        : await this.getPotentialDevs(
            user,
            project.startDateSoft,
            project.endDateHard,
          );
    return {
      project: sortedProject as ProjectAssignment,
      users: (devs as UserWithProd[]).map<UserWithProd>((dev) => {
        dev.prods = {};
        return dev;
      }),
    };
  }

  /**
   * Return the cost of the given solution
   * @param input
   * @private
   */
  private cost(input: {
    increments: IncrementAssignment[];
    groups: GroupAssignment[][];
    allUsers: UserWithProd[];
    settings: SettingsDto;
  }): number {
    return input.increments.reduce((result, increment, index, incArray) => {
      // duration of increment would always be the same, because there are no users assigned to it, so its value would
      // have no effect
      // calculate duration of family modules
      const groupsDuration = input.groups[index].reduce(
        (result, group: GroupAssignment) =>
          result +
          this.duration(increment, group, undefined, false) +
          (group?.children?.reduce((res, child) => {
            const duration = this.duration(increment, child);
            return (
              res +
              // calculate duration of child with its children // TODO: calculate by phases??
              duration *
                (1 +
                  // check increment continuity
                  this.incrementContinuity(
                    // get all users that are allocated to that child in any increment
                    input.allUsers.filter(
                      (user: UserWithProd) =>
                        !!this.allocation(user, null, child),
                    ) as UserWithProd[],
                    increment,
                    // get the next increment with that module. Only one is enough, because this increment will be compared
                    // to the next increment in a later loop run
                    incArray.slice(index + 1).find((_, i) =>
                      // don't use increment groups, but the groups from the input
                      input.groups[index + 1 + i].some((incGroup) =>
                        incGroup.children?.some(
                          (child2) => child2.id === child.id,
                        ),
                      ),
                    ),
                    child,
                    // multiply with some constant, the user can set
                  ) *
                    (input.settings?.incrementPenaltyConstant ??
                      TENANT_SETTINGS.incrementPenaltyConstant) +
                  // also, check the novice team constraint (min one expert per team)
                  (this.noviceTeam(increment, child) &&
                    // if the constraint is violated, multiply with some constant. If the constant is set to 1 or 0, this
                    // constraint has no effect on the result. If it is greater than one, it increases the cost, if set less
                    // than one, it decreases the final cost
                    (input.settings?.novicePenaltyConstant ??
                      TENANT_SETTINGS.novicePenaltyConstant)) +
                  this.skillCoverageConstraint(
                    child.users,
                    // because issues of groups are already grouped by increment, no need to check for increment here
                    child.groupProfile(),
                  ) *
                    (input.settings?.skillPenaltyConstant ??
                      TENANT_SETTINGS.skillPenaltyConstant) +
                  // apply team efficiency
                  (1 - this.teamEfficiency(child.users.length) / 100) *
                    (input.settings?.teamSizePenaltyConstant ??
                      TENANT_SETTINGS.teamSizePenaltyConstant) +
                  child.users.reduce(
                    (sharedDeveloperResult, user) =>
                      sharedDeveloperResult +
                      (group.children.some((child2) =>
                        this.sharedDevelopers(
                          user,
                          increment,
                          child,
                          child2,
                          null,
                        ),
                      ) &&
                        (input.settings?.sharedDeveloperPenalty ??
                          TENANT_SETTINGS.sharedDeveloperPenalty)),
                    0,
                  ) +
                  Math.max(
                    0,
                    convertDuration(
                      duration - increment.incrementDuration('days') * 8,
                      DurationUnit.HOURS,
                      DurationUnit.PT,
                    ),
                  ) *
                    (input.settings.timePenalty ?? TENANT_SETTINGS.timePenalty))
            );
          }, 0) ?? 0),
        0,
      );
      // The phase level continuity will not be violated here, because devs are always allocated to all phases of a
      // group

      return result + groupsDuration;
    }, 0);
  }

  /**
   * Initializes the team allocation for the groups. No user will be shared between the groups
   * @param project
   * @param groups Array of objects, that has an array of groups and the users, that are possible to be assigned
   * there. If the users are empty, use the global users array (all project users for allocation of the first layer)
   * @param users Default users, if no users per groups array is specified
   * @param settings
   */
  public initTeamAllocation(
    project: ProjectAssignment,
    groups: GroupAssignment[][],
    users?: UserWithProd[],
    settings?: SettingsDto,
  ) {
    project.increments.forEach((currentIncrement, index) => {
      const currentIncrementGroups = groups[index];
      // reverse increment order to place the last increment in first place
      const groupsOfPreviousIncrements = groups
        .slice(0, index)
        .reverse()
        .flat();
      let alreadyAllocatedUser: string[] = [];
      if (groupsOfPreviousIncrements.length) {
        // assign users of previous increment groups to current, because of increment continuity
        // the increments are now in descending order of their incrementNumber, so the newest increment is the first in
        // the array. Flatten the modules array to be able to find the latest allocation of a module with find()
        const previousGroups = groupsOfPreviousIncrements.flatMap(
          (inc) => inc.children,
        );
        currentIncrementGroups
          .flatMap((value) => value.children)
          .forEach((module) => {
            const prevModule = previousGroups.find(
              (group) => group.id === module.id,
            );
            if (!prevModule) {
              return;
            }
            // assign users to where they were before. Because of phase level continuity, assign them to all phases
            module.users = prevModule.users.map((user) => {
              module.phases.forEach((phase) =>
                // add slots
                this.addSlotForGroup(
                  user,
                  module,
                  currentIncrement,
                  phase,
                  settings,
                ),
              );
              return user;
            });
            alreadyAllocatedUser = alreadyAllocatedUser.concat(
              module.users.map((user) => user.id),
            );
          });
      }
      currentIncrementGroups.forEach((parent) => {
        const userForLoop = (parent.users?.length && parent.users) || users;
        this.initDeveloperAllocationForModules(
          // only use those users, that are not already assigned
          (userForLoop ?? []).filter(
            (user) => !alreadyAllocatedUser.includes(user.id),
          ),
          currentIncrement,
          parent,
          parent.children,
          settings,
        );

        parent.children.forEach((child, _, childArray) => {
          if (child.teamSize <= child.users.length) {
            // if it is like wanted teamSize, perfect
            return;
          }
          // if there are users missing, try to fix it
          // first try: allocate remaining experts that are not allocated
          let remainingExperts = userForLoop.filter(
            (user) =>
              user.isExpert &&
              !childArray.some((c) => c.users.some((u) => u.id === user.id)),
          );
          this.allocateDevelopersToGroups(
            remainingExperts,
            currentIncrement,
            parent,
            [child],
          );
          if (child.teamSize <= child.users.length) {
            // if it is like wanted teamSize, perfect
            return;
          }
          // second try: switch experts of child groups
          // get an expert from another child that has prod > 0 for this child and check if there is a remaining
          // expert to swap
          const possibleUsers: {
            user: UserWithProd;
            group: GroupAssignment;
          }[] = [];
          childArray.some((child1) => {
            const user1 = child1.users.find((user) =>
              this.prodForGroup(user, currentIncrement, child),
            );
            if (!user1) {
              return false;
            }
            // reassign remaining experts. Some experts could have been allocated
            remainingExperts = remainingExperts.filter(
              (user) =>
                !childArray.some((c) => c.users.some((u) => u.id === user.id)),
            );
            const user2 = remainingExperts.find((expert) =>
              this.prodForGroup(expert, currentIncrement, child1),
            );
            if (!user2) {
              // collect possible users
              possibleUsers.push({ user: user1, group: child1 });
              return false;
            }
            this.moveDeveloper(
              user1,
              currentIncrement,
              child1,
              child,
              settings,
            );
            this.allocateUserToGroup(user2, currentIncrement, child1, settings);
            // do this, until the child has its teamSize, or the loop is over
            return !(child.teamSize - child.users.length);
          });
          if (child.teamSize <= child.users.length) {
            // if it is like wanted teamSize, perfect
            return;
          }
          // if still not full team
          // third try: share developer among groups of the same level and beyond from possibleUsers array
          this.sortDevsForProd(
            possibleUsers,
            currentIncrement,
            child,
            undefined,
            true,
            (arg) => arg.user,
          );
          possibleUsers.some((user) => {
            this.shareDeveloper(
              user.user,
              currentIncrement,
              user.group,
              child,
              settings,
            );
            return !(child.teamSize - child.users.length);
          });
          // If the child is still missing team members, the manager has to adjust the allocation manually
        });
      });

      // don't continue for whole hierarchy. This is performed later on
    });
  }

  private moveDeveloper(
    user: UserWithProd,
    increment: IncrementAssignment,
    oldGroup: GroupAssignment,
    newGroup: GroupAssignment,
    settings: SettingsDto,
  ) {
    this.removeUserFromGroup(user, increment.id, oldGroup);
    this.allocateUserToGroup(user, increment, newGroup, settings);
  }

  /**
   *
   * @param dev
   * @param increment
   * @param group1 Initial group the user is assigned to
   * @param adjustFactor A number to use to adjust the allocation
   * @private
   */
  private splitDeveloperAllocation(
    dev: UserWithProd,
    increment: IncrementAssignment,
    group1: GroupAssignment,
    adjustFactor: number = 0,
  ) {
    // get all slots of group1 in this increment
    const parentSlots = dev.slots.filter(
      (slot) => slot.moduleId === group1.id && increment.id === increment.id,
    );
    // sum the allocation rates
    const allocation = parentSlots.reduce(
      (result, slot) => result + slot.allocation,
      0,
    );
    // and adjust allocation evenly and mind the new slots. The rates can be adjusted later on in perturb, to
    // optimize allocation of parents and children
    parentSlots.forEach(
      (slot) =>
        (slot.allocation = allocation / (parentSlots.length + adjustFactor)),
    );
  }

  private shareDeveloper(
    dev: UserWithProd,
    increment: IncrementAssignment,
    group1: GroupAssignment,
    group2: GroupAssignment,
    settings: SettingsDto,
  ) {
    this.splitDeveloperAllocation(
      dev,
      increment,
      group1,
      group2.phases?.length,
    );
    this.allocateUserToGroup(dev, increment, group2, settings);
  }

  // TODO: One big problem is rescheduling. How to solve? Or ignore for now?
  /**
   * Alters the current allocation of users to groups IN PLACE. Make a copy of them before
   * @param input
   * @private
   */
  private perturbTeam(input: {
    increments: IncrementAssignment[];
    groups: GroupAssignment[][];
    allUsers: UserWithProd[];
    settings: SettingsDto;
  }) {
    if (input.allUsers.length < 2) {
      // if there are less than two devs, there cannot be any improval
      return input;
    }
    const groupRetVal = input.groups.map((group) =>
      group.map((parent) => parent.clone() as GroupAssignment),
    );
    // Three perturbing operations are used:
    // - Exchange: A user that is not allocated to any group in this project, replaces another developer
    // - Swap: Two developers are swapped between groups of the same parent
    // - Change participation rate, only if there are not enough developers
    // select a random groups and make a copy
    // index of a random increment
    const incrementIndex: number = this.getIndexOfValues(groupRetVal);

    // index of a random "parent group". It will have children
    const parentIndex = randInt(groupRetVal[incrementIndex].length - 1);

    // index of a random child-group
    const childIndex1 = randInt(
      groupRetVal[incrementIndex][parentIndex].children.length - 1,
    );
    // select that group
    const group1 =
      groupRetVal[incrementIndex][parentIndex].children[childIndex1];

    // get random user of group 1. No need for a clone because it already is
    const user1: UserWithProd = group1.users[randInt(group1.users.length - 1)];

    // chance, to exchange one of all users with user1 not regarding any other information
    if (
      this.exchangeWithRandomUser(
        user1,
        input.increments[incrementIndex],
        group1,
        input.allUsers,
        input.settings,
        input.settings.randomness,
      )
    ) {
      return {
        ...input,
        groups: groupRetVal,
      };
    }

    // the array is a copy, but the pointers are on both arrays now
    const possibleGroups =
      groupRetVal[incrementIndex][parentIndex].children.slice();

    // remove the group from before
    possibleGroups.splice(childIndex1, 1);

    // check if user is allocated to parent, so the participation rate could be changed
    if (
      groupRetVal[incrementIndex][parentIndex].users?.some(
        (user) => user.id === user1?.id,
      )
    ) {
      possibleGroups.push(groupRetVal[incrementIndex][parentIndex]);
    }

    // if no other possible group can be found, abort execution
    if (!possibleGroups.length) {
      return input;
    }

    // index of another random group
    const childIndex2 = randInt(possibleGroups.length - 1);
    // select that group and make a copy
    const group2 = possibleGroups[childIndex2];
    const isParent = group1.parentId === group2.id;
    // get the user from parent or random user of group 2. No need for a clone because it already is
    const user2: UserWithProd = isParent
      ? group2.users.find((user) => user.id === user1.id)
      : group2.users[randInt(group2.users.length - 1)];

    this.perturbGroups(
      input.allUsers,
      group1,
      user1,
      input.increments[incrementIndex],
      group2,
      user2,
      input.increments[incrementIndex],
      input.settings,
      isParent,
    );

    return {
      ...input,
      groups: groupRetVal,
    };
  }

  private getIndexOfValues(values: any[][], minLength: number = 1) {
    if (!values) {
      return undefined;
    }
    let incrementIndex: number = undefined;
    // try at maximum 3 times to get a random increment with groups to optimize
    for (let i = 0; i < 3; i++) {
      const possibleInc = randInt(values.length - 1);
      // has groups, perfect, otherwise, try again
      if (values[possibleInc].length >= minLength) {
        incrementIndex = possibleInc;
        break;
      }
    }
    // if no increment was found, collect information about which increments have groups and select one of it
    if (incrementIndex === undefined) {
      const incrementIndices = values
        .map((groups, index) => (groups.length ? index : -1))
        .filter((index) => index > -1);
      // some increment will have a group
      incrementIndex = incrementIndices[randInt(incrementIndices.length - 1)];
    }
    return incrementIndex;
  }

  private perturbGroups(
    allUsers: UserWithProd[],
    group1: GroupAssignment,
    user1: UserWithProd,
    increment1: IncrementAssignment,
    group2: GroupAssignment,
    user2: UserWithProd,
    increment2: IncrementAssignment = increment1,
    settings?: SettingsDto,
    isParent: boolean = group1.parentId === group2.id,
  ) {
    // if both are undefined, both groups have no users, so return input
    if (!(user1 || user2)) {
      return;
    }

    // if one user is undefined, set both users to the same, to share them and change participation rate afterward,
    // unless the user has productivity in both groups
    if (
      !(user1 && user2) &&
      ((user1 &&
        this.prodForGroup(user1, increment2, group2, undefined, !isParent)) ||
        (user2 && this.prodForGroup(user2, increment1, group1)))
    ) {
      this.shareDeveloper(
        user1 ?? user2,
        user1 ? increment1 : increment2,
        user1 ? group1 : group2,
        user1 ? group2 : group1,
        settings,
      );
      user1 = user1 ?? user2;
      user2 = user2 ?? user1;
    }

    // both users are set, so check if they are the same. If so, change participation rate
    if (user1?.id === user2?.id) {
      const [slots1, slots2] = [
        user1.slots.filter(
          (slot) =>
            slot.incrementId === increment1.id && slot.moduleId === group1.id,
        ),
        user2.slots.filter(
          (slot) =>
            slot.incrementId === increment2.id && slot.moduleId === group2.id,
        ),
      ];
      const [rate1, rate2] = [
        slots1.reduce((result, slot) => result + slot.allocation ?? 0, 0),
        slots2.reduce((result, slot) => result + slot.allocation ?? 0, 0),
      ];
      const fullRate = rate1 + rate2;
      const newRate1 = fullRate * Math.random();
      const newRate2 = fullRate - newRate1;
      [
        { slots: slots1, newRate: newRate1, oldRate: rate1 },
        { slots: slots2, newRate: newRate2, oldRate: rate2 },
      ].forEach((slotArray) =>
        slotArray.slots.forEach(
          (slot) =>
            // assign allocation the same percentage of the old rate
            (slot.allocation =
              slot.allocation > 0
                ? slotArray.newRate * (slot.allocation / slotArray.oldRate)
                : slotArray.newRate),
        ),
      );
      // do not share the developer in any other increment. It might violate the increment continuity
      // constraint, but also increase the shared developer penalty
    } else if (!(user1 && user2)) {
      // if one user is undefined, exchange the user with one, that is not allocated to any other
      // users are not the same, but one is still undefined
      const randomUserIndex = randInt(allUsers.length - 1);
      // select a random user and make a copy, to not alter any solution with a pointer to this user
      const randomUser = allUsers[randomUserIndex].clone() as UserWithProd;
      allUsers[randomUserIndex] = randomUser;
      this.removeUserFromGroup(
        user1 ?? user2,
        (user1 ? increment1 : increment2).id,
        user1 ? group1 : group2,
      );
      this.allocateUserToGroup(
        randomUser,
        user1 ? increment1 : increment2,
        user1 ? group1 : group2,
        settings,
      );
    } else {
      // now both users have a value
      // note: group2 cannot be the parent, because if it were, both users are the same
      // don't change them in every increment to not force solutions
      this.removeUserFromGroup(user1, increment1.id, group1);
      this.removeUserFromGroup(user2, increment2.id, group2);
      this.allocateUserToGroup(user1, increment2, group2, settings);
      this.allocateUserToGroup(user2, increment1, group1, settings);
    }
  }

  // private perturbIndividual(...args: any) {}

  public async generateTeamForSingleProject(
    projectId: string,
    user: User,
    settings?: SettingsDto,
  ) {
    const { project, users } = await this.initialize(projectId, user);
    // =============== optimize each layer
    project.allocationResult = this.optimizeByLayers(
      project,
      users,
      project.increments,
      settings,
    );
    // and return the result
    return project;
  }

  private optimizeByLayers(
    project: ProjectAssignment,
    users: UserWithProd[],
    increments: IncrementAssignment[],
    settings?: SettingsDto,
    workingLayer: GroupAssignment[][] = increments.map((inc) =>
      inc.modules?.length
        ? [
            new Group({
              children: inc.modules,
            }) as GroupAssignment,
          ]
        : [],
    ),
  ) {
    const result: GroupAssignment[][] = increments.map(() => []);
    // Do ASA until workingLayer has no groups with children left
    while (workingLayer.some((inc) => inc.length)) {
      this.initTeamAllocation(project, workingLayer, users, settings);
      const optimizedResult = this.genericASA(
        {
          increments,
          groups: workingLayer,
          allUsers: users,
          settings,
        },
        this.cost,
        this.perturbTeam,
        settings?.similarResultCount ?? 8,
        settings?.worseResultCount ?? 8,
        settings?.innerLoopCount ?? 200,
        settings?.alpha ?? 0.95,
        settings?.initialTemperature ?? 100,
      );
      // TODO: Now optimize individual allocation, to indicate which user can be allocated to any child
      // the parents should now be fully optimized
      optimizedResult.groups.forEach((optimizedGroups, incrementIndex) => {
        // now set those children as new working layer, that have children on their side. The others, cannot be
        // optimized anymore, so apply them to the result
        const [nextLayer, optimized] = this.getLayerToOptimize(
          optimizedGroups.flatMap((group) => group.children ?? []),
        );
        const newArr = optimizedGroups.concat(optimized);
        // apply result
        result[incrementIndex].push(
          ...newArr.map((group) => {
            // remove the children from the result
            delete group.children;
            /* group.users =
              group.users?.filter(
                (user) =>
                  // if the user is not allocated to the group, reduce the result
                  group.issues?.some((issue) => issue.userId === user.id) ||
                  (this.removeUserFromGroup(user, inc.id, group) && false),
              ) ?? []; /**/
            return group;
          }),
        );
        workingLayer[incrementIndex] = nextLayer;
      });
      // continue layer loop
    }
    return result;
  }

  /**
   * First is the new layer, the second is the already optimized
   * @param input
   * @private
   */
  private getLayerToOptimize(input: GroupAssignment[]) {
    return splitArray(input, (group) => !!group?.children?.length);
  }

  private async initMultipleAllocation(projectIds: string[], user: User) {
    if (!projectIds.length) {
      return;
    }
    // get all projects and sort them
    const projects = (
      await Promise.all(
        projectIds.map(async (projectId) => {
          // get the project
          const project = await this.getProject(projectId, user);
          // create the hierarchy of the project elements
          return this.sortItems(project);
        }),
      )
    )
      // filter for those projects, that have groups on the increments to optimize
      .filter((project) =>
        project.increments.some((inc) => inc.modules?.length),
      ) as ProjectAssignment[];
    // sort the projects array, according to start and end dates
    const end = projects.sort((projectA, projectB) =>
      projectA.endOfProject?.toMillis() > projectB.endOfProject?.toMillis()
        ? 1
        : 0,
    )[0]?.endOfProject;
    projects.sort((projectA, projectB) =>
      projectA.startOfProject?.toMillis() > projectB.startOfProject?.toMillis()
        ? 1
        : 0,
    );
    const users = (await this.getPotentialDevs(
      user,
      projects[0]?.startOfProject,
      end,
    )) as UserWithProd[];
    return {
      projects,
      users,
    };
  }

  private perturbMultipleTeams(input: {
    projects: ProjectAssignment[];
    users: UserWithProd[];
    settings: SettingsDto;
  }) {
    const copy = input.projects.map(
      (project) => project.clone() as ProjectAssignment,
    );
    const project1Index = randInt(copy.length - 1);
    const project1 = copy[project1Index];

    const increment1Index = this.getIndexOfValues(
      project1.increments.map((inc) => inc.modules),
    );

    const group1 =
      project1.increments[increment1Index].modules[
        randInt(project1.increments[increment1Index].modules.length - 1)
      ];

    // get random user of group 1. No need for a clone because it already is
    const user1: UserWithProd = group1.users[randInt(group1.users.length - 1)];

    if (
      this.exchangeWithRandomUser(
        user1,
        project1.increments[increment1Index],
        group1,
        input.users,
        input.settings,
        input.settings.randomness,
      )
    ) {
      return {
        ...input,
        // overwrite projects with the altered copy
        projects: copy,
      };
    }

    const possibleProjects = copy.slice();
    possibleProjects.slice(project1Index, 1);

    // maybe there is only one project to optimize, so in this case, get project1 again and get another group from the
    // selected increment for "normal" team-allocation
    const project2 = possibleProjects[randInt(possibleProjects.length - 1)];

    const increment2Index =
      this.getIndexOfValues(project2?.increments.map((inc) => inc.modules)) ??
      increment1Index;

    const possibleGroups = (project2 ?? project1).increments[
      increment2Index
    ].modules.filter((group) => group.id !== group1.id);

    if (!possibleGroups.length) {
      return input;
    }

    const group2 = possibleGroups[randInt(possibleGroups.length - 1)];

    // get random user of group 1. No need for a clone because it already is
    const user2: UserWithProd = group2.users[randInt(group2.users.length - 1)];

    this.perturbGroups(
      input.users,
      group1,
      user1,
      project1.increments[increment1Index],
      group2,
      user2,
      (project2 ?? project1).increments[increment2Index],
      input.settings,
      false,
    );

    return {
      ...input,
      // overwrite projects with the altered copy
      projects: copy,
    };
  }

  private exchangeWithRandomUser(
    user1: UserWithProd,
    increment: IncrementAssignment,
    group1: GroupAssignment,
    possibleUsers: UserWithProd[],
    settings: SettingsDto,
    randomness: number = 33,
  ) {
    // chance, to exchange one of all users with user1 not regarding any other information
    if (!user1 || (randInt(1, 100) <= randomness ?? 33)) {
      let retVal = false;
      if (
        user1 &&
        1 -
          Math.exp(
            -group1.users.length /
              (group1.teamSize ??
                (group1.teamSize = this.getMinRecommendedTeamSize(
                  increment,
                  group1,
                ))),
          ) >
          Math.random()
      ) {
        this.removeUserFromGroup(user1, increment.id, group1);
        retVal = true;
      }
      if (Math.exp(-group1.users.length / group1.teamSize) > Math.random()) {
        this.allocateUserToGroup(
          possibleUsers[randInt(possibleUsers.length - 1)],
          increment,
          group1,
          settings,
        );
        retVal = true;
      }
      return retVal;
    }
    return false;
  }

  private multipleTeamsCost(input: {
    projects: ProjectAssignment[];
    users: UserWithProd[];
    settings?: SettingsDto;
  }) {
    return input.projects.reduce(
      (result, project) =>
        result +
        this.cost({
          settings: project.settings,
          increments: project.increments,
          groups: project.increments.map((inc) => inc.modules),
          allUsers: input.users,
        }),
      0,
    );
  }

  public async generateTeamForMultipleProjects(
    projectIds: string[],
    user: User,
    settings: SettingsDto = TENANT_SETTINGS,
  ) {
    const init = await this.initMultipleAllocation(projectIds, user);
    if (!init.projects.length) {
      return init.projects;
    }
    // init for every project the team allocation
    init.projects.forEach((project) => {
      const workingLayer: GroupAssignment[][] = project.increments.map((inc) =>
        inc.modules?.length
          ? [
              new Group({
                children: inc.modules,
              }) as GroupAssignment,
            ]
          : [],
      );
      this.initTeamAllocation(project, workingLayer, init.users, settings);
    });
    // optimize the first layer of each project
    const optimized = this.genericASA(
      {
        projects: init.projects,
        users: init.users,
        settings,
      },
      this.multipleTeamsCost,
      this.perturbMultipleTeams,
      settings.similarResultCount ?? 8,
      settings.worseResultCount ?? 8,
      settings.innerLoopCount ?? 200,
      settings.alpha ?? 0.95,
      settings.initialTemperature ?? 100,
    );
    return optimized.projects.map((project) => {
      const layers = project.increments.map((inc) =>
        this.getLayerToOptimize(inc.modules),
      );
      project.allocationResult = this.optimizeByLayers(
        project,
        init.users,
        project.increments,
        settings,
        layers.map((layer) => layer[0]),
      ).map((groupsOfIncrement, incrementIndex) =>
        layers[incrementIndex][1].concat(groupsOfIncrement),
      );
      return project;
    });
  }

  /**
   * ASA Algorithm used in "Constraint based human resource allocation in software projects - Kang et al. 2011"
   *
   * @param initialSolution The initial solution
   * @param cost The cost function. It takes one argument of the type of the initial solution and returns a number to
   * minimize
   * @param perturb The perturb function. It takes one argument of the type of the initial solution alters it and
   * returns it
   * @param M First control number of the outer loop. Controls how often a similar result can be found after inner loop
   * has ended, to end the outer loop (No progress, not worse, not better)
   * @param N Second control number of the outer loop. Controls how often a worse result can be found in a row the inner
   * loop to end outer loop (Nothing better or even similar)
   * @param L Iterations of the inner loop, to alter the result
   * @param alpha Cooling factor, if a new solution is applied
   * @param initialTemperatur
   * @private
   */
  private genericASA<T>(
    initialSolution: T,
    cost: (args: T) => number,
    perturb: (args: T) => T,
    M = 8,
    N = 8,
    L = 8,
    alpha = 0.95,
    // Temperature
    initialTemperatur = 100,
  ) {
    let T = initialTemperatur;
    // set working solutions
    let current = initialSolution;
    let best = current;
    // define cost
    let costBest = cost.call(this, best);
    // Init counter and begin outer loop
    let counter1 = 0;
    let counter2 = 0;
    do {
      // save some computing time by not always calculating the cost again
      const costOld = cost.call(this, current);
      let costCurrent = costOld;
      let check = false;
      // inner loop for altering the result with perturb
      for (let i = 0; i < L; i++) {
        const newSolution = perturb.call(this, current);
        const costNew = cost.call(this, newSolution);
        if (
          // new solution is accepted, if the cost is lower than the current
          costNew < costCurrent ||
          // Otherwise, accept it with a certain percentage. The lower the difference, the higher the chance
          Math.exp((costCurrent - costNew) / T) > Math.random()
        ) {
          current = newSolution;
          costCurrent = costNew;
        }
        // if the current solution is better than the best, accept it as best solution
        if (costCurrent < costBest) {
          best = current;
          costBest = costCurrent;
          counter2 = 0;
          check = true;
        } else {
          counter2++;
        }
      }
      // better solution was found, decrease the temperature
      if (check || costCurrent < costOld) {
        T *= alpha;
      }
      // the same or similar solution was found
      if (costCurrent === costOld) {
        counter1++;
      } else {
        counter1 = 0;
      }
      // break, if multiple times no better solution was found
    } while (counter1 <= M && counter2 <= N);
    return best;
  }

  /**
   * Returns the estimated time by project managers in the increment for the group in hours, by adding the estimated time for
   * every issue
   * @param increment The increment
   * @param group The Group in that increment. If undefined, the increments issues of the phase are used
   * @param phase The Phase of the interface. If undefined, all phases are used
   * @param withChildren indicates, weather the children of the group should be considered
   */
  public workload(
    increment: Increment,
    group?: Group,
    phase?: Phase,
    withChildren: boolean = true,
  ): number {
    // if group provided, calculate the workload of the group in the increment and phase or all phases if phase is
    // undefined
    if (group) {
      return (
        // take the maximum of the duration of the group itself or the issues
        Math.max(
          // assume for now, that the duration is equal in all phases, so divide with number of phases of the increment
          (group.normalizedDuration ?? 0) /
            ((!!phase &&
              group.phases?.filter(
                (groupPhase) => groupPhase.incrementId === increment.id,
              ).length) ||
              1),
          // sum all issues of the group
          (group.issues ?? [])
            .filter(
              (issue: Issue) =>
                // filter for phase
                (!phase || issue.phaseId === phase.id) &&
                // and for increment
                issue.incrementId === increment.id,
            )
            .reduce(
              (prev: number, curr: Issue) => prev + curr.normalizedDuration,
              0,
            ),
        ) +
        // sum up all child groups workload if wanted
        ((withChildren && group.children) || []).reduce(
          (prev, curr) => prev + this.workload(increment, curr, phase),
          0,
        )
      );
    }
    // if group is undefined, calculate workload of whole increment in the phase
    let iss = increment.issues ?? [];
    if (phase) {
      iss = iss.filter((issue: Issue) => issue.phaseId === phase.id);
    }
    return iss.reduce(
      (previousValue, currentValue) =>
        previousValue + (currentValue.normalizedDuration ?? 0),
      0,
    );
  }

  /**
   * The group profile is the sum of all skills of the modules issues in that increment
   * @param increment
   * @param module
   * @param phaseId
   * @param withChildren
   */
  public moduleProfile(
    increment: Increment,
    module?: Group,
    phaseId?: string,
    withChildren: boolean = true,
  ): string[] {
    return (
      // already unique
      module?.groupProfile(increment.id, phaseId, withChildren) ??
      // because many issues may require the same skill, make array values unique
      toUniqueArray(
        (
          (!!phaseId &&
            increment.issues.filter((iss) => iss.phaseId === phaseId)) ||
          increment.issues
        )
          .map((issue: Issue) => issue.skills)
          .flat(),
      )
    );
  }

  /**
   * Returns the productivity of a developer for a given profile
   * @param developer
   * @param moduleProfile
   */
  public prodForProfile(developer: User, moduleProfile: string[]): number {
    // group profile are only skill names, whereas user skills are skill names and skill level
    return (
      moduleProfile.reduce((prev: number, curr: string) => {
        const { level } = User.extractSkill(developer, curr);
        // if user has max level in all required skills, he has 100% productivity
        return prev + level;
      }, 0) /
      (MAX_SKILL_LEVEL * (moduleProfile.length || 1))
    );
  }

  private prodForGroup(
    developer: UserWithProd,
    increment: Increment,
    group: Group,
    phaseId?: string,
    withChildren: boolean = true,
  ) {
    const key =
      `${increment.id}_${group.id}` +
      (phaseId ? `_${phaseId}` : '') +
      (withChildren ? '' : '_OWN');
    return (
      (developer.prods ?? (developer.prods = {}))[key] ??
      (developer.prods[key] =
        this.prodForProfile(
          developer,
          this.moduleProfile(increment, group, phaseId, withChildren),
        ) *
        (1 - developer.plannedAmount(increment.end, increment.start)))
    );
  }

  /**
   * Returns the participation rate of the developer in the increment and phase. If userSlot is undefined, it means
   * any slot
   * @param developer
   * @param increment
   * @param phase
   * @param userSlot
   */
  public slot(
    developer: User,
    increment: Increment,
    phase?: Phase,
    userSlot?: Slot,
  ): number {
    // These slots have a participation rate of 100% per phase if summed up
    const incrementPhaseSlots = developer.slots.filter(
      (slot: Slot) =>
        // first get slots of the increment and phase
        slot.incrementId === increment.id &&
        (!(phase && slot.phaseId) || slot.phaseId === phase.id),
    );
    // return slot
    return userSlot
      ? // if the slot is not found in the array, it is not in the phase, so return a participation rate of 0%. Because
        // The allocation is already a percentage, just return it
        incrementPhaseSlots.find((slot: Slot) => slot.id === userSlot.id)
          ?.allocation ?? 0
      : // if userSlot is undefined, sum up the allocations. Should be 100% but maybe not, so get the real value
        incrementPhaseSlots.reduce(
          (result, current) => result + current.allocation,
          0,
        );
  }

  public allocation(
    developer: User,
    increment?: Increment,
    module?: Group,
    phase?: Phase,
    slot?: Slot,
  ): 0 | 1 {
    function checkSlot(slotToCheck: Slot) {
      return (
        (!increment || slotToCheck.incrementId === increment.id) &&
        (!module || slotToCheck.moduleId === module.id) &&
        (!phase || slotToCheck.phaseId === phase.id)
      );
    }
    if (slot) {
      return checkSlot(slot) ? 1 : 0;
    }
    return developer.slots.some((userSlot: Slot) => checkSlot(userSlot))
      ? 1
      : 0;
  }

  public duration(
    increment: IncrementAssignment,
    module?: Assignment<Group>,
    phase?: Phase,
    withChildren: boolean = true,
  ): number {
    const wload = this.workload(increment, module, phase, withChildren);
    return (
      wload /
      // because division by 0 is not allowed (in case there are no users), use 1 as default
      ((module?.users ?? increment.users ?? []).reduce<number>(
        (result: number, user: UserWithProd) => {
          const res =
            (user.slots
              .filter(
                (slot: Slot) =>
                  slot.incrementId === increment.id &&
                  slot.moduleId === module.id &&
                  (!(phase && slot.phaseId) || slot.phaseId === phase.id),
              )
              .reduce<number>((slotSum: number, slot: Slot) => {
                return (
                  slotSum +
                  this.allocation(user, increment, module, phase, slot) *
                    this.slot(user, increment, phase, slot)
                );
              }, 0) /
              100) *
            this.prodForGroup(user, increment, module, phase?.id, withChildren);
          return result + res;
          // slots of the user
        },
        0,
      ) || 1 / 1000)
    );
  }

  public moduleDuration(
    increment: IncrementAssignment,
    module: Assignment<Group>,
  ): number {
    return module.phases.reduce(
      (prev: number, phase: Phase) =>
        prev + this.duration(increment, module, phase),
      0,
    );
  }

  public incrementDuration(increment: IncrementAssignment) {
    return increment.modules?.length > 0
      ? // assume, that modules are developed in parallel, so use the maximum of group duration
        Math.max(
          ...increment.modules.map((module: GroupAssignment) =>
            this.moduleDuration(increment, module),
          ),
        )
      : // since modules are optional, calculate duration of increment, if the project has no modules defined
        this.duration(increment);
  }

  // ============== CONSTRAINTS ==============
  /**
   * Returns true if the constraint is violated
   * @param developer
   * @param increment
   * @param module
   * @param phase
   */
  public phaseLevelContinuity(
    developer: User,
    increment: Increment,
    module: Group,
    phase: Phase,
  ) {
    const modulePhase = module.phases.find((phase) => phase.id === phase.id);
    // if phase order is 0, there is no phase before, so the constraint cannot be violated
    if (!(modulePhase && modulePhase.order)) {
      return false;
    }
    const phaseBefore = module.phases.find(
      (mPhase) =>
        increment.id === mPhase.incrementId && mPhase.order === phase.order - 1,
    );
    // if the phase before was not found, the constraint is violated
    if (!phaseBefore) {
      return true;
    }
    return (
      // if assigned to a phase, then the developer should be assigned to the phase before. Otherwise, there is an
      // impact in understanding the results of the phase before
      this.allocation(developer, increment, module, phase) !==
      this.allocation(
        developer,
        increment,
        module,
        module.phases[phase.order - 1],
      )
    );
  }

  /**
   * Returns the number of times, the constraint is violated
   * @param users The users to check
   * @param increment1 The first increment to check
   * @param increment2 The second increment to check
   * @param group An optional group, where the devs should be assigned
   * @param phase An optional phase, where the devs should be assigned
   */
  private incrementContinuity(
    users: UserWithProd[],
    increment1: IncrementAssignment,
    increment2: IncrementAssignment,
    group?: Group,
    phase?: Phase,
  ) {
    // if one of the increments is undefined, no violation possible
    if (!(increment1 && increment2)) {
      return 0;
    }
    return users.reduce((result, dev1, index, array) => {
      // if last user, nothing to compare
      if (array.length === index + 1) {
        return result;
      }

      return (
        result +
        array.slice(index + 1).filter((dev2) => {
          const dev1CurrentAllocation = this.allocation(
            dev1,
            increment1,
            group,
            phase,
          );
          const dev1PreviousAllocation = this.allocation(
            dev1,
            increment2,
            group,
            phase,
          );
          // if no difference, everything is ok
          if (dev1CurrentAllocation === dev1PreviousAllocation) {
            return true;
          }
          const dev2CurrentAllocation = this.allocation(
            dev2,
            increment1,
            group,
            phase,
          );
          const dev2PreviousAllocation = this.allocation(
            dev2,
            increment2,
            group,
            phase,
          );
          // if two devs were swapped, the constraint is violated
          return (
            dev1CurrentAllocation === dev2PreviousAllocation &&
            dev1PreviousAllocation === dev2CurrentAllocation
          );
        }).length
      );
    }, 0);
  }

  /**
   * No developers should be shared between moduleGroups in the same increment and phase
   * @param developer
   * @param group1
   * @param group2
   * @param increment
   * @param phase
   */
  public sharedDevelopers(
    developer: User,
    increment: Increment,
    group1: Group,
    group2: Group,
    phase: Phase,
  ) {
    if (
      // if there are no groups
      !group1 ||
      !group2 ||
      // or if they are the same group
      group1.id === group2.id
    ) {
      // then the constraint is not violated
      return false;
    }

    return (
      // if they are different, the constraint is violated (true) if the developer is allocated to both
      this.allocation(developer, increment, group1, phase) ===
      this.allocation(developer, increment, group2, phase)
    );
  }

  /**
   * Returns the amount of skills, that are missing in the module - user coverage. So if it returns 0 (equals false) it
   * is not violated, otherwise it equals true and the constraint is violated. Cannot be less than 0
   * @private
   */
  private skillCoverageConstraint(users: User[], skills: string[]) {
    return skills.filter((skill) => !users.some((user) => user.hasSkill(skill)))
      .length;
  }

  /**
   * If true, the constraint is violated
   * @param developers
   * @param increment
   * @param module
   * @param phase
   */
  public numberOfDeveloper(
    developers: User[],
    increment: IncrementAssignment,
    module?: GroupAssignment,
    phase?: Phase,
  ) {
    return (
      developers.reduce(
        (result, dev) =>
          result + this.allocation(dev, increment, module, phase),
        0,
      ) > this.getMinRecommendedTeamSize(increment, module, phase)
    );
  }

  /**
   * Calculates the percentage of efficiency of teams, using the formula from "Team-size and productivity in systems
   * development" by Fried 1991
   * @param teamSize
   * @private
   */
  private teamEfficiency(teamSize: number): number {
    return 100 * (0.55 - 0.0002 * ((teamSize * (0.75 * teamSize)) / 6));
  }

  /**
   * Returns the defined teamSize of the Project in the Increment, module and Phase
   * @param increment
   * @param module
   * @param phase
   */
  public appNum(increment?: Increment, module?: Group, phase?: Phase): number {
    return (
      // return teamSize of the modules phase, if set
      ((!!phase &&
        module?.phases?.find((mPhase: Phase) => mPhase.id === phase.id)
          .teamSize) ||
        // otherwise, use teamSize of module
        module?.teamSize) ??
      // or increments teamSize
      increment.teamSize ??
      // default is 0 (equals false)
      0
    );
  }

  public numberOfExperts(
    increment: Assignment<Increment>,
    group?: Assignment<Group>,
    phase?: Assignment<Phase>,
  ): number {
    return (phase?.users ?? group?.users ?? increment.users ?? []).filter(
      (user: User) => user.isExpert,
    ).length;
  }

  /**
   * Returns true, if the constraint is violated
   * @param increment
   * @param phase
   * @param moduleGroup
   */
  public noviceTeam(
    increment: Assignment<Increment>,
    moduleGroup?: Assignment<Group>,
    phase?: Assignment<Phase>,
  ): boolean {
    return this.numberOfExperts(increment, moduleGroup, phase) < 1;
  }

  public minExpertCount(group: Group): number {
    return Math.max(
      group.children?.length ?? 0,
      ...(group.children?.map((child) => this.minExpertCount(child)) ?? []),
    );
  }

  /**
   * Calculates a teamSize, based on the start and end dates of the issues
   * @param increment
   * @param module
   * @param phase
   * @private
   */
  private getMinRecommendedTeamSize(
    increment?: IncrementAssignment,
    module?: Group,
    phase?: Phase,
  ) {
    const teamSize = this.appNum(increment, module, phase);
    // The manually defined teamSize is stronger than the recommended calculated one, so return the wanted teamSize, if
    // defined
    if (teamSize) {
      return teamSize;
    }
    const issues: Issue[] = (
      phase?.issues ??
      module?.issues ??
      increment?.issues ??
      []
    ).slice();

    if (issues.length === 0) {
      return 0;
    }
    // I don't know a good way to sort the array to reduce computation effort, so, compare everyone with every one else
    // teamSize has a minimum of 1
    return Math.max(
      increment.end && increment.start
        ? Math.ceil(
            issues.reduce(
              (result, issue) => result + issue.normalizedDuration,
              0,
            ) / // currently the only duration unit is PT, so multiply days with 8 to get working hours
              (increment.end.diff(increment.start).as('days') * 8),
          )
        : 0,
      issues.reduce((currentTeamSize, currentIssue) => {
        return Math.max(
          currentTeamSize,
          // count overlaps of issues with the current issue
          issues.filter(
            (issue) =>
              calculateOverlapDuration(
                currentIssue.start,
                currentIssue.end,
                issue.start,
                issue.end,
                'hours',
              ) > 0,
          ).length,
        );
      }, 1),
    );
  }
}
