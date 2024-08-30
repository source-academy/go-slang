import { ChakraProvider } from '@chakra-ui/react'

import { NavBar } from '../components'
import { theme } from '../theme'

import { Router } from './Router'

export const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <NavBar />
      <Router />
    </ChakraProvider>
  )
}
