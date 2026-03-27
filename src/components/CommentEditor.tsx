import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

interface Props {
  onSubmit: (html: string) => void;
}

export function CommentEditor({ onSubmit }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline hover:text-primary-dark' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded my-1' },
      }),
      Placeholder.configure({
        placeholder: 'Write a comment...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'outline-none text-xs text-slate-600 dark:text-slate-300 leading-relaxed min-h-[40px] max-h-[120px] overflow-y-auto px-2.5 py-2',
      },
    },
  });

  if (!editor) return null;

  const handleSubmit = () => {
    const html = editor.getHTML();
    const text = editor.getText().trim();
    if (!text) return;
    onSubmit(html);
    editor.commands.clearContent();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toolBtn = (active: boolean) =>
    `p-1 rounded transition ${active ? 'bg-primary/15 text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`;

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 dark:border-slate-700 flex-wrap">
        {/* Bold */}
        <button onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold" className={toolBtn(editor.isActive('bold'))}>
          <span className="text-[11px] font-bold leading-none w-4 h-4 flex items-center justify-center">B</span>
        </button>

        {/* Italic */}
        <button onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic" className={toolBtn(editor.isActive('italic'))}>
          <span className="text-[11px] font-bold italic leading-none w-4 h-4 flex items-center justify-center">I</span>
        </button>

        {/* Underline */}
        <button onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline" className={toolBtn(editor.isActive('underline'))}>
          <span className="text-[11px] font-bold underline leading-none w-4 h-4 flex items-center justify-center">U</span>
        </button>

        {/* Strikethrough */}
        <button onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough" className={toolBtn(editor.isActive('strike'))}>
          <span className="text-[11px] font-bold line-through leading-none w-4 h-4 flex items-center justify-center">S</span>
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />

        {/* Bullet List */}
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List" className={toolBtn(editor.isActive('bulletList'))}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        {/* Blockquote */}
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote" className={toolBtn(editor.isActive('blockquote'))}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />

        {/* Link */}
        <button onClick={addLink}
          title="Add Link" className={toolBtn(editor.isActive('link'))}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        </button>

        {/* Code */}
        <button onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline Code" className={toolBtn(editor.isActive('code'))}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
        </button>

        {/* Image */}
        <button onClick={addImage}
          title="Add Image" className={toolBtn(false)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </button>

        {/* Send button on far right */}
        <button onClick={handleSubmit}
          title="Send (⌘+Enter)"
          className="ml-auto text-xs bg-primary text-white px-2.5 py-1 rounded-lg hover:bg-primary-dark transition font-medium shrink-0">
          Send
        </button>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
