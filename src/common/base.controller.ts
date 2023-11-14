import { Request, Response } from 'express';
import { Dto } from './base.dto';
import { BaseService, FindAllResponse } from './base.service';
import { RES_ERROR_GENERIC, ResException } from './ResException';
import { BaseEntity } from './base.entity';
import { FindOptionsWhere, SelectQueryBuilder } from 'typeorm';
import { User } from '../models/user/user.entity';
import { parseStringBoolean } from '../helper/helper-functions';
import {
  EntityWhereQuery,
  KeyOf,
  QueryParams,
  RelationKey,
} from '../helper/Typings';

/**
 * @property serviceOrQuery the service of the relation or a custom query
 * @property property the name of the relation
 * @property relations some further relations of the relation. Be aware of this, there is no access checking
 * @property select the properties to select from the relation
 */
export interface Relation<Model> {
  serviceOrQuery: BaseService<any, any> | SelectQueryBuilder<any>;
  property: RelationKey<Model>;
  optionalCondition?: string;
  relations?: string[];
  select?: string[] | boolean;
}

export abstract class BaseController<
  Model extends BaseEntity<Model>,
  ModelDto extends Dto<ModelDto>,
> {
  protected constructor(
    protected readonly service: BaseService<Model, ModelDto>,
    /**
     * Returns an Instance of the controllers model
     * @protected
     */
    protected readonly model: {
      new (...args): Model;
    },
  ) {}

  async create(
    req: Request,
    res: Response,
    user: User,
    body: Dto<ModelDto>,
    id?: string,
    redirectUrl?: string,
  ): Promise<void> {
    return this.redirect(req, res, id, redirectUrl);
  }

  abstract findAll(
    query: QueryParams<Model>,
    user: User,
    ...args
  ): Promise<FindAllResponse<Model>>;

  abstract findOne(id: string, ...args): Promise<Model>;

  async update(
    req: Request,
    res: Response,
    user: User,
    id: string,
    body: Dto<ModelDto>,
    redirectUrl?: string,
  ): Promise<void> {
    return this.redirect(req, res, id, redirectUrl);
  }

  abstract remove(id: string | number, user: User, ...args): Promise<void>;

  /**
   * Parses boolean strings from request query to real boolean values.
   * @param where
   * @param params
   */
  protected parseStringBooleanQuery(
    where: EntityWhereQuery<Model, boolean>,
    params: (KeyOf<Model, boolean> | string)[],
  ) {
    params.forEach((key: KeyOf<Model, boolean>) => {
      where[key] = parseStringBoolean(where[key] as boolean) as any;
    });
  }

  /**
   * Query for record, respecting users company.
   * @param id
   * @param user
   * @param relations the relations to populate. The service is the service of the attribute and the property is the
   * name of the attribute
   * * @param select prop to get what should be selected
   * * @param orderBy prop to order elements
   * @param select
   * @param orderBy
   * @throws 403 if user has no permission.
   */
  protected async getRecord(
    id: string,
    user: User,
    relations: Relation<Model>[] = [],
    select?: string | string[],
    orderBy?: string[] | string,
  ): Promise<Model> {
    const alias = new this.model(this.model).constructor.name.toLowerCase();

    const queryBuilder = this.service
      .createQueryBuilder(user, alias)
      .andWhereInIds(id);

    this.service.addLeftJoinAndSelect(relations, queryBuilder, user);

    if (select) {
      this.addSelectToQueryBuilder(select, queryBuilder);
    }

    this.parseSortQueryBuilder(queryBuilder, orderBy);

    const record = await queryBuilder.getOne();
    if (!record) {
      throw new ResException(RES_ERROR_GENERIC.NOT_FOUND);
    }
    return record;
  }

  protected async getRecords(
    user: User,
    query: QueryParams<Model>,
  ): Promise<FindAllResponse<Model>> {
    const alias = new this.model(this.model).constructor.name.toLowerCase();

    const queryBuilder = this.service.createQueryBuilder(user, alias);

    this.queryBuilderParseFromReqQuery(query, queryBuilder, user);

    const res = await queryBuilder.getManyAndCount();

    return {
      total: res[1],
      records: res[0],
    };
  }

  /**
   * Getter to define the possible relations an entity can have. Default value is an empty array. Override it where
   * entities can have relations(Not every entity has relations)
   * @param user User to create custom queries
   */
  protected possibleRelations(user?: User): Relation<Model>[] {
    return [];
  }

  /**
   * Parse skip, limit, sort and where from QueryParams and apply them to existing SelectQueryBuilder
   * @param reqQuery The query of the request
   * @param selectQueryBuilder An already defined queryBuilder
   * @param user The requesting user
   * @param populateRelations Needed, if the relations should be populated. It includes a user object, the mode of
   * accessing(default ist read) and an optional alias for the loaded model. You can also choose the join type and if
   * the relation should be selected. Defaults are 'left' and true
   * @protected
   */
  protected queryBuilderParseFromReqQuery(
    reqQuery: QueryParams<Model>,
    selectQueryBuilder: SelectQueryBuilder<Model>,
    user: User,
    populateRelations?: {
      join?: 'left' | 'inner';
      select?: boolean;
    },
  ): SelectQueryBuilder<Model> {
    const { skip, limit, sort, populate, select, ...where } = reqQuery;

    if (skip !== undefined && limit == undefined) {
      throw new ResException(RES_ERROR_GENERIC.EMPTY_LIMIT);
    }

    this.queryBuilderAddWhere(selectQueryBuilder, where)
      .skip(+skip || undefined)
      .limit(+limit || undefined);

    this.parseSortQueryBuilder(selectQueryBuilder, sort);
    if (populate) {
      // if just one relation is provided, it is not an array
      const queryRelations =
        typeof populate === 'string' ? populate.split(',') : populate;

      this.service.addRelationsQuery(
        this.possibleRelations().filter((entry: Relation<Model>) =>
          queryRelations.includes(entry.property),
        ),
        selectQueryBuilder,
        user,
        populateRelations?.join,
        populateRelations?.select || !select,
      );
    }

    // add custom select
    this.addSelectToQueryBuilder(select, selectQueryBuilder);

    return selectQueryBuilder;
  }

  private addSelectToQueryBuilder(
    select: string | string[],
    queryBuilder: SelectQueryBuilder<Model>,
  ) {
    const querySelect = typeof select === 'string' ? select.split(',') : select;
    if (querySelect && querySelect.length) {
      // check if there is a prop directly on the record
      const index = querySelect.findIndex(
        (select: string) => select.split('.').length === 1,
      );
      if (index > -1) {
        const selectProp = querySelect.splice(index, 1)[0];
        // reset the select statement, to get only the props you want
        queryBuilder.select(`${queryBuilder.alias}.${selectProp}`);
      }
      // go through every select
      querySelect.forEach((select: string) => {
        // they can be dot separated
        const selection = select
          .split('.')
          // this is to add values instead of replacing the select, if you want an additional prop like password, so you
          // can select '.password' and you get it additionally
          .filter((value: string) => value.trim().length);
        // create second array and add the alias for the query at index 0
        const props = [queryBuilder.alias, ...selection];
        selection.forEach((select: string, index: number) =>
          // it is shifted by one, so every attribute along the path is related
          queryBuilder.addSelect(
            `${props[index]}.${select}`,
            select === '*' ? '' : `${props[index]}_${select}`,
          ),
        );
      });
    }
  }

  protected parseSortQueryBuilder(
    queryBuilder: SelectQueryBuilder<Model>,
    queryValue: string | string[] | undefined,
  ): SelectQueryBuilder<Model> {
    if (!queryValue) {
      return queryBuilder;
    }

    if (typeof queryValue === 'string') {
      queryValue = queryValue.split(',');
    }

    queryValue.forEach((order: string) => {
      let [key, value] = order.split(/[\s+]+/);

      value = (value || '').toUpperCase();
      value = value === 'DESC' ? 'DESC' : 'ASC';

      key = key.split('.').length > 1 ? key : `${queryBuilder.alias}.${key}`;

      queryBuilder.addOrderBy(key, value as 'ASC' | 'DESC');
    });
    return queryBuilder;
  }

  private queryBuilderAddWhere(
    query: SelectQueryBuilder<Model>,
    where: { [key: string]: string | boolean | FindOptionsWhere<any> },
  ): SelectQueryBuilder<Model> {
    const alias = query.alias;
    Object.keys(where).forEach((key: string) => {
      const value = where[key];
      const sqlVariable = `${alias}${key}`;

      if (!this.service.parseWhereProperty(query, key, value)) {
        if (Array.isArray(value)) {
          query.andWhere(`${alias}.${key} IN (:${sqlVariable})`, {
            [sqlVariable]: value,
          });
          // if undefined, don't add a where clause. Null is ok
        } else if (value === null) {
          query.andWhere(`${alias}.${key} IS NULL`);
        } else if (value !== undefined) {
          query.andWhere(`${alias}.${key} = :${sqlVariable}`, {
            [sqlVariable]: value,
          });
        }
      }
    });
    return query;
  }

  protected redirect(
    req: Request,
    res: Response,
    id: string,
    redirectUrl?: string,
  ): void {
    if (!redirectUrl) {
      switch (req.method) {
        case 'PATCH':
          redirectUrl = req.url;
          break;
        case 'POST':
          redirectUrl = `${req.url}/${id}`;
          break;
        default:
          throw new ResException(
            501,
            'REDIRECT_NOT_IMPLEMENTED',
            `${req.method} not implemented in BaseController.redirect`,
          );
      }
    }

    return res.redirect(303, redirectUrl);
  }
}
