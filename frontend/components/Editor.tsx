'use client'

import { useEffect, useRef } from 'react'
import Editor, { OnMount, Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface EditorComponentProps {
  code: string
  language: string
  onChange: (value: string) => void
  onCursorChange: (line: number, column: number) => void
  cursors: Map<string, { line: number; column: number; user: any }>
}

export function EditorComponent({
  code,
  language,
  onChange,
  onCursorChange,
  cursors,
}: EditorComponentProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decorationsRef = useRef<string[]>([])
  const isApplyingExternalChangeRef = useRef(false)
  const lastCodeRef = useRef<string>(code)

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    lastCodeRef.current = editor.getValue()

    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange(e.position.lineNumber, e.position.column)
    })

    // Listen for content changes
    editor.onDidChangeModelContent(() => {
      // Don't trigger onChange if we're applying an external change
      if (isApplyingExternalChangeRef.current) {
        return
      }
      
      const value = editor.getValue()
      lastCodeRef.current = value
      onChange(value)
    })
  }

  // Update other users' cursors
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return

    const monaco = monacoRef.current
    const newDecorations: editor.IModelDeltaDecoration[] = []

    cursors.forEach((cursor, userId) => {
      newDecorations.push({
        range: new monaco.Range(
          cursor.line,
          cursor.column,
          cursor.line,
          cursor.column
        ),
        options: {
          className: 'cursor-decoration',
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          beforeContentClassName: 'cursor-line',
          glyphMarginClassName: 'cursor-glyph',
          after: {
            content: ` ${cursor.user.name}`,
            inlineClassName: 'cursor-label',
            inlineClassNameAffectsLetterSpacing: false,
          },
        },
      })
    })

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      newDecorations
    )
  }, [cursors])

  // Update editor content when code prop changes (from other users)
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return
    
    const editor = editorRef.current
    const currentValue = editor.getValue()
    
    // Only update if the code actually changed and it's different from what we have
    // Also check against lastCodeRef to avoid unnecessary updates
    if (code !== currentValue && code !== lastCodeRef.current) {
      isApplyingExternalChangeRef.current = true
      
      try {
        const model = editor.getModel()
        if (model) {
          // Save current cursor position and selection
          const position = editor.getPosition()
          const selection = editor.getSelection()
          
          // Use executeEdits for smoother updates that preserve undo/redo
          const fullRange = model.getFullModelRange()
          const edit = {
            range: fullRange,
            text: code,
          }
          
          // Apply the edit
          editor.executeEdits('external-change', [edit])
          
          // Restore cursor position if it was valid
          if (position) {
            const lineCount = model.getLineCount()
            const maxLine = Math.max(1, Math.min(position.lineNumber, lineCount))
            const maxColumn = model.getLineMaxColumn(maxLine)
            const newColumn = Math.min(position.column, maxColumn)
            
            editor.setPosition({ lineNumber: maxLine, column: newColumn })
            
            // Restore selection if it existed
            if (selection) {
              try {
                const newSelection = {
                  startLineNumber: Math.min(selection.startLineNumber, lineCount),
                  startColumn: Math.min(selection.startColumn, model.getLineMaxColumn(selection.startLineNumber)),
                  endLineNumber: Math.min(selection.endLineNumber, lineCount),
                  endColumn: Math.min(selection.endColumn, model.getLineMaxColumn(selection.endLineNumber)),
                }
                editor.setSelection(newSelection)
              } catch (e) {
                // If selection restoration fails, just keep the cursor position
              }
            }
          }
        }
      } catch (error) {
        console.error('Error applying external change:', error)
        // Fallback to setValue if executeEdits fails
        editor.setValue(code)
      } finally {
        lastCodeRef.current = code
        // Use setTimeout to ensure the change is fully applied before allowing onChange
        setTimeout(() => {
          isApplyingExternalChangeRef.current = false
        }, 0)
      }
    }
  }, [code])

  return (
    <>
      <style jsx global>{`
        .cursor-decoration {
          background: transparent !important;
        }
        .cursor-line::before {
          content: '';
          position: absolute;
          width: 2px;
          height: 20px;
          background: currentColor;
          animation: blink 1s step-end infinite;
        }
        .cursor-label {
          background: currentColor;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          margin-left: 4px;
          white-space: nowrap;
        }
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
      <Editor
        height="100%"
        language={language}
        value={code}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
        }}
      />
    </>
  )
}
