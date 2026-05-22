import { AiFillCaretRight } from 'react-icons/ai'
import { MdEdit } from 'react-icons/md'
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Spacer,
  Switch,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'

interface CodeIDEButtonProps {
  isDisabled: boolean
  editing: boolean
  toggleMode: () => void
  heapsize: number
  setHeapsize: (x: number) => void
  isMultithreaded: boolean
  setIsMultithreaded: (x: boolean) => void
  isTriColor: boolean
  setIsTriColor: (x: boolean) => void
}

export const CodeIDEButtons = (props: CodeIDEButtonProps) => {
  return (
    <Flex
      background={useColorModeValue('gray.100', 'gray.700')}
      flexDirection="column"
      borderBottomWidth="1px"
    >
      <Flex alignItems="center" px="10px" h="60px">
        <Box whiteSpace="nowrap">Heap Size:</Box>
        <NumberInput
          backgroundColor={useColorModeValue('white', 'gray.800')}
          ml="8px"
          w="30%"
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
      <Flex alignItems="center" px="10px" pb="8px" gap="16px">
        <FormControl display="flex" alignItems="center" w="auto" gap="6px">
          <Switch
            id="multithreaded-toggle"
            isChecked={props.isMultithreaded}
            onChange={(e) => props.setIsMultithreaded(e.target.checked)}
            isDisabled={props.isDisabled}
          />
          <FormLabel
            htmlFor="multithreaded-toggle"
            mb="0"
            whiteSpace="nowrap"
            fontSize="sm"
          >
            Multithreaded
          </FormLabel>
        </FormControl>
        <FormControl display="flex" alignItems="center" w="auto" gap="6px">
          <Switch
            id="tricolor-toggle"
            isChecked={props.isMultithreaded || props.isTriColor}
            onChange={(e) => props.setIsTriColor(e.target.checked)}
            isDisabled={props.isDisabled || props.isMultithreaded}
          />
          <FormLabel
            htmlFor="tricolor-toggle"
            mb="0"
            whiteSpace="nowrap"
            fontSize="sm"
            opacity={props.isMultithreaded ? 0.4 : 1}
          >
            Tri-Color GC
          </FormLabel>
        </FormControl>
      </Flex>
    </Flex>
  )
}
