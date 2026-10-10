import { Request, Response, NextFunction } from 'express';
import { ReorderService } from '../services/reorder.service.js';
import {
  GetReordersQuery,
  ApproveReorderInput,
} from '../validators/reorder.validator.js';

export class ReorderController {
  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as GetReordersQuery;
      const result = await ReorderService.getReorders({
        status: query.status,
        page: query.page,
        limit: query.limit,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const reorder = await ReorderService.getReorderById(id);
      res.status(200).json({ data: reorder });
    } catch (err) {
      next(err);
    }
  }

  public static async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { otp } = req.body as ApproveReorderInput;
      const reorder = await ReorderService.approveReorder(id, otp);
      res.status(200).json({
        message: 'Reorder approved successfully. Job is queued for processing.',
        data: reorder,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const result = await ReorderService.resendOtp(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
