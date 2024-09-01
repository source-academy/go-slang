import { useEffect, useRef } from 'react'
import { useColorModeValue } from '@chakra-ui/react'
import { go } from '@codemirror/lang-go'
import { Prec, StateEffect, StateField } from '@codemirror/state'
import { Decoration, keymap } from '@codemirror/view'
import { zebraStripes } from '@uiw/codemirror-extensions-zebra-stripes'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'

import { useExecutionStore } from '../../stores'

interface codeIDEProps {
  code: string
  setCode: (code: string) => void
  lineHighlight?: (number | number[])[]
  run: () => void
  editable: boolean
}

export const CodeIDE = (props: codeIDEProps) => {
  const { location } = useExecutionStore((state) => ({
    location: state.location,
  }))
  const placeholder = 'Enter your go code here!'
  const { code, setCode, lineHighlight } = props
  const editorView = useRef<EditorView | null>(null)
  // const [loaded, setLoaded] = useState(false)

  // code mirror effect that you will use to define the effect you want (the decoration)
  const highlight_effect = StateEffect.define<{ from: number; to: number }>({
    map: ({ from, to }, change) => ({
      from: change.mapPos(from),
      to: change.mapPos(to),
    }),
  })

  const highlightField = StateField.define({
    create() {
      return Decoration.none
    },
    update(highlights, tr) {
      highlights = highlights.map(tr.changes)
      for (const e of tr.effects)
        if (e.is(highlight_effect)) {
          highlights = highlights.update({
            add: [highlightMark.range(e.value.from, e.value.to)],
          })
        }
      return highlights
    },
    provide: (f) => EditorView.decorations.from(f),
  })

  const highlightMark = Decoration.mark({ class: 'cm-highlighted' })
  const highlightTheme = EditorView.baseTheme({
    '.cm-highlighted': {
      background: useColorModeValue('#F9ffab', '#7c05a2'),
      fontWeight: 'bold',
    },
  })

  useEffect(() => {
    if (editorView.current && location) {
      const effects: StateEffect<unknown>[] = [
        highlight_effect.of({
          from: location.start.offset,
          to: location.end.offset,
        }),
      ]
      effects.push(
        StateEffect.appendConfig.of([highlightField, highlightTheme]),
      )
      editorView.current.dispatch({ effects })
    }
  }, [
    location,
    highlightField,
    highlightTheme,
    highlightMark,
    highlight_effect,
  ])

  return (
    <CodeMirror
      value={code}
      height="calc(100vh - 125px)"
      placeholder={placeholder}
      autoFocus={true}
      width="100%"
      style={props.editable ? {} : { cursor: 'not-allowed' }}
      editable={props.editable}
      readOnly={!props.editable}
      basicSetup={{
        highlightActiveLineGutter: props.editable,
        highlightActiveLine: props.editable,
      }}
      onCreateEditor={(view) => {
        editorView.current = view
      }}
      extensions={[
        zebraStripes({
          lineNumber: lineHighlight,
          lightColor: '#aca2ff33',
          darkColor: '#aca2ff40',
        }),
        go(),
        Prec.high(
          keymap.of([
            {
              key: 'Shift-Enter',
              run: () => {
                props.run()
                return true
              },
            },
          ]),
        ),
      ]}
      onChange={setCode}
      theme={useColorModeValue(githubLight, githubDark)}
    />
  )
}
