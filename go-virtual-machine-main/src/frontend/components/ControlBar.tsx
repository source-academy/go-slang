import { useState } from 'react'
import { FaForward, FaPause, FaPlay } from 'react-icons/fa'
import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  IconButton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spacer,
  Stack,
  Switch,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { shallow } from 'zustand/shallow'

import { useExecutionStore } from '../stores'

interface ControlBarProps {
  playing: boolean
  length: number
  curSpeed: number
  disabled: boolean
  wasPlaying: boolean
  setSpeed: (speed: number) => void
  togglePlaying: () => void
  setWasPlaying: (newVal: boolean) => void
  moveStep: (forward: boolean) => void
  toggleVisual: () => void
  visual: boolean
}

export const ControlBar = (props: ControlBarProps) => {
  const { currentStep, setStep } = useExecutionStore(
    (state) => ({
      currentStep: state.currentStep,
      setStep: state.setStep,
    }),
    shallow,
  )
  const buttonColor = useColorModeValue('#3182ce', '#90cdf4')
  const [showTooltip, setShowTooltip] = useState(false)
  const [showTooltipMain, setShowTooltipMain] = useState(false)
  return (
    <>
      <Flex flexDirection="column">
        <Box px="15px" paddingTop="10px">
          <Slider
            value={currentStep}
            min={0}
            max={props.length}
            step={1}
            size="lg"
            focusThumbOnChange={false}
            isDisabled={props.disabled}
            onChange={setStep}
            onMouseEnter={() => setShowTooltipMain(true)}
            onMouseLeave={() => setShowTooltipMain(false)}
            onChangeStart={
              props.playing
                ? () => {
                    props.setWasPlaying(true)
                    props.togglePlaying()
                  }
                : void 0
            }
            onChangeEnd={
              props.wasPlaying
                ? () => {
                    props.setWasPlaying(false)
                    props.togglePlaying()
                  }
                : void 0
            }
          >
            <SliderTrack>
              <Box position="relative" right={10} />
              <SliderFilledTrack />
            </SliderTrack>
            <Tooltip
              hasArrow
              bg="blue.500"
              color="white"
              placement="top"
              isOpen={showTooltipMain}
              label={`${currentStep}`}
            >
              <SliderThumb />
            </Tooltip>
            <SliderThumb boxSize={4} />
          </Slider>
        </Box>
        <Flex>
          <Stack direction="column" align="center" marginLeft="10px" px="10px">
            <FaForward />
            <Slider
              id="slider"
              defaultValue={1}
              value={props.curSpeed}
              min={1}
              max={100}
              onChange={(v) => props.setSpeed(Number(v))}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              isDisabled={props.disabled}
              w="120px"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <Tooltip
                hasArrow
                bg="blue.500"
                color="white"
                placement="top"
                isOpen={showTooltip}
                label={`x${props.curSpeed}`}
              >
                <SliderThumb />
              </Tooltip>
            </Slider>
          </Stack>
          <Spacer />
          <Stack direction="row" align="center">
            <IconButton
              isRound={true}
              background="none"
              size="lg"
              aria-label="Rewind"
              isDisabled={props.disabled}
              icon={<ArrowBackIcon color={buttonColor} />}
              onClick={() => props.moveStep(false)}
            />
            <IconButton
              isRound={true}
              background="none"
              size="lg"
              aria-label="Play/Pause"
              isDisabled={props.disabled || currentStep === props.length}
              icon={
                props.playing ? (
                  <FaPause color={buttonColor} />
                ) : (
                  <FaPlay color={buttonColor} />
                )
              }
              onClick={props.togglePlaying}
            />
            <IconButton
              isRound={true}
              background="none"
              size="lg"
              aria-label="Forward"
              isDisabled={props.disabled}
              icon={<ArrowForwardIcon color={buttonColor} />}
              onClick={() => props.moveStep(true)}
            />
          </Stack>
          <Spacer />
          <Flex justify="center" align="center" p={2}>
            Enable Visuals?
            <Switch
              px={2}
              isChecked={props.visual}
              onChange={props.toggleVisual}
            />
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}
