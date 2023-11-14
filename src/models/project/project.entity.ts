import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { User } from '../user/user.entity';
import { toUniqueArray } from '../../helper/helper-functions';
import { Issue } from '../issue/issue.entity';
import { JoinTable } from 'typeorm';
import { Increment } from '../increment/increment.entity';
import { Group } from '../group/group.entity';
import { Phase } from '../phase/phase.entity';
import { DetailsEntity } from '../../common/details/details.entity';
import { SettingsEntity } from '../settings/settings.entity';

export enum ProjectStatus {
  /**
   * The project is not active, but also not finished
   */
  PENDING = 'pending',
  /**
   * The project is currently active
   */
  ACTIVE = 'active',
  /**
   * The project is finished
   */
  FINISHED = 'finished',
}

@Entity()
export class Project extends DetailsEntity<Project> {
  @Column()
  short: string;

  /**
   * The skills for pre-planning
   */
  @Column({
    nullable: true,
    type: 'simple-array',
    transformer: {
      from: (value) => value,
      to: (value: any) => (Array.isArray(value) ? toUniqueArray(value) : value),
    },
  })
  skills: string[];

  @Column({
    comment: 'Indicates the status of the project',
    default: ProjectStatus.PENDING,
    type: 'enum',
    enum: ProjectStatus,
  })
  status: ProjectStatus;

  @Column({
    nullable: true,
  })
  settingsId: string | null;

  @OneToOne(() => SettingsEntity, {
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  settings?: SettingsEntity;

  @ManyToMany(() => User, (user: User) => user.projects)
  @JoinTable()
  users?: User[];

  @OneToMany(() => Issue, (issue: Issue) => issue.project)
  issues?: Issue[];

  @OneToMany(() => Increment, (inc: Increment) => inc.project)
  increments?: Increment[];

  @OneToMany(() => Group, (module: Group) => module.project)
  modules?: Group[];

  /**
   * These are template phases, that are default for each created increment, but can still be customized for each
   * increment
   */
  @OneToMany(() => Phase, (phase: Phase) => phase.project)
  phases?: Phase[];

  get startOfProject() {
    return (
      this.start ??
      this.increments?.find((inc) => inc.incrementNumber === 0)?.start
    );
  }

  get endOfProject() {
    return (
      this.end ??
      this.increments?.sort((incA, incB) =>
        incA.incrementNumber > incB.incrementNumber ? 1 : 0,
      )[this.increments.length - 1]?.end
    );
  }

  constructor(object?: Partial<Project>) {
    super();
    if (object) {
      Object.assign(this, object);
    }
  }
}
