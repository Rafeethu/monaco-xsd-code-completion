import CodeSuggestionCache from './CodeSuggestionCache'
import DocumentNode from './models/DocumentNode'
import XSDParser from './XSDParser'
// @ts-ignore
import TurndownService from 'turndown'
import { IMarkdownString, languages } from 'monaco-editor-core'
import CompletionItem = languages.CompletionItem

export default class CodeSuggester {
    private codeSuggestionCache: CodeSuggestionCache
    private turndownService: TurndownService

    constructor(xsd: XSDParser) {
        this.codeSuggestionCache = new CodeSuggestionCache(xsd)
        this.turndownService = new TurndownService()
    }

    public elements = (
        parentElement: string,
        withoutTag: boolean = false,
        incomplete: boolean = false,
    ): CompletionItem[] =>
        this.parseElements(this.codeSuggestionCache.elements(parentElement), withoutTag, incomplete)

    private parseElements = (
        elements: DocumentNode[],
        withoutTag: boolean,
        incomplete: boolean,
    ): CompletionItem[] =>
        elements.map(
            (element: DocumentNode, index: number): CompletionItem => ({
                label: element.name,
                kind: withoutTag
                    ? languages.CompletionItemKind.Snippet
                    : languages.CompletionItemKind.Method,
                detail: this.getElementDetail(withoutTag),
                /**
                 * A human-readable string that represents a doc-comment.
                 */
                // TODO: documentation:
                sortText: index.toString(),
                insertText: this.parseElementInputText(element.name, withoutTag, incomplete),
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            }),
        )

    private parseElementInputText = (name: string, withoutTag: boolean, incomplete: boolean) => {
        if (withoutTag) return '<' + name + '${1}>\n\t${2}\n</' + name + '>'
        if (incomplete) return name

        return name + '${1}></' + name
    }

    private getElementDetail = (withoutTag: boolean): string =>
        withoutTag ? `Insert as snippet` : ''

    public attributes = (element: string): CompletionItem[] =>
        this.parseAttributes(this.codeSuggestionCache.attributes(element))

    private parseAttributes = (attributes: DocumentNode[]): CompletionItem[] =>
        attributes.map(
            (attribute: DocumentNode): CompletionItem => ({
                label: attribute.name,
                kind: languages.CompletionItemKind.Variable,
                detail: attribute.getType(),
                insertText: this.parseAttributeInputText(attribute.name),
                preselect: attribute.isRequired(),
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: this.parseAttributeDocumentation(attribute.documentation),
            }),
        )

    private parseAttributeDocumentation = (documentation: string | undefined): IMarkdownString => ({
        value: documentation ? this.turndownService.turndown(documentation) : '',
        isTrusted: true,
    })

    private parseAttributeInputText = (name: string): string => name + '="${1}"'
}