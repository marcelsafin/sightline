import type { ToolExecutionOptions } from './types'

interface WebMcpAnnotations {
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
}

interface WebMcpTool {
  name: string
  title?: string
  description: string
  inputSchema?: Record<string, unknown>
  execute: (
    input: Record<string, unknown>,
    options: ToolExecutionOptions,
  ) => Promise<unknown> | unknown
  annotations?: WebMcpAnnotations
}

interface WebMcpRegisterOptions {
  signal?: AbortSignal
  exposedTo?: string[]
}

interface ModelContext {
  registerTool(
    tool: WebMcpTool,
    options?: WebMcpRegisterOptions,
  ): Promise<void>
}

declare global {
  interface Document {
    readonly modelContext?: ModelContext
  }

  interface Window {
    __SIGHTLINE__?: {
      engine: import('./engine').SightlineEngine
    }
  }
}

export {}
