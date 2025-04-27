import type { ElementFormatType, LexicalNode, NodeKey, Spread } from "lexical";
import { $applyNodeReplacement } from 'lexical';

import { DecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';

import LinkPreview from './LinkPreview';

import type { SerializedDecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';

type LinkPreviewAttributes = {
    url: string,
    type: 'link-preview',
}

type SerializedLinkPreviewNode = Spread<LinkPreviewAttributes, SerializedDecoratorBlockNode>

export class LinkPreviewNode extends DecoratorBlockNode {
    __url: string;
    static getType(): string {
        return 'link-preview';
    }

    constructor(url: string, format?: ElementFormatType, key?: NodeKey) {
        super(format, key);
        this.__url = url;
    }

    static clone(node: LinkPreviewNode): LinkPreviewNode {
        return new LinkPreviewNode(node.__url, node.__format, node.__key);
    }

    getUrl(): string {
        return this.__url;
    }

    createDOM(): HTMLElement {
        return document.createElement('div');
    }

    updateDOM(): false {
        return false;
    }

    decorate(): React.JSX.Element {
        return <LinkPreview url={this.__url} nodeKey={this.__key} />;
    }

    exportJSON(): SerializedLinkPreviewNode {
        return {
            ...super.exportJSON(),
            url: this.__url,
            type: 'link-preview',
            version: 1
        };
    }

    isInline(): false {
        return false;
    }

    static importJSON(serializedLinkPreviewNode: SerializedLinkPreviewNode): LinkPreviewNode {
        const key = (serializedLinkPreviewNode as any).key ?? undefined;
        const node = new LinkPreviewNode(
            serializedLinkPreviewNode.url,
            serializedLinkPreviewNode.format,
            key
        );
        return node;
    }

}

export function $createLinkPreviewNode(url: string, format?: ElementFormatType, key?: NodeKey): LinkPreviewNode {
    return $applyNodeReplacement(new LinkPreviewNode(url, format, key));
}

export function $isLinkPreviewNode(node?: LexicalNode): node is LinkPreviewNode {
    return node instanceof LinkPreviewNode;
}
