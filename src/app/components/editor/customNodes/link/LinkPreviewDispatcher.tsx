import type { FC } from 'react';
import type { EmbedConfig } from '@lexical/react/LexicalAutoEmbedPlugin';
import { AutoEmbedOption, LexicalAutoEmbedPlugin } from '@lexical/react/LexicalAutoEmbedPlugin';
import { LinkPreviewConfig } from './LinkPreviewConfig';
import { createPortal } from 'react-dom';
import PreviewMenu from './PreviewMenu';


const LinkPreviewDispatcher: FC = () => {
    const getMenuOptions = (
        activeEmbedConfig: EmbedConfig,
        embedFn: () => void,
        dismissFn: () => void,
    ) => {
        return [
            new AutoEmbedOption('プレビューを表示する', {
                onSelect: embedFn,
            }),
            new AutoEmbedOption('閉じる', {
                onSelect: dismissFn,
            })
        ];
    };
    return (
        <LexicalAutoEmbedPlugin<EmbedConfig>
	    // コマンドをdispatchするために必要（後述）
            embedConfigs={[LinkPreviewConfig]}
	    // embedConfigsは複数指定することができ、その場合各embedConfigのparseUrlで、
	    // 最後にnullではない戻り値を返したconfigの`insertNode`がよばれる挙動になっている
            onOpenEmbedModalForConfig={() => { }} // 今回は使用しないが省略不可能なので、空メソッドを指定
            getMenuOptions={getMenuOptions}
	    // ポップアップメニューを表示するメソッド
            menuRenderFn={(anchorElementRef,
                { selectedIndex, options, selectOptionAndCleanUp, setHighlightedIndex }) => anchorElementRef.current && createPortal(
                    (<div style={{ marginTop: anchorElementRef.current.clientHeight }}>
                        <PreviewMenu
                            selectedIndex={selectedIndex}
                            options={options}
                            selectOptionAndCleanUp={selectOptionAndCleanUp}
                            setHighlightedIndex={setHighlightedIndex}
                        />
                    </div>), anchorElementRef.current
                )}
        />
    );
};

export default LinkPreviewDispatcher;