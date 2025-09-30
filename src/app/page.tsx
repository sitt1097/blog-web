import Link from "next/link";

import { NewPostForm } from "@/app/_components/new-post-form";
import { prisma } from "@/lib/prisma";

type PostPreview = {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  authorAlias: string | null;
  tags: { tag: { id?: string; name: string } }[];
};

const dateFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

const fallbackPosts: PostPreview[] = [
  {
    slug: "bienvenida",
    title: "Bienvenida a Voces Anónimas",
    excerpt:
      "Un refugio para soltar lo que llevas dentro. Prueba a compartir tu primera historia usando el formulario de arriba.",
    publishedAt: new Date(),
    createdAt: new Date(),
    authorAlias: "Equipo",
    tags: [{ tag: { name: "comunidad" } }],
  },
  {
    slug: "recursos-apoyo",
    title: "Recursos de apoyo emocional",
    excerpt:
      "Si necesitas ayuda profesional, recuerda que siempre puedes contactar con líneas gratuitas de escucha o con terapeutas certificados.",
    publishedAt: new Date(),
    createdAt: new Date(),
    authorAlias: "Moderación",
    tags: [{ tag: { name: "bienestar" } }, { tag: { name: "cuidado" } }],
  },
];

export default async function Home() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let posts: PostPreview[] = [];
  let loadError = false;

  if (databaseConfigured) {
    try {
      posts = await prisma.post.findMany({
        where: { published: true },
        include: {
          tags: {
            include: {
              tag: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: [
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
      });
    } catch (error) {
      console.error("No se pudo leer la base de datos", error);
      loadError = true;
    }
  }

  if (!databaseConfigured || loadError) {
    posts = fallbackPosts;
  }

  return (
    <main className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-900 to-slate-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_60%)]" aria-hidden />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-16 px-6 py-16 lg:flex-row lg:items-start lg:py-24">
        <div className="w-full lg:max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-10 shadow-2xl shadow-indigo-900/30 backdrop-blur">
            <h1 className="text-4xl font-bold leading-tight">
              Voces Anónimas
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Un espacio seguro para compartir historias, dudas y desahogos sin revelar tu identidad. Lee a la comunidad y suma tu voz.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-wide text-white/60">
              <span className="rounded-full border border-white/30 px-3 py-1">Respeto</span>
              <span className="rounded-full border border-white/30 px-3 py-1">Empatía</span>
              <span className="rounded-full border border-white/30 px-3 py-1">Escucha Activa</span>
            </div>
          </div>
          <div className="mt-8 hidden text-sm text-white/70 lg:block">
            <p>
              Las publicaciones son revisadas por la comunidad. Evita compartir información que permita identificarte a ti o a otras personas.
            </p>
          </div>
        </div>
        <div className="w-full space-y-14">
          <NewPostForm />
          <section>
            <header className="flex flex-col gap-2 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Últimas publicaciones</h2>
                <p className="text-sm text-white/70">
                  {databaseConfigured && !loadError
                    ? "Lee lo que otras personas están compartiendo ahora mismo."
                    : "Mostramos ejemplos porque la base de datos aún no está configurada."}
                </p>
              </div>
              <span className="text-xs uppercase tracking-wide text-white/60">
                {posts.length} {posts.length === 1 ? "entrada" : "entradas"}
              </span>
            </header>
            <ul className="mt-8 space-y-6">
              {posts.length === 0 ? (
                <li className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-white/70">
                  Aún no hay publicaciones. ¡Sé la primera persona en compartir algo! 📝
                </li>
              ) : (
                posts.map(post => {
                  const publishedAt = post.publishedAt ?? post.createdAt;
                  const tagNames = post.tags.map(({ tag }) => tag.name);
                  return (
                    <li key={post.slug} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-black/20 transition hover:border-indigo-300/60 hover:bg-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-white/60">
                        <span>{post.authorAlias || "Anónimo/a"}</span>
                        <time dateTime={publishedAt.toISOString()}>
                          {dateFormatter.format(publishedAt)}
                        </time>
                      </div>
                      <Link href={`/post/${post.slug}`} className="mt-4 block text-2xl font-semibold leading-snug text-white transition group-hover:text-indigo-200">
                        {post.title}
                      </Link>
                      {post.excerpt ? (
                        <p className="mt-3 text-sm leading-relaxed text-white/80">
                          {post.excerpt}
                        </p>
                      ) : null}
                      {tagNames.length ? (
                        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
                          {tagNames.map(name => (
                            <li key={name} className="rounded-full border border-white/20 px-3 py-1">
                              #{name}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
