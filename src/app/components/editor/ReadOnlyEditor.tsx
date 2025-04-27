"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { nodes } from "./nodes";
import { theme } from "@/app/components/editor/css/theme";
import styles from "./css/editor.module.css";

import LinkPreviewDispatcher from "./customNodes/link/LinkPreviewDispatcher";
import LinkPreviewRegister from "./customNodes//link/LinkPreviewRegister";

interface ReadOnlyEditorProps {
  editorState: string;
}

export default function ReadOnlyEditor({ editorState }: ReadOnlyEditorProps) {
  const initialConfig = {
    namespace: "ReadOnlyEditor",
    onError: (error: Error) => {
      console.error(error);
    },
    nodes: [...nodes],
    theme: theme,
    editorState: editorState,
    editable: false,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={styles.readOnlyContainer}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={styles.contentEditable}
              readOnly={true}
              spellCheck={false}
            />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <LinkPreviewDispatcher />
        <LinkPreviewRegister />
      </div>
    </LexicalComposer>
  );
}
