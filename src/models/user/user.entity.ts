import { Column, Entity, JoinColumn, ManyToMany, OneToMany } from 'typeorm';
import { WorkTime } from '../work-time/workTime.entity';
import { Project } from '../project/project.entity';
import { Issue } from '../issue/issue.entity';
import { BaseEntityWithOptionalTenant } from '../../common/with-tenant/base.entity.with-optional-tenant';
import { Slot } from '../slot/slot.entity';
import { Role } from './role/role.entity';
import { DateTime } from 'luxon';

const LEARNING_RATE = 0.002;
const FORGET_RATE = 0.002;

// 100%
export const MAX_SKILL_LEVEL = 100;

// has optional tenant, because of admin user, that belongs to no tenant
@Entity()
export class User extends BaseEntityWithOptionalTenant<User> {
  @Column({
    nullable: true,
  })
  email?: string | null;

  @Column({
    nullable: true,
    default: null,
  })
  password?: string | null;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    default: 0,
  })
  income: number;

  @Column({
    default: false,
  })
  /**
   * This prop defines, a user as an expert developer. It means, that the user is experienced and trusted to do good work
   */
  isExpert: boolean;

  @Column({
    nullable: true,
    type: 'simple-array',
  })
  /**
   * The skills are an array of strings, representing the skill name and the skill level, separated by a '+' like
   * ["TypeScript+4", "Java+1"]
   */
  skills: string[] | null;

  @Column({
    enum: Role,
    type: 'enum',
  })
  role: Role;

  @OneToMany(() => WorkTime, (wT: WorkTime) => wT.user)
  @JoinColumn()
  workTimes?: WorkTime[];

  @OneToMany(() => Slot, (slot: Slot) => slot.user)
  @JoinColumn()
  slots?: Slot[];

  @ManyToMany(() => Project, (project: Project) => project.users)
  projects?: Project[];

  @OneToMany(() => Issue, (issue) => issue.user)
  issues?: Issue[];

  constructor(object?: Partial<User>) {
    super();
    if (object) {
      Object.assign(this, object);
    }
  }

  /**
   * Extract a specific skill of a user. It returns an object containing the skill, the level and its index in the
   * array. The index will never be -1. Instead, it will be the length of the array.
   * @param user
   * @param skill
   */
  static extractSkill(user: User, skill: string) {
    let index = user.skills?.findIndex(
      (userSkill: string) => userSkill.split('+')[0] === skill,
    );
    // default, if skill was not learned yet
    let level = 0;
    if (index > -1) {
      // get the skill level of the saved skill. If NaN, use 0 instead
      level = +user.skills[index].split('+')[1] || 0;
    } else {
      index = user.skills?.length ?? 0;
    }
    return {
      skill,
      level,
      index,
    };
  }

  public hasSkill(skill: string) {
    return User.extractSkill(this, skill).level > 0;
  }

  /**
   * Method to simulate learning of a skill. The skill is the skill to learn and the amount is the amount of time
   * to learn in hours
   * @param userSkill Skill to learn
   * @param amount Time to learn
   */
  public learnSkill(userSkill: string, amount: number) {
    const { skill, level, index } = User.extractSkill(this, userSkill);
    // The skill level has a maximum
    const skillLevel = Math.min(this.learn(level, amount), MAX_SKILL_LEVEL);
    // alter skill value or push, if not existing
    this.skills[index] = `${skill}+${skillLevel}`;
  }

  /**
   * The basis learning 'curve' function used to simulate human learning. For now, it's just a linear function
   * @param basis The initial value before learning
   * @param time The time to learn
   * @param learningRate The learning rate of the human. It is a constant for every human and not discovered throug
   * some process
   */
  public learn(
    basis: number,
    time: number,
    learningRate: number = LEARNING_RATE,
  ) {
    return basis + learningRate * time;
  }

  public forgetSkill(userSkill: string, amount: number) {
    const { skill, level, index } = User.extractSkill(this, userSkill);
    // skill level cannot be less than 0
    const skillLevel = Math.max(this.forget(level, amount), 0);
    if (skillLevel === 0) {
      // if the skill is forgotten completely, remove it, because it is not needed any more
      this.skills.splice(index, 1);
    } else {
      // otherwise change the value
      this.skills[index] = `${skill}+${skillLevel}`;
    }
  }

  /**
   * Since humans do not keep all their knowledge but forget it from time to time, it is considered here as its own
   * function
   * @param basis
   * @param time
   * @param forgetRate
   */
  public forget(basis: number, time: number, forgetRate: number = FORGET_RATE) {
    return basis - forgetRate * time;
  }

  /**
   * Returns the percentage of allocation of a user in a time-range. It is for easier calculation of remaining
   * allocation, to not create a large amount of slots for a fine-grained schedule. This way it is possible to get an
   * allocation of more than 100% in a shorter time-range, but in bigger scale it will reduce the amount
   * @param to
   * @param from
   */
  public plannedAmount(to: DateTime, from: DateTime = DateTime.now()) {
    return (
      this.slots
        // sum up their amount in the specified time-range
        .reduce((result, slot) => result + slot.getAmount(to, from), 0)
    );
  }
}
