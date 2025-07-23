import browser from 'webextension-polyfill'

class OptionsUI {
  private readonly saveButton: HTMLButtonElement

  constructor() {
    this.saveButton = document.querySelector('#saveBtn')!
    void this.init()
  }

  private async init(): Promise<void> {
    await this.loadSettings()
    this.setupEventListeners()
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await browser.storage.sync.get('services')
      const services = (settings.services as Record<string, boolean>) || {}

      // Update UI based on stored settings
      for (const [serviceId, enabled] of Object.entries(services)) {
        const checkbox = document.querySelector<HTMLInputElement>(`#${serviceId}`)
        if (checkbox) {
          checkbox.checked = Boolean(enabled)
          this.updateServiceItem(serviceId, Boolean(enabled))
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  private setupEventListeners(): void {
    this.saveButton.addEventListener('click', this.saveSettings.bind(this))

    // Listen for service toggle changes
    const serviceCheckboxes = document.querySelectorAll('.service-toggle input')
    for (const checkbox of serviceCheckboxes) {
      checkbox.addEventListener('change', this.handleServiceToggle.bind(this))
    }
  }

  private handleServiceToggle(event: Event): void {
    const checkbox = event.target as HTMLInputElement
    const serviceId = checkbox.id
    const enabled = checkbox.checked

    this.updateServiceItem(serviceId, enabled)
  }

  private updateServiceItem(serviceId: string, enabled: boolean): void {
    const serviceItem = document.querySelector(`#${serviceId}`)?.closest('.service-item')
    if (serviceItem) {
      if (enabled) {
        serviceItem.classList.add('enabled')
      } else {
        serviceItem.classList.remove('enabled')
      }
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const services: Record<string, boolean> = {}
      const checkboxes = document.querySelectorAll('.service-toggle input')

      for (const checkbox of checkboxes) {
        const input = checkbox as HTMLInputElement
        services[input.id] = input.checked
      }

      await browser.storage.sync.set({services})

      // Visual feedback
      this.saveButton.textContent = '保存完了！'
      this.saveButton.style.background = '#28a745'

      setTimeout(() => {
        this.saveButton.textContent = '設定を保存'
        this.saveButton.style.background = '#007bff'
      }, 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      this.saveButton.textContent = '保存失敗'
      this.saveButton.style.background = '#dc3545'

      setTimeout(() => {
        this.saveButton.textContent = '設定を保存'
        this.saveButton.style.background = '#007bff'
      }, 2000)
    }
  }
}

void new OptionsUI()
