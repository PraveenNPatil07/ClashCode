const PUTER_SCRIPT_ID = 'clashcode-puter-sdk';
const PUTER_SCRIPT_URL = 'https://js.puter.com/v2/';
const DEFAULT_MODEL = import.meta.env.VITE_PUTER_MODEL ?? 'openai/gpt-5.6-sol';
function extractText(result) {
    if (typeof result === 'string') {
        return result;
    }
    return result.text
        ?? result.content
        ?? result.message?.content
        ?? result.choices?.[0]?.message?.content
        ?? '';
}
function stripJsonFences(raw) {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return fenced?.[1]?.trim() ?? raw.trim();
}
function isDifficulty(value) {
    return value === 'easy' || value === 'medium' || value === 'hard';
}
function validateGeneratedProblem(problem, expectedDifficulty, expectedCategory) {
    if (!problem || typeof problem !== 'object' || Array.isArray(problem)) {
        throw new Error('Generated problem is malformed.');
    }
    const candidate = problem;
    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
    const description = typeof candidate.description === 'string' ? candidate.description.trim() : '';
    const difficulty = typeof candidate.difficulty === 'string' ? candidate.difficulty : '';
    const category = typeof candidate.category === 'string' ? candidate.category.trim() : '';
    const testCases = candidate.test_cases;
    if (!title || !description || !isDifficulty(difficulty) || !category || !Array.isArray(testCases) || testCases.length < 4) {
        throw new Error('Generated problem is missing required fields.');
    }
    if (difficulty !== expectedDifficulty) {
        throw new Error(`Expected ${expectedDifficulty} difficulty but received ${difficulty}.`);
    }
    if (category.toLowerCase() !== expectedCategory.trim().toLowerCase()) {
        throw new Error(`Expected ${expectedCategory} category but received ${category}.`);
    }
    return {
        title,
        description,
        difficulty,
        category: expectedCategory.trim(),
        test_cases: testCases.map((testCase, index) => {
            if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
                throw new Error(`Test case ${index + 1} is malformed.`);
            }
            const input = testCase.input;
            if (!input || typeof input !== 'object' || Array.isArray(input)) {
                throw new Error(`Test case ${index + 1} input must be an object.`);
            }
            if (!Object.prototype.hasOwnProperty.call(testCase, 'expected_output')) {
                throw new Error(`Test case ${index + 1} is missing expected_output.`);
            }
            return {
                input: input,
                expected_output: testCase.expected_output
            };
        })
    };
}
function buildPrompt(difficulty, category, stricter = false) {
    return [
        'Generate one competitive programming problem for a live 1v1 coding battle.',
        `Difficulty must be exactly "${difficulty}".`,
        `Category must be exactly "${category.trim()}".`,
        'Return only valid JSON with this exact shape:',
        '{ "title": string, "description": string, "difficulty": "easy"|"medium"|"hard", "category": string, "test_cases": [{ "input": object, "expected_output": any }] }',
        'Include at least 4 test cases.',
        'Each test_cases[i].input must be a JSON object.',
        'Descriptions should be concise but implementation-ready.',
        stricter ? 'Do not include markdown, comments, or any text outside the JSON object.' : 'Include at least one edge case.'
    ].join('\n');
}
export async function loadPuter() {
    if (window.puter?.ai?.chat) {
        return window.puter;
    }
    const existing = document.getElementById(PUTER_SCRIPT_ID);
    if (existing) {
        await new Promise((resolve, reject) => {
            if (window.puter?.ai?.chat) {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Puter.js.')), { once: true });
        });
        if (window.puter?.ai?.chat) {
            return window.puter;
        }
        throw new Error('Puter.js loaded but AI chat is unavailable.');
    }
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = PUTER_SCRIPT_ID;
        script.src = PUTER_SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Puter.js.'));
        document.head.appendChild(script);
    });
    if (!window.puter?.ai?.chat) {
        throw new Error('Puter.js loaded but AI chat is unavailable.');
    }
    return window.puter;
}
export async function generateProblemWithPuter(difficulty, category) {
    const puter = await loadPuter();
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await puter.ai.chat(buildPrompt(difficulty, category, attempt === 1), {
            model: DEFAULT_MODEL
        });
        const raw = stripJsonFences(extractText(result));
        try {
            return validateGeneratedProblem(JSON.parse(raw), difficulty, category);
        }
        catch (error) {
            if (attempt === 1) {
                throw error instanceof Error ? error : new Error('Failed to parse Puter-generated problem JSON.');
            }
        }
    }
    throw new Error('Puter problem generation failed after retry.');
}
