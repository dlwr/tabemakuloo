import browser from 'webextension-polyfill'
import {TumblrService} from '@/services/tumblr-service'
import type {ContextMenuInfo, PostData, PostResult} from '@/types'

class BackgroundService {
  private readonly tumblrService: TumblrService

  constructor() {
    this.tumblrService = new TumblrService()
    this.init()
  }

  private init(): void {
    this.setupContextMenus()
    this.setupEventListeners()
  }

  private setupContextMenus(): void {
    browser.contextMenus.create({
      id: 'post-link',
      title: 'Tabemakulooで投稿',
      contexts: ['link', 'selection', 'page'],
    })
  }

  private setupEventListeners(): void {
    browser.contextMenus.onClicked.addListener(this.handleContextMenuClick.bind(this))
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this))
  }

  private async handleContextMenuClick(info: ContextMenuInfo): Promise<void> {
    const tabs = await browser.tabs.query({active: true, currentWindow: true})
    const tab = tabs[0]

    if (!tab?.id) {
      return
    }

    await browser.tabs.sendMessage(tab.id, {
      type: 'CONTEXT_MENU_CLICK',
      data: info,
    })
  }

  private async handleMessage(message: unknown): Promise<unknown> {
    try {
      const message_ = message as {type: string; data?: unknown}

      switch (message_.type) {
        case 'POST_TO_SERVICES': {
          return await this.handlePostToServices(message_.data as {postData: PostData; services: string[]})
        }

        case 'CHECK_AUTH': {
          return await this.handleCheckAuth(message_.data as {service: string})
        }

        default: {
          console.log('Unknown message type:', message_.type)
          return {success: false, error: 'Unknown message type'}
        }
      }
    } catch (error) {
      console.error('Background message handler error:', error)
      return {success: false, error: 'Internal error'}
    }
  }

  private async handlePostToServices(data: {postData: PostData; services: string[]}): Promise<{results: PostResult[]}> {
    const {postData, services} = data
    const results: PostResult[] = []

    // For now, only handle Tumblr
    if (services.includes('tumblr')) {
      try {
        const result = await this.tumblrService.post(postData)
        results.push(result)
      } catch (error) {
        results.push({
          service: 'Tumblr',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {results}
  }

  private async handleCheckAuth(data: {service: string}): Promise<{authenticated: boolean}> {
    const {service} = data

    if (service === 'tumblr') {
      const authenticated = await this.tumblrService.authenticate()
      return {authenticated}
    }

    return {authenticated: false}
  }
}

void new BackgroundService()
