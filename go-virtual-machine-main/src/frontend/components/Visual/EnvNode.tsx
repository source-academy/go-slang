import { Edge, Handle, MarkerType, Node, NodeProps, Position } from 'reactflow'
import { Box } from '@chakra-ui/react'

import { EnvironmentInfo } from '../../../virtual-machine/executor/debugger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Nodes = Node<any, string | undefined>[]

export const EnvNode = (props: NodeProps<EnvironmentInfo>) => {
  const { cur, vars, name } = props.data
  return (
    <>
      <Box
        bg="white"
        borderRadius="7px"
        fontSize="12px"
        color="black"
        border={cur ? '2px solid red' : '1px solid'}
        borderBottom={cur ? '3px solid red' : '1px solid'}
        height="100%"
        width="100%"
      >
        <Handle type="target" position={Position.Top} />
        <Box bg="#Cadbf7" p="7px" borderRadius="7px 7px 0px 0px">
          <b>{name}</b>
        </Box>
        <Box p="0px 7px">
          {vars.map((x, idx) => (
            <Box key={idx} p={1} color={x.modified ? 'red' : 'black'}>
              {x.name} = {x.val}
            </Box>
          ))}
        </Box>
        <Handle type="source" position={Position.Bottom} />
      </Box>
    </>
  )
}

export const addEnvs = (
  env: EnvironmentInfo,
  topOffset: number,
  leftOffset: number,
  nodes: Nodes,
  edges: Edge[],
) => {
  nodes.push({
    id: 'env ' + env.addr.toString(),
    data: {
      ...env,
    },
    position: { x: leftOffset, y: topOffset },
    type: 'EnvNode',
    style: {
      width: 200,
      height: 40 + env.vars.length * 26,
    },
  })
  topOffset += 40 + env.vars.length * 30 + 20
  let sibling = false
  for (const child of env.children) {
    edges.push({
      id: env.addr.toString() + '->' + child.addr.toString(),
      source: 'env ' + env.addr.toString(),
      target: 'env ' + child.addr.toString(),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 30,
        height: 20,
      },
    })
    if (sibling) leftOffset = nodes[nodes.length - 1].position.x + 220
    addEnvs(child, topOffset, leftOffset, nodes, edges)
    sibling = true
  }
}
