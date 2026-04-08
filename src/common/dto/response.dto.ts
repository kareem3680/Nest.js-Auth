export class PaginationResult {
  currentPage!: number;
  limit!: number;
  totalDocs!: number;
  totalPages!: number;
  next?: number;
  prev?: number;
}

export class PaginatedResponse<T> {
  status!: string;
  message!: string;
  results!: number;
  paginationResult!: PaginationResult;
  data!: T[];
  stats?: any;
}

export class ResponseWithToken<T> {
  status!: string;
  message!: string;
  data?: T;
  accessToken?: string;
  refreshToken?: string;
}
