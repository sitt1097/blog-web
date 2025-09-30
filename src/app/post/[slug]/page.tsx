import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { Prisma } from "@prisma/client";

import { markdownToHtml } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";

import {
  adminTokenCookie,
  commentReactionCookie,
  commentTokenCookie,
  postReactionCookie,
  postTokenCookie,
} from "@/lib/tokens";
import { reactionsFromCookie, totalReactions } from "@/lib/reactions";
import { isAdminTokenValid, isModerationEnabled } from "@/lib/admin";

import { CommentsSection, type CommentNode } from "./comments";
import { PostOwnerPanel } from "./post-editor";
import { ReactionBar } from "./reaction-bar";


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

  reactionThumbsUp: number;
  reactionHeart: number;
  reactionHope: number;
  reactionClap: number;

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

    reactionThumbsUp: true;
    reactionHeart: true;
    reactionHope: true;
    reactionClap: true;

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
  const moderationEnabled = isModerationEnabled();
  const viewerIsAdmin = moderationEnabled
    ? isAdminTokenValid(cookieStore.get(adminTokenCookie())?.value)
    : false;
  const viewerOwnsPost = Boolean(
    post.authorToken && cookieStore.get(postTokenCookie(slug))?.value === post.authorToken,
  );
  const canModeratePost = viewerOwnsPost || viewerIsAdmin;


  const mapComment = (
    comment: CommentWithChildren,
    depth: number,
    parentOwned: boolean,
  ): CommentNode => {
    const canEdit = Boolean(
      comment.authorToken && cookieStore.get(commentTokenCookie(comment.id))?.value === comment.authorToken,
    );
    const canModerate = canEdit || viewerIsAdmin;

    const viewerReactions = reactionsFromCookie(
      cookieStore.get(commentReactionCookie(comment.id))?.value,
    );

    const counts = {
      reactionThumbsUp: comment.reactionThumbsUp,
      reactionHeart: comment.reactionHeart,
      reactionHope: comment.reactionHope,
      reactionClap: comment.reactionClap,
    };

    return {
      id: comment.id,
      contentHtml: markdownToHtml(comment.contentMd),
      contentMd: comment.contentMd,
      authorAlias: comment.authorAlias,
      createdAtIso: comment.createdAt.toISOString(),
      createdAtLabel: dateFormatter.format(comment.createdAt),
      wasEdited: comment.updatedAt.getTime() - comment.createdAt.getTime() > 60_000,
      canEdit,
      canModerate,
      ownedByViewer: canEdit,
      replyingToOwner: parentOwned,
      parentId: comment.parentId ?? null,
      depth,
      reactions: {
        counts,
        viewer: viewerReactions,
      },
      totalReactionScore: totalReactions(counts),
      replies: comment.replies.map((child: CommentWithChildren) => mapComment(child, depth + 1, canEdit)),
    };
  };

  const comments = commentTree.map(comment => mapComment(comment, 0, false));

  const postReactionCounts = {
    reactionThumbsUp: post.reactionThumbsUp,
    reactionHeart: post.reactionHeart,
    reactionHope: post.reactionHope,
    reactionClap: post.reactionClap,
  };

  const viewerPostReactions = reactionsFromCookie(cookieStore.get(postReactionCookie(post.slug))?.value);


  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_70%)] py-16 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6">
        <div className="overflow-hidden rounded-4xl border border-indigo-300/40 bg-gradient-to-br from-indigo-900/80 via-slate-950 to-indigo-950 p-[1px] shadow-[0_20px_60px_-30px_rgba(79,70,229,0.8)]">
          <div className="rounded-[calc(theme(borderRadius.4xl)-1px)] bg-slate-950/80 p-10">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-widest text-indigo-100/70">
              <span>{post.authorAlias || "Anónimo/a"}</span>
              <time dateTime={publishedAt.toISOString()}>{dateFormatter.format(publishedAt)}</time>
            </div>
            <h1 className="mt-6 font-heading text-4xl leading-tight text-white md:text-5xl">{post.title}</h1>
            {tagNames.length ? (
              <ul className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-indigo-100/80">
                {tagNames.map(name => (
                  <li
                    key={name}
                    className="rounded-full border border-indigo-300/40 bg-indigo-500/10 px-4 py-1 tracking-widest"
                  >
                    #{name}
                  </li>
                ))}
              </ul>
            ) : null}
            <article
              className="prose prose-invert mt-10 max-w-none text-lg leading-relaxed prose-headings:font-heading prose-headings:text-white prose-strong:text-white"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            <div className="mt-10 flex flex-col gap-6">
              <ReactionBar
                slug={post.slug}
                initialCounts={postReactionCounts}
                initialViewerReactions={viewerPostReactions}
              />
              {canModeratePost ? (
                <PostOwnerPanel
                  slug={post.slug}
                  title={post.title}
                  content={post.contentMd}
                  alias={post.authorAlias ?? ""}
                  tags={tagNames.join(", ")}
                  canEdit={viewerOwnsPost}
                  canModerate={canModeratePost}
                />
              ) : null}
            </div>
          </div>
        </div>

        {databaseConfigured && !loadErrorMessage ? (
          <CommentsSection
            slug={post.slug}
            comments={comments}
            canManagePost={viewerOwnsPost}
            isAdmin={viewerIsAdmin}
            moderationEnabled={moderationEnabled}
          />
        ) : null}

        <FallbackFooter
          databaseConfigured={databaseConfigured}
          loadErrorMessage={loadErrorMessage}
        />


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
