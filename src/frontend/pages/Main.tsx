import { createContext, useEffect, useState } from 'react'
import {
  Box,
  Center,
  Flex,
  Image,
  keyframes,
  useInterval,
  useToast,
} from '@chakra-ui/react'
import Cookies from 'js-cookie'

import { runCode } from '../../go-virtual-machine-main/tests/utility'
import { CompileError } from '../../go-virtual-machine-main/virtual-machine/executor/index'
import {
  CodeIDE,
  CodeIDEButtons,
  ControlBar,
  IO,
  VisualArea,
} from '../components'
import { useExecutionStore } from '../stores'

export const LoaderContext = createContext<
  React.Dispatch<React.SetStateAction<boolean>> | undefined
>(undefined)

const COOKIE_NAME = 'code_value'
const VISUAL_MODE = 'visual_mode'

export const Main = () => {
  const { setVisualData, currentStep, setStep, data, setOutput, setLocation } =
    useExecutionStore((state) => ({
      data: state.data,
      setVisualData: state.setVisualData,
      currentStep: state.currentStep,
      setStep: state.setStep,
      setOutput: state.setOutput,
      setLocation: state.setLocation,
    }))
  const [editing, setEditing] = useState(true)
  const [isPlaying, setPlaying] = useState(false)
  const [wasPlaying, setWasPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [heapsize, setHeapsize] = useState(4096)
  const [visualMode, setVisualMode] = useState(false)

  useEffect(() => {
    // Get the value from the cookie
    const oldCode = Cookies.get(COOKIE_NAME)
    const visualMode = Cookies.get(VISUAL_MODE)
    // Update state if the cookie exists
    if (oldCode) {
      try {
        setCode(atob(oldCode))
      } catch (_err) {
        Cookies.remove(COOKIE_NAME)
      }
    }
    if (visualMode === 'true') {
      setVisualMode(true)
    }
  }, [])

  const modifyCode = (code: string) => {
    Cookies.set(COOKIE_NAME, btoa(code))
    setCode(code)
    resetErrors()
    resetMarking()
  }

  const toggleVisualMode = () => {
    Cookies.set(VISUAL_MODE, (!visualMode).toString())
    setVisualMode(!visualMode)
  }

  const toast = useToast()
  const makeToast = (
    msg: string | undefined,
    title = 'An Error Has Occured!',
  ) => {
    toast({
      title,
      description: msg,
      status: 'error',
      duration: 2000,
      isClosable: true,
      containerStyle: {
        whiteSpace: 'pre-line',
      },
    })
  }

  /**
   * Interval hook to increment the step counter while the execution is playing
   */
  useInterval(
    () => {
      // sanity check
      if (currentStep >= 0 && currentStep + 1 < data.length) {
        setStep(currentStep + 1)
      }
      if (currentStep >= data.length - 1) {
        // End of execution
        setPlaying(false)
      }
    },
    isPlaying ? Math.ceil(1000 / speed) : null,
  )

  const moveStep = (forward: boolean) => {
    const newStep = Math.min(
      data.length,
      Math.max(0, (forward ? 1 : -1) * speed + currentStep),
    )
    setStep(newStep)
    if (newStep >= data.length) {
      setPlaying(false)
    }
  }

  const [lineHighlight, setLineHighlight] = useState<(number | number[])[]>([0])

  const resetErrors = () => {
    setLineHighlight([0])
  }

  const resetMarking = () => {
    setLocation(null)
  }
  const toggleEditing = async () => {
    if (editing) {
      // Start playing
      setLoading(true)
      if (code === '') {
        setLoading(false)
        makeToast('Code cannot be empty!')
        return
      }
      // Retrieve instructions from endpoint
      setOutput('Compiling and Running your code...')
      const {
        error,
        output: newOutput,
        visualData,
      } = runCode(code, heapsize, true, visualMode)
      if (error) {
        const errorTitle = {
          parse: 'Syntax Error',
          compile: 'Compile Error',
          runtime: 'Runtime Error',
        }[error.type]
        setLoading(false)
        makeToast(error.message, errorTitle)

        if (error.type === 'compile') {
          // Highlight compile error in source code.
          const details = error.details as CompileError
          const startLine = details.sourceLocation.start.line
          let endLine = details.sourceLocation.end.line
          if (details.sourceLocation.end.column === 1) {
            // When parsing, the token's end location may spill into the next line.
            // If so, then we should ignore the last line.
            endLine--
          }
          setLineHighlight([[startLine, endLine]])
        }
      } else {
        resetErrors()
      }
      console.log(error, !error, error?.type === 'runtime')
      if (!error || error.type === 'runtime') {
        setEditing(!editing)

        // Set instructions and update components to start playing mode
        setVisualData(visualData)
        if (visualData.length === 0) setOutput(newOutput || '')
        setPlaying(true)
        setWasPlaying(false)
        setTimeout(function () {
          setLoading(false)
        }, 500)
      }
    } else {
      // Stop playing
      setPlaying(false)
      setEditing(!editing)
    }
  }

  const spin = keyframes`  
    from {transform: rotate(0deg);}   
    to {transform: rotate(360deg)} 
  `

  return (
    <LoaderContext.Provider value={setLoading}>
      {loading ? (
        <Center
          position="absolute"
          h="100%"
          w="100%"
          bg="rgba(0, 0, 0, .5)"
          zIndex={3000}
        >
          <Image
            src="gopher.png"
            width="150px"
            animation={`${spin} infinite 0.5s linear`}
          />
        </Center>
      ) : null}
      <Flex>
        <Box minWidth="500px" w="30%" borderRightWidth="1px">
          <CodeIDEButtons
            editing={editing}
            toggleMode={toggleEditing}
            isDisabled={loading}
            heapsize={heapsize}
            setHeapsize={setHeapsize}
          />
          <CodeIDE
            editable={editing}
            code={code}
            setCode={modifyCode}
            lineHighlight={lineHighlight}
            run={toggleEditing}
          />
        </Box>
        <Flex position="relative" flex={1}>
          <Flex borderRightWidth="1px" flexDirection="column" w="100%">
            <IO />
            <Flex flex={1} flexDirection="column" w="100%">
              <Flex flex={1}>
                <VisualArea />
              </Flex>
              <Box>
                <ControlBar
                  length={data.length - 1}
                  playing={isPlaying}
                  curSpeed={speed}
                  setSpeed={setSpeed}
                  togglePlaying={() => {
                    if (isPlaying || currentStep < data.length)
                      setPlaying(!isPlaying)
                  }}
                  disabled={data.length === 0 || editing}
                  wasPlaying={wasPlaying}
                  setWasPlaying={setWasPlaying}
                  moveStep={moveStep}
                  toggleVisual={toggleVisualMode}
                  visual={visualMode}
                />
              </Box>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </LoaderContext.Provider>
  )
}
