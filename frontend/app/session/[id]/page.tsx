'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { EditorComponent } from '@/components/Editor'
import { AIPanel } from '@/components/AIPanel'
import { CodeRunner } from '@/components/CodeRunner'
import { UserList } from '@/components/UserList'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWebSocket } from '@/hooks/use-websocket'
import { useToast } from '@/hooks/use-toast'
import { generateColor, getBackendUrl } from '@/lib/utils'
import { Copy, Loader2, Code2, ArrowLeft, Sparkles, Play } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
]

interface CursorData {
  line: number
  column: number
  user: any
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { toast } = useToast()

  const sessionId = params.id as string
  const [session, setSession] = useState<any>(null)
  const [code, setCode] = useState('// Loading...\n')
  const [language, setLanguage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map())

  const userColor = useRef(generateColor(user?.id || '')).current
  const lastCodeChangeRef = useRef<string>('')

  const { connected, users, messages, sendMessage } = useWebSocket(
    sessionId,
    user?.id || '',
    user?.fullName || user?.firstName || 'Anonymous',
    user?.emailAddresses[0]?.emailAddress || '',
    userColor,
    user?.imageUrl || ''
  )

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(
          `${getBackendUrl()}/api/sessions/${sessionId}`
        )
        if (!response.ok) throw new Error('Session not found')

        const data = await response.json()
        setSession(data)
        setCode(data.code || '// Start coding here...\n')
        setLanguage(data.language || 'javascript')
        lastCodeChangeRef.current = data.code || '// Start coding here...\n'
      } catch (error) {
        console.error('Failed to fetch session:', error)
        toast({
          title: 'Error',
          description: 'Failed to load session',
          variant: 'destructive',
        })
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      fetchSession()
    }
  }, [sessionId, router, toast])

  useEffect(() => {
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage) return

    switch (latestMessage.type) {
      case 'cursor_move':
        if (latestMessage.user_id !== user?.id && latestMessage.data) {
          setCursors((prev) => {
            const newCursors = new Map(prev)
            newCursors.set(latestMessage.user_id!, {
              line: latestMessage.data.line,
              column: latestMessage.data.column,
              user: latestMessage.data.user || { name: 'Unknown' },
            })
            return newCursors
          })
        }
        break

      case 'code_change':
        // Always update code from WebSocket messages (source of truth)
        // This ensures all users see the latest code state, including on reconnect
        if (latestMessage.data && latestMessage.data.code !== undefined) {
          const newCode = latestMessage.data.code
          // Update if it's different from current state
          // We check both code state and lastCodeChangeRef to handle all cases
          if (newCode !== code) {
            setCode(newCode)
            lastCodeChangeRef.current = newCode
          }
        }
        break

      case 'language_change':
        // Update language from server/broadcast (source of truth)
        if (latestMessage.data && latestMessage.data.language) {
          const newLanguage = latestMessage.data.language
          // Only update if it's different to avoid unnecessary re-renders
          if (language !== newLanguage) {
            setLanguage(newLanguage)
          }
        }
        break

      case 'user_leave':
        if (latestMessage.user_id) {
          setCursors((prev) => {
            const newCursors = new Map(prev)
            newCursors.delete(latestMessage.user_id!)
            return newCursors
          })
        }
        break
    }
  }, [messages, user?.id])

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode)
      lastCodeChangeRef.current = newCode

      sendMessage({
        type: 'code_change',
        session_id: sessionId,
        user_id: user?.id,
        data: {
          code: newCode,
          timestamp: Date.now(),
        },
      })
    },
    [sendMessage, sessionId, user?.id]
  )

  const handleCursorChange = useCallback(
    (line: number, column: number) => {
      sendMessage({
        type: 'cursor_move',
        session_id: sessionId,
        user_id: user?.id,
        data: {
          line,
          column,
          user: {
            id: user?.id,
            name: user?.fullName || user?.firstName || 'Anonymous',
            color: userColor,
          },
        },
      })
    },
    [sendMessage, sessionId, user, userColor]
  )

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    
    // Persist language change to backend and broadcast to other users
    sendMessage({
      type: 'language_change',
      session_id: sessionId,
      user_id: user?.id,
      data: {
        language: newLanguage,
      },
    })
  }

  const copyShareLink = () => {
    const link = window.location.href
    navigator.clipboard.writeText(link)
    toast({
      title: 'Link copied!',
      description: 'Share this link with your team',
    })
  }

  if (!isLoaded || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-white/10 glass">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Code2 className="w-6 h-6 text-purple-400" />
              <div>
                <h1 className="font-semibold">Code Review Session</h1>
                <p className="text-xs text-muted-foreground">
                  {sessionId.slice(0, 8)}...
                </p>
              </div>
            </div>
            <Badge variant={connected ? 'default' : 'secondary'}>
              {connected ? 'Connected' : 'Connecting...'}
            </Badge>
            
            <Select value={language || 'javascript'} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[180px] glass border-white/10">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="glass">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <UserList users={users} currentUserId={user?.id || ''} />
            <Button onClick={copyShareLink} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Share Link
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 border-r border-white/10"
        >
          <EditorComponent
            code={code}
            language={language || 'javascript'}
            onChange={handleCodeChange}
            onCursorChange={handleCursorChange}
            cursors={cursors}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-[30%] glass"
        >
          <Tabs defaultValue="ai" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 glass border-b border-white/10 rounded-none">
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI Assistant
              </TabsTrigger>
              <TabsTrigger value="run" className="gap-2">
                <Play className="w-4 h-4" />
                Run Code
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ai" className="flex-1 overflow-hidden mt-0">
              <AIPanel code={code} language={language || 'javascript'} />
            </TabsContent>
            
            <TabsContent value="run" className="flex-1 overflow-hidden mt-0">
              <CodeRunner code={code} language={language || 'javascript'} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}