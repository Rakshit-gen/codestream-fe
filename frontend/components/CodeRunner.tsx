'use client'

import { useState } from 'react'
import { getBackendUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Loader2, Terminal, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CodeRunnerProps {
  code: string
  language: string
}

export function CodeRunner({ code, language }: CodeRunnerProps) {
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [executionTime, setExecutionTime] = useState('')
  const [input, setInput] = useState('')

  const runCode = async () => {
    if (!code.trim()) return

    setRunning(true)
    setOutput('')
    setError('')
    setExecutionTime('')

    try {
      const response = await fetch(`${getBackendUrl()}/api/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          input,
        }),
      })

      if (!response.ok) throw new Error('Execution failed')

      const data = await response.json()
      
      if (data.output) {
        setOutput(data.output)
      }
      
      if (data.error) {
        setError(data.error)
      }
      
      if (data.time) {
        setExecutionTime(data.time)
      }
    } catch (err) {
      setError('Failed to execute code. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  const supportsExecution = ['javascript', 'typescript', 'python', 'bash', 'shell', 'ruby', 'php'].includes(language)

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <Button
          onClick={runCode}
          disabled={running || !code.trim() || !supportsExecution}
          className="w-full"
          variant="default"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Code
            </>
          )}
        </Button>

        {!supportsExecution && (
          <Card className="glass border-yellow-500/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-200">
                {language} execution not supported. Supported: JavaScript, Python, Bash, Ruby, PHP
              </p>
            </div>
          </Card>
        )}

        {supportsExecution && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              Input (optional)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input for your code..."
              className="w-full h-20 px-3 py-2 text-sm bg-background/50 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-mono"
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {(output || error) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {output && (
              <Card className="glass border-green-500/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-green-400" />
                    Output
                  </h3>
                  {executionTime && (
                    <span className="text-xs text-muted-foreground">
                      {executionTime}
                    </span>
                  )}
                </div>
                <pre className="text-sm text-green-100 whitespace-pre-wrap font-mono bg-black/20 p-3 rounded">
                  {output}
                </pre>
              </Card>
            )}

            {error && (
              <Card className="glass border-red-500/20 p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  Error
                </h3>
                <pre className="text-sm text-red-200 whitespace-pre-wrap font-mono bg-black/20 p-3 rounded">
                  {error}
                </pre>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!output && !error && (
        <Card className="glass border-white/10 p-8 text-center">
          <Terminal className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
          <p className="text-sm text-muted-foreground">
            Click "Run Code" to execute your code and see the output
          </p>
        </Card>
      )}
    </div>
  )
}