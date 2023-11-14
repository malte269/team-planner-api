import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Project } from '../project/project.entity';
import { Issue } from '../issue/issue.entity';
import { Phase } from '../phase/phase.entity';
import { DetailsEntity } from '../../common/details/details.entity';
import { toUniqueArray } from '../../helper/helper-functions';
import { FamilyInterface } from '../../common/interfaces/family.interface';

// A group can be a component of the software. It belongs to a project
// For the future, there could be something like a mind map, that splits the software in some modules/components, that
// can be divided into smaller issues on some increments
@Entity()
export class Group
  extends DetailsEntity<Group>
  implements FamilyInterface<Group>
{
  @Column()
  projectId: string;

  @ManyToOne(() => Project)
  project?: Project;

  @Column({
    nullable: true,
  })
  parentId: string;

  @ManyToOne(() => Group)
  parent?: Group | null;

  @OneToMany(() => Group, (group: Group) => group.parent)
  children?: Group[];

  // group is divided into smaller issues
  @OneToMany(() => Issue, (issue: Issue) => issue.group)
  issues?: Issue[];

  phases?: Phase[];

  // get the increment ids of this group and all its children
  get incrementIds(): string[] {
    return toUniqueArray(
      (this.children ?? [])
        .map((child) => child.incrementIds)
        .flat()
        .concat(
          this.issues
            ?.filter((issue) => !!issue.incrementId)
            .map((issue) => issue.incrementId) ?? [],
        ),
    );
  }

  get phaseIds(): string[] {
    return toUniqueArray(
      this.issues
        ?.filter((issue) => !!issue.phaseId)
        .map((issue) => issue.phaseId) ?? [],
    );
  }

  constructor(object?: Partial<Group>) {
    super();
    if (object) {
      Object.assign(this, object);
    }
  }

  public groupProfile(
    incrementId?: string,
    phaseId?: string,
    withChildren: boolean = true,
  ): string[] {
    return toUniqueArray(
      (this.issues ?? [])
        .filter(
          (issue: Issue) =>
            (!incrementId || issue.incrementId === incrementId) &&
            (!phaseId || issue.phaseId === phaseId),
        )
        .map((issue: Issue) => issue.skills)
        .flat()
        .concat(
          ((withChildren && this.children) || [])
            .map((child: Group) => child.groupProfile(incrementId))
            .flat(),
        ),
    );
  }
}
