// Synthetic posts.json generator. Produces a small corpus of already-scrubbed
// fake posts so the app can be developed without running the real Reddit fetch.
// Run: npm run fixture
// Replace later by running: npm run fetch
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Post, PostsFile } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const OUT_PATH = resolve(ROOT, 'public', 'posts.json');

interface Seed {
  sub: string;
  title: string;
  body: string;
  comments: string[];
}

// Bodies are written as if already scrubbed. Some include intentional
// "[this community]" / "[redacted judgment]" placeholders to exercise the
// rendering pipeline.
const SEEDS: Seed[] = [
  // ── easy / discussion ──
  {
    sub: 'AskReddit',
    title: 'What is the most surprisingly emotional movie you have ever watched?',
    body: '',
    comments: [
      'Inside Out caught me completely off guard. I went in expecting a cute kids movie.',
      'Up. The first ten minutes alone destroyed me.',
      'Coco. I lost my grandfather the year before I saw it.',
    ],
  },
  {
    sub: 'AskReddit',
    title: 'People who moved to a new city alone, what surprised you the most?',
    body: '',
    comments: [
      'How long it actually took to feel at home. I expected six months. It was closer to two years.',
      'You stop hearing from old friends faster than you would think.',
    ],
  },
  {
    sub: 'AskReddit',
    title: 'What is a small habit that has dramatically improved your life?',
    body: '',
    comments: [
      'Making my bed every morning. Sounds dumb but it sets the tone for the day.',
      'Walking 30 minutes every morning before checking my phone.',
      'Drinking a full glass of water before coffee.',
    ],
  },

  // ── easy / judgment ──
  {
    sub: 'AmItheAsshole',
    title:
      '[Am I in the wrong] for refusing to attend my sister-in-law\'s third baby shower in two years?',
    body: 'My sister-in-law is having her third baby. She has thrown a full shower for each one and is now asking everyone for gifts again. I have already spent close to $400 across the previous two showers. I told my husband I would not be going and I would not be buying a gift this time. He thinks I am being petty. [Am I in the wrong]?',
    comments: [
      '[verdict]. After the first child a small "sip and see" is standard. Three full showers is excessive.',
      '[verdict]. Setting limits on repeat gift expectations is reasonable.',
      '[verdict] honestly. You can love your niece or nephew without funding shower #3.',
    ],
  },
  {
    sub: 'AmItheAsshole',
    title: '[Am I in the wrong] for telling my roommate her boyfriend cannot stay over anymore?',
    body: 'My roommate\'s boyfriend has been staying with us 5-6 nights a week for the last two months. He uses our utilities, eats our food, and does not contribute. Our lease is for two people. I told her he needs to go back to his own place at least half the week or she needs to add him to the lease and split rent three ways. She is angry and called me controlling.',
    comments: [
      '[verdict]. He is essentially a third tenant without paying.',
      '[verdict]. This is a lease and money issue, not a controlling issue.',
    ],
  },

  // ── easy / finance ──
  {
    sub: 'wallstreetbets',
    title: 'YOLO update: down 60% on calls, holding through earnings anyway',
    body: 'Bought 0DTE calls Friday. Down bad. Diamond hands until earnings.',
    comments: [
      'This is the way.',
      'Position or ban.',
      'Buy more on the dip. We are all in this together.',
    ],
  },
  {
    sub: 'personalfinance',
    title: '23 years old with $18k in savings — should I pay off the car or invest?',
    body: 'Hi all. I have an 18k emergency / general savings cushion. My car loan is $9k at 6.4%. My income is steady. Roth IRA is empty for the year. Should I split between paying down the car and starting the Roth, or hammer the car first?',
    comments: [
      'Fund the Roth first. The contribution window closes for the year and 6.4% is borderline.',
      'I would do half and half — $4k to the loan principal, $4k into the Roth, leave the rest in savings.',
      'Make sure your emergency fund actually covers 3 months of expenses before either.',
    ],
  },

  // ── easy / career ──
  {
    sub: 'cscareerquestions',
    title: 'Got laid off after 3 years at first job — how worried should I be?',
    body: 'I was on a small platform team that got reorged out of existence. Severance is fine. I have ~3YOE in a backend stack. Recruiter pings have been quiet for two weeks. Is the market really this bad or am I doing something wrong?',
    comments: [
      'It is genuinely slow right now. Three weeks of quiet does not mean you are broken.',
      'Make sure you are actually applying — recruiter pings are a tiny fraction of hiring.',
      'I got laid off in March and signed an offer in July. Keep moving.',
    ],
  },

  // ── easy / advice ──
  {
    sub: 'legaladvice',
    title: 'Landlord entered my apartment without notice while I was at work — California',
    body: 'I came home to find a maintenance work order completed in my apartment. No prior notice was given. This is the third time in six months. What are my options here?',
    comments: [
      'California requires 24 hours written notice except for emergencies. Document each instance and send a written cease and desist.',
      'Get the dates from your maintenance portal. Pattern matters more than one incident.',
    ],
  },
  {
    sub: 'relationships',
    title:
      'My partner [29M] of three years told me [27F] he does not want kids — I do. What do I do?',
    body: 'We have been together three years and engaged for six months. Last weekend he sat me down and told me he has decided he definitely does not want children. He says he tried to want them for me but he does not. I have always known I want to be a mom. I love him. I do not know what to do.',
    comments: [
      'This is one of the few real dealbreakers. Loving each other does not solve fundamentally incompatible life paths.',
      'Please do not assume he will change his mind. People who say it that clearly mean it.',
      'I am sorry. There is no clever advice here. You will need to decide which life you want more.',
    ],
  },

  // ── easy / stories ──
  {
    sub: 'tifu',
    title: '[I messed up] by accidentally CC-ing my entire team on a vent email about my manager',
    body: 'Drafted a long, completely uncensored email to my best friend about how my manager has been micromanaging me. Hit send. Realized two seconds later I had replied-all to a Teams thread, not started a new email. Twelve people. My manager included. I considered faking my own death.',
    comments: [
      'The classic. We have all done a version of this. Most of us survive.',
      'Honestly the best move is a short, direct apology email. Do not try to spin it.',
      'Update us please.',
    ],
  },
  {
    sub: 'tifu',
    title: '[I messed up] by trying to surprise my wife with a romantic dinner I cannot cook',
    body: 'I tried to make beef wellington for our anniversary. The pastry was raw. The beef was gray. The mushroom paste was somehow both burnt and watery. We ended up ordering pizza at 10pm and laughing about it. Anniversary saved by Domino\'s.',
    comments: [
      'Honestly the pizza ending sounds like the better story.',
      'Beef Wellington is a brave first attempt. Respect.',
    ],
  },
  {
    sub: 'MaliciousCompliance',
    title: 'Boss said "stop asking questions and just follow the spec exactly" — so I did',
    body: 'The spec had a typo that would have caused the import job to delete every customer record. I had been flagging it for a week. He told me to stop pushing back. I followed the spec exactly. Restored from backup an hour later. He is no longer employed here.',
    comments: [
      'Beautiful. Documenting the warnings in writing first is what saves you in these situations.',
      'The "stop asking questions" people are always the first to need someone to ask questions.',
    ],
  },

  // ── easy / work ──
  {
    sub: 'antiwork',
    title: 'Manager scheduled a "team-building" event on a Saturday and called it optional',
    body: 'It is "optional" but he has been making comments to people who said they cannot make it. The event is unpaid, three hours away, and includes a trust fall. Why is this still acceptable?',
    comments: [
      'If it is mandatory in practice, it is paid time. Document everything.',
      'I love when "optional" comes with a side of public shaming.',
    ],
  },

  // ── medium / discussion ──
  {
    sub: 'CasualConversation',
    title: 'Just had the best cup of coffee of my life and wanted to tell someone',
    body: 'Tiny shop, two employees, the barista hand-poured it for like three minutes. I am not even a coffee person. It tasted like chocolate and oranges. Anyway, hope your day is going well.',
    comments: [
      'This is the kind of post I subscribe for. Glad you had a good moment.',
      'Where is the shop? Asking for me.',
    ],
  },
  {
    sub: 'Showerthoughts',
    title: 'Your future self is the only person you will ever spend every single day with.',
    body: '',
    comments: [
      'This is going to keep me up tonight, thanks.',
      'Be nice to that person, then.',
    ],
  },
  {
    sub: 'Showerthoughts',
    title: 'A library is the only place where it is normal to be loud only with your eyes.',
    body: '',
    comments: ['This is poetic and now I cannot stop thinking about it.'],
  },
  {
    sub: 'changemyview',
    title: 'CMV: Tipping culture in restaurants has gone too far and should be replaced',
    body: 'I think service should be priced into the meal and paid as a wage. The current US tipping system shifts wage cost onto customers in an unpredictable way and creates uncomfortable interactions over a ~20% delta. Change my view.',
    comments: [
      'You are mostly right but the political path to switching is harder than people admit. Servers in some markets out-earn what an even-pricing model would pay them.',
      'This view is more controversial than you think — many high-tip servers actively oppose the change.',
    ],
  },
  {
    sub: 'unpopularopinion',
    title: 'Most "all-you-can-eat" buffets are actually a worse deal than ordering normally',
    body: 'You eat past the point of enjoyment to "win" and the food quality is always lower. You leave full but not happy.',
    comments: [
      'Counterpoint: I am not paying for food, I am paying for a sport.',
      'Crab leg buffets break this rule.',
    ],
  },
  {
    sub: 'NoStupidQuestions',
    title: 'Why does my body feel sore the day AFTER a workout instead of the same day?',
    body: '',
    comments: [
      'Delayed onset muscle soreness — the actual damage to muscle fibers swells and triggers nerves over the next 24-48 hours.',
      'Not a stupid question at all. Most people do not realize the soreness is the repair process, not the workout itself.',
    ],
  },
  {
    sub: 'TwoXChromosomes',
    title: 'Finally found a doctor who took my pain seriously after seven years',
    body: 'Seven years of being told it was anxiety, my weight, "just periods", or stress. New doctor ordered one ultrasound. Two weeks later I have a real diagnosis and a real treatment plan. To anyone still being dismissed: keep switching providers.',
    comments: [
      'I am so glad you finally got listened to. It should never take that long.',
      'Save the records from every previous appointment. They become evidence the next time someone tries to gaslight you.',
    ],
  },

  // ── medium / stories ──
  {
    sub: 'pettyrevenge',
    title: 'Coworker took credit for my project, so I "forgot" to add him to the next handoff doc',
    body: 'Two months later leadership asked him to present the followup. He had no context because he had never actually done any of the work. I sat there silent and let him cook.',
    comments: ['Chef\'s kiss. Sometimes the petty thing is also the correct thing.'],
  },
  {
    sub: 'ProRevenge',
    title:
      'My ex tried to ruin my professional reputation, so I spent six months building the case that ended his career',
    body: 'Long post incoming. After we split he sent fabricated screenshots to my employer. I did not panic. I started collecting. Six months of receipts, witness statements, and one very patient HR contact later, he was the one being walked out of an office.',
    comments: [
      'The patience here is what makes this professional grade. Most people would have escalated in a week.',
      'Saving this for inspiration the next time someone underestimates how much I document.',
    ],
  },
  {
    sub: 'confession',
    title: 'I have been pretending to like my best friend\'s cooking for fifteen years',
    body: 'It is bad. It has always been bad. I have eaten more bland casserole than any one human should. I cannot tell her now. We are too far in.',
    comments: ['You are a true friend and a better liar than most politicians.'],
  },
  {
    sub: 'offmychest',
    title: 'I think I am going to be okay and I have not been able to say that in two years',
    body: 'No big update. Therapy is helping. Job is fine. I sleep most nights now. I do not want to jinx it. I just wanted to say it somewhere.',
    comments: [
      'Saying it counts. Keep going.',
      'Quiet recovery is the most real recovery there is.',
    ],
  },
  {
    sub: 'JUSTNOMIL',
    title: 'My mother-in-law showed up to our newborn\'s pediatrician appointment uninvited',
    body: 'We did not tell her where or when. Somehow she found out from a cousin. She walked in halfway through the appointment "to support us". The pediatrician asked if she was a parent. The look on her face when my husband said no was the most satisfying thing I have ever witnessed.',
    comments: [
      'Time to find out which cousin and lock down the info pipeline.',
      'The pediatrician asking is a green flag for that doctor honestly.',
    ],
  },

  // ── hard / judgment ──
  {
    sub: 'AmIOverreacting',
    title: 'My partner went out drinking the night before a flight we had been planning for a year',
    body: 'We had a 6am flight. He stayed out until 2am with friends and showed up to the airport hung over and barely speaking. The whole first day of the trip was ruined because he slept through it. Am I overreacting for being this upset?',
    comments: [
      'Not overreacting. That is a respect issue, not a drinking issue.',
      'The first day of a planned trip is not "any other Saturday". He should have known the difference.',
    ],
  },

  // ── hard / advice ──
  {
    sub: 'relationship_advice',
    title:
      'My [28F] boyfriend [30M] of two years has not introduced me to his parents and now I am suspicious',
    body: 'He says they "are not close". Fine. But he visits them four or five times a year and never invites me. He gets defensive when I bring it up. Should I be worried?',
    comments: [
      'Worth one direct conversation. If he stonewalls, that is your answer.',
      'Two years is a long time for there to be no overlap at all.',
    ],
  },
  {
    sub: 'Advice',
    title: 'I am 32 and I have never had a real career. How do I start now?',
    body: 'A patchwork of service jobs and gig work. No degree. I do not know what I want to "do". I just know I cannot do another decade of this. Where do people even start?',
    comments: [
      'Start with one specific industry that pays your bills and has clear ladders. Pick boring on purpose.',
      'Community college plus a part time job in the field is the lowest-risk version of this transition.',
    ],
  },
  {
    sub: 'DecidingToBeBetter',
    title: '90 days no scrolling first thing in the morning — here is what changed',
    body: 'Sleep got better, weirdly. Mornings feel longer. I read more. I am not magically a different person but my brain feels less skipped. Recommended.',
    comments: ['I am on day 4. Day 4 is hard. Glad to hear day 90 pays off.'],
  },

  // ── hard / stories ──
  {
    sub: 'TrueOffMyChest',
    title: 'I quit a six-figure job last week and I have not told my parents yet',
    body: 'I knew I had to leave for a year. I have savings. I have a plan. My parents will not understand and I am not ready for that conversation. So I am writing it here.',
    comments: ['Tell them when you are ready, not when you are scared. Not the same thing.'],
  },
  {
    sub: 'self',
    title: 'Lost my dog last month and I keep almost saying his name when I get home',
    body: 'No advice needed. Just one of those things you do not realize is a habit until it is gone.',
    comments: [
      'I still say goodnight out loud to mine seven months later. It is okay.',
      'Sending you a quiet hug from another person who knows that feeling.',
    ],
  },
  {
    sub: 'BestofRedditorUpdates',
    title:
      'OOP\'s neighbor kept moving the property fence over six months — final update has the surveyor result',
    body: 'Original post: neighbor was slowly relocating a shared fence by 2-3 inches every few weeks. OOP eventually paid for a property survey. Final update: the fence was nine inches into OOP\'s yard and the neighbor has been ordered to pay relocation costs. Receipts in the thread.',
    comments: ['The "slow encroachment" tactic is more common than people realize. Surveys end them.'],
  },
  {
    sub: 'entitledparents',
    title: 'Mom of three demanded I give up my reserved table at a tiny coffee shop because "kids need to sit"',
    body: 'I was working on a deadline. Reserved the table a week in advance. She came in, walked over, and started moving my laptop. The barista handled it but it was wild.',
    comments: ['The barista is the real hero of this story.'],
  },
  {
    sub: 'raisedbynarcissists',
    title: 'I went no-contact six months ago and I had to relearn what guilt actually feels like',
    body: 'When everything in your life is "your fault" by default, real, deserved guilt feels different than the manufactured kind. It is taking me longer than I expected to tell them apart.',
    comments: [
      'This is one of the most accurate descriptions of post-NC adjustment I have read. It does get easier.',
      'Therapy specifically with someone who knows narcissistic family systems was the unlock for me.',
    ],
  },
  {
    sub: 'TalesFromRetail',
    title: 'Customer demanded I price-match a competitor\'s clearance item at full retail',
    body: 'She wanted us to match a $14 sweater listed at $4 at a different chain\'s clearance section. Our price-match policy explicitly excludes clearance. She asked for my manager. My manager said the same thing. She asked for HER manager.',
    comments: [
      'There is always an upper manager. There is always a complaint. The policy never bends.',
      'Customers who want to talk to "your manager\'s manager" are revealing they have never had a real corporate job.',
    ],
  },
];

function makePost(seed: Seed, index: number): Post {
  const id = `t3_fx${index.toString(36).padStart(4, '0')}`;
  // Deterministic-ish synthetic metadata
  const score = 200 + ((index * 137) % 12000);
  const numComments = 20 + ((index * 53) % 600);
  const createdUtc = 1700000000 + index * 86400;
  const comments = seed.comments.map((body, i) => ({
    id: `t1_fx${index.toString(36).padStart(4, '0')}${i}`,
    body,
    score: 80 - i * 12 + (index % 25),
  }));
  return {
    id,
    subreddit: seed.sub,
    title: seed.title,
    body: seed.body,
    score,
    numComments,
    permalink: `https://reddit.com/r/${seed.sub}/comments/${id.slice(3)}/synthetic_fixture`,
    createdUtc,
    flair: null,
    comments,
  };
}

async function main(): Promise<void> {
  const posts = SEEDS.map(makePost);
  const file: PostsFile = {
    generatedAt: new Date().toISOString(),
    count: posts.length,
    posts,
  };
  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(file, null, 2), 'utf8');
  console.log(`Wrote ${OUT_PATH} with ${posts.length} synthetic posts`);
  const bySub = new Map<string, number>();
  for (const p of posts) bySub.set(p.subreddit, (bySub.get(p.subreddit) ?? 0) + 1);
  console.log(`across ${bySub.size} subs`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
