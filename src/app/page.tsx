import Link from "next/link";

import { Prisma } from "@prisma/client";

import { NewPostForm } from "@/app/_components/new-post-form";
import { prisma } from "@/lib/prisma";
import { totalReactions, type ReactionCountRecord } from "@/lib/reactions";

const dateFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

const PAGE_SIZE = 6;

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
    reactionThumbsUp: 14,
    reactionHeart: 21,
    reactionHope: 8,
    reactionClap: 12,
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
    reactionThumbsUp: 9,
    reactionHeart: 16,
    reactionHope: 5,
    reactionClap: 7,
  },
  {
    slug: "primeros-pasos",
    title: "Primeros pasos para gestionar la ansiedad",
    excerpt:
      "Una guía corta con ejercicios de respiración y notas personales que puedes probar antes de dormir.",
    publishedAt: new Date(),
    createdAt: new Date(),
    authorAlias: "Comunidad",
    tags: [{ tag: { name: "salud" } }, { tag: { name: "consejo" } }],
    reactionThumbsUp: 11,
    reactionHeart: 18,
    reactionHope: 6,
    reactionClap: 9,
  },
];

type TagRecord = { tag: { id?: string; name: string } };

type PostPreview = {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  authorAlias: string | null;
  tags: TagRecord[];
} & ReactionCountRecord;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type SortMode = "latest" | "top";

type PageData = {
  posts: PostPreview[];
  total: number;
  featured: PostPreview[];
  tags: string[];
  loadErrorMessage: string | null;
  databaseConfigured: boolean;
};

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = extractParam(params, "q");
  const tag = extractParam(params, "tag");
  const page = Math.max(1, Number.parseInt(extractParam(params, "page") || "1", 10));
  const sort = (extractParam(params, "sort") as SortMode | null) ?? "latest";

  const data = await loadPageData({ query, tag, page, sort });

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const baseParams = buildBaseParams({ query, tag, sort });

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.4),_transparent_60%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 lg:flex-row lg:items-start lg:py-24">
        <aside className="w-full max-w-xl space-y-8 lg:sticky lg:top-16 lg:self-start">
          <div className="rounded-4xl border border-indigo-300/40 bg-gradient-to-br from-indigo-900/70 via-indigo-950 to-slate-950 p-[1px] shadow-[0_25px_80px_-40px_rgba(99,102,241,0.8)]">
            <div className="rounded-[calc(theme(borderRadius.4xl)-1px)] bg-slate-950/80 p-10">
              <h1 className="font-heading text-4xl leading-tight text-white">Voces Anónimas</h1>
              <p className="mt-4 text-base text-white/80">
                Un espacio seguro para compartir historias, dudas y desahogos sin revelar tu identidad. Lee a la comunidad y suma tu voz.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-widest text-white/60">
                <span className="rounded-full border border-white/30 px-3 py-1">Respeto</span>
                <span className="rounded-full border border-white/30 px-3 py-1">Empatía</span>
                <span className="rounded-full border border-white/30 px-3 py-1">Escucha Activa</span>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-indigo-300/30 bg-indigo-950/40 p-8 shadow-inner shadow-indigo-900/40">
            <h2 className="font-heading text-2xl text-white">Buscar historias</h2>
            <p className="mt-2 text-sm text-white/70">
              Usa palabras clave o filtra por etiquetas para encontrar situaciones parecidas a la tuya.
            </p>
            <form className="mt-6 space-y-4" action="/">
              <input type="hidden" name="tag" value={tag} />
              <input type="hidden" name="sort" value={sort} />
              <label htmlFor="search" className="block text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200/80">
                Palabra clave
              </label>
              <input
                id="search"
                name="q"
                defaultValue={query}
                placeholder="ansiedad, amistad, familia..."
                className="w-full rounded-2xl border border-white/30 bg-white/90 px-5 py-3 text-base text-slate-900 shadow-inner shadow-indigo-900/20 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400"
              >
                Buscar
              </button>
            </form>
            {data.tags.length ? (
              <div className="mt-6">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200/80">Etiquetas populares</span>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {data.tags.map(name => {
                    const active = name === tag;
                    return (
                      <li key={name}>
                        <Link
                          href={buildQuery(baseParams, {
                            tag: active ? undefined : name,
                            page: "1",
                          })}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-medium uppercase tracking-widest transition ${
                            active ? "border-white/80 bg-white/20 text-white" : tagStyle(name)
                          }`}
                        >
                          #{name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="w-full space-y-14">
          <NewPostForm />
          <header className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/5 p-6 shadow-lg shadow-black/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-3xl text-white">Historias de la comunidad</h2>
                <p className="mt-1 text-sm text-white/70">
                  {data.databaseConfigured && !data.loadErrorMessage
                    ? "Lee lo que otras personas están compartiendo ahora mismo."
                    : "Mostramos ejemplos porque la base de datos aún no está configurada."}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <SortToggle label="Más recientes" value="latest" current={sort} baseParams={baseParams} />
                <SortToggle label="Más apoyadas" value="top" current={sort} baseParams={baseParams} />
              </div>
            </div>
            {data.loadErrorMessage ? (
              <p className="rounded-2xl border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                {data.loadErrorMessage}
              </p>
            ) : null}
          </header>

          {data.featured.length ? (
            <div className="space-y-4">
              <h3 className="font-heading text-2xl text-indigo-100">Historias destacadas</h3>
              <ul className="grid gap-6 md:grid-cols-2">
                {data.featured.map(post => (
                  <li
                    key={post.slug}
                    className="group overflow-hidden rounded-3xl border border-indigo-300/30 bg-indigo-950/40 p-6 shadow-lg shadow-indigo-900/40 transition hover:border-indigo-300/60 hover:bg-indigo-900/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-widest text-indigo-100/70">
                      <span>{post.authorAlias || "Anónimo/a"}</span>
                      <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>
                        {dateFormatter.format(post.publishedAt ?? post.createdAt)}
                      </time>
                    </div>
                    <Link
                      href={`/post/${post.slug}`}
                      className="mt-4 block font-heading text-2xl leading-snug text-white transition group-hover:text-indigo-200"
                    >
                      {post.title}
                    </Link>
                    {post.excerpt ? (
                      <p className="mt-3 text-sm leading-relaxed text-indigo-100/80">{post.excerpt}</p>
                    ) : null}
                    <TagList tags={post.tags} />
                    <ReactionSummary counts={post} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
                Página {safePage} de {totalPages}
              </span>
              <span className="text-xs uppercase tracking-widest text-white/60">
                {data.total} {data.total === 1 ? "entrada" : "entradas"}
              </span>
            </div>
            <ul className="grid gap-6 md:grid-cols-2">
              {data.posts.length === 0 ? (
                <li className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-white/70">
                  No encontramos publicaciones con esos filtros. Intenta usar otras palabras o quitar etiquetas.
                </li>
              ) : (
                data.posts.map(post => (
                  <li
                    key={post.slug}
                    className="group flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-7 shadow-lg shadow-black/20 transition hover:border-indigo-300/50 hover:bg-white/10"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-widest text-white/60">
                        <span>{post.authorAlias || "Anónimo/a"}</span>
                        <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>
                          {dateFormatter.format(post.publishedAt ?? post.createdAt)}
                        </time>
                      </div>
                      <Link
                        href={`/post/${post.slug}`}
                        className="mt-4 block font-heading text-2xl leading-snug text-white transition group-hover:text-indigo-200"
                      >
                        {post.title}
                      </Link>
                      {post.excerpt ? (
                        <p className="mt-3 text-sm leading-relaxed text-white/80">{post.excerpt}</p>
                      ) : null}
                    </div>
                    <div className="mt-6 space-y-4">
                      <TagList tags={post.tags} />
                      <ReactionSummary counts={post} />
                      <Link
                        href={`/post/${post.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-200 transition hover:text-indigo-100"
                      >
                        Leer historia completa →
                      </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <PaginationControls baseParams={baseParams} currentPage={safePage} totalPages={totalPages} />
          </div>
        </section>
      </div>
    </main>
  );
}

type LoaderArgs = {
  query: string;
  tag: string;
  page: number;
  sort: SortMode;
};

async function loadPageData({ query, tag, page, sort }: LoaderArgs): Promise<PageData> {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let posts: PostPreview[] = [];
  let featured: PostPreview[] = [];
  let total = 0;
  let tags: string[] = [];
  let loadErrorMessage: string | null = null;

  if (databaseConfigured) {
    const where: Prisma.PostWhereInput = {
      published: true,
    };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { contentMd: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
      ];
    }

    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }

    const orderBy: Prisma.PostOrderByWithRelationInput[] =
      sort === "top"
        ? [
            { reactionThumbsUp: "desc" },
            { reactionHeart: "desc" },
            { reactionHope: "desc" },
            { reactionClap: "desc" },
          ]
        : [
            { publishedAt: "desc" },
            { createdAt: "desc" },
          ];

    try {
      const [postResults, totalCount, featuredResults, tagRecords] = await Promise.all([
        prisma.post.findMany({
          where,
          include: {
            tags: {
              include: {
                tag: { select: { id: true, name: true } },
              },
            },
          },
          orderBy,
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          include: {
            tags: {
              include: {
                tag: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [
            { reactionThumbsUp: "desc" },
            { reactionHeart: "desc" },
            { reactionHope: "desc" },
            { reactionClap: "desc" },
            { publishedAt: "desc" },
          ],
          take: 3,
        }),
        prisma.tag.findMany({
          orderBy: { name: "asc" },
          take: 12,
        }),
      ]);

      posts = postResults as PostPreview[];
      featured = featuredResults as PostPreview[];
      total = totalCount;
      tags = tagRecords.map(record => record.name);
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

  if (!databaseConfigured || loadErrorMessage) {
    const normalizedQuery = query.toLowerCase();
    const filtered = fallbackPosts.filter(post => {
      const matchesQuery = normalizedQuery
        ? post.title.toLowerCase().includes(normalizedQuery) ||
          (post.excerpt ?? "").toLowerCase().includes(normalizedQuery)
        : true;
      const matchesTag = tag ? post.tags.some(({ tag: { name } }) => name === tag) : true;
      return matchesQuery && matchesTag;
    });
    total = filtered.length;
    const start = (page - 1) * PAGE_SIZE;
    posts = filtered.slice(start, start + PAGE_SIZE);
    featured = filtered.sort((a, b) => totalReactions(b) - totalReactions(a)).slice(0, 2);
    tags = Array.from(new Set(fallbackPosts.flatMap(post => post.tags.map(({ tag }) => tag.name))));
  }

  return { posts, total, featured, tags, loadErrorMessage, databaseConfigured };
}

function extractParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function buildBaseParams({
  query,
  tag,
  sort,
}: {
  query: string;
  tag: string;
  sort: SortMode;
}): Record<string, string> {
  const base: Record<string, string> = {};
  if (query) base.q = query;
  if (tag) base.tag = tag;
  if (sort) base.sort = sort;
  return base;
}

function buildQuery(
  base: Record<string, string>,
  overrides: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams(base);
  Object.entries(overrides).forEach(([key, value]) => {
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  return `?${params.toString()}`;
}

function tagStyle(name: string): string {
  const palette = [
    "border-rose-300/40 bg-rose-500/10 text-rose-100",
    "border-emerald-300/40 bg-emerald-500/10 text-emerald-100",
    "border-sky-300/40 bg-sky-500/10 text-sky-100",
    "border-orange-300/40 bg-orange-500/10 text-orange-100",
    "border-fuchsia-300/40 bg-fuchsia-500/10 text-fuchsia-100",
    "border-amber-300/40 bg-amber-500/10 text-amber-100",
  ];
  const index = Math.abs(hashString(name)) % palette.length;
  return palette[index];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function TagList({ tags }: { tags: TagRecord[] }) {
  if (!tags.length) return null;
  return (
    <ul className="flex flex-wrap gap-2 text-xs font-medium">
      {tags.map(({ tag }) => (
        <li key={tag.id ?? tag.name} className={`rounded-full border px-3 py-1 uppercase tracking-widest ${tagStyle(tag.name)}`}>
          #{tag.name}
        </li>
      ))}
    </ul>
  );
}

function ReactionSummary({ counts }: { counts: ReactionCountRecord }) {
  const total = totalReactions(counts);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-100/80">
      <span className="rounded-full border border-indigo-300/40 bg-indigo-500/10 px-3 py-1 uppercase tracking-widest">
        {total} {total === 1 ? "apoyo" : "apoyos"}
      </span>
      <span className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5">
        <span>👍</span>
        <span>{counts.reactionThumbsUp}</span>
      </span>
      <span className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5">
        <span>❤️</span>
        <span>{counts.reactionHeart}</span>
      </span>
      <span className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5">
        <span>😢</span>
        <span>{counts.reactionHope}</span>
      </span>
      <span className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5">
        <span>🙌</span>
        <span>{counts.reactionClap}</span>
      </span>
    </div>
  );
}

function SortToggle({
  label,
  value,
  current,
  baseParams,
}: {
  label: string;
  value: SortMode;
  current: SortMode;
  baseParams: Record<string, string>;
}) {
  const active = value === current;
  return (
    <Link
      href={buildQuery(baseParams, { sort: active ? undefined : value, page: "1" })}
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest transition ${
        active ? "border-white/80 bg-white/20 text-white" : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
      }`}
    >
      {label}
    </Link>
  );
}

function PaginationControls({
  baseParams,
  currentPage,
  totalPages,
}: {
  baseParams: Record<string, string>;
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/70">
      <div className="flex items-center gap-2">
        {previousPage ? (
          <Link
            href={buildQuery(baseParams, { page: String(previousPage) })}
            className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition hover:border-white/40 hover:text-white"
          >
            ← Anteriores
          </Link>
        ) : (
          <span className="rounded-full border border-transparent px-4 py-2 text-xs uppercase tracking-widest text-white/30">
            ← Anteriores
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
          <Link
            key={pageNumber}
            href={buildQuery(baseParams, { page: String(pageNumber) })}
            className={`rounded-full border px-3 py-1 transition ${
              pageNumber === currentPage
                ? "border-white/80 bg-white/20 text-white"
                : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
            }`}
          >
            {pageNumber}
          </Link>
        ))}
      </div>
      <div>
        {nextPage ? (
          <Link
            href={buildQuery(baseParams, { page: String(nextPage) })}
            className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Siguientes →
          </Link>
        ) : (
          <span className="rounded-full border border-transparent px-4 py-2 text-xs uppercase tracking-widest text-white/30">
            Siguientes →
          </span>
        )}
      </div>
    </div>
  );
}
