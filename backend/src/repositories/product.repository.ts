import { Prisma, Product } from '@prisma/client';
import { prisma } from './prisma.js';

export class ProductRepository {
  public static async findAll(): Promise<Product[]> {
    return prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  public static async findById(id: string, tx?: Prisma.TransactionClient): Promise<Product | null> {
    const client = tx || prisma;
    return client.product.findUnique({
      where: { id },
    });
  }

  public static async findBySku(sku: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { sku },
    });
  }

  /**
   * Acquire a pessimistic row-level lock on the product row within a transaction.
   * Prevents race conditions during simultaneous stock updates.
   */
  public static async findByIdForUpdate(
    id: string,
    tx: Prisma.TransactionClient
  ): Promise<Product | null> {
    const rows = await tx.$queryRaw<Product[]>`
      SELECT * FROM "products"
      WHERE "id" = ${id}
      FOR UPDATE
    `;
    return rows[0] || null;
  }

  public static async create(
    data: Prisma.ProductCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Product> {
    const client = tx || prisma;
    return client.product.create({
      data,
    });
  }

  public static async update(
    id: string,
    data: Prisma.ProductUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Product> {
    const client = tx || prisma;
    return client.product.update({
      where: { id },
      data,
    });
  }

  public static async delete(id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id },
    });
  }

  public static async countReordersForProduct(productId: string): Promise<number> {
    return prisma.reorder.count({
      where: { productId },
    });
  }
}
