import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { Bold, Italic, List, Type, Quote } from 'lucide-react';
import { cn } from '../utils/cn';
import { marked } from 'marked';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  onFocus?: (editor: any) => void;
}

export interface RichTextEditorRef {
  editor: any;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder,
  className,
  readOnly,
  onFocus
}, ref) => {
  const [isInitializing, setIsInitializing] = React.useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...',
        emptyEditorClass: 'is-editor-empty',
      }),
      Markdown,
    ],
    content: value ? marked.parse(value, { breaks: true, gfm: true }) as string : '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const markdown = (editor.storage as any).markdown.getMarkdown();
      onChange(markdown);
    },
    onFocus: ({ editor }) => {
      if (onFocus) onFocus(editor);
    },
    editorProps: {
      attributes: {
        class: cn('prose prose-invert prose-p:my-0 prose-headings:my-1 prose-ul:my-0 max-w-none focus:outline-none min-h-[60px]', className),
      },
    },
  });

  useEffect(() => {
    if (editor) {
      const currentMarkdown = (editor.storage as any).markdown.getMarkdown();
      const normCurrent = currentMarkdown.trim().replace(/\r\n/g, '\n');
      const normValue = (value || '').trim().replace(/\r\n/g, '\n');
      if (normCurrent !== normValue) {
        editor.commands.setContent(value ? marked.parse(value, { breaks: true, gfm: true }) as string : '', { emitUpdate: false });
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  useImperativeHandle(ref, () => ({
    editor
  }));

  if (!editor) {
    return null;
  }

  return (
    <EditorContent editor={editor} className={cn("w-full", className)} />
  );
});

RichTextEditor.displayName = 'RichTextEditor';
