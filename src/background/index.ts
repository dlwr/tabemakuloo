import browser from 'webextension-polyfill'
import type {ContextMenuInfo} from '@/types'

class BackgroundService {
  constructor() {
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
    console.log('Background received message:', message)
    return {success: true}
  }
}

void new BackgroundService()
