import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectDto } from './project.dto';
import { Request, Response } from 'express';
import { Project, ProjectStatus } from './project.entity';
import { ApiResponses } from '../../common/decorators/ApiResponses.decorator';
import {
  PROJECT_ERROR_CREATE,
  PROJECT_ERROR_DELETE,
  PROJECT_ERROR_UPDATE,
  PROJECT_ERROR_GENERATION,
} from './project.enums';
import { ApiBody, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserToken } from '../../common/decorators/user.decorator';
import {
  arrayIntersection,
  parseQueryString,
  sortArray,
  toUniqueArray,
  useDefaultValue,
} from '../../helper/helper-functions';
import { User } from '../user/user.entity';
import { key } from '../../common/base.entity';
import { sendMessages } from '../../chatGPT/repository';
import { RES_ERROR_GENERIC, ResException } from '../../common/ResException';
import { UserService } from '../user/user.service';
import { Issue, IssueType } from '../issue/issue.entity';
import { DateTime } from 'luxon';
import { WorkTimeService } from '../work-time/workTime.service';
import { IssueService } from '../issue/issue.service';
import { Concatenate, QueryParams } from '../../helper/Typings';
import { BaseControllerWithTenant } from '../../common/with-tenant/with-tenant.controller';
import { TenantService } from '../tenant/tenant.service';
import { Slot } from '../slot/slot.entity';
import { SlotService } from '../slot/slot.service';
import { SettingsService } from '../settings/settings.service';
import { SettingsDto } from '../settings/settings.dto';
import { initFamilyHierarchy } from '../../common/interfaces/family.interface';

type TeamOptions = {
  missingSkills: string[];
  complete: boolean;
};

type ProjectTeam = {
  team: User[];
  issues: Issue[];
  options: TeamOptions;
};

type TeamGenerationStrategy = 'relevance' | 'bestFit' | 'mostSkills';

class MultiAllocationBody {
  @ApiProperty()
  projects: string[];
  @ApiProperty()
  settings: SettingsDto;
}

@Controller('project')
@ApiTags('Project')
export class ProjectController extends BaseControllerWithTenant<
  Project,
  ProjectDto
> {
  constructor(
    service: ProjectService,
    readonly tenantService: TenantService,
    private readonly userService: UserService,
    private readonly workTimeService: WorkTimeService,
    private readonly issueService: IssueService,
    private readonly slotService: SlotService,
    private readonly settingsService: SettingsService,
  ) {
    super(service, tenantService, Project);
  }

  @Post()
  @ApiResponses(PROJECT_ERROR_CREATE)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Body() body: ProjectDto,
  ) {
    const record = await this.service.create(body, user);
    return super.create(req, res, user, body, record.id);
  }

  @Get()
  @ApiQuery({ name: 'skip', type: 'number', required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({
    name: 'sort',
    type: 'string',
    required: false,
    example: 'createdAt+DESC',
  })
  @ApiQuery({
    name: 'populate',
    type: 'string',
    isArray: true,
    required: false,
  })
  @ApiQuery({ name: key<Project>('name'), type: 'string', required: false })
  async findAll(@Query() query: QueryParams<Project>, @UserToken() user: User) {
    useDefaultValue(query, 'deleted', false);
    this.parseStringBooleanQuery(query, ['deleted']);

    return this.getRecords(user, query);
  }

  @Get(':id/criticalPath')
  @ApiQuery({
    name: key<Issue>('incrementId'),
    required: false,
    type: 'string',
  })
  async getCriticalPath(
    @Param('id') projectId: string,
    @UserToken() user: User,
    @Query(key<Issue>('incrementId')) incrementId?: string,
  ) {
    const issueQuery = this.issueService.createQueryBuilder(user);
    issueQuery
      .andWhere(
        `${issueQuery.alias}.${key<Issue>('projectId')} = :${key<Issue>(
          'projectId',
        )}`,
        {
          [key<Issue>('projectId')]: projectId,
        },
      )
      .leftJoinAndSelect(
        `${issueQuery.alias}.${key<Issue>('previous')}`,
        `${key<Issue>('previous')}`,
      );
    if (incrementId) {
      issueQuery.andWhere(
        `${issueQuery.alias}.${key<Issue>('incrementId')} = :${key<Issue>(
          'incrementId',
        )}`,
        {
          [key<Issue>('incrementId')]: incrementId,
        },
      );
    }
    const issues = await issueQuery.getMany();
    return this.issueService.calculateCriticalPath(issues);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserToken() user: User) {
    return this.getRecord(id, user, this.possibleRelations(user));
  }

  @Post(':id/allocation')
  async allocate(
    @Param('id') id: string,
    @UserToken() user: User,
    @Body() settings?: SettingsDto,
  ) {
    const result = await (
      this.service as ProjectService
    ).generateTeamForSingleProject(id, user, settings);
    result.increments.forEach((inc, index) => {
      inc.modules = initFamilyHierarchy(
        result.allocationResult[index].slice(1),
      );
      delete inc.allModules;
    });
    delete result.modules;
    delete result.allocationResult;
    return result;
  }

  @Post('allocate/multiple')
  async allocateMulti(
    @UserToken() user: User,
    @Body() body: MultiAllocationBody,
  ) {
    const result = await (
      this.service as ProjectService
    ).generateTeamForMultipleProjects(body.projects, user, body.settings);
    result.forEach((project) => {
      project.increments.forEach((inc, index) => {
        inc.modules = initFamilyHierarchy(project.allocationResult[index]);
        delete inc.allModules;
      });
      delete project.modules;
      delete project.allocationResult;
    });
    return result;
  }

  @Patch(':id/save-team')
  async saveProjectTeam(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Body('users') users: string[],
    @UserToken() user: User,
  ) {
    const projectQuery = this.service
      .createQueryBuilder(user)
      .andWhereInIds(id);
    const usersQuery = this.userService
      .createQueryBuilder(user)
      .andWhereInIds(users);
    const [project, usersToAdd] = await Promise.all([
      projectQuery
        .select([
          `${projectQuery.alias}.id`,
          `${projectQuery.alias}.${key<Project>('teamSize')}`,
        ])
        .getOne(),
      usersQuery.select(`${usersQuery.alias}.id`).getMany(),
    ]);

    if (
      !project ||
      (users.length && toUniqueArray(users).length !== usersToAdd.length)
    ) {
      throw new ResException(RES_ERROR_GENERIC.NOT_FOUND);
    }

    await this.service.replaceCollection(id, 'users', usersToAdd);

    if (usersToAdd.length > project.teamSize) {
      await this.service.update(id, user, { teamSize: usersToAdd.length });
    }
    return super.update(req, res, user, id, null, `/project/${id}`);
  }

  @Patch(':id/exchange-user/:oldUserId/:newUserId')
  async exchangeUser(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Param('oldUserId') oldUserId: string,
    @Param('newUserId') newUserId: string,
    @UserToken() user: User,
  ) {
    const oldUserQuery = this.userService
      .createQueryBuilder(user)
      .andWhereInIds(oldUserId);

    const [project, oldUser, newUser] = await Promise.all([
      this.service
        .createQueryBuilder(user)
        .andWhereInIds(id)
        .select('id')
        .getOne(),
      oldUserQuery
        .leftJoinAndSelect(
          `${oldUserQuery.alias}.${key<User>('slots')}`,
          key<User>('slots'),
          `${key<User>('slots')}.${key<Slot>('projectId')} = :projectId`,
          {
            projectId: id,
          },
        )
        .getOne(),
      this.userService
        .createQueryBuilder(user)
        .andWhereInIds(newUserId)
        .select('id')
        .getOne(),
    ]);

    if (!(project && oldUser && newUser)) {
      throw new ResException(RES_ERROR_GENERIC.NOT_FOUND);
    }

    await Promise.all([
      // remove old user from project
      this.service.removeFromCollection(id, 'users', oldUserId),
      // add new user to project
      this.service.addToCollection(id, 'users', { id: newUserId }),
      // move slots from oldUser to the new one
      Promise.all(
        oldUser.slots.map((slot) =>
          this.slotService.update(slot.id, user, {
            userId: newUserId,
          }),
        ),
      ),
    ]);

    return super.update(req, res, user, id, null, `/project/${id}`);
  }

  @Get('generate/teams')
  @ApiQuery({ name: 'skills', isArray: true, type: 'string', required: false })
  @ApiQuery({ name: 'offer', type: 'string', required: false })
  @ApiQuery({ name: 'startDate', type: 'string', required: false })
  @ApiQuery({ name: 'endDate', type: 'string', required: false })
  @ApiQuery({ name: 'teamCount', type: 'number', required: false })
  @ApiQuery({ name: 'teamSize', type: 'number', required: false })
  @ApiQuery({
    name: 'projects',
    type: 'string',
    isArray: true,
    required: false,
    example: ['all'],
  })
  @ApiQuery({
    name: 'strategy',
    type: 'string',
    required: false,
  })
  async generateTeams(
    @UserToken() user: User,
    @Query()
    query: {
      // these are for mocking a project
      skills: string[] | string;
      offer: string;
      startDate: string;
      endDate: string;
      // these two are used every time
      teamCount: number;
      teamSize: number;
      // this is if projects are already defined
      projects: string | string[];
      // strategy
      strategy: TeamGenerationStrategy;
    },
  ): Promise<
    {
      project: Pick<Project, 'id' | 'skills' | 'issues'>;
      teams: ProjectTeam[];
    }[]
  > {
    let queryInfos: Concatenate<
      Project | Issue,
      'skills',
      'startDateSoft' | 'endDateSoft'
    >;

    let projects: Pick<Project, 'id' | 'skills' | 'issues'>[];

    if (query.projects) {
      const projectQuery = this.service.createQueryBuilder(user);
      if (query.projects !== 'all') {
        // query for ids...
        projectQuery.andWhereInIds(query.projects);
      } else {
        // if no ids are provided, get those projects, that have skills defined
        projectQuery
          .andWhere(
            `((${projectQuery.alias}.${key<Project>(
              'skills',
            )} IS NOT NULL AND NOT ${projectQuery.alias}.${key<Project>(
              'skills',
            )} = '') OR (${key<Project>('issues')}.${key<Issue>(
              'skills',
            )} IS NOT NULL AND NOT ${key<Project>('issues')}.${key<Issue>(
              'skills',
            )} = ''))`,
          )
          // and for projects that are not finished
          .andWhere(
            `NOT ${projectQuery.alias}.${key<Project>(
              'status',
            )} = :projectStatus`,
            {
              projectStatus: ProjectStatus.FINISHED,
            },
          )
          // and have no users assigned
          .andWhere(`${key<Project>('users')}.id IS NULL`);
      }
      this.service
        .addLeftJoinAndSelect(
          [
            {
              property: 'users',
              serviceOrQuery: this.userService,
              select: false,
            },
            {
              property: 'issues',
              serviceOrQuery: this.issueService,
              // may not every issue has skills defined
              optionalCondition: `(${key<Project>('issues')}.${key<Issue>(
                'skills',
              )} iS NOT NULL AND NOT ${key<Project>('issues')}.${key<Issue>(
                'skills',
              )} = "")`,
            },
          ],
          projectQuery,
          user,
        )
        .orderBy(`${key<Project>('issues')}.${key<Issue>('startDateSoft')}`)
        // if same startDate, sort for duration ascending
        .addOrderBy(
          `(${key<Project>('issues')}.${key<Issue>(
            'endDateSoft',
          )} - ${key<Project>('issues')}.${key<Issue>('startDateSoft')})`,
        )
        // shortest task first
        .addOrderBy(`${key<Project>('issues')}.${key<Issue>('duration')}`);

      projects = await projectQuery.getMany();
      // to query for all skills with AND and OR, assume that all issues are AND skills and project skills are or skills
      const querySkills = toUniqueArray(
        projects
          .map((project) => project.skills ?? [])
          .flat()
          .concat(
            projects
              .map(
                (project) =>
                  // use join on skills, so they are interpreted as AND skills
                  project.issues?.map((issue) =>
                    sortArray(issue.skills).join(','),
                  ) ?? [],
              )
              .flat(),
          ),
      );
      queryInfos = {
        skills:
          querySkills.length > 0 ? querySkills : parseQueryString(query.skills),
      };
    } else {
      queryInfos = {
        skills: parseQueryString(query.skills),
      };

      const createDto = {
        id: '1',
        skills: queryInfos.skills,
        startDate: query.startDate
          ? DateTime.fromISO(query.startDate)
          : undefined,
        endDate: query.endDate ? DateTime.fromISO(query.endDate) : undefined,
      };
      for (const key in createDto) {
        !createDto[key] && delete createDto[key];
      }
      // this would be project in draft
      projects = [createDto];
    }
    delete query.skills;

    if (queryInfos.skills.length === 0) {
      throw new ResException(PROJECT_ERROR_GENERATION.MISSING_SKILLS);
    }

    const originalUserQuery = this.userService.createQueryBuilder(user);

    originalUserQuery.andWhere(
      `${originalUserQuery.alias}.${key<User>('deleted')} = false`,
    );

    this.userService.addLeftJoinAndSelect(
      [
        {
          property: 'workTimes',
          serviceOrQuery: this.workTimeService,
        },
        {
          // projects and issues are needed, to see when a user is free again
          property: 'projects',
          serviceOrQuery: this.service,
        } /**/,
        {
          property: 'issues',
          serviceOrQuery: this.issueService,
        },
      ],
      originalUserQuery,
      user,
    );

    for (const key in queryInfos) {
      this.userService.parseWhereProperty(
        originalUserQuery,
        key,
        queryInfos[key],
      );
    }
    const users = await originalUserQuery.getMany();

    const retVal: {
      project: Pick<Project, 'id' | 'skills' | 'issues'>;
      teams: ProjectTeam[];
    }[] = [];

    // - use skills to generate teams _/
    // - separate project and issue skills _/
    // - check critical path/start- end-dates in issues
    // - use the availability of users
    // - implement skill experience
    // - use similar projects/issues to improve relevance
    // - create strategy to update existing teams (reassign/skip)
    // for now not async
    for (const project of projects) {
      project.issues = project.issues ?? [];

      const projectTeams: ProjectTeam[] = new Array(
        // if teamCount is
        // negative --> 1
        // undefined || NaN || null || 0 --> 1
        // positive --> teamCount
        Math.max(1, +query.teamCount || 1),
      )
        .fill(0)
        // map instead of fill, to have different pointers for each element
        .map(() => ({
          team: [],
          // make a copy of the issue array
          issues: project.issues.map((issue: Issue) => new Issue(issue)),
          options: {
            // optional skills from project. usually the skills from the issues are used
            missingSkills: project.skills ?? [],
            complete: false,
          },
        }));

      // at first process issues to get all users that are needed for the issues
      projectTeams.forEach((team) => {
        team.issues.forEach((issue: Issue) => {
          // check if a potential user is already in the team
          const teamMember = team.team.find(
            (member) =>
              // if the length of both arrays are equal, all skills are covered, so the user can be used to work on this
              // issue
              arrayIntersection(issue.skills, member.skills).length ===
              issue.skills.length,
          );
          if (!teamMember) {
            // if none is found, get a new teamMember
            const potentialUsers = this.getPotentialUsers(
              users,
              issue.skills,
              query.strategy,
            );

            if (potentialUsers.length) {
              // TODO here potential user
              // at first, just assign user to the team, without check, if he is available in this timeslot
              team.team.push(potentialUsers[0]);
              issue.userId = potentialUsers[0].id;
              // remove "missingSkills" of project
              arrayIntersection(
                team.options.missingSkills,
                potentialUsers[0].skills,
                true,
              );
            }
          }
        });
        // after issues, we come to projects and assign all users that are needed to cover missingSkills
        const remainingPossibleUsers = this.getPotentialUsers(
          users,
          team.options.missingSkills,
          query.strategy,
        );

        for (const user of remainingPossibleUsers) {
          arrayIntersection(team.options.missingSkills, user.skills, true);
          team.team.push(user);
          if (
            // assign users as long as skills are missing
            team.options.missingSkills.length === 0 &&
            // else check preferred teamSize
            team.team.length >= (query.teamSize ?? 1)
          ) {
            break;
          }
        }

        // in the end, we check, if all teams are complete (no  missing skills and all issues have a user assigned)
        team.options.complete =
          team.options.missingSkills.length === 0 &&
          !team.issues.some((issue: Issue) => !issue.userId);
      });

      retVal.push({
        project: project,
        teams: projectTeams,
      });
    }
    users.forEach((us) => delete us.issues);
    projects.forEach((p) => delete p.issues);
    return retVal;
  }

  @Get('generate/teams/chat')
  @ApiQuery({ name: 'skills', isArray: true, type: 'string', required: false })
  @ApiQuery({ name: 'offer', type: 'string', required: false })
  @ApiQuery({ name: 'startDate', type: 'string', required: false })
  @ApiQuery({ name: 'endDate', type: 'string', required: false })
  @ApiQuery({ name: 'teamCount', type: 'number', required: false })
  @ApiQuery({ name: 'teamSize', type: 'number', required: false })
  @ApiQuery({
    name: 'projects',
    type: 'string',
    isArray: true,
    required: false,
  })
  async generateTeamsWithChat(
    @UserToken() user: User,
    @Query()
    query: {
      skills: string[] | string;
      offer: string;
      startDate: string;
      endDate: string;
      teamCount: number;
      teamSize: number;
      projects: string | string[];
    },
  ) {
    const createDto: Partial<Project> = {
      id: '1',
      skills: parseQueryString(query.skills),
      startDateSoft: DateTime.fromISO(query.startDate),
      endDateSoft: DateTime.fromISO(query.endDate),
    };
    for (const key in createDto) {
      !createDto[key] && delete createDto[key];
    }
    // this would be project in draft
    const projects = [new Project(createDto)];

    const useAttributes: string[] = [key<User>('id'), key<User>('skills')];

    const userQuery = this.userService.createQueryBuilder(user);

    userQuery.andWhere(`${userQuery.alias}.${key<User>('deleted')} = false`);

    this.userService.addLeftJoinAndSelect(
      [
        {
          property: 'workTimes',
          serviceOrQuery: this.workTimeService,
        },
      ],
      userQuery,
      user,
    );

    for (const key in query) {
      this.userService.parseWhereProperty(userQuery, key, query[key]);
    }
    const users = await userQuery.getMany();

    const chatUsers = users
      .filter((user) => !!user.skills)
      .map((user) => {
        const newUser = new User();
        for (const key in user) {
          useAttributes.includes(key) && (newUser[key] = user[key]);
        }
        return newUser;
      });
    try {
      const chatResult = await sendMessages([
        {
          role: 'user',
          content: this.parseTeamRequest(
            { users: chatUsers, projects },
            query.teamCount ? +query.teamCount : undefined,
            query.teamSize ? +query.teamSize : undefined,
          ),
        },
      ]);
      let parsedResult:
        | {
            projectId: string;
            team: string[];
          }[]
        | {
            projectId: string;
            team: string[];
          } = JSON.parse(chatResult);

      parsedResult = Array.isArray(parsedResult)
        ? parsedResult
        : [parsedResult];
      return parsedResult.reduce<{ projectId: string; teams: User[][] }[]>(
        (prev, curr) => {
          const index = prev.findIndex(
            (project) => project.projectId === curr.projectId,
          );
          const members = curr.team.map((member) =>
            users.find((user) => user.id === member),
          );
          if (index > -1) {
            prev[index].teams.push(members);
          } else {
            prev.push({
              projectId: curr.projectId,
              teams: [members],
            });
          }
          return prev;
        },
        [],
      );
    } catch (e) {
      console.log(e.response?.data);
      throw new ResException(RES_ERROR_GENERIC.CHAT_DOESNT_RESPOND, [e]);
    }
  }

  @Post('generate/issue/:id')
  @ApiBody({
    type: 'object',
    schema: {
      properties: {
        issueType: {
          type: 'string',
        },
        intent: {
          type: 'string',
        },
      },
    },
  })
  async generateIssue(
    @Param('id') id: string,
    @UserToken() user: User,
    @Body() body: { issueType: IssueType; intent: string },
  ) {
    const project = await this.service
      .createQueryBuilder(user)
      .andWhereInIds(id)
      .select('name')
      .getOne();
    const messageContent =
      `Generate a ${body.issueType} for project "${project.name}" about: ` +
      body.intent;
    return sendMessages([
      {
        role: 'user',
        content: messageContent,
      },
    ]);
  }

  @Patch(':id')
  @ApiResponses(PROJECT_ERROR_UPDATE)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Param('id') id: string,
    @Body() body: ProjectDto,
  ) {
    const record = await this.getRecord(id, user);

    await this.service.update(id, user, body, record);

    return super.update(req, res, user, id, body);
  }

  @Delete(':id')
  @ApiResponses(PROJECT_ERROR_DELETE)
  async remove(@Param('id') id: string, @UserToken() user: User) {
    const record = await this.getRecord(id, user);
    return this.service.updateForRemove(id, user, record);
  }

  private parseTeamRequest(
    obj: { users: User[]; projects: Project[] },
    teamCount: number = 3,
    teamSize: number = 2,
  ) {
    const iHave =
      'I have Users: [' +
      obj.users
        .map(
          (user: User) =>
            `{ id: ${user.id}, skills: ${user.skills.join(', ')} }`,
        )
        .join(', ') +
      '] and Projects: [' +
      obj.projects.map(
        (project: Project) =>
          `{ id: ${project.id}, skills: ${project.skills.join(', ')} }`,
      ) +
      ']';

    const sizeString = !teamSize
      ? 'minimizing amount of members per team'
      : `with ${teamSize} ${teamSize === 1 ? 'member' : 'members'} each`;
    const iWant = `Generate ${teamCount} ${
      teamCount === 1 ? 'team' : 'teams'
    } per Project ${sizeString}, covering all skills. Check all user skills. Response type: {projectId: string, team: userId[]}[] (JSON format) without any other text`;
    return iHave + '\n' + iWant;
  }

  private chatFun() {
    const users = [
      {
        id: '05a9d9d3-4e79-4834-b7c3-0bc309271c2c',
        skills: [
          'Java',
          'SpringBoot',
          'Docker',
          'Backend',
          'JavaScript',
          'TypeScript',
          'Python',
        ],
      },
      {
        id: '3377ce3a-eb9d-49f8-a23a-559ad4c27a88',
        skills: [
          'Backend',
          'Docker',
          'Typescript',
          'JavaScript',
          'Python',
          'Java',
          'Vue',
        ],
      },
      {
        id: '4f424e03-b550-40e7-8806-7ceeb053b7a8',
        skills: [
          'Java',
          'Frontend',
          'Backend',
          'JavaScript',
          'TypeScript',
          'Vue',
        ],
      },
      {
        id: '52dc92a2-cc2a-4d8c-a6f6-66047b8f35ae',
        skills: [
          'Frontend',
          'Backend',
          'Typescript',
          'JavaScript',
          'Python',
          'Java',
          'App',
          'Android',
          'Vue',
        ],
      },
      {
        id: '85a53a54-3337-4103-bd7a-237b78e273df',
        skills: [
          'Java',
          'Docker',
          'Backend',
          'JavaScript',
          'TypeScript',
          'Python',
        ],
      },
      {
        id: 'a63b94b8-ba99-45ef-ab6f-656dac5014fe',
        skills: [
          'Java',
          'Frontend',
          'Backend',
          'JavaScript',
          'TypeScript',
          'Vue',
          'App',
          'Android',
        ],
      },
      {
        id: 'cda898eb-2a2c-4010-b391-8bd9d43dab22',
        skills: [
          'Frontend',
          'Backend',
          'Typescript',
          'JavaScript',
          'Python',
          'Java',
          'Vue',
        ],
      },
    ];

    const project = {
      id: '1',
      skills: ['Backend'],
      startDate: null,
      endDate: null,
    };

    const requiredSkills = project.skills;
    const filteredUsers = users.filter((user) =>
      user.skills.some((skill) => requiredSkills.includes(skill)),
    );
    filteredUsers.sort(
      (a, b) =>
        b.skills.filter((skill) => requiredSkills.includes(skill)).length -
        a.skills.filter((skill) => requiredSkills.includes(skill)).length,
    );
    const teams = [];

    while (filteredUsers.length > 0) {
      const team = [filteredUsers.shift()];
      let missingSkills = Array.from(requiredSkills);
      for (
        let i = 0;
        i < filteredUsers.length && missingSkills.length > 0;
        i++
      ) {
        const user = filteredUsers[i];
        const userSkills = user.skills.filter((skill) =>
          requiredSkills.includes(skill),
        );
        if (missingSkills.some((skill) => userSkills.includes(skill))) {
          team.push(user);
          missingSkills = missingSkills.filter(
            (skill) => !userSkills.includes(skill),
          );
          filteredUsers.splice(i, 1);
          i--;
        }
      }
      teams.push(team.map((user) => user.id));
    }

    // Add any remaining users to the existing teams
    filteredUsers.sort(
      (a, b) =>
        a.skills.filter((skill) => requiredSkills.includes(skill)).length -
        b.skills.filter((skill) => requiredSkills.includes(skill)).length,
    );
    for (let i = 0; i < filteredUsers.length; i++) {
      const user = filteredUsers[i];
      let added = false;
      for (let j = 0; j < teams.length && !added; j++) {
        if (
          teams[j].length < 2 &&
          teams[j][0].skills.some((skill) => user.skills.includes(skill))
        ) {
          teams[j].push(user.id);
          added = true;
        }
      }
      if (!added) {
        teams.push([user.id]);
      }
    }

    const result = { projectId: project.id, teams: teams };

    console.log(result);
  }

  /**
   * Returns a user array, filtered by the relevance for the needed skills.
   * @param users
   * @param neededSkills
   * @param strategy
   * @private
   */
  private getPotentialUsers(
    users: User[],
    neededSkills: string[],
    strategy: TeamGenerationStrategy = 'relevance',
  ) {
    // get only users, that may be relevant for this issue
    const potentialUsers = users
      .map((user: User) => ({
        user,
        relevance: neededSkills.reduce(
          (previousValue, currentValue) =>
            user.skills.includes(currentValue)
              ? ++previousValue
              : previousValue,
          0,
        ),
      }))
      .filter((user) => user.relevance);

    if (strategy === 'bestFit') {
      // second sorting strategy: relevance + min(unused skills) = bestFit
      // this makes only sense when using/assigning issues
      return potentialUsers
        .sort(
          (a, b) =>
            b.relevance - a.relevance ||
            a.user.skills.filter(
              (skill: string) => !neededSkills.includes(skill),
            ).length -
              b.user.skills.filter(
                (skill: string) => !neededSkills.includes(skill),
              ).length,
        )
        .map((el) => el.user);
    }
    // first sorting strategy: relevance only (default)
    else {
      return sortArray(potentialUsers, true, 'relevance').map((el) => el.user);
    }
  }

  protected possibleRelations(user?: User) {
    return super.possibleRelations(user).concat([
      {
        property: 'users',
        serviceOrQuery: this.userService,
      },
      {
        property: 'settings',
        serviceOrQuery: this.settingsService,
      },
    ]);
  }
}
