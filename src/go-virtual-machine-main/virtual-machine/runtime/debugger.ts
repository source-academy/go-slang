import { TokenLocation } from '../compiler/tokens'
import { Instruction } from '../executor/instructions'
import { Heap } from '../heap'
import { ContextNode } from '../heap/types/context'
import { EnvironmentNode } from '../heap/types/environment'

export type OSInfo = {
  val: string
  addr: number
  modified: boolean
}

export type VarInfo = {
  name: string
  val: string
  modified: boolean
}

export type EnvironmentInfo = {
  name: string
  addr: number
  vars: VarInfo[]
  alloc_time: number
  children: EnvironmentInfo[]
  cur: boolean
}

export type InstructionInfo = {
  val: string
  idx: number
  cur: boolean
}

export type ContextInfo = {
  blocked: boolean
  id: number
  addr: number
  OS: OSInfo[]
  instrs: InstructionInfo[]
  envs: EnvironmentInfo
}

export type StateInfo = {
  contexts: ContextInfo[]
  output: string
  location: TokenLocation | null
}

export class Debugger {
  // Maps addr of variables to identifier
  identifier_map = new Map<number, string>()
  // Maps addr of environments to identifer
  env_name_map = new Map<number, string>()
  // Maps addr of environment to allocation time
  env_alloc_map = new Map<number, number>()
  // Maps context to thread id (starting from 0)
  context_id_map = new Map<number, number>()
  context_id = 1
  data: StateInfo[] = []
  modified_buffer = new Set<number>()
  constructor(
    public heap: Heap,
    public instructions: Instruction[],
    public symbols: (TokenLocation | null)[],
  ) {}

  /**
   * Finds all environments that can be reached from a given addr
   * @param addr Current Address
   * @param vis Set of visited addresses
   * @param envs Output set of environments
   * @returns
   */
  get_all_env(addr: number, vis: Set<number>, envs: Set<number>) {
    if (addr === -1) return
    vis.add(addr)
    const val = this.heap.get_value(addr)
    if (val instanceof EnvironmentNode) envs.add(addr)
    const children = val.get_children()
    for (const child of children) {
      if (!vis.has(child)) this.get_all_env(child, vis, envs)
    }
  }

  /**
   * Traverse through environments constructing a tree-like object structure
   * @param env Current Env
   * @param adj Adjacency List of env addr => children env addrs
   * @param cur Context active environment addr
   * @returns
   */
  dfs_env(
    env: number,
    adj: Map<number, number[]>,
    cur: number,
  ): EnvironmentInfo {
    // Sort the env by allocation time and get their envInfo
    const child_envs = (adj.get(env) || [])
      .map((child) => {
        return [this.env_alloc_map.get(child) || -1, child]
      })
      .sort((a, b) => a[0] - b[0])
      .map((x) => x[1])
      .map((child) => this.dfs_env(child, adj, cur))
    const env_node = new EnvironmentNode(this.heap, env)
    const var_info = env_node
      .get_frame()
      .get_children()
      .map((val) => {
        return {
          name: this.identifier_map.get(val),
          val: this.heap.get_value(val).toString(),
          modified: this.modified_buffer.has(val),
        } as VarInfo
      })
    return {
      addr: env,
      name: this.env_name_map.get(env),
      vars: var_info,
      alloc_time: this.env_alloc_map.get(env),
      children: child_envs,
      cur: env === cur,
    } as EnvironmentInfo
  }

  generate_state(pc: number, output: string) {
    const contexts = [
      ...this.heap.contexts.list().get_children(),
      ...this.heap.blocked_contexts.get_items(),
    ].map((x) => new ContextNode(this.heap, x))
    const state: ContextInfo[] = []
    const prevContexts = new Set()
    let first = true
    for (const context of contexts) {
      if (prevContexts.has(context.addr)) continue
      prevContexts.add(context.addr)
      /**
       * Generate OS Info
       */
      const OS = context
        .OS()
        .list()
        .get_children()
        .map((x) => {
          const var_name = this.identifier_map.get(x)
          return {
            val:
              (var_name ? var_name + ': ' : '') +
              this.heap.get_value(x).toString(),
            addr: x,
          } as OSInfo
        })

      /**
       * Check if the OS values are newly added
       * - Iterate through previous os stack values check if addr differ
       */
      if (this.data.length) {
        const prev = this.data[this.data.length - 1].contexts
        let prev_state = undefined
        for (const ctx of prev) {
          if (ctx.addr === context.addr) prev_state = ctx
        }
        if (prev_state) {
          let same = true
          for (let i = 0; i < OS.length; i++) {
            if (i >= prev_state.OS.length) same = false
            else if (prev_state.OS[i].addr !== OS[i].addr) same = false
            if (!same) OS[i].modified = true
          }
        } else for (const os of OS) os.modified = true
      } else {
        for (const os of OS) os.modified = true
      }
      /**
       * Generate Instruction Info
       */
      const instrs = []
      const context_pc = first ? pc : context.PC()
      first = false
      let lo = 0,
        hi = this.instructions.length - 1
      if (context_pc < 3) {
        lo = 0
        hi = 6
      } else if (context_pc + 3 >= this.instructions.length) {
        lo = this.instructions.length - 7
        hi = this.instructions.length - 1
      } else {
        lo = context_pc - 3
        hi = context_pc + 3
      }
      for (let i = lo; i <= hi; i++) {
        instrs.push({
          val: this.instructions[i].toString(),
          idx: i,
          cur: i === context_pc,
        })
      }
      /**
       * Generate Env Info from a traversal
       * - Get environments reachable from context
       * - Generate adjacancy list
       * - Construct tree-like object tree
       */
      const envs = new Set<number>()
      const vis = new Set<number>()
      this.get_all_env(context.addr, vis, envs)
      const adj = new Map<number, number[]>()
      for (const env of envs) adj.set(env, [])
      let global_env = 0
      for (const env of envs) {
        const envNode = new EnvironmentNode(this.heap, env)
        const par = envNode.get_parent(0)
        if (par) adj.get(par.addr)?.push(envNode.addr)
        else global_env = env
      }

      const env_info = this.dfs_env(global_env, adj, context.E().addr)
      state.push({
        OS,
        id: this.context_id_map.get(context.addr) || -1,
        addr: context.addr,
        blocked: context.is_blocked(),
        instrs,
        envs: env_info,
      })
    }
    this.data.push({
      contexts: state,
      output,
      location: this.symbols[pc],
    })
    this.modified_buffer.clear()
  }
}
