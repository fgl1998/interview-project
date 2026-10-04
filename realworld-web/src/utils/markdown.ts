import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })
export function renderMarkdown(body: string) {
  return markdown.render(body || '')
}
