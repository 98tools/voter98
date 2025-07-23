import { getDb } from '../src/models/db';
import { users, polls, pollParticipants } from '../src/models/schema';
import { hashPassword, generateRandomToken } from '../src/utils/auth';

// This is a seed script to create test data
async function seed(db: any) {
  // Pass the D1Database instance to this function
  
  try {
    // Create test users
    const hashedPassword = await hashPassword('password123');
    
    const adminUser = await db.insert(users).values({
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
    }).returning().get();

    const subAdminUser = await db.insert(users).values({
      email: 'subadmin@example.com',
      password: hashedPassword,
      name: 'Sub Admin User',
      role: 'sub-admin',
    }).returning().get();

    const regularUser = await db.insert(users).values({
      email: 'user@example.com',
      password: hashedPassword,
      name: 'Regular User',
      role: 'user',
    }).returning().get();

    // Create test poll
    const samplePoll = await db.insert(polls).values({
      title: 'Sample Poll for Testing',
      description: 'This is a test poll to demonstrate the voting system',
      startDate: Date.now(),
      endDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'active',
      managerId: subAdminUser.id,
      createdById: adminUser.id,
      settings: {
        showParticipantNames: false,
        showVoteWeights: false,
        showVoteCounts: false,
        showResultsBeforeEnd: false,
        allowResultsView: true,
        voteWeightEnabled: true,
      },
      ballot: [
        {
          id: 'q1',
          title: 'What is your favorite programming language?',
          description: 'Choose your preferred programming language for web development',
          randomizedOrder: false,
          minSelection: 1,
          maxSelection: 1,
          attachments: [],
          options: [
            {
              id: 'opt1',
              title: 'JavaScript',
              shortDescription: 'Dynamic, interpreted language',
              longDescription: 'JavaScript is a versatile language used for both frontend and backend development.',
              link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
            },
            {
              id: 'opt2',
              title: 'TypeScript',
              shortDescription: 'Typed superset of JavaScript',
              longDescription: 'TypeScript adds static type definitions to JavaScript.',
              link: 'https://www.typescriptlang.org/',
            },
            {
              id: 'opt3',
              title: 'Python',
              shortDescription: 'Simple, readable syntax',
              longDescription: 'Python is known for its simplicity and readability.',
              link: 'https://www.python.org/',
            },
            {
              id: 'opt4',
              title: 'Go',
              shortDescription: 'Fast, concurrent language',
              longDescription: 'Go is designed for building simple, reliable, and efficient software.',
              link: 'https://golang.org/',
            },
          ],
        },
        {
          id: 'q2',
          title: 'Which frameworks do you use?',
          description: 'Select all frameworks you have experience with',
          randomizedOrder: false,
          minSelection: 1,
          maxSelection: 3,
          attachments: [],
          options: [
            {
              id: 'opt5',
              title: 'React',
              shortDescription: 'UI library by Facebook',
            },
            {
              id: 'opt6',
              title: 'Vue.js',
              shortDescription: 'Progressive JavaScript framework',
            },
            {
              id: 'opt7',
              title: 'Angular',
              shortDescription: 'Full-featured framework by Google',
            },
            {
              id: 'opt8',
              title: 'Svelte',
              shortDescription: 'Compile-time optimized framework',
            },
          ],
        },
      ],
    }).returning().get();

    // Create test participants
    
    // User participant (registered user)
    await db.insert(pollParticipants).values({
      pollId: samplePoll.id,
      userId: regularUser.id,
      name: regularUser.name,
      email: regularUser.email,
      isUser: true,
      voteWeight: 1.0,
      status: 'approved',
    });

    // Non-user participant with token
    const tokenParticipant1 = generateRandomToken();
    await db.insert(pollParticipants).values({
      pollId: samplePoll.id,
      name: 'John Doe',
      email: 'john.doe@example.com',
      isUser: false,
      token: tokenParticipant1,
      voteWeight: 1.0,
      status: 'approved',
    });

    // Another non-user participant with higher vote weight
    const tokenParticipant2 = generateRandomToken();
    await db.insert(pollParticipants).values({
      pollId: samplePoll.id,
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      isUser: false,
      token: tokenParticipant2,
      voteWeight: 2.0,
      status: 'approved',
    });

    console.log('Seed data created successfully!');
    console.log('Test accounts:');
    console.log('Admin: admin@example.com / password123');
    console.log('Sub-admin: subadmin@example.com / password123');
    console.log('User: user@example.com / password123');
    console.log(`Poll ID: ${samplePoll.id}`);
    console.log(`Token for John Doe: ${tokenParticipant1}`);
    console.log(`Token for Jane Smith: ${tokenParticipant2}`);
    
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Note: This script needs to be run in a Cloudflare Workers context
// with access to the D1 database binding
export { seed };
