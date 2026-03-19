export class SanitizeUtil {
  static isEmpty(value: unknown): boolean {
    if (value instanceof Date) return false;
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    )
      return true;
    return false;
  }

  static sanitizeObject<T extends object>(
    obj: T,
    fields: [string, (obj: T) => unknown][],
  ): Record<string, unknown> {
    const entries: [string, unknown][] = [];

    for (const [key, valueFn] of fields) {
      try {
        const value = valueFn(obj);
        if (!SanitizeUtil.isEmpty(value)) {
          entries.push([key, value]);
        }
      } catch {
        // Skip errors silently
      }
    }

    return Object.fromEntries(entries);
  }

  static sanitizeUser(
    user: Partial<{
      _id: string;
      name: string;
      active: boolean;
      email: string;
      phone: string;
      role: string;
      hireDate: Date;
      position: string;
      jobId: number;
      profileImage: string;
    }>,
  ): Record<string, unknown> {
    return SanitizeUtil.sanitizeObject(user, [
      ['id', (u) => u._id],
      ['name', (u) => u.name],
      ['active', (u) => u.active],
      ['email', (u) => u.email],
      ['phone', (u) => u.phone],
      ['role', (u) => u.role],
      ['hireDate', (u) => u.hireDate],
      ['position', (u) => u.position],
      ['jobId', (u) => u.jobId],
      ['profileImage', (u) => u.profileImage],
    ]);
  }

  static sanitizeCompany(
    company: Partial<{
      _id: string;
      name: string;
      email: string;
      phone: string;
      active: boolean;
      createdBy?: { name: string };
      updatedBy?: { name: string };
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): Record<string, unknown> {
    return SanitizeUtil.sanitizeObject(company, [
      ['id', (c) => c._id],
      ['name', (c) => c.name],
      ['email', (c) => c.email],
      ['phone', (c) => c.phone],
      ['active', (c) => c.active],
      ['createdBy', (c) => c.createdBy?.name],
      ['updatedBy', (c) => c.updatedBy?.name],
      ['createdAt', (c) => c.createdAt],
      ['updatedAt', (c) => c.updatedAt],
    ]);
  }
}
