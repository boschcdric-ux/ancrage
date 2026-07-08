import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

const EXTENSIONS = [
  StarterKit,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TaskList,
  TaskItem.configure({
    nested: true,
    HTMLAttributes: { class: 'journal-task-item' }
  })
];

function runCommand(editor, command) {
  const chain = editor.chain().focus();

  if (command === 'bold') chain.toggleBold().run();
  if (command === 'italic') chain.toggleItalic().run();
  if (command === 'underline') chain.toggleUnderline().run();
  if (command === 'strike') chain.toggleStrike().run();
  if (command === 'heading1') chain.toggleHeading({ level: 1 }).run();
  if (command === 'heading2') chain.toggleHeading({ level: 2 }).run();
  if (command === 'heading3') chain.toggleHeading({ level: 3 }).run();
  if (command === 'highlight') chain.toggleHighlight({ color: '#fef08a' }).run();
  if (command === 'color-purple') chain.setColor('var(--accent)').run();
  if (command === 'color-red') chain.setColor('var(--danger)').run();
  if (command === 'color-green') chain.setColor('var(--success)').run();
  if (command === 'color-orange') chain.setColor('var(--warning)').run();
  if (command === 'color-reset') chain.unsetColor().run();
  if (command === 'bulletList') chain.toggleBulletList().run();
  if (command === 'orderedList') chain.toggleOrderedList().run();
  if (command === 'taskList') chain.toggleTaskList().run();
  if (command === 'blockquote') chain.toggleBlockquote().run();
  if (command === 'horizontalRule') chain.setHorizontalRule().run();
}

function isCommandActive(editor, command) {
  switch (command) {
    case 'bold':
      return editor.isActive('bold');
    case 'italic':
      return editor.isActive('italic');
    case 'underline':
      return editor.isActive('underline');
    case 'strike':
      return editor.isActive('strike');
    case 'heading1':
      return editor.isActive('heading', { level: 1 });
    case 'heading2':
      return editor.isActive('heading', { level: 2 });
    case 'heading3':
      return editor.isActive('heading', { level: 3 });
    case 'highlight':
      return editor.isActive('highlight');
    case 'color-purple':
      return editor.isActive('textStyle', { color: 'var(--accent)' });
    case 'color-red':
      return editor.isActive('textStyle', { color: 'var(--danger)' });
    case 'color-green':
      return editor.isActive('textStyle', { color: 'var(--success)' });
    case 'color-orange':
      return editor.isActive('textStyle', { color: 'var(--warning)' });
    case 'bulletList':
      return editor.isActive('bulletList');
    case 'orderedList':
      return editor.isActive('orderedList');
    case 'taskList':
      return editor.isActive('taskList');
    case 'blockquote':
      return editor.isActive('blockquote');
    default:
      return false;
  }
}

/**
 * Encapsule le cycle de vie Tiptap. mount() détruit toujours l'instance
 * précédente avant d'en recréer une : c'est le pattern attendu (l'éditeur
 * est détruit proprement avant chaque re-render, recréé après). Ne pas
 * tenter de garder l'éditeur vivant à travers un innerHTML.
 */
function createJournalEditor() {
  let editor = null;

  return {
    get instance() {
      return editor;
    },
    isMounted() {
      return Boolean(editor);
    },
    mount(mountNode, content, { onUpdate, onSelectionUpdate } = {}) {
      this.destroy();
      editor = new Editor({
        element: mountNode,
        extensions: EXTENSIONS,
        content: content || '<p></p>',
        onUpdate,
        onSelectionUpdate
      });
      return editor;
    },
    destroy() {
      if (editor) {
        editor.destroy();
        editor = null;
      }
    },
    getHTML() {
      return editor ? editor.getHTML() : '';
    },
    exec(command) {
      if (!editor) return;
      runCommand(editor, command);
    },
    refreshToolbar(container) {
      if (!container || !editor) return;
      const buttons = container.querySelectorAll('[data-journal-command]');
      for (const button of buttons) {
        if (!(button instanceof HTMLButtonElement)) continue;
        const command = button.dataset.journalCommand;
        if (!command) continue;
        button.classList.toggle('is-active', isCommandActive(editor, command));
      }
    }
  };
}

export { createJournalEditor };
