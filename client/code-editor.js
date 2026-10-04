/**
 * Кодын засварлагч (CodeMirror 6): <textarea data-code-editor> → мөрийн дугаар, өнгө, автомат догол.
 *   data-language="python|cpp"           — тогтмол хэл
 *   data-language-select="#language"     — хэлийг <select>-ээс (cpp17 / py38 / py3)
 *   data-draft-key="<problemId>"          — хэл бүрээр ноорог хадгална (localStorage), хоосон бол загвар код
 * Эх файл: client/code-editor.js → `npm run build:client` → public/js/code-editor.js
 */
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

const TEMPLATES = {
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    \n    return 0;\n}\n',
  python: '# Оролтыг уншиж, хариуг хэвлэнэ\n\n',
};

const modeOf = (value) => (/^cpp|c\+\+/i.test(value || '') ? 'cpp' : 'python');
const langExt = (mode) => (mode === 'cpp' ? cpp() : python());

function storage() {
  try {
    const s = window.localStorage;
    s.setItem('__t', '1');
    s.removeItem('__t');
    return s;
  } catch {
    return null;
  }
}

function enhance(textarea) {
  const select = textarea.dataset.languageSelect && document.querySelector(textarea.dataset.languageSelect);
  const draftKey = textarea.dataset.draftKey;
  const store = draftKey ? storage() : null;
  const keyFor = (lang) => `yesuvd:code:${draftKey}:${lang}`;
  const currentLang = () => (select ? select.value : textarea.dataset.language || 'python');

  let initial = textarea.value;
  if (draftKey && !initial) initial = (store && store.getItem(keyFor(currentLang()))) || TEMPLATES[modeOf(currentLang())];

  const language = new Compartment();
  let saveTimer = null;
  const view = new EditorView({
    parent: textarea.parentNode,
    state: EditorState.create({
      doc: initial,
      extensions: [
        basicSetup,
        // basicSetup-ийн Mod-Enter (хоосон мөр) -ээс өмнө ажиллана
        Prec.high(keymap.of([
          indentWithTab,
          {
            key: 'Mod-Enter',
            run: () => {
              const form = textarea.form;
              if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
              return true;
            },
          },
        ])),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        language.of(langExt(modeOf(currentLang()))),
        oneDark,
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return;
          textarea.value = u.state.doc.toString();
          if (store) {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => store.setItem(keyFor(currentLang()), textarea.value), 400);
          }
        }),
        EditorView.contentAttributes.of({ 'aria-label': 'Код', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
      ],
    }),
  });
  textarea.parentNode.insertBefore(view.dom, textarea);
  textarea.hidden = true;
  textarea.value = initial;
  view.dom.classList.add('cm-code');
  const rows = Number(textarea.getAttribute('rows')) || 16;
  view.dom.style.minHeight = rows * 1.45 + 'em';

  const setDoc = (text) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });

  if (select) {
    let lastLang = currentLang();
    select.addEventListener('change', () => {
      const next = currentLang();
      view.dispatch({ effects: language.reconfigure(langExt(modeOf(next))) });
      if (draftKey) {
        // Хэл бүр өөрийн ноорогтой: одоогийнхыг хадгалаад шинэ хэлнийхийг ачаална
        if (store) store.setItem(keyFor(lastLang), view.state.doc.toString());
        const cur = view.state.doc.toString();
        const isTemplate = !cur.trim() || cur === TEMPLATES[modeOf(lastLang)];
        const saved = store && store.getItem(keyFor(next));
        if (saved != null && saved.trim()) setDoc(saved);
        else if (isTemplate || modeOf(next) !== modeOf(lastLang)) setDoc(TEMPLATES[modeOf(next)]);
      }
      lastLang = next;
    });
  }

  const api = {
    get: () => view.state.doc.toString(),
    set: (text) => setDoc(text),
    focus: () => view.focus(),
    view,
  };
  window.CodeEditors = window.CodeEditors || {};
  if (textarea.id) window.CodeEditors[textarea.id] = api;
  return api;
}

document.querySelectorAll('textarea[data-code-editor]').forEach(enhance);
