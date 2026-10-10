import { Prisma, Reorder, ReorderStatus } from '@prisma/client';
import { prisma } from './prisma.js';

export interface ReorderFindAllOptions {
  status?: ReorderStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedReorders {
  data: (Reorder & {
    product: {
      id: string;
      name: string;
      sku: string;
      costPrice: Prisma.Decimal;
    };
  })[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ReorderRepository {
  public static async findAll(options: ReorderFindAllOptions): Promise<PaginatedReorders> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ReorderWhereInput = {};
    if (options.status) {
      where.status = options.status;
    }

    const [total, data] = await Promise.all([
      prisma.reorder.count({ where }),
      prisma.reorder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              costPrice: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.reorder.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            costPrice: true,
            quantity: true,
            lowStockThreshold: true,
          },
        },
      },
    });
  }

  /**
   * Acquire a row lock on a reorder row for atomic updates (e.g., OTP attempts/approval).
   */
  public static async findByIdForUpdate(
    id: string,
    tx: Prisma.TransactionClient
  ): Promise<Reorder | null> {
    const rows = await tx.$queryRaw<Reorder[]>`
      SELECT * FROM "reorders"
      WHERE "id" = ${id}
      FOR UPDATE
    `;
    return rows[0] || null;
  }

  /**
   * Checks whether there is already an active reorder for this product.
   * Active statuses: PENDING_APPROVAL, QUEUED, PROCESSING.
   */
  public static async findActiveReorderForProduct(
    productId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Reorder | null> {
    const client = tx || prisma;
    return client.reorder.findFirst({
      where: {
        productId,
        status: {
          in: [
            ReorderStatus.PENDING_APPROVAL,
            ReorderStatus.QUEUED,
            ReorderStatus.PROCESSING,
          ],
        },
      },
    });
  }

  public static async create(
    data: Prisma.ReorderUncheckedCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Reorder> {
    const client = tx || prisma;
    return client.reorder.create({
      data,
    });
  }

  public static async update(
    id: string,
    data: Prisma.ReorderUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Reorder> {
    const client = tx || prisma;
    return client.reorder.update({
      where: { id },
      data,
    });
  }
}
