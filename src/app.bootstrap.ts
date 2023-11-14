import { INestApplication } from '@nestjs/common';
import { UserService } from './models/user/user.service';
import { MAX_SKILL_LEVEL, User } from './models/user/user.entity';
import { SkillService } from './models/skill/skill.service';
import { UserDto } from './models/user/user.dto';
import { DateTime, Duration } from 'luxon';
import { TenantService } from './models/tenant/tenant.service';
import { ProjectService } from './models/project/project.service';
import { Project, ProjectStatus } from './models/project/project.entity';
import { GroupService } from './models/group/group.service';
import { IncrementService } from './models/increment/increment.service';
import { IssueService } from './models/issue/issue.service';
import { getArray, randInt, toUniqueArray } from './helper/helper-functions';
import { Issue, IssueType } from './models/issue/issue.entity';
import { DurationUnit } from './common/interfaces/timeline.interface';
import { Group } from './models/group/group.entity';
import { iterateOverInverseFamily } from './common/interfaces/family.interface';
import { PhaseService } from './models/phase/phase.service';

/**
 * Creates Basic data records which are needed for basic functionality
 */
export async function createBaseData(app: INestApplication) {
  const userService: UserService = app.get(UserService);

  const user = new User({ id: null });

  console.log('create super admin');
  // super admin
  await userService.findOneOrCreate(
    {
      where: { email: 'admin', deleted: false },
    },
    {
      email: 'admin',
      password: 'admin',
      firstName: 'super',
      lastName: 'admin',
      income: 0,
    },
    user,
  );

  console.log('superAdmin created');
}

/**
 * Create mock data for develop environment
 */
export async function createDevData(app: INestApplication) {
  const userService: UserService = app.get(UserService);
  const skillService: SkillService = app.get(SkillService);
  const tenantService: TenantService = app.get(TenantService);
  const projectService: ProjectService = app.get(ProjectService);
  const incrementService: IncrementService = app.get(IncrementService);
  const phaseService: PhaseService = app.get(PhaseService);
  const groupService: GroupService = app.get(GroupService);
  const issueService: IssueService = app.get(IssueService);

  console.log('get superAdmin');
  const admin = await userService.findOne({
    where: {
      email: 'admin',
      deleted: false,
    },
  });

  console.log('create tenant');

  const tenant = await tenantService.findOneOrCreate(
    {
      where: {
        name: '28Apps',
        deleted: false,
      },
    },
    {
      name: '28Apps',
    },
    admin,
  );

  const skillSet = {
    frontend: ['Vue', 'Angular', 'React'],
    backend: [
      'Java',
      'JavaScript',
      'Typescript',
      'SpringBoot',
      'Python',
      /* 'NestJs',
      'SailsJs',
      'C++',
      'C#',
      'C',/**/
    ],
    app: ['Android', 'Swift', 'Flutter', 'Dart', 'Kotlin'],
    others: ['Docker'],
  };

  const skillSetKeys = Object.keys(skillSet);

  console.log('create skills');
  await Promise.all(
    skillSet.app
      .concat(skillSet.backend)
      .concat(skillSet.others)
      .concat(skillSet.frontend)
      .map((skillName: string) =>
        skillService.findOneOrCreate(
          {
            where: {
              name: skillName,
              tenantId: tenant.id,
            },
          },
          {
            name: skillName,
            tenantId: tenant.id,
          },
          admin,
        ),
      ),
  );

  console.log('create devs');
  const users: UserDto[] = [
    {
      firstName: 'Konrad',
      lastName: 'K',
      skills: [
        'Backend',
        'Docker',
        'Typescript',
        'JavaScript',
        'Python',
        'Java',
        'Vue',
      ],
      workTimes: [
        {
          weeklyAmount: 40,
          validTo: DateTime.now()
            .plus({
              week: 2,
            })
            .minus({
              day: 1,
            })
            .endOf('day'),
        },
        {
          validFrom: DateTime.now()
            .plus({
              week: 2,
            })
            .startOf('day'),
          weeklyAmount: 30,
        },
      ],
    },
    {
      firstName: 'Thomas',
      lastName: 'H',
      skills: ['Backend', 'Docker', 'Typescript', 'JavaScript', 'Python'],
      workTimes: [
        {
          weeklyAmount: 40,
        },
      ],
    },
    {
      firstName: 'Malte',
      lastName: 'V',
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
      workTimes: [
        {
          monday: 8,
          thursday: 8,
          validTo: DateTime.local(2023, 8, 31).endOf('day'),
        },
        {
          monday: 8,
          wednesday: 8,
          validFrom: DateTime.local(2023, 9, 1).startOf('day'),
          validTo: DateTime.local(2023, 12, 31).endOf('day'),
        },
        {
          weeklyAmount: 40,
          validFrom: DateTime.local(2024, 1, 1).startOf('day'),
        },
      ],
    },
    {
      firstName: 'Holger',
      lastName: 'D',
      skills: [
        'Frontend',
        'Backend',
        'Typescript',
        'JavaScript',
        'Python',
        'Java',
        'Vue',
      ],
      workTimes: [
        {
          wednesday: 8,
          friday: 8,
        },
      ],
    },
    {
      firstName: 'Viktor',
      lastName: 'Z',
      skills: ['App', 'Dart', 'Android', 'Flutter', 'Java'],
      workTimes: [
        {
          weeklyAmount: 40,
        },
      ],
    },
    {
      firstName: 'Christoph',
      lastName: 'S',
      skills: ['App', 'Swift', 'Android', 'Flutter', 'Dart', 'Java'],
      workTimes: [
        {
          weeklyAmount: 40,
        },
      ],
    },
    {
      firstName: 'Jenny',
      lastName: 'O',
      skills: ['App', 'Swift', 'Android', 'Flutter', 'Dart', 'Java'],
      workTimes: [
        {
          weeklyAmount: 40,
        },
      ],
    },
    {
      firstName: 'Nicole',
      lastName: 'E',
      skills: ['Python', 'App', 'Flutter', 'Java'],
      workTimes: [
        {
          weeklyAmount: 40,
          validFrom: DateTime.local(2023, 4, 11).startOf('day'),
          validTo: DateTime.local(2023, 6, 11).endOf('day'),
        },
        {
          weeklyAmount: 0,
          validFrom: DateTime.local(2023, 6, 12).startOf('day'),
        },
      ],
    },
    {
      firstName: 'Roman',
      lastName: 'G',
      skills: ['Android', 'App', 'Python', 'Java'],
      workTimes: [
        {
          weeklyAmount: 40,
        },
      ],
    },
    {
      firstName: 'Kevin',
      lastName: 'K',
      skills: [
        'Android',
        'App',
        'Python',
        'Java',
        'Frontend',
        'JavaScript',
        'TypeScript',
        'Vue',
        'Flutter',
      ],
      workTimes: [
        {
          monday: 6,
          wednesday: 6,
          friday: 6,
        },
      ],
    },
    {
      firstName: 'Fabian',
      lastName: 'J',
      skills: ['Java', 'Frontend', 'JavaScript', 'TypeScript', 'Vue'],
      workTimes: [
        {
          weeklyAmount: 40,
        },
      ],
    },
    {
      firstName: 'Torben',
      lastName: 'I',
      skills: [
        'Java',
        'Frontend',
        'Backend',
        'JavaScript',
        'TypeScript',
        'Vue',
      ],
      workTimes: [
        {
          weeklyAmount: 40,
        },
      ],
    },
    {
      firstName: 'Jan',
      lastName: 'M',
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
      workTimes: [
        {
          weeklyAmount: 40,
        },
      ],
    },
    {
      firstName: 'Joana',
      lastName: 'H',
      skills: [
        'Java',
        'Docker',
        'Backend',
        'JavaScript',
        'TypeScript',
        'Python',
      ],
      workTimes: [
        {
          thursday: 8,
          friday: 8,
        },
      ],
    },
    {
      firstName: 'Omar',
      lastName: "El' H",
      skills: [
        'Java',
        'SpringBoot',
        'Docker',
        'Backend',
        'JavaScript',
        'TypeScript',
        'Python',
      ],
      workTimes: [
        {
          wednesday: 4,
          thursday: 4,
          friday: 4,
        },
      ],
    },
  ];
  await Promise.all(
    users.map((user) => {
      user.skills = user.skills.map((skill) => {
        const split = skill.split('+');
        if (Number.isNaN(+split[1])) {
          return (
            split[0] +
            `+${randInt(Math.round(MAX_SKILL_LEVEL / 2), MAX_SKILL_LEVEL)}`
          );
        } else {
          return skill;
        }
      });
      user.email =
        `${user.lastName}.${user.firstName}@trash-mail.com`.toLowerCase();
      user.password = '123456';
      return userService.findOneOrCreate(
        {
          where: {
            email: user.email,
          },
        },
        {
          ...user,
          tenantId: tenant.id,
        },
        admin,
      );
    }),
  );

  await generateProject();

  async function generateProject() {
    console.log('create project');
    const project = await projectService.findOneOrCreate(
      {
        where: {
          short: 'BP',
          tenantId: tenant.id,
        },
      },
      {
        name: 'Bachelor Projekt',
        short: 'BP',
        startDateSoft: DateTime.local(2023, 9, 18),
        startDateHard: DateTime.local(2023, 9, 25),
        endDateSoft: DateTime.local(2023, 12, 15),
        endDateHard: DateTime.local(2024, 1, 31),
        duration: 9,
        unit: DurationUnit.WEEKS,
        tenantId: tenant.id,
        status: ProjectStatus.PENDING,
        description: 'Ein Projekt Beispiel anhand meiner Bachelorarbeit',
        teamSize: 5,
        phases: [
          {
            name: 'Planung',
            order: 0,
          },
          {
            name: 'Entwicklung',
            order: 1,
          },
          {
            name: 'Testen',
            order: 2,
          },
        ],
      },
      admin,
    );

    // increment 0 is generated in projectService.afterInsert as default increment, but without endDate, so update it
    const inc0 = await incrementService.findOne({
      where: {
        incrementNumber: 0,
        projectId: project.id,
      },
    });

    await incrementService.update(inc0.id, admin, {
      endDateSoft: DateTime.fromMillis(
        project.startDateSoft.toMillis() +
          Duration.fromDurationLike({ week: 1 }).toMillis(),
      ),
      endDateHard: DateTime.fromMillis(
        project.startDateHard.toMillis() +
          Duration.fromDurationLike({ week: 1 }).toMillis(),
      ),
      duration: 1,
      unit: DurationUnit.WEEKS,
    });

    console.log('create increments of project', project.name);
    const increments = await Promise.all(
      new Array(9).fill(0).map((_, index) => generateIncrement(project, index)),
    );

    for (const inc of increments) {
      const res = await phaseService.findAll({
        where: {
          incrementId: inc.id,
        },
      });
      inc.phases = res.records;
    }

    console.log('create modules');
    const modules: Group[] = [];
    for (const groupIndex of new Array(10).fill(0).map((_, i) => i)) {
      const parent = (Math.random() < 0.4 &&
        modules[randInt(modules.length - 1)]) || { id: null };
      const mod = await generateModule(project, groupIndex, parent.id);
      modules.push(mod);
    }

    type IssueTypeObject<Type> = Record<IssueType, Type>;
    const issueTypes = Object.values(IssueType);
    const issuesRecord: Partial<IssueTypeObject<Issue[]>> = (
      await Promise.all(
        issueTypes.map((type) =>
          issueService.findAll({
            where: {
              projectId: project.id,
              type,
            },
          }),
        ),
      )
    ).reduce((retVal, issues, index) => {
      retVal[issueTypes[index]] = issues.records;
      return retVal;
    }, {});
    // define how many of each type
    const issueCount: IssueTypeObject<number> = {
      epic: 4,
      userStory: 8,
      task: 16,
      subTask: 25,
      bug: 6,
    };
    console.log('create issues');
    // All except bugs
    for (const type of issueTypes.slice(0, -1)) {
      if (issuesRecord[type].length >= issueCount[type]) {
        console.log(
          `dont create ${type}, because issueCount ${issuesRecord[type].length} >= ${issueCount[type]}`,
        );
        continue;
      }
      console.log(`create ${type}`);
      const newIssues = await Promise.all(
        new Array(issueCount[type] - issuesRecord[type].length)
          .fill(0)
          .map(async (_, i) => {
            const previousType =
              issueTypes[issueTypes.findIndex((t) => t === type) - 1];
            // assign issue to random module
            const module = modules[randInt(modules.length - 1)];
            if (!module.id) {
              console.log('module without id', module);
            }
            const parentIssue = // select random parent
              issuesRecord[previousType]?.[
                randInt(issuesRecord[previousType].length - 1)
              ];
            const issueNumber =
              issueTypes
                .slice(0, issueTypes.indexOf(type))
                .reduce(
                  (result, issueType) =>
                    result + issuesRecord[issueType].length,
                  0,
                ) +
              i +
              1;
            try {
              return await generateIssue(
                project,
                issueNumber,
                type,
                module.id,
                parentIssue?.id,
              );
            } catch (e) {
              console.log('issue error', e);
            }
          }),
      );
      issuesRecord[type] = issuesRecord[type].concat(newIssues);
      await Promise.all(
        newIssues.map((newIssue) =>
          issueService.update(newIssue.id, admin, {
            // get issues of same type. 0 up to 3 possible previous elements
            previous: getRandomElements(
              issuesRecord[type].slice(
                0,
                issuesRecord[type].findIndex(
                  (issue) => issue.id === newIssue.id,
                ),
              ),
              undefined,
              3,
              0,
            ),
          }),
        ),
      );
    }
    const allIssues = Object.values(issuesRecord).flatMap((key) => key);
    iterateOverInverseFamily(
      allIssues,
      (issue) => {
        if (!issue.skills || !issue.skills.length) {
          const setOfSkills: string[] =
            skillSet[skillSetKeys[randInt(skillSetKeys.length - 1)]];
          issue.skills = getArray(issue.skills, [
            setOfSkills[randInt(setOfSkills.length - 1)],
          ]);
        }
        if (issue.parent) {
          issue.parent.skills = toUniqueArray(
            getArray(issue.parent.skills).concat(issue.skills),
          );
        }
      },
      false,
    );

    await Promise.all(
      allIssues.map((issue) =>
        issueService.update(issue.id, admin, {
          skills: issue.skills,
        }),
      ),
    );

    return project;
  }

  function generateIncrement(project: Project, index: number) {
    return incrementService.findOneOrCreate(
      {
        where: {
          incrementNumber: index,
          tenantId: project.tenantId,
          projectId: project.id,
        },
      },
      {
        name: `Sprint ${index + 1}`,
        tenantId: project.tenantId,
        projectId: project.id,
        incrementNumber: index,
        startDateSoft: DateTime.fromMillis(
          project.startDateSoft.toMillis() +
            index * Duration.fromDurationLike({ week: 1 }).toMillis(),
        ),
        startDateHard: DateTime.fromMillis(
          project.startDateHard.toMillis() +
            index * Duration.fromDurationLike({ week: 1 }).toMillis(),
        ),
        endDateSoft: DateTime.fromMillis(
          project.startDateSoft.toMillis() +
            (index + 1) * Duration.fromDurationLike({ week: 1 }).toMillis(),
        ),
        endDateHard: DateTime.fromMillis(
          project.startDateHard.toMillis() +
            (index + 1) * Duration.fromDurationLike({ week: 1 }).toMillis(),
        ),
        duration: 1,
        unit: DurationUnit.WEEKS,
      },
      admin,
    );
  }

  function generateModule(
    project: Project,
    groupIndex: number,
    parentId: string,
  ) {
    return groupService.findOneOrCreate(
      {
        where: {
          name: `Modul ${groupIndex}`,
          projectId: project.id,
        },
      },
      {
        name: `Modul ${groupIndex}`,
        projectId: project.id,
        tenantId: project.tenantId,
        parentId,
      },
      admin,
    );
  }

  function generateIssue(
    project: Project,
    issueCount: number,
    type: IssueType,
    groupId: string,
    parentId?: string,
    skills?: string[],
  ) {
    return issueService.findOneOrCreate(
      {
        where: {
          name: `${type} ${issueCount}`,
          identifier: project.short + `-${issueCount}`,
          tenantId: project.tenantId,
          projectId: project.id,
        },
      },
      {
        name: `${type} ${issueCount}`,
        tenantId: project.tenantId,
        projectId: project.id,
        duration: randInt(1, 4),
        unit: DurationUnit.DAYS,
        identifier: project.short + `-${issueCount}`,
        type,
        groupId,
        parentId,
        skills,
      },
      admin,
    );
  }
}

function getRandomElements(
  arr: any[],
  probability = 0.3,
  to: number = arr.length,
  from: number = 1,
) {
  let numberOfElements = randInt(from, to);
  return arr.filter(
    (_, i, arr) =>
      // if remaining incs are more than wanted, randomize selection
      numberOfElements - (arr.length - i) > 0 ||
      (Math.random() < probability && numberOfElements-- > 0),
  );
}
