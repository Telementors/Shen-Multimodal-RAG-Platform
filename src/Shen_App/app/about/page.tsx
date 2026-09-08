'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Cpu,
  FileText,
  Table2,
  Image as ImageIcon,
  Zap,
  Database,
  Brain,
  Layers,
  GitBranch,
} from 'lucide-react'

const TECH_STACK = [
  { label: 'Frontend', value: 'Next.js 16, React 19, Tailwind, shadcn/ui' },
  { label: 'Backend', value: 'FastAPI, Uvicorn' },
  { label: 'Parsing', value: 'unstructured, pdfplumber, PyMuPDF, Camelot' },
  { label: 'Embeddings', value: 'OpenAI text-embedding-3-small' },
  { label: 'Vector Store', value: 'PostgreSQL + pgvector (HNSW)' },
  { label: 'LLM', value: 'OpenAI GPT-4o / GPT-4o-mini' },
  { label: 'Observability', value: 'Langfuse (optional)' },
  { label: 'Containerization', value: 'Docker / Docker Compose' },
]

const FEATURES = [
  {
    icon: <FileText className="w-5 h-5" />,
    title: 'Text Retrieval',
    description: 'Searches through narrative prose, headings, and paragraphs to find relevant text passages with source citations.',
  },
  {
    icon: <Table2 className="w-5 h-5" />,
    title: 'Table Extraction',
    description: 'Converts table rows into natural-language descriptions, preserving original structure in metadata for precise data retrieval.',
  },
  {
    icon: <ImageIcon className="w-5 h-5" />,
    title: 'Image & Diagram Analysis',
    description: 'Indexes figures, diagrams, and screenshots with LLM-generated captions so visual content is searchable by meaning.',
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: 'Agentic Router',
    description: 'An LLM classifier decides per-query whether the answer lives in text, a table, an image, or a combination — then routes accordingly.',
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: 'Multi-Vector Indices',
    description: 'Three separate HNSW indices (text, table, image) prevent tables and figures from being drowned out by narrative chunks.',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Cited Answers',
    description: 'Every answer includes document ID, page number, and similarity score — full provenance for every claim.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-50 glass-strong border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[var(--border)] shadow-lg shadow-cyan-500/10">
              <Image
                src="/avatar.png"
                alt="Shen"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">About Shen</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-16 flex flex-col md:flex-row items-start gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-xs font-medium text-[#00E5FF] mb-5">
              <Cpu className="w-3.5 h-3.5" />
              Multimodal RAG Platform
            </div>

            <h1 className="text-4xl md:text-5xl font-bold gradient-text leading-tight mb-4">
              Shen, The Great Villain
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              A retrieval-augmented generation platform for technical documentation that indexes and retrieves across{' '}
              <span className="text-foreground font-medium">text</span>,{' '}
              <span className="text-foreground font-medium">tables</span>, and{' '}
              <span className="text-foreground font-medium">images</span> separately, with an agentic router that decides which modality a query needs before searching.
            </p>
          </div>

          {/* Hero image */}
          <div className="w-full md:w-64 lg:w-72 flex-shrink-0">
            <div className="rounded-2xl overflow-hidden border border-[var(--border)] shadow-2xl shadow-black/40 aspect-square">
              <Image
                src="/avatar.png"
                alt="Shen character"
                width={400}
                height={400}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* Why This Exists */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#00E5FF]" />
            Why Shen Exists
          </h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <p className="text-muted-foreground leading-relaxed">
              Technical documents routinely combine prose, tables, and screenshots/diagrams. Text-only RAG pipelines either drop non-text content entirely or convert everything into one undifferentiated index, where tables and figures get drowned out by the much larger volume of narrative text.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Shen keeps <span className="text-foreground font-medium">three separate indices</span> and uses an <span className="text-[#00E5FF] font-medium">LLM router</span> to decide, per query, whether the answer should come from text, a table, an image, or a combination — then composes a single answer citing the source document and page.
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00E5FF]" />
            Core Capabilities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5
                           hover:border-[#00E5FF]/20 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--secondary)] flex items-center justify-center mb-4
                                text-muted-foreground group-hover:text-[#00E5FF] group-hover:bg-[#00E5FF]/10 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-2 group-hover:text-[#00E5FF] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#00E5FF]" />
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF] text-xs font-bold">1</span>
                Indexing
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Uploaded PDFs are parsed page-by-page into typed blocks (heading, text, table, image). Table rows are converted into natural-language descriptions. Each block is embedded with OpenAI&apos;s <code className="text-[#00E5FF] text-xs">text-embedding-3-small</code> and stored in one of three Postgres tables, each indexed with HNSW for cosine similarity search.
              </p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF] text-xs font-bold">2</span>
                Querying
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An LLM router classifies each incoming question into <code className="text-[#00E5FF] text-xs">text</code>, <code className="text-[#00E5FF] text-xs">table</code>, <code className="text-[#00E5FF] text-xs">image</code>, or <code className="text-[#00E5FF] text-xs">hybrid</code>, with a short reasoning string. The retriever searches the relevant table(s), assembles labelled context, and an LLM composes the final answer with citations.
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#00E5FF]" />
            Tech Stack
          </h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Technology</th>
                </tr>
              </thead>
              <tbody>
                {TECH_STACK.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--secondary)]/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{row.label}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-[var(--border)]">
          <p className="text-sm text-muted-foreground">
            Built for documents where the answer often lives in a table or a figure, not just prose.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#00E5FF] to-[#00BCD4]
                       text-[#0a0e1a] font-semibold text-sm
                       hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200
                       active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>
        </footer>
      </main>
    </div>
  )
}
