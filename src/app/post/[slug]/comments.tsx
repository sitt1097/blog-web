"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  createComment,
  deleteComment,
  type ActionResult,
  type CommentFormState,
  updateComment,
} from "@/app/actions";

export type CommentNode = {
  id: string;
  contentHtml: string;
  contentMd: string;
  authorAlias: string | null;
  createdAtIso: string;
  createdAtLabel: string;
  wasEdited: boolean;
  canEdit: boolean;
  replies: CommentNode[];
};

const initialCommentState: CommentFormState = {};
const initialDeleteState: ActionResult = {};

export function CommentsSection({ slug, comments }: { slug: string; comments: CommentNode[] }) {
  const [formState, formAction] = useFormState(createComment, initialCommentState);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (formState?.message) {
      setHasSubmitted(prev => !prev);
    }
  }, [formState?.message]);

  return (
    <section className="mt-14">
      <header className="flex flex-col gap-2 border-b border-white/10 pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-semibold text-white">Conversación</h2>
          <span className="text-xs uppercase tracking-wide text-white/60">
            {comments.length} {comments.length === 1 ? "respuesta" : "respuestas"}
          </span>
        </div>
        <p className="text-sm text-white/70">
          Responde con empatía. Puedes compartir consejos, experiencias o simplemente dejar un mensaje de apoyo.
        </p>
      </header>
      <form
        key={hasSubmitted ? "reset" : "form"}
        action={formAction}
        className="mt-8 space-y-4 rounded-2xl border border-white/15 bg-white/5 p-6 text-sm text-white"
      >
        <input type="hidden" name="slug" value={slug} />
        <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,200px)]">
          <div>
            <label htmlFor="new-comment" className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Comparte tu respuesta
            </label>
            <textarea
              id="new-comment"
              name="content"
              required
              minLength={4}
              rows={4}
              className="mt-2 w-full rounded-lg border border-white/30 bg-white/80 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Escribe con respeto. También soportamos Markdown sencillo."
            />
          </div>
          <div>
            <label htmlFor="new-comment-alias" className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Alias (opcional)
            </label>
            <input
              id="new-comment-alias"
              name="alias"
              maxLength={40}
              className="mt-2 w-full rounded-lg border border-white/30 bg-white/70 px-4 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Anónima, Compañero solidario..."
            />
          </div>
        </div>
        {formState?.errors?.length ? (
          <ul className="list-disc space-y-1 rounded-lg border border-red-200/40 bg-red-500/10 p-4 text-xs text-red-100">
            {formState.errors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        {formState?.message ? (
          <p className="rounded-lg border border-emerald-200/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            {formState.message}
          </p>
        ) : null}
        <div className="flex items-center gap-3 text-xs text-white/70">
          <SubmitButton label="Publicar respuesta" pendingLabel="Enviando..." />
          <span>Recuerda: ninguna persona aquí es profesional de la salud a menos que lo indique expresamente.</span>
        </div>
      </form>

      <ol className="mt-10 space-y-6">
        {comments.length === 0 ? (
          <li className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Nadie ha respondido todavía. ¡Anímate a dejar unas palabras amables!
          </li>
        ) : (
          comments.map(comment => <CommentItem key={comment.id} slug={slug} comment={comment} depth={0} />)
        )}
      </ol>
    </section>
  );
}

function CommentItem({ slug, comment, depth }: { slug: string; comment: CommentNode; depth: number }) {
  const [showReply, setShowReply] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteState, deleteAction] = useFormState(deleteComment, initialDeleteState);

  useEffect(() => {
    if (deleteState?.message) {
      setShowEdit(false);
      setShowReply(false);
    }
  }, [deleteState?.message]);

  const replies = useMemo(
    () =>
      comment.replies.map(child => (
        <CommentItem key={child.id} slug={slug} comment={child} depth={depth + 1} />
      )),
    [comment.replies, depth, slug],
  );

  return (
    <li className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-white/60">
        <span>{comment.authorAlias || "Anónimo/a"}</span>
        <time dateTime={comment.createdAtIso}>{comment.createdAtLabel}</time>
      </div>
      <article
        className="prose prose-invert mt-4 max-w-none text-sm prose-headings:text-white prose-strong:text-white"
        dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/60">
        <button
          type="button"
          onClick={() => {
            setShowReply(prev => !prev);
            setShowEdit(false);
          }}
          className="rounded-full border border-white/20 px-3 py-1 transition hover:border-indigo-200 hover:text-indigo-100"
        >
          {showReply ? "Cancelar" : "Responder"}
        </button>
        {comment.canEdit ? (
          <button
            type="button"
            onClick={() => {
              setShowEdit(prev => !prev);
              setShowReply(false);
            }}
            className="rounded-full border border-white/20 px-3 py-1 transition hover:border-indigo-200 hover:text-indigo-100"
          >
            {showEdit ? "Cerrar edición" : "Editar"}
          </button>
        ) : null}
        {comment.wasEdited ? <span className="text-emerald-200/80">(Editado)</span> : null}
        {deleteState?.error ? (
          <span className="rounded-full border border-red-200/40 bg-red-500/10 px-3 py-1 text-red-100">{deleteState.error}</span>
        ) : null}
        {comment.canEdit ? (
          <form action={deleteAction} className="ml-auto">
            <input type="hidden" name="commentId" value={comment.id} />
            <DeleteButton />
          </form>
        ) : null}
      </div>
      {showReply ? (
        <ReplyForm slug={slug} parentId={comment.id} onClose={() => setShowReply(false)} />
      ) : null}
      {showEdit ? (
        <EditCommentForm
          slug={slug}
          commentId={comment.id}
          initialContent={comment.contentMd}
          initialAlias={comment.authorAlias ?? ""}
        />
      ) : null}
      {comment.replies.length ? <ol className="mt-6 space-y-6 pl-6 text-sm">{replies}</ol> : null}
    </li>
  );
}

function ReplyForm({ slug, parentId, onClose }: { slug: string; parentId: string; onClose: () => void }) {
  const [state, action] = useFormState(createComment, initialCommentState);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (state?.message) {
      onClose();
      setNonce(value => value + 1);
    }
  }, [state?.message, onClose]);

  return (
    <form
      key={nonce}
      action={action}
      className="mt-4 space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="parentId" value={parentId} />
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/60">Tu respuesta</label>
        <textarea
          name="content"
          required
          minLength={4}
          rows={3}
          className="mt-2 w-full rounded-lg border border-white/30 bg-white/80 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Añade tu voz a esta parte de la conversación"
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/60">Alias (opcional)</label>
        <input
          name="alias"
          maxLength={40}
          className="mt-2 w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Anon, Aliada..."
        />
      </div>
      {state?.errors?.length ? (
        <ul className="list-disc space-y-1 rounded-lg border border-red-200/40 bg-red-500/10 p-3 text-[11px] text-red-100">
          {state.errors.map(error => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center gap-3 text-[11px] text-white/70">
        <SubmitButton label="Responder" pendingLabel="Enviando..." />
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/20 px-3 py-1 transition hover:border-indigo-200 hover:text-indigo-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function EditCommentForm({
  slug,
  commentId,
  initialContent,
  initialAlias,
}: {
  slug: string;
  commentId: string;
  initialContent: string;
  initialAlias: string;
}) {
  const [state, action] = useFormState(updateComment, initialCommentState);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (state?.message) {
      setNonce(value => value + 1);
    }
  }, [state?.message]);

  return (
    <form
      key={nonce}
      action={action}
      className="mt-4 space-y-3 rounded-2xl border border-indigo-300/20 bg-indigo-500/10 p-4 text-xs text-white"
    >
      <input type="hidden" name="commentId" value={commentId} />
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/70">Editar mensaje</label>
        <textarea
          name="content"
          defaultValue={initialContent}
          required
          minLength={4}
          rows={3}
          className="mt-2 w-full rounded-lg border border-white/30 bg-white/80 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/70">Alias (opcional)</label>
        <input
          name="alias"
          defaultValue={initialAlias}
          maxLength={40}
          className="mt-2 w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      {state?.errors?.length ? (
        <ul className="list-disc space-y-1 rounded-lg border border-red-200/40 bg-red-500/10 p-3 text-[11px] text-red-100">
          {state.errors.map(error => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {state?.message ? (
        <p className="rounded-lg border border-emerald-200/40 bg-emerald-500/10 p-3 text-[11px] text-emerald-100">
          {state.message}
        </p>
      ) : null}
      <div className="flex items-center gap-3 text-[11px] text-white/70">
        <SubmitButton label="Guardar cambios" pendingLabel="Guardando..." />
      </div>
    </form>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo-500 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-red-300/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-200 transition hover:border-red-200 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
