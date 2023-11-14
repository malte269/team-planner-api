import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Issue } from '../issue/issue.entity';
import { Project } from '../project/project.entity';
import { Group } from '../group/group.entity';
import { Role } from '../user/role/role.entity';
import { DetailsEntity } from '../../common/details/details.entity';
import { Increment } from '../increment/increment.entity';

// It is assumed, that every Phase of the project is applied on every increment. This can be extended, if an incrementId
// is added to the phase entity. For now, a phase does not need to know the increments. Phases are only used, if the
// process is divided into modules. An issue cannot have phases on its own but in combination with a group.
// Common phases are for example "concept", "implementation" and "testing"
@Entity()
export class Phase extends DetailsEntity<Phase> {
  @Column({
    default: 0,
    comment: 'Zero indexed order in project',
  })
  order: number;

  // phases can differ from project to project
  @Column()
  projectId: string;

  @ManyToOne(() => Project)
  project?: Project;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  requiredRoles: Role[] | null;

  @Column({
    // nullable for template project phases
    nullable: true,
  })
  incrementId: string | null;

  @ManyToOne(() => Increment)
  increment?: Increment | null;

  // A phase contains a collection of issues, but every issue can only be in one phase per time
  @OneToMany(() => Issue, (issue: Issue) => issue.phase)
  issues?: Issue[];

  get modules(): Group[] {
    return [];
  }

  constructor(object: Partial<Phase>) {
    super();
    Object.assign(this, object);
  }
}
