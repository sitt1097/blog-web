"use server"

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";


import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { excerptFromMarkdown, slugify } from "@/lib/posts";
import {
  adminTokenCookie,
  commentReactionCookie,
  commentTokenCookie,
  postReactionCookie,
  postTokenCookie,
} from "@/lib/tokens";
import { hashModerationSecret, isAdminTokenValid, moderationSecretHash } from "@/lib/admin";

const reactionTypes = ["thumbsUp", "heart", "hope", "clap"] as const;
type ReactionType = (typeof reactionTypes)[number];

const reactionFieldByType: Record<ReactionType, keyof Prisma.PostUncheckedUpdateInput> = {
  thumbsUp: "reactionThumbsUp",
  heart: "reactionHeart",
  hope: "reactionHope",
  clap: "reactionClap",
};

const commentReactionFieldByType: Record<ReactionType, keyof Prisma.CommentUncheckedUpdateInput> = {
  thumbsUp: "reactionThumbsUp",
  heart: "reactionHeart",
  hope: "reactionHope",
  clap: "reactionClap",
};

function parseReactionCookie(value: string | undefined): Set<ReactionType> {
  if (!value) {
    return new Set();
  }

  const parsed = value
    .split(",")
    .map(token => token.trim())
    .filter((token): token is ReactionType => reactionTypes.includes(token as ReactionType));

  return new Set(parsed);
}

function serializeReactions(set: Set<ReactionType>): string {
  return Array.from(set).join(",");
}

function getPostReactionCount(
  record:
    | { reactionThumbsUp: number; reactionHeart: number; reactionHope: number; reactionClap: number }
    | null,
  reaction: ReactionType,
): number {
  if (!record) return 0;
  switch (reaction) {
    case "thumbsUp":
      return record.reactionThumbsUp;
    case "heart":
      return record.reactionHeart;
    case "hope":
      return record.reactionHope;
    case "clap":
      return record.reactionClap;
  }
}

function getCommentReactionCount(
  record:
    | { reactionThumbsUp: number; reactionHeart: number; reactionHope: number; reactionClap: number }
    | null,
  reaction: ReactionType,
): number {
  if (!record) return 0;
  switch (reaction) {
    case "thumbsUp":
      return record.reactionThumbsUp;
    case "heart":
      return record.reactionHeart;
    case "hope":
      return record.reactionHope;
    case "clap":
      return record.reactionClap;
  }
}

export type CreatePostState = {
  message?: string;
  errors?: string[];
  createdSlug?: string;
};

export type UpdatePostState = {
  message?: string;
  errors?: string[];
};

export type CommentFormState = {
  message?: string;
  errors?: string[];
};

export type ActionResult = {
  message?: string;
  error?: string;
};

export async function authenticateAdmin(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  void _prevState;
  const providedSecret = (formData.get("secret") ?? "").toString();
  const expectedHash = moderationSecretHash();

  if (!expectedHash) {
    return {
      error:
        "La moderación no está configurada. Define la variable de entorno MODERATION_SECRET para habilitar esta función.",
    };
  }

  if (!providedSecret) {
    return { error: "Ingresa la clave de moderación." };
  }

  const providedHash = hashModerationSecret(providedSecret);

  if (providedHash !== expectedHash) {
    return { error: "La clave ingresada no coincide." };
  }

  const cookieStore = await cookies();

  cookieStore.set({
    name: adminTokenCookie(),
    value: expectedHash,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return { message: "Sesión de moderación activada." };
}

export async function logoutAdmin(
  _prevState: ActionResult | undefined,
  _formData: FormData,
): Promise<ActionResult> {
  void _prevState;
  void _formData;
  const cookieStore = await cookies();
  cookieStore.delete(adminTokenCookie());

  return { message: "Sesión de moderación cerrada." };
}

export async function createPost(
  prevState: CreatePostState | undefined,
  formData: FormData,
): Promise<CreatePostState> {
  const title = (formData.get("title") ?? "").toString().trim();
  const content = (formData.get("content") ?? "").toString().trim();
  const alias = (formData.get("alias") ?? "").toString().trim();
  const rawTags = (formData.get("tags") ?? "").toString();

  const errors: string[] = [];

  if (!title) {
    errors.push("El título es obligatorio.");
  } else if (title.length < 4) {
    errors.push("El título debe tener al menos 4 caracteres.");
  }

  if (!content) {
    errors.push("Comparte al menos una idea en el cuerpo del mensaje.");
  } else if (content.length < 16) {
    errors.push("Tu mensaje es muy corto, intenta desarrollarlo un poco más.");
  }

  if (alias.length > 40) {
    errors.push("El alias puede tener máximo 40 caracteres.");
  }

  const parsedTags = rawTags
    .split(",")
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean);

  const uniqueTags = Array.from(new Set(parsedTags)).slice(0, 5);

  if (errors.length > 0) {
    return { errors };
  }

  const baseSlug = slugify(title);
  let candidateSlug = baseSlug;
  let suffix = 1;

  while (await prisma.post.findUnique({ where: { slug: candidateSlug } })) {
    suffix += 1;
    candidateSlug = `${baseSlug}-${suffix}`;
  }

  const excerpt = excerptFromMarkdown(content);

  const tagRecords = await Promise.all(
    uniqueTags.map(name =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const managementToken = randomUUID();

  await prisma.post.create({
    data: {
      title,
      slug: candidateSlug,
      excerpt,
      contentMd: content,
      published: true,
      publishedAt: new Date(),
      authorAlias: alias || null,
      authorToken: managementToken,
      tags: {
        create: tagRecords.map(tag => ({ tagId: tag.id })),
      },
    },
  });

  const cookieStore = await cookies();

  cookieStore.set({
    name: postTokenCookie(candidateSlug),
    value: managementToken,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  revalidatePath("/");
  revalidatePath(`/post/${candidateSlug}`);

  return {
    message: "Tu mensaje se publicó correctamente. Podrás editarlo o eliminarlo desde este navegador.",
    createdSlug: candidateSlug,
  };
}

export async function updatePost(
  prevState: UpdatePostState | undefined,
  formData: FormData,
): Promise<UpdatePostState> {
  const slug = (formData.get("slug") ?? "").toString();
  const title = (formData.get("title") ?? "").toString().trim();
  const content = (formData.get("content") ?? "").toString().trim();
  const alias = (formData.get("alias") ?? "").toString().trim();
  const rawTags = (formData.get("tags") ?? "").toString();

  const errors: string[] = [];

  if (!slug) {
    errors.push("No encontramos la publicación que quieres editar.");
  }

  if (!title) {
    errors.push("El título es obligatorio.");
  } else if (title.length < 4) {
    errors.push("El título debe tener al menos 4 caracteres.");
  }

  if (!content) {
    errors.push("Comparte al menos una idea en el cuerpo del mensaje.");
  } else if (content.length < 16) {
    errors.push("Tu mensaje es muy corto, intenta desarrollarlo un poco más.");
  }

  if (alias.length > 40) {
    errors.push("El alias puede tener máximo 40 caracteres.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const parsedTags = rawTags
    .split(",")
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean);

  const uniqueTags = Array.from(new Set(parsedTags)).slice(0, 5);

  const post = await prisma.post.findUnique({
    where: { slug },
    include: { tags: true },
  });

  if (!post) {
    return {
      errors: ["No encontramos la publicación que quieres editar."],
    };
  }

  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(postTokenCookie(slug));
  if (!tokenCookie || !post.authorToken || tokenCookie.value !== post.authorToken) {
    return {
      errors: ["Solo quien publicó este mensaje puede editarlo desde este navegador."],
    };
  }

  const excerpt = excerptFromMarkdown(content);

  const tagRecords = await Promise.all(
    uniqueTags.map(name =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  await prisma.$transaction([
    prisma.tagOnPost.deleteMany({ where: { postId: post.id } }),
    prisma.post.update({
      where: { id: post.id },
      data: {
        title,
        contentMd: content,
        excerpt,
        authorAlias: alias || null,
        tags: {
          create: tagRecords.map(tag => ({ tagId: tag.id })),
        },
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/post/${slug}`);

  return {
    message: "Se guardaron los cambios.",
  };
}

export async function deletePost(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const slug = (formData.get("slug") ?? "").toString();

  if (!slug) {
    return { error: "No se pudo identificar la publicación." };
  }

  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, authorToken: true },
  });

  if (!post) {
    return { error: "La publicación ya no existe." };
  }

  const cookieStore = await cookies();
  const isAdmin = isAdminTokenValid(cookieStore.get(adminTokenCookie())?.value);
  const tokenCookie = cookieStore.get(postTokenCookie(slug));
  const isAuthor = Boolean(tokenCookie && post.authorToken && tokenCookie.value === post.authorToken);

  if (!isAdmin && !isAuthor) {
    return {
      error: "Solo quien publicó este mensaje o un moderador autorizado puede eliminarlo desde este navegador.",
    };
  }

  await prisma.post.delete({ where: { id: post.id } });

  cookieStore.delete(postTokenCookie(slug));

  revalidatePath("/");
  revalidatePath(`/post/${slug}`);

  return { message: "La publicación se eliminó." };
}

export async function createComment(
  prevState: CommentFormState | undefined,
  formData: FormData,
): Promise<CommentFormState> {
  const slug = (formData.get("slug") ?? "").toString();
  const content = (formData.get("content") ?? "").toString().trim();
  const alias = (formData.get("alias") ?? "").toString().trim();
  const parentId = (formData.get("parentId") ?? "").toString().trim() || undefined;

  const errors: string[] = [];

  if (!slug) {
    errors.push("No encontramos la publicación a la que quieres responder.");
  }

  if (!content) {
    errors.push("Comparte tu respuesta para poder publicarla.");
  } else if (content.length < 4) {
    errors.push("Tu respuesta es muy corta, intenta desarrollarla un poco más.");
  }

  if (alias.length > 40) {
    errors.push("El alias puede tener máximo 40 caracteres.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!post) {
    return { errors: ["La publicación ya no existe."] };
  }

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { postId: true },
    });
    if (!parent || parent.postId !== post.id) {
      return { errors: ["No se pudo encontrar el comentario al que respondes."] };
    }
  }

  const authorToken = randomUUID();

  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      parentId,
      contentMd: content,
      authorAlias: alias || null,
      authorToken,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set({
    name: commentTokenCookie(comment.id),
    value: authorToken,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  });

  revalidatePath(`/post/${slug}`);

  return {
    message: "Tu respuesta se publicó.",
  };
}

export async function updateComment(
  prevState: CommentFormState | undefined,
  formData: FormData,
): Promise<CommentFormState> {
  const commentId = (formData.get("commentId") ?? "").toString();
  const content = (formData.get("content") ?? "").toString().trim();
  const alias = (formData.get("alias") ?? "").toString().trim();
  const slug = (formData.get("slug") ?? "").toString();

  const errors: string[] = [];

  if (!commentId) {
    errors.push("No encontramos el comentario que quieres editar.");
  }

  if (!content) {
    errors.push("Comparte tu respuesta para poder publicarla.");
  } else if (content.length < 4) {
    errors.push("Tu respuesta es muy corta, intenta desarrollarla un poco más.");
  }

  if (alias.length > 40) {
    errors.push("El alias puede tener máximo 40 caracteres.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, post: { select: { slug: true } }, authorToken: true },
  });

  if (!comment) {
    return { errors: ["El comentario ya no existe."] };
  }

  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(commentTokenCookie(commentId));
  if (!tokenCookie || !comment.authorToken || tokenCookie.value !== comment.authorToken) {
    return {
      errors: ["Solo quien escribió este comentario puede editarlo desde este navegador."],
    };
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      contentMd: content,
      authorAlias: alias || null,
    },
  });

  const targetSlug = slug || comment.post.slug;

  revalidatePath(`/post/${targetSlug}`);

  return { message: "Se actualizaron los cambios." };
}

export async function deleteComment(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const commentId = (formData.get("commentId") ?? "").toString();

  if (!commentId) {
    return { error: "No se pudo identificar el comentario." };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorToken: true, post: { select: { slug: true } } },
  });

  if (!comment) {
    return { error: "El comentario ya no existe." };
  }

  const cookieStore = await cookies();
  const isAdmin = isAdminTokenValid(cookieStore.get(adminTokenCookie())?.value);
  const tokenCookie = cookieStore.get(commentTokenCookie(commentId));
  const isAuthor = Boolean(tokenCookie && comment.authorToken && tokenCookie.value === comment.authorToken);

  if (!isAdmin && !isAuthor) {
    return {
      error: "Solo quien escribió este comentario o un moderador autorizado puede eliminarlo desde este navegador.",
    };
  }

  await prisma.comment.delete({ where: { id: commentId } });

  cookieStore.delete(commentTokenCookie(commentId));

  revalidatePath(`/post/${comment.post.slug}`);

  return { message: "El comentario se eliminó." };
}


export async function reactToPost(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const slug = (formData.get("slug") ?? "").toString();
  const reaction = (formData.get("reaction") ?? "").toString() as ReactionType;

  if (!slug) {
    return { error: "No encontramos la publicación." };
  }

  if (!reactionTypes.includes(reaction)) {
    return { error: "Tipo de reacción no válido." };
  }

  const field = reactionFieldByType[reaction];

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      slug: true,
      reactionThumbsUp: true,
      reactionHeart: true,
      reactionHope: true,
      reactionClap: true,
    },
  });

  if (!post) {
    return { error: "La publicación ya no está disponible." };
  }

  const cookieStore = await cookies();
  const cookieName = postReactionCookie(slug);
  const currentReactions = parseReactionCookie(cookieStore.get(cookieName)?.value);
  const togglingOff = currentReactions.has(reaction);
  const currentCount = getPostReactionCount(post, reaction);
  const delta = togglingOff ? (currentCount > 0 ? -1 : 0) : 1;

  if (delta !== 0) {
    const data: Prisma.PostUncheckedUpdateInput = {};
    switch (field) {
      case "reactionThumbsUp":
        data.reactionThumbsUp = { increment: delta };
        break;
      case "reactionHeart":
        data.reactionHeart = { increment: delta };
        break;
      case "reactionHope":
        data.reactionHope = { increment: delta };
        break;
      case "reactionClap":
        data.reactionClap = { increment: delta };
        break;
    }

    await prisma.post.update({
      where: { slug },
      data,
    });
  }

  if (togglingOff) {
    currentReactions.delete(reaction);
  } else {
    currentReactions.add(reaction);
  }

  if (currentReactions.size === 0) {
    cookieStore.delete(cookieName);
  } else {
    cookieStore.set({
      name: cookieName,
      value: serializeReactions(currentReactions),
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 180,
      path: `/post/${slug}`,
    });
  }

  revalidatePath("/");
  revalidatePath(`/post/${slug}`);

  return { message: togglingOff ? "Quitaste tu reacción." : "¡Gracias por reaccionar!" };
}

export async function reactToComment(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const commentId = (formData.get("commentId") ?? "").toString();
  const reaction = (formData.get("reaction") ?? "").toString() as ReactionType;

  if (!commentId) {
    return { error: "No encontramos el comentario." };
  }

  if (!reactionTypes.includes(reaction)) {
    return { error: "Tipo de reacción no válido." };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      post: { select: { slug: true } },
      reactionThumbsUp: true,
      reactionHeart: true,
      reactionHope: true,
      reactionClap: true,
    },
  });

  if (!comment || !comment.post?.slug) {
    return { error: "El comentario ya no está disponible." };
  }

  const field = commentReactionFieldByType[reaction];
  const currentCount = getCommentReactionCount(comment, reaction);

  const cookieStore = await cookies();
  const cookieName = commentReactionCookie(commentId);
  const currentReactions = parseReactionCookie(cookieStore.get(cookieName)?.value);
  const togglingOff = currentReactions.has(reaction);
  const delta = togglingOff ? (currentCount > 0 ? -1 : 0) : 1;

  if (delta !== 0) {
    const data: Prisma.CommentUncheckedUpdateInput = {};
    switch (field) {
      case "reactionThumbsUp":
        data.reactionThumbsUp = { increment: delta };
        break;
      case "reactionHeart":
        data.reactionHeart = { increment: delta };
        break;
      case "reactionHope":
        data.reactionHope = { increment: delta };
        break;
      case "reactionClap":
        data.reactionClap = { increment: delta };
        break;
    }

    await prisma.comment.update({
      where: { id: commentId },
      data,
    });
  }

  if (togglingOff) {
    currentReactions.delete(reaction);
  } else {
    currentReactions.add(reaction);
  }

  if (currentReactions.size === 0) {
    cookieStore.delete(cookieName);
  } else {
    cookieStore.set({
      name: cookieName,
      value: serializeReactions(currentReactions),
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
    });
  }

  revalidatePath(`/post/${comment.post.slug}`);

  return { message: togglingOff ? "Quitaste tu reacción." : "¡Gracias por reaccionar!" };
}
