import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({ where: { slug: params.slug } })
  if (!post || !post.published) return notFound()

  return (
    <main className="prose max-w-2xl mx-auto py-10 px-4">
      <h1>{post.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: post.content }} />
    </main>
  )
}
