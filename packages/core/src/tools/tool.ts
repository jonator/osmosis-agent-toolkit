export interface Tool<TParams, TOutput = unknown> {
  readonly method: string
  readonly name: string
  readonly description: string
  readonly parameters?: TParams
  call: (params: TParams) => Promise<TOutput>
}
