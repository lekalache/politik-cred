"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Link2,
  Check,
  Mail
} from 'lucide-react'

interface ShareButtonsProps {
  url?: string
  title: string
  description?: string
  hashtags?: string[]
  variant?: 'default' | 'compact' | 'icons-only'
  className?: string
}

export function ShareButtons({
  url,
  title,
  description,
  hashtags = ['PolitikCred', 'Politique', 'France'],
  variant = 'default',
  className = ''
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // Use current URL if not provided
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(title)
  const encodedDescription = encodeURIComponent(description || title)
  const hashtagString = hashtags.join(',')

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&hashtags=${hashtagString}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const openShare = (platform: keyof typeof shareLinks) => {
    const url = shareLinks[platform]
    if (platform === 'email') {
      window.location.href = url
    } else {
      window.open(url, '_blank', 'width=600,height=400,menubar=no,toolbar=no')
    }
    setShowMenu(false)
  }

  // Native share API for mobile
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url: shareUrl
        })
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled')
      }
    } else {
      setShowMenu(!showMenu)
    }
  }

  if (variant === 'icons-only') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => openShare('twitter')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Partager sur Twitter"
        >
          <Twitter className="w-5 h-5 text-[#1DA1F2]" />
        </button>
        <button
          onClick={() => openShare('facebook')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Partager sur Facebook"
        >
          <Facebook className="w-5 h-5 text-[#4267B2]" />
        </button>
        <button
          onClick={() => openShare('linkedin')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Partager sur LinkedIn"
        >
          <Linkedin className="w-5 h-5 text-[#0A66C2]" />
        </button>
        <button
          onClick={copyToClipboard}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Copier le lien"
        >
          {copied ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <Link2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={nativeShare}
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          Partager
        </Button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-2 z-50">
            <button
              onClick={() => openShare('twitter')}
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Twitter className="w-4 h-4 text-[#1DA1F2]" />
              <span className="text-sm">Twitter</span>
            </button>
            <button
              onClick={() => openShare('facebook')}
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Facebook className="w-4 h-4 text-[#4267B2]" />
              <span className="text-sm">Facebook</span>
            </button>
            <button
              onClick={() => openShare('linkedin')}
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Linkedin className="w-4 h-4 text-[#0A66C2]" />
              <span className="text-sm">LinkedIn</span>
            </button>
            <button
              onClick={() => openShare('email')}
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Mail className="w-4 h-4 text-gray-600" />
              <span className="text-sm">Email</span>
            </button>
            <hr className="my-2 dark:border-gray-700" />
            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Copié!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Copier le lien</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  // Default variant - full buttons
  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Share2 className="w-4 h-4" />
        Partager
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openShare('twitter')}
          className="gap-2 hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2]"
        >
          <Twitter className="w-4 h-4" />
          Twitter
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openShare('facebook')}
          className="gap-2 hover:bg-[#4267B2] hover:text-white hover:border-[#4267B2]"
        >
          <Facebook className="w-4 h-4" />
          Facebook
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openShare('linkedin')}
          className="gap-2 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]"
        >
          <Linkedin className="w-4 h-4" />
          LinkedIn
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              Copié!
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              Copier
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
