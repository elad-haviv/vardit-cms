"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ImageGalleryModal from "./ImageGalleryModal";

const HTML_MODE = "html";
const WYSIWYG_MODE = "wysiwyg";

/**
 * Dual-mode content editor:
 *  - HTML mode: CodeMirror 6 (basicSetup + @codemirror/lang-html), a REAL code editor.
 *  - WYSIWYG mode: TipTap (StarterKit + Link + Image), RTL-aware.
 * Modes toggle with buttons and sync content both ways. The current HTML is kept in
 * a hidden input named `name` so the surrounding server-action form still submits it.
 * Reused for recipes (content) and pages (html).
 *
 * props: name, initialHtml, rows (approx editor height)
 */
export default function DualEditor({ name, initialHtml = "", rows = 18 }) {
  const [mode, setMode] = useState(WYSIWYG_MODE);
  const [html, setHtml] = useState(initialHtml);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  // TipTap editor (WYSIWYG)
  const tiptapRef = useRef(null);
  const [TiptapKit, setTiptapKit] = useState(null);

  // CodeMirror view (HTML)
  const cmParentRef = useRef(null);
  const cmViewRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const React = await import("@tiptap/react");
        const PM = await import("@tiptap/pm/state");
        const SK = await import("@tiptap/starter-kit");
        const L = await import("@tiptap/extension-link");
        const I = await import("@tiptap/extension-image");
        if (cancelled) return;
        const StarterKit = SK.default || SK.StarterKit;
        const Link = L.Link || L.default;
        const Image = I.Image || I.default;
        const editor = React.useEditor({
          extensions: [
            StarterKit,
            Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
            Image.configure({ inline: false, allowBase64: false }),
          ],
          content: initialHtml,
          immediatelyRender: false,
          editorProps: {
            attributes: {
              dir: "rtl",
              class: "prose-recipe tiptap-content min-h-[320px] focus:outline-none px-1",
            },
          },
        });
        tiptapRef.current = editor;
        setTiptapKit({ React, PM, editor });
        setEditorReady(true);
      } catch (e) {
        console.error("TipTap init failed", e);
      }
    })();
    return () => {
      cancelled = true;
      try { tiptapRef.current?.destroy?.(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build/tear down the CodeMirror view when in HTML mode.
  useEffect(() => {
    if (mode !== HTML_MODE) return;
    let view = null;
    let cancelled = false;
    (async () => {
      try {
        const CM = await import("codemirror");
        const LH = await import("@codemirror/lang-html");
        const View = await import("@codemirror/view");
        const State = await import("@codemirror/state");
        if (cancelled || !cmParentRef.current) return;
        view = new View.EditorView({
          state: State.EditorState.create({
            doc: html,
            extensions: [CM.basicSetup, LH.html(), View.EditorView.lineWrapping],
          }),
          parent: cmParentRef.current,
          dispatch: (tr) => {
            view.update([tr]);
            setHtml(tr.state.doc.toString());
          },
        });
        cmViewRef.current = view;
      } catch (e) {
        console.error("CodeMirror init failed", e);
      }
    })();
    return () => {
      cancelled = true;
      try { view?.destroy?.(); } catch { /* noop */ }
      cmViewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const switchMode = (next) => {
    if (next === mode) return;
    if (next === HTML_MODE) {
      // WYSIWYG -> HTML: pull TipTap's HTML as the doc
      const editor = tiptapRef.current;
      if (editor) setHtml(editor.getHTML());
      setMode(HTML_MODE);
    } else {
      // HTML -> WYSIWYG: push the CodeMirror/hidden HTML into TipTap
      const editor = tiptapRef.current;
      if (editor) editor.commands.setContent(html || "");
      setMode(WYSIWYG_MODE);
    }
  };

  const insertImage = useCallback(
    (src) => {
      const alt = src.split("/").pop() || "";
      const editor = tiptapRef.current;
      if (mode === WYSIWYG_MODE && editor) {
        editor.chain().focus().setImage({ src, alt }).run();
      } else {
        const tag = `<img src="${src}" alt="${alt}" />`;
        const view = cmViewRef.current;
        if (view) {
          view.focus();
          view.dispatch({
            changes: { from: view.state.selection.main.from, insert: tag },
            selection: { anchor: view.state.selection.main.from + tag.length },
          });
        } else {
          setHtml((h) => (h ? `${h}\n${tag}` : tag));
        }
      }
      setGalleryOpen(false);
    },
    [mode]
  );

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={html} />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-full border border-amber-200 overflow-hidden text-sm font-bold">
          <button
            type="button"
            onClick={() => switchMode(WYSIWYG_MODE)}
            className={`px-4 py-1.5 transition ${mode === WYSIWYG_MODE ? "bg-[#c0562f] text-white" : "bg-white text-[#4a3728] hover:bg-amber-50"}`}
          >
            עורך ויזואלי (WYSIWYG)
          </button>
          <button
            type="button"
            onClick={() => switchMode(HTML_MODE)}
            className={`px-4 py-1.5 transition ${mode === HTML_MODE ? "bg-[#c0562f] text-white" : "bg-white text-[#4a3728] hover:bg-amber-50"}`}
          >
            עורך HTML (קוד)
          </button>
        </div>
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className="text-sm font-bold text-[#c0562f] bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 hover:bg-amber-100 transition"
        >
          🖼️ הוספת תמונה מהגלריה
        </button>
        {!editorReady && <span className="text-xs text-gray-400">טוען עורך ויזואלי...</span>}
      </div>

      {mode === HTML_MODE ? (
        <div
          ref={cmParentRef}
          dir="ltr"
          className="rounded-lg border border-amber-200 overflow-hidden text-sm"
          style={{ minHeight: `${rows}rem` }}
        />
      ) : (
        <div
          dir="rtl"
          className="rounded-lg border border-amber-200 bg-white p-2 focus-within:ring-2 focus-within:ring-[#c0562f]/40"
          style={{ minHeight: `${rows}rem` }}
        >
          {TiptapKit ? (
            <TiptapKit.React.EditorContent editor={TiptapKit.editor} />
          ) : (
            <p className="text-sm text-gray-400 p-4">טוען עורך ויזואלי...</p>
          )}
        </div>
      )}

      <ImageGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={insertImage}
      />
    </div>
  );
}
