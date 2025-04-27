import { FC, useState, useEffect, useCallback } from "react";
import { TbH1, TbH2, TbH3 } from "react-icons/tb";
import {
  MdFormatQuote,
  MdFormatListNumbered,
  MdFormatListBulleted,
  MdChecklist,
  MdCode,
  MdExpandMore,
  MdLink,
} from "react-icons/md";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HeadingTagType, $createHeadingNode } from "@lexical/rich-text";
import { $isHeadingNode, $createQuoteNode } from "@lexical/rich-text"
import { $getSelection, $isRangeSelection, KEY_TAB_COMMAND } from "lexical";
import { $setBlocksType } from "@lexical/selection";
import {INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND} from "@lexical/list"
import { $isListNode, ListNode } from "@lexical/list";
import { $getNearestNodeOfType } from "@lexical/utils";
import { $createCodeNode, CODE_LANGUAGE_FRIENDLY_NAME_MAP, $isCodeNode } from "@lexical/code"
import { CODE_LANGUAGE_COMMAND } from "./codeHighlightPlugin";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import styles from "../css/toolbarPlugin.module.css";
// Popover, FocusTrap, validateUrl
import { Popover, FocusTrap } from "@headlessui/react";
import { validateUrl } from "@/app/util/url";


//tabでネストしたい


const SupportedBlockType = {
    paragraph: "Paragraph",
    h1: "Heading 1",
    h2: "Heading 2",
    h3: "Heading 3",
    h4: "Heading 4",
    h5: "Heading 5",
    h6: "Heading 6",
    quote: "Quote",
    number: "Numbered List",
    bullet: "Bulleted List",
    check: "Check List",
    code: "Code Block",
} as const;

type BlockType = keyof typeof SupportedBlockType;

export const ToolbarPlugin: FC = () => {
    const [blockType, setBlockType] = useState<BlockType>("paragraph");
    const [editor] = useLexicalComposerContext();
    const [codeLanguage, setCodeLanguage] = useState("");
    // --- リンクURL入力用 state 追加 ---
    const [linkUrl, setLinkUrl] = useState("");

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
        // editorStateからエディタの状態の読み取りを行う
            editorState.read(() => {
                    // 現在の選択範囲を取得
                    const selection = $getSelection();
                    // 選択範囲が RangeSelection 出なければ何もしない
                    if (!$isRangeSelection(selection)) return;

                    // 選択範囲のアンカーノードを取得
                    const anchorNode = selection.anchor.getNode();
                    // アンカーノードが root ならそのノードを、そうでなければ最上位の要素を取得
                    const targetNode =
                    anchorNode.getKey() === "root"
                        ? anchorNode
                        : anchorNode.getTopLevelElementOrThrow();
                    // 対象のノードが HeadingNode なら、そのタグを利用してblockTypeを設定
                    if ($isHeadingNode(targetNode)) {
                    const tag = targetNode.getTag();
                    setBlockType(tag);
                } else if ($isListNode(targetNode)) {
                    const parentList = $getNearestNodeOfType(anchorNode, ListNode);
                    const listType = parentList ? parentList.getListType() : targetNode.getListType();
            
                    setBlockType(listType);
                }else if ($isCodeNode(targetNode)) {
                    setCodeLanguage(targetNode.getLanguage() || "");
                } else {
                    // そうでない場合は、ノードのタイプを利用してblockTypeを設定
                    const nodeType = targetNode.getType();
                    if (nodeType in SupportedBlockType) {
                        setBlockType(nodeType as BlockType);
                    } else {
                        // それ以外ならデフォルトとして paragraph を設定
                        setBlockType("paragraph");
                    }}
                });
            });
        }, [editor]);

    const formatHeading = (headingSize: HeadingTagType) => {
        if (blockType !== headingSize) {
        // エディタの状態を変更するために、editor.update()を使用する
        editor.update(() => {
            // editorから選択範囲を取得
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
            // 選択範囲をheadingSizeに変更する
            $setBlocksType(selection, () => $createHeadingNode(headingSize));
            }
        });
        }
    };

    const formatQuote = useCallback(() => {
        if (blockType !== "quote") {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            });
            }
        }, [blockType, editor]);

    const formatBulletList = useCallback(() => {
        if (blockType !== "bullet") {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            }
        }, [blockType, editor]);
        
        const formatNumberedList = useCallback(() => {
            if (blockType !== "number") {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            }
        }, [blockType, editor]);
        
        const formatCheckList = useCallback(() => {
            if (blockType !== "check") {
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
            }
        }, [blockType, editor]);


    const formatCode = useCallback(() => {
        if (blockType !== "code") {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createCodeNode());
                }
            }); 
        }
        }, [blockType, editor]);
        
    const CodeLanguagesOptions = Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP).map(
        ([value, label]) => ({ value, label })
        );

    return (
        <div className={styles.toolbar}>
            {/* Heading 1 Button */}
            <button
                type="button"
                title={SupportedBlockType.h1}
                aria-label={SupportedBlockType.h1}
                aria-checked={blockType === "h1"}
                className={`flex items-center justify-center p-2 rounded-lg ${
                blockType === "h1" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                } hover:bg-blue-600 hover:text-white`}
                onClick={() => formatHeading("h1")}
            >
                <TbH1 className="text-2xl" />
            </button>

            {/* Heading 2 Button */}
            <button
                type="button"
                title={SupportedBlockType.h2}
                aria-label={SupportedBlockType.h2}
                aria-checked={blockType === "h2"}
                className={`flex items-center justify-center p-2 rounded-lg ${
                blockType === "h2" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                } hover:bg-blue-600 hover:text-white`}
                onClick={() => formatHeading("h2")}
            >
                <TbH2 className="text-2xl" />
            </button>

            {/* Heading 3 Button */}
            <button
                type="button"
                title={SupportedBlockType.h3}
                aria-label={SupportedBlockType.h3}
                aria-checked={blockType === "h3"}
                className={`flex items-center justify-center p-2 rounded-lg ${
                blockType === "h3" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                } hover:bg-blue-600 hover:text-white`}
                onClick={() => formatHeading("h3")}
            >
                <TbH3 className="text-2xl" />
            </button>
            <button
                type="button"
                role="checkbox"
                title={SupportedBlockType["quote"]}
                aria-label={SupportedBlockType["quote"]}
                aria-checked={blockType === "quote"}
                onClick={formatQuote}
            >
            <MdFormatQuote />

            </button>
            <button
                type="button"
                role="checkbox"
                title={SupportedBlockType["bullet"]}
                aria-label={SupportedBlockType["bullet"]}
                aria-checked={blockType === "bullet"}
                onClick={formatBulletList}
                >
                <MdFormatListBulleted />
                </button>
                <button
                type="button"
                role="checkbox"
                title={SupportedBlockType["number"]}
                aria-label={SupportedBlockType["number"]}
                aria-checked={blockType === "number"}
                onClick={formatNumberedList}
                >
                <MdFormatListNumbered />
                </button>
                <button
                type="button"
                role="checkbox"
                title={SupportedBlockType["check"]}
                aria-label={SupportedBlockType["check"]}
                aria-checked={blockType === "check"}
                onClick={formatCheckList}
            >
                <MdChecklist />
            </button>

            
            {/* --- リンクボタン追加 --- */}
            <Popover className="relative">
                <Popover.Button
                    type="button"
                    className="flex items-center justify-center p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-600 hover:text-white"
                    title="リンク"
                    aria-label="リンク"
                >
                    <MdLink className="text-2xl" />
                </Popover.Button>
                <Popover.Panel className="absolute z-10 mt-2 left-0 bg-white border border-gray-200 rounded shadow-lg p-4 w-72">
                    {({ close }) => (
                        <FocusTrap>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="toolbar-link-url" className="text-xs">URL (https://)</label>
                                <input
                                    id="toolbar-link-url"
                                    type="text"
                                    className="border rounded p-1"
                                    placeholder="https://example.com"
                                    value={linkUrl}
                                    onChange={e => setLinkUrl(e.target.value)}
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button
                                        type="button"
                                        className="px-3 py-1 rounded bg-gray-200 text-gray-700"
                                        onClick={() => {
                                            setLinkUrl("");
                                            close();
                                        }}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1 rounded bg-blue-600 text-white"
                                        onClick={() => {
                                            if (validateUrl(linkUrl)) {
                                                editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
                                            } else {
                                                alert("有効なURLを入力してください");
                                            }
                                            setLinkUrl("");
                                            close();
                                        }}
                                    >
                                        挿入
                                    </button>
                                </div>
                            </div>
                        </FocusTrap>
                    )}
                </Popover.Panel>
            </Popover>

            <button
                    type="button"
                    role="checkbox"
                    title={SupportedBlockType["code"]}
                    aria-label={SupportedBlockType["code"]}
                    aria-checked={blockType === "code"}
                    onClick={formatCode}>
                    <MdCode />
                </button>

            <div className={styles.select}>
                <select
                    aria-label="code languages"
                    value={codeLanguage}
                    onChange={(event) => {
                        const lang = event.target.value;
                        setCodeLanguage(lang); // 状態を更新して UI に反映させる
                        editor.dispatchCommand(CODE_LANGUAGE_COMMAND, lang); // コマンドを発行してエディタ側で処理させる
                    }}>
                    <option value="">select...</option>
                    {CodeLanguagesOptions.map(item => (
                    <option key={item.value} value={item.value}>
                        {item.label}
                    </option>
                    ))}
                </select>
            </div>
        </div>
    );
};
