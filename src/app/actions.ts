"use server"

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { excerptFromMarkdown, slugify } from "@/lib/posts";

export type CreatePostState = {
  message?: string;
  errors?: string[];
  createdSlug?: string;
};

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

  await prisma.post.create({
    data: {
      title,
      slug: candidateSlug,
      excerpt,
      contentMd: content,
      published: true,
      publishedAt: new Date(),
      authorAlias: alias || null,
      tags: {
        create: tagRecords.map(tag => ({ tagId: tag.id })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath(`/post/${candidateSlug}`);

  return {
    message: "Tu mensaje se publicó correctamente.",
    createdSlug: candidateSlug,
  };
}
