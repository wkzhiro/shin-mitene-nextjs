"use client";

import { createEditor } from "lexical";
import { $generateHtmlFromNodes } from "@lexical/html";
import { nodes } from "@/app/components/editor/nodes";

// ここでは DOM に依存する部分もあって必ずクライアントで実行される
interface ClientGeneratedHtmlProps {
  jsonState: string;
}

export default function ClientGeneratedHtml({ jsonState }: ClientGeneratedHtmlProps) {
  // サーバーではなくクライアントで実行されるので、window や Element も問題なく利用可
  const editor = createEditor({
    nodes: nodes,
    onError: (error) => {
      console.error(error);
    },
  });
  const editorState = editor.parseEditorState(jsonState);
  const html = editorState.read(() => $generateHtmlFromNodes(editor));

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
