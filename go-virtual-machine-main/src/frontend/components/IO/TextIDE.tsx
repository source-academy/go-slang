import { useColorModeValue } from '@chakra-ui/react'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import CodeMirror from '@uiw/react-codemirror'

export interface textIDEProps {
  placeholder?: string
  setText?: (text: string) => void
  text: string
  editable: boolean
}

export const TextIDE = (props: textIDEProps) => {
  return (
    <CodeMirror
      value={props.text}
      height="100%"
      maxHeight="700px"
      style={{
        height: '100%',
        ...(!props.editable && { cursor: 'not-allowed' }),
      }}
      editable={props.editable}
      readOnly={!props.editable}
      placeholder={props.placeholder}
      autoFocus={true}
      width="100%"
      basicSetup={{
        lineNumbers: false,
        highlightActiveLine: props.editable,
        syntaxHighlighting: false,
      }}
      extensions={[]}
      onChange={props.setText}
      theme={useColorModeValue(githubLight, githubDark)}
    />
  )
}
