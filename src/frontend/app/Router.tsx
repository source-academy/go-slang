import { Route, Routes } from 'react-router-dom'

import { Main } from '../pages/Main'

interface RouteType {
  path: string
  component: JSX.Element
}

export const routes: RouteType[] = [
  {
    path: '/',
    component: <Main />,
  },
  {
    path: '/go-virtual-machine',
    component: <Main />,
  },
]

export const Router = () => {
  return (
    <Routes>
      {routes.map((r) => (
        <Route path={r.path} element={r.component} key={r.path} />
      ))}
    </Routes>
  )
}
