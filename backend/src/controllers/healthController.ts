import type { Request, Response } from 'express';
import type { HealthCheckResponse } from '@clashcode/shared';

import { supabase } from '../db/supabase.js';

export async function getHealth(_request: Request, response: Response): Promise<void> {
  const checkedAt = new Date().toISOString();

  try {
    const { error } = await supabase.from('colleges').select('id', { count: 'exact', head: true });
    if (error) {
      throw error;
    }

    const payload: HealthCheckResponse = {
      ok: true,
      database: 'connected',
      checkedAt
    };

    response.status(200).json(payload);
  } catch {
    const payload: HealthCheckResponse = {
      ok: false,
      database: 'disconnected',
      checkedAt
    };

    response.status(503).json(payload);
  }
}
