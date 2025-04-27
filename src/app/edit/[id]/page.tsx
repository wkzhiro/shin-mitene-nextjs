import dynamic from "next/dynamic";

// Editor コンポーネントをクライアント専用として動的に読み込む
const Editor = dynamic(() => import("@/app/components/editor/editor"), { ssr: false });

export default async function EditPage({ params }: { params: { id: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let title = "";
  let summary = "";
  let editorState =
    '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';
  let selectedCategories: number[] = [];
  let selectedTags: number[] = [];

  let categories: { id: number; name: string }[] = [];
  let tags: { id: number; name: string }[] = [];

  if (params.id !== "new") {
    // 既存投稿の編集時のみデータを取得
    const postUrl = new URL(`/api/getPost?id=${params.id}`, baseUrl);
    const postRes = await fetch(postUrl.toString(), { next: { revalidate: 0 } });

    if (postRes.ok) {
      const postData = await postRes.json();
      console.log("postData:", postData);
      title = postData.title || "";
      summary = postData.intro || "";
      editorState = postData.content || editorState;
      selectedCategories = postData.categories?.map((cat: { category_id: { id: number } }) => cat.category_id?.id) || [];
      selectedTags = postData.tags?.map((tag: { tag_id: { id: number } }) => tag.tag_id?.id) || [];
    } else {
      console.warn("投稿情報が取得できませんでした。空の値を利用します。");
    }
  }

  // カテゴリーの取得
  const categoriesUrl = new URL("/api/getCategories", baseUrl);
  const categoriesRes = await fetch(categoriesUrl.toString(), { cache: "no-store" });
  if (categoriesRes.ok) {
    const categoriesData = await categoriesRes.json();
    categories = categoriesData || [];
  } else {
    console.warn("カテゴリー情報が取得できませんでした。");
  }

  // タグの取得
  const tagsUrl = new URL("/api/getTags", baseUrl);
  const tagsRes = await fetch(tagsUrl.toString());
  if (tagsRes.ok) {
    const tagsData = await tagsRes.json();
    tags = tagsData || [];
  } else {
    console.warn("タグ情報が取得できませんでした。");
  }

  return (
    <Editor
      initialId={params.id === "new" ? undefined : parseInt(params.id)} // 新規投稿の場合は undefined
      initialTitle={title}
      initialSummary={summary}
      initialEditorState={editorState}
      categories={categories}
      tags={tags}
      selectedCategories={selectedCategories}
      selectedTags={selectedTags}
    />
  );
}
