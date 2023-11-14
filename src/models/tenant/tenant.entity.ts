import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Project } from '../project/project.entity';
import { User } from '../user/user.entity';
import { SettingsEntity } from '../settings/settings.entity';

@Entity()
export class Tenant extends BaseEntity<Tenant> {
  @Column()
  name: string;

  @OneToMany(() => User, (user: User) => user.tenant)
  users?: User[];

  @OneToMany(() => Project, (project: Project) => project.tenant)
  projects?: Project[];

  @Column({
    nullable: true,
  })
  settingsId: string | null;

  @OneToOne(() => SettingsEntity, {
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  settings?: SettingsEntity;

  constructor(object?: Partial<Tenant>) {
    super();
    Object.assign(this, object);
  }
}
