import { Model, Query, HydratedDocument, Schema } from 'mongoose';

export interface PaginationResult {
  currentPage: number;
  limit: number;
  totalDocs: number;
  totalPages: number;
  next?: number;
  prev?: number;
}

export interface QueryString {
  page?: string;
  limit?: string;
  sort?: string;
  fields?: string;
  keyword?: string;
  from?: string;
  to?: string;
  [key: string]: string | undefined;
}

type MongoOperator = '$gte' | '$gt' | '$lte' | '$lt';
type ParsedValue = string | number | Record<MongoOperator, number>;

export const parseOperators = (
  query: Record<string, string>,
): Record<string, ParsedValue> => {
  const parsed: Record<string, ParsedValue> = {};

  for (const key in query) {
    const match = key.match(/^(.+)\[(gte|gt|lte|lt)\]$/);

    if (match) {
      const field = match[1];
      const op = `$${match[2]}` as MongoOperator;

      const existing = parsed[field];

      if (
        !existing ||
        typeof existing === 'string' ||
        typeof existing === 'number'
      ) {
        parsed[field] = {} as Record<MongoOperator, number>;
      }

      (parsed[field] as Record<MongoOperator, number>)[op] = Number(query[key]);
    } else {
      const value = query[key];

      if (value !== undefined) {
        parsed[key] = value;
      }
    }
  }

  return parsed;
};

export const getPagination = (query: QueryString) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 10);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const getSelectFields = (fields?: string) =>
  fields ? fields.split(',').join(' ') : undefined;

export const getSortFields = (sort?: string) =>
  sort ? sort.split(',').join(' ') : undefined;

export const applyKeywordFilter = <T>(
  model: Model<T>,
  query: Query<HydratedDocument<T>[], HydratedDocument<T>>,
  keyword: string,
) => {
  const schema = model.schema as Schema<T>;
  const paths = schema.paths;

  const stringFields = Object.keys(paths).filter((field) => {
    const path = paths[field];

    return (
      path.instance === 'String' && !field.startsWith('_') && field !== '__v'
    );
  });

  if (!stringFields.length) return query;

  const regex = new RegExp(keyword, 'i');

  return query.find({
    $or: stringFields.map((field) => ({
      [field]: regex,
    })),
  });
};

type MongoFilter = Record<string, unknown>;

const buildFilter = (obj: Record<string, unknown>): MongoFilter => obj;

// -----------------------------
// ApiFeatures Class
// -----------------------------
export class ApiFeatures<T> {
  public mongooseQuery: Query<HydratedDocument<T>[], HydratedDocument<T>>;
  public paginationResult?: PaginationResult;

  constructor(
    query: Query<HydratedDocument<T>[], HydratedDocument<T>>,
    private queryString: QueryString,
  ) {
    this.mongooseQuery = query;
  }

  filter(): this {
    const queryObj = { ...this.queryString };
    const excluded = ['page', 'limit', 'sort', 'fields', 'keyword'];

    excluded.forEach((key) => delete queryObj[key]);

    const parsed = parseOperators(queryObj as Record<string, string>);

    const filter = buildFilter(parsed);

    this.mongooseQuery = this.mongooseQuery.find(filter);

    return this;
  }

  search(model: Model<T>): this {
    if (this.queryString.keyword) {
      this.mongooseQuery = applyKeywordFilter(
        model,
        this.mongooseQuery,
        this.queryString.keyword,
      );
    }
    return this;
  }

  sort(): this {
    const sort = getSortFields(this.queryString.sort);
    if (sort) {
      this.mongooseQuery = this.mongooseQuery.sort(sort);
    }
    return this;
  }

  limit(): this {
    const fields = getSelectFields(this.queryString.fields);
    if (fields) {
      this.mongooseQuery = this.mongooseQuery.select(fields);
    }
    return this;
  }

  paginate(totalDocs: number): this {
    const { page, limit, skip } = getPagination(this.queryString);

    this.paginationResult = {
      currentPage: page,
      limit,
      totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      next: page * limit < totalDocs ? page + 1 : undefined,
      prev: page > 1 ? page - 1 : undefined,
    };

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);

    return this;
  }

  populate(fields: string[]): this {
    fields.forEach((field) => {
      this.mongooseQuery = this.mongooseQuery.populate(field);
    });
    return this;
  }
}
