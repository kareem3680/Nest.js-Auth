import {
  Model,
  Types,
  QueryFilter,
  UpdateQuery,
  HydratedDocument,
  SortOrder,
  PipelineStage,
} from 'mongoose';
import { Injectable } from '@nestjs/common';
import {
  ApiFeatures,
  PaginationResult,
  QueryString,
} from '../../common/utils/api-features.util';
import { PaginationQuery } from '../../common/interfaces/request.interface';

@Injectable()
export class BaseRepository<T> {
  constructor(private readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<HydratedDocument<T>> {
    return await this.model.create(data);
  }

  async findById(
    id: string | Types.ObjectId,
    options?: { populate?: string[]; select?: string },
  ): Promise<HydratedDocument<T> | null> {
    let query = this.model.findById(id);

    if (options?.populate) {
      options.populate.forEach((field) => {
        query = query.populate(field);
      });
    }

    if (options?.select) {
      query = query.select(options.select);
    }

    return await query.exec();
  }

  async findOne(
    filter: QueryFilter<T>,
    options?: { populate?: string[]; select?: string },
  ): Promise<HydratedDocument<T> | null> {
    let query = this.model.findOne(filter);

    if (options?.populate) {
      options.populate.forEach((field) => {
        query = query.populate(field);
      });
    }

    if (options?.select) {
      query = query.select(options.select);
    }

    return await query.exec();
  }

  async find(
    filter: QueryFilter<T>,
    options?: {
      populate?: string[];
      select?: string;
      sort?: Record<string, SortOrder>;
    },
  ): Promise<HydratedDocument<T>[]> {
    let query = this.model.find(filter);

    if (options?.sort) {
      query = query.sort(options.sort);
    }

    if (options?.populate) {
      options.populate.forEach((field) => {
        query = query.populate(field);
      });
    }

    if (options?.select) {
      query = query.select(options.select);
    }

    return await query.exec();
  }

  async update(
    id: string | Types.ObjectId,
    data: UpdateQuery<T>,
  ): Promise<HydratedDocument<T> | null> {
    return await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async updateOne(
    filter: QueryFilter<T>,
    data: UpdateQuery<T>,
  ): Promise<HydratedDocument<T> | null> {
    return await this.model
      .findOneAndUpdate(filter, data, { new: true })
      .exec();
  }

  async delete(
    id: string | Types.ObjectId,
  ): Promise<HydratedDocument<T> | null> {
    return await this.model.findByIdAndDelete(id).exec();
  }

  async deleteOne(filter: QueryFilter<T>): Promise<HydratedDocument<T> | null> {
    return await this.model.findOneAndDelete(filter).exec();
  }

  async countDocuments(
    filter: QueryFilter<T> = {} as QueryFilter<T>,
  ): Promise<number> {
    return await this.model.countDocuments(filter).exec();
  }

  async aggregate<R = unknown>(pipeline: PipelineStage[]): Promise<R[]> {
    return await this.model.aggregate<R>(pipeline).exec();
  }

  async findWithPagination(
    filter: QueryFilter<T>,
    query: PaginationQuery,
    modelName?: string,
    options?: { populate?: string[] },
  ): Promise<{
    results: number;
    data: HydratedDocument<T>[];
    paginationResult: PaginationResult;
  }> {
    const apiFeatures = new ApiFeatures<T>(
      this.model.find(filter),
      query as unknown as QueryString,
    )
      .search(this.model)
      .filter();

    const safeFilter = apiFeatures.mongooseQuery.getFilter() as QueryFilter<T>;

    const filteredDocumentsCount = await this.model.countDocuments(safeFilter);

    apiFeatures.limit().sort().paginate(filteredDocumentsCount);

    if (options?.populate) {
      apiFeatures.populate(options.populate);
    }

    const documents = await apiFeatures.mongooseQuery.exec();

    return {
      results: documents.length,
      data: documents,
      paginationResult: apiFeatures.paginationResult!,
    };
  }
}
