import { Request, Response } from 'express';
import { connectAppleCalendar, exchangeGoogleCode, getGoogleAuthUrl, listCalendarAccounts, syncCalendarAccount, syncCalendarsForUser } from '../services/calendarService';

export async function googleAuthorize(req: Request, res: Response) {
  try {
    const userId = req.userId || req.body.userId;
    const { redirectUri } = req.body;
    if (!userId || !redirectUri) {
      return res.status(400).json({ error: 'userId and redirectUri are required' });
    }
    const url = getGoogleAuthUrl(userId, redirectUri);
    return res.json({ url });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function googleCallback(req: Request, res: Response) {
  try {
    const userId = req.userId || req.body.userId;
    const { code, redirectUri } = req.body;
    if (!userId || !code || !redirectUri) {
      return res.status(400).json({ error: 'userId, code and redirectUri are required' });
    }
    const account = await exchangeGoogleCode(userId, code, redirectUri);
    return res.json({ account });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function appleConnect(req: Request, res: Response) {
  try {
    const userId = req.userId || req.body.userId;
    const { email, appSpecificPassword, principalUrl } = req.body;
    if (!userId || !email || !appSpecificPassword) {
      return res.status(400).json({ error: 'userId, email and appSpecificPassword are required' });
    }
    const account = await connectAppleCalendar(userId, { email, appSpecificPassword, principalUrl });
    return res.json({ account });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function listAccounts(req: Request, res: Response) {
  try {
    const userId = req.userId || String(req.query.userId || req.body.userId || '');
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const accounts = await listCalendarAccounts(userId);
    return res.json({ data: accounts });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function triggerAccountSync(req: Request, res: Response) {
  try {
    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    await syncCalendarAccount(accountId);
    return res.status(202).json({ ok: true });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function triggerUserSync(req: Request, res: Response) {
  try {
    const userId = req.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    await syncCalendarsForUser(userId);
    return res.status(202).json({ ok: true });
  } catch (err) {
    return handleError(res, err);
  }
}

function handleError(res: Response, err: unknown) {
  // eslint-disable-next-line no-console
  console.error('calendar controller error', err);
  const message = err instanceof Error ? err.message : 'Unexpected error';
  return res.status(500).json({ error: message });
}
