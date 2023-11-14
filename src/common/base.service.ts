import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { RES_ERROR_GENERIC, ResException } from './ResException';
import { BaseEntity } from './base.entity';
import { Dto } from './base.dto';
import { User } from '../models/user/user.entity';
import { Relation } from './base.controller';
import { KeyOf } from '../helper/Typings';

export interface FindAllResponse<Model> {
  total: number;
  records: Model[];
}

export abstract class BaseService<
  Model extends BaseEntity<Model>,
  ModelDto extends Dto<ModelDto>,
> {
  public abstract repository: Repository<Model>;
  public readonly short: string;

  protected constructor(short?: string) {
    // default acronym. Can be changed in implemented services if wanted
    this.short = short ?? this.constructor.name;
  }

  async create(createDto: ModelDto, user: User, ...args): Promise<Model> {
    this.deleteMetaData(createDto);
    createDto = await this.beforeInsert(createDto, user, ...args);

    const res = await this.repository.insert(createDto as object);
    const record = await this.repository.findOne({
      where: { id: res.identifiers[0].id },
    });

    await this.afterInsert(record, createDto, user, ...args);

    return record;
  }

  async findAll(
    options?: FindManyOptions<Model>,
  ): Promise<FindAllResponse<Model>> {
    const res = await this.repository.findAndCount(options);
    return {
      total: res[1],
      records: res[0],
    };
  }

  /**
   * Shorthand function to just get entities from an array of IDs.
   */
  async findByIds(ids: string[]): Promise<Model[]> {
    const tagsResponse = await this.findAll({
      where: { id: In(ids) } as FindOptionsWhere<Model>,
    });
    return tagsResponse.records;
  }

  /**
   * @throws ResException 404 if record not found
   */
  async findOne(options: FindOneOptions<Model>): Promise<Model> {
    try {
      return await this.repository.findOneOrFail(options);
    } catch (_e) {
      throw new ResException(RES_ERROR_GENERIC.NOT_FOUND, [
        'In findOne of ' + this.constructor.name,
      ]);
    }
  }

  /**
   * Try to find a record. If not found, create a new one.
   * @param options
   * @param createDto
   * @param user the logged-in user
   */
  async findOneOrCreate(
    options: FindOneOptions<Model>,
    createDto: ModelDto,
    user?: User,
  ): Promise<Model> {
    try {
      return await this.findOne(options);
    } catch (_e) {
      return this.create(createDto, user);
    }
  }

  async update(
    id: string,
    user: User,
    updateDto: Partial<ModelDto>,
    record?: Model,
    ...args
  ): Promise<void> {
    // if there is no record or the deleted prop is undefined
    if (!record || record.deleted === undefined || record.deleted === null) {
      record = await this.findOne({
        where: {
          id,
        },
      } as FindOneOptions<Model>);
    }
    if (record.deleted) {
      throw new ResException(RES_ERROR_GENERIC.DELETED, [
        record.constructor.name,
      ]);
    }
    await this.beforeUpdate(id, user, updateDto, record, ...args);
    await this.repository.update(id, updateDto as object);
    await this.afterUpdate(id, user, updateDto);
  }

  /**
   * Updates only the deleted flag to true
   * @param id
   * @param user
   * @param source
   */
  async updateForRemove(id: string, user: User, source: Model) {
    await this.beforeRemove(id, user, 'updateForRemove', source);
    await this.update(id, user, { deleted: true } as Partial<ModelDto>, source);
    const record = await this.findOne({
      where: { id },
    } as FindOneOptions<Model>);
    await this.afterRemove(record, user, 'updateForRemove');
  }

  /**
   * @throws ResException 404 if record not found
   */
  async remove(id: string, user: User, source?: Model): Promise<void> {
    await this.beforeRemove(id, user, 'remove', source);
    const record = await this.findOne({
      where: { id },
    } as FindOneOptions<Model>);
    console.log('service:', this.constructor.name, 'id', id);
    const res = await this.repository.delete(id);
    if (res.affected === 0) {
      throw new ResException(RES_ERROR_GENERIC.NOT_DELETED);
    }

    await this.afterRemove(record, user, 'remove');
  }

  async count(
    where: FindOptionsWhere<Model> | FindOptionsWhere<Model>[],
  ): Promise<number> {
    return await this.repository.countBy(where);
  }

  public parseWhereProperty(
    queryBuilder: SelectQueryBuilder<Model>,
    propKey: string,
    propValue: any,
  ): boolean {
    return false;
  }

  public createQueryBuilder(
    user: User,
    alias?: string,
  ): SelectQueryBuilder<Model> {
    return this.repository.createQueryBuilder(alias);
  }

  /**
   * InnerJoin (without select) from `inheritService` on `sourceColumn` respecting its getQueryForUser.
   */
  public queryInheritAccessFrom(
    queryBuilder: SelectQueryBuilder<Model>,
    user: User,
    inheritService: BaseService<any, any>,
    sourceColumn: string,
    joinAlias: string,
  ): SelectQueryBuilder<Model> {
    const inheritQuery = inheritService.repository.createQueryBuilder();
    inheritQuery.select(`${inheritQuery.alias}.id`);
    queryBuilder.innerJoin(
      `${queryBuilder.alias}.${sourceColumn}`,
      joinAlias,
      `${joinAlias}.id = ANY(${inheritQuery.getQuery()})`,
    );
    queryBuilder.setParameters(inheritQuery.getParameters());

    return queryBuilder;
  }

  /**
   * Easier use of addRelationsQuery
   * @param relationsToPopulate
   * @param queryBuilder
   * @param user
   * @protected
   */
  public addLeftJoinAndSelect(
    relationsToPopulate: Relation<Model>[],
    queryBuilder: SelectQueryBuilder<Model>,
    user: User,
  ) {
    return this.addRelationsQuery(
      relationsToPopulate,
      queryBuilder,
      user,
      'left',
      true,
    );
  }

  /**
   * Easier use of addRelationsQuery
   * @param relationsToPopulate
   * @param queryBuilder
   * @param user
   * @protected
   */
  public addInnerJoinAndSelect(
    relationsToPopulate: Relation<Model>[],
    queryBuilder: SelectQueryBuilder<Model>,
    user: User,
  ) {
    return this.addRelationsQuery(
      relationsToPopulate,
      queryBuilder,
      user,
      'inner',
      true,
    );
  }

  /**
   * Adds join statements to the query
   * @param relationsToPopulate
   * @param queryBuilder
   * @param user
   * @param join Type of joining. If joining is 'inner' and the relation was not found, the whole record will not be
   * returned instead of just the joined record
   * @param selectRelation Decide whether the relation should be populated
   * @private
   */
  public addRelationsQuery(
    relationsToPopulate: Relation<Model>[],
    queryBuilder: SelectQueryBuilder<Model>,
    user: User,
    join: 'left' | 'inner' = 'left',
    selectRelation: boolean = true,
  ) {
    // for every relation
    relationsToPopulate.forEach((relation: Relation<Model>) => {
      const relationQuery = this.createRelationsQuery(relation, user);
      relationQuery.select(`${relationQuery.alias}.id`);

      const select =
        relation.select !== undefined
          ? typeof relation.select === 'boolean'
            ? relation.select
            : // empty array means true. If the array contains some values, only them are selected
              relation.select.length === 0
          : selectRelation;

      // inner or left join. Decide if you want to select all its values
      queryBuilder[join + 'Join' + (select ? 'AndSelect' : '')](
        // e.g. user.role
        `${queryBuilder.alias}.${relation.property}`,
        // role
        relation.property,
        // role.id IN (roleQuery)
        `${relation.property}.id = ANY(${relationQuery.getQuery()})` +
          // plus optional condition if wanted, for fancy joining
          (relation.optionalCondition
            ? ` AND ${relation.optionalCondition}`
            : ''),
      );
      // set the parameters to the query
      queryBuilder.setParameters(relationQuery.getParameters());

      if (relation.relations) {
        relation.relations.forEach((rel: string) => {
          queryBuilder[join + 'Join' + (select ? 'AndSelect' : '')](
            `${relation.property}.${rel}`,
            `${relation.property}_${rel}`,
          );
        });
      }

      if (relation.select && Array.isArray(relation.select)) {
        relation.select.forEach((select: string) =>
          queryBuilder.addSelect(`${relation.property}.${select}`),
        );
      }
    });

    return queryBuilder;
  }

  private createRelationsQuery(relation: Relation<Model>, user: User) {
    // you can define a query before
    let relationQuery = relation.serviceOrQuery;
    if (!(relationQuery instanceof SelectQueryBuilder)) {
      // or use the default one
      relationQuery = relationQuery.createQueryBuilder(user, relation.property);
      relationQuery.andWhere(`${relationQuery.alias}.deleted = false`);
    }
    return relationQuery;
  }

  protected deleteMetaData(entity: ModelDto) {
    delete entity.id;
    delete entity.createdAt;
    delete entity.updatedAt;
  }

  public async replaceCollection(
    id: string,
    collection: KeyOf<Model, BaseEntity<any>[]>,
    valuesToSave: string | { id: string } | ({ id: string } | string)[],
    options?: Partial<Model>,
  ): Promise<DeepPartial<Model>> {
    return this.repository.save({
      id,
      [collection]: (Array.isArray(valuesToSave)
        ? valuesToSave
        : [valuesToSave]
      )
        // if entry has an id, use it, otherwise, assume that entry is already the id
        .map((entry) => ({ id: (entry as any).id ?? entry })),
      ...options,
    } as DeepPartial<Model>);
  }

  /**
   * Adds at least one Entry to a many-to-many relationship table
   * @param id
   * @param collection
   * @param valueToAdd
   */

  public async addToCollection(
    id: string,
    collection: KeyOf<Model, BaseEntity<any>[]>,
    valueToAdd: { id: string } | { id: string }[],
  ) {
    const record = await this.findOne({
      // find record with id
      where: {
        id,
      } as FindOptionsWhere<Model>,
      relations: {
        // relate the one collection
        [collection]: true,
      } as FindOptionsRelations<Model>,
      select: {
        // select only the id of the relation
        [collection]: {
          id: true,
        },
      } as FindOptionsSelect<Model>,
    });
    // add the new value(s) to the value
    const valuesToSave = (record[collection] as { id: string }[]).concat(
      ...(Array.isArray(valueToAdd) ? valueToAdd : [valueToAdd]),
    );
    // and save the collection
    return this.replaceCollection(id, collection, valuesToSave);
  }

  public async removeFromCollection(
    id: string,
    collection: KeyOf<Model, BaseEntity<any>[]>,
    valuesToRemove: string | string[],
  ) {
    const record = await this.findOne({
      // find record with id
      where: {
        id,
      } as FindOptionsWhere<Model>,
      relations: {
        // relate the one collection
        [collection]: true,
      } as FindOptionsRelations<Model>,
      select: {
        // select only the id of the relation
        [collection]: {
          id: true,
        },
      } as FindOptionsSelect<Model>,
    });
    valuesToRemove = Array.isArray(valuesToRemove)
      ? valuesToRemove
      : [valuesToRemove];
    // remove value(s) from the values
    const valuesToSave = (record[collection] as { id: string }[]).filter(
      (value: { id: string }) => !valuesToRemove.includes(value.id),
    );
    // and save the collection
    return this.replaceCollection(id, collection, valuesToSave);
  }

  // ---------------------------------
  // ------ lifecycle callbacks ------
  // ---------------------------------

  /**
   * Override this to be able to manipulate or check the dto before the insert.
   */
  async beforeInsert(
    createDto: ModelDto,
    user: User,
    ...args
  ): Promise<ModelDto> {
    return createDto;
  }

  /**
   * Override this to be able to do something after insert.
   */
  protected async afterInsert(
    record: Model,
    createDto: ModelDto,
    user: User,
    ...args: any[]
  ): Promise<Model> {
    return record;
  }

  async beforeUpdate(
    id: string,
    user: User,
    updateDto: Partial<ModelDto>,
    record: Model,
    ...args: any[]
  ): Promise<Partial<ModelDto>> {
    return updateDto;
  }

  async afterUpdate(
    id: string,
    user: User,
    updateDto: Partial<ModelDto>,
  ): Promise<string> {
    return id;
  }

  /**
   * executed before removal or before updateForRemove
   * @param id
   * @param user
   * @param removeFunction function to remove the record. updateForRemove or really remove
   * @param source
   */
  async beforeRemove(
    id: string,
    user: User,
    removeFunction: 'updateForRemove' | 'remove' = 'updateForRemove',
    source?: Model,
  ): Promise<string> {
    return id;
  }

  async afterRemove(
    record: Model,
    user: User,
    removeFunction: 'updateForRemove' | 'remove' = 'updateForRemove',
  ): Promise<Model> {
    return record;
  }

  // ---------------------------------
  // ---- livecycle callbacks end ----
  // ---------------------------------
}
