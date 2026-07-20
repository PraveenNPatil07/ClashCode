import type { Request, Response } from 'express';

import { createUserProfile, fetchCollegeById, findUserByEmail } from '../models/userModel.js';

export async function signUp(request: Request, response: Response): Promise<void> {
  try {
    const { name, email, collegeId } = request.body as {
      name?: string;
      email?: string;
      collegeId?: string;
    };

    if (!name || !email || !collegeId) {
      response.status(400).json({ message: 'name, email, and collegeId are required.' });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      response.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    const college = await fetchCollegeById(collegeId);
    if (!college) {
      response.status(404).json({ message: 'Selected college was not found.' });
      return;
    }

    const user = await createUserProfile({ name, email, collegeId });
    response.status(201).json({ user, college });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while creating account.'
    });
  }
}

export async function signIn(request: Request, response: Response): Promise<void> {
  try {
    const { email } = request.body as { email?: string };
    if (!email) {
      response.status(400).json({ message: 'email is required.' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      response.status(404).json({ message: 'No account found for this email. Sign up first.' });
      return;
    }

    const college = await fetchCollegeById(user.college_id);
    response.status(200).json({ user, college });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while signing in.'
    });
  }
}
