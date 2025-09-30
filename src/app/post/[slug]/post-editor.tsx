"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { deletePost, type ActionResult, updatePost, type UpdatePostState } from "@/app/actions";

const initialUpdateState: UpdatePostState = {};
const initialDeleteState: ActionResult = {};

export function PostOwnerPanel({
  slug,
  title,
  content,
  alias,
  tags,
}: {
  slug: string;
  title: string;
  content: string;
  alias: string;
  tags: string;
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const [updateState, updateAction] = useFormState(updatePost, initialUpdateState);
  const [deleteState, deleteAction] = useFormState(deletePost, initialDeleteState);

  useEffect(() => {
    if (updateState?.message) {
      setEditing(false);
    }
  }, [updateState?.message]);

  useEffect(() => {
    if (deleteState?.message) {
      router.replace("/");
    }
  }, [deleteState?.message, router]);

  return (
    <div className="mt-6 rounded-3xl border border-indigo-300/30 bg-indigo-950/40 p-6 text-sm text-white/80 shadow-inner shadow-indigo-900/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p>
          Esta publicación está vinculada a tu navegador. Aquí puedes editarla, añadir novedades o eliminarla cuando lo
          necesites.
        </p>
        <button
          type="button"
          onClick={() => setEditing(prev => !prev)}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-indigo-100 transition hover:border-white/40 hover:bg-white/20"
        >
          {editing ? "Cerrar edición" : "Editar publicación"}
        </button>
      </div>
      {editing ? (
        <form action={updateAction} className="mt-6 space-y-5 text-white">
          <input type="hidden" name="slug" value={slug} />
          <div>
            <label htmlFor="edit-title" className="block text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200/80">
              Título
            </label>
            <input
              id="edit-title"
              name="title"
              defaultValue={title}
              required
              maxLength={120}
              className="mt-3 w-full rounded-2xl border border-white/30 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner shadow-indigo-900/10 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label htmlFor="edit-content" className="block text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200/80">
              Mensaje
            </label>
            <textarea
              id="edit-content"
              name="content"
              defaultValue={content}
              required
              minLength={16}
              rows={6}
              className="mt-3 w-full rounded-2xl border border-white/30 bg-white/90 px-4 py-4 text-base text-slate-900 shadow-inner shadow-indigo-900/10 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="edit-alias" className="block text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200/80">
                Alias (opcional)
              </label>
              <input
                id="edit-alias"
                name="alias"
                defaultValue={alias}
                maxLength={40}
                className="mt-3 w-full rounded-2xl border border-white/30 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-inner shadow-indigo-900/10 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label htmlFor="edit-tags" className="block text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200/80">
                Etiquetas (separadas por comas)
              </label>
              <input
                id="edit-tags"
                name="tags"
                defaultValue={tags}
                className="mt-3 w-full rounded-2xl border border-white/30 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-inner shadow-indigo-900/10 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          {updateState?.errors?.length ? (
            <ul className="list-disc space-y-1 rounded-2xl border border-red-200/40 bg-red-500/10 p-4 text-xs text-red-100">
              {updateState.errors.map(error => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          {updateState?.message ? (
            <p className="rounded-2xl border border-emerald-200/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">
              {updateState.message}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-100/80">
            <SaveButton />
            <span>Consejo: Puedes usar Markdown igual que en la publicación original.</span>
          </div>
        </form>
      ) : null}
      <form action={deleteAction} className="mt-6 flex flex-col gap-3 text-xs text-red-100/80">
        <input type="hidden" name="slug" value={slug} />
        {deleteState?.error ? (
          <p className="rounded-2xl border border-red-200/40 bg-red-500/10 p-3 text-red-100">{deleteState.error}</p>
        ) : null}
        <DeleteButton />
        <p>
          Si eliminas el mensaje desaparecerá de inmediato junto con todos los comentarios asociados. Esta acción no se puede
          deshacer.
        </p>
      </form>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/60 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-200 transition hover:border-red-200 hover:bg-red-500/20 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Eliminando..." : "Eliminar publicación"}
    </button>
  );
}
