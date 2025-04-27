import { NodeKey } from 'lexical';
import { BlockWithAlignableContents } from '@lexical/react/LexicalBlockWithAlignableContents';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey } from 'lexical';
import type { FC } from 'react';

type Props = {
    url: string,
    nodeKey: NodeKey;
};

const LinkPreview: FC<Props> = ({ url, nodeKey }) => {
    const [editor] = useLexicalComposerContext();

    const handleDelete = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) {
                node.remove();
            }
        });
    };

    return (
        <BlockWithAlignableContents
            format={''}
            nodeKey={nodeKey}
            className={{
                base: 'relative',
                focus: 'relative outline outline-indigo-300'
            }}>
            <button
                type="button"
                onClick={handleDelete}
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 10,
                    background: 'rgba(255,255,255,0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: 18,
                    lineHeight: 1,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}
                aria-label="リンクプレビュー削除"
                title="リンクプレビュー削除"
            >
                ×
            </button>
            <iframe
                className='hatenablogcard'
                style={{
                    width: '100%',
                    height: '155px',
                    maxWidth: '680px'
                }}
                src={`https://hatenablog-parts.com/embed?url=${url}`}
                width="300" height="150"
            />
        </BlockWithAlignableContents>
    );
};

export default LinkPreview;
