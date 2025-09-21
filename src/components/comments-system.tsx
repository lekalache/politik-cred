"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Flag,
  MoreHorizontal,
  Send,
  Heart,
  Share2,
  Bookmark,
  Calendar,
  User
} from 'lucide-react'

interface Comment {
  id: string
  vote_id: string | null
  politician_id: string | null
  user_id: string | null
  parent_comment_id: string | null
  content: string
  upvotes: number
  downvotes: number
  is_flagged: boolean
  status: 'active' | 'hidden' | 'deleted'
  created_at: string
  updated_at: string
  user?: {
    name: string | null
    reputation_score: number
  }
  replies?: Comment[]
  user_vote?: 'up' | 'down' | null
}

interface CommentsSystemProps {
  voteId?: string
  politicianId?: string
  maxDepth?: number
}

export function CommentsSystem({ voteId, politicianId, maxDepth = 3 }: CommentsSystemProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [voteId, politicianId])

  const fetchComments = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('comments')
        .select(`
          *,
          user:users(name, reputation_score)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: true })

      if (voteId) {
        query = query.eq('vote_id', voteId)
      } else if (politicianId) {
        query = query.eq('politician_id', politicianId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching comments:', error)
        return
      }

      // Organize comments into thread structure
      const commentsMap = new Map<string, Comment>()
      const rootComments: Comment[] = []

      // First pass: create comment objects
      data?.forEach(comment => {
        commentsMap.set(comment.id, {
          ...comment,
          replies: [],
          user_vote: null // Will be fetched separately if needed
        })
      })

      // Second pass: organize into threads
      data?.forEach(comment => {
        const commentObj = commentsMap.get(comment.id)!

        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id)
          if (parent) {
            parent.replies!.push(commentObj)
          }
        } else {
          rootComments.push(commentObj)
        }
      })

      setComments(rootComments)

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async (content: string, parentId?: string) => {
    if (!user || !content.trim()) return

    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          vote_id: voteId || null,
          politician_id: politicianId || null,
          user_id: user.id,
          parent_comment_id: parentId || null,
          content: content.trim()
        }])
        .select(`
          *,
          user:users(name, reputation_score)
        `)

      if (error) {
        console.error('Error submitting comment:', error)
        return
      }

      // Refresh comments
      await fetchComments()

      // Clear form
      if (parentId) {
        setReplyText('')
        setReplyingTo(null)
      } else {
        setNewComment('')
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const voteOnComment = async (commentId: string, voteType: 'up' | 'down') => {
    if (!user) return

    try {
      // In a real implementation, you'd have a separate comment_votes table
      // For now, we'll just update the comment directly
      const comment = findCommentById(commentId, comments)
      if (!comment) return

      const { error } = await supabase
        .from('comments')
        .update({
          upvotes: voteType === 'up' ? comment.upvotes + 1 : comment.upvotes,
          downvotes: voteType === 'down' ? comment.downvotes + 1 : comment.downvotes
        })
        .eq('id', commentId)

      if (!error) {
        await fetchComments()
      }

    } catch (error) {
      console.error('Error voting on comment:', error)
    }
  }

  const flagComment = async (commentId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('comments')
        .update({ is_flagged: true })
        .eq('id', commentId)

      if (!error) {
        await fetchComments()
      }

    } catch (error) {
      console.error('Error flagging comment:', error)
    }
  }

  const findCommentById = (id: string, commentsList: Comment[]): Comment | null => {
    for (const comment of commentsList) {
      if (comment.id === id) return comment
      if (comment.replies) {
        const found = findCommentById(id, comment.replies)
        if (found) return found
      }
    }
    return null
  }

  const CommentComponent = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="flex space-x-3 mb-4">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="text-xs">
            {comment.user?.name ? comment.user.name.charAt(0).toUpperCase() : 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900">
              {comment.user?.name || 'Utilisateur anonyme'}
            </span>
            {comment.user && comment.user.reputation_score >= 500 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                Contributeur vérifié
              </Badge>
            )}
            <span className="text-sm text-gray-500">
              {new Date(comment.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>

          <div className="text-gray-700 text-sm leading-relaxed mb-2">
            {comment.content}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => voteOnComment(comment.id, 'up')}
              className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="text-xs">{comment.upvotes}</span>
            </button>

            <button
              onClick={() => voteOnComment(comment.id, 'down')}
              className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-colors"
            >
              <ThumbsDown className="w-4 h-4" />
              <span className="text-xs">{comment.downvotes}</span>
            </button>

            {depth < maxDepth && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Reply className="w-4 h-4" />
                <span className="text-xs">Répondre</span>
              </button>
            )}

            <button
              onClick={() => flagComment(comment.id)}
              className="flex items-center space-x-1 text-gray-500 hover:text-orange-600 transition-colors"
            >
              <Flag className="w-4 h-4" />
              <span className="text-xs">Signaler</span>
            </button>
          </div>

          {replyingTo === comment.id && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Écrivez votre réponse..."
                className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <Button
                  onClick={() => setReplyingTo(null)}
                  variant="outline"
                  size="sm"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => submitComment(replyText, comment.id)}
                  disabled={!replyText.trim() || submitting}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Répondre
                </Button>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map(reply => (
                <CommentComponent key={reply.id} comment={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Commentaires</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Commentaires ({comments.length})</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Comment Form */}
        {user ? (
          <div className="space-y-3">
            <div className="flex space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {user.user_metadata?.name ? user.user_metadata.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Partagez votre opinion sur cette information..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Soyez respectueux et constructif dans vos commentaires
              </div>
              <Button
                onClick={() => submitComment(newComment)}
                disabled={!newComment.trim() || submitting}
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Publication...' : 'Publier'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p>Connectez-vous pour participer à la discussion</p>
          </div>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium mb-1">Aucun commentaire</h3>
            <p className="text-sm">Soyez le premier à commenter cette information.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map(comment => (
              <CommentComponent key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}