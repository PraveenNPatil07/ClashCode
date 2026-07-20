type CollegeSeed = {
  id: string;
  name: string;
  banner_url: string;
  total_points: number;
  base_level: number;
};

type UserSeed = {
  id: string;
  name: string;
  email: string;
  college_id: string;
  rank_tier: string;
  points: number;
  role: string;
};

type ProblemSeed = {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'arrays' | 'dp' | 'graphs' | 'strings' | 'sql';
  test_cases: Array<{
    input: Record<string, unknown>;
    expected_output: unknown;
  }>;
  source: 'bank';
};

type SeasonSeed = {
  id: string;
  start_date: string;
  end_date: string;
  winner_college_id: string | null;
  mvp_user_id: string | null;
  status: 'active' | 'completed';
};

export const colleges: CollegeSeed[] = [
  {
    id: '2fd1ef8a-f7b6-43cb-8f8d-22d1734d8581',
    name: 'Apex Institute of Technology',
    banner_url: 'https://placehold.co/600x240/0f766e/ffffff?text=Apex+Institute',
    total_points: 1840,
    base_level: 4
  },
  {
    id: '89ef4669-aa1c-48ca-b0ce-8d270c8791bc',
    name: 'Northbridge Engineering College',
    banner_url: 'https://placehold.co/600x240/1d4ed8/ffffff?text=Northbridge',
    total_points: 1715,
    base_level: 3
  },
  {
    id: '06cf42fe-ac3e-49b0-8533-0a5d96f7f660',
    name: 'Summit School of Computing',
    banner_url: 'https://placehold.co/600x240/9333ea/ffffff?text=Summit+Computing',
    total_points: 2185,
    base_level: 5
  },
  {
    id: 'c0d5c4b5-7bd9-4c78-8c3e-5c93912e6ba2',
    name: 'Rivergate University',
    banner_url: 'https://placehold.co/600x240/ea580c/ffffff?text=Rivergate',
    total_points: 1605,
    base_level: 3
  }
];

export const users: UserSeed[] = [
  { id: 'c6c803fd-aac6-43d2-b80f-91cb64c80371', name: 'Aarav Mehta', email: 'aarav.mehta@apex.edu', college_id: colleges[0].id, rank_tier: 'gold', points: 410, role: 'leader' },
  { id: '2f2591d3-0bd2-4fc7-993d-9d2fcf1cd7c1', name: 'Nisha Rao', email: 'nisha.rao@apex.edu', college_id: colleges[0].id, rank_tier: 'silver', points: 325, role: 'officer' },
  { id: '4803d20f-6a29-4aaf-9585-271b6e7c87c7', name: 'Ishan Verma', email: 'ishan.verma@apex.edu', college_id: colleges[0].id, rank_tier: 'bronze', points: 210, role: 'member' },
  { id: 'f71c0c67-9da8-4ebe-8d3f-eb84795d8661', name: 'Priya Kulkarni', email: 'priya.kulkarni@apex.edu', college_id: colleges[0].id, rank_tier: 'platinum', points: 515, role: 'member' },
  { id: '0e0b9df9-0c1e-4922-b3b4-527969b5cb41', name: 'Rohit Jain', email: 'rohit.jain@apex.edu', college_id: colleges[0].id, rank_tier: 'silver', points: 380, role: 'member' },
  { id: 'fdd0cd0e-c3e0-414a-a013-f1cc76e08379', name: 'Maya Patel', email: 'maya.patel@northbridge.edu', college_id: colleges[1].id, rank_tier: 'gold', points: 405, role: 'leader' },
  { id: '9b5e0d39-2fe6-405f-bec4-afd2487450ad', name: 'Kabir Sen', email: 'kabir.sen@northbridge.edu', college_id: colleges[1].id, rank_tier: 'silver', points: 290, role: 'officer' },
  { id: 'e98efa48-d50b-4f6b-8118-ca787feaf85a', name: 'Anika Das', email: 'anika.das@northbridge.edu', college_id: colleges[1].id, rank_tier: 'bronze', points: 180, role: 'member' },
  { id: '8b573f0e-f3ac-4af1-8b10-ff3b6fb2f505', name: 'Dev Arora', email: 'dev.arora@northbridge.edu', college_id: colleges[1].id, rank_tier: 'diamond', points: 560, role: 'member' },
  { id: '42d8df63-d2db-4e1f-a486-2ad2ef4f2b56', name: 'Sneha Iyer', email: 'sneha.iyer@northbridge.edu', college_id: colleges[1].id, rank_tier: 'silver', points: 280, role: 'member' },
  { id: '11e072ff-7739-441b-b8cc-8a7f51c403da', name: 'Arjun Nair', email: 'arjun.nair@summit.edu', college_id: colleges[2].id, rank_tier: 'platinum', points: 540, role: 'leader' },
  { id: '05006178-bac9-4b88-b093-8e31f63297d3', name: 'Tara Bose', email: 'tara.bose@summit.edu', college_id: colleges[2].id, rank_tier: 'gold', points: 460, role: 'officer' },
  { id: 'f4ad898f-d445-48ad-aa31-674494ceb6b9', name: 'Kunal Shah', email: 'kunal.shah@summit.edu', college_id: colleges[2].id, rank_tier: 'silver', points: 350, role: 'member' },
  { id: 'a171fb66-e94a-438e-8da3-e6d70176e8f7', name: 'Meera Thomas', email: 'meera.thomas@summit.edu', college_id: colleges[2].id, rank_tier: 'diamond', points: 610, role: 'member' },
  { id: 'dd19c10f-b93c-4db2-bfe9-b3349f55911c', name: 'Harsh Gupta', email: 'harsh.gupta@summit.edu', college_id: colleges[2].id, rank_tier: 'bronze', points: 225, role: 'member' },
  { id: 'be680211-bb61-488b-b935-2c43f6375495', name: 'Zoya Khan', email: 'zoya.khan@rivergate.edu', college_id: colleges[3].id, rank_tier: 'gold', points: 390, role: 'leader' },
  { id: '4034b748-46dc-44f5-9af0-cbd2a77180e0', name: 'Neil Dsouza', email: 'neil.dsouza@rivergate.edu', college_id: colleges[3].id, rank_tier: 'silver', points: 300, role: 'officer' },
  { id: '30d67b83-1d31-473c-b257-f4078cfc8ad9', name: 'Pooja Menon', email: 'pooja.menon@rivergate.edu', college_id: colleges[3].id, rank_tier: 'bronze', points: 170, role: 'member' },
  { id: 'f2c8b766-ecbb-4de4-96b2-af698c4503a4', name: 'Vikram Singh', email: 'vikram.singh@rivergate.edu', college_id: colleges[3].id, rank_tier: 'platinum', points: 485, role: 'member' },
  { id: 'd6dbfb53-1d5b-44ed-8f0e-c986df6d2d32', name: 'Rhea Kapoor', email: 'rhea.kapoor@rivergate.edu', college_id: colleges[3].id, rank_tier: 'silver', points: 260, role: 'member' }
];

export const problems: ProblemSeed[] = [
  {
    id: '907cf2c6-5a76-4a89-b306-3a4bf5106a1b',
    title: 'Two Sum Patrol',
    description: 'Return the indices of the two numbers that add up to the target.',
    difficulty: 'easy',
    category: 'arrays',
    test_cases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected_output: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expected_output: [1, 2] }
    ],
    source: 'bank'
  },
  {
    id: '1a9d1834-0174-49de-a39d-f08a4bc787fe',
    title: 'Best Time to Rally',
    description: 'Given stock prices by day, return the maximum profit from one buy and one sell.',
    difficulty: 'easy',
    category: 'arrays',
    test_cases: [
      { input: { prices: [7, 1, 5, 3, 6, 4] }, expected_output: 5 },
      { input: { prices: [7, 6, 4, 3, 1] }, expected_output: 0 }
    ],
    source: 'bank'
  },
  {
    id: '8094df7f-4468-451e-a5ca-f20f6119bbd5',
    title: 'Longest Common Prefix Banner',
    description: 'Return the longest common prefix string amongst an array of strings.',
    difficulty: 'easy',
    category: 'strings',
    test_cases: [
      { input: { strs: ['flower', 'flow', 'flight'] }, expected_output: 'fl' },
      { input: { strs: ['dog', 'racecar', 'car'] }, expected_output: '' }
    ],
    source: 'bank'
  },
  {
    id: '6dc50b1d-7a5f-45c5-9f94-6c2b613b9df8',
    title: 'Valid Anagram Dispatch',
    description: 'Return true if the second string is an anagram of the first string.',
    difficulty: 'easy',
    category: 'strings',
    test_cases: [
      { input: { s: 'anagram', t: 'nagaram' }, expected_output: true },
      { input: { s: 'rat', t: 'car' }, expected_output: false }
    ],
    source: 'bank'
  },
  {
    id: '833171f9-e64d-484c-8c52-9f75295c1c87',
    title: 'Climb the Tower',
    description: 'Count the number of distinct ways to climb to the top taking 1 or 2 steps.',
    difficulty: 'easy',
    category: 'dp',
    test_cases: [
      { input: { n: 2 }, expected_output: 2 },
      { input: { n: 5 }, expected_output: 8 }
    ],
    source: 'bank'
  },
  {
    id: '9e317c4d-fe7f-4264-b79c-cf3ccf65dd3a',
    title: 'House Robber Raid',
    description: 'Return the maximum amount you can rob without taking adjacent houses.',
    difficulty: 'medium',
    category: 'dp',
    test_cases: [
      { input: { nums: [1, 2, 3, 1] }, expected_output: 4 },
      { input: { nums: [2, 7, 9, 3, 1] }, expected_output: 12 }
    ],
    source: 'bank'
  },
  {
    id: 'f722d6c2-27c1-4280-8aa6-b26840291bcf',
    title: 'Coin Change Arsenal',
    description: 'Return the minimum number of coins needed to make the target amount, or -1 if impossible.',
    difficulty: 'medium',
    category: 'dp',
    test_cases: [
      { input: { coins: [1, 2, 5], amount: 11 }, expected_output: 3 },
      { input: { coins: [2], amount: 3 }, expected_output: -1 }
    ],
    source: 'bank'
  },
  {
    id: 'e5ce0e03-aab9-49f4-b219-933056f87f77',
    title: 'Course Schedule Siege',
    description: 'Return true if you can finish all courses given prerequisite pairs.',
    difficulty: 'medium',
    category: 'graphs',
    test_cases: [
      { input: { numCourses: 2, prerequisites: [[1, 0]] }, expected_output: true },
      { input: { numCourses: 2, prerequisites: [[1, 0], [0, 1]] }, expected_output: false }
    ],
    source: 'bank'
  },
  {
    id: 'f81a2b59-d554-4a30-a414-8f8cf98cc95e',
    title: 'Number of Islands Outpost',
    description: 'Count the number of islands in a binary grid.',
    difficulty: 'medium',
    category: 'graphs',
    test_cases: [
      { input: { grid: [['1', '1', '0'], ['1', '0', '0'], ['0', '0', '1']] }, expected_output: 2 },
      { input: { grid: [['1', '1', '1'], ['0', '1', '0'], ['1', '1', '1']] }, expected_output: 1 }
    ],
    source: 'bank'
  },
  {
    id: 'f061518d-c1a4-46ef-84ff-03ca2517de39',
    title: 'Network Delay Alarm',
    description: 'Return how long it takes for all nodes to receive a signal, or -1 if not all nodes are reachable.',
    difficulty: 'hard',
    category: 'graphs',
    test_cases: [
      { input: { times: [[2, 1, 1], [2, 3, 1], [3, 4, 1]], n: 4, k: 2 }, expected_output: 2 },
      { input: { times: [[1, 2, 1]], n: 2, k: 2 }, expected_output: -1 }
    ],
    source: 'bank'
  },
  {
    id: 'f6f9fe92-367d-4fb7-9db5-3d15d3d74b98',
    title: 'Longest Palindromic Signal',
    description: 'Return the longest palindromic substring in the given string.',
    difficulty: 'medium',
    category: 'strings',
    test_cases: [
      { input: { s: 'babad' }, expected_output: 'bab' },
      { input: { s: 'cbbd' }, expected_output: 'bb' }
    ],
    source: 'bank'
  },
  {
    id: '7864dcf2-a5ec-47fd-8020-80fb70b1b383',
    title: 'Minimum Window Intel',
    description: 'Return the minimum window substring that contains every character of the target string.',
    difficulty: 'hard',
    category: 'strings',
    test_cases: [
      { input: { s: 'ADOBECODEBANC', t: 'ABC' }, expected_output: 'BANC' },
      { input: { s: 'a', t: 'a' }, expected_output: 'a' }
    ],
    source: 'bank'
  },
  {
    id: '7f2182c5-c28c-4a0c-bcc9-cc2f95d74f2f',
    title: 'Department Salary Ladder',
    description: 'Write a query that returns each department name with its highest salary.',
    difficulty: 'easy',
    category: 'sql',
    test_cases: [
      {
        input: {
          departments: [
            { id: 1, name: 'Engineering' },
            { id: 2, name: 'Design' }
          ],
          employees: [
            { name: 'Ava', salary: 120000, department_id: 1 },
            { name: 'Liam', salary: 135000, department_id: 1 },
            { name: 'Mia', salary: 90000, department_id: 2 }
          ]
        },
        expected_output: [
          { department: 'Engineering', highest_salary: 135000 },
          { department: 'Design', highest_salary: 90000 }
        ]
      }
    ],
    source: 'bank'
  },
  {
    id: 'ce24d6ba-8f72-4798-92c7-5028587e99f7',
    title: 'Consecutive Login Streak',
    description: 'Write a query that returns users with at least three consecutive daily logins.',
    difficulty: 'medium',
    category: 'sql',
    test_cases: [
      {
        input: {
          logins: [
            { user_id: 1, login_date: '2026-07-01' },
            { user_id: 1, login_date: '2026-07-02' },
            { user_id: 1, login_date: '2026-07-03' },
            { user_id: 2, login_date: '2026-07-01' },
            { user_id: 2, login_date: '2026-07-03' }
          ]
        },
        expected_output: [1]
      }
    ],
    source: 'bank'
  },
  {
    id: 'b84fa54b-f4f7-4d17-aaed-bca4d297927d',
    title: 'Median of Strongholds',
    description: 'Find the median of two sorted arrays.',
    difficulty: 'hard',
    category: 'arrays',
    test_cases: [
      { input: { nums1: [1, 3], nums2: [2] }, expected_output: 2 },
      { input: { nums1: [1, 2], nums2: [3, 4] }, expected_output: 2.5 }
    ],
    source: 'bank'
  }
];

export const seasons: SeasonSeed[] = [
  {
    id: '7ee11d2f-a6a7-40da-9ab4-7cbe11a2b653',
    start_date: '2026-07-01T00:00:00.000Z',
    end_date: '2026-08-31T23:59:59.000Z',
    winner_college_id: null,
    mvp_user_id: null,
    status: 'active'
  }
];
