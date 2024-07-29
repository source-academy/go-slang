import { AiFillCaretRight } from 'react-icons/ai'
import { MdEdit } from 'react-icons/md'
import {
  Box,
  Button,
  Flex,
  Icon,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Spacer,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'

interface CodeIDEButtonProps {
  isDisabled: boolean
  editing: boolean
  toggleMode: () => void
  heapsize: number
  setHeapsize: (x: number) => void
}

export const CodeIDEButtons = (props: CodeIDEButtonProps) => {
  return (
    <>
      <Flex
        background={useColorModeValue('gray.100', 'gray.700')}
        minWidth="max-content"
        alignItems="center"
        h="60px"
      >
        <Box p="10px">Heap Size:</Box>
        <NumberInput
          backgroundColor={useColorModeValue('white', 'gray.800')}
          w="20%"
          step={5}
          value={props.heapsize}
          onChange={(value) => props.setHeapsize(parseInt(value))}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <Spacer />
        <Tooltip label={'Paste the code below and run it!'}>
          <Button
            marginRight="10px"
            size="sm"
            rightIcon={<Icon as={props.editing ? AiFillCaretRight : MdEdit} />}
            colorScheme="blue"
            variant="solid"
            onClick={props.toggleMode}
            isDisabled={props.isDisabled}
          >
            {props.editing ? 'Run' : 'Edit'}
          </Button>
        </Tooltip>
      </Flex>
    </>
  )
}
