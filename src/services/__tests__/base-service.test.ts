import {describe, it, expect} from 'vitest'
import {BaseService} from '../base-service'
import type {PostData, PostResult, PostTypeString} from '@/types'

describe('BaseService', () => {
  class TestService extends BaseService {
    name = 'TestService'

    async authenticate(): Promise<boolean> {
      return true
    }

    async post(_data: PostData): Promise<PostResult> {
      return {
        service: this.name,
        success: true,
        url: `https://test.com/posts/${Date.now()}`,
      }
    }

    supports(type: PostTypeString): boolean {
      return ['text', 'link'].includes(type)
    }
  }

  it('should create service instance with correct name', () => {
    const service = new TestService()
    expect(service.name).toBe('TestService')
  })

  it('should authenticate successfully', async () => {
    const service = new TestService()
    const result = await service.authenticate()
    expect(result).toBe(true)
  })

  it('should post data successfully', async () => {
    const service = new TestService()
    const postData: PostData = {
      title: 'Test Post',
      url: 'https://example.com',
      description: 'Test description',
      tags: ['test', 'example'],
    }

    const result = await service.post(postData)
    expect(result.success).toBe(true)
    expect(result.service).toBe('TestService')
    expect(result.url).toMatch(/^https:\/\/test\.com\/posts\/\d+$/)
  })

  it('should check support for post types', () => {
    const service = new TestService()
    expect(service.supports('text')).toBe(true)
    expect(service.supports('link')).toBe(true)
    expect(service.supports('image')).toBe(false)
    expect(service.supports('video')).toBe(false)
  })
})