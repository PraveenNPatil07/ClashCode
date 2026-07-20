import type { Request, Response } from 'express';

import { listColleges } from '../models/collegeModel.js';

export async function getColleges(_request: Request, response: Response): Promise<void> {
  try {
    const colleges = await listColleges();
    response.status(200).json({ colleges });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while fetching colleges.'
    });
  }
}
