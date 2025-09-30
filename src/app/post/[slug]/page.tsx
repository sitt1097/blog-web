import Link from "next/link";
import { notFound } from "next/navigation";

import { markdownToHtml } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";

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

type PostWithTags = {
  title: string;
  slug: string;
  contentMd: string;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  authorAlias: string | null;
  tags: { tag: { name: string } }[];
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let loadError = false;

  let post: PostWithTags | null = null;

  if (databaseConfigured) {
    try {
      post = (await prisma.post.findUnique({
        where: { slug },
        include: {
          tags: {
            include: {
              tag: {
                select: { name: true },
              },
            },
          },
        },
      })) as PostWithTags | null;
    } catch (error) {
      console.error("No se pudo leer la base de datos", error);
      loadError = true;
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
            <FallbackFooter databaseConfigured={databaseConfigured} loadError={loadError} />
          </div>
        </main>
      );
    }

    if (databaseConfigured && !loadError) {
      return notFound();
    }
  }

  if (!post) {
    return notFound();
  }

  const publishedAt = post.publishedAt ?? post.createdAt;
  const contentHtml = markdownToHtml(post.contentMd);
  const tagNames = post.tags.map(({ tag }) => tag.name);

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
        <FallbackFooter databaseConfigured={databaseConfigured} loadError={loadError} />
      </div>
    </main>
  );
}

function FallbackFooter({
  databaseConfigured,
  loadError,
}: {
  databaseConfigured: boolean;
  loadError: boolean;
}) {
  return (
    <div className="mt-12 flex flex-wrap justify-between gap-3 text-sm text-white/70">
      <Link href="/" className="inline-flex items-center gap-2 text-indigo-200 hover:text-indigo-100">
        ← Volver al inicio
      </Link>
      <span>
        ¿Viste algo que debamos moderar? Escríbenos a <a className="underline" href="mailto:moderacion@example.com">moderacion@example.com</a>
      </span>
      {(!databaseConfigured || loadError) && (
        <span className="basis-full text-xs text-amber-200/80">
          Conecta la variable <code>DATABASE_URL</code> para ver publicaciones reales.
        </span>
      )}
    </div>
  );
}
