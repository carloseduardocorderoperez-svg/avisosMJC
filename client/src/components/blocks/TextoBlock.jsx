import { useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextStyle from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { Extension } from "@tiptap/core"
import { useAvisosStore } from "../../store/avisosStore"

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).run(),
    }
  },
})

const HighlightStyle = Extension.create({
  name: "highlightStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) return {}
              return { style: `background-color: ${attributes.backgroundColor}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setBackgroundColor:
        (color) =>
        ({ chain }) =>
          chain().setMark("textStyle", { backgroundColor: color }).run(),
      unsetBackgroundColor:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { backgroundColor: null }).run(),
    }
  },
})

export default function TextoBlock({ bloque, avisoId, bloqueIndex }) {
  const { avisos, setAvisos } = useAvisosStore()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      HighlightStyle,
      FontSize,
      Placeholder.configure({ placeholder: "Escribe tu aviso..." }),
    ],
    content: bloque.contenido || "<p></p>",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const indexAviso = avisos.findIndex((a) => String(a.id) === String(avisoId))
      if (indexAviso === -1) return
      const nuevosAvisos = [...avisos]
      nuevosAvisos[indexAviso].bloques[bloqueIndex].contenido = html
      setAvisos(nuevosAvisos)
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (bloque.contenido && bloque.contenido !== current) {
      editor.commands.setContent(bloque.contenido)
    }
  }, [bloque.contenido, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="block-body">
      <h4>Texto</h4>

      <div className="rich-text-toolbar">
        <button
          type="button"
          className={editor.isActive("bold") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={editor.isActive("italic") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={editor.isActive("strike") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </button>
        <button
          type="button"
          className={editor.isActive("underline") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </button>
        <button
          type="button"
          className={editor.isActive("bulletList") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • Lista
        </button>
        <button
          type="button"
          className={editor.isActive("orderedList") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. Lista
        </button>
        <button
          type="button"
          className={editor.isActive({ textAlign: "left" }) ? "active" : ""}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          Izq
        </button>
        <button
          type="button"
          className={editor.isActive({ textAlign: "center" }) ? "active" : ""}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          Cen
        </button>
        <button
          type="button"
          className={editor.isActive({ textAlign: "right" }) ? "active" : ""}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          Der
        </button>
        <select
          className="rich-text-select"
          value={editor.getAttributes("textStyle").fontSize || "16px"}
          onChange={(event) => editor.chain().focus().setFontSize(event.target.value).run()}
        >
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
          <option value="28px">28</option>
        </select>
        <input
          type="color"
          className="rich-text-color"
          title="Color de texto"
          value={editor.getAttributes("textStyle").color || "#000000"}
          onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
        />
        <input
          type="color"
          className="rich-text-color"
          title="Fondo de texto"
          value={editor.getAttributes("textStyle").backgroundColor || "#ffffff"}
          onChange={(event) =>
            editor
              .chain()
              .focus()
              .setBackgroundColor(event.target.value)
              .run()
          }
        />
        <button
          type="button"
          className={editor.getAttributes("textStyle").backgroundColor ? "active" : ""}
          onClick={() => editor.chain().focus().unsetBackgroundColor().run()}
        >
          Quitar fondo
        </button>
      </div>

      <div className="rich-text-editor">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
