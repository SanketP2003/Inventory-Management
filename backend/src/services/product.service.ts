import { Prisma, Product } from '@prisma/client';
import { prisma } from '../repositories/prisma.js';
import { ProductRepository } from '../repositories/product.repository.js';
import {
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
} from '../validators/product.validator.js';
import {
  ConflictError,
  NotFoundError,
} from '../utils/errors.js';
import { LowStockService } from './lowstock.service.js';
import { logger } from '../utils/logger.js';

export class ProductService {
  public static async getAllProducts(): Promise<Product[]> {
    return ProductRepository.findAll();
  }

  public static async getProductById(id: string): Promise<Product> {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' was not found.`);
    }
    return product;
  }

  public static async createProduct(input: CreateProductInput): Promise<Product> {
    // Check for duplicate SKU
    const existing = await ProductRepository.findBySku(input.sku);
    if (existing) {
      throw new ConflictError(`A product with SKU '${input.sku}' already exists.`);
    }

    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await ProductRepository.create(
        {
          name: input.name,
          sku: input.sku,
          quantity: input.quantity,
          lowStockThreshold: input.lowStockThreshold,
          costPrice: new Prisma.Decimal(input.costPrice),
          supplierName: input.supplierName,
          reorderQuantity: input.reorderQuantity,
        },
        tx
      );

      // Perform low-stock detection inside transaction
      await LowStockService.checkAndTriggerReorder(product.id, tx);
      return product;
    });

    return createdProduct;
  }

  public static async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const existing = await ProductRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Product with ID '${id}' was not found.`);
    }

    if (input.sku && input.sku !== existing.sku) {
      const skuConflict = await ProductRepository.findBySku(input.sku);
      if (skuConflict) {
        throw new ConflictError(`A product with SKU '${input.sku}' already exists.`);
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.ProductUpdateInput = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.sku !== undefined) updateData.sku = input.sku;
      if (input.quantity !== undefined) updateData.quantity = input.quantity;
      if (input.lowStockThreshold !== undefined) updateData.lowStockThreshold = input.lowStockThreshold;
      if (input.costPrice !== undefined) updateData.costPrice = new Prisma.Decimal(input.costPrice);
      if (input.supplierName !== undefined) updateData.supplierName = input.supplierName;
      if (input.reorderQuantity !== undefined) updateData.reorderQuantity = input.reorderQuantity;

      const product = await ProductRepository.update(id, updateData, tx);

      // If quantity or threshold changed, check low-stock event
      if (input.quantity !== undefined || input.lowStockThreshold !== undefined) {
        await LowStockService.checkAndTriggerReorder(product.id, tx);
      }

      return product;
    });

    return updatedProduct;
  }

  public static async updateStock(id: string, input: UpdateStockInput): Promise<Product> {
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Row lock product to prevent simultaneous stock modification anomalies
      const product = await ProductRepository.findByIdForUpdate(id, tx);
      if (!product) {
        throw new NotFoundError(`Product with ID '${id}' was not found.`);
      }

      const updated = await ProductRepository.update(
        id,
        { quantity: input.quantity },
        tx
      );

      // Trigger low stock evaluation inside transaction
      await LowStockService.checkAndTriggerReorder(updated.id, tx);

      return updated;
    });

    logger.info(`Stock updated for product ${updatedProduct.sku}: now ${updatedProduct.quantity}`);
    return updatedProduct;
  }

  public static async deleteProduct(id: string): Promise<void> {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' was not found.`);
    }

    // Sensible handling: verify whether reorders exist for this product
    const reorderCount = await ProductRepository.countReordersForProduct(id);
    if (reorderCount > 0) {
      throw new ConflictError(
        `Cannot delete product '${product.name}' (SKU: ${product.sku}) because it has ${reorderCount} associated reorder record(s). Retained for auditing and inventory integrity.`,
        { code: 'PRODUCT_HAS_REORDERS', reorderCount }
      );
    }

    await ProductRepository.delete(id);
    logger.info(`Deleted product ID: ${id}`);
  }
}
