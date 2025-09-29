import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

// (opcional pero recomendado si lees DB en cada request)
export const dynamic = "force-dynamic"

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const post = await prisma.post.findUnique({
    where: { slug },
  })

  if (!post || !post.published) return notFound()

  return (
    <main className="prose max-w-2xl mx-auto py-10 px-4">
      <h1>{post.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: post.content }} />
    </main>
  )
}
