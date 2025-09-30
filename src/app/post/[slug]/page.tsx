import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { Prisma } from "@prisma/client";

import { markdownToHtml } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { commentTokenCookie, postTokenCookie } from "@/lib/tokens";

import { CommentsSection, type CommentNode } from "./comments";
import { PostOwnerPanel } from "./post-editor";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "long",
  timeStyle: "short",
});

const fallbackPosts: Record<
  string,
  {
    title: string;
    authorAlias: string | null;
    publishedAt: Date;
    contentMd: string;
    tags: string[];
  }
> = {
  bienvenida: {
    title: "Bienvenida a Voces Anónimas",
    authorAlias: "Equipo",
    publishedAt: new Date(),
    contentMd: `# Hola 👋\n\nTodavía no has conectado una base de datos, pero aquí verías el contenido real de la comunidad.\n\nCuando configures \`DATABASE_URL\` en tu entorno, cada publicación aparecerá automáticamente aquí.`,
    tags: ["comunidad"],
  },
  "recursos-apoyo": {
    title: "Recursos de apoyo emocional",
    authorAlias: "Moderación",
    publishedAt: new Date(),
    contentMd: `## Recursos útiles\n\n- [Línea de la Vida](https://www.gob.mx/salud/lineadelavida)\n- [Teléfono de la Esperanza](https://www.telefonodelaesperanza.org/)\n\nHablar con alguien especializado puede marcar la diferencia.`,
    tags: ["bienestar", "cuidado"],
  },
};

type CommentWithChildren = {
  id: string;
  contentMd: string;
  createdAt: Date;
  updatedAt: Date;
  authorAlias: string | null;
  authorToken: string | null;
  parentId: string | null;
  replies: CommentWithChildren[];
};

type PostWithTags = {
  id: string;
  title: string;
  slug: string;
  contentMd: string;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  authorAlias: string | null;
  authorToken: string | null;
  tags: { tag: { name: string } }[];
  comments: CommentWithChildren[];
};

type CommentRecord = Prisma.CommentGetPayload<{
  select: {
    id: true;
    contentMd: true;
    createdAt: true;
    updatedAt: true;
    authorAlias: true;
    authorToken: true;
    parentId: true;
  };
}>;

type CommentWithChildren = CommentRecord & {
  replies: CommentWithChildren[];
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let loadErrorMessage: string | null = null;

  let post: PostWithTags | null = null;
  let commentTree: CommentWithChildren[] = [];

  if (databaseConfigured) {
    try {
      const foundPost = (await prisma.post.findUnique({
        where: { slug },
        include: {
          tags: {
            include: {
              tag: {
                select: { name: true },
              },
            },
          },
          comments: {
            where: { parentId: null },
            orderBy: { createdAt: "asc" },
            include: {
              replies: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      })) as PostWithTags | null;

      post = foundPost;

      if (foundPost) {
        const rawComments = (await prisma.comment.findMany({
          where: { postId: foundPost.id },
          orderBy: [{ createdAt: "asc" }],
        })) as CommentRecord[];

        const nodes = new Map<string, CommentWithChildren>();
        const pending = new Map<string, CommentWithChildren[]>();
        const roots: CommentWithChildren[] = [];

        for (const record of rawComments) {
          const node: CommentWithChildren = { ...record, replies: [] };
          nodes.set(record.id, node);

          const waitingChildren = pending.get(record.id);
          if (waitingChildren) {
            node.replies.push(...waitingChildren);
            pending.delete(record.id);
          }

          if (record.parentId) {
            const parent = nodes.get(record.parentId);
            if (parent) {
              parent.replies.push(node);
            } else {
              const orphans = pending.get(record.parentId) ?? [];
              orphans.push(node);
              pending.set(record.parentId, orphans);
            }
          } else {
            roots.push(node);
          }
        }

        commentTree = roots;
      }
    } catch (error) {
      console.error("No se pudo leer la base de datos", error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
        loadErrorMessage =
          'Actualiza tu base de datos ejecutando "npx prisma migrate deploy" para aplicar los cambios más recientes.';
      } else {
        loadErrorMessage = "No se pudo conectar con la base de datos en este momento.";
      }
    }
  }

  if (!post || !post.published) {
    const fallback = fallbackPosts[slug];
    if (fallback) {
      const contentHtml = markdownToHtml(fallback.contentMd);
      return (
        <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.3),_transparent_65%)] py-16 text-white">
          <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 px-6 py-10 shadow-2xl shadow-indigo-900/30 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-wide text-white/60">
              <span>{fallback.authorAlias || "Anónimo/a"}</span>
              <time dateTime={fallback.publishedAt.toISOString()}>{dateFormatter.format(fallback.publishedAt)}</time>
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white">{fallback.title}</h1>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs text-white/70">
              {fallback.tags.map(name => (
                <li key={name} className="rounded-full border border-white/20 px-3 py-1">
                  #{name}
                </li>
              ))}
            </ul>
            <article
              className="prose prose-invert mt-10 max-w-none prose-headings:text-white prose-strong:text-white"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            <FallbackFooter
              databaseConfigured={databaseConfigured}
              loadErrorMessage={loadErrorMessage}
            />
          </div>
        </main>
      );
    }

    if (databaseConfigured && !loadErrorMessage) {
      return notFound();
    }
  }

  if (!post) {
    return notFound();
  }

  const publishedAt = post.publishedAt ?? post.createdAt;
  const contentHtml = markdownToHtml(post.contentMd);
  const tagNames = post.tags.map(({ tag }) => tag.name);
  const cookieStore = await cookies();
  const canManagePost = Boolean(
    post.authorToken && cookieStore.get(postTokenCookie(slug))?.value === post.authorToken,
  );

  const mapComment = (comment: CommentWithChildren): CommentNode => ({
    id: comment.id,
    contentHtml: markdownToHtml(comment.contentMd),
    contentMd: comment.contentMd,
    authorAlias: comment.authorAlias,
    createdAtIso: comment.createdAt.toISOString(),
    createdAtLabel: dateFormatter.format(comment.createdAt),
    wasEdited: comment.updatedAt.getTime() - comment.createdAt.getTime() > 60_000,
    canEdit: Boolean(
      comment.authorToken && cookieStore.get(commentTokenCookie(comment.id))?.value === comment.authorToken,
    ),
    replies: comment.replies.map(mapComment),
  });

  const comments = commentTree.map(mapComment);


  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.3),_transparent_65%)] py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 px-6 py-10 shadow-2xl shadow-indigo-900/30 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-wide text-white/60">
          <span>{post.authorAlias || "Anónimo/a"}</span>
          <time dateTime={publishedAt.toISOString()}>{dateFormatter.format(publishedAt)}</time>
        </div>
        <h1 className="mt-6 text-4xl font-bold leading-tight text-white">{post.title}</h1>
        {tagNames.length ? (
          <ul className="mt-6 flex flex-wrap gap-2 text-xs text-white/70">
            {tagNames.map(name => (
              <li key={name} className="rounded-full border border-white/20 px-3 py-1">
                #{name}
              </li>
            ))}
          </ul>
        ) : null}
        <article
          className="prose prose-invert mt-10 max-w-none prose-headings:text-white prose-strong:text-white"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
        {canManagePost ? (
          <PostOwnerPanel
            slug={post.slug}
            title={post.title}
            content={post.contentMd}
            alias={post.authorAlias ?? ""}
            tags={tagNames.join(", ")}
          />
        ) : null}
        {databaseConfigured && !loadErrorMessage ? (
          <>
            <CommentsSection slug={post.slug} comments={comments} />
            <FallbackFooter
              databaseConfigured={databaseConfigured}
              loadErrorMessage={loadErrorMessage}
            />
          </>
        ) : (
          <FallbackFooter
            databaseConfigured={databaseConfigured}
            loadErrorMessage={loadErrorMessage}
          />

        )}
      </div>
    </main>
  );
}

function FallbackFooter({
  databaseConfigured,
  loadErrorMessage,
}: {
  databaseConfigured: boolean;
  loadErrorMessage: string | null;
}) {
  return (
    <div className="mt-12 flex flex-wrap justify-between gap-3 text-sm text-white/70">
      <Link href="/" className="inline-flex items-center gap-2 text-indigo-200 hover:text-indigo-100">
        ← Volver al inicio
      </Link>
      <span>
        ¿Viste algo que debamos moderar? Escríbenos a <a className="underline" href="mailto:moderacion@example.com">moderacion@example.com</a>
      </span>
      {(!databaseConfigured || loadErrorMessage) && (
        <span className="basis-full text-xs text-amber-200/80">
          {loadErrorMessage ?? (
            <>
              Conecta la variable <code>DATABASE_URL</code> para ver publicaciones reales.
            </>
          )}
        </span>
      )}
    </div>
  );
}
