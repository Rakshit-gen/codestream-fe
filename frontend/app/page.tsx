'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Code2, 
  Users, 
  Sparkles, 
  Zap, 
  GitBranch, 
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Cpu,
  Globe,
  Shield,
  Rocket,
  Eye
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { getBackendUrl } from '@/lib/utils'

export default function Home() {
  const router = useRouter()
  const { user } = useUser()
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })
  
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8])

  const createSession = async () => {
    setCreating(true)
    try {
        const response = await fetch(`${getBackendUrl()}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: 'javascript',
          code: '// Start coding here...\n',
        }),
      })

      const data = await response.json()
      router.push(`/session/${data.session.id}`)
    } catch (error) {
      console.error('Failed to create session:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 1, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10"
      >
        <div className="absolute inset-0 glass backdrop-blur-xl" />
        <div className="container mx-auto px-4 h-20 flex items-center justify-between relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <Code2 className="w-10 h-10 text-purple-400" />
              <motion.div
                className="absolute -inset-1 bg-purple-500/20 rounded-full blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            </div>
            <div>
              <span className="text-2xl font-bold gradient-text">CodeStream</span>
              <p className="text-xs text-purple-300/60">Collaborative Coding</p>
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in">
                <Button variant="ghost" className="text-purple-200 hover:text-white">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Get Started
                </Button>
              </Link>
            </SignedOut>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="pt-40 pb-32 px-4 relative">
        <motion.div 
          style={{ opacity, scale }}
          className="container mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-block mb-6"
            >
              <div className="glass px-6 py-3 rounded-full border border-purple-500/30">
                <span className="text-sm text-purple-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI-Powered Code Reviews
                </span>
              </div>
            </motion.div>

            <h1 className="text-7xl md:text-8xl font-bold mb-6 leading-tight">
              <span className="block gradient-text">Code Together,</span>
              <span className="block gradient-text">Ship Faster</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-purple-200/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Real-time collaborative coding with AI assistance. 
              Review code, get instant feedback, and build better software together.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <SignedIn>
                <Button
                  size="lg"
                  className="text-lg px-10 py-7 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50 group"
                  onClick={createSession}
                  disabled={creating}
                >
                  {creating ? (
                    'Creating...'
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                      Launch Session
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </SignedIn>
              <SignedOut>
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    className="text-lg px-10 py-7 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50 group"
                  >
                    <Rocket className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                    Start Free
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </SignedOut>
              
            </div>
          </motion.div>

          {/* Floating Code Window Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="mt-20 max-w-6xl mx-auto"
          >
            <div className="glass rounded-2xl p-2 border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20">
              <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-xl overflow-hidden">
                {/* Browser Bar */}
                <div className="bg-black/40 px-4 py-3 flex items-center gap-2 border-b border-white/10">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 text-center text-sm text-purple-300/60">
                    session/a7b3c9d2
                  </div>
                </div>
                
                {/* Code Content */}
                <div className="p-8 font-mono text-sm">
                  <div className="space-y-2">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      className="flex gap-4"
                    >
                      <span className="text-purple-400/40">1</span>
                      <span className="text-purple-400">const</span>
                      <span className="text-blue-400">reviewCode</span>
                      <span className="text-white">=</span>
                      <span className="text-green-400">(code)</span>
                      <span className="text-purple-400">=&gt;</span>
                      <span className="text-white">{'{'}</span>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      className="flex gap-4 pl-8"
                    >
                      <span className="text-purple-400/40">2</span>
                      <span className="text-purple-400">return</span>
                      <span className="text-blue-400">AI</span>
                      <span className="text-white">.</span>
                      <span className="text-yellow-400">analyze</span>
                      <span className="text-white">(code)</span>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                      className="flex gap-4"
                    >
                      <span className="text-purple-400/40">3</span>
                      <span className="text-white">{'}'}</span>
                    </motion.div>

                    {/* Cursor Indicators */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="flex gap-2 items-center mt-6"
                    >
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-black" />
                        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-black" />
                        <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-black" />
                      </div>
                      <span className="text-xs text-purple-300/60">3 developers coding</span>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-4 relative">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
              Everything You Need
            </h2>
            <p className="text-xl text-purple-200/70 max-w-2xl mx-auto">
              Powerful features designed for modern development teams
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="glass border-white/10 hover:border-purple-500/50 transition-all duration-300 h-full group">
                  <CardContent className="p-8">
                    <motion.div
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <feature.icon className="w-8 h-8 text-purple-400" />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
                    <p className="text-purple-200/70 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-4 relative">
        <div className="container mx-auto">
          <div className="glass rounded-3xl p-12 border border-purple-500/20">
            <div className="grid md:grid-cols-4 gap-12">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-5xl font-bold gradient-text mb-2">{stat.value}</div>
                  <div className="text-purple-300/70">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 relative">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass rounded-3xl p-16 text-center border-2 border-purple-500/30 relative overflow-hidden"
          >
            {/* Animated gradient overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            
            <div className="relative z-10">
              <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
                Ready to Transform Your Workflow?
              </h2>
              <p className="text-xl text-purple-200/80 mb-10 max-w-2xl mx-auto">
                Join thousands of developers who are already coding smarter with CodeStream
              </p>
              
              <SignedIn>
                <Button
                  size="lg"
                  className="text-lg px-12 py-7 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50"
                  onClick={createSession}
                  disabled={creating}
                >
                  {creating ? (
                    'Creating Session...'
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Create Your First Session
                    </>
                  )}
                </Button>
              </SignedIn>
              <SignedOut>
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    className="text-lg px-12 py-7 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start Free Today
                  </Button>
                </Link>
              </SignedOut>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Code2 className="w-8 h-8 text-purple-400" />
              <span className="text-xl font-bold gradient-text">CodeStream</span>
            </div>
            <p className="text-purple-300/60">
              © 2024 CodeStream. Built with Next.js, Go, and AI.
            </p>
            <div className="flex gap-6 text-sm text-purple-300/60">
              <a href="#" className="hover:text-purple-300 transition-colors">Privacy</a>
              <a href="#" className="hover:text-purple-300 transition-colors">Terms</a>
              <a href="#" className="hover:text-purple-300 transition-colors">Docs</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: Users,
    title: 'Real-time Collaboration',
    description: 'See cursor positions and code changes from your team instantly. No lag, no delays.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Analysis',
    description: 'Get instant code reviews and suggestions from advanced AI. Catch bugs before they ship.',
  },
  {
    icon: Terminal,
    title: 'Smart Code Editor',
    description: 'Monaco editor with syntax highlighting for 16+ languages. VS Code experience in your browser.',
  },
  {
    icon: GitBranch,
    title: 'Multi-Cursor Magic',
    description: 'Track multiple users editing simultaneously with color-coded cursors and presence.',
  },
  {
    icon: MessageSquare,
    title: 'Instant Feedback',
    description: 'Get AI suggestions for improvements and best practices as you type.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'WebSocket-powered real-time updates with sub-second latency. Built for speed.',
  },
  {
    icon: Shield,
    title: 'Secure by Design',
    description: 'End-to-end encryption and secure session management. Your code stays private.',
  },
  {
    icon: Globe,
    title: 'Works Anywhere',
    description: 'No installation required. Just open your browser and start coding together.',
  },
  {
    icon: Cpu,
    title: 'Code Runner',
    description: 'Execute code directly in the browser. Support for Python, JavaScript, and more.',
  },
]

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '50K+', label: 'Code Reviews' },
  { value: '99.9%', label: 'Uptime' },
  { value: '<100ms', label: 'Latency' },
]