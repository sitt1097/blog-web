import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const tag = await prisma.tag.upsert({
    where: { name: 'general' },
    update: {},
    create: { name: 'general' },
  })
  await prisma.post.upsert({
    where: { slug: 'hola-mundo' },
    update: {},
    create: {
      title: 'Hola Mundo',
      slug: 'hola-mundo',
      content: 'Este es mi primer post con Next.js + Prisma + Postgres.',
      published: true,
      tags: { create: [{ tagId: tag.id }] }
    }
  })
}
main().finally(() => prisma.$disconnect())
