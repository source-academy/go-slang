import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Stack,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react'

export const NavBar = () => {
  const { colorMode, toggleColorMode } = useColorMode()
  return (
    <>
      <Box
        bg={useColorModeValue('blue.100', 'blue.900')}
        px={4}
        minW="1500px"
        h="65px"
      >
        <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
          <Heading color={useColorModeValue('blue.700', 'blue.300')}>
            Go Virtual Machine
          </Heading>

          <Flex alignItems={'center'} padding={6}>
            <Image
              src="gophers.png"
              width="300px"
              transform="rotate(180deg)"
              zIndex={100}
              marginRight={20}
            />
            <Stack direction={'row'} spacing={7}>
              <Button
                onClick={toggleColorMode}
                bg={useColorModeValue('blue.100', 'blue.900')}
                _hover={{ bg: useColorModeValue('blue.200', 'blue.800') }}
              >
                {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              </Button>
            </Stack>
          </Flex>
        </Flex>
      </Box>
    </>
  )
}
