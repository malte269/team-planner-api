// eslint-disable-next-line @typescript-eslint/no-var-requires
import { User } from './src/models/user/user.entity';
import { DataSource } from 'typeorm';
import { Issue } from './src/models/issue/issue.entity';
import { Project } from './src/models/project/project.entity';
import { Skill } from './src/models/skill/skill.entity';
import { WorkTime } from './src/models/work-time/workTime.entity';
import { Tenant } from './src/models/tenant/tenant.entity';
import { Group } from './src/models/group/group.entity';
import { Increment } from './src/models/increment/increment.entity';
import { Slot } from './src/models/slot/slot.entity';
import { Phase } from './src/models/phase/phase.entity';
import { SettingsEntity } from './src/models/settings/settings.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

// Datasource is not assignable to TypeOrmModuleOptions in app.group.js, so export this
export const config = {
  type: 'mysql',
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  synchronize: true,
  // to be able to create addresses geoCodes
  legacySpatialSupport: false,
  entities: [
    Tenant,
    User,
    Project,
    Increment,
    Group,
    Phase,
    Slot,
    Issue,
    Skill,
    WorkTime,
    SettingsEntity,
  ],
  migrations: ['src/migrations/*.ts', 'src/migrations/*.js'],
  // possible values are: query, error, schema, warn, info, log. More info: https://orkhan.gitbook.io/typeorm/docs/logging
  logging: ['error'],
  cli: {
    migrationsDir: 'src/migrations',
  },
};

// This is needed when the ormconfig.js is used in the commandline. Otherwise, there would be an error, that there is no
// datasource defined
export default new DataSource(config);
