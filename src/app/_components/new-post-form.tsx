"use client"

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { createPost, type CreatePostState } from "@/app/actions";

const initialState: CreatePostState = {};

export function NewPostForm() {
  const [state, formAction] = useFormState(createPost, initialState);

  return (
    <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-lg backdrop-blur">
      <h2 className="text-2xl font-semibold text-white">Comparte tu voz</h2>
      <p className="mt-2 text-sm text-white/80">
        Publica de forma anónima. Los mensajes respetuosos ayudan a que la comunidad sea un lugar seguro.
      </p>
      <form action={formAction} className="mt-6 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-white">
            Título
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            className="mt-2 w-full rounded-lg border border-white/30 bg-white/80 px-4 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="¿Sobre qué quieres hablar?"
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-white">
            Mensaje
          </label>
          <textarea
            id="content"
            name="content"
            required
            minLength={16}
            rows={6}
            className="mt-2 w-full rounded-lg border border-white/30 bg-white/80 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Cuéntanos tu historia, usa Markdown sencillo si quieres destacar partes."
          />
          <p className="mt-1 text-xs text-white/70">
            Soportamos títulos (#), listas (-), texto en <strong>negrita</strong> y <em>cursiva</em>, enlaces y bloques de código.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="alias" className="block text-sm font-medium text-white">
              Alias (opcional)
            </label>
            <input
              id="alias"
              name="alias"
              maxLength={40}
              className="mt-2 w-full rounded-lg border border-white/30 bg-white/70 px-4 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Anónim@, Viajera Curiosa, ..."
            />
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-white">
              Etiquetas (coma separadas, máx 5)
            </label>
            <input
              id="tags"
              name="tags"
              className="mt-2 w-full rounded-lg border border-white/30 bg-white/70 px-4 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="ej. emociones, consejos"
            />
          </div>
        </div>
        {state.errors?.length ? (
          <ul className="list-disc space-y-1 rounded-lg border border-red-200/40 bg-red-500/10 p-4 text-sm text-red-100">
            {state.errors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        {state.message ? (
          <div className="rounded-lg border border-emerald-200/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p>{state.message}</p>
            {state.createdSlug ? (
              <p className="mt-2">
                <Link className="underline" href={`/post/${state.createdSlug}`}>
                  Ver publicación
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton />
          <p className="text-xs text-white/70">
            Al enviar aceptas moderación comunitaria. No compartas datos personales tuyos ni de otras personas.
          </p>
        </div>
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Publicando..." : "Publicar"}
    </button>
  );
}
