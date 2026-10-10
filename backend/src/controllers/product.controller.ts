import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service.js';
import {
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
} from '../validators/product.validator.js';

export class ProductController {
  public static async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await ProductService.getAllProducts();
      res.status(200).json({ data: products });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const product = await ProductService.getProductById(id);
      res.status(200).json({ data: product });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateProductInput;
      const product = await ProductService.createProduct(input);
      res.status(201).json({ data: product });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateProductInput;
      const product = await ProductService.updateProduct(id, input);
      res.status(200).json({ data: product });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateStockInput;
      const product = await ProductService.updateStock(id, input);
      res.status(200).json({ data: product });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      await ProductService.deleteProduct(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
