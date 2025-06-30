import {BaseService} from './base-service'
import type {PostData, PostResult, PostTypeString} from '@/types'

export class TumblrService extends BaseService {
  readonly name = 'Tumblr'

  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch('https://www.tumblr.com/api/v2/user/info', {
        credentials: 'include',
      })
      return response.ok
    } catch {
      return false
    }
  }

  async post(data: PostData): Promise<PostResult> {
    try {
      this.validatePostData(data)

      const formKey = await this.getFormKey()
      const postType = this.detectPostType(data)
      const postData = this.preparePostData(data, postType, formKey)

      const response = await fetch('https://www.tumblr.com/svc/post/update', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(postData).toString(),
      })

      if (!response.ok) {
        return this.createErrorResult('Failed to post to Tumblr')
      }

      const result = await response.json()
      const postId = result.response?.id

      return this.createSuccessResult(
        postId ? `https://www.tumblr.com/posts/${postId}` : undefined,
      )
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
      )
    }
  }

  supports(type: PostTypeString): boolean {
    return ['text', 'link', 'image', 'video', 'photo'].includes(type)
  }

  detectPostType(data: PostData): PostTypeString {
    if (data.image) {
      return 'photo'
    }

    if (data.url && data.url.trim() !== '') {
      return 'link'
    }

    return 'text'
  }

  private async getFormKey(): Promise<string> {
    const response = await fetch('https://www.tumblr.com/svc/secure/post_form_key', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to get form key')
    }

    const data = await response.json()
    return data.response.form_key
  }

  private preparePostData(
    data: PostData,
    postType: PostTypeString,
    formKey: string,
  ): Record<string, string> {
    const baseData = {
      form_key: formKey,
      post_type: postType,
      channel_id: 'main',
      context: 'channel',
      tags: data.tags?.join(',') ?? '',
    }

    switch (postType) {
      case 'text': {
        return {
          ...baseData,
          'post[one]': data.title,
          'post[two]': data.description ?? '',
        }
      }

      case 'link': {
        return {
          ...baseData,
          'post[one]': data.url!,
          'post[two]': data.title,
          'post[three]': data.description ?? '',
        }
      }

      case 'photo': {
        return {
          ...baseData,
          'post[photoset_layout]': '',
          'post[one]': data.image ?? '',
          'post[two]': data.description ?? '',
        }
      }

      default: {
        return baseData
      }
    }
  }
}