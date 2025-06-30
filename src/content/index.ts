import browser from 'webextension-polyfill'
import type {PostData} from '@/types'

class ContentScript {
  constructor() {
    this.init()
  }

  private init(): void {
    this.setupMessageListener()
  }

  private setupMessageListener(): void {
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this))
  }

  private async handleMessage(message: unknown): Promise<void> {
    console.log('Content script received message:', message)

    // Extract post data from current page
    const postData = this.extractPostData()
    console.log('Extracted post data:', postData)
  }

  private extractPostData(): PostData {
    const title = document.title
    const url = window.location.href
    const description = this.getMetaContent('description') ?? this.getSelectedText()
    const image = this.getMetaContent('og:image')

    return {
      title,
      url,
      description,
      image: image ?? undefined,
    }
  }

  private getMetaContent(name: string): string | undefined {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    return meta?.getAttribute('content') ?? undefined
  }

  private getSelectedText(): string {
    return window.getSelection()?.toString() ?? ''
  }
}

void new ContentScript()
