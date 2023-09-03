import { Provider } from '../../../uploads/provider'

interface UrlProviderOptions {
  templateUrl: string;
}

// assumes URL will always resolve to a file
// uploaders should interact with the storage provider directly
export default class UrlProvider implements Provider {
  private templateUrl: string

  constructor (_options: Partial<UrlProviderOptions>) {
    const options: Required<UrlProviderOptions> = {
      templateUrl: _options.templateUrl || 'https://storageaccount.blob.core.windows.net/uploads/{{name}}'
    }

    this.templateUrl = options.templateUrl
  }

  upload = async (data: Buffer): Promise<string> => data.toString()
  getUrl = async (sha256: string, name: string): Promise<string|null> => this.templateUrl
    .replace('{{sha256}}', sha256)
    .replace('{{name}}', name)
}
