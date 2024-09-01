import { Box } from '@chakra-ui/react'

import { useExecutionStore } from '../../stores'

import { TextIDE } from './TextIDE'

export const IO = () => {
  const { output } = useExecutionStore((state) => ({
    output: state.output,
  }))
  return (
    <>
      <Box h="20%" borderTop="1px" borderColor="gray.300">
        <TextIDE
          placeholder="Output will appear here"
          text={output || ''}
          editable={false}
        />
      </Box>
    </>
  )
}
