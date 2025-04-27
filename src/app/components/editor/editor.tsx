"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { jwtDecode } from "jwt-decode";
import { supabase } from "@/app/lib/supabase";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "./plugins/autoFocusPlugin";
import { OnChangePlugin } from "@/app/components/editor/plugins/onChangePlugin";
import { ToolbarPlugin } from "@/app/components/editor/plugins/toolBarPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CodeHighlightPlugin } from "./plugins/codeHighlightPlugin";
import { LinkPlugin as LexicalLinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin'

import { MarkdownPlugin, TRANSFORMERS } from "./plugins/markdownPlugin";
import { nodes } from "./nodes";
import { theme } from "@/app/components/editor/css/theme";
import styles from "./css/editor.module.css";
import { useRouter } from "next/navigation";
import { validateUrl, urlRegex } from "@/app/util/url";
import LexicalAutoLinkPlugin from "@/app/components/editor/plugins/LexicalAutoPlugin";
import LinkPreviewDispatcher from "./customNodes/link/LinkPreviewDispatcher";
import LinkPreviewRegister from "./customNodes//link/LinkPreviewRegister"

import type { Post } from "@/app/types/post";


// props の型定義: サーバーから取得した初期値を受け取る
interface PostProps {
  initialId?: number; // 存在していれば更新用の id として利用
  initialTitle: string;
  initialSummary: string;
  initialEditorState: string;
  categories:{ id: number; name: string }[];
  tags:{ id: number; name: string }[];
  selectedCategories?: number[]; // 初期選択されているカテゴリーIDリスト
  selectedTags?: number[]; // 初期選択されているタグIDリスト
}

export default function Editor({
  initialId,
  initialTitle,
  initialSummary,
  initialEditorState,
  categories,
  tags,
  selectedCategories = [],
  selectedTags = [],
}: PostProps) {
  // 投稿ID (既存記事なら初期値として渡される)
  const { data: session } = useSession();
  let userId: string | null = null;
  if (session?.accessToken) {
    try {
      const decoded: any = jwtDecode(session.accessToken);
      userId = decoded.oid;
    } catch (e) {}
  }
  const [postId, setPostId] = useState<number | null>(initialId ?? null);
  // タイトルと要約は通常のフォーム入力として管理
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  // 本文エディターの状態 (JSON 文字列)
  const [bodyState, setBodyState] = useState(initialEditorState);

  // 追加：選択したカテゴリーとタグを管理する state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(selectedCategories);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(selectedTags);


  const router = useRouter();

  const initialConfig = {
    namespace: "MyEditor",
    onError: (error: Error) => {
      console.error(error);
    },
    nodes: [...nodes],
    theme: theme,
    // 初期状態。必要に応じて初期テキストを設定可能
    editorState: initialEditorState,
  };

  const onChange = (editorState: any) => {
    // エディターの状態を JSON 文字列として保存
    const editorStateJSON = editorState.toJSON();
    const jsonString = JSON.stringify(editorStateJSON);
    setBodyState(jsonString);
    // console.log("本文の状態:", jsonString);
  };

  // カテゴリー選択の change ハンドラー
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) =>
      Number(option.value)
    );
    setSelectedCategoryIds(selected);
  };

  // タグ選択の change ハンドラー
  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) =>
      Number(option.value)
    );
    setSelectedTagIds(selected);
  };

  // 保存ボタン押下時のハンドラー
  const handleSave = async () => {
    const payload = {
      title,
      intro: summary,
      content: bodyState,
      cover_image_url: null,
      user_id: userId,
      categoryIds: selectedCategoryIds,
      tagIds: selectedTagIds,
    };

    try {
      if (postId !== null && postId !== undefined) {
        // 既存投稿の更新
        const res = await fetch("/api/posts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: postId }),
        });
        if (!res.ok) {
          const err = await res.json();
          console.error("投稿の更新に失敗しました:", err.error);
          return;
        }
        const json = await res.json();
        router.push(`/post/${postId}`);
      } else {
        // 新規投稿の場合
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          console.error("新規投稿の保存に失敗しました:", err.error);
          return;
        }
        const json = await res.json();
        const newPostId = json.post.id;
        setPostId(newPostId);
        router.push(`/post/${newPostId}`);
      }
    } catch (err) {
      console.error("予期しないエラーが発生しました:", err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-auto p-4">
      {/* タイトル入力 */}
      <div className="mb-4">
        <label htmlFor="title" className="block font-bold mb-1">
          タイトル
        </label>
        <input
          id="title"
          type="text"
          placeholder="タイトルを入力してください"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {/* 要約入力 */}
      <div className="mb-4">
        <label htmlFor="summary" className="block font-bold mb-1">
          要約
        </label>
        <textarea
          id="summary"
          placeholder="要約を入力してください"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full border p-2 rounded"
          rows={3}
        />
      </div>

      {/* カテゴリー選択 (複数可) */}
      <div className="mb-4">
        <label htmlFor="categories" className="block font-bold mb-1">
          カテゴリー選択
        </label>
        <select
          id="categories"
          multiple
          value={selectedCategoryIds.map(String)}
          onChange={handleCategoryChange}
          className="w-full border p-2 rounded"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* タグ選択 (複数可) */}
      <div className="mb-4">
        <label htmlFor="tags" className="block font-bold mb-1">
          タグ選択
        </label>
        <select
          id="tags"
          multiple
          value={selectedTagIds.map(String)}
          onChange={handleTagChange}
          className="w-full border p-2 rounded"
        >
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>

      {/* 本文エディター */}
      <LexicalComposer initialConfig={initialConfig}>
        <label htmlFor="content" className="block font-bold mb-1">
          本文
        </label>
        <ToolbarPlugin />
        <div className={styles.editorContainer}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable className={styles.contentEditable} />
            }
            placeholder={
              <div className={styles.placeholder}>
                本文を入力してください…
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <AutoFocusPlugin />
        <OnChangePlugin onChange={onChange} />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <CodeHighlightPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <LexicalLinkPlugin validateUrl={validateUrl} /> {/* LexicalCommand経由でリンクノードを生成するために必要 */}
        <ClickableLinkPlugin />
        <LexicalAutoLinkPlugin />
        <LinkPreviewDispatcher />
        <LinkPreviewRegister />
        {/* <MarkdownPlugin /> */}
      </LexicalComposer>

      {/* 保存ボタン */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          保存する
        </button>
      </div>

      {/* 入力内容の確認用表示
      <div className="mt-16 p-4 border rounded">
        <h3 className="font-bold mb-2">入力内容の確認</h3>
        <p>
          <strong>ID:</strong> {postId}
        </p>
        <p>
          <strong>タイトル:</strong> {title}
        </p>
        <p>
          <strong>要約:</strong> {summary}
        </p>
        <p>
          <strong>カテゴリー:</strong>{" "}
          {selectedCategories.length > 0
            ? selectedCategories.join(", ")
            : "未選択"}
        </p>
        <p>
          <strong>タグ:</strong>{" "}
          {selectedTags.length > 0 ? selectedTags.join(", ") : "未選択"}
        </p>
        <p>
          <strong>本文:</strong>
          <pre className="text-sm overflow-auto">
            {typeof bodyState === "object"
              ? JSON.stringify(bodyState, null, 2)
              : bodyState}
          </pre>
        </p>
      </div> */}
    </div>
  );
}
