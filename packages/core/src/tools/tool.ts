import type { z } from 'zod'

export interface Tool<TParams = unknown, TOutput = unknown> {
  readonly name: string
  readonly description: string
  readonly parameters?: z.ZodSchema<TParams>
  call: (params: TParams) => Promise<TOutput>
}
