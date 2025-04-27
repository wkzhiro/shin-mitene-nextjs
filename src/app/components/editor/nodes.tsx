import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { Klass, LexicalNode } from "lexical";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { LinkPreviewNode } from "./customNodes/link/LinkPreviewNode";

export const nodes: Array<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListItemNode,
  ListNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
  LinkPreviewNode,
];
