import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Project } from '../project/project.entity';
import { Group } from '../group/group.entity';
import { Increment } from '../increment/increment.entity';
import { Phase } from '../phase/phase.entity';
import { DetailsEntity } from '../../common/details/details.entity';
import { FamilyInterface } from '../../common/interfaces/family.interface';
import { TimelineInterface } from '../../common/interfaces/timeline.interface';

export enum IssueType {
  EPIC = 'epic',
  USER_STORY = 'userStory',
  TASK = 'task',
  SUB_TASK = 'subTask',
  BUG = 'bug',
}

/**
 * Indicates the status of the issue.
 * Can be extended, with creating an IssueStatus entity, so that users can create custom status for issues. Similar to
 * skills Entity
 */
export enum IssueStatus {
  UNTOUCHED = 'untouched',
  IN_PROGRESS = 'inProgress',
  FINISHED = 'finished',
}

@Entity()
@Index(['identifier'], { unique: true })
export class Issue
  extends DetailsEntity<Issue>
  implements FamilyInterface<Issue>, TimelineInterface<Issue>
{
  @Column({
    enum: IssueType,
    type: 'enum',
  })
  type: IssueType;

  @Column({
    enum: IssueStatus,
    type: 'enum',
    default: IssueStatus.UNTOUCHED,
  })
  status: IssueStatus;

  /**
   * Simple array of strings, not like user skills
   */
  @Column({
    nullable: true,
    type: 'simple-array',
  })
  skills: string[];

  @Column({
    update: false,
  })
  identifier: string;

  @Column({
    nullable: true,
  })
  userId: string | null;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
  })
  user?: User;

  @Column({
    update: false,
  })
  projectId: string;

  @ManyToOne(() => Project)
  project?: Project;

  // An issue can only belong to one increment and one group in this increment
  @Column({
    nullable: true,
  })
  incrementId: string | null;

  @ManyToOne(() => Increment)
  increment?: Increment | null;

  @Column({
    nullable: true,
  })
  groupId: string | null;

  @ManyToOne(() => Group)
  group?: Group | null;

  @Column({
    nullable: true,
  })
  phaseId: string | null;

  @ManyToOne(() => Phase)
  phase?: Phase | null;

  @Column({
    nullable: true,
  })
  parentId: string | null;

  @ManyToOne(() => Issue)
  parent?: Issue | null;

  @OneToMany(() => Issue, (issue: Issue) => issue.parent)
  children?: Issue[] | null;

  // These issues are for the critical path
  @ManyToMany(() => Issue, (issue: Issue) => issue.previous)
  @JoinTable()
  following?: Issue[];

  @ManyToMany(() => Issue, (issue: Issue) => issue.following)
  previous?: Issue[];

  // teamSize for issue should always be 1;
  teamSize: 1;

  constructor(object: Partial<Issue>) {
    super();
    Object.assign(this, object);
  }
}
