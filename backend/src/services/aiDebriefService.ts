import { fetchBattleDetail, fetchSubmissionsForBattle } from '../models/battleModel.js';
import { createChatCompletion } from './openai.js';

export async function generateBattleDebrief(battleId: string, userId: string): Promise<string> {
  const battle = await fetchBattleDetail(battleId);
  if (!battle) {
    throw new Error('Battle not found.');
  }
  const submissions = await fetchSubmissionsForBattle(battleId);

  const userSubmission = submissions.find(s => s.user_id === userId);
  const opponentSubmission = submissions.find(s => s.user_id !== userId);

  if (!userSubmission) {
    throw new Error('You have not submitted code for this battle yet.');
  }

  const prompt = `
You are an elite, brutal but fair coding mentor. A battle has just concluded between the User and their Opponent.
Analyze the provided submissions for the problem below and provide a concise, insightful debrief.

Problem Title: ${battle.problem.title}
Difficulty: ${battle.problem.difficulty}
Description:
${battle.problem.description}

User's Code (Language: ${userSubmission.language}):
\`\`\`${userSubmission.language}
${userSubmission.code}
\`\`\`

${opponentSubmission ? `
Opponent's Code (Language: ${opponentSubmission.language}):
\`\`\`${opponentSubmission.language}
${opponentSubmission.code}
\`\`\`
` : "The opponent did not submit any code."}

Provide a short, brutal but highly constructive debrief in Markdown.
Structure your response exactly with these headers:
### ⚔️ The Verdict
(1-2 sentences on who wrote better code and why. If no opponent, focus on the user.)
### 💡 Your Code
(2-3 bullet points critiquing the user's approach: Time complexity, bugs, bad practices, elegance.)
${opponentSubmission ? `
### 🛡️ Opponent's Code
(2-3 bullet points critiquing the opponent's approach. Point out what they did better or worse than the user.)
` : ''}
### 🧠 The Optimal Way
(1 brief paragraph explaining the best possible algorithmic approach for this problem.)

Keep it punchy, competitive, and insightful. Do not include introductory/outro fluff.
  `.trim();

  const aiResponse = await createChatCompletion([
    { role: 'system', content: 'You are an elite coding mentor providing post-battle code reviews.' },
    { role: 'user', content: prompt }
  ], { maxTokens: 800 });

  return aiResponse.text;
}
