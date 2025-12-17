import { PrismaClient, Role, WorkStatus, EdgeType, ContributionRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding CANORA database...')

  // Clean existing data
  await prisma.curatedListItem.deleteMany()
  await prisma.curatedList.deleteMany()
  await prisma.promotionEvent.deleteMany()
  await prisma.contribution.deleteMany()
  await prisma.workEdge.deleteMany()
  await prisma.work.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@canora.archive',
      name: 'Archive Admin',
      role: Role.ADMIN,
    },
  })

  const curator = await prisma.user.create({
    data: {
      email: 'curator@canora.archive',
      name: 'Elena Voss',
      role: Role.CURATOR,
    },
  })

  const creator = await prisma.user.create({
    data: {
      email: 'creator@canora.archive',
      name: 'Marcus Chen',
      role: Role.CREATOR,
    },
  })

  console.log('Created users:', { admin: admin.id, curator: curator.id, creator: creator.id })

  // Create works with lineage
  // Root work (the original)
  const rootWork = await prisma.work.create({
    data: {
      slug: 'midnight-echoes-a3b2',
      title: 'Midnight Echoes',
      description: 'An ambient exploration of city sounds at 3AM. Field recordings from Tokyo transformed through granular synthesis.',
      status: WorkStatus.CANON,
      createdByUserId: creator.id,
      canonLockedAt: new Date('2024-06-15'),
      canonLockedByUserId: curator.id,
    },
  })

  // First generation forks
  const fork1 = await prisma.work.create({
    data: {
      slug: 'neon-dreams-b4c5',
      title: 'Neon Dreams',
      description: 'Cyberpunk-inspired rework of Midnight Echoes with added synthesizers and drum machines.',
      status: WorkStatus.PLATE,
      createdByUserId: creator.id,
    },
  })

  const fork2 = await prisma.work.create({
    data: {
      slug: 'silent-city-c5d6',
      title: 'Silent City',
      description: 'Stripped-back version focusing on the quietest moments. Meditation-focused.',
      status: WorkStatus.PLATE,
      createdByUserId: creator.id,
    },
  })

  // Second generation
  const fork3 = await prisma.work.create({
    data: {
      slug: 'electric-pulse-d6e7',
      title: 'Electric Pulse',
      description: 'High-energy techno interpretation.',
      status: WorkStatus.JAM,
      createdByUserId: creator.id,
    },
  })

  const fork4 = await prisma.work.create({
    data: {
      slug: 'dawn-chorus-e7f8',
      title: 'Dawn Chorus',
      description: 'Morning version with bird samples and rising tones.',
      status: WorkStatus.JAM,
      createdByUserId: creator.id,
    },
  })

  // Merge work
  const merge1 = await prisma.work.create({
    data: {
      slug: 'convergence-f8g9',
      title: 'Convergence',
      description: 'A combination of Neon Dreams and Silent City aesthetics.',
      status: WorkStatus.JAM,
      createdByUserId: creator.id,
    },
  })

  // More JAM works
  const jam1 = await prisma.work.create({
    data: {
      slug: 'broken-signals-g9h0',
      title: 'Broken Signals',
      description: 'Glitch experiments with corrupted audio streams.',
      status: WorkStatus.JAM,
      createdByUserId: creator.id,
    },
  })

  const jam2 = await prisma.work.create({
    data: {
      slug: 'rust-and-wire-h0i1',
      title: 'Rust and Wire',
      description: 'Industrial soundscapes from abandoned factories.',
      status: WorkStatus.JAM,
      createdByUserId: creator.id,
    },
  })

  const jam3 = await prisma.work.create({
    data: {
      slug: 'ghost-frequency-i1j2',
      title: 'Ghost Frequency',
      description: 'EVP-inspired ambient. AI-assisted composition.',
      status: WorkStatus.JAM,
      createdByUserId: creator.id,
    },
  })

  const jam4 = await prisma.work.create({
    data: {
      slug: 'subterranean-j2k3',
      title: 'Subterranean',
      description: 'Deep drone work recorded in underground caves.',
      status: WorkStatus.JAM,
      createdByUserId: creator.id,
    },
  })

  console.log('Created 10 works')

  // Create edges (lineage)
  await prisma.workEdge.createMany({
    data: [
      { fromWorkId: rootWork.id, toWorkId: fork1.id, type: EdgeType.FORK },
      { fromWorkId: rootWork.id, toWorkId: fork2.id, type: EdgeType.FORK },
      { fromWorkId: fork1.id, toWorkId: fork3.id, type: EdgeType.FORK },
      { fromWorkId: fork2.id, toWorkId: fork4.id, type: EdgeType.FORK },
      { fromWorkId: fork1.id, toWorkId: merge1.id, type: EdgeType.MERGE },
      { fromWorkId: fork2.id, toWorkId: merge1.id, type: EdgeType.MERGE },
      { fromWorkId: rootWork.id, toWorkId: jam1.id, type: EdgeType.DERIVED },
    ],
  })

  console.log('Created lineage edges')

  // Create contributions
  const contributions = [
    { workId: rootWork.id, displayName: 'Marcus Chen', role: ContributionRole.SOUND, userId: creator.id },
    { workId: rootWork.id, displayName: 'Field Recordings Tokyo', role: ContributionRole.SOUND },
    { workId: fork1.id, displayName: 'Marcus Chen', role: ContributionRole.SOUND, userId: creator.id },
    { workId: fork1.id, displayName: 'Synth Labs', role: ContributionRole.BEAT },
    { workId: fork2.id, displayName: 'Marcus Chen', role: ContributionRole.SOUND, userId: creator.id },
    { workId: fork3.id, displayName: 'Marcus Chen', role: ContributionRole.BEAT, userId: creator.id },
    { workId: fork4.id, displayName: 'Marcus Chen', role: ContributionRole.SOUND, userId: creator.id },
    { workId: merge1.id, displayName: 'Marcus Chen', role: ContributionRole.CURATION, userId: creator.id },
    { workId: jam1.id, displayName: 'Marcus Chen', role: ContributionRole.SOUND, userId: creator.id },
    { workId: jam2.id, displayName: 'Anonymous', role: ContributionRole.SOUND },
    { workId: jam3.id, displayName: 'AI Collaborator', role: ContributionRole.AI_ASSIST },
    { workId: jam3.id, displayName: 'Marcus Chen', role: ContributionRole.CURATION, userId: creator.id },
    { workId: jam4.id, displayName: 'Cave Recordings Collective', role: ContributionRole.SOUND },
  ]

  await prisma.contribution.createMany({ data: contributions })
  console.log('Created contributions')

  // Create promotion events for the canon work
  await prisma.promotionEvent.create({
    data: {
      workId: rootWork.id,
      fromStatus: WorkStatus.JAM,
      toStatus: WorkStatus.PLATE,
      justification: 'Exceptional field recording work combined with innovative granular synthesis. The Tokyo 3AM soundscape captures a unique moment in urban sonic history.',
      signedByUserId: curator.id,
      signedByDisplayName: 'Elena Voss',
      createdAt: new Date('2024-05-01'),
    },
  })

  await prisma.promotionEvent.create({
    data: {
      workId: rootWork.id,
      fromStatus: WorkStatus.PLATE,
      toStatus: WorkStatus.CANON,
      justification: 'After three months of community response and continued relevance, this work has proven its lasting cultural value. It represents a new approach to ambient music that honors both place and time. The lineage it has spawned demonstrates its generative importance to the archive.',
      signedByUserId: curator.id,
      signedByDisplayName: 'Elena Voss',
      createdAt: new Date('2024-06-15'),
    },
  })

  // Promotion events for PLATE works
  await prisma.promotionEvent.create({
    data: {
      workId: fork1.id,
      fromStatus: WorkStatus.JAM,
      toStatus: WorkStatus.PLATE,
      justification: 'Strong reinterpretation that maintains the essence of the original while adding new dimensions. The cyberpunk aesthetic is well-executed.',
      signedByUserId: curator.id,
      signedByDisplayName: 'Elena Voss',
      createdAt: new Date('2024-07-10'),
    },
  })

  await prisma.promotionEvent.create({
    data: {
      workId: fork2.id,
      fromStatus: WorkStatus.JAM,
      toStatus: WorkStatus.PLATE,
      justification: 'Thoughtful reduction that finds new meaning in restraint. Excellent meditation piece.',
      signedByUserId: curator.id,
      signedByDisplayName: 'Elena Voss',
      createdAt: new Date('2024-07-15'),
    },
  })

  console.log('Created promotion events')

  // Create a curated list
  const list = await prisma.curatedList.create({
    data: {
      title: 'Echoes of the City',
      description: 'A collection exploring urban soundscapes and their transformations. From field recordings to electronic interpretations.',
      curatorUserId: curator.id,
    },
  })

  await prisma.curatedListItem.createMany({
    data: [
      { listId: list.id, workId: rootWork.id, orderIndex: 0 },
      { listId: list.id, workId: fork1.id, orderIndex: 1 },
      { listId: list.id, workId: fork2.id, orderIndex: 2 },
    ],
  })

  console.log('Created curated list')

  console.log('\n✓ Seed completed successfully!')
  console.log('\nTest accounts:')
  console.log('  Admin: admin@canora.archive')
  console.log('  Curator: curator@canora.archive')
  console.log('  Creator: creator@canora.archive')
  console.log('\nCanonized work: midnight-echoes-a3b2')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
