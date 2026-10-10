import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, validate } from '../middleware.js';

const router = Router();
const productSchema = z.object({ sku: z.string().min(1).max(64), name: z.string().min(1).max(200), description: z.string().optional(), category: z.string().optional(), supplier: z.string().optional(), unit_price: z.number().nonnegative().default(0), reorder_level: z.number().int().nonnegative().default(0), reorder_quantity: z.number().int().positive().default(1), stock_quantity: z.number().int().nonnegative().default(0) });
router.get('/', async (req, res, next) => { try { const q = String(req.query.q ?? ''); const result = await query("SELECT * FROM products WHERE ($1 = '' OR name ILIKE $1 OR sku ILIKE $1) ORDER BY created_at DESC", [`%${q}%`]); res.json(result.rows); } catch (e) { next(e); } });
router.get('/:id', async (req, res, next) => { try { const result = await query('SELECT * FROM products WHERE id = $1', [req.params.id]); if (!result.rowCount) throw new HttpError(404, 'Product not found'); res.json(result.rows[0]); } catch (e) { next(e); } });
router.post('/', validate(productSchema), async (req, res, next) => { try { const p = req.body; const result = await query('INSERT INTO products (sku,name,description,category,supplier,unit_price,reorder_level,reorder_quantity,stock_quantity) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [p.sku,p.name,p.description,p.category,p.supplier,p.unit_price,p.reorder_level,p.reorder_quantity,p.stock_quantity]); res.status(201).json(result.rows[0]); } catch (e) { next(e); } });
router.patch('/:id', validate(productSchema.partial()), async (req, res, next) => { try { const entries = Object.entries(req.body); if (!entries.length) throw new HttpError(400, 'At least one field is required'); const set = entries.map(([key], i) => `${key} = $${i + 1}`).join(', '); const result = await query(`UPDATE products SET ${set}, updated_at = now() WHERE id = $${entries.length + 1} RETURNING *`, [...entries.map(([, value]) => value), req.params.id]); if (!result.rowCount) throw new HttpError(404, 'Product not found'); res.json(result.rows[0]); } catch (e) { next(e); } });
router.delete('/:id', async (req, res, next) => { try { const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]); if (!result.rowCount) throw new HttpError(404, 'Product not found'); res.status(204).send(); } catch (e) { next(e); } });
export default router;
