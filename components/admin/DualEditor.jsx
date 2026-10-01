"use client";

/**
 * Dual-mode content editor:
 *  - WYSIWYG mode: TipTap v3 (@tiptap/react, React 19) — useEditor is called at the
 *    TOP LEVEL of the component render (Rules of Hooks; a dynamic-imported hook call
 *    inside an effect throws React #321 "invalid hook call").
 *  - HTML mode: CodeMirror 6 (basicSetup + @codemirror/lang-html), a REAL code editor.
 * Both editors stay MOUNTED at all times; the inactive one is hidden with CSS, so
 * switching modes never re-initializes anything and content survives toggling.
 * The current HTML lives in a hidden input named `name` for the server-action form.
 * Reused for recipes (content) and pages (html).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { basicSetup, EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html as cmHtml } from "@codemirror/lang-html";
import ImageGalleryModal from "./ImageGalleryModal";

const HTML_MODE = "html";
const WYSIWYG_MODE = "wysiwyg";

export default function DualEditor({ name, initialHtml = "", rows = 18 }) {
  const [mode, setMode] = useState(WYSIWYG_MODE);
  const [html, setHtml] = useState(initialHtml);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // TipTap: hook at top level — no dynamic imports, no conditional calls.
  const editor = useEditor({
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

  // CodeMirror: built once on mount, kept alive inside its (hidden) container.
  const cmParentRef = useRef(null);
  const cmViewRef = useRef(null);
  const [cmReady, setCmReady] = useState(false);
  useEffect(() => {
    if (!cmParentRef.current || cmViewRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: initialHtml,
        extensions: [
          basicSetup,
          cmHtml(),
          EditorView.lineWrapping,
          EditorView.updateListener.of((tr) => {
            if (tr.docChanged) setHtml(tr.state.doc.toString());
          }),
        ],
      }),
      parent: cmParentRef.current,
    });
    cmViewRef.current = view;
    setCmReady(true);
    return () => {
      view.destroy();
      cmViewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (next) => {
    if (next === mode) return;
    if (next === HTML_MODE) {
      // WYSIWYG -> HTML: replace the CodeMirror doc with TipTap's HTML
      const doc = editor ? editor.getHTML() : html;
      setHtml(doc);
      const view = cmViewRef.current;
      if (view) {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } });
        view.requestMeasure();
      }
      setMode(HTML_MODE);
    } else {
      // HTML -> WYSIWYG: push the CM doc into TipTap
      if (editor) editor.commands.setContent(html || "");
      setMode(WYSIWYG_MODE);
    }
  };

  const insertImage = useCallback(
    (src) => {
      const alt = src.split("/").pop() || "";
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
    [mode, editor]
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
        <span className="text-xs text-gray-400">
          {mode === WYSIWYG_MODE
            ? editor
              ? "עורך ויזואלי מוכן ✓"
              : "טוען עורך ויזואלי..."
            : cmReady
              ? "עורך קוד מוכן ✓"
              : "טוען עורך קוד..."}
        </span>
      </div>

      {/* Both editors stay mounted; the inactive one is hidden */}
      <div className={mode === HTML_MODE ? "space-y-2" : "hidden"}>
        <div
          ref={cmParentRef}
          dir="ltr"
          className="rounded-lg border border-amber-200 overflow-hidden text-sm"
          style={{ minHeight: `${rows}rem` }}
        />
      </div>
      <div className={mode === WYSIWYG_MODE ? "" : "hidden"}>
        <div
          dir="rtl"
          className="rounded-lg border border-amber-200 bg-white p-2 focus-within:ring-2 focus-within:ring-[#c0562f]/40"
          style={{ minHeight: `${rows}rem` }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <ImageGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={insertImage}
      />
    </div>
  );
}
