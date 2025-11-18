'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sparkles, Lightbulb, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AIPanelProps {
  code: string
  language: string
}

export function AIPanel({ code, language }: AIPanelProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [suggestions, setSuggestions] = useState('')

  const analyzeCode = async () => {
    if (!code.trim()) return

    setAnalyzing(true)
    setAnalysis('')

    try {
      const response = await fetch('http://localhost:8080/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
        }),
      })

      if (!response.ok) throw new Error('Analysis failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let accumulatedText = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          accumulatedText += chunk
          setAnalysis(accumulatedText)
        }
      }
    } catch (error) {
      console.error('Analysis error:', error)
      setAnalysis('Failed to analyze code. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const suggestImprovements = async () => {
    if (!code.trim()) return

    setSuggesting(true)
    setSuggestions('')

    try {
      const response = await fetch('http://localhost:8080/api/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
        }),
      })

      if (!response.ok) throw new Error('Suggestions failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let accumulatedText = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          accumulatedText += chunk
          setSuggestions(accumulatedText)
        }
      }
    } catch (error) {
      console.error('Suggestions error:', error)
      setSuggestions('Failed to get suggestions. Please try again.')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <Button
          onClick={analyzeCode}
          disabled={analyzing || !code.trim()}
          className="w-full"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Code
            </>
          )}
        </Button>

        <Button
          onClick={suggestImprovements}
          disabled={suggesting || !code.trim()}
          variant="secondary"
          className="w-full"
        >
          {suggesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Suggestions...
            </>
          ) : (
            <>
              <Lightbulb className="w-4 h-4 mr-2" />
              Suggest Improvements
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="glass border-purple-500/20 p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Code Analysis
              </h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {analysis}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {suggestions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="glass border-blue-500/20 p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-blue-400" />
                Improvement Suggestions
              </h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {suggestions}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!analysis && !suggestions && (
        <Card className="glass border-white/10 p-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
          <p className="text-sm text-muted-foreground">
            Click the buttons above to get AI-powered insights about your code
          </p>
        </Card>
      )}
    </div>
  )
}