'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

interface User {
  id: string
  name: string
  email: string
  color: string
  image_url: string
}

interface UserListProps {
  users: User[]
  currentUserId: string
}

export function UserList({ users, currentUserId }: UserListProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-2">
        {users.length} {users.length === 1 ? 'user' : 'users'} online
      </span>
      <div className="flex items-center -space-x-2">
        {users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            <Avatar
              className="border-2 hover:z-10 transition-all cursor-pointer"
              style={{ borderColor: user.color }}
            >
              <AvatarImage src={user.image_url} alt={user.name} />
              <AvatarFallback style={{ backgroundColor: user.color }}>
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {user.id === currentUserId && (
              <Badge
                variant="secondary"
                className="absolute -bottom-1 -right-1 text-xs px-1 h-5"
              >
                You
              </Badge>
            )}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
