import { Transformer, HEADING } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $getRoot, $createTextNode } from "lexical";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from "@lexical/markdown";

export const TRANSFORMERS: Array<Transformer> = [HEADING];

export const MarkdownPlugin = () => {
  const [editor] = useLexicalComposerContext();

  const handleMarkdownToggle = () => {
    // エディタの状態を変更するために、editor.update()を使用する
    editor.update(() => {
      // rootノードを取得
      const root = $getRoot();
      // rootの最初の子ノードを取得
      const firstChild = root.getFirstChild();
      // 最初の子ノードが CodeNode で、その言語が markdown の場合
      if ($isCodeNode(firstChild) && firstChild.getLanguage() === "markdown") {
        // マークダウン文字列からエディタ状態へ変換する
        $convertFromMarkdownString(firstChild.getTextContent(), TRANSFORMERS);
      } else {
        // そうでない場合は、エディタの状態からマークダウン文字列へと変換
        const markdown = $convertToMarkdownString(TRANSFORMERS);
        // rootノードをクリアし、新しい CodeNode を追加する
        root
          .clear()
          .append(
            $createCodeNode("markdown").append($createTextNode(markdown))
          );
      }
      // ルートノードの最後にカーソルを移動する
      root.selectEnd();
    });
  };

  return (
    <div>
      <button
        className="absolute right-2 bottom-2 w-12 h-12 bg-gray-400 text-lg text-white font-semibold rounded-full hover:bg-gray-500"
        type="button"
        role="checkbox"
        onClick={handleMarkdownToggle}
      >
        M
      </button>
    </div>
  );
};