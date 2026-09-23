import { Router, Request, Response } from 'express';
import { SmsService } from '../smsService';

const router = Router();

/**
 * Public Arkesel SMS Delivery Webhook (DLR)
 * Arkesel sends delivery status updates via HTTP POST or GET to this endpoint.
 */
router.post('/arkesel', async (req: Request, res: Response) => {
  try {
    const payload = req.body || req.query;
    console.log('[Arkesel Webhook POST received]', JSON.stringify(payload));
    const result = await SmsService.processDeliveryCallback(payload);
    res.status(200).json({ status: 'success', received: true, ...result });
  } catch (err: any) {
    console.error('[Arkesel Webhook POST error]', err);
    res.status(500).json({ status: 'error', message: err.message || 'Webhook processing failed' });
  }
});

router.get('/arkesel', async (req: Request, res: Response) => {
  try {
    const payload = req.query;
    console.log('[Arkesel Webhook GET received]', JSON.stringify(payload));
    const result = await SmsService.processDeliveryCallback(payload);
    res.status(200).json({ status: 'success', received: true, ...result });
  } catch (err: any) {
    console.error('[Arkesel Webhook GET error]', err);
    res.status(500).json({ status: 'error', message: err.message || 'Webhook processing failed' });
  }
});

/**
 * Developer / Admin endpoint to simulate or test delivery callbacks
 */
router.post('/simulate-dlr', async (req: Request, res: Response) => {
  try {
    const { messageId, status, recipient, reason, network } = req.body;
    const result = await SmsService.processDeliveryCallback({
      sms_id: messageId,
      status: status || 'DELIVERED',
      recipient,
      reason,
      network,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
