import {describe, it, expect, vi, beforeEach} from 'vitest'
import {TumblrService} from '../tumblr-service'
import type {PostData} from '@/types'

describe('TumblrService', () => {
  let service: TumblrService
  beforeEach(() => {
    service = new TumblrService()
    global.fetch = vi.fn()
  })

  describe('Basic functionality', () => {
    it('should have correct service name', () => {
      expect(service.name).toBe('Tumblr')
    })

    it('should support multiple post types', () => {
      expect(service.supports('text')).toBe(true)
      expect(service.supports('link')).toBe(true)
      expect(service.supports('image')).toBe(true)
      expect(service.supports('video')).toBe(true)
    })
  })

  describe('Authentication', () => {
    it('should check authentication status', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({user: {name: 'test-user'}}),
      })

      const result = await service.authenticate()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('https://www.tumblr.com/api/v2/user/info', {
        credentials: 'include',
      })
    })

    it('should handle authentication failure', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const result = await service.authenticate()
      expect(result).toBe(false)
    })
  })

  describe('Posting', () => {
    const validPostData: PostData = {
      title: 'Test Post',
      url: 'https://example.com',
      description: 'Test description',
      tags: ['test', 'example'],
    }

    it('should post text content successfully', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>
      // Mock form key request
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({response: {form_key: 'test-form-key'}}),
        })
        // Mock post request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: {
              id: '12345',
            },
          }),
        })

      const result = await service.post(validPostData)

      expect(result.success).toBe(true)
      expect(result.service).toBe('Tumblr')
      expect(result.url).toContain('12345')
    })

    it('should handle posting errors', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await service.post(validPostData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed')
    })

    it('should validate post data', async () => {
      const invalidData: PostData = {
        title: '',
        url: 'invalid-url',
        description: '',
        tags: [],
      }

      const result = await service.post(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Title is required')
    })
  })

  describe('Post type detection', () => {
    it('should detect link posts', () => {
      const linkData: PostData = {
        title: 'Link Post',
        url: 'https://example.com',
        description: 'A link post',
      }

      expect(service.detectPostType(linkData)).toBe('link')
    })

    it('should detect text posts', () => {
      const textData: PostData = {
        title: 'Text Post',
        url: '',
        description: 'Just some text content',
      }

      expect(service.detectPostType(textData)).toBe('text')
    })

    it('should detect image posts', () => {
      const imageData: PostData = {
        title: 'Image Post',
        url: 'https://example.com',
        image: 'https://example.com/image.jpg',
      }

      expect(service.detectPostType(imageData)).toBe('photo')
    })
  })
})