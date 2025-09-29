import Link from "next/link"
import { prisma } from "@/lib/prisma"

export default async function Home() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { title: true, slug: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  })

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Mi Blog</h1>
      <ul className="space-y-3">
        {posts.map(p => (
          <li key={p.slug} className="border rounded p-4">
            <Link href={`/post/${p.slug}`} className="text-xl font-semibold underline">
              {p.title}
            </Link>
            <p className="text-sm opacity-70">
              {new Date(p.createdAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}
