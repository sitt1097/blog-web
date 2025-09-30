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
      excerpt: 'Presentación breve de la comunidad anónima.',
      contentMd: `# Hola Mundo\n\nBienvenid@ a la comunidad anónima. Comparte tus pensamientos sin miedo y recuerda respetar a los demás.`,
      published: true,
      publishedAt: new Date(),
      authorAlias: 'Equipo',
      tags: { create: [{ tagId: tag.id }] }
    }
  })
}
main().finally(() => prisma.$disconnect())
