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
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { basicSetup, EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html as cmHtml } from "@codemirror/lang-html";
import ImageGalleryModal from "./ImageGalleryModal";

const HTML_MODE = "html";
const WYSIWYG_MODE = "wysiwyg";

/** Small toolbar button; active = this formatting applies at the cursor right now. */
function TBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`px-2 py-1 rounded-md text-sm leading-none transition ${
        active ? "bg-[#c0562f] text-white" : "text-[#4a3728] hover:bg-amber-100"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="w-px h-5 bg-amber-200 mx-0.5" aria-hidden="true" />;

export default function DualEditor({ name, initialHtml = "", rows = 18 }) {
  const [mode, setMode] = useState(WYSIWYG_MODE);
  const [html, setHtml] = useState(initialHtml);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // TipTap: hook at top level — no dynamic imports, no conditional calls.
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }), // both configured separately below
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Underline,
      Youtube.configure({
        controls: true,
        nocache: true,
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: "youtube-embed",
          style: "max-width:100%; aspect-ratio:16/9; height:auto; border-radius:12px;",
        },
      }),
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

  const insertYoutube = useCallback(() => {
    const url = window.prompt("הדביקו כתובת של סרטון יוטיוב (למשל: https://www.youtube.com/watch?v=...):");
    if (!url) return;
    if (mode === WYSIWYG_MODE && editor) {
      try {
        editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
      } catch {
        window.alert("הכתובת לא זוהתה כסרטון יוטיוב תקין");
      }
    } else {
      // HTML mode: raw iframe
      const id = (url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{6,})/) || [])[1] || "";
      if (!id) {
        window.alert("הכתובת לא זוהתה כסרטון יוטיוב תקין");
        return;
      }
      const iframe = `<iframe src="https://www.youtube.com/embed/${id}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
      const view = cmViewRef.current;
      if (view) {
        view.focus();
        view.dispatch({ changes: { from: view.state.selection.main.from, insert: iframe } });
      } else {
        setHtml((h) => (h ? `${h}\n${iframe}` : iframe));
      }
    }
  }, [mode, editor]);

  const setOrRemoveLink = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes("link").href || "";
    const url = window.prompt("כתובת הקישור (שדה ריק = הסרת הקישור):", existing);
    if (url === null) return; // cancelled
    const chain = editor.chain().focus();
    if (!url.trim()) {
      chain.extendMarkRange("link").unsetLink().run();
    } else {
      chain.extendMarkRange("link").setLink({ href: url.trim() }).run();
    }
  }, [editor]);

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

      {/* WYSIWYG toolbar */}
      {mode === WYSIWYG_MODE && editor ? (
        <div
          dir="rtl"
          className="flex items-center gap-0.5 flex-wrap bg-white border border-amber-200 rounded-xl px-2 py-1.5 shadow-sm sticky top-2 z-10"
        >
          <TBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="מודגש (Ctrl+B)"><b>ח</b></TBtn>
          <TBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="נטוי (Ctrl+I)"><i>ח</i></TBtn>
          <TBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="קו תחתון (Ctrl+U)"><u>ח</u></TBtn>
          <TBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="קו חוצה"><s>ח</s></TBtn>
          <Sep />
          <TBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="כותרת 2">H2</TBtn>
          <TBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="כותרת 3">H3</TBtn>
          <TBtn active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} title="פסקה רגילה">¶</TBtn>
          <Sep />
          <TBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="רשימת תבליטים">• רשימה</TBtn>
          <TBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="רשימה ממוספרת">1. רשימה</TBtn>
          <TBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="ציטוט">❝ ציטוט</TBtn>
          <Sep />
          <TBtn active={editor.isActive("link")} onClick={setOrRemoveLink} title="קישור">🔗 קישור</TBtn>
          <TBtn onClick={() => setGalleryOpen(true)} title="הוספת תמונה מהגלריה">🖼️ תמונה</TBtn>
          <TBtn onClick={insertYoutube} title="שילוב סרטון יוטיוב">▶ יוטיוב</TBtn>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="ניקוי כל העיצובים">⌫ נקה עיצוב</TBtn>
          <TBtn onClick={() => editor.chain().focus().undo().run()} title="בטל (Ctrl+Z)">↩</TBtn>
          <TBtn onClick={() => editor.chain().focus().redo().run()} title="בצע שוב (Ctrl+Y)">↪</TBtn>
        </div>
      ) : null}

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
