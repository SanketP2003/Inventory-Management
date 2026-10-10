import { createHash, randomInt } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { pool, query } from '../db/pool.js';
import { HttpError, validate } from '../middleware.js';
import { queueReorder } from '../services/reorderQueue.js';

const router = Router();
const requestSchema = z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive().optional(), requested_by: z.string().max(120).optional() });
const otpSchema = z.object({ code: z.string().regex(/^\d{6}$/) });
const hash = (code: string) => createHash('sha256').update(code).digest('hex');

router.get('/', async (req, res, next) => { try { const status = req.query.status ? String(req.query.status) : null; res.json((await query('SELECT r.*,p.sku,p.name FROM reorder_requests r JOIN products p ON p.id=r.product_id WHERE ($1::text IS NULL OR r.status=$1) ORDER BY r.created_at DESC',[status])).rows); } catch(e){next(e);} });
router.post('/', validate(requestSchema), async (req,res,next) => { try { const p = await query('SELECT * FROM products WHERE id=$1',[req.body.product_id]); if(!p.rowCount) throw new HttpError(404,'Product not found'); const quantity=req.body.quantity ?? p.rows[0].reorder_quantity; const result=await query('INSERT INTO reorder_requests(product_id,quantity,requested_by) VALUES($1,$2,$3) RETURNING *',[req.body.product_id,quantity,req.body.requested_by]); res.status(201).json(result.rows[0]); } catch(e){next(e);} });
router.post('/:id/otp/request', async (req,res,next) => { try { const reorder=await query('SELECT id,status FROM reorder_requests WHERE id=$1',[req.params.id]); if(!reorder.rowCount) throw new HttpError(404,'Reorder request not found'); if(!['pending','pending_approval'].includes(reorder.rows[0].status)) throw new HttpError(409,'Only pending reorders can be approved'); const code=String(randomInt(100000,1000000)); await query(`INSERT INTO otp_requests(reorder_id,code_hash,expires_at) VALUES($1,$2,now()+($3 * interval '1 minute'))`,[req.params.id,hash(code),config.otpTtlMinutes]); // Replace this with an SMS/email provider in production.
 res.json({ message:'OTP generated', expires_in_seconds:config.otpTtlMinutes*60, ...(config.nodeEnv !== 'production' ? { development_code:code } : {}) }); } catch(e){next(e);} });
router.post('/:id/otp/verify', validate(otpSchema), async (req,res,next) => { const client=await pool.connect(); try { await client.query('BEGIN'); const otp=await client.query('SELECT * FROM otp_requests WHERE reorder_id=$1 AND used_at IS NULL ORDER BY expires_at DESC LIMIT 1 FOR UPDATE',[req.params.id]); if(!otp.rowCount || new Date(otp.rows[0].expires_at) < new Date()) throw new HttpError(400,'OTP expired or not found'); if(otp.rows[0].attempts >= 5) throw new HttpError(429,'Too many OTP attempts'); if(hash(req.body.code)!==otp.rows[0].code_hash) { await client.query('UPDATE otp_requests SET attempts=attempts+1 WHERE id=$1',[otp.rows[0].id]); throw new HttpError(400,'Invalid OTP'); } const approved=await client.query("UPDATE reorder_requests SET status='approved',approved_at=now() WHERE id=$1 AND status IN ('pending','pending_approval') RETURNING *",[req.params.id]); if(!approved.rowCount) throw new HttpError(409,'Reorder is no longer pending'); await client.query('UPDATE otp_requests SET used_at=now() WHERE id=$1',[otp.rows[0].id]); await client.query('COMMIT'); res.json(approved.rows[0]); } catch(e){ await client.query('ROLLBACK'); next(e); } finally { client.release(); } });
router.post('/:id/queue', async (req,res,next) => { try { const result=await query('SELECT product_id FROM reorder_requests WHERE id=$1',[req.params.id]); if(!result.rowCount) throw new HttpError(404,'Reorder request not found'); await queueReorder(result.rows[0].product_id); res.status(202).json({queued:true}); } catch(e){next(e);} });
export default router;
