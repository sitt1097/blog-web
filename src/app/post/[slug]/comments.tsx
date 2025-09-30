"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  createComment,
  deleteComment,
  reactToComment,
  type ActionResult,
  type CommentFormState,
  updateComment,
} from "@/app/actions";
import { reactionOptions, type ReactionCountRecord, type ReactionId } from "@/lib/reactions";

export type CommentNode = {
  id: string;
  contentHtml: string;
  contentMd: string;
  authorAlias: string | null;
  createdAtIso: string;
  createdAtLabel: string;
  wasEdited: boolean;
  canEdit: boolean;
  ownedByViewer: boolean;
  replyingToOwner: boolean;
  parentId: string | null;
  depth: number;
  reactions: {
    counts: ReactionCountRecord;
    viewer: ReactionId[];
  };
  totalReactionScore: number;
  replies: CommentNode[];
};

type CommentsSectionProps = {
  slug: string;
  comments: CommentNode[];
  canManagePost: boolean;
};

type SortMode = "recent" | "top";

type ReactionState = {
  counts: ReactionCountRecord;
  active: Set<ReactionId>;
};

const initialCommentState: CommentFormState = {};
const initialDeleteState: ActionResult = {};

export function CommentsSection({ slug, comments, canManagePost }: CommentsSectionProps) {
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [formState, formAction] = useFormState(createComment, initialCommentState);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (formState?.message) {
      setHasSubmitted(prev => !prev);
    }
  }, [formState?.message]);

  const sortedComments = useMemo(() => sortCommentTree(comments, sortMode), [comments, sortMode]);

  const actionableComments = useMemo(
    () =>
      flattenComments(sortedComments).filter(comment =>
        comment.replyingToOwner || (canManagePost && comment.depth === 0),
      ),
    [sortedComments, canManagePost],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = "va-seen-replies";
    const seenRaw = window.localStorage.getItem(storageKey);
    const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);

    const unseen = actionableComments.filter(comment => !comment.ownedByViewer && !seen.has(comment.id));

    if (unseen.length > 0) {
      setNotification(
        unseen.length === 1
          ? "Tienes una nueva respuesta dirigida a ti."
          : `Tienes ${unseen.length} respuestas nuevas por leer.`,
      );

      unseen.forEach(comment => {
        seen.add(comment.id);
      });

      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(seen)));
    }
  }, [actionableComments]);

  return (
    <section className="mt-16 space-y-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/5 p-6 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl text-white">Conversación</h2>
            <p className="mt-1 text-sm text-white/70">
              Respuestas con empatía ayudan a que la comunidad se sienta acompañada. Puedes reaccionar con un gesto rápido o
              dejar un mensaje.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
              {comments.length} {comments.length === 1 ? "respuesta" : "respuestas"}
            </span>
            <SortSelector value={sortMode} onChange={setSortMode} />
          </div>
        </div>
        {notification ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <span className="text-lg">🔔</span>
            <span>{notification}</span>
          </div>
        ) : null}
      </header>

      <ol className="space-y-6">
        {sortedComments.length === 0 ? (
          <li className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/70">
            Nadie ha respondido todavía. ¡Anímate a dejar unas palabras amables!
          </li>
        ) : (
          sortedComments.map(comment => (
            <CommentItem key={comment.id} slug={slug} comment={comment} />
          ))
        )}
      </ol>

      <form
        key={hasSubmitted ? "reset" : "composer"}
        action={formAction}
        className="rounded-3xl border border-indigo-300/40 bg-indigo-950/40 p-8 text-sm text-white shadow-2xl shadow-indigo-900/40"
      >
        <h3 className="font-heading text-2xl text-white">Comparte tu respuesta</h3>
        <p className="mt-2 text-sm text-indigo-100/80">
          Escribe con respeto. También soportamos Markdown sencillo para dar formato.
        </p>
        <input type="hidden" name="slug" value={slug} />
        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label
              htmlFor="new-comment"
              className="text-xs font-semibold uppercase tracking-widest text-indigo-200/80"
            >
              Mensaje
            </label>
            <textarea
              id="new-comment"
              name="content"
              required
              minLength={4}
              rows={4}
              className="mt-3 w-full rounded-2xl border border-white/30 bg-white/90 px-5 py-4 text-base text-slate-900 shadow-inner shadow-indigo-900/20 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Escribe tu respuesta aquí..."
            />
          </div>
          <div>
            <label
              htmlFor="new-comment-alias"
              className="text-xs font-semibold uppercase tracking-widest text-indigo-200/80"
            >
              Alias (opcional)
            </label>
            <input
              id="new-comment-alias"
              name="alias"
              maxLength={40}
              className="mt-3 w-full rounded-2xl border border-white/30 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-inner shadow-indigo-900/10 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Anónima, Compañero solidario..."
            />
          </div>
        </div>
        {formState?.errors?.length ? (
          <ul className="mt-6 list-disc space-y-2 rounded-2xl border border-red-200/40 bg-red-500/10 p-4 text-xs text-red-100">
            {formState.errors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        {formState?.message ? (
          <p className="mt-6 rounded-2xl border border-emerald-200/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
            {formState.message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-indigo-100/80">
          <SubmitButton label="Publicar respuesta" pendingLabel="Enviando..." />
          <span>
            Recuerda: ninguna persona aquí es profesional de la salud a menos que lo indique expresamente.
          </span>
        </div>
      </form>
    </section>
  );
}

function CommentItem({ slug, comment }: { slug: string; comment: CommentNode }) {
  const [showReply, setShowReply] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteState, deleteAction] = useFormState(deleteComment, initialDeleteState);

  useEffect(() => {
    if (deleteState?.message) {
      setShowReply(false);
      setShowEdit(false);
    }
  }, [deleteState?.message]);

  return (
    <li className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-widest text-white/60">
        <span>{comment.authorAlias || "Anónimo/a"}</span>
        <time dateTime={comment.createdAtIso}>{comment.createdAtLabel}</time>
      </div>
      {comment.replyingToOwner ? (
        <p className="mt-2 text-xs font-semibold text-indigo-200/80">Esta respuesta es para ti.</p>
      ) : null}
      <article
        className="prose prose-invert mt-4 max-w-none text-base prose-headings:font-heading prose-headings:text-white prose-strong:text-white"
        dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
      />
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/70">
        <ReactionToggles commentId={comment.id} initialState={comment.reactions} />
        <button
          type="button"
          onClick={() => {
            setShowReply(prev => !prev);
            setShowEdit(false);
          }}
          className="rounded-full bg-indigo-500/20 px-3 py-1 font-medium text-indigo-100 transition hover:bg-indigo-500/30"
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
            className="rounded-full bg-indigo-500/20 px-3 py-1 font-medium text-indigo-100 transition hover:bg-indigo-500/30"
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
      {showReply ? <ReplyForm slug={slug} parentId={comment.id} onClose={() => setShowReply(false)} /> : null}
      {showEdit ? (
        <EditCommentForm
          slug={slug}
          commentId={comment.id}
          initialContent={comment.contentMd}
          initialAlias={comment.authorAlias ?? ""}
        />
      ) : null}
      {comment.replies.length ? (
        <ol className="mt-6 space-y-6 border-l border-white/10 pl-6">
          {comment.replies.map(child => (
            <CommentItem key={child.id} slug={slug} comment={child} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function ReactionToggles({
  commentId,
  initialState,
}: {
  commentId: string;
  initialState: CommentNode["reactions"];
}) {
  const [optimistic, setOptimistic] = useState<ReactionState>({
    counts: { ...initialState.counts },
    active: new Set(initialState.viewer),
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOptimistic({ counts: { ...initialState.counts }, active: new Set(initialState.viewer) });
  }, [initialState]);

  const handleToggle = (reaction: ReactionId) => {
    setOptimistic(prev => {
      const active = new Set(prev.active);
      const counts = { ...prev.counts };
      const key = reactionKey(reaction);
      const isActive = active.has(reaction);

      if (isActive) {
        active.delete(reaction);
        counts[key] = Math.max(0, counts[key] - 1);
      } else {
        active.add(reaction);
        counts[key] += 1;
      }

      return { counts, active };
    });

    const formData = new FormData();
    formData.append("commentId", commentId);
    formData.append("reaction", reaction);

    startTransition(async () => {
      await reactToComment(undefined, formData);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {reactionOptions.map(option => {
        const isActive = optimistic.active.has(option.id);
        const count = optimistic.counts[reactionKey(option.id)];
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => handleToggle(option.id)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
              isActive
                ? "border-indigo-200/70 bg-indigo-500/30 text-indigo-100 shadow shadow-indigo-500/30"
                : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10"
            } ${isPending ? "pointer-events-none opacity-70" : ""}`}
          >
            <span>{option.emoji}</span>
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReplyForm({ slug, parentId, onClose }: { slug: string; parentId: string; onClose: () => void }) {
  const [state, action] = useFormState(createComment, initialCommentState);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (state?.message) {
      setNonce(prev => prev + 1);
      onClose();
    }
  }, [state?.message, onClose]);

  return (
    <form
      key={nonce}
      action={action}
      className="mt-6 rounded-2xl border border-indigo-300/30 bg-indigo-900/40 p-5 text-sm text-white shadow-inner"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="parentId" value={parentId} />
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
        <div>
          <label htmlFor={`reply-${parentId}`} className="text-xs font-semibold uppercase tracking-widest text-indigo-200/80">
            Respuesta
          </label>
          <textarea
            id={`reply-${parentId}`}
            name="content"
            required
            minLength={4}
            rows={3}
            className="mt-2 w-full rounded-2xl border border-white/30 bg-white/80 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="¿Qué te gustaría decir?"
          />
        </div>
        <div>
          <label
            htmlFor={`reply-alias-${parentId}`}
            className="text-xs font-semibold uppercase tracking-widest text-indigo-200/80"
          >
            Alias (opcional)
          </label>
          <input
            id={`reply-alias-${parentId}`}
            name="alias"
            maxLength={40}
            className="mt-2 w-full rounded-2xl border border-white/30 bg-white/70 px-4 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Anónimo/a"
          />
        </div>
      </div>
      {state?.errors?.length ? (
        <ul className="mt-4 list-disc space-y-1 rounded-2xl border border-red-200/40 bg-red-500/10 p-3 text-xs text-red-100">
          {state.errors.map(error => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {state?.message ? (
        <p className="mt-4 rounded-2xl border border-emerald-200/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {state.message}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-indigo-100/80">
        <SubmitButton label="Responder" pendingLabel="Enviando..." />
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 transition hover:border-white/40 hover:text-white"
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
      setNonce(prev => prev + 1);
    }
  }, [state?.message]);

  return (
    <form
      key={nonce}
      action={action}
      className="mt-6 rounded-2xl border border-indigo-300/40 bg-indigo-900/40 p-5 text-sm text-white shadow-inner"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="commentId" value={commentId} />
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
        <div>
          <label htmlFor={`edit-${commentId}`} className="text-xs font-semibold uppercase tracking-widest text-indigo-200/80">
            Editar mensaje
          </label>
          <textarea
            id={`edit-${commentId}`}
            name="content"
            required
            minLength={4}
            defaultValue={initialContent}
            rows={4}
            className="mt-2 w-full rounded-2xl border border-white/30 bg-white/80 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label
            htmlFor={`edit-alias-${commentId}`}
            className="text-xs font-semibold uppercase tracking-widest text-indigo-200/80"
          >
            Alias (opcional)
          </label>
          <input
            id={`edit-alias-${commentId}`}
            name="alias"
            maxLength={40}
            defaultValue={initialAlias}
            className="mt-2 w-full rounded-2xl border border-white/30 bg-white/70 px-4 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>
      {state?.errors?.length ? (
        <ul className="mt-4 list-disc space-y-1 rounded-2xl border border-red-200/40 bg-red-500/10 p-3 text-xs text-red-100">
          {state.errors.map(error => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {state?.message ? (
        <p className="mt-4 rounded-2xl border border-emerald-200/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {state.message}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-indigo-100/80">
        <SubmitButton label="Guardar cambios" pendingLabel="Actualizando..." />
      </div>
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-red-300/40 bg-red-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-100 transition hover:border-red-300 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-60"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function SortSelector({ value, onChange }: { value: SortMode; onChange: (value: SortMode) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/70">
      <label htmlFor="sort" className="uppercase tracking-[0.3em]">
        Ordenar
      </label>
      <select
        id="sort"
        value={value}
        onChange={event => onChange(event.target.value as SortMode)}
        className="rounded-full bg-transparent text-xs uppercase tracking-widest focus:outline-none"
      >
        <option value="recent">Más recientes</option>
        <option value="top">Más apoyadas</option>
      </select>
    </div>
  );
}

function sortCommentTree(comments: CommentNode[], mode: SortMode): CommentNode[] {
  const clone = comments.map(cloneNode);
  const comparator = mode === "recent" ? sortByRecent : sortBySupport;
  clone.sort(comparator);
  clone.forEach(comment => {
    comment.replies = sortCommentTree(comment.replies, mode);
  });
  return clone;
}

function cloneNode(comment: CommentNode): CommentNode {
  return {
    ...comment,
    reactions: {
      counts: { ...comment.reactions.counts },
      viewer: [...comment.reactions.viewer],
    },
    replies: comment.replies.map(cloneNode),
  };
}

function sortByRecent(a: CommentNode, b: CommentNode) {
  return new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime();
}

function sortBySupport(a: CommentNode, b: CommentNode) {
  if (b.totalReactionScore !== a.totalReactionScore) {
    return b.totalReactionScore - a.totalReactionScore;
  }
  return sortByRecent(a, b);
}

function flattenComments(comments: CommentNode[]): CommentNode[] {
  const queue: CommentNode[] = [];
  const traverse = (nodes: CommentNode[]) => {
    nodes.forEach(node => {
      queue.push(node);
      if (node.replies.length) {
        traverse(node.replies);
      }
    });
  };
  traverse(comments);
  return queue;
}

function reactionKey(reaction: ReactionId): keyof ReactionCountRecord {
  switch (reaction) {
    case "thumbsUp":
      return "reactionThumbsUp";
    case "heart":
      return "reactionHeart";
    case "hope":
      return "reactionHope";
    case "clap":
      return "reactionClap";
  }
}
