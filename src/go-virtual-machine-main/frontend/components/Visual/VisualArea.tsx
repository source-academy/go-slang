import 'reactflow/dist/style.css'
import './nodes.css'

import { useEffect, useMemo, useState } from 'react'
import ReactFlow, { Background, Controls, Edge } from 'reactflow'
import { LockIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue,
} from '@chakra-ui/react'

import { ContextInfo } from '../../../virtual-machine/executor/debugger'
import { useExecutionStore } from '../../stores'

import { addEnvs, EnvNode, Nodes } from './EnvNode'

// import { useExecutionStore } from '../../stores'

export const VisualArea = () => {
  const { cur_data } = useExecutionStore((state) => ({
    cur_data: state.cur_data,
  }))
  const nodeTypes = useMemo(
    () => ({
      EnvNode: EnvNode,
    }),
    [],
  )
  const genVisual = (info: ContextInfo) => {
    const instrNodes = () => {
      return info.instrs.map((instr, idx) => {
        const bgColor = instr.cur ? '#Caf7cb' : 'white'
        return {
          id: 'instr ' + instr.idx.toString(),
          data: { label: instr.idx.toString() + ': ' + instr.val },
          position: { x: 12.5, y: 30 * (idx + 1) },
          parentId: 'instr',
          style: {
            width: 200,
            height: 30,
            padding: '5px',
            backgroundColor: bgColor,
          },
        }
      })
    }

    const osNodes = () => {
      const valNodes = info.OS.map((os, idx) => {
        return {
          id: 'os ' + os.addr.toString(),
          data: { label: os.val },
          position: { x: 12.5, y: 30 * (idx + 1) },
          parentId: 'OS',
          style: {
            width: 200,
            height: 30,
            padding: '5px',
            borderColor: os.modified ? 'red' : 'black',
            color: os.modified ? 'red' : 'black',
            fontWeight: os.modified ? 'bold' : 'normal',
          },
        }
      })
      return [
        {
          id: 'OS',
          data: { label: 'Operand Stack' },
          position: { x: 10, y: 275 },
          className: 'light',
          style: {
            backgroundColor: '#Cadbf7',
            width: 225,
            height: 40 + info.OS.length * 30,
            padding: '5px',
          },
        },
        ...valNodes,
      ]
    }

    const envNodes: Nodes = []
    const envEdges: Edge[] = []
    if (info.envs.children.length) {
      addEnvs(info.envs.children[0], 10, 250, envNodes, envEdges)
    }

    const nodes: Nodes = [
      {
        id: 'instr',
        data: { label: 'Instructions' },
        position: { x: 10, y: 10 },
        className: 'light',
        style: {
          backgroundColor: '#Cadbf7',
          width: 225,
          height: 250,
          padding: '5px',
        },
      },
      ...(cur_data.length ? instrNodes() : []),
      ...(cur_data.length ? osNodes() : []),
      ...envNodes,
    ]
    const edges = [...envEdges]
    return { nodes, edges }
  }
  const visualBgColor = useColorModeValue('white', 'gray.800')
  const [tabIndex, setTabIndex] = useState(0)
  useEffect(() => {
    if (tabIndex >= cur_data.length) setTabIndex(0)
  }, [tabIndex, cur_data])
  return (
    <>
      <Flex direction="column" w="full">
        <Box
          flexGrow={1}
          position="relative"
          overflow="hidden"
          id="visual-area-container"
          bgColor={visualBgColor}
        >
          <Tabs
            index={tabIndex}
            onChange={(index) => setTabIndex(index)}
            h="100%"
          >
            <TabList>
              {cur_data.map((ctx, idx) => {
                return (
                  <Tab key={idx}>
                    {ctx.blocked && <LockIcon />} Thread {ctx.id}
                  </Tab>
                )
              })}
            </TabList>
            <TabPanels h="100%">
              {cur_data.map((ctx, idx) => {
                const { nodes, edges } = genVisual(ctx)
                return (
                  <TabPanel h="100%" key={idx}>
                    <div style={{ height: '100%', width: '100%' }}>
                      <ReactFlow
                        nodeTypes={nodeTypes}
                        nodes={nodes}
                        edges={edges}
                      >
                        <Background />
                        <Controls />
                      </ReactFlow>
                    </div>
                  </TabPanel>
                )
              })}
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>
    </>
  )
}
